import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  MessageSquare, ChevronDown, ChevronUp, RefreshCw, 
  ExternalLink, CheckCircle2, AlertCircle, User
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
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
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.7rem',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '12px',
          background: 'rgba(34, 197, 94, 0.15)',
          color: '#22c55e',
          border: '1px solid rgba(34, 197, 94, 0.3)'
        }}>
          <CheckCircle2 size={12} /> Approved
        </span>
      );
    }
    if (s === 'CHANGES_REQUESTED') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.7rem',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <AlertCircle size={12} /> Changes Requested
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.7rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '12px',
        background: 'rgba(148, 163, 184, 0.15)',
        color: 'var(--da-muted, #94a3b8)',
        border: '1px solid rgba(148, 163, 184, 0.3)'
      }}>
        <MessageSquare size={12} /> Commented
      </span>
    );
  };

  const totalComments = (data?.issue_comments?.length || 0) + (data?.review_comments?.length || 0);

  return (
    <div style={{
      border: '1px solid var(--da-border, #222b3b)',
      borderRadius: 'var(--da-radius-sm, 8px)',
      overflow: 'hidden',
      background: 'var(--da-surface-2, #1b2230)',
      margin: '0.85rem 0',
      color: 'var(--da-text, #f1f5f9)'
    }}>
      {/* Accordion Header */}
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 0.85rem',
          background: 'var(--da-surface-2, #1b2230)',
          cursor: 'pointer',
          userSelect: 'none',
          gap: '0.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <div style={{
            padding: '4px 6px',
            borderRadius: '6px',
            background: 'rgba(255, 90, 20, 0.15)',
            color: 'var(--da-accent, #FF5A14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <MessageSquare size={14} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--da-text, #f1f5f9)' }}>
              GitHub PR Conversation History
            </span>
            {prNumber ? (
              <span style={{
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                padding: '1px 5px',
                background: 'var(--da-bg, #0e121b)',
                borderRadius: '4px',
                color: 'var(--da-muted, #94a3b8)',
                border: '1px solid var(--da-border, #222b3b)',
                fontWeight: 600
              }}>
                #{prNumber}
              </span>
            ) : null}
            {data ? (
              <span style={{
                fontSize: '0.68rem',
                padding: '1px 6px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                fontWeight: 600
              }}>
                {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
              </span>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {expanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadConversation();
              }}
              disabled={loading}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--da-muted, #94a3b8)',
                cursor: 'pointer',
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px'
              }}
              title="Refresh conversation"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
          {prUrl && prUrl !== '#' && (
            <a
              href={prUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                color: 'var(--da-muted, #94a3b8)',
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none'
              }}
              title="Open PR on GitHub"
            >
              <ExternalLink size={13} />
            </a>
          )}
          {expanded ? (
            <ChevronUp size={15} style={{ color: 'var(--da-muted, #94a3b8)' }} />
          ) : (
            <ChevronDown size={15} style={{ color: 'var(--da-muted, #94a3b8)' }} />
          )}
        </div>
      </div>

      {/* Accordion Content */}
      {expanded && (
        <div style={{
          padding: '0.85rem',
          fontSize: '0.78rem',
          borderTop: '1px solid var(--da-border, #222b3b)',
          background: 'var(--da-bg, #0e121b)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          {loading ? (
            <LoadingSpinner text="Fetching live comments from GitHub..." size="sm" />
          ) : error ? (
            <div style={{
              padding: '0.75rem',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444'
            }}>
              <p style={{ fontWeight: 600, margin: '0 0 4px' }}>Unable to fetch live GitHub conversation:</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--da-muted)' }}>{error}</p>
              {cachedSummary && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--da-border)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--da-text)' }}>Cached PR Summary:</span>
                  <p style={{ margin: '4px 0 0', color: 'var(--da-text)', whiteSpace: 'pre-wrap' }}>{cachedSummary}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Summary Markdown if available */}
              {data?.conversation_summary && (
                <div style={{
                  padding: '0.75rem',
                  background: 'var(--da-surface-2, #1b2230)',
                  border: '1px solid var(--da-border, #222b3b)',
                  borderRadius: '6px'
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, uppercase: 'true', letterSpacing: '0.04em', color: 'var(--da-muted)', marginBottom: '6px' }}>
                    Conversation Timeline & Summary
                  </div>
                  <div style={{ color: 'var(--da-text)', lineHeight: '1.5', overflowX: 'auto' }}>
                    <ReactMarkdown>{data.conversation_summary}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Reviews List */}
              {data?.reviews && data.reviews.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--da-muted)', marginBottom: '6px' }}>
                    Reviewer Decisions ({data.reviews.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {data.reviews.map((rev, idx) => (
                      <div 
                        key={idx} 
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '6px',
                          background: 'var(--da-surface-2)',
                          border: '1px solid var(--da-border)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--da-text)' }}>
                              @{rev.user || 'reviewer'}
                            </span>
                            {getVerdictBadge(rev.state)}
                          </div>
                          {rev.body && (
                            <p style={{ margin: '4px 0 0', color: 'var(--da-text)', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                              {rev.body}
                            </p>
                          )}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--da-muted)', fontFamily: 'monospace' }}>
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
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--da-muted)', marginBottom: '6px' }}>
                    Discussion Comments ({data.issue_comments.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {data.issue_comments.map((comment, idx) => (
                      <div 
                        key={idx} 
                        style={{
                          padding: '0.65rem 0.75rem',
                          borderRadius: '6px',
                          background: 'var(--da-surface-2)',
                          border: '1px solid var(--da-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--da-border)', paddingBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--da-text)', fontWeight: 600 }}>
                            <User size={13} style={{ color: 'var(--da-accent)' }} />
                            <span>@{comment.user || 'author'}</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--da-muted)', fontFamily: 'monospace' }}>
                            {comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}
                          </span>
                        </div>
                        <div style={{ color: 'var(--da-text)', whiteSpace: 'pre-wrap', fontSize: '0.75rem', paddingTop: '4px' }}>
                          {comment.body}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No comments placeholder */}
              {!data?.conversation_summary && (!data?.issue_comments || data.issue_comments.length === 0) && (!data?.reviews || data.reviews.length === 0) && (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--da-muted)' }}>
                  <p style={{ margin: 0 }}>No discussion comments or reviews on this PR yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
