import React, { useState } from 'react';
import { X, Users, Sparkles, AlertCircle } from 'lucide-react';

export default function CreateGroupModal({ isOpen, onClose, token, onGroupCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const formattedName = name.trim().replace(/\s+/g, '-');
    if (!formattedName) {
      setError('Group name is required.');
      return;
    }

    if (formattedName.length < 2 || formattedName.length > 30) {
      setError('Group name must be between 2 and 30 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: formattedName, description: description.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create group');
      }

      onGroupCreated(data);
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card animate-fade-in" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="var(--accent-color)" />
            <h2>Create a New Group</h2>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Create a custom space for you and your friends (e.g. <strong>Gaming</strong>, <strong>Weekend-Trip</strong>, or <strong>Project</strong>).
          </p>

          {error && (
            <div className="status-badge status-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="input-group">
              <label>Group Name</label>
              <input
                type="text"
                placeholder="e.g. Gaming-Squad"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Spaces are automatically formatted with hyphens
              </span>
            </div>

            <div className="input-group">
              <label>Description (Optional)</label>
              <input
                type="text"
                placeholder="What is this group about?"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1 }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                style={{ flex: 1.5, margin: 0 }}
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
