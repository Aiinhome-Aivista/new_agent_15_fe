import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  X, ChevronDown, FileText, CheckSquare, Edit3, Eye, 
  Bold, Italic, List, Code, Plus, Sparkles, User, Tag, 
  Calendar, Hash, RefreshCw, Check, CheckCircle2, 
  HelpCircle, AlignLeft, Layers
} from 'lucide-react';
import '../styles/edit-story-modal.css';

/**
 * EditStoryModal Component
 * World-class UI/UX modal for editing Jira/DEVAA story details,
 * featuring dual-theme modern scrollbars and an interactive accordion
 * for Description & Acceptance Criteria with live Markdown preview and quick-tools.
 */
export default function EditStoryModal({
  story,
  editFormData,
  setEditFormData,
  jiraUsers = [],
  savingEdit = false,
  onSave,
  onClose
}) {
  // Accordion open/collapse states (both default to true for immediate visibility)
  const [accordionOpen, setAccordionOpen] = useState({
    description: true,
    acceptance: true
  });

  // Basic Metadata card collapsible state
  const [metaOpen, setMetaOpen] = useState(true);

  // Tab switch between 'edit' and 'preview' for both sections
  const [previewMode, setPreviewMode] = useState({
    description: false,
    acceptance: false
  });

  const descTextareaRef = useRef(null);
  const acTextareaRef = useRef(null);

  // Close on Escape, Save on Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!savingEdit) {
          onSave(e);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [savingEdit, onSave, onClose]);

  // Calculate text stats
  const getStats = (text = '') => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    return { words, chars };
  };

  // Calculate Acceptance Criteria count
  const getCriteriaCount = (text = '') => {
    if (!text || !text.trim()) return 0;
    const lines = text.split('\n').filter(line => {
      const trimmed = line.trim();
      return (
        trimmed.startsWith('-') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('•') ||
        /^\d+\./.test(trimmed) ||
        /^AC\d+/i.test(trimmed) ||
        /^Scenario/i.test(trimmed)
      );
    });
    return lines.length > 0 ? lines.length : (text.trim() ? 1 : 0);
  };

  const descStats = getStats(editFormData.description);
  const acStats = getStats(editFormData.acceptance_criteria);
  const acCount = getCriteriaCount(editFormData.acceptance_criteria);

  // Toggle Accordion Panel
  const toggleAccordion = (panel) => {
    setAccordionOpen(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  // Expand / Collapse All
  const handleToggleAll = () => {
    const bothOpen = accordionOpen.description && accordionOpen.acceptance;
    setAccordionOpen({
      description: !bothOpen,
      acceptance: !bothOpen
    });
  };

  // Helper to insert text at cursor position in textarea
  const insertSnippet = (textareaRef, fieldName, snippet) => {
    const el = textareaRef.current;
    const currentValue = editFormData[fieldName] || '';
    if (!el) {
      setEditFormData({
        ...editFormData,
        [fieldName]: currentValue ? `${currentValue}\n${snippet}` : snippet
      });
      return;
    }

    const start = el.selectionStart ?? currentValue.length;
    const end = el.selectionEnd ?? currentValue.length;
    const before = currentValue.substring(0, start);
    const after = currentValue.substring(end);
    
    // Add newline prefix if not empty and not at start of line
    const needsNewline = before.length > 0 && !before.endsWith('\n');
    const inserted = `${needsNewline ? '\n' : ''}${snippet}`;
    const newValue = `${before}${inserted}${after}`;

    setEditFormData({
      ...editFormData,
      [fieldName]: newValue
    });

    setTimeout(() => {
      el.focus();
      const newPos = start + inserted.length;
      el.setSelectionRange(newPos, newPos);
    }, 10);
  };

  // Quick insertion helpers for Description
  const insertUserStoryTemplate = () => {
    const template = `### User Story\nAs a [role/user],\nI want to [action/capability],\nSo that [benefit/outcome].\n\n### Requirements & Scope\n- Requirement 1\n- Requirement 2`;
    insertSnippet(descTextareaRef, 'description', template);
  };

  // Quick insertion helpers for Acceptance Criteria
  const insertAcItem = () => {
    const nextNum = acCount + 1;
    const template = `- **AC${nextNum}**: Given [precondition], when [action], then [expected result].`;
    insertSnippet(acTextareaRef, 'acceptance_criteria', template);
  };

  const insertBddScenario = () => {
    const template = `Scenario: [Verification Case]\n  Given [system state]\n  When [user triggers event]\n  Then [observable result should occur]`;
    insertSnippet(acTextareaRef, 'acceptance_criteria', template);
  };

  const insertChecklistItem = () => {
    insertSnippet(acTextareaRef, 'acceptance_criteria', `- [ ] [Condition to verify]`);
  };

  const storyKey = story?.jira_story_key || `Story #${story?.id}`;

  return (
    <div className="esm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="esm-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Bar */}
        <div className="esm-accent-stripe" />

        {/* ── Header ── */}
        <div className="esm-header">
          <div className="esm-header-left">
            <div className="esm-badge-row">
              <span className="esm-key-badge">
                <Hash size={13} />
                {storyKey}
              </span>
              <span className="da-badge todo" style={{ fontWeight: 700, fontSize: '0.72rem' }}>
                TO-DO
              </span>
              {story?.repository_details?.[0]?.priority && (
                <span className="da-badge default" style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                  {story.repository_details[0].priority}
                </span>
              )}
            </div>
            <h3 className="esm-title">Edit Story Details</h3>
            <p className="esm-subtitle">
              Update story specifications, priority, points and sync instantly with Jira
            </p>
          </div>
          <button 
            type="button"
            className="esm-close-btn" 
            onClick={onClose}
            title="Close modal (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Form Body ── */}
        <form onSubmit={onSave} className="esm-form">
          <div className="esm-body da-custom-scrollbar">

            {/* Basic Information Card */}
            <div className="esm-meta-card">
              <div 
                className="esm-meta-card-header" 
                onClick={() => setMetaOpen(!metaOpen)}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  cursor: 'pointer', 
                  userSelect: 'none',
                  padding: '2px 0'
                }}
                title={metaOpen ? "Click to collapse metadata" : "Click to expand metadata"}
              >
                <div className="esm-meta-card-title" style={{ margin: 0 }}>
                  <Layers size={13} /> Basic Metadata
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!metaOpen && (
                    <span style={{ fontSize: '0.74rem', color: 'var(--da-muted)', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {editFormData.title || 'Untitled'} • {editFormData.priority} • {editFormData.story_points ? `${editFormData.story_points} pts` : 'No pts'}
                    </span>
                  )}
                  <div className={`esm-chevron ${metaOpen ? 'expanded' : ''}`}>
                    <ChevronDown size={15} />
                  </div>
                </div>
              </div>

              {metaOpen && (
                <>
                  {/* Story Title */}
              <div>
                <label className="esm-field-label">
                  <span>Story Title <span className="req">*</span></span>
                  <span className="hint">Summary shown on board</span>
                </label>
                <input 
                  type="text"
                  className="esm-input"
                  value={editFormData.title}
                  onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="Enter a descriptive story title..."
                  required
                />
              </div>

              {/* Priority, Story Points, Due Date Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                {/* Priority */}
                <div>
                  <label className="esm-field-label">
                    <span>Priority</span>
                  </label>
                  <select 
                    className="esm-select"
                    value={editFormData.priority}
                    onChange={e => setEditFormData({ ...editFormData, priority: e.target.value })}
                  >
                    <option value="Highest">🔴 Highest</option>
                    <option value="High">🟠 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🔵 Low</option>
                    <option value="Lowest">⚪ Lowest</option>
                  </select>
                </div>

                {/* Story Points */}
                <div>
                  <label className="esm-field-label">
                    <span>Story Points</span>
                    <span className="hint">Fibonacci</span>
                  </label>
                  <input 
                    type="number"
                    min="0"
                    step="0.5"
                    className="esm-input"
                    value={editFormData.story_points}
                    onChange={e => setEditFormData({ ...editFormData, story_points: e.target.value })}
                    placeholder="e.g. 1, 2, 3, 5, 8"
                  />
                  {/* Quick Select Pills */}
                  <div className="esm-points-grid">
                    {['1', '2', '3', '5', '8', '13'].map(pts => (
                      <button
                        key={pts}
                        type="button"
                        className={`esm-point-pill ${String(editFormData.story_points) === pts ? 'active' : ''}`}
                        onClick={() => setEditFormData({ ...editFormData, story_points: pts })}
                        title={`Set ${pts} Story Points`}
                      >
                        {pts}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="esm-field-label">
                    <span>Due Date</span>
                  </label>
                  <input 
                    type="date"
                    className="esm-input"
                    value={editFormData.due_date}
                    onChange={e => setEditFormData({ ...editFormData, due_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Labels & Assignee Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                {/* Labels / Tags */}
                <div>
                  <label className="esm-field-label">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Tag size={13} /> Labels / Tags
                    </span>
                    <span className="hint">Comma separated</span>
                  </label>
                  <input 
                    type="text"
                    className="esm-input"
                    value={editFormData.labels}
                    onChange={e => setEditFormData({ ...editFormData, labels: e.target.value })}
                    placeholder="frontend, backend, bug, api..."
                  />
                </div>

                {/* Assignee */}
                <div>
                  <label className="esm-field-label">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={13} /> Assignee
                    </span>
                    <span className="hint">
                      {editFormData.assignee ? `Selected: ${editFormData.assignee}` : 'Unassigned'}
                    </span>
                  </label>
                  {jiraUsers && jiraUsers.length > 0 ? (
                    <select
                      className="esm-select"
                      value={editFormData.assignee_account_id || ''}
                      onChange={e => {
                        const val = e.target.value;
                        const matched = jiraUsers.find(u => u.accountId === val);
                        setEditFormData({
                          ...editFormData,
                          assignee_account_id: val,
                          assignee: matched ? (matched.displayName || matched.emailAddress) : val
                        });
                      }}
                    >
                      <option value="">-- Select Assignee --</option>
                      {jiraUsers.map(u => (
                        <option key={u.accountId} value={u.accountId}>
                          {u.displayName} {u.emailAddress ? `(${u.emailAddress})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text"
                      className="esm-input"
                      value={editFormData.assignee}
                      onChange={e => setEditFormData({ ...editFormData, assignee: e.target.value })}
                      placeholder="Assignee name or email address"
                    />
                  )}
                </div>
              </div>
                </>
              )}
            </div>

            {/* ── Accordion Toolbar ── */}
            <div className="esm-accordion-toolbar">
              <h4 className="esm-section-heading">
                <Sparkles size={14} style={{ color: 'var(--da-accent)' }} />
                Specifications & Acceptance
              </h4>
              <button 
                type="button" 
                className="esm-toggle-all-btn"
                onClick={handleToggleAll}
              >
                {accordionOpen.description && accordionOpen.acceptance ? 'Collapse all' : 'Expand all'}
              </button>
            </div>

            {/* ── ACCORDION 1: DESCRIPTION ── */}
            <div className={`esm-accordion-card ${accordionOpen.description ? 'expanded' : ''}`}>
              {/* Header */}
              <div 
                className="esm-accordion-header" 
                onClick={() => toggleAccordion('description')}
                role="button"
                aria-expanded={accordionOpen.description}
              >
                <div className="esm-accordion-header-left">
                  <div className="esm-icon-pill desc">
                    <FileText size={16} />
                  </div>
                  <div className="esm-accordion-titles">
                    <span className="esm-accordion-title">
                      Description & Scope
                      <span className={`esm-count-badge ${descStats.words > 0 ? 'has-content' : ''}`}>
                        {descStats.words > 0 ? `${descStats.words} words` : 'Empty'}
                      </span>
                    </span>
                    <span className="esm-accordion-subtitle">
                      User story background, context and functional specifications
                    </span>
                  </div>
                </div>

                <div className="esm-accordion-header-right">
                  {/* Edit / Preview Tabs */}
                  <div className="esm-tab-group" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`esm-tab-btn ${!previewMode.description ? 'active' : ''}`}
                      onClick={() => {
                        setPreviewMode(prev => ({ ...prev, description: false }));
                        if (!accordionOpen.description) {
                          setAccordionOpen(prev => ({ ...prev, description: true }));
                        }
                      }}
                    >
                      <Edit3 size={11} /> Edit
                    </button>
                    <button
                      type="button"
                      className={`esm-tab-btn ${previewMode.description ? 'active' : ''}`}
                      onClick={() => {
                        setPreviewMode(prev => ({ ...prev, description: true }));
                        if (!accordionOpen.description) {
                          setAccordionOpen(prev => ({ ...prev, description: true }));
                        }
                      }}
                    >
                      <Eye size={11} /> Preview
                    </button>
                  </div>

                  {/* Accordion Chevron */}
                  <div className={`esm-chevron ${accordionOpen.description ? 'expanded' : ''}`}>
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              {/* Accordion Content */}
              {accordionOpen.description && (
                <div className="esm-accordion-content">
                  {!previewMode.description ? (
                    <>
                      <textarea
                        ref={descTextareaRef}
                        rows={5}
                        className="esm-textarea da-custom-scrollbar"
                        value={editFormData.description}
                        onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                        placeholder="Detailed background, requirements, or problem statement... (Markdown supported)"
                      />
                      {/* Formatting Helper Tools */}
                      <div className="esm-toolbar">
                        <div className="esm-tools-left">
                          <button
                            type="button"
                            className="esm-tool-btn"
                            onClick={() => insertSnippet(descTextareaRef, 'description', '**bold text**')}
                            title="Bold"
                          >
                            <Bold size={12} /> Bold
                          </button>
                          <button
                            type="button"
                            className="esm-tool-btn"
                            onClick={() => insertSnippet(descTextareaRef, 'description', '*italic text*')}
                            title="Italic"
                          >
                            <Italic size={12} /> Italic
                          </button>
                          <button
                            type="button"
                            className="esm-tool-btn"
                            onClick={() => insertSnippet(descTextareaRef, 'description', '- List item')}
                            title="Bullet List"
                          >
                            <List size={12} /> List
                          </button>
                          <button
                            type="button"
                            className="esm-tool-btn"
                            onClick={() => insertSnippet(descTextareaRef, 'description', '```js\n// code here\n```')}
                            title="Code block"
                          >
                            <Code size={12} /> Code
                          </button>
                          <button
                            type="button"
                            className="esm-tool-btn primary-tool"
                            onClick={insertUserStoryTemplate}
                            title="Insert User Story format"
                          >
                            <Plus size={12} /> User Story Template
                          </button>
                        </div>
                        <div className="esm-tools-right">
                          <span>{descStats.words} words</span>
                          <span>•</span>
                          <span>{descStats.chars} chars</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Live Markdown Preview */
                    <div className="esm-preview-box da-custom-scrollbar markdown-content">
                      {editFormData.description?.trim() ? (
                        <ReactMarkdown>{editFormData.description}</ReactMarkdown>
                      ) : (
                        <div className="esm-preview-empty">
                          <AlignLeft size={24} style={{ opacity: 0.5 }} />
                          <p>No description provided yet.</p>
                          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                            Switch back to Edit mode to write story specifications.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── ACCORDION 2: ACCEPTANCE CRITERIA ── */}
            <div className={`esm-accordion-card ${accordionOpen.acceptance ? 'expanded' : ''}`}>
              {/* Header */}
              <div 
                className="esm-accordion-header" 
                onClick={() => toggleAccordion('acceptance')}
                role="button"
                aria-expanded={accordionOpen.acceptance}
              >
                <div className="esm-accordion-header-left">
                  <div className="esm-icon-pill ac">
                    <CheckSquare size={16} />
                  </div>
                  <div className="esm-accordion-titles">
                    <span className="esm-accordion-title">
                      Acceptance Criteria
                      <span className={`esm-count-badge ac-badge ${acCount > 0 ? 'has-content' : ''}`}>
                        {acCount > 0 ? `${acCount} criteria` : 'Empty'}
                      </span>
                    </span>
                    <span className="esm-accordion-subtitle">
                      Conditions of satisfaction, testable requirements & definition of done
                    </span>
                  </div>
                </div>

                <div className="esm-accordion-header-right">
                  {/* Edit / Preview Tabs */}
                  <div className="esm-tab-group" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`esm-tab-btn ${!previewMode.acceptance ? 'active' : ''}`}
                      onClick={() => {
                        setPreviewMode(prev => ({ ...prev, acceptance: false }));
                        if (!accordionOpen.acceptance) {
                          setAccordionOpen(prev => ({ ...prev, acceptance: true }));
                        }
                      }}
                    >
                      <Edit3 size={11} /> Edit
                    </button>
                    <button
                      type="button"
                      className={`esm-tab-btn ${previewMode.acceptance ? 'active' : ''}`}
                      onClick={() => {
                        setPreviewMode(prev => ({ ...prev, acceptance: true }));
                        if (!accordionOpen.acceptance) {
                          setAccordionOpen(prev => ({ ...prev, acceptance: true }));
                        }
                      }}
                    >
                      <Eye size={11} /> Preview
                    </button>
                  </div>

                  {/* Accordion Chevron */}
                  <div className={`esm-chevron ${accordionOpen.acceptance ? 'expanded' : ''}`}>
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              {/* Accordion Content */}
              {accordionOpen.acceptance && (
                <div className="esm-accordion-content">
                  {!previewMode.acceptance ? (
                    <>
                      <textarea
                        ref={acTextareaRef}
                        rows={5}
                        className="esm-textarea da-custom-scrollbar"
                        value={editFormData.acceptance_criteria}
                        onChange={e => setEditFormData({ ...editFormData, acceptance_criteria: e.target.value })}
                        placeholder="- AC1: User must be able to view user metrics&#10;- AC2: Return 401 on unauthorized access&#10;- AC3: All tests pass with 90%+ coverage"
                      />
                      {/* AC Formatting & Snippet Toolbar */}
                      <div className="esm-toolbar">
                        <div className="esm-tools-left">
                          <button
                            type="button"
                            className="esm-tool-btn primary-tool"
                            onClick={insertAcItem}
                            title="Add numbered AC criterion"
                          >
                            <Plus size={12} /> Add AC Item
                          </button>
                          <button
                            type="button"
                            className="esm-tool-btn"
                            onClick={insertBddScenario}
                            title="Add Given/When/Then scenario"
                          >
                            <Sparkles size={12} /> BDD / Given-When-Then
                          </button>
                          <button
                            type="button"
                            className="esm-tool-btn"
                            onClick={insertChecklistItem}
                            title="Add Checklist checkbox"
                          >
                            <CheckCircle2 size={12} /> Checklist Item
                          </button>
                        </div>
                        <div className="esm-tools-right">
                          <span>{acCount} criteria</span>
                          <span>•</span>
                          <span>{acStats.chars} chars</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Live Markdown Preview */
                    <div className="esm-preview-box da-custom-scrollbar markdown-content">
                      {editFormData.acceptance_criteria?.trim() ? (
                        <ReactMarkdown>{editFormData.acceptance_criteria}</ReactMarkdown>
                      ) : (
                        <div className="esm-preview-empty">
                          <CheckSquare size={24} style={{ opacity: 0.5 }} />
                          <p>No acceptance criteria defined yet.</p>
                          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                            Define clear acceptance criteria to verify when the story is ready for QA.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* ── Footer ── */}
          <div className="esm-footer">
            <div className="esm-sync-note">
              <RefreshCw size={14} />
              <span>Saves locally & synchronizes live with Jira Cloud</span>
            </div>
            <div className="esm-footer-actions">
              <button 
                type="button"
                className="da-btn da-btn-ghost" 
                onClick={onClose}
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="esm-btn-save"
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <>
                    <RefreshCw size={15} className="lucide-animated-spin" /> 
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Check size={16} /> 
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
