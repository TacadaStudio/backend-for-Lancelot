import { create } from 'zustand';

// Define supported languages
export type Language = 'es' | 'en';

// Define the translation types
type Translations = {
  [key in Language]: {
    // Hero Page
    hero_title: string;
    hero_subtitle: string;
    hero_badge: string;
    nav_home: string;
    nav_about: string;
    nav_contact: string;
    feat_local: string;
    feat_precision: string;
    feat_privacy: string;
    cta_start: string;
    trusted_by: string;
    why_choose: string;
    camelot_title: string;
    camelot_desc: string;
    merlot_title: string;
    merlot_desc: string;
    module_chained: string;
    visualize_latlong: string;
    // Common
    language: string;
    switch_lang: string;
    // PdfProcessor Page
    back_to_hub: string;
    processor_title: string;
    upload_plan: string;
    drag_drop: string;
    browse_files: string;
    analyzing_pdf: string;
    uploading_processing: string;
    optimizing_pages: string;
    ready_extraction: string;
    extraction_tools: string;
    auto_detect: string;
    detecting: string;
    draw_box: string;
    new: string;
    extraction_results: string;
    found_tables: string;
    coord_config: string;
    coord_type: string;
    utm_zone: string;
    hemisphere: string;
    north: string;
    south: string;
    point_prefix: string;
    none: string;
    process_coords: string;
    export_json: string;
    return_pdf: string;
    start_processing: string;
    sending_server: string;
    search_structure: string;
    navigate_doc: string;
    extracted_layouts: string;
    coord_export: string;
    ready_earth: string;
    discard: string;
    download_csv: string;
    table: string;
    page: string;
    empty: string;
    points_extracted: string;
    pdf_ready: string;
    select_method: string;
    rendering_pdf: string;
    prev: string;
    next: string;
    page_context: string;
    map_preview: string;
    merlot_output_title: string;
    enable_coords_prompt: string;
    new_pdf: string;
    modify_selection: string;
    // About Page
    about_title: string;
    about_description: string;
    about_creator_title: string;
    about_creator_description: string;
  };
};

