/**
 * PipelineLogsPanel.jsx
 * ─────────────────────
 * Full-screen slide-in panel showing live pipeline logs.
 * Color palette matches DEVAA design system:
 *   accent   #FF5A14   sidebar  #4A4A4A
 *   success  #22c55e   warning  #f59e0b
 *   danger   #ef4444   info     #38bdf8
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, RefreshCw, CheckCircle2, AlertTriangle, Info, MessageSquare, Zap } from 'lucide-react';
import { fetchPipelineLogs } from '../services/api';

/* ─── constants ────────────────────────────────────────────────── */
const POLL_MS  = 2000;
const TERMINAL = new Set(['Awaiting QA', 'Failed', 'Completed', 'Done']);

/* Agent badge colours — all drawn from / harmonised with DEVAA palette */
const AGENT_COLORS = {
  Orchestrator:  '#FF5A14',   // da-accent (orange)
  Intake:        '#38bdf8',   // da-info  (sky)
  RepoAnalysis:  '#a78bfa',   // violet
  Developer:     '#f59e0b',   // da-warning (amber)
  Validator:     '#22c55e',   // da-success (green)
  BranchPR:      '#34d399',   // teal-green
  Comment:       '#fb923c',   // warm-orange
  ReworkHandler: '#ef4444',   // da-danger (red)
};

/* Log-level meta */
const LEVEL_META = {
  info:    { icon: Info,          color: '#38bdf8', bg: 'rgba(56,189,248,0.07)'  },
  success: { icon: CheckCircle2,  color: '#22c55e', bg: 'rgba(34,197,94,0.07)'   },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.07)'  },
  error:   { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.07)'   },
  jira:    { icon: MessageSquare, color: '#FF8A55', bg: 'rgba(255,90,20,0.07)'   },
};

const agentColor = (agent) => AGENT_COLORS[agent] || '#9ca3af';

