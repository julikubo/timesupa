<!doctype html>
<html lang="pt-br">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TimeSupa - Login Facial</title>
  <style>
    body {
      margin: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #222;
      color: white;
      font-family: sans-serif;
      height: 100vh;
      flex-direction: column;
      transition: background 0.3s;
    }

    video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
      /* espelha */
      z-index: -1;
    }

    #msg {
      position: absolute;
      top: 10px;
      left: 10px;
      padding: 10px 20px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 8px;
      font-size: 1em;
      text-align: left;
      z-index: 10;
    }

    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100;
        display: none;
    }
    
    .loading-text {
        font-size: 1.5em;
        color: #fff;
    }
  </style>
</head>

<body>
  <video id="video" autoplay muted playsinline></video>
  <div id="msg">Carregando modelos…</div>
  
  <div id="loading" class="loading-overlay">
      <div class="loading-text">Autenticando...</div>
  </div>

  <!-- Import face-api.js -->
  <script src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"></script>

  <script>
    const video = document.getElementById('video');
    const msg = document.getElementById('msg');
    const loading = document.getElementById('loading');
    let faceMatcher = null;
    let isRecognitionRunning = false;
    let isAuthenticating = false;

    // Paths to proj/cam resources (corrigidos)
    const MODELS_PATH = '../../cam/models';
    const FACES_JSON_PATH = '../../cam/faces.json';
    const LABELED_IMAGES_PATH = '../../cam/labeled_images';

    // Load models and start camera
    Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_PATH),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_PATH)
    ]).then(startCamera).catch(err => {
      console.error(err);
      msg.textContent = "Erro ao carregar modelos: " + err;
    });

    async function startCamera() {
      msg.textContent = "Iniciando câmera…";
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" }
        });
        video.srcObject = stream;

        // Initial load
        await loadLabeledImages();

      } catch (err) {
        console.error(err);
        msg.textContent = "Erro na câmera: " + err;
      }
    }

    async function loadLabeledImages() {
      msg.textContent = "Carregando dados faciais…";

      try {
        const response = await fetch(FACES_JSON_PATH);
        const imageFiles = await response.json();

        if (imageFiles.length === 0) {
          msg.textContent = "Nenhuma foto encontrada para reconhecimento.";
          return;
        }

        const labeledFaceDescriptors = await Promise.all(
          imageFiles.map(async file => {
            const label = file.split('.')[0]; // Remove extension
            const imgUrl = `${LABELED_IMAGES_PATH}/${file}`;
            const img = await faceapi.fetchImage(imgUrl);
            const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

            if (!detections) {
              console.warn(`No face detected in ${file}`);
              return null;
            }
            return new faceapi.LabeledFaceDescriptors(label, [detections.descriptor]);
          })
        );

        // Filter out nulls
        const validDescriptors = labeledFaceDescriptors.filter(d => d !== null);

        if (validDescriptors.length > 0) {
          faceMatcher = new faceapi.FaceMatcher(validDescriptors, 0.6);
          console.log("Face matcher updated with " + validDescriptors.length + " faces.");
          msg.textContent = "Pronto! Olhe para a câmera.";
          startRecognition();
        } else {
             msg.textContent = "Não foi possível criar modelos faciais.";
        }

      } catch (err) {
        console.error(err);
        msg.textContent = "Erro ao carregar fotos: " + err;
      }
    }

    function startRecognition() {
      isRecognitionRunning = true;
      const canvas = faceapi.createCanvasFromMedia(video);
      document.body.append(canvas);
      const displaySize = { width: video.videoWidth || 640, height: video.videoHeight || 480 };
      faceapi.matchDimensions(canvas, displaySize);

      setInterval(async () => {
        if (isAuthenticating) return; // Stop processing if authenticating

        const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        const results = resizedDetections.map(d => {
          if (faceMatcher) {
            return faceMatcher.findBestMatch(d.descriptor);
          } else {
            return { label: 'Desconhecido', distance: 0 };
          }
        });

        results.forEach((result, i) => {
          const box = resizedDetections[i].detection.box;
          // Mirror the X coordinate to match the mirrored video
          const mirroredBox = {
            x: displaySize.width - box.x - box.width,
            y: box.y,
            width: box.width,
            height: box.height
          };

          const label = result.label === 'unknown' ? 'Desconhecido' : result.label;
          const drawBox = new faceapi.draw.DrawBox(mirroredBox, { label: label });
          drawBox.draw(canvas);
          
          // Attempt login if face is recognized and not unknown
          if (label !== 'Desconhecido' && label !== 'unknown' && !isAuthenticating) {
              authenticateUser(label);
          }
        });
        
        if (results.length === 0) {
             msg.textContent = "Aguardando rosto...";
             document.body.style.background = "#222";
        }

      }, 200); // Check every 200ms
    }
    
    async function authenticateUser(faceName) {
        isAuthenticating = true;
        msg.textContent = `Identificado: ${faceName}. Entrando...`;
        document.body.style.background = "#0a6";
        loading.style.display = 'flex';
        
        try {
            const response = await fetch('auth_facial.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ face_name: faceName })
            });
            
            const data = await response.json();
            
            if (data.success) {
                window.location.href = data.redirect;
            } else {
                console.error("Authentication failed:", data.message);
                msg.textContent = `Erro: ${data.message}`;
                document.body.style.background = "#a00";
                loading.style.display = 'none';
                
                // Wait a bit before trying again to avoid loop
                setTimeout(() => {
                    isAuthenticating = false;
                    document.body.style.background = "#222";
                    msg.textContent = "Tente novamente.";
                }, 3000);
            }
        } catch (error) {
            console.error("Error calling auth API:", error);
            msg.textContent = "Erro de conexão.";
            loading.style.display = 'none';
            isAuthenticating = false;
        }
    }
  </script>
</body>

</html>
