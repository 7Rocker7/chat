import React, { useState, useRef, useEffect } from 'react';
import { X, Video, Square, RefreshCw, Send, AlertCircle } from 'lucide-react';

export default function VideoRecordModal({ isOpen, onClose, onSendVideo }) {
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraError, setCameraError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const videoPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      resetState();
    }
    return () => {
      stopCamera();
      resetState();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      setStream(mediaStream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera or microphone. Please check browser permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };

  const resetState = () => {
    setIsRecording(false);
    setRecordedChunks([]);
    if (recordedBlobUrl) {
      URL.revokeObjectURL(recordedBlobUrl);
    }
    setRecordedBlobUrl(null);
    setRecordedBlob(null);
    setRecordingTime(0);
    clearInterval(timerRef.current);
  };

  const startRecording = () => {
    if (!stream) return;
    setRecordedChunks([]);
    setRecordedBlobUrl(null);
    setRecordedBlob(null);

    const options = { mimeType: 'video/webm;codecs=vp8,opus' };
    let recorder;
    try {
      recorder = new MediaRecorder(stream, options);
    } catch (e) {
      recorder = new MediaRecorder(stream);
    }

    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setRecordedBlob(blob);
      setRecordedBlobUrl(URL.createObjectURL(blob));
    };

    recorder.start(200);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleSend = async () => {
    if (!recordedBlob) return;
    setIsUploading(true);
    try {
      const file = new File([recordedBlob], `video-recording-${Date.now()}.webm`, { type: 'video/webm' });
      await onSendVideo(file);
      onClose();
    } catch (err) {
      console.error('Error sending video:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card video-modal animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={20} color="#6366f1" />
            <h2>Record Video Clip</h2>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="video-modal-body">
          {cameraError ? (
            <div className="camera-error-container">
              <AlertCircle size={40} color="#da373c" />
              <p>{cameraError}</p>
              <button className="primary-button" onClick={startCamera}>
                Retry Camera Access
              </button>
            </div>
          ) : (
            <div className="video-preview-wrapper">
              {!recordedBlobUrl ? (
                <>
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="video-live-preview"
                  />
                  {isRecording && (
                    <div className="video-recording-indicator">
                      <div className="record-red-dot"></div>
                      <span>REC {formatTime(recordingTime)}</span>
                    </div>
                  )}
                </>
              ) : (
                <video
                  src={recordedBlobUrl}
                  controls
                  autoPlay
                  playsInline
                  className="video-live-preview"
                />
              )}
            </div>
          )}

          {/* Controls Bar */}
          {!cameraError && (
            <div className="video-controls-bar">
              {!recordedBlobUrl ? (
                !isRecording ? (
                  <button className="record-start-btn" onClick={startRecording}>
                    <div className="record-inner-circle"></div>
                    <span>Start Recording</span>
                  </button>
                ) : (
                  <button className="record-stop-btn" onClick={stopRecording}>
                    <Square size={20} />
                    <span>Stop Recording</span>
                  </button>
                )
              ) : (
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <button
                    className="secondary-btn"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => {
                      resetState();
                      startCamera();
                    }}
                    disabled={isUploading}
                  >
                    <RefreshCw size={16} />
                    <span>Re-record</span>
                  </button>

                  <button
                    className="primary-button"
                    style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: 0 }}
                    onClick={handleSend}
                    disabled={isUploading}
                  >
                    <Send size={16} />
                    <span>{isUploading ? 'Sending...' : 'Send Video Clip'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