function ts(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ─── main component ───────────────────────────────────────────── */
export default function PipelineLogsPanel({ storyId, storyTitle, onClose }) {
  const [logs, setLogs]         = useState([]);
  const [workflow, setWorkflow] = useState(null);
  const [isLive, setIsLive]     = useState(true);
  const [error, setError]       = useState(null);
  const sinceIdRef              = useRef(0);
  const listRef                 = useRef(null);
  const pollRef                 = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await fetchPipelineLogs(storyId, sinceIdRef.current);
      if (data.logs && data.logs.length > 0) {
        setLogs(prev => [...prev, ...data.logs]);
        sinceIdRef.current = data.logs[data.logs.length - 1].id;
        setTimeout(scrollToBottom, 50);
      }
      if (data.workflow) {
        setWorkflow(data.workflow);
        if (TERMINAL.has(data.workflow.status)) {
          setIsLive(false);
          clearInterval(pollRef.current);
        }
      }
    } catch (err) {
      setError('Failed to fetch logs: ' + (err.message || 'Unknown'));
    }
  }, [storyId, scrollToBottom]);

  useEffect(() => {
    fetchLogs();
    pollRef.current = setInterval(fetchLogs, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchLogs]);

  const wfStatus   = workflow?.status || 'Running';
  const isTerminal = TERMINAL.has(wfStatus);
  const isDone     = ['Awaiting QA', 'Completed', 'Done'].includes(wfStatus);
  const isFailed   = wfStatus === 'Failed';

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
          zIndex: 9000,
          animation: 'pl-fadeIn 0.2s ease',
        }}
      />

      {/* panel — uses #4A4A4A (da-sidebar-bg) as base */}
      <div style={{
        position: 'fixed', top: 0, right: 0,
        width: 'min(680px,100vw)', height: '100vh',
        background: 'linear-gradient(180deg, #3a3a3a 0%, #2e2e2e 100%)',
        borderLeft: '1px solid rgba(255,90,20,0.25)',
        boxShadow: '-6px 0 48px rgba(0,0,0,0.55)',
        zIndex: 9001,
        display: 'flex', flexDirection: 'column',
        fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
        animation: 'pl-slideIn 0.28s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* ── header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,90,20,0.18)',
          background: 'rgba(255,90,20,0.06)',
          flexShrink: 0,
        }}>
          {/* icon */}
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg,#FF5A14,#f56b2f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(255,90,20,0.35)',
          }}>
            <Zap size={15} color="#fff" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'Inter,sans-serif', fontSize: '0.9rem',
              fontWeight: 700, color: '#fff',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              Pipeline Activity Log
            </div>
            <div style={{
              fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)',
              marginTop: '1px', fontFamily: 'Inter,sans-serif',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {storyTitle}
            </div>
          </div>

          {/* status pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '3px 10px', borderRadius: '20px',
            background: isDone   ? 'rgba(34,197,94,0.15)'  :
                        isFailed ? 'rgba(239,68,68,0.15)'  :
                                   'rgba(245,158,11,0.15)',
            border: `1px solid ${isDone   ? 'rgba(34,197,94,0.35)'  :
                                  isFailed ? 'rgba(239,68,68,0.35)'  :
                                             'rgba(245,158,11,0.35)'}`,
            color: isDone   ? '#22c55e' :
                   isFailed ? '#ef4444' :
                              '#f59e0b',
            fontSize: '0.7rem', fontWeight: 700,
            fontFamily: 'Inter,sans-serif', flexShrink: 0,
          }}>
            {!isTerminal && <RefreshCw size={10} style={{ animation: 'pl-spin 1s linear infinite' }} />}
            {wfStatus}
          </div>

          {/* close */}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '30px', height: '30px', color: 'rgba(255,255,255,0.5)',
              flexShrink: 0, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.15)'; e.currentTarget.style.color='#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='rgba(255,255,255,0.5)'; }}
          >
            <X size={13} />
          </button>
        </div>

        {/* ── stages bar ── */}
        <StagesBar workflow={workflow} logs={logs} />

        {/* ── log list ── */}
        <div
          ref={listRef}
          style={{
            flex: 1, overflowY: 'auto', padding: '10px 0',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,90,20,0.25) transparent',
          }}
        >
          {error && (
            <div style={{ padding: '12px 18px', color: '#ef4444', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={14} color="#ef4444" /> {error}
            </div>
          )}

          {logs.length === 0 && !error && (
            <div style={{
              padding: '48px 18px', textAlign: 'center',
              color: 'rgba(255,255,255,0.25)', fontSize: '0.83rem',
              fontFamily: 'Inter,sans-serif',
            }}>
              <RefreshCw size={22} style={{
                animation: 'pl-spin 1.3s linear infinite',
                marginBottom: '14px', display: 'block', margin: '0 auto 14px',
                color: '#FF5A14',
              }} />
              Waiting for pipeline to start…
            </div>
          )}

          {logs.map((log, idx) => {
            const meta = LEVEL_META[log.level] || LEVEL_META.info;
            const Icon = meta.icon;
            const isNew = idx >= logs.length - 4;

            return (
              <div
                key={log.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '7px 18px',
                  background: isNew ? meta.bg : 'transparent',
                  transition: 'background 0.8s ease',
                  animation: isNew ? 'pl-entry 0.25s ease' : 'none',
                  borderLeft: `2px solid ${isNew ? meta.color + '44' : 'transparent'}`,
                }}
              >
                {/* timestamp */}
                <span style={{
                  fontSize: '0.65rem', color: 'rgba(255,255,255,0.28)',
                  flexShrink: 0, lineHeight: '18px', minWidth: '68px',
                  letterSpacing: '0.02em',
                }}>
                  {ts(log.created_at)}
                </span>

                {/* level icon */}
                <Icon size={13} color={meta.color} style={{ flexShrink: 0, marginTop: '2px' }} />

                {/* agent badge */}
                <span style={{
                  fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.05em',
                  padding: '1px 6px', borderRadius: '3px',
                  background: agentColor(log.agent) + '22',
                  color: agentColor(log.agent),
                  border: `1px solid ${agentColor(log.agent)}44`,
                  flexShrink: 0, lineHeight: '16px',
                  fontFamily: 'Inter,sans-serif',
                  textTransform: 'uppercase',
                }}>
                  {log.agent}
                </span>

                {/* message + detail */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.78rem', color: 'rgba(255,255,255,0.88)',
                    lineHeight: '1.45', wordBreak: 'break-word',
                  }}>
                    {log.message}
                  </div>
                  {log.detail && (
                    <div style={{
                      fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)',
                      marginTop: '2px', wordBreak: 'break-word',
                    }}>
                      {log.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* live pulse */}
          {!isTerminal && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 18px',
              color: '#f59e0b', fontSize: '0.7rem',
              fontFamily: 'Inter,sans-serif',
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#FF5A14', display: 'inline-block',
                animation: 'pl-pulse 1.2s ease-in-out infinite',
              }} />
              Live · polling every {POLL_MS / 1000}s
            </div>
          )}

          {isTerminal && (
            <div style={{
              padding: '14px 18px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', gap: '7px',
              fontSize: '0.73rem', fontFamily: 'Inter,sans-serif',
              color: isDone ? '#22c55e' : '#ef4444',
            }}>
              {isDone
                ? <><CheckCircle2 size={13} /> Pipeline finished — awaiting QA review.</>
                : <><AlertTriangle size={13} /> Pipeline ended with errors.</>
              }
            </div>
          )}
        </div>
      </div>

      {/* ── scoped keyframes ── */}
      <style>{`
        @keyframes pl-slideIn {
          from { transform: translateX(100%); opacity:0; }
          to   { transform: translateX(0);    opacity:1; }
        }
        @keyframes pl-fadeIn {
          from { opacity:0; } to { opacity:1; }
        }
        @keyframes pl-entry {
          from { opacity:0; transform:translateY(5px); }
          to   { opacity:1; transform:translateY(0);   }
        }
        @keyframes pl-spin {
          from { transform:rotate(0deg);   }
          to   { transform:rotate(360deg); }
        }
        @keyframes pl-pulse {
          0%,100% { opacity:1;   transform:scale(1);    }
          50%     { opacity:0.35;transform:scale(1.4);  }
        }
      `}</style>
    </>
  );
}

