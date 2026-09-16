import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  X, Download, FileText, Printer, Check, Copy, AlertTriangle, 
  ShieldCheck, CheckCircle2
} from 'lucide-react';
import { fetchStoryEvidence, downloadStoryEvidenceBlob } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import '../styles/evidence-modal.css';

function formatMarkdownToIst(text) {
  if (!text) return '';
  return text.replace(/(\d{4}-\d{2}-\d{2})[\sT](\d{2}:\d{2}:\d{2})(?:\.\d+)?\s*(?:Z|UTC)/gi, (match, dateStr, timeStr) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
      if (isNaN(utcDate.getTime())) return match;
      const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
      const istYear = istDate.getUTCFullYear();
      const istMonth = String(istDate.getUTCMonth() + 1).padStart(2, '0');
      const istDay = String(istDate.getUTCDate()).padStart(2, '0');
      const istHours = String(istDate.getUTCHours()).padStart(2, '0');
      const istMinutes = String(istDate.getUTCMinutes()).padStart(2, '0');
      const istSeconds = String(istDate.getUTCSeconds()).padStart(2, '0');
      return `${istYear}-${istMonth}-${istDay} ${istHours}:${istMinutes}:${istSeconds} IST`;
    } catch (e) {
      return match;
    }
  });
}

export default function EvidenceModal({ storyId, storyKey, storyTitle, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [copied, setCopied] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState(null);

  useEffect(() => {
    if (!storyId) return;
    loadEvidence();
  }, [storyId]);

  const loadEvidence = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStoryEvidence(storyId);
      setEvidence(data);
    } catch (err) {
      console.error('Failed to load evidence:', err);
      const rawErr = err.response?.data?.error || err.message || 'Failed to load evidence report';
      let cleanErr = rawErr;
      if (typeof rawErr === 'string' && rawErr.includes('OperationalError')) {
        cleanErr = 'Database query encountered an issue. The evidence structure is being updated.';
      }
      setError(cleanErr);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!evidence?.markdown) return;
    navigator.clipboard.writeText(evidence.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownload = async (format = 'pdf') => {
    if (!storyId) return;
    setDownloadingFormat(format);
    try {
      const response = await downloadStoryEvidenceBlob(storyId, format);
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : (format === 'md' ? 'text/markdown' : 'application/json')
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseFilename = evidence?.filename ? evidence.filename.replace(/\.[^/.]+$/, '') : `evidence_${storyKey || storyId}`;
      a.download = `${baseFilename}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(`Download ${format} failed:`, err);
      alert(`Failed to download ${format.toUpperCase()} report: ${err.message || 'Unknown error'}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="ev-modal-overlay" onClick={onClose}>
      <div 
        className="ev-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="ev-modal-header">
          <div className="ev-header-info">
            <div className="ev-shield-icon">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="ev-header-titles">
              <div className="ev-header-topline">
                <span className="ev-story-key">
                  {evidence?.jira_key || storyKey || `Task #${storyId}`}
                </span>
                <span className="ev-badge-evidence">
                  <CheckCircle2 className="w-3 h-3" /> Evidence Report
                </span>
              </div>
              <p className="ev-story-title">
                {evidence?.title || storyTitle || 'Verification & Artifact Dossier'}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="ev-toolbar">
            <button
              onClick={() => handleDownload('pdf')}
              disabled={downloadingFormat !== null || loading}
              className="ev-btn ev-btn-primary"
              title="Download evidence report as PDF document"
            >
              {downloadingFormat === 'pdf' ? (
                <LoadingSpinner inline size="sm" color="#ffffff" />
              ) : (
                <Download className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
              )}
              <span>PDF</span>
            </button>

            <button
              onClick={() => handleDownload('md')}
              disabled={downloadingFormat !== null || loading}
              className="ev-btn ev-btn-secondary"
              title="Download evidence as Markdown file"
            >
              {downloadingFormat === 'md' ? (
                <LoadingSpinner inline size="sm" />
              ) : (
                <FileText className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
              )}
              <span>Markdown</span>
            </button>

            <button
              onClick={handleCopy}
              disabled={loading || !evidence?.markdown}
              className="ev-btn ev-btn-secondary"
              title="Copy markdown content to clipboard"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" style={{ width: 14, height: 14, color: '#4ade80' }} />
              ) : (
                <Copy className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
              )}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={loading}
              className="ev-btn ev-btn-icon"
              title="Print evidence document"
            >
              <Printer className="w-4 h-4" style={{ width: 16, height: 16 }} />
            </button>

            <div className="ev-divider-v" />

            <button
              onClick={onClose}
              className="ev-btn-close"
              title="Close modal"
            >
              <X className="w-5 h-5" style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="ev-modal-body">
          {loading ? (
            <LoadingSpinner text="Assembling DEVAA verification evidence dossier..." size="md" />
          ) : error ? (
            <div className="ev-error-card">
              <div className="ev-error-icon">
                <AlertTriangle style={{ width: 28, height: 28 }} />
              </div>
              <div>
                <div className="ev-error-title">Unable to Load Evidence Report</div>
                <div className="ev-error-msg">{error}</div>
              </div>
              <button
                onClick={loadEvidence}
                className="ev-btn ev-btn-secondary"
                style={{ marginTop: '0.5rem' }}
              >
                <LoadingSpinner inline size="sm" text="" />
                <span>Try Again</span>
              </button>
            </div>
          ) : (
            <div className="ev-doc-wrapper">
              <div className="ev-markdown">
                <ReactMarkdown>{formatMarkdownToIst(evidence?.markdown || '')}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="ev-modal-footer">
          <div className="ev-footer-left">
            <span className="ev-status-dot"></span>
            <span>Stored in DEVAA Repository &bull; Isolated from Jira Attachments</span>
          </div>
          <div>
            {evidence?.filename && (
              <span className="ev-filename-badge">
                {evidence.filename}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
