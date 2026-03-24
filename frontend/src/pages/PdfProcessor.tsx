import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UploadCloud, FileText, CheckCircle2, Loader2, Play, X, Download, LayoutGrid, AlertCircle, FileJson, Copy, CheckSquare, Square, ChevronRight, Globe, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import clsx from 'clsx';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useI18nStore } from '../store/i18nStore';

// Fix leaflet default icon missing issue in React using reliable CDN
let DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Set up PDF.js worker for Vite via CDN to avoid bundler issues
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfProcessor() {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const navigate = useNavigate();
    const { t, lang, setLang } = useI18nStore();
    
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadComplete, setUploadComplete] = useState(false);
    const [fileId, setFileId] = useState<string | null>(null);

    // Extraction state
    const [extractionMode, setExtractionMode] = useState<'auto' | 'manual' | null>(null);
    const [numPages, setNumPages] = useState<number>();
    const [pageNumber, setPageNumber] = useState<number>(1);

    type ExtractedTable = {
        page: number;
        status: 'success' | 'error' | 'warning';
        message?: string;
        data?: string[][];
    };
    const [extractedTables, setExtractedTables] = useState<ExtractedTable[] | null>(null);
    const [viewMode, setViewMode] = useState<'pdf' | 'results'>('pdf');
    const [selectedTableIndices, setSelectedTableIndices] = useState<Set<number>>(new Set());
    
    // Feature Toggles
    const [enableCoordinates, setEnableCoordinates] = useState(false);

    // Bounding Box state
    type Box = { id: string; x: number; y: number; width: number; height: number };
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [boxesByPage, setBoxesByPage] = useState<Record<number, Box[]>>({});
    const [currentBox, setCurrentBox] = useState<Box | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Merlot State
    const [coordType, setCoordType] = useState<'UTM' | 'LATLONG'>('UTM');
    const [utmZone, setUtmZone] = useState<number>(30);
    const [hemisphere, setHemisphere] = useState<string>('N');
    const [namePrefix, setNamePrefix] = useState<string>('AP ');
    const [isProcessingMerlot, setIsProcessingMerlot] = useState(false);
    const [activeMerlotResult, setActiveMerlotResult] = useState<any>(null);
    const [selectedMapPoint, setSelectedMapPoint] = useState<{lat: number, lng: number, name: string} | null>(null);

    // Dynamic map fly-to component
    function MapUpdater({ center }: { center: [number, number] }) {
        const map = useMap();
        useEffect(() => {
            map.flyTo(center, 7, { animate: true, duration: 1.5 });
        }, [center, map]);
        return null;
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (extractionMode !== 'manual') return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setIsDrawing(true);
        setStartPos({ x, y });
        setCurrentBox({ id: Math.random().toString(36).substr(2, 9), x, y, width: 0, height: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDrawing || extractionMode !== 'manual') return;
        const rect = e.currentTarget.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const x = Math.min(startPos.x, currentX);
        const y = Math.min(startPos.y, currentY);
        const width = Math.abs(currentX - startPos.x);
        const height = Math.abs(currentY - startPos.y);

        setCurrentBox(prev => prev ? { ...prev, x, y, width, height } : null);
    };

    const handleMouseUp = () => {
        if (extractionMode === 'manual' && isDrawing) {
            setIsDrawing(false);
            if (currentBox && currentBox.width > 5 && currentBox.height > 5) {
                setBoxesByPage(prev => ({
                    ...prev,
                    [pageNumber]: [...(prev[pageNumber] || []), currentBox]
                }));
            }
            setCurrentBox(null);
        }
    };

    const handleDeleteBox = (pageNum: number, id: string) => {
        setBoxesByPage(prev => ({
            ...prev,
            [pageNum]: prev[pageNum].filter(box => box.id !== id)
        }));
    };

    const handleProcess = async () => {
        if (extractionMode === 'manual' && Object.keys(boxesByPage).length === 0) {
            alert('Please draw a bounding box on at least one page.');
            return;
        }

        setIsProcessing(true);

        // Normalize box coordinates to percentages based on the rendered container size
        const container = document.getElementById('pdf-page-container');
        const cw = container?.clientWidth || 600; // react-pdf Page width is set to 600
        const ch = container?.clientHeight || 848; // fallback for A4 ratio

        const normalizedBoxes: Record<string, any[]> = {};
        for (const [pageNum, boxes] of Object.entries(boxesByPage)) {
            normalizedBoxes[pageNum] = boxes.map(b => ({
                x: b.x / cw,
                y: b.y / ch,
                width: b.width / cw,
                height: b.height / ch
            }));
        }

        // Prepare the payload for the backend
        const payload = {
            file_id: fileId,
            filename: file?.name,
            mode: extractionMode,
            boxes: normalizedBoxes
        };

        console.log("Sending to backend:", payload);

        try {
            const response = await fetch(`${API_URL}/api/v1/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                setIsProcessing(false);
                setExtractedTables(data.tables || []);
                setSelectedTableIndices(new Set(
                    (data.tables || [])
                        .map((t: any, i: number) => t.status === 'success' ? i : -1)
                        .filter((i: number) => i !== -1)
                ));
                setViewMode('results');
                console.log("Backend Response:", data);
            } else {
                alert('Error processing document');
                setIsProcessing(false);
            }
        } catch (error) {
            alert('Error connecting to backend: ' + error);
            setIsProcessing(false);
        }
    };

    const handleAutoDetect = async () => {
        setIsProcessing(true);
        const payload = { file_id: fileId, filename: file?.name };

        try {
            const response = await fetch(`${API_URL}/api/v1/detect_boxes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();

                // Map the normalized boxes to the frontend absolute pixel coordinates.
                // Assuming standard width 600 and height 848 as default.
                const newBoxesByPage: Record<number, Box[]> = {};
                for (const [pageNumStr, boxes] of Object.entries(data.boxes)) {
                    const pageNum = parseInt(pageNumStr);
                    newBoxesByPage[pageNum] = (boxes as any[]).map(b => ({
                        id: b.id,
                        x: b.x * 600,
                        y: b.y * 848,
                        width: b.width * 600,
                        height: b.height * 848
                    }));
                }

                setBoxesByPage(newBoxesByPage);
                setExtractionMode('manual'); // Switch to manual drawing mode to let user edit
                setViewMode('pdf');
                setIsProcessing(false);
            } else {
                alert('Error detecting boxes');
                setIsProcessing(false);
            }
        } catch (error) {
            alert('Error connecting to backend: ' + error);
            setIsProcessing(false);
        }
    };

    const exportCSV = (table: ExtractedTable, index: number) => {
        if (!table.data) return;
        const csvContent = table.data.map((row: any[]) => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `lancelot_p${table.page}_t${index + 1}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const copyToClipboard = async (table: ExtractedTable) => {
        if (!table.data) return;
        const tsvContent = table.data.map((row: any[]) => row.join("\t")).join("\n");
        try {
            await navigator.clipboard.writeText(tsvContent);
            alert("Table copied to clipboard!");
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert("Failed to copy table to clipboard.");
        }
    };

    const toggleTableSelection = (index: number) => {
        setSelectedTableIndices(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const sendToMerlot = async () => {
        if (!extractedTables || selectedTableIndices.size === 0) return;

        const selectedTables = extractedTables.filter((_, idx) => selectedTableIndices.has(idx));
        console.log("Sending to Merlot:", selectedTables);
        
        setIsProcessingMerlot(true);
        
        try {
            let mergedData: string[][] = [];
            let firstRowHeader: string[] | null = null;
            
            for (const table of selectedTables) {
                if (!table.data || table.data.length === 0) continue;
                
                if (mergedData.length === 0) {
                    // First table: take all data
                    mergedData = [...table.data];
                    firstRowHeader = table.data[0];
                } else {
                    // Subsequent tables: check if first row is a header and skip it
                    const currentHeader = table.data[0];
                    const isHeader = currentHeader.some(cell => {
                        const cellLower = String(cell).toLowerCase();
                        return cellLower.includes('apoyo') || cellLower.includes('nombre') || cellLower.includes('utm');
                    }) || (firstRowHeader && JSON.stringify(currentHeader) === JSON.stringify(firstRowHeader));
                    
                    if (isHeader) {
                        mergedData = [...mergedData, ...table.data.slice(1)];
                    } else {
                        mergedData = [...mergedData, ...table.data];
                    }
                }
            }
            
            if (mergedData.length === 0) {
                setIsProcessingMerlot(false);
                return;
            }
            
            const response = await fetch(`${API_URL}/api/v1/merlot/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table_data: mergedData,
                    utm_zone: utmZone,
                    hemisphere: hemisphere,
                    name_prefix: namePrefix,
                    coord_type: coordType
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                
                const tablePageStr = selectedTables.map(t => t.page).join(', ');
                
                const resultTable = {
                    page: selectedTables[0].page, // Store first page for reference
                    status: 'success' as const,
                    data: [...result.data],
                    message: `Merlot Output (from Pages ${tablePageStr})`
                };
                setActiveMerlotResult(resultTable);
            } else {
                alert(`Failed to process selected tables with Merlot.`);
            }
            
            setIsProcessingMerlot(false);
            
        } catch (error) {
            console.error(error);
            alert("Error connecting to Merlot backend.");
            setIsProcessingMerlot(false);
        }
    };

    const exportJSON = () => {
        if (!extractedTables) return;
        const blob = new Blob([JSON.stringify(extractedTables, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `lancelot_extraction.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
        setNumPages(numPages);
        setPageNumber(1);
    }

    const handleFileChange = async (selectedFile: File) => {
        if (!selectedFile || selectedFile.type !== 'application/pdf') {
            alert('Please select a valid PDF file.');
            return;
        }
        setFile(selectedFile);
        await uploadFile(selectedFile);
    };

    const uploadFile = async (selectedFile: File) => {
        setUploadProgress(10);
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            // Fake progress for UI polish
            const interval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(interval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 300);

            const response = await fetch(`${API_URL}/api/v1/upload`, {
                method: 'POST',
                body: formData,
            });

            clearInterval(interval);

            if (response.ok) {
                const data = await response.json();
                setFileId(data.file_id);
                setUploadProgress(100);
                setTimeout(() => setUploadComplete(true), 500);
            } else {
                alert('Upload failed');
                setFile(null);
            }
        } catch (error) {
            alert('Error connecting to backend: ' + error);
            setFile(null);
        }
    };

    return (
        <div className="min-h-screen p-6 relative flex flex-col items-center bg-background text-text-main custom-scrollbar">
            {/* Top Navigation & i18n Switcher */}
            <header className="w-full max-w-7xl flex gap-4 items-center justify-between mb-6 z-10 pt-2">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center space-x-2 text-text-muted hover:text-white transition-colors group"
                >
                    <div className="p-2 rounded-full bg-surface group-hover:bg-primary/20 transition-colors">
                        <ArrowLeft size={18} />
                    </div>
                    <span className="font-medium">{t('back_to_hub')}</span>
                </button>
                <div className="flex items-center space-x-6">
                    <h1 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent uppercase">
                        {t('processor_title')}
                    </h1>
                    <div className="flex gap-2 glass px-3 py-1.5 rounded-full items-center shadow-lg">
                        <Globe size={16} className="text-primary" />
                        <button 
                            onClick={() => setLang('es')} 
                            className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${lang === 'es' ? 'bg-primary text-background' : 'hover:bg-white/10'}`}
                        >
                            ES
                        </button>
                        <div className="w-[1px] h-3 bg-white/20 mx-1"></div>
                        <button 
                            onClick={() => setLang('en')} 
                            className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${lang === 'en' ? 'bg-primary text-background' : 'hover:bg-white/10'}`}
                        >
                            EN
                        </button>
                    </div>
                </div>
            </header>

            <AnimatePresence mode="wait">
                {!file && (
                    <motion.label
                        key="upload"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full max-w-4xl glass-panel rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px] border-dashed border-2 cursor-pointer transition-colors relative"
                        style={{
                            borderColor: isDragging ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.1)',
                            backgroundColor: isDragging ? 'rgba(195, 165, 99, 0.05)' : ''
                        }}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e: React.DragEvent<HTMLLabelElement>) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const droppedFiles = e.dataTransfer.files;
                            if (droppedFiles.length > 0) {
                                handleFileChange(droppedFiles[0]);
                            }
                        }}
                    >
                        <input type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files && e.target.files.length > 0 && handleFileChange(e.target.files[0])} />
                        <div className="bg-primary/20 p-5 rounded-full mb-6 pointer-events-none">
                            <UploadCloud className="text-primary w-12 h-12" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2 text-white pointer-events-none">{t('upload_plan')}</h2>
                        <p className="text-text-muted text-center max-w-md mb-8 pointer-events-none">
                            {t('drag_drop')}
                        </p>

                        <div className="bg-primary hover:bg-primary/90 text-background font-bold py-3 px-8 rounded-full cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-primary/30 pointer-events-none">
                            {t('browse_files')}
                        </div>
                    </motion.label>
                )}

                {(file && !uploadComplete) && (
                    <motion.div
                        key="progress"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-md glass-panel rounded-3xl p-8 flex flex-col items-center justify-center"
                    >
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
                        <h3 className="text-xl font-medium text-white mb-2">{t('analyzing_pdf')}</h3>
                        <p className="text-text-muted text-sm mb-6 text-center">{t('uploading_processing')} {file.name}</p>

                        <div className="w-full bg-surface rounded-full h-2.5 mb-2 overflow-hidden border border-white/5">
                            <motion.div
                                className="bg-gradient-to-r from-primary to-accent h-2.5 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                transition={{ duration: 0.2 }}
                            />
                        </div>
                        <div className="w-full flex justify-between text-xs text-text-muted">
                            <span>{t('optimizing_pages')}</span>
                            <span>{uploadProgress}%</span>
                        </div>
                    </motion.div>
                )}

                {uploadComplete && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-7xl flex flex-col gap-6"
                    >
                        {/* Top Sticky Bar: File Info & Controls */}
                        <div className="sticky top-4 z-40 glass-panel border-white/10 rounded-3xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                            
                            {/* Logo & File Status (Left) */}
                            <div className="flex items-center space-x-6 min-w-[200px]">
                                <img src="/EscudoFino.png" alt="Lancelot Logo" className="h-10 w-auto drop-shadow-md hidden lg:block" />
                                <div className="flex items-center space-x-4">
                                    <div className="bg-green-500/20 p-2.5 rounded-full text-green-400">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="font-semibold text-white break-all line-clamp-1 text-sm" title={file?.name}>{file?.name}</h3>
                                        <p className="text-xs text-green-400">{t('ready_extraction')}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="w-px h-12 bg-white/10 hidden lg:block"></div>

                            {/* Extraction Tools (Center) */}
                            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 justify-center">
                                {(!extractedTables || extractedTables.length === 0) ? (
                                    <>
                                        <button
                                            onClick={handleAutoDetect}
                                            disabled={isProcessing}
                                            className="px-4 py-2 rounded-xl border flex items-center gap-2 text-sm transition-all bg-surface hover:bg-surface/80 border-white/5 text-text-muted hover:text-white"
                                        >
                                            {isProcessing ? <Loader2 size={16} className="animate-spin text-primary" /> : <FileText size={16} className="opacity-50" />}
                                            <span className="font-semibold">{isProcessing ? t('detecting') : t('auto_detect')}</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setExtractionMode('manual');
                                                setViewMode('pdf');
                                            }}
                                            className={clsx(
                                                "px-4 py-2 rounded-xl border flex items-center gap-2 text-sm transition-all",
                                                extractionMode === 'manual'
                                                    ? "bg-primary border-primary text-background shadow-lg shadow-primary/30"
                                                    : "bg-surface hover:bg-surface/80 border-white/5 text-text-muted hover:text-white"
                                            )}
                                        >
                                            <span className="font-semibold">{t('draw_box')}</span>
                                            <span className={clsx(
                                                "px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest",
                                                extractionMode === 'manual' ? "bg-background/20 text-background" : "bg-primary/20 text-primary"
                                            )}>{t('new')}</span>
                                        </button>
                                        
                                        <button
                                            onClick={handleProcess}
                                            disabled={isProcessing || !extractionMode}
                                            className={clsx(
                                                "px-6 py-2 rounded-xl font-bold transition-all flex items-center justify-center space-x-2",
                                                !extractionMode ? "bg-surface/50 text-text-muted cursor-not-allowed opacity-50" : 
                                                "bg-green-500 hover:bg-green-400 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                                            )}
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    <span>{t('sending_server')}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>{t('start_processing')}</span>
                                                    <Play size={16} className="fill-current" />
                                                </>
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setExtractedTables(null);
                                            setViewMode('pdf');
                                        }}
                                        className="px-6 py-2 rounded-xl border flex items-center gap-2 text-sm transition-all bg-surface hover:bg-surface/80 border-white/10 text-white hover:border-primary/50 shadow-lg"
                                    >
                                        <Edit3 size={16} className="text-primary" />
                                        <span className="font-semibold">{t('modify_selection') || 'Modify Selection'}</span>
                                    </button>
                                )}
                            </div>
                            
                            {extractedTables && extractedTables.length > 0 && (
                                <>
                                    <div className="w-px h-12 bg-white/10 hidden lg:block"></div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                setFile(null);
                                                setNumPages(0);
                                                setUploadComplete(false);
                                                setExtractedTables(null);
                                                setBoxesByPage({});
                                                setExtractionMode(null);
                                            }}
                                            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all border bg-surface/50 text-text-muted border-white/5 hover:text-white hover:bg-red-500/10 hover:border-red-500/30 flex items-center gap-2"
                                        >
                                            <FileText size={16} />
                                            <span className="hidden sm:inline">{t('new_pdf') || 'New PDF'}</span>
                                        </button>
                                        <div className="w-px h-6 bg-white/10"></div>
                                        <button
                                            onClick={() => setViewMode('pdf')}
                                            className={clsx("px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                                                viewMode === 'pdf' ? "bg-primary/20 text-primary border-primary/50" : "bg-surface text-text-muted border-white/5 hover:text-white"
                                            )}
                                        >
                                            PDF
                                        </button>
                                        <button
                                            onClick={() => setViewMode('results')}
                                            className={clsx("px-4 py-2 rounded-xl text-sm font-semibold transition-all border flex gap-2 items-center",
                                                viewMode === 'results' ? "bg-primary/20 text-primary border-primary/50" : "bg-surface text-text-muted border-white/5 hover:text-white"
                                            )}
                                        >
                                            <LayoutGrid size={16} />
                                            <span>Results</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* extractionMode warning area - Moved to top of main content */}
                        {extractionMode && viewMode === 'pdf' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full max-w-7xl mx-auto -mt-2 -mb-2"
                            >
                                <div className="p-3 rounded-xl bg-surface/80 border border-primary/20 text-sm font-medium text-white shadow-lg flex items-center gap-3">
                                    <div className="bg-primary/20 p-1.5 rounded-full">
                                        <FileText size={16} className="text-primary" />
                                    </div>
                                    <span>
                                        {extractionMode === 'auto'
                                            ? t('search_structure')
                                            : t('navigate_doc')}
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {/* Main View Area (Grid layout: Viewer 2 cols, context 1 col) */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
                            
                            {/* Main Viewer */}
                            <div className="lg:col-span-2 glass-panel rounded-3xl p-2 flex flex-col relative overflow-hidden bg-black/20">
                                {viewMode === 'results' && extractedTables ? (
                                    <div className="flex-1 w-full h-full relative flex flex-col overflow-auto p-6 custom-scrollbar">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                            <div>
                                                <h2 className="text-2xl font-semibold text-white flex items-center space-x-3 mb-1">
                                                    <div className="p-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg">
                                                        <LayoutGrid className="text-primary w-6 h-6" />
                                                    </div>
                                                    <span>{t('extracted_layouts')}</span>
                                                </h2>
                                                <p className="text-sm text-text-muted pl-11">
                                                    {t('found_tables', { tables: extractedTables.filter(t => t.status === 'success').length, selections: extractedTables.length })}
                                                </p>
                                            </div>
                                            
                                            <button
                                                onClick={exportJSON}
                                                className="bg-surface hover:bg-surface/80 border border-white/10 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                                            >
                                                <FileJson size={16} />
                                                <span className="text-sm">{t('export_json')}</span>
                                            </button>
                                        </div>

                                        {/* Optional Coordinate Extraction Toggle */}
                                        <div className="bg-surface/30 p-4 rounded-2xl mb-4 border border-white/5 flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <Globe size={18} className="text-primary" />
                                                </div>
                                                <span className="text-sm font-medium text-white/90">{t('enable_coords_prompt')}</span>
                                            </div>
                                            <button
                                                onClick={() => setEnableCoordinates(!enableCoordinates)}
                                                className={clsx(
                                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer",
                                                    enableCoordinates ? "bg-primary" : "bg-white/10 hover:bg-white/20"
                                                )}
                                            >
                                                <span
                                                    className={clsx(
                                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                        enableCoordinates ? "translate-x-6" : "translate-x-1"
                                                    )}
                                                />
                                            </button>
                                        </div>

                                        {/* Inline Coordinates Settings Block (when results are shown & toggle is on) */}
                                        {enableCoordinates && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-surface/50 p-5 rounded-2xl mb-6 border border-white/5 shadow-inner"
                                            >
                                                <div className="flex flex-wrap md:flex-nowrap gap-6 items-end">
                                                    <div className="flex-1 min-w-[200px] space-y-3">
                                                        <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                                            <Globe size={14} className="text-primary" />
                                                            {t('coord_config')}
                                                        </h5>
                                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                            <div className="col-span-2 lg:col-span-4 mb-1">
                                                                <label className="text-xs text-text-muted mb-2 block">{t('coord_type') || 'Tipo de Coordenadas'}</label>
                                                                <div className="flex bg-black/30 border border-white/10 rounded-lg overflow-hidden p-[3px] max-w-xs">
                                                                    <button 
                                                                        onClick={() => setCoordType('UTM')}
                                                                        className={clsx("flex-1 text-xs py-1.5 rounded-md transition-colors font-medium", coordType === 'UTM' ? "bg-primary text-background" : "text-text-muted hover:text-white")}
                                                                    >UTM</button>
                                                                    <button 
                                                                        onClick={() => setCoordType('LATLONG')}
                                                                        className={clsx("flex-1 text-xs py-1.5 rounded-md transition-colors font-medium", coordType === 'LATLONG' ? "bg-primary text-background" : "text-text-muted hover:text-white")}
                                                                    >Lat / Long</button>
                                                                </div>
                                                            </div>
                                                            {coordType === 'UTM' && (
                                                                <>
                                                                    <div>
                                                                        <label className="text-xs text-text-muted mb-1 block">{t('utm_zone')}</label>
                                                                        <input 
                                                                            type="number" 
                                                                            value={utmZone} 
                                                                            onChange={e => setUtmZone(parseInt(e.target.value) || 30)}
                                                                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs text-text-muted mb-1 block">{t('hemisphere')}</label>
                                                                        <select 
                                                                            value={hemisphere}
                                                                            onChange={e => setHemisphere(e.target.value)}
                                                                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary appearance-none"
                                                                        >
                                                                            <option value="N">{t('north')}</option>
                                                                            <option value="S">{t('south')}</option>
                                                                        </select>
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className={coordType === 'LATLONG' ? 'col-span-2' : ''}>
                                                                <label className="text-xs text-text-muted mb-1 block">{t('point_prefix')}</label>
                                                                <div className="flex bg-black/30 border border-white/10 rounded-lg overflow-hidden p-[3px]">
                                                                    <button 
                                                                        onClick={() => setNamePrefix('AP ')}
                                                                        className={clsx("flex-1 text-xs py-1.5 rounded-md transition-colors font-medium", namePrefix === 'AP ' ? "bg-primary text-background" : "text-text-muted hover:text-white")}
                                                                    >AP</button>
                                                                    <button 
                                                                        onClick={() => setNamePrefix('CE ')}
                                                                        className={clsx("flex-1 text-xs py-1.5 rounded-md transition-colors font-medium", namePrefix === 'CE ' ? "bg-primary text-background" : "text-text-muted hover:text-white")}
                                                                    >CE</button>
                                                                    <button 
                                                                        onClick={() => setNamePrefix('')}
                                                                        className={clsx("flex-1 text-xs py-1.5 rounded-md transition-colors font-medium", namePrefix === '' ? "bg-primary text-background" : "text-text-muted hover:text-white")}
                                                                    >Ø</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <button
                                                        onClick={sendToMerlot}
                                                        disabled={selectedTableIndices.size === 0 || isProcessingMerlot}
                                                        className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 disabled:from-primary/50 disabled:to-accent/50 text-background font-bold py-3 px-6 rounded-xl shadow-[0_0_20px_rgba(195,165,99,0.3)] transition-all flex items-center justify-center space-x-2 relative overflow-hidden group min-w-[200px]"
                                                    >
                                                        {isProcessingMerlot ? (
                                                            <Loader2 size={18} className="animate-spin text-background" />
                                                        ) : (
                                                            <>
                                                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                                                                <span className="tracking-wide text-sm">{coordType === 'UTM' ? t('process_coords') : (t('visualize_latlong') || 'Visualizar Lat/Long')}</span>
                                                                <ChevronRight size={18} />
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                        
                                        {/* Merlot Results Dropdown */}
                                        <AnimatePresence>
                                            {activeMerlotResult && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mb-8 overflow-hidden rounded-2xl border border-primary/30 shadow-[0_0_30px_rgba(195,165,99,0.15)] bg-surface/80 relative"
                                                >
                                                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-accent"></div>
                                                    <div className="p-5 flex flex-col">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                                <Globe className="text-primary w-5 h-5" />
                                                                {t('merlot_output_title') || 'Extracted Coordinate Points'}
                                                            </h3>
                                                            <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-medium border border-primary/30">
                                                                {t('page')} {activeMerlotResult.page}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="bg-[#0f172a]/80 rounded-xl overflow-hidden border border-white/10 shadow-inner flex-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                                                            <table className="w-full text-sm text-left whitespace-nowrap">
                                                                <thead className="sticky top-0 bg-[#0f172a] shadow-md border-b border-white/10 text-xs font-semibold text-text-muted uppercase tracking-wider z-10">
                                                                    <tr>
                                                                        {activeMerlotResult.data?.[0]?.map((headerCell: string, hIdx: number) => (
                                                                            <th key={`mh-${hIdx}`} className="px-6 py-3">{headerCell}</th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {activeMerlotResult.data?.slice(1).map((row: string[], rowIdx: number) => (
                                                                        <tr 
                                                                            key={`m-row-${rowIdx}`} 
                                                                            className="border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                                                                            onClick={() => {
                                                                                const lat = parseFloat(row[1]);
                                                                                const lng = parseFloat(row[2]);
                                                                                if (!isNaN(lat) && !isNaN(lng)) {
                                                                                    setSelectedMapPoint({ name: row[0], lat, lng });
                                                                                }
                                                                            }}
                                                                        >
                                                                            {row.map((cell: string, cellIdx: number) => (
                                                                                <td key={`m-cell-${cellIdx}`} className={clsx("px-6 py-2.5 border-r border-white/5 last:border-0", cellIdx === 0 && "font-medium text-white")}>
                                                                                    {cell || <span className="text-text-muted/30 italic">{t('empty') || 'Empty'}</span>}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        
                                                        <div className="p-4 border-t border-white/10 bg-surface flex justify-between items-center">
                                                            <span className="text-xs font-medium text-text-muted bg-white/5 px-2.5 py-1 rounded border border-white/5">
                                                                {activeMerlotResult.data ? activeMerlotResult.data.length - 1 : 0} {t('points_extracted') || 'Points Extracted'}
                                                            </span>
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={() => setActiveMerlotResult(null)}
                                                                    className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 text-text-muted hover:text-white transition-colors border border-transparent hover:border-white/10"
                                                                >
                                                                    {t('discard') || 'Discard'}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        exportCSV(activeMerlotResult, 999);
                                                                        setActiveMerlotResult(null);
                                                                    }}
                                                                    className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                                                                >
                                                                    <Download size={16} />
                                                                    <span>{t('download_csv') || 'Download CSV'}</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="space-y-8 pb-10">
                                        {extractedTables && extractedTables.map((table, idx) => (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                key={`table-${idx}`}
                                                className={clsx(
                                                    "rounded-2xl border overflow-hidden backdrop-blur-md shadow-2xl",
                                                    table.status === 'success' ? "bg-surface/50 border-white/10" :
                                                        table.status === 'error' ? "bg-red-500/5 border-red-500/20" :
                                                            "bg-yellow-500/5 border-yellow-500/20"
                                                )}
                                            >
                                                <div className={clsx(
                                                    "px-6 py-4 flex items-center justify-between border-b",
                                                    table.status === 'success' ? "border-white/10 bg-gradient-to-r from-blue-500/10 to-transparent" : "border-inherit bg-black/20"
                                                )}>
                                                    <div className="flex items-center space-x-3">
                                                        {table.status === 'success' && (
                                                            <button
                                                                onClick={() => toggleTableSelection(idx)}
                                                                className="text-text-muted hover:text-white transition-colors"
                                                            >
                                                                {selectedTableIndices.has(idx) ? (
                                                                    <CheckSquare size={20} className="text-primary" />
                                                                ) : (
                                                                    <Square size={20} />
                                                                )}
                                                            </button>
                                                        )}
                                                        {table.status === 'success' && (
                                                            <div className="p-2 bg-blue-500/20 rounded-xl">
                                                                <LayoutGrid className="text-blue-400 w-5 h-5" />
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col">
                                                            <h2 className={clsx("font-bold text-white tracking-wide leading-none", table.status === 'success' ? "text-lg" : "text-sm")}>
                                                                Table {idx + 1}
                                                            </h2>
                                                            <div className="flex items-center space-x-2 mt-1">
                                                                <span className="text-xs text-blue-300/70">Page {table.page}</span>
                                                                {table.message && (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                                        {table.message}
                                                                    </span>
                                                                )}
                                                                {table.status !== 'success' && (
                                                                    <span className={clsx(
                                                                        "px-2 py-0.5 rounded text-[10px] border flex items-center space-x-1",
                                                                        table.status === 'error' ? "bg-red-500/20 text-red-400 border-red-500/20" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/20"
                                                                    )}>
                                                                        <AlertCircle size={10} />
                                                                        <span>{table.status}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {table.status === 'success' && table.data && (
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => copyToClipboard(table)}
                                                                className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors text-text-muted hover:text-blue-400"
                                                                title="Copy to Clipboard"
                                                            >
                                                                <Copy size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => exportCSV(table, idx)}
                                                                className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors text-text-muted hover:text-blue-400"
                                                                title="Download CSV"
                                                            >
                                                                <Download size={18} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <AnimatePresence>
                                                    {selectedTableIndices.has(idx) && (
                                                        <motion.div 
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="p-0 overflow-x-auto custom-scrollbar"
                                                        >
                                                            {table.status === 'success' && table.data ? (
                                                                <table className="w-full text-sm text-left whitespace-nowrap">
                                                                    <thead className="bg-[#0f172a] shadow-md border-b border-white/10 text-xs font-semibold text-text-muted uppercase tracking-wider">
                                                                        <tr>
                                                                            {table.data[0]?.map((headerCell: string, hIdx: number) => (
                                                                                <th key={`th-${hIdx}`} className="px-6 py-3 bg-blue-900/10">{headerCell}</th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {table.data.slice(1).map((row, rowIdx) => (
                                                                            <tr key={`row-${rowIdx}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                                                {row.map((cell, cellIdx) => (
                                                                                    <td key={`cell-${cellIdx}`} className={clsx(
                                                                                        "px-6 py-2.5 border-r border-white/5 last:border-0",
                                                                                        cellIdx === 0 && "font-medium text-white"
                                                                                    )}>
                                                                                        {cell || <span className="text-text-muted/30 italic">Empty</span>}
                                                                                    </td>
                                                                                ))}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            ) : (
                                                                <div className="p-8 text-center flex flex-col items-center text-text-muted">
                                                                    <AlertCircle className={clsx("w-8 h-8 mb-3 opacity-50", table.status === 'error' ? "text-red-400" : "text-yellow-400")} />
                                                                    <p className="max-w-md">{table.message || "Failed to parse data payload."}</p>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ) : !extractionMode ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/50 m-2 rounded-2xl border border-dashed border-white/10">
                                    <FileText className="w-16 h-16 text-text-muted mb-4 opacity-50" />
                                    <h3 className="text-xl font-medium text-white mb-2">PDF Document Ready</h3>
                                    <p className="text-text-muted">Select an extraction method to begin processing.</p>
                                </div>
                            ) : (
                                <div className="flex-1 w-full h-full relative flex flex-col items-center bg-surface/30 rounded-2xl overflow-hidden p-4">
                                    <div className="flex-1 w-full overflow-auto flex justify-center custom-scrollbar pb-4 pt-2">
                                        <div
                                            id="pdf-page-container"
                                            className="relative inline-block shadow-[0_0_40px_rgba(0,0,0,0.5)]"
                                            onMouseDown={handleMouseDown}
                                            onMouseMove={handleMouseMove}
                                            onMouseUp={handleMouseUp}
                                            onMouseLeave={handleMouseUp}
                                            style={{ cursor: extractionMode === 'manual' ? 'crosshair' : 'default' }}
                                        >
                                            <Document
                                                file={file}
                                                onLoadSuccess={onDocumentLoadSuccess}
                                                onLoadError={console.error}
                                                className="mx-auto"
                                                loading={
                                                    <div className="flex flex-col items-center justify-center h-full text-text-muted pt-20">
                                                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                                                        <p>Rendering PDF...</p>
                                                    </div>
                                                }
                                            >
                                                <Page
                                                    pageNumber={pageNumber}
                                                    renderTextLayer={false}
                                                    renderAnnotationLayer={false}
                                                    className="overflow-hidden select-none"
                                                    width={600}
                                                />
                                            </Document>

                                            {/* Render saved boxes for this page */}
                                            {(boxesByPage[pageNumber] || []).map(box => (
                                                <div
                                                    key={box.id}
                                                    className="absolute border-2 border-primary bg-primary/20 group"
                                                    style={{
                                                        left: box.x,
                                                        top: box.y,
                                                        width: box.width,
                                                        height: box.height
                                                    }}
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteBox(pageNumber, box.id);
                                                        }}
                                                        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
                                                    >
                                                        <X size={12} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            ))}

                                            {/* Render box currently being drawn */}
                                            {currentBox && extractionMode === 'manual' && (
                                                <div
                                                    className="absolute border-2 border-primary bg-primary/20 pointer-events-none"
                                                    style={{
                                                        left: currentBox.x,
                                                        top: currentBox.y,
                                                        width: currentBox.width,
                                                        height: currentBox.height
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* PDF Pagination Controls */}
                                    {numPages && (
                                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-surface/90 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-2xl">
                                            <button
                                                disabled={pageNumber <= 1}
                                                onClick={() => setPageNumber(prev => prev - 1)}
                                                className="text-text-muted hover:text-white disabled:opacity-30 disabled:hover:text-text-muted transition-colors px-2 py-1"
                                            >
                                                Prev
                                            </button>
                                            <span className="text-sm font-medium text-white">Page {pageNumber} of {numPages}</span>
                                            <button
                                                disabled={pageNumber >= numPages}
                                                onClick={() => setPageNumber(prev => prev + 1)}
                                                className="text-text-muted hover:text-white disabled:opacity-30 disabled:hover:text-text-muted transition-colors px-2 py-1"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Sidebar: Context & Map */}
                        <div className="lg:col-span-1 glass-panel rounded-3xl p-4 flex flex-col h-max sticky top-6 border border-white/10 overflow-hidden bg-black/20 gap-4">
                            <div className="flex flex-col bg-surface/50 rounded-2xl border border-white/5 overflow-hidden">
                                <h3 className="px-4 py-3 border-b border-white/5 text-xs font-semibold text-text-muted uppercase tracking-wider bg-black/20 flex items-center justify-between">
                                    <span>{t('page_context')}</span>
                                    <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full">{t('page')} {pageNumber}</span>
                                </h3>
                                <div className="p-3 flex items-center justify-center bg-gradient-to-b from-black/20 to-transparent">
                                     <Document file={file} loading={<Loader2 className="w-6 h-6 animate-spin text-primary"/>}>
                                         <Page pageNumber={pageNumber} width={180} renderTextLayer={false} renderAnnotationLayer={false} className="shadow-lg rounded border border-white/5" />
                                     </Document>
                                </div>
                            </div>
                            {enableCoordinates && (
                                <div className="flex flex-col bg-surface/50 rounded-2xl border border-white/5 overflow-hidden">
                                    <h3 className="px-4 py-3 border-b border-white/5 text-xs font-semibold text-text-muted uppercase tracking-wider bg-black/20">
                                        {t('map_preview')}
                                    </h3>
                                    <div className="h-[250px] relative z-0">
                                        <MapContainer 
                                            center={selectedMapPoint ? [selectedMapPoint.lat, selectedMapPoint.lng] : [37.1773, -3.5985]} // Default to Granada roughly based on screenshot
                                            zoom={selectedMapPoint ? 7 : 5} 
                                            style={{ height: "100%", width: "100%" }} 
                                            attributionControl={false}
                                        >
                                            <TileLayer 
                                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                                attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                                            />
                                            {selectedMapPoint && (
                                                <>
                                                    <MapUpdater center={[selectedMapPoint.lat, selectedMapPoint.lng]} />
                                                    <Marker position={[selectedMapPoint.lat, selectedMapPoint.lng]} icon={DefaultIcon}>
                                                        <Popup className="text-black">
                                                            <div className="font-bold">{selectedMapPoint.name}</div>
                                                            <div className="text-xs">{selectedMapPoint.lat.toFixed(5)}, {selectedMapPoint.lng.toFixed(5)}</div>
                                                        </Popup>
                                                    </Marker>
                                                </>
                                            )}
                                        </MapContainer>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}

