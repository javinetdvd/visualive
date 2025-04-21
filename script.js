// --- Obtener Elementos del DOM ---
const canvas = document.getElementById('visualizer-canvas');
const ctx = canvas.getContext('2d');
const visualizerContainer = document.querySelector('.visualizer-container');
const startButton = document.getElementById('start-button');
const logoUpload = document.getElementById('logo-upload');
const backgroundLogo = document.getElementById('background-logo');
const barColorPicker = document.getElementById('bar-color-picker');
const containerBgColorPicker = document.getElementById('container-bg-color-picker');
const sensitivitySlider = document.getElementById('sensitivity-slider');
const thicknessSlider = document.getElementById('thickness-slider');
const opacitySlider = document.getElementById('opacity-slider');
const spacingSlider = document.getElementById('spacing-slider');
const fullscreenButton = document.getElementById('fullscreen-button');

// Array de controles guardables (sin cambios)
const controlsToSave = [
    barColorPicker, containerBgColorPicker, sensitivitySlider,
    thicknessSlider, opacitySlider, spacingSlider
];

// --- Variables de Configuración y Estado ---
let audioContext;
let analyser; // Se inicializará en setupAudioContext
let source;
let dataArray; // Se inicializará en setupAudioContext
let fullBufferLength;
let animationFrameId; // Guardará el ID del bucle principal
let currentStream;

// --- Funciones ---

// Ajustar tamaño del canvas (sin cambios)
function resizeCanvas() {
    const displayWidth = visualizerContainer.clientWidth;
    const displayHeight = visualizerContainer.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}

// Cargar y mostrar logo (sin cambios)
logoUpload.addEventListener('change', (event) => { /* ... */ });

// Establecer color de fondo del CONTENEDOR (sin cambios)
function setContainerBackgroundColor(color) { /* ... */ }

// --- MODIFICADO: setupAudioContext ya no inicia drawVisualizer ---
// Inicialización del Audio y Análisis
async function setupAudioContext() {
    try {
        // Limpiar recursos anteriores si existen
        if (currentStream) currentStream.getTracks().forEach(track => track.stop());
        if (audioContext && audioContext.state !== 'closed') await audioContext.close();

        // Crear nuevo contexto y obtener stream
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        currentStream = stream;
        source = audioContext.createMediaStreamSource(stream);

        // Crear y configurar Analyser
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024; // O el valor que prefieras
        fullBufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(fullBufferLength); // Inicializar dataArray aquí

        // Conectar nodos
        source.connect(analyser);
        // NO conectar analyser a destination

        // --- EL BUCLE drawVisualizer YA ESTÁ CORRIENDO ---
        // Ya no necesitamos cancelarlo ni reiniciarlo aquí.
        // Simplemente actualizamos el botón
        startButton.textContent = "Micrófono Activo";
        startButton.disabled = true;
        console.log(">>> AudioContext listo. Analyser y dataArray inicializados.");

    } catch (err) {
        console.error('>>> Error al acceder al micrófono:', err);
        alert('No se pudo acceder al micrófono. Verifica los permisos.');
        // Resetear estado si falla
        analyser = null; // Indicar que no está listo
        dataArray = null;
        startButton.textContent = "Iniciar Micrófono";
        startButton.disabled = false;
    }
}

// Helper: Convertir color Hex a RGBA (sin cambios)
function hexToRgba(hex, alpha) { /* ... */ }

// Funciones para Guardar/Cargar Ajustes en URL Hash (sin cambios)
function saveSettingsToHash() { /* ... */ }
function loadSettingsFromHash() { /* ... con logs detallados ... */ }

