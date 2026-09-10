import React, { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Download, Music, Mic, Film, FileArchive, FileCode, CornerUpLeft, Share2, Trash2, Ban, Check, CheckCheck } from 'lucide-react';

export default function MessageItem({ message, currentUser, onReply, onForward, onDelete }) {
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  const isSelf = message.user_id === currentUser?.id || message.sender_id === currentUser?.id;

  // Check if current user deleted this message for themselves
  let deletedUsers = [];
  try {
    deletedUsers = typeof message.deleted_by_users === 'string'
      ? JSON.parse(message.deleted_by_users || '[]')
      : message.deleted_by_users || [];
  } catch (e) {
    deletedUsers = [];
  }

  if (deletedUsers.includes(currentUser?.id)) {
    return null; // Hidden for current user
  }

  // Check read receipt status
  let isRead = false;
  if (message.receiver_id) {
    // 1-on-1 Direct Message
    isRead = message.is_read === 1;
  } else {
    // Group Message
    try {
      const readByList = typeof message.read_by === 'string'
        ? JSON.parse(message.read_by || '[]')
        : message.read_by || [];
      isRead = readByList.some(id => id !== currentUser?.id);
    } catch (e) {
      isRead = false;
    }
  }

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
    if (message.is_deleted_everyone === 1) {
      return (
        <div className="message-deleted-bubble">
          <Ban size={15} />
          <span>This message was deleted</span>
        </div>
      );
    }

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
          {isSelf && message.is_deleted_everyone !== 1 && (
            <span className="message-status-icon" title={isRead ? 'Seen' : 'Sent'}>
              {isRead ? (
                <CheckCheck size={14} className="status-check status-seen" />
              ) : (
                <Check size={14} className="status-check status-sent" />
              )}
            </span>
          )}
        </div>

        {/* Quoted Reply Context Bar */}
        {message.reply_to_text && message.is_deleted_everyone !== 1 && (
          <div className="message-quoted-reply">
            <span className="quoted-sender">@{message.reply_to_sender || 'User'}</span>
            <p className="quoted-text">{message.reply_to_text}</p>
          </div>
        )}

        {renderMediaContent()}

        {/* Hover Action Toolbar */}
        {message.is_deleted_everyone !== 1 && (
          <div className="message-action-toolbar">
            <button
              className="action-tool-btn"
              title="Reply"
              onClick={() => onReply && onReply(message)}
            >
              <CornerUpLeft size={14} />
            </button>
            <button
              className="action-tool-btn"
              title="Forward"
              onClick={() => onForward && onForward(message)}
            >
              <Share2 size={14} />
            </button>
            <div className="delete-menu-wrapper">
              <button
                className="action-tool-btn danger-tool"
                title="Delete"
                onClick={() => setShowDeleteMenu(!showDeleteMenu)}
              >
                <Trash2 size={14} />
              </button>
              {showDeleteMenu && (
                <div className="delete-dropdown-menu">
                  <button
                    className="delete-option-btn"
                    onClick={() => {
                      setShowDeleteMenu(false);
                      onDelete && onDelete(message, 'me');
                    }}
                  >
                    Delete for Me
                  </button>
                  {isSelf && (
                    <button
                      className="delete-option-btn danger-option"
                      onClick={() => {
                        setShowDeleteMenu(false);
                        onDelete && onDelete(message, 'everyone');
                      }}
                    >
                      Delete for Everyone
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
