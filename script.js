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

// Array de todos los controles cuyos valores queremos guardar
const controlsToSave = [
    barColorPicker,
    containerBgColorPicker,
    sensitivitySlider,
    thicknessSlider,
    opacitySlider,
    spacingSlider
];

// --- Variables de Configuración y Estado ---
let audioContext;
let analyser;
let source;
let dataArray;
let fullBufferLength;
let animationFrameId;
let currentStream;

// --- Funciones ---

// Ajustar tamaño del canvas
function resizeCanvas() {
    const displayWidth = visualizerContainer.clientWidth;
    const displayHeight = visualizerContainer.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}

// Cargar y mostrar logo
logoUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { backgroundLogo.src = e.target.result; }
        reader.readAsDataURL(file);
    }
});

// Establecer color de fondo del CONTENEDOR
function setContainerBackgroundColor(color) {
    visualizerContainer.style.backgroundColor = color;
}

// Inicialización del Audio y Análisis
async function setupAudioContext() {
    try {
        if (currentStream) currentStream.getTracks().forEach(track => track.stop());
        if (audioContext && audioContext.state !== 'closed') await audioContext.close();

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        currentStream = stream;
        source = audioContext.createMediaStreamSource(stream);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        fullBufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(fullBufferLength);

        source.connect(analyser);

        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        drawVisualizer();
        startButton.textContent = "Micrófono Activo";
        startButton.disabled = true;

    } catch (err) {
        console.error('Error al acceder al micrófono:', err);
        alert('No se pudo acceder al micrófono. Verifica los permisos.');
        startButton.textContent = "Iniciar Micrófono";
        startButton.disabled = false;
    }
}

// Helper: Convertir color Hex (#RRGGBB) a RGBA(r, g, b, alpha)
function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    alpha = Math.max(0, Math.min(1, alpha));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- Funciones para Guardar/Cargar Ajustes en URL Hash ---

function saveSettingsToHash() {
    console.log(">>> saveSettingsToHash() INICIADA"); // Log de depuración

    const settings = {};
    settings.bc = barColorPicker.value;
    settings.bg = containerBgColorPicker.value;
    settings.s = sensitivitySlider.value;
    settings.t = thicknessSlider.value;
    settings.o = opacitySlider.value;
    settings.sp = spacingSlider.value;

    console.log(">>> Settings object:", settings); // Log de depuración

    const params = new URLSearchParams(settings);
    const hashString = '#' + params.toString();

    console.log(">>> Intentando establecer hash:", hashString); // Log de depuración

    try {
        history.replaceState(null, '', hashString);
        console.log(">>> history.replaceState EJECUTADO con éxito"); // Log de depuración
    } catch (error) {
        console.error(">>> ERROR al ejecutar history.replaceState:", error); // Log de depuración
    }
}

// --- VERSIÓN DE loadSettingsFromHash CON LOGS DETALLADOS ---
function loadSettingsFromHash() {
    if (location.hash.length > 1) {
        console.log(">>> loadSettingsFromHash() detectó hash:", location.hash); // Log existente
        try {
            const params = new URLSearchParams(location.hash.substring(1));
            console.log(">>> Params parseados:", params.toString()); // Ver los parámetros leídos

            // Variable para rastrear si algo se cargó
            let settingsApplied = false;

            // --- Depuración detallada para cada parámetro ---

            const bc = params.get('bc');
            console.log(`>>> Hash 'bc': ${bc} | Valor actual antes: ${barColorPicker.value}`); // Log ANTES
            if (bc) {
                barColorPicker.value = bc;
                console.log(`>>> DESPUÉS: barColorPicker.value = ${barColorPicker.value}`); // Log DESPUÉS
                settingsApplied = true;
            }

            const bg = params.get('bg');
            console.log(`>>> Hash 'bg': ${bg} | Valor actual antes: ${containerBgColorPicker.value}`); // Log ANTES
            if (bg) {
                containerBgColorPicker.value = bg;
                console.log(`>>> DESPUÉS: containerBgColorPicker.value = ${containerBgColorPicker.value}`); // Log DESPUÉS
                setContainerBackgroundColor(bg); // Aplicar visualmente
                console.log(`>>> Background color aplicado: ${bg}`);
                settingsApplied = true;
            }

            const s = params.get('s');
            console.log(`>>> Hash 's': ${s} | Valor actual antes: ${sensitivitySlider.value}`); // Log ANTES
            if (s) {
                sensitivitySlider.value = s;
                console.log(`>>> DESPUÉS: sensitivitySlider.value = ${sensitivitySlider.value}`); // Log DESPUÉS
                settingsApplied = true;
            }

            const t = params.get('t');
            console.log(`>>> Hash 't': ${t} | Valor actual antes: ${thicknessSlider.value}`); // Log ANTES
            if (t) {
                thicknessSlider.value = t;
                console.log(`>>> DESPUÉS: thicknessSlider.value = ${thicknessSlider.value}`); // Log DESPUÉS
                settingsApplied = true;
            }

            const o = params.get('o');
            console.log(`>>> Hash 'o': ${o} | Valor actual antes: ${opacitySlider.value}`); // Log ANTES
            if (o) {
                opacitySlider.value = o;
                console.log(`>>> DESPUÉS: opacitySlider.value = ${opacitySlider.value}`); // Log DESPUÉS
                settingsApplied = true;
            }

            const sp = params.get('sp');
            console.log(`>>> Hash 'sp': ${sp} | Valor actual antes: ${spacingSlider.value}`); // Log ANTES
            if (sp) {
                spacingSlider.value = sp;
                console.log(`>>> DESPUÉS: spacingSlider.value = ${spacingSlider.value}`); // Log DESPUÉS
                settingsApplied = true;
            }

            // --- Fin depuración detallada ---

            if (settingsApplied) {
                console.log(">>> ¡Ajustes aplicados desde el hash!");
            } else {
                console.log(">>> Hash detectado, pero no se aplicó ningún ajuste conocido.");
            }
            return settingsApplied; // Devolver true si se aplicó al menos uno

        } catch (error) {
            console.error(">>> ERROR parseando o aplicando ajustes desde el hash:", error);
            return false;
        }
    } else {
        console.log(">>> loadSettingsFromHash() no encontró hash."); // Log existente
    }
    return false; // No había hash o no se aplicó nada
}
// --- FIN VERSIÓN DE loadSettingsFromHash CON LOGS DETALLADOS ---


