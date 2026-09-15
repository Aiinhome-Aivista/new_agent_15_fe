import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  X, Download, FileText, Printer, Check, Copy, AlertCircle, 
  ExternalLink, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { fetchStoryEvidence, downloadStoryEvidenceBlob } from '../services/api';

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
      setError(err.response?.data?.error || err.message || 'Failed to load evidence report');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!evidence?.markdown) return;
    navigator.clipboard.writeText(evidence.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#1e222d] border border-gray-700/60 rounded-xl shadow-2xl overflow-hidden text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/80 bg-[#181b24]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#FF5A14]/20 to-orange-500/10 border border-[#FF5A14]/30 rounded-lg text-[#FF5A14]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white tracking-wide">
                  {evidence?.jira_key || storyKey || `Story #${storyId}`}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Evidence Report
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate max-w-md">
                {evidence?.title || storyTitle || 'Verification & Artifact Dossier'}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload('pdf')}
              disabled={downloadingFormat !== null || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#FF5A14] hover:bg-[#e04f12] text-white shadow transition-all duration-150 disabled:opacity-50"
              title="Download evidence as PDF document"
            >
              {downloadingFormat === 'pdf' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>PDF</span>
            </button>

            <button
              onClick={() => handleDownload('md')}
              disabled={downloadingFormat !== null || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-all duration-150 disabled:opacity-50"
              title="Download evidence as Markdown file"
            >
              {downloadingFormat === 'md' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span>Markdown</span>
            </button>

            <button
              onClick={handleCopy}
              disabled={loading || !evidence?.markdown}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-all duration-150"
              title="Copy markdown to clipboard"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={loading}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700 transition-all"
              title="Print document"
            >
              <Printer className="w-4 h-4" />
            </button>

            <div className="h-5 w-px bg-gray-700 mx-1" />

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#1a1d26] custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#FF5A14]" />
              <p className="text-sm">Assembling evidence report dossier...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-full text-red-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-200">Unable to Load Evidence</h4>
                <p className="text-sm text-gray-400 mt-1 max-w-md">{error}</p>
              </div>
              <button
                onClick={loadEvidence}
                className="px-4 py-2 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg transition-all"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="bg-[#13161f] border border-gray-800 rounded-xl p-6 text-gray-200 shadow-inner">
              {/* Markdown Content Renderer */}
              <div className="prose prose-invert max-w-none prose-headings:text-gray-100 prose-headings:font-semibold prose-a:text-[#FF5A14] prose-code:text-[#FF5A14] prose-code:bg-gray-800/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900/90 prose-pre:border prose-pre:border-gray-800 prose-table:border-collapse prose-th:border prose-th:border-gray-700 prose-th:bg-gray-800/50 prose-th:p-2 prose-td:border prose-td:border-gray-800 prose-td:p-2">
                <ReactMarkdown>{evidence?.markdown || ''}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800 bg-[#161821] text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Stored in DEVAA Repository &bull; Isolated from Jira Attachments</span>
          </div>
          <div>
            {evidence?.filename && (
              <span className="font-mono text-[11px] text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded border border-gray-700/60">
                {evidence.filename}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
