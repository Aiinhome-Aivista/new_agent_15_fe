import React from 'react';
import '../styles/dashboard.css';

export function CustomDialog({ open, type, message, defaultValue, onClose }) {
  if (!open) return null;

  const [inputValue, setInputValue] = React.useState(defaultValue || '');

  const handleConfirm = () => {
    if (type === 'prompt') {
      onClose(inputValue);
    } else {
      onClose(true);
    }
  };

  const handleCancel = () => {
    onClose(type === 'prompt' ? null : false);
  };

  return (
    <div className="da-modal-overlay">
      <div className="da-modal" style={{ background: 'var(--da-surface)', padding: '2rem', borderRadius: 'var(--da-radius)', maxWidth: '400px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid var(--da-border-orange)' }}>
        <h3 style={{ marginTop: 0, color: 'var(--da-text)' }}>
          {type === 'alert' ? 'Notification' : type === 'confirm' ? 'Confirm Action' : 'Input Required'}
        </h3>
        <p style={{ color: 'var(--da-muted)', whiteSpace: 'pre-wrap' }}>{message}</p>
        
        {type === 'prompt' && (
          <div className="da-form-group" style={{ marginTop: '1rem' }}>
            <input 
              type="text" 
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)} 
              autoFocus
            />
          </div>
        )}

        <div className="da-modal-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          {type !== 'alert' && (
            <button className="da-btn da-btn-ghost" onClick={handleCancel}>Cancel</button>
          )}
          <button className="da-btn da-btn-primary" onClick={handleConfirm}>OK</button>
        </div>
      </div>
    </div>
  );
}
