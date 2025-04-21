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

// Cargar y mostrar logo (sin cambios)
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

// Inicialización del Audio y Análisis (sin cambios)
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

// Helper: Convertir color Hex (#RRGGBB) a RGBA(r, g, b, alpha) (sin cambios)
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

// --- NUEVO: Funciones para Guardar/Cargar Ajustes en URL Hash ---

// Guarda los ajustes actuales de los controles en el location.hash
function saveSettingsToHash() {
    const settings = {};
    // Usamos IDs cortos para mantener la URL más manejable
    settings.bc = barColorPicker.value;           // Bar Color
    settings.bg = containerBgColorPicker.value;   // Background Color
    settings.s = sensitivitySlider.value;       // Sensitivity
    settings.t = thicknessSlider.value;         // Thickness
    settings.o = opacitySlider.value;           // Opacity
    settings.sp = spacingSlider.value;          // Spacing

    // Convertir el objeto a una cadena de parámetros URL-like
    const params = new URLSearchParams(settings);
    // Actualizar el hash sin recargar la página
    // Usamos replaceState para evitar llenar el historial del navegador con cada ajuste fino
    history.replaceState(null, '', '#' + params.toString());

    // console.log("Settings saved to hash:", '#' + params.toString()); // Para depuración
}

// Carga los ajustes desde el location.hash y los aplica a los controles
function loadSettingsFromHash() {
    if (location.hash.length > 1) { // Verificar que haya algo después del '#'
        try {
            const params = new URLSearchParams(location.hash.substring(1)); // Quitar el '#' inicial

            // Aplicar cada parámetro encontrado al control correspondiente
            const bc = params.get('bc');
            if (bc) barColorPicker.value = bc;

            const bg = params.get('bg');
            if (bg) {
                containerBgColorPicker.value = bg;
                setContainerBackgroundColor(bg); // Aplicar color de fondo inmediatamente
            }

            const s = params.get('s');
            if (s) sensitivitySlider.value = s;

            const t = params.get('t');
            if (t) thicknessSlider.value = t;

            const o = params.get('o');
            if (o) opacitySlider.value = o;

            const sp = params.get('sp');
            if (sp) spacingSlider.value = sp;

            console.log("Settings loaded from hash."); // Para depuración
            return true; // Indicar que se cargaron ajustes

        } catch (error) {
            console.error("Error loading settings from hash:", error);
            // No hacer nada si el hash es inválido, se usarán los valores por defecto
            return false;
        }
    }
    return false; // No se cargaron ajustes desde el hash
}


// Bucle de Dibujo/Animación (sin cambios en la lógica de dibujo)
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


// --- Funciones de Pantalla Completa (sin cambios) ---
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

// --- MODIFICADO: Añadir listener para guardar ajustes ---
// Escuchar el evento 'input' en todos los controles guardables
controlsToSave.forEach(control => {
    control.addEventListener('input', saveSettingsToHash);
});
// También actualizamos el color de fondo directamente cuando cambia su picker
containerBgColorPicker.addEventListener('input', (event) => {
    setContainerBackgroundColor(event.target.value);
    // saveSettingsToHash se llama automáticamente por el listener genérico de arriba
});


// --- Inicialización ---
resizeCanvas(); // Ajustar tamaño inicial

// Intentar cargar ajustes desde el hash PRIMERO
const loadedFromHash = loadSettingsFromHash();

// Si NO se cargaron ajustes desde el hash, aplicar el color de fondo por defecto
if (!loadedFromHash) {
    setContainerBackgroundColor(containerBgColorPicker.value);
}
// Nota: Los valores por defecto de los demás controles ya están en el HTML
// y `loadSettingsFromHash` los sobrescribe si encuentra algo en la URL.

console.log("Aplicación lista.");
// Si quieres guardar el estado inicial (por defecto) en el hash al cargar si no hay nada:
// if (!location.hash.substring(1)) {
//    saveSettingsToHash();
// }
// ... (resto del código anterior) ...

// --- NUEVO: Funciones para Guardar/Cargar Ajustes en URL Hash ---

function saveSettingsToHash() {
    console.log(">>> saveSettingsToHash() INICIADA"); // <<< AÑADIR ESTO

    const settings = {};
    settings.bc = barColorPicker.value;
    settings.bg = containerBgColorPicker.value;
    settings.s = sensitivitySlider.value;
    settings.t = thicknessSlider.value;
    settings.o = opacitySlider.value;
    settings.sp = spacingSlider.value;

    console.log(">>> Settings object:", settings); // <<< AÑADIR ESTO

    const params = new URLSearchParams(settings);
    const hashString = '#' + params.toString();

    console.log(">>> Intentando establecer hash:", hashString); // <<< AÑADIR ESTO

    try {
        history.replaceState(null, '', hashString);
        console.log(">>> history.replaceState EJECUTADO con éxito"); // <<< AÑADIR ESTO
    } catch (error) {
        console.error(">>> ERROR al ejecutar history.replaceState:", error); // <<< AÑADIR ESTO
    }
}

function loadSettingsFromHash() {
   // ... (código de loadSettingsFromHash sin cambios necesarios para este debug) ...
   // Asegúrate de que los console.log dentro de esta función (si los dejaste)
   // también se muestren al cargar la página si hay un hash.
   if (location.hash.length > 1) {
       console.log(">>> loadSettingsFromHash() detectó hash:", location.hash);
       // ... resto del try/catch ...
   } else {
       console.log(">>> loadSettingsFromHash() no encontró hash.");
   }
   // ...
}

// ... (resto del código: drawVisualizer, etc.) ...


// --- Event Listeners ---
// ... (otros listeners) ...

// --- MODIFICADO: Añadir listener para guardar ajustes ---
controlsToSave.forEach(control => {
    control.addEventListener('input', (event) => { // Añadimos 'event' para loguear
        console.log(`>>> Evento 'input' detectado en: ${event.target.id}`); // <<< AÑADIR ESTO
        saveSettingsToHash(); // Llamar a la función que ahora tiene logs
    });
});
containerBgColorPicker.addEventListener('input', (event) => {
    setContainerBackgroundColor(event.target.value);
    // saveSettingsToHash ya es llamado por el listener genérico de arriba
});


// --- Inicialización ---
resizeCanvas();
console.log(">>> Ejecutando loadSettingsFromHash al inicio..."); // <<< AÑADIR ESTO
const loadedFromHash = loadSettingsFromHash();
if (!loadedFromHash) {
    console.log(">>> Aplicando color de fondo por defecto."); // <<< AÑADIR ESTO
    setContainerBackgroundColor(containerBgColorPicker.value);
}
console.log("Aplicación lista.");
