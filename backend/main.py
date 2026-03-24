from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import uvicorn
import shutil
import os
import os
import uuid
import pdfplumber
import re
from pyproj import Proj, transform, CRS

app = FastAPI(title="Lancelot PDF Processor API", version="1.0.0")

# Allow requests from frontend
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",")] if allowed_origins_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins, # Supports multiple, comma-separated origins from ENVs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class Box(BaseModel):
    x: float
    y: float
    width: float
    height: float

class ProcessRequest(BaseModel):
    file_id: str
    filename: str
    mode: str
    boxes: Dict[str, List[Box]] = {}

class DetectRequest(BaseModel):
    file_id: str
    filename: str

class MerlotRequest(BaseModel):
    table_data: List[List[Any]]
    utm_zone: int
    hemisphere: str
    name_prefix: str = "AP "
    coord_type: str = "UTM"

@app.get("/")
def read_root():
    return {"status": "Lancelot API is running", "modules": ["Camelot", "Merlot"]}

@app.post("/api/v1/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are accepted.")
    
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}_{file.filename}")
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
        
    return {
        "message": "File uploaded successfully",
        "file_id": file_id,
        "filename": file.filename
    }

@app.post("/api/v1/detect_boxes")
async def detect_boxes(request: DetectRequest):
    file_path = os.path.join(UPLOAD_DIR, f"{request.file_id}_{request.filename}")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found.")
        
    detected_boxes = {}
    
    try:
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                table_settings = {
                    "snap_tolerance": 5, 
                    "join_tolerance": 5,
                    "intersection_x_tolerance": 15,
                    "intersection_y_tolerance": 15
                }
                tables = page.find_tables(table_settings)
                page_boxes = []
                page_width = page.width
                page_height = page.height
                
                for table in tables:
                    x0, top, x1, bottom = table.bbox
                    # Normalize to percentages [0, 1]
                    page_boxes.append({
                        "id": str(uuid.uuid4())[:8],
                        "x": x0 / page_width,
                        "y": top / page_height,
                        "width": (x1 - x0) / page_width,
                        "height": (bottom - top) / page_height
                    })
                
                if page_boxes:
                    detected_boxes[i + 1] = page_boxes
                    
        return {
            "message": "Box detection complete",
            "boxes": detected_boxes
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error detecting boxes: {str(e)}")

@app.post("/api/v1/process")
async def process_pdf(request: ProcessRequest):
    file_path = os.path.join(UPLOAD_DIR, f"{request.file_id}_{request.filename}")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found. Please upload again.")
        
    extracted_tables = []
    
    # We use pdfplumber to extract tables based on provided layout boundaries
    try:
        with pdfplumber.open(file_path) as pdf:
            if request.mode == "manual":
                for page_num_str, boxes in request.boxes.items():
                    page_idx = int(page_num_str) - 1
                    if page_idx < 0 or page_idx >= len(pdf.pages):
                        continue
                        
                    page = pdf.pages[page_idx]
                    page_width = page.width
                    page_height = page.height
                    
                    for box in boxes:
                        try:
                            # Convert percentages back to PDF points
                            x0 = box.x * page_width
                            top = box.y * page_height
                            x1 = (box.x + box.width) * page_width
                            bottom = (box.y + box.height) * page_height
                            
                            # Validate bounding box to ensure it's within page limits
                            x0 = max(0, min(x0, page_width))
                            top = max(0, min(top, page_height))
                            x1 = max(0, min(x1, page_width))
                            bottom = max(0, min(bottom, page_height))
                            
                            if x1 <= x0 or bottom <= top:
                                extracted_tables.append({
                                    "page": page_idx + 1,
                                    "status": "error",
                                    "message": "Invalid bounding box dimensions."
                                })
                                continue
                                
                            table_settings = {
                                "snap_tolerance": 5, 
                                "join_tolerance": 5,
                                "intersection_x_tolerance": 15,
                                "intersection_y_tolerance": 15
                            }
                            
                            # Try binding to nearest table first
                            all_tables = page.find_tables(table_settings)
                            best_table = None
                            max_overlap = 0
                            
                            for t in all_tables:
                                tx0, ttop, tx1, tbottom = t.bbox
                                overlap_x0 = max(x0, tx0)
                                overlap_top = max(top, ttop)
                                overlap_x1 = min(x1, tx1)
                                overlap_bottom = min(bottom, tbottom)
                                
                                if overlap_x1 > overlap_x0 and overlap_bottom > overlap_top:
                                    overlap_area = (overlap_x1 - overlap_x0) * (overlap_bottom - overlap_top)
                                    if overlap_area > max_overlap:
                                        max_overlap = overlap_area
                                        best_table = t
                            
                            if best_table:
                                table = best_table.extract()
                            else:
                                # Fallback crop
                                cropped_page = page.crop((x0, top, x1, bottom))
                                table = cropped_page.extract_table(table_settings)
                            
                            if table:
                                extracted_tables.append({
                                    "page": page_idx + 1,
                                    "status": "success",
                                    "data": table
                                })
                            else:
                                extracted_tables.append({
                                    "page": page_idx + 1,
                                    "status": "warning",
                                    "message": "No tabular data found in this selection."
                                })
                        except Exception as box_err:
                            import logging
                            logging.error(f"Error processing box on page {page_idx + 1}: {str(box_err)}")
                            extracted_tables.append({
                                "page": page_idx + 1,
                                "status": "error",
                                "message": f"Failed to extract: {str(box_err)}"
                            })
            else:
                # Auto mode: attempt extraction on every page
                for i, page in enumerate(pdf.pages):
                    table_settings = {
                        "snap_tolerance": 5, 
                        "join_tolerance": 5,
                        "intersection_x_tolerance": 15,
                        "intersection_y_tolerance": 15
                    }
                    tables = page.extract_tables(table_settings=table_settings)
                    for idx, table in enumerate(tables):
                        extracted_tables.append({
                            "page": i + 1,
                            "table_index": idx,
                            "status": "success",
                            "data": table
                        })

        return {
            "message": "Processing complete",
            "tables_extracted": len(extracted_tables),
            "tables": extracted_tables
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error extracting tables: {str(e)}")

def clean_ocr_text(text: Any) -> str:
    """Basic heuristic OCR cleaning for coordinates and numbers."""
    if not isinstance(text, str):
        return str(text) if text is not None else ""
    
    cleaned = text.strip()
    # Replace common OCR errors in numbers
    # O instead of 0
    cleaned = re.sub(r'(?<=\d)O(?=\d|\b)', '0', cleaned)
    cleaned = re.sub(r'(?<=\b)O(?=\d)', '0', cleaned)
    
    # l or I instead of 1
    cleaned = re.sub(r'(?<=\d)[lI](?=\d|\b)', '1', cleaned)
    cleaned = re.sub(r'(?<=\b)[lI](?=\d)', '1', cleaned)
    
    # Remove random spaces in what should be contiguous numbers 
    # (e.g. "45 678" -> "45678" if it looks like a coordinate)
    if re.match(r'^\d{1,3}[\s\.\,]\d{3}(?:[\.\,]\d+)?$', cleaned):
         cleaned = cleaned.replace(' ', '')
         
    return cleaned

@app.post("/api/v1/merlot/process")
async def process_merlot(request: MerlotRequest):
    if not request.table_data:
        raise HTTPException(status_code=400, detail="Empty table data provided.")
        
    processed_table = []
    
    try:
        # 1. OCR Cleaning
        for row in request.table_data:
            cleaned_row = [clean_ocr_text(cell) for cell in row]
            processed_table.append(cleaned_row)
            
        # 2. UTM to Lat/Lon Conversion
        x_col_idx = -1
        y_col_idx = -1
        
        # Look for headers in the first 3 rows (in case pdf table headers are split)
        found_headers = False
        for row_idx in range(min(3, len(processed_table))):
            row_vals = [str(cell).lower() for cell in processed_table[row_idx]]
            for i, val in enumerate(row_vals):
                if any(term in val for term in ['x utm', 'este', 'easting', 'lon', 'longitud']) or val == 'x':
                    x_col_idx = i
                    found_headers = True
                elif any(term in val for term in ['y utm', 'norte', 'northing', 'lat', 'latitud']) or val == 'y':
                    y_col_idx = i
                    found_headers = True
            if found_headers and x_col_idx != -1 and y_col_idx != -1:
                break
                
        # Fallback: if headers don't strictly match but we have columns, let's guess the last two are X and Y
        # if they contain numbers
        if x_col_idx == -1 or y_col_idx == -1:
             if len(processed_table[0]) >= 2:
                 # Guess the last two columns: usually Y is last, X is second to last in typical survey tables
                 x_col_idx = len(processed_table[0]) - 2
                 y_col_idx = len(processed_table[0]) - 1
                 print(f"Fallback: guessed X col = {x_col_idx}, Y col = {y_col_idx}")
                
        # If we found X and Y columns, perform conversion
        if x_col_idx != -1 and y_col_idx != -1:
            # Try to find the Name/Apoyo column, default to first column (0)
            name_col_idx = 0
            if len(processed_table) > 0:
                headers = [str(cell).lower() for cell in processed_table[0]]
                for i, header in enumerate(headers):
                    if any(term in header for term in ['apoyo', 'nombre', 'punto', 'id']):
                        name_col_idx = i
                        break
                    
            # Set up projection
            # EPSG code for UTM Northern hemisphere is 32600 + zone
            # EPSG code for UTM Southern hemisphere is 32700 + zone
            base_epsg = 32600 if request.hemisphere.upper() == 'N' else 32700
            epsg_code = base_epsg + request.utm_zone
            
            utm_crs = CRS.from_epsg(epsg_code)
            wgs84_crs = CRS.from_epsg(4326) # Lat/Lon
            
            # Create a completely new simplified table
            simplified_table = [['Nombre', 'Latitud', 'Longitud']]
            
            for i in range(1, len(processed_table)):
                row = processed_table[i]
                try:
                    def parse_coord(val):
                        val = str(val).strip()
                        if ',' in val and '.' in val:
                            return val.replace('.', '').replace(',', '.') if val.rfind(',') > val.rfind('.') else val.replace(',', '')
                        elif ',' in val:
                            return val.replace(',', '.')
                        return val
                        
                    x_str_cleaned = parse_coord(row[x_col_idx])
                    y_str_cleaned = parse_coord(row[y_col_idx])
                    
                    x_str = re.sub(r'[^\d\.\-]', '', x_str_cleaned)
                    y_str = re.sub(r'[^\d\.\-]', '', y_str_cleaned)
                    
                    # Clean and format the name
                    raw_name = str(row[name_col_idx]).strip()
                    # Remove existing 'AP' or 'CE' so we don't end up with 'AP AP 1'
                    raw_name = re.sub(r'^(AP|CE)\s*', '', raw_name, flags=re.IGNORECASE).strip()
                    final_name = f"{request.name_prefix}{raw_name}".strip()
                    
                    if x_str and y_str and x_str != '.' and y_str != '.':
                        x = float(x_str)
                        y = float(y_str)
                        
                        # Note: pyproj transform signature expects (source, target, x, y) or similar depending on version
                        # But Transformer is recommended in newer versions, falling back to older syntax if needed
                        if request.coord_type == 'LATLONG':
                            lon = x
                            lat = y
                        else:
                            from pyproj import Transformer
                            transformer = Transformer.from_crs(utm_crs, wgs84_crs, always_xy=True) # always_xy=True returns lon, lat
                            lon, lat = transformer.transform(x, y)
                        
                        simplified_table.append([final_name, round(lat, 6), round(lon, 6)])
                    else:
                        simplified_table.append([final_name, '', ''])
                except Exception as eval_err:
                    print(f"Error converting coordinate on row {i}: {eval_err}")
                    raw_name = str(row[name_col_idx]).strip() if len(row) > name_col_idx else ""
                    simplified_table.append([f"{request.name_prefix}{raw_name}".strip(), 'Error', 'Error'])
            
            # Replace the processed table with our new minimal 3-column layout
            processed_table = simplified_table
        
        return {
            "message": "Merlot processing complete",
            "columns": len(processed_table[0]) if processed_table else 0,
            "rows": len(processed_table),
            "data": processed_table,
            "utm_zone": request.utm_zone,
            "hemisphere": request.hemisphere,
            "conversion_applied": (x_col_idx != -1 and y_col_idx != -1)
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error in Merlot processing: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
