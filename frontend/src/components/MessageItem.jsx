import React from 'react';
import { format } from 'date-fns';
import { FileText, Download, Play, Music, Mic, Film, FileArchive, FileCode } from 'lucide-react';

export default function MessageItem({ message, currentUser }) {
  const isSelf = message.user_id === currentUser?.id;

  const getInitials = (name) => (name ? name.charAt(0).toUpperCase() : '?');

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const num = Number(bytes);
    if (isNaN(num)) return bytes;
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName = '') => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return <FileArchive size={28} color="#eab308" />;
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json'].includes(ext)) return <FileCode size={28} color="#06b6d4" />;
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return <Music size={28} color="#a855f7" />;
    return <FileText size={28} color="#6366f1" />;
  };

  const renderMediaContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <div className="message-media-container">
            <a href={message.file_url} target="_blank" rel="noopener noreferrer">
              <img
                src={message.file_url}
                alt={message.file_name || 'Uploaded image'}
                className="message-image-preview"
                loading="lazy"
              />
            </a>
            {message.text && <p className="media-caption">{message.text}</p>}
          </div>
        );

      case 'gif':
        return (
          <div className="message-media-container">
            <img
              src={message.file_url}
              alt={message.text || 'Animated GIF'}
              className="message-gif-preview"
              loading="lazy"
            />
            {message.text && <p className="media-caption">{message.text}</p>}
          </div>
        );

      case 'video':
        return (
          <div className="message-media-container">
            <div className="media-badge">
              <Film size={14} />
              <span>Video Clip</span>
            </div>
            <video
              src={message.file_url}
              controls
              playsInline
              className="message-video-player"
            />
            {message.text && <p className="media-caption">{message.text}</p>}
          </div>
        );

      case 'audio':
        const isVoiceMemo = message.text === 'Voice Memo' || (message.file_name && message.file_name.includes('voice-note'));
        return (
          <div className="message-audio-container">
            <div className="media-badge audio-badge">
              {isVoiceMemo ? <Mic size={14} /> : <Music size={14} />}
              <span>{isVoiceMemo ? 'Voice Note' : 'Audio Track'}</span>
              {message.file_name && <span className="audio-filename">{message.file_name}</span>}
            </div>
            <audio
              src={message.file_url}
              controls
              className="message-audio-player"
            />
          </div>
        );

      case 'document':
        return (
          <div className="message-document-card">
            <div className="doc-icon-wrapper">
              {getFileIcon(message.file_name)}
            </div>
            <div className="doc-details">
              <div className="doc-name" title={message.file_name}>
                {message.file_name || 'Document'}
              </div>
              <div className="doc-size">
                {formatFileSize(message.file_size)}
              </div>
            </div>
            <a
              href={message.file_url}
              download={message.file_name || 'download'}
              className="doc-download-btn"
              title="Download file"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download size={18} />
            </a>
          </div>
        );

      case 'text':
      default:
        return <div className="message-bubble">{message.text}</div>;
    }
  };

  return (
    <div className={`message ${isSelf ? 'message-self' : ''}`}>
      <div className="avatar">
        {getInitials(message.user_name)}
      </div>
      <div className="message-content">
        <div className="message-meta">
          <span className="sender-name">{message.user_name}</span>
          <span className="message-time">
            {message.timestamp ? format(new Date(message.timestamp), 'p') : ''}
          </span>
        </div>
        {renderMediaContent()}
      </div>
    </div>
  );
}
