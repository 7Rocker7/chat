import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Send,
  LogOut,
  MessageSquare,
  Hash,
  Settings,
  Paperclip,
  Mic,
  Video,
  Sparkles,
  X,
  Radio,
  Loader2,
  Square,
  Check
} from 'lucide-react';
import SettingsModal from './SettingsModal';
import GifModal from './GifModal';
import VideoRecordModal from './VideoRecordModal';
import MessageItem from './MessageItem';

export default function Chat({ token, user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [socket, setSocket] = useState(null);
  const [activeSpace, setActiveSpace] = useState('General');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGifModalOpen, setIsGifModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordingTime, setVoiceRecordingTime] = useState(0);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const voiceRecorderRef = useRef(null);
  const voiceStreamRef = useRef(null);
  const voiceTimerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch message history
    fetch('http://localhost:3001/api/messages')
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(err => console.error('Error fetching messages:', err));

    // Connect Socket.IO
    const newSocket = io('http://localhost:3001', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to OmniSphere socket cluster');
    });

    newSocket.on('receive_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error', err);
      if (err.message === 'Authentication error') {
        onLogout();
      }
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [token, navigate, onLogout]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isUploading]);

  // Upload file helper (supports any file size & extension)
  const uploadFileToBackend = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Upload failed');
    }

    return await res.json();
  };

  // Determine media category from MIME type & extension
  const getMediaCategory = (mimeType = '', fileName = '') => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) return 'video';
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) return 'audio';
    return 'document';
  };

  // Send pure text message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    socket.emit('send_message', {
      text: inputText.trim(),
      type: 'text'
    });
    setInputText('');
  };

  // Handle generic file selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;

    setIsUploading(true);
    setUploadProgressText(`Uploading ${file.name}...`);

    try {
      const uploadData = await uploadFileToBackend(file);
      const mediaType = getMediaCategory(uploadData.file_type, uploadData.file_name);

      socket.emit('send_message', {
        text: mediaType === 'document' ? '' : file.name,
        type: mediaType,
        file_url: uploadData.file_url,
        file_name: uploadData.file_name,
        file_size: uploadData.file_size,
        file_type: uploadData.file_type
      });
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to upload file: ' + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Send GIF
  const handleSelectGif = (gifUrl, gifTitle) => {
    if (!socket) return;
    socket.emit('send_message', {
      text: gifTitle,
      type: 'gif',
      file_url: gifUrl,
      file_name: `${gifTitle}.gif`
    });
  };

  // Send Recorded Video Clip
  const handleSendVideoClip = async (videoFile) => {
    if (!socket) return;
    setIsUploading(true);
    setUploadProgressText('Uploading video clip...');

    try {
      const uploadData = await uploadFileToBackend(videoFile);
      socket.emit('send_message', {
        text: 'Video Recording',
        type: 'video',
        file_url: uploadData.file_url,
        file_name: uploadData.file_name,
        file_size: uploadData.file_size,
        file_type: uploadData.file_type
      });
    } catch (err) {
      console.error('Video upload error:', err);
      alert('Failed to upload video clip: ' + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  // Voice Memo Recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        
        setIsUploading(true);
        setUploadProgressText('Uploading voice note...');

        try {
          const uploadData = await uploadFileToBackend(audioFile);
          socket.emit('send_message', {
            text: 'Voice Memo',
            type: 'audio',
            file_url: uploadData.file_url,
            file_name: uploadData.file_name,
            file_size: uploadData.file_size,
            file_type: uploadData.file_type
          });
        } catch (err) {
          console.error('Voice note error:', err);
          alert('Failed to send voice note');
        } finally {
          setIsUploading(false);
          setUploadProgressText('');
        }
      };

      recorder.start(200);
      voiceRecorderRef.current = recorder;
      setIsRecordingVoice(true);
      setVoiceRecordingTime(0);

      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Mic access error:', err);
      alert('Unable to access microphone. Please check your browser permissions.');
    }
  };

  const stopAndSendVoiceRecording = () => {
    if (voiceRecorderRef.current && isRecordingVoice) {
      voiceRecorderRef.current.stop();
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach(t => t.stop());
      }
      clearInterval(voiceTimerRef.current);
      setIsRecordingVoice(false);
    }
  };

  const cancelVoiceRecording = () => {
    if (voiceRecorderRef.current) {
      voiceRecorderRef.current.ondataavailable = null;
      voiceRecorderRef.current.onstop = null;
      voiceRecorderRef.current.stop();
    }
    if (voiceStreamRef.current) {
      voiceStreamRef.current.getTracks().forEach(t => t.stop());
    }
    clearInterval(voiceTimerRef.current);
    setIsRecordingVoice(false);
    setVoiceRecordingTime(0);
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getInitials = (name) => (name ? name.charAt(0).toUpperCase() : '?');

  return (
    <div className="app-container animate-fade-in">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-orb-sm">
              <Radio size={18} color="#fff" />
            </div>
            <div>
              <h2>OmniSphere</h2>
              <span className="brand-badge">Universal Media</span>
            </div>
          </div>
        </div>

        <div className="sidebar-nav">
          <div className="nav-section-title">Spaces</div>
          <div
            className={`nav-item ${activeSpace === 'General' ? 'active' : ''}`}
            onClick={() => setActiveSpace('General')}
          >
            <Hash size={18} className="icon" />
            <span>#General</span>
          </div>
          <div
            className={`nav-item ${activeSpace === 'Media-Lounge' ? 'active' : ''}`}
            onClick={() => setActiveSpace('Media-Lounge')}
          >
            <Sparkles size={18} className="icon" color="#a855f7" />
            <span>#Media-Lounge</span>
          </div>

          <div className="nav-section-title" style={{ marginTop: '20px' }}>Direct Messages</div>
          <div className="nav-item">
            <MessageSquare size={18} className="icon" />
            <span>Friends Hub</span>
          </div>
        </div>

        {/* Sidebar Footer with Profile & Settings */}
        <div className="sidebar-footer">
          <div className="user-profile-info">
            <div className="avatar-sm">
              {getInitials(user?.name)}
            </div>
            <div className="user-names">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-status">
                <span className="user-status-dot"></span> Online
              </span>
            </div>
          </div>
          <div className="user-actions">
            <button
              className="icon-btn"
              onClick={() => setIsSettingsOpen(true)}
              title="Account Settings"
            >
              <Settings size={18} />
            </button>
            <button
              className="icon-btn"
              onClick={onLogout}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-area">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Hash size={20} color="var(--accent-color)" />
            <span style={{ fontWeight: 700 }}>{activeSpace}</span>
            <span className="chat-header-desc">Instant real-time sync with files, video, audio & GIFs</span>
          </div>
        </div>

        {/* Messages List */}
        <div className="messages-container">
          {messages.map((msg, index) => (
            <MessageItem
              key={msg.id || index}
              message={msg}
              currentUser={user}
            />
          ))}

          {isUploading && (
            <div className="upload-indicator-card animate-fade-in">
              <Loader2 size={18} className="spin-icon" />
              <span>{uploadProgressText}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="chat-input-container">
          {/* Hidden File Input for any file type / any size */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {!isRecordingVoice ? (
            <form className="chat-input-wrapper" onSubmit={handleSendMessage}>
              {/* Media Action Buttons */}
              <div className="media-action-buttons">
                {/* File Attachment Button */}
                <button
                  type="button"
                  className="media-tool-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file, document, or music (Any size & format)"
                >
                  <Paperclip size={19} />
                </button>

                {/* GIF Picker Button */}
                <button
                  type="button"
                  className="media-tool-btn"
                  onClick={() => setIsGifModalOpen(true)}
                  title="Choose animated GIF"
                >
                  <Sparkles size={19} color="#a855f7" />
                </button>

                {/* Video Recorder Button */}
                <button
                  type="button"
                  className="media-tool-btn"
                  onClick={() => setIsVideoModalOpen(true)}
                  title="Record video clip via camera"
                >
                  <Video size={19} color="#6366f1" />
                </button>

                {/* Voice Note Button */}
                <button
                  type="button"
                  className="media-tool-btn"
                  onClick={startVoiceRecording}
                  title="Record live voice note"
                >
                  <Mic size={19} color="#22c55e" />
                </button>
              </div>

              {/* Text Input */}
              <input
                type="text"
                placeholder={`Message #${activeSpace}... (or attach files, record audio & video)`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />

              {/* Send Button */}
              <button
                type="submit"
                className="send-button"
                disabled={!inputText.trim()}
                title="Send Message"
              >
                <Send size={19} />
              </button>
            </form>
          ) : (
            /* Live Voice Recording Bar */
            <div className="voice-recording-bar animate-fade-in">
              <div className="voice-rec-left">
                <div className="record-red-dot"></div>
                <span className="voice-rec-timer">{formatSeconds(voiceRecordingTime)}</span>
                <div className="soundwave-container">
                  <div className="soundwave-bar"></div>
                  <div className="soundwave-bar"></div>
                  <div className="soundwave-bar"></div>
                  <div className="soundwave-bar"></div>
                  <div className="soundwave-bar"></div>
                </div>
                <span className="voice-rec-label">Recording Voice Memo...</span>
              </div>

              <div className="voice-rec-actions">
                <button
                  type="button"
                  className="voice-cancel-btn"
                  onClick={cancelVoiceRecording}
                  title="Cancel Recording"
                >
                  <X size={18} />
                  <span>Cancel</span>
                </button>

                <button
                  type="button"
                  className="voice-send-btn"
                  onClick={stopAndSendVoiceRecording}
                  title="Send Voice Memo"
                >
                  <Check size={18} />
                  <span>Send Memo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        token={token}
        user={user}
        onAccountDeleted={onLogout}
      />

      {/* GIF Picker Modal */}
      <GifModal
        isOpen={isGifModalOpen}
        onClose={() => setIsGifModalOpen(false)}
        onSelectGif={handleSelectGif}
      />

      {/* Video Recorder Modal */}
      <VideoRecordModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onSendVideo={handleSendVideoClip}
      />
    </div>
  );
}
