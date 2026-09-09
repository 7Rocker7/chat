import React, { useState } from 'react';
import { X, KeyRound, Trash2, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, token, user, onAccountDeleted }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passStatus, setPassStatus] = useState(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteStep, setConfirmDeleteStep] = useState(false);

  if (!isOpen) return null;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassStatus(null);

    if (newPassword !== confirmPassword) {
      setPassStatus({ type: 'error', message: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 4) {
      setPassStatus({ type: 'error', message: 'New password must be at least 4 characters' });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch('http://localhost:3001/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setPassStatus({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassStatus({ type: 'error', message: err.message });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteStatus(null);

    if (!deletePassword) {
      setDeleteStatus({ type: 'error', message: 'Please enter your password to confirm deletion' });
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('http://localhost:3001/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: deletePassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      onAccountDeleted();
    } catch (err) {
      setDeleteStatus({ type: 'error', message: err.message });
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Account Settings</h2>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* User Info Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{user?.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Account ID: #{user?.id}</div>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="settings-section">
            <div className="settings-section-title">
              <KeyRound size={16} color="var(--accent-color)" />
              <span>Change Password</span>
            </div>

            {passStatus && (
              <div className={`status-badge ${passStatus.type === 'success' ? 'status-success' : 'status-error'}`}>
                {passStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{passStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="input-group">
                <label>Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password (min 4 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="primary-button"
                style={{ marginTop: '4px', padding: '10px 14px', fontSize: '13px' }}
                disabled={isChangingPass}
              >
                {isChangingPass ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Delete Account (Danger Zone) */}
          <div className="settings-section danger-zone">
            <div className="settings-section-title">
              <AlertTriangle size={16} color="var(--error-color)" />
              <span>Danger Zone — Delete Account</span>
            </div>

            <p className="danger-warning">
              Deleting your account is permanent. All your messages and account data will be wiped immediately.
            </p>

            {deleteStatus && (
              <div className="status-badge status-error">
                <AlertCircle size={16} />
                <span>{deleteStatus.message}</span>
              </div>
            )}

            {!confirmDeleteStep ? (
              <button
                type="button"
                className="danger-button"
                onClick={() => setConfirmDeleteStep(true)}
              >
                Delete Account
              </button>
            ) : (
              <form onSubmit={handleDeleteAccount} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="input-group">
                  <label style={{ color: 'var(--error-color)' }}>Confirm with your password</label>
                  <input
                    type="password"
                    placeholder="Enter password to confirm"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    required
                    style={{ borderColor: 'rgba(218, 55, 60, 0.5)' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    className="danger-button"
                    style={{ flex: 1 }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '10px 16px', margin: 0, fontSize: '13px' }}
                    onClick={() => {
                      setConfirmDeleteStep(false);
                      setDeletePassword('');
                      setDeleteStatus(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
