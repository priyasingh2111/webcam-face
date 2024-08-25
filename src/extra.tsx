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
  const dispatch = useDispatch();
  const isWebcamActive = useSelector((state: RootState) => state.webcam.isWebcamActive);

  useEffect(() => {
    // Load face detection models when the component mounts
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      await faceapi.nets.ageGenderNet.loadFromUri('/models'); // Ensure this model is loaded
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
  
        // Detect faces, age, and gender
        const detections = await faceapi.detectAllFaces(
          canvasRef.current,
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptors().withAgeAndGender();
  
        // Draw face bounding boxes and additional info
        detections.forEach(detection => {
          // Access the properties directly
          const { age, gender, detection: faceDetection } = detection;
          const box = faceDetection?.box; // Optional chaining in case box is not defined
          
          if (box) {
            const roundedAge = Math.round(age); // Round age for display
  
            // Draw bounding box
            context.strokeStyle = '#00FF00'; // Green bounding box
            context.lineWidth = 2;
            context.strokeRect(box.x, box.y, box.width, box.height);
  
            // Draw background for text
            context.fillStyle = '#00FF00'; // Text background color
            context.fillRect(box.x, box.y - 40, 150, 40); // Adjust width and height as needed
  
            // Draw text
            context.font = '16px Arial';
            context.fillStyle = '#000000'; // Text color
            context.fillText(`Age: ${roundedAge}`, box.x + 5, box.y - 20);
            context.fillText(`Gender: ${gender}`, box.x + 5, box.y - 5);
          }
        });
  
        // Get the image data URL
        const imageDataURL = canvasRef.current.toDataURL('image/png');
        setCapturedImage(imageDataURL);
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
          </div>
        </div>

        {/* Box for displaying captured image */}
        <div className="image-box">
          {capturedImage ? (
            <div className="captured-image">
              <h2>Captured Image:</h2>
              <img src={capturedImage} alt="Captured" style={{ width: '500px', height: 'auto' }} />
            </div>
          ) : (
            <h2>No Image Captured</h2>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