const translations: Translations = {
  es: {
    hero_title: "La",
    hero_badge: "Extracción PDF",
    hero_subtitle: "diseñada con la privacidad y precisión en mente.",
    nav_home: "Inicio",
    nav_about: "Acerca de",
    nav_contact: "Contacto",
    feat_local: "Procesamiento Local",
    feat_precision: "Alta Precisión",
    feat_privacy: "Sin Registros",
    cta_start: "Comenzar Ahora",
    trusted_by: "Utilizado por empresas y profesionales en",
    why_choose: "¿Por qué elegir Lancelot?",
    camelot_title: "Extractor Camelot",
    camelot_desc: "Sube planos de ingeniería pesados en PDF y extrae datos tabulares con extrema precisión usando IA y cuadros delimitadores visuales.",
    merlot_title: "Conversor Merlot",
    merlot_desc: "Encadenado automáticamente. Estandariza datos UTM crudos en Coordenadas Geográficas universales (Lat/Lon) sin problemas.",
    module_chained: "Módulo Encadenado",
    visualize_latlong: "Visualizar Lat/Long",
    language: "Español",
    switch_lang: "Cambiar a Inglés",
    back_to_hub: "Volver al Inicio",
    processor_title: "EXTRACCIÓN & COORDENADAS",
    upload_plan: "Subir tu archivo PDF",
    drag_drop: "Arrastra tu archivo PDF aquí o haz clic para buscar. Máx 50MB.",
    browse_files: "Buscar Archivos",
    analyzing_pdf: "Analizando Estructura del PDF",
    uploading_processing: "Subiendo y procesando",
    optimizing_pages: "Optimizando páginas",
    ready_extraction: "Listo para extraer",
    extraction_tools: "Herramientas de Extracción",
    auto_detect: "Auto-detectar Tablas",
    detecting: "Detectando...",
    draw_box: "Dibujar Cuadro",
    new: "Nuevo",
    extraction_results: "Resultados de Extracción",
    found_tables: "Encontradas {tables} tablas en {selections} selecciones.",
    coord_config: "Configuración de Coordenadas",
    coord_type: "Tipo de Coordenadas",
    utm_zone: "Zona UTM",
    hemisphere: "Hemisferio",
    north: "Norte (N)",
    south: "Sur (S)",
    point_prefix: "Prefijo",
    none: "Ninguno",
    process_coords: "PROCESAR COORDENADAS",
    export_json: "Exportar todo a JSON",
    return_pdf: "Volver al PDF",
    start_processing: "Iniciar Procesamiento",
    sending_server: "Enviando al Servidor...",
    search_structure: "Buscando líneas estructurales. Esto procesará todas las tablas detectadas sin confirmación manual.",
    navigate_doc: "Navega por el documento y dibuja un rectángulo sobre una tabla específica para forzar la extracción, o usa Auto-detectar para autocompletar. Úsalo para evitar datos erróneos.",
    extracted_layouts: "Datos Extraídos",
    coord_export: "Exportación de Coordenadas",
    ready_earth: "Listo para Google Earth",
    discard: "Descartar",
    download_csv: "Descargar CSV",
    table: "Tabla",
    page: "Página",
    empty: "Vacío",
    points_extracted: "Puntos Extraídos",
    pdf_ready: "Documento PDF Listo",
    select_method: "Selecciona un método de extracción para comenzar.",
    rendering_pdf: "Renderizando PDF...",
    prev: "Ant",
    next: "Sig",
    page_context: "Contexto de Página",
    map_preview: "Vista de Mapa",
    merlot_output_title: "Coordenadas Extraídas",
    enable_coords_prompt: "¿Tus tablas contienen coordenadas? ¿Deseas convertirlo a formato exportable a Google Earth?",
    new_pdf: "Nuevo PDF",
    modify_selection: "Modificar Selección",
    about_title: "Acerca de Lancelot",
    about_description: "Lancelot es una herramienta avanzada de procesamiento de PDFs diseñada para ingenieros que necesitan extraer tablas pesadas de planos y convertirlas a coordenadas geográficas automáticamente con extrema precisión.",
    about_creator_title: "El Creador",
    about_creator_description: "Creado por un equipo apasionado de desarrolladores enfocado en resolver problemas reales de extracción de datos para las industrias de construcción e ingeniería. (Este es un texto temporal).",
  },
  en: {
    hero_title: "The",
    hero_badge: "PDF Extraction",
    hero_subtitle: "designed with privacy and precision in mind.",
    nav_home: "Home",
    nav_about: "About",
    nav_contact: "Contact",
    feat_local: "Local Processing",
    feat_precision: "High Precision",
    feat_privacy: "No Signups",
    cta_start: "Start Using Now",
    trusted_by: "Used by companies and people working at",
    why_choose: "Why choose Lancelot?",
    camelot_title: "Camelot Extractor",
    camelot_desc: "Upload heavy PDF engineering plans and extract tabular data with extreme precision using AI and visual bounding boxes.",
    merlot_title: "Merlot Converter",
    merlot_desc: "Automatically chained. Standardize raw UTM data into universal Geographic Coordinates (Lat/Lon) seamlessly.",
    module_chained: "Module Chained",
    visualize_latlong: "Visualize Lat/Long",
    language: "English",
    switch_lang: "Switch to Spanish",
    back_to_hub: "Back to Hub",
    processor_title: "EXTRACTION & COORDINATES",
    upload_plan: "Upload your PDF file",
    drag_drop: "Drag and drop your heavy PDF file here or click to browse. Max 50MB.",
    browse_files: "Browse Files",
    analyzing_pdf: "Analyzing PDF Structure",
    uploading_processing: "Uploading and pre-processing",
    optimizing_pages: "Optimizing pages",
    ready_extraction: "Ready for extraction",
    extraction_tools: "Extraction Tools",
    auto_detect: "Auto-detect Tables",
    detecting: "Detecting...",
    draw_box: "Draw Bounding Box",
    new: "New",
    extraction_results: "Extraction Results",
    found_tables: "Found {tables} tables across {selections} selections.",
    coord_config: "Coordinate Configuration",
    coord_type: "Coordinate Type",
    utm_zone: "UTM Zone",
    hemisphere: "Hemisphere",
    north: "North (N)",
    south: "South (S)",
    point_prefix: "Point Prefix",
    none: "None",
    process_coords: "PROCESS COORDINATES",
    export_json: "Export All as JSON",
    return_pdf: "Return to PDF Selector",
    start_processing: "Start Processing",
    sending_server: "Sending to Server...",
    search_structure: "Searching for structure lines. This will directly process all detected tables without manual confirmation.",
    navigate_doc: "Navigate the document and draw a rectangle around the specific table to force extraction, or use Auto-detect above to pre-fill them. Use this to avoid extracting bad data.",
    extracted_layouts: "Extracted Data Layouts",
    coord_export: "Coordinate Export",
    ready_earth: "Ready for Google Earth",
    discard: "Discard",
    download_csv: "Download CSV",
    table: "Table",
    page: "Page",
    empty: "Empty",
    points_extracted: "Points Extracted",
    pdf_ready: "PDF Document Ready",
    select_method: "Select an extraction method to begin processing.",
    rendering_pdf: "Rendering PDF...",
    prev: "Prev",
    next: "Next",
    page_context: "Page Context",
    map_preview: "Map Preview",
    merlot_output_title: "Extracted Coordinate Points",
    enable_coords_prompt: "Do your tables contain coordinates? Do you want to convert them to an exportable Google Earth format?",
    new_pdf: "New PDF",
    modify_selection: "Modify Selection",
    about_title: "About Lancelot",
    about_description: "Lancelot is an advanced PDF processing tool designed for engineers who need to extract heavy tables from plans and convert them to geographic coordinates automatically with extreme precision.",
    about_creator_title: "The Creator",
    about_creator_description: "Created by a passionate team of developers focused on solving real data extraction problems for the construction and engineering industries. (This is placeholder text).",
  }
};

interface I18nState {
  lang: Language;
  t: (key: keyof Translations['es'], params?: Record<string, string | number>) => string;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  lang: 'es', // Default to Spanish as requested
  t: (key, params) => {
    let text = translations[get().lang][key] || translations['en'][key] || key;
    if (params) {
      Object.keys(params).forEach(p => {
        text = text.replace(`{${p}}`, String(params[p]));
      });
    }
    return text;
  },
  setLang: (lang) => set({ lang }),
  toggleLang: () => set((state) => ({ lang: state.lang === 'es' ? 'en' : 'es' })),
}));