// Bucle de Dibujo/Animación
function drawVisualizer() {
    animationFrameId = requestAnimationFrame(drawVisualizer);

    if (!analyser || !dataArray) return;
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Leer valores actualizados (puede que vengan del hash o del input directo)
    const baseBarColor = barColorPicker.value;
    const sensitivity = parseFloat(sensitivitySlider.value);
    const desiredBarThickness = parseFloat(thicknessSlider.value);
    const barOpacity = parseFloat(opacitySlider.value);
    const barSpacing = parseFloat(spacingSlider.value);
    const finalBarColor = hexToRgba(baseBarColor, barOpacity);
    ctx.fillStyle = finalBarColor;

    const totalHeight = canvas.height;
    const centerX = canvas.width / 2;

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


// --- Funciones de Pantalla Completa ---
function toggleFullScreen() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (!isFullscreen) {
        const element = visualizerContainer;
        if (element.requestFullscreen) element.requestFullscreen();
        else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
        else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
        else if (element.msRequestFullscreen) element.msRequestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
    }
}
function handleFullscreenChange() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (isFullscreen) {
        fullscreenButton.textContent = 'Salir Pantalla Completa';
    } else {
        fullscreenButton.textContent = 'Pantalla Completa';
    }
    setTimeout(resizeCanvas, 100);
}

// --- Event Listeners ---
startButton.addEventListener('click', setupAudioContext);
fullscreenButton.addEventListener('click', toggleFullScreen);
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);
window.addEventListener('resize', resizeCanvas);

// --- Listener para guardar ajustes ---
controlsToSave.forEach(control => {
    control.addEventListener('input', (event) => {
        console.log(`>>> Evento 'input' detectado en: ${event.target.id}`); // Log de depuración
        saveSettingsToHash();
    });
});
// Listener específico para aplicar color de fondo inmediatamente
containerBgColorPicker.addEventListener('input', (event) => {
    setContainerBackgroundColor(event.target.value);
    // saveSettingsToHash ya es llamado por el listener genérico de arriba
});


// --- Inicialización ---
resizeCanvas(); // Ajustar tamaño inicial
console.log(">>> Ejecutando loadSettingsFromHash al inicio..."); // Log de depuración

// ---> ÚNICA DECLARACIÓN DE loadedFromHash <---
const loadedFromHash = loadSettingsFromHash();

// Si NO se cargaron ajustes desde el hash, aplicar el color de fondo por defecto
if (!loadedFromHash) {
    console.log(">>> Aplicando color de fondo por defecto."); // Log de depuración
    setContainerBackgroundColor(containerBgColorPicker.value);
} else {
    console.log(">>> Se cargaron ajustes desde el hash, no se aplica fondo por defecto."); // Log extra
}

console.log("Aplicación lista.");

// Opcional: guardar estado inicial si no hay hash
// if (!location.hash.substring(1)) {
//    saveSettingsToHash();
// }
