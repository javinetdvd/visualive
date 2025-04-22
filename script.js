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

// --- Variables de Configuración y Estado ---
let audioContext;
let analyser;
let source;
let dataArray; // Se llenará en setupAudioContext
let fullBufferLength; // Guardará el tamaño completo del buffer de frecuencia
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

// Listener para el selector de color del CONTENEDOR
containerBgColorPicker.addEventListener('input', (event) => {
    setContainerBackgroundColor(event.target.value);
});

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
        // Usar un fftSize un poco mayor puede dar más datos para elegir al reducir barras
        analyser.fftSize = 1024; // Ejemplo: 1024 -> bufferLength 512
        fullBufferLength = analyser.frequencyBinCount; // Guardamos el tamaño completo
        dataArray = new Uint8Array(fullBufferLength); // Creamos el array con el tamaño completo

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


// Bucle de Dibujo/Animación (Lógica Modificada)
function drawVisualizer() {
    animationFrameId = requestAnimationFrame(drawVisualizer);

    // 1. Obtener TODOS los datos de frecuencia actuales
    if (analyser && dataArray) { // Asegurarse que estén inicializados
        analyser.getByteFrequencyData(dataArray);
    } else {
        return; // Salir si el audio no está listo
    }


    // 2. Limpiar el canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3. Leer valores de los controles
    const baseBarColor = barColorPicker.value;
    const sensitivity = parseFloat(sensitivitySlider.value);
    const desiredBarThickness = parseFloat(thicknessSlider.value);
    const barOpacity = parseFloat(opacitySlider.value);
    const barSpacing = parseFloat(spacingSlider.value);
    const finalBarColor = hexToRgba(baseBarColor, barOpacity);
    ctx.fillStyle = finalBarColor;

    const totalHeight = canvas.height;
    const centerX = canvas.width / 2;

    // 4. Calcular cuántas barras caben
    // Altura necesaria por barra = grosor + espaciado (si es > 0)
    const heightPerBar = desiredBarThickness + (barSpacing > 0 ? barSpacing : 0);
    let numBarsToDraw = fullBufferLength; // Empezar asumiendo todas

    if (heightPerBar > 0) {
        // Calcular cuántas caben teóricamente
        // Usamos floor para asegurar que caben completamente
        const maxFit = Math.floor(totalHeight / heightPerBar);
        // No podemos dibujar más de las que caben ni más de las que tenemos datos
        numBarsToDraw = Math.max(1, Math.min(maxFit, fullBufferLength));
    } else {
        // Si grosor y espacio son 0, dibujar un número razonable o todas?
        // Por seguridad, dibujemos un mínimo si no.
         numBarsToDraw = Math.max(1, fullBufferLength); // O simplemente fullBufferLength
    }


    // 5. Calcular la altura real de la ranura para CADA UNA de las barras que SÍ se van a dibujar
    const actualSlotHeight = totalHeight / numBarsToDraw;

    // 6. Iterar sólo el número de barras que se van a dibujar
    for (let j = 0; j < numBarsToDraw; j++) {

        // 7. Mapear la barra 'j' (de las que se dibujan) a un índice 'i' en el dataArray original
        // Esto selecciona barras distribuidas por todo el espectro de frecuencias
        const i = Math.floor(j * fullBufferLength / numBarsToDraw);
        const frequencyValue = dataArray[i]; // Obtener el valor de frecuencia para esta barra

        // 8. Calcular longitud de la barra (horizontal)
        let barLength = (frequencyValue / 255) * centerX * sensitivity;
        if (barLength < 0.5) barLength = 0;

        // 9. Calcular la posición Y
        // Centrar la barra (con su grosor deseado) dentro de su ranura (actualSlotHeight)
        const slotCenterY = (j + 0.5) * actualSlotHeight;
        const y = slotCenterY - (desiredBarThickness / 2);

        // 10. Dibujar las barras (asegurándose de que hay longitud y grosor > 0)
        // Usamos 'desiredBarThickness' porque hemos calculado que caben con ese grosor
        if (barLength > 0 && desiredBarThickness > 0) {
            // Barra IZQUIERDA
            ctx.fillRect(0, y, barLength, desiredBarThickness);

            // Barra DERECHA
            ctx.fillRect(canvas.width - barLength, y, barLength, desiredBarThickness);
        }
    }
}


// --- Funciones de Pantalla Completa y Listeners (Sin cambios) ---

// Funcionalidad Pantalla Completa
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

// Actualizar botón y redimensionar canvas al cambiar estado de pantalla completa
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

// --- Inicialización ---
resizeCanvas();
setContainerBackgroundColor(containerBgColorPicker.value);

console.log("Aplicación lista.");