/* ─── Pipeline stages progress bar ─────────────────────────────── */
const STAGES = [
  { key: 'Intake',       label: 'Intake'    },
  { key: 'RepoAnalysis', label: 'Repo'      },
  { key: 'Developer',    label: 'Dev'       },
  { key: 'Validator',    label: 'Validate'  },
  { key: 'BranchPR',    label: 'PR'        },
  { key: 'Comment',      label: 'Jira'      },
];

function StagesBar({ workflow, logs }) {
  const currentAgent = workflow?.current_agent || 'Intake';

  const logsByAgent = {};
  (logs || []).forEach(l => {
    if (!logsByAgent[l.agent]) logsByAgent[l.agent] = [];
    logsByAgent[l.agent].push(l.level);
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '12px 18px',
      borderBottom: '1px solid rgba(255,90,20,0.15)',
      background: 'rgba(0,0,0,0.15)',
      flexShrink: 0, overflowX: 'auto', gap: 0,
    }}>
      {STAGES.map((stage, idx) => {
        const agentLogs = logsByAgent[stage.key] || [];
        const hasFailed  = agentLogs.includes('error');
        const hasPassed  = agentLogs.includes('success');
        const isActive   = currentAgent === stage.key;

        // colour mapping — DEVAA palette
        let dotBg     = 'rgba(255,255,255,0.08)';  // future
        let dotBorder = 'rgba(255,255,255,0.12)';
        let labelColor = 'rgba(255,255,255,0.3)';
        let glow       = 'none';

        if (hasFailed) {
          dotBg = 'rgba(239,68,68,0.25)'; dotBorder = '#ef4444';
          labelColor = '#ef4444';
        } else if (hasPassed) {
          dotBg = 'rgba(34,197,94,0.2)'; dotBorder = '#22c55e';
          labelColor = '#22c55e';
        } else if (isActive) {
          dotBg = 'rgba(255,90,20,0.25)'; dotBorder = '#FF5A14';
          labelColor = '#FF8A55';
          glow = '0 0 10px rgba(255,90,20,0.5)';
        }

        return (
          <React.Fragment key={stage.key}>
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '5px', flexShrink: 0,
            }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: dotBg,
                border: `2px solid ${dotBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.35s',
                boxShadow: glow,
                animation: isActive ? 'pl-pulse 1.4s ease-in-out infinite' : 'none',
              }}>
                {hasPassed && !hasFailed && (
                  <CheckCircle2 size={12} color="#22c55e" />
                )}
                {hasFailed && (
                  <X size={11} color="#ef4444" />
                )}
                {isActive && !hasPassed && !hasFailed && (
                  <div style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: '#FF5A14',
                  }} />
                )}
              </div>
              <span style={{
                fontSize: '0.59rem', color: labelColor,
                fontFamily: 'Inter,sans-serif',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                {stage.label}
              </span>
            </div>

            {idx < STAGES.length - 1 && (
              <div style={{
                flex: 1, height: '2px',
                background: hasPassed
                  ? 'linear-gradient(90deg,#22c55e,rgba(34,197,94,0.3))'
                  : 'rgba(255,255,255,0.07)',
                minWidth: '12px', maxWidth: '52px',
                transition: 'background 0.5s',
                marginBottom: '18px',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