// --- MODIFICADO: Bucle de Dibujo/Animación ---
function drawVisualizer() {
    // 1. Solicitar el próximo frame INMEDIATAMENTE para mantener el bucle
    animationFrameId = requestAnimationFrame(drawVisualizer);

    // 2. Limpiar siempre el canvas (muestra fondo/logo)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3. COMPROBAR SI EL AUDIO ESTÁ LISTO
    if (!analyser || !dataArray) {
        // Audio no iniciado o fallo al iniciarlo.
        // Opcional: Dibujar un estado 'idle' aquí si se desea.
        // Por ahora, simplemente no dibujamos barras.
        return; // Salir de la función para este frame
    }

    // --- Si llegamos aquí, el audio está listo ---

    // 4. Obtener datos de frecuencia actuales
    analyser.getByteFrequencyData(dataArray);

    // 5. Leer valores de los controles (igual que antes)
    const baseBarColor = barColorPicker.value;
    const sensitivity = parseFloat(sensitivitySlider.value);
    const desiredBarThickness = parseFloat(thicknessSlider.value);
    const barOpacity = parseFloat(opacitySlider.value);
    const barSpacing = parseFloat(spacingSlider.value);
    const finalBarColor = hexToRgba(baseBarColor, barOpacity);
    ctx.fillStyle = finalBarColor;

    const totalHeight = canvas.height;
    const centerX = canvas.width / 2;

    // 6. Calcular cuántas barras caben y dibujar (igual que antes)
    const heightPerBar = desiredBarThickness + (barSpacing > 0 ? barSpacing : 0);
    let numBarsToDraw = fullBufferLength;

    if (heightPerBar > 0) {
        const maxFit = Math.floor(totalHeight / heightPerBar);
        numBarsToDraw = Math.max(1, Math.min(maxFit, fullBufferLength));
    } else {
         numBarsToDraw = Math.max(1, fullBufferLength);
    }

    const actualSlotHeight = totalHeight / numBarsToDraw;

    for (let j = 0; j < numBarsToDraw; j++) {
        const i = Math.floor(j * fullBufferLength / numBarsToDraw);
        const frequencyValue = dataArray[i];
        let barLength = (frequencyValue / 255) * centerX * sensitivity;
        if (barLength < 0.5) barLength = 0;

        const slotCenterY = (j + 0.5) * actualSlotHeight;
        const y = slotCenterY - (desiredBarThickness / 2);

        if (barLength > 0 && desiredBarThickness > 0) {
            ctx.fillRect(0, y, barLength, desiredBarThickness);
            ctx.fillRect(canvas.width - barLength, y, barLength, desiredBarThickness);
        }
    }
}


// --- Funciones de Pantalla Completa (sin cambios) ---
function toggleFullScreen() { /* ... */ }
function handleFullscreenChange() { /* ... */ }

// --- Event Listeners ---
startButton.addEventListener('click', setupAudioContext); // Llama a la función modificada
fullscreenButton.addEventListener('click', toggleFullScreen);
// ... otros listeners (hash, resize, color de fondo, etc.) ...
controlsToSave.forEach(control => {
    control.addEventListener('input', (event) => {
        console.log(`>>> Evento 'input' detectado en: ${event.target.id}`);
        saveSettingsToHash();
    });
});
containerBgColorPicker.addEventListener('input', (event) => {
    setContainerBackgroundColor(event.target.value);
});
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);
window.addEventListener('resize', resizeCanvas);


// --- Inicialización ---
resizeCanvas();
console.log(">>> Ejecutando loadSettingsFromHash al inicio...");
const loadedFromHash = loadSettingsFromHash();
if (!loadedFromHash) {
    console.log(">>> Aplicando color de fondo por defecto.");
    setContainerBackgroundColor(containerBgColorPicker.value);
} else {
    console.log(">>> Se cargaron ajustes desde el hash, no se aplica fondo por defecto.");
}

// --- INICIAR EL BUCLE DE ANIMACIÓN ---
console.log(">>> Iniciando bucle drawVisualizer...");
// Solo necesitamos llamarlo una vez para empezar, se auto-perpetúa
// No guardamos el ID aquí porque el bucle debe correr siempre.
// Si quisiéramos pararlo en algún momento, necesitaríamos guardarlo.
requestAnimationFrame(drawVisualizer);

console.log("Aplicación lista. Bucle de dibujo iniciado (estado inactivo).");
