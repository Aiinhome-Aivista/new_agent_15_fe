import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  MessageSquare, ChevronDown, ChevronUp, RefreshCw, 
  CheckCircle2, AlertOctagon, CornerDownRight, User, ExternalLink 
} from 'lucide-react';
import { fetchPRConversation } from '../services/api';

export default function PRConversationSection({ prId, prNumber, prUrl, cachedSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (expanded && !data && prId) {
      loadConversation();
    }
  }, [expanded, prId]);

  const loadConversation = async () => {
    if (!prId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPRConversation(prId);
      setData(res);
    } catch (err) {
      console.error('Failed to fetch PR conversation:', err);
      setError(err.response?.data?.error || err.message || 'Unable to load GitHub conversation');
    } finally {
      setLoading(false);
    }
  };

  const getVerdictBadge = (state) => {
    const s = (state || '').toUpperCase();
    if (s === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" /> Approved
        </span>
      );
    }
    if (s === 'CHANGES_REQUESTED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
          <AlertOctagon className="w-3 h-3" /> Changes Requested
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-300 border border-gray-500/30">
        <MessageSquare className="w-3 h-3" /> Commented
      </span>
    );
  };

  const totalComments = (data?.issue_comments?.length || 0) + (data?.review_comments?.length || 0);

  return (
    <div className="border border-gray-700/70 rounded-xl overflow-hidden bg-[#181b24] shadow-sm my-3 text-gray-200">
      {/* Accordion Header */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-4 py-3 bg-[#1e222d] hover:bg-[#232836] cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#FF5A14]/15 text-[#FF5A14]">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                GitHub PR Conversation History
              </span>
              {prNumber && (
                <span className="text-xs font-mono px-1.5 py-0.2 bg-gray-800 rounded text-gray-400">
                  #{prNumber}
                </span>
              )}
              {data && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {expanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadConversation();
              }}
              disabled={loading}
              className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition"
              title="Refresh conversation"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {prUrl && prUrl !== '#' && (
            <a
              href={prUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 text-gray-400 hover:text-[#FF5A14] rounded hover:bg-gray-700 transition"
              title="Open PR on GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Accordion Content */}
      {expanded && (
        <div className="p-4 space-y-4 text-xs border-t border-gray-700/50 bg-[#161821]">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-gray-400 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#FF5A14]" />
              <span>Fetching live comments from GitHub...</span>
            </div>
          ) : error ? (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
              <p className="font-semibold">Unable to fetch live GitHub conversation:</p>
              <p className="mt-1 text-[11px] text-gray-400">{error}</p>
              {cachedSummary && (
                <div className="mt-3 pt-2 border-t border-gray-700/60">
                  <span className="font-semibold text-gray-300">Cached PR Summary:</span>
                  <p className="mt-1 text-gray-300 whitespace-pre-wrap">{cachedSummary}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Markdown if available */}
              {data?.conversation_summary && (
                <div className="p-3 bg-gray-900/70 border border-gray-800 rounded-lg">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Conversation Timeline & Summary
                  </div>
                  <div className="prose prose-invert prose-xs max-w-none prose-headings:text-gray-200 prose-a:text-[#FF5A14]">
                    <ReactMarkdown>{data.conversation_summary}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Reviews List */}
              {data?.reviews && data.reviews.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Reviewer Decisions ({data.reviews.length})
                  </div>
                  <div className="space-y-2">
                    {data.reviews.map((rev, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-start justify-between p-2.5 rounded-lg bg-[#1a1d28] border border-gray-700/60"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-200">
                              @{rev.user || 'reviewer'}
                            </span>
                            {getVerdictBadge(rev.state)}
                          </div>
                          {rev.body && (
                            <p className="text-gray-300 text-[11px] whitespace-pre-wrap mt-1">
                              {rev.body}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {rev.submitted_at ? new Date(rev.submitted_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discussion Comments List */}
              {data?.issue_comments && data.issue_comments.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Discussion Comments ({data.issue_comments.length})
                  </div>
                  <div className="space-y-2">
                    {data.issue_comments.map((comment, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 rounded-lg bg-[#1c202d] border border-gray-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between border-b border-gray-800 pb-1.5">
                          <div className="flex items-center gap-1.5 text-gray-300 font-medium">
                            <User className="w-3.5 h-3.5 text-[#FF5A14]" />
                            <span>@{comment.user || 'author'}</span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}
                          </span>
                        </div>
                        <div className="text-gray-300 whitespace-pre-wrap text-[11px] leading-relaxed pt-1">
                          {comment.body}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No comments placeholder */}
              {!data?.conversation_summary && (!data?.issue_comments || data.issue_comments.length === 0) && (!data?.reviews || data.reviews.length === 0) && (
                <div className="text-center py-4 text-gray-400">
                  <p>No discussion comments or reviews on this PR yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
