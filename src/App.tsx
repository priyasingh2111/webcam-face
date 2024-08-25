import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store';
import { setWebcamActive } from './webcamSlice';
import * as faceapi from 'face-api.js';

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null); // New state for uploaded image
  const dispatch = useDispatch();
  const isWebcamActive = useSelector((state: RootState) => state.webcam.isWebcamActive);

  useEffect(() => {
    // Load face detection models when the component mounts
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/webcam-face/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/webcam-face/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/webcam-face/models');
      await faceapi.nets.ageGenderNet.loadFromUri('/webcam-face/models'); // Ensure this model is loaded
      await faceapi.nets.faceExpressionNet.loadFromUri('/webcam-face/models');
    };
    
    loadModels();
  }, []);

  const startWebcam = async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        setStream(newStream);
        dispatch(setWebcamActive(true));
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
    }
  };

  const stopWebcam = () => {
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      setStream(null);
      dispatch(setWebcamActive(false));
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Update your code in the captureImage function or similar

const captureImage = async () => {
  if (videoRef.current && canvasRef.current) {
    const context = canvasRef.current.getContext('2d');
    if (context) {
      // Ensure canvas matches the video dimensions
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      // Draw the video frame to the canvas
      context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);

      // Detect faces, age, gender, and emotions
      const detections = await faceapi.detectAllFaces(
        canvasRef.current,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptors().withAgeAndGender().withFaceExpressions(); // Ensure face expressions are included

      // Draw face bounding boxes and additional info
      detections.forEach(detection => {
        const { age, gender, expressions, detection: faceDetection} = detection;
        const box = faceDetection?.box; // Optional chaining in case box is not defined
        
        if (box) {
          const roundedAge = Math.round(age); // Round age for display

          // Draw bounding box
          context.strokeStyle = '#00FF00'; // Green bounding box
          context.lineWidth = 2;
          context.strokeRect(box.x, box.y, box.width, box.height);

          // Draw background for text
          context.fillStyle = '#00FF00'; // Text background color
          context.fillRect(box.x, box.y - 60, 200, 60); // Adjust width and height as needed

          // Draw text
          context.font = '16px Arial';
          context.fillStyle = '#000000'; // Text color
          context.fillText(`Age: ${roundedAge}`, box.x + 5, box.y - 40);
          context.fillText(`Gender: ${gender}`, box.x + 5, box.y - 22.5);

          // Draw emotion
          if (expressions) {
            // Cast expressions to a type that allows indexing by string
            const expressionsObj = expressions as unknown as { [key: string]: number };

            // Find the emotion with the highest confidence
            const highestEmotion = Object.keys(expressionsObj).reduce((a, b) => expressionsObj[a] > expressionsObj[b] ? a : b);
            context.fillText(`Emotion: ${highestEmotion}`, box.x + 5, box.y - 5); // Adjust the vertical position
          }
        }
      });

      // Get the image data URL
      const imageDataURL = canvasRef.current.toDataURL('image/png');
      setCapturedImage(imageDataURL);
    }
  }
};


  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);
  
      if (canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
          const img = new Image();
          img.src = imageUrl;
          img.onload = async () => {
            if (canvasRef.current && context) {
              canvasRef.current.width = img.width;
              canvasRef.current.height = img.height;
              context.drawImage(img, 0, 0);
  
              // Detect faces, age, gender, and emotions
              const detections = await faceapi.detectAllFaces(
                canvasRef.current,
                new faceapi.TinyFaceDetectorOptions()
              ).withFaceLandmarks().withFaceDescriptors().withAgeAndGender().withFaceExpressions();
  
              // Draw face bounding boxes and additional info
              detections.forEach(detection => {
                const { age, gender, detection: faceDetection, expressions } = detection;
                const box = faceDetection?.box;
  
                if (box) {
                  const roundedAge = Math.round(age);
  
                  // Draw bounding box
                  context.strokeStyle = '#00FF00'; // Green bounding box
                  context.lineWidth = 2;
                  context.strokeRect(box.x, box.y, box.width, box.height);
  
                  // Draw background for text
                  context.fillStyle = '#00FF00'; // Text background color
                  context.fillRect(box.x, box.y - 60, 150, 60);
  
                  // Draw text
                  context.font = '16px Arial';
                  context.fillStyle = '#000000'; // Text color
                  context.fillText(`Age: ${roundedAge}`, box.x + 5, box.y - 40);
                  context.fillText(`Gender: ${gender}`, box.x + 5, box.y - 22.5);
  
                  // Draw emotion
                  if (expressions) {
                    // Cast expressions to a type that allows indexing by string
                    const expressionsObj = expressions as unknown as { [key: string]: number };

                    // Find the emotion with the highest confidence
                    const highestEmotion = Object.keys(expressionsObj).reduce((a, b) => expressionsObj[a] > expressionsObj[b] ? a : b);
                    context.fillText(`Emotion: ${highestEmotion}`, box.x + 5, box.y - 5); // Adjust the vertical position
                  }

                }
              });
  
              // Get the image data URL
              const imageDataURL = canvasRef.current.toDataURL('image/png');
              setCapturedImage(imageDataURL);
            }
          };
        }
      }
    }
  };
  


  
  

  return (
    <div className="App">
      <header>
        <h1>Webcam Face Recognition</h1>
      </header>

      <div className="content-container">
        {/* Box for Webcam controls and video stream */}
        <div className="webcam-box">
          <h2>Webcam Feed</h2>
          <video ref={videoRef} autoPlay muted width="500" height="480" />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="controls">
            <button onClick={startWebcam} disabled={isWebcamActive}>Start Webcam</button>
            <button onClick={stopWebcam} disabled={!isWebcamActive}>Stop Webcam</button>
            <button onClick={captureImage} disabled={!isWebcamActive}>Capture Image</button>
            {/* New file input for image upload */}
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </div>
        </div>

        {/* Box for displaying captured and uploaded image */}
        <div className="image-box">
          {capturedImage ? (
            <div className="image-content">
              <h2>Captured Image:</h2>
              <img src={capturedImage} alt="Captured" style={{ width: '500px', height: 'auto' }} />
            </div>
          ) : uploadedImage ? (
            <div className="image-content">
              <h2>Uploaded Image:</h2>
              <img src={uploadedImage} alt="Uploaded" style={{ width: '500px', height: 'auto' }} />
            </div>
          ) : (
            <h2>No Captured/Uploaded Image</h2>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
