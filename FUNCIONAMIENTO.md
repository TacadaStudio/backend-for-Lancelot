# FUNCIONAMIENTO CORE - Plataforma "LANCELOT"

Este documento describe la arquitectura lógica, los flujos de datos y el funcionamiento básico del sistema, diseñado para ser utilizado como un prompt fundamental (System Prompt/Context) para la re-creación o mejora de la aplicación desde cero.

---

## 1. Propósito del Sistema
El sistema es una herramienta de ingeniería técnica diseñada para automatizar la extracción y estandarización de datos topográficos y de coordenadas a partir de documentos técnicos pesados (principalmente planos en PDF). Está compuesto por un Hub central y dos submódulos principales.

---

## 2. Componentes Lógicos y Funcionalidad

### A. HUB Central (Orquestador / Lancelot)
- **Función:** Actúa como el menú principal y el enrutador de la aplicación.
- **Responsabilidad:** Proveer acceso a los submódulos independientes y permitir un "flujo serial" donde la salida de un módulo alimenta automáticamente la entrada del siguiente.

### B. Módulo Extractor de Tablas (Camelot)
- **Entrada:** Archivos PDF (frecuentemente planos topográficos, de ingeniería civil o eléctricos).
- **Proceso Interno:**
  1. Recibe el archivo PDF.
  2. Itera sobre cada página del documento.
  3. Detecta estructuras tabulares analizando el texto y las líneas formadas en el plano.
  4. Extrae el contenido de las celdas, limpiando saltos de línea y celdas nulas (None/Null).
- **Salida:** Un objeto JSON estructurado que incluye:
  - Información meta (nombre del archivo, total de páginas).
  - Un array de tablas encontradas, donde cada iteración incluye:
    - Identificador de la tabla y número de página donde se encontró.
    - Cuadrícula de datos (columnas y filas en formato Array de diccionarios).
    - Representación cruda en formato CSV.

### C. Módulo Convertidor y Normalizador (Merlot)
- **Entrada:** Datos tabulares en crudo (CSV, texto pegado o JSON desde el módulo extractor), Zona UTM y Hemisferio.
- **Proceso Interno:**
  1. Recibe coordenadas en formato UTM (Universal Transverse Mercator).
  2. Implementa filtros de "limpieza OCR" (por ejemplo, corregir automáticamente cuando un software de extracción lee la letra "O" en lugar del número "0", o asume espacios donde no los hay).
  3. Ejecuta algoritmos matemáticos para convertir las coordenadas UTM (X, Y) a coordenadas geográficas universales (Latitud, Longitud).
- **Salida:** Una nueva tabla procesada e interactiva (HTML interactivo para vista previa) y un archivo CSV exportable con las coordenadas estandarizadas.

---

## 3. Flujo Principal del Usuario (Pipeline Ideal)
1. **Carga:** El ingeniero arrastra un plano PDF al Módulo Extractor.
2. **Visualización:** El sistema extrae las tablas (mientras muestra un feedback visual del tiempo transcurrido o páginas procesadas) y las presenta en tarjetas divididas por página.
3. **Transición:** El ingeniero presiona un botón de "Procesar esta tabla con Merlot".
4. **Transformación:** Los datos en memoria navegan al Módulo Convertidor, el ingeniero selecciona la zona geográfica (ej. Zona 30 Norte) y el sistema estandariza las coordenadas.
5. **Descarga:** El ingeniero descarga el CSV estandarizado final.

---

## 4. Oportunidades de Mejora y Arquitectura Sugerida para Nueva Versión

Si se fuera a construir esta aplicación nuevamente desde cero, se recomiendan las siguientes decisiones arquitectónicas y características que actualmente faltan:

### Arquitectura y Backend
*   **Adiós a peticiones HTTP bloqueantes:** El procesamiento de PDFs grandes toma tiempo. Usar respuestas HTTP estándar provoca "timeouts" (cortes de conexión). Se **debe** implementar *WebSockets* (Socket.io) o *Server-Sent Events (SSE)*. Esto permitiría enviar actualizaciones en tiempo real a la interfaz (ej. "Procesando página 3 de 50...", "Tabla encontrada en pág 4").
*   **Procesamiento Asíncrono puro:** Usar colas de tareas (como Redis + Celery en Python, o BullMQ en Node.js) para que el servidor no se congele si tres ingenieros suben planos pesados al mismo tiempo.
*   **Motor de extracción unificado en Python puro:** Asegurarse de usar motores como `pdfplumber` que operan nativamente, huyendo de dependencias externas complejas (como Ghostscript o Java), las cuales complican enormemente los despliegues en servidores cloud.

### Interfaz de Usuario (UI/UX)
*   **Bounding Boxes Visuales (Visual Selection):** En lugar de que la IA/algoritmo intente adivinar qué es una tabla, mostrar el plano PDF renderizado en la web para que el usuario "dibuje" un rectángulo sobre la tabla que quiere extraer. Esto incrementaría la precisión al 100% en planos donde los cajetines de firmas confunden al extractor automático.
*   **Gestión de Estado (Persistencia):** Los PDFs procesados y las tablas extraídas deberían guardarse temporalmente en el local storage del navegador (Zustand/Redux) o en la base de datos vinculados a una ID de sesión. Si un ingeniero recarga la página por accidente, no debería tener que volver a extraer un PDF que tomó 2 minutos procesar.
*   **Filtros Inteligentes (Heurística):** Incorporar un sistema de filtrado previo. Muchos planos tienen "tablas" que son solo membretes informativos. Añadir lógica para ignorar automáticamente tablas que tengan menos de 3 filas o no contengan números, presentando al usuario solo los datos útiles.

### Inteligencia Artificial
*   **Llamadas a LLM para Limpieza de Datos Llenos de Ruido (Agente Limpiador):** Los planos escaneados tienen ruido. Una gran mejora sería un botón en el módulo convertidor que tome la tabla en formato Markdown y la envíe a un LLM ligero (como Gemini Flash) con un prompt: *"Extrae estrictamente las columnas X e Y ignorando el texto basura, y devuélvelas en CSV formato estricto"*. Esto solucionaría el 99% de los bordes o caracteres rotos de los PDFs antiguos.
