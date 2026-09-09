import React, { useState } from 'react';
import { X, Send, Users, User, Share2 } from 'lucide-react';

export default function ForwardModal({ isOpen, onClose, messageToForward, groups = [], users = [], onForward }) {
  const [selectedTarget, setSelectedTarget] = useState(null); // { type: 'group' | 'dm', id: number, name: string }

  if (!isOpen || !messageToForward) return null;

  const handleForward = () => {
    if (!selectedTarget) return;
    onForward(selectedTarget.type, selectedTarget.id);
    setSelectedTarget(null);
    onClose();
  };

  const previewContent = messageToForward.text || messageToForward.file_name || 'Attachment';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container forward-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <Share2 size={20} className="modal-header-icon" />
            <h3>Forward Message</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="forward-preview-box">
          <span className="forward-preview-label">Message preview:</span>
          <p className="forward-preview-text">"{previewContent}"</p>
        </div>

        <div className="forward-targets-list">
          <h4 className="forward-section-title"><Users size={16} /> Spaces & Groups</h4>
          {groups.map((group) => (
            <div
              key={`group-${group.id}`}
              className={`forward-target-item ${selectedTarget?.type === 'group' && selectedTarget?.id === group.id ? 'active' : ''}`}
              onClick={() => setSelectedTarget({ type: 'group', id: group.id, name: group.name })}
            >
              <div className="target-icon group-badge">#</div>
              <span className="target-name">{group.name}</span>
            </div>
          ))}

          <h4 className="forward-section-title" style={{ marginTop: '16px' }}><User size={16} /> Direct Messages</h4>
          {users.length === 0 ? (
            <div className="forward-empty-text">No other users online yet</div>
          ) : (
            users.map((user) => (
              <div
                key={`dm-${user.id}`}
                className={`forward-target-item ${selectedTarget?.type === 'dm' && selectedTarget?.id === user.id ? 'active' : ''}`}
                onClick={() => setSelectedTarget({ type: 'dm', id: user.id, name: user.name })}
              >
                <div className="target-icon user-badge">{user.name.charAt(0).toUpperCase()}</div>
                <span className="target-name">@{user.name}</span>
              </div>
            ))
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button className="modal-btn modal-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-btn modal-btn-primary"
            disabled={!selectedTarget}
            onClick={handleForward}
          >
            <Send size={16} /> Forward to {selectedTarget ? selectedTarget.name : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
