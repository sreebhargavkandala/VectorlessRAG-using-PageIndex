import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AILoader } from './components/ui/ai-loader';

const API     = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_KEY = process.env.REACT_APP_API_KEY || '';

function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string>),
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

interface TreeNode {
  title: string;
  start_index: number;
  end_index: number;
  node_id?: string;
  children?: TreeNode[];
}

interface Document {
  id: string;
  filename: string;
  status: 'pending' | 'indexing' | 'ready' | 'error';
  page_count?: number;
  error_message?: string;
  created_at: string;
  tree?: TreeNode | TreeNode[];
}

interface Source {
  title: string;
  start: number;
  end: number;
  node_id: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  source_nodes?: Source[];
  streaming?: boolean;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const GridIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <rect x="1" y="1" width="7" height="7" rx="1.5" fill="var(--blue)" opacity="0.9" />
    <rect x="10" y="1" width="7" height="7" rx="1.5" fill="var(--blue-2)" opacity="0.6" />
    <rect x="1" y="10" width="7" height="7" rx="1.5" fill="var(--blue-2)" opacity="0.6" />
    <rect x="10" y="10" width="7" height="7" rx="1.5" fill="var(--blue)" opacity="0.35" />
  </svg>
);

const UploadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 15V4M7 9l5-5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const FileIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 2a1 1 0 0 1 1-1h6l4 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2z" stroke="currentColor" strokeWidth="1.3" />
    <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M12 20V4M5 11l7-7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="9" stroke="var(--red)" strokeWidth="1.4" />
    <path d="M10 6v4.5M10 13.5v.5" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ChevronIcon = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
    <path d="M2.5 1.5L5.5 4L2.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Tree Node Component ───────────────────────────────────────────────────────

function TreeNodeView({
  node,
  depth = 0,
  highlightedTitles,
}: {
  node: TreeNode;
  depth?: number;
  highlightedTitles: Set<string>;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isHighlighted = highlightedTitles.has(node.title);

  return (
    <div className="tree-node">
      <div
        className={`tree-node-row${isHighlighted ? ' highlighted' : ''}`}
        onClick={() => hasChildren && setOpen(o => !o)}
      >
        <span className={`tree-chevron${open ? ' open' : ''}`} style={{ opacity: hasChildren ? 1 : 0 }}>
          <ChevronIcon />
        </span>
        <span className="tree-node-title">{node.title}</span>
        <span className="tree-node-pages">p.{node.start_index}</span>
      </div>
      {hasChildren && open && (
        <div className="tree-children">
          {node.children!.map((child, i) => (
            <TreeNodeView key={i} node={child} depth={depth + 1} highlightedTitles={highlightedTitles} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [highlightedTitles, setHighlightedTitles] = useState<Set<string>>(new Set());
  const [errorDialog, setErrorDialog] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const selectedDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedDocIdRef.current = selectedDoc?.id ?? null;
  }, [selectedDoc]);

  // ── Polling ───────────────────────────────────────────────────────────────

  const startPolling = useCallback((docId: string) => {
    if (pollTimers.current[docId]) return;
    pollTimers.current[docId] = setInterval(async () => {
      try {
        const res = await apiFetch(`/documents/${docId}/status`);
        const { status, page_count, error_message } = await res.json();
        setDocs(prev => prev.map(d => (d.id === docId ? { ...d, status, page_count, error_message } : d)));

        if (status === 'ready' || status === 'error') {
          clearInterval(pollTimers.current[docId]);
          delete pollTimers.current[docId];

          if (status === 'error' && error_message) {
            setErrorDialog(error_message);
          }

          if (selectedDocIdRef.current === docId && status === 'ready') {
            const full: Document = await apiFetch(`/documents/${docId}`).then(r => r.json());
            setSelectedDoc(full);
          }
        }
      } catch {
        // Network blip — keep polling
      }
    }, 2000);
  }, []);

  // ── Fetch document list ───────────────────────────────────────────────────

  const fetchDocs = useCallback(async () => {
    const res = await apiFetch(`/documents`);
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    setDocs(data as Document[]);
    data.forEach(d => {
      if (d.status === 'indexing' || d.status === 'pending') {
        startPolling(d.id);
      }
    });
    return data;
  }, [startPolling]);

  useEffect(() => {
    apiFetch(`/documents`, { method: 'DELETE' }).finally(() => fetchDocs());
    return () => {
      Object.values(pollTimers.current).forEach(clearInterval);
    };
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) return;
      const form = new FormData();
      form.append('file', file);
      const res = await apiFetch(`/documents/upload`, { method: 'POST', body: form });
      const { doc_id, filename } = await res.json();
      const newDoc: Document = {
        id: doc_id,
        filename,
        status: 'indexing',
        created_at: new Date().toISOString(),
      };
      setDocs(prev => [newDoc, ...prev]);
      setSelectedDoc(newDoc);
      setMessages([]);
      startPolling(doc_id);
    },
    [startPolling],
  );

  // ── Select document ───────────────────────────────────────────────────────

  const selectDoc = useCallback(async (doc: Document) => {
    setHighlightedTitles(new Set());

    if (doc.status !== 'ready') {
      setSelectedDoc(doc);
      setMessages([]);
      return;
    }

    const [full, history]: [Document, any[]] = await Promise.all([
      apiFetch(`/documents/${doc.id}`).then(r => r.json()),
      apiFetch(`/documents/${doc.id}/history`).then(r => r.json()),
    ]);

    setSelectedDoc(full);
    setMessages(
      history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        source_nodes: m.source_nodes ?? [],
      })),
    );
  }, []);

  // ── Send query ────────────────────────────────────────────────────────────

  const sendQuery = useCallback(async () => {
    if (!input.trim() || !selectedDoc || isStreaming) return;

    const question = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsStreaming(true);

    const historySnapshot = messages.map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '', streaming: true },
    ]);

    try {
      const res = await apiFetch(`/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: selectedDoc.id,
          question,
          history: historySnapshot,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let sources: Source[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let payload: any;
          try {
            payload = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (payload.type === 'sources') {
            sources = payload.sources;
            setHighlightedTitles(new Set(sources.map((s: Source) => s.title)));
          } else if (payload.type === 'delta') {
            setMessages(prev => {
              const copy = [...prev];
              const last = { ...copy[copy.length - 1] };
              last.content += payload.text;
              copy[copy.length - 1] = last;
              return copy;
            });
          } else if (payload.type === 'done') {
            setMessages(prev => {
              const copy = [...prev];
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                streaming: false,
                source_nodes: sources,
              };
              return copy;
            });
          } else if (payload.type === 'error') {
            setMessages(prev => {
              const copy = [...prev];
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                streaming: false,
                content: `Error: ${payload.message}`,
              };
              return copy;
            });
          }
        }
      }

      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.streaming) {
          copy[copy.length - 1] = { ...last, streaming: false, source_nodes: sources };
        }
        return copy;
      });
    } catch {
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          streaming: false,
          content: 'Failed to get a response. Please try again.',
        };
        return copy;
      });
    }

    setIsStreaming(false);
  }, [input, selectedDoc, isStreaming, messages]);

  // ── Input helpers ─────────────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const treeRoots: TreeNode[] = selectedDoc?.tree
    ? Array.isArray(selectedDoc.tree) ? selectedDoc.tree : [selectedDoc.tree]
    : [];

  return (
    <div className="app-shell">
      {/* Ambient glow orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      {/* ── Error Dialog ── */}
      {errorDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-icon-wrap">
              <AlertIcon />
            </div>
            <div className="dialog-title">Indexing Failed</div>
            <div className="dialog-body">{errorDialog}</div>
            <button className="dialog-btn" onClick={() => setErrorDialog(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon-wrap">
              <GridIcon size={16} />
            </div>
            <div>
              <div className="brand-name">Vectorless<span>RAG</span></div>
              <div className="brand-tagline">tree-based · no embeddings</div>
            </div>
          </div>
        </div>

        <div className="sidebar-body">
          <div
            className={`upload-zone${isDragging ? ' drag-over' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-icon-ring">
              <UploadIcon />
            </div>
            <div className="upload-text-wrap">
              <div className="upload-label">Drop PDF or <span>browse</span></div>
              <div className="upload-hint">PDF · max 20 MB</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
          </div>

          {docs.length > 0 && (
            <div className="doc-section">
              <div className="doc-section-head">
                <span>Documents</span>
                <span className="doc-count-pill">{docs.length}</span>
              </div>
              <div className="doc-list">
                {docs.map(doc => (
                  <div
                    key={doc.id}
                    className={`doc-item${selectedDoc?.id === doc.id ? ' active' : ''}`}
                    onClick={() => selectDoc(doc)}
                  >
                    <div className="doc-file-icon">
                      <FileIcon size={14} />
                    </div>
                    <div className="doc-meta">
                      <div className="doc-name" title={doc.filename}>{doc.filename}</div>
                      <div className={`doc-status-pill ${doc.status}`}>
                        {doc.status === 'indexing' && <span className="dot-pulse" />}
                        {doc.status === 'ready'
                          ? `${doc.page_count ?? '?'} pages`
                          : doc.status === 'indexing'
                          ? 'indexing…'
                          : doc.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <main className="main-panel">
        {!selectedDoc ? (
          <div className="empty-state">
            <div className="empty-hero">
              <div className="empty-icon-ring">
                <GridIcon size={30} />
              </div>
              <h1 className="empty-heading">Vectorless<span>RAG</span></h1>
              <p className="empty-sub">
                Upload a PDF to start exploring.<br />
                Tree-based retrieval — zero embeddings.
              </p>
              <button className="empty-cta" onClick={() => fileInputRef.current?.click()}>
                <UploadIcon />
                Upload PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="doc-view">
            {/* Top bar */}
            <div className="doc-topbar">
              <div className="topbar-left">
                <div className="topbar-file-icon">
                  <FileIcon size={14} />
                </div>
                <div className="topbar-info">
                  <span className="topbar-filename">{selectedDoc.filename}</span>
                  {selectedDoc.page_count && (
                    <span className="topbar-pages">{selectedDoc.page_count} pages</span>
                  )}
                </div>
              </div>
              <div className={`topbar-status-pill ${selectedDoc.status}`}>
                {(selectedDoc.status === 'ready' || selectedDoc.status === 'indexing') && (
                  <span className={`topbar-dot${selectedDoc.status === 'indexing' ? ' pulse' : ''}`} />
                )}
                {selectedDoc.status === 'ready' && 'Ready'}
                {selectedDoc.status === 'indexing' && 'Indexing'}
                {selectedDoc.status === 'pending' && 'Pending'}
                {selectedDoc.status === 'error' && 'Error'}
              </div>
            </div>

            {/* Content */}
            {(selectedDoc.status === 'indexing' || selectedDoc.status === 'pending') ? (
              <div className="indexing-overlay">
                <AILoader contained text="Indexing" size={160} />
              </div>
            ) : selectedDoc.status === 'error' ? (
              <div className="indexing-error">
                <div style={{ color: 'var(--red)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                  indexing failed
                </div>
                {selectedDoc.error_message && (
                  <div style={{
                    maxWidth: 340, textAlign: 'center', fontSize: 12,
                    color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
                    lineHeight: 1.6, marginTop: 4,
                  }}>
                    {selectedDoc.error_message}
                  </div>
                )}
              </div>
            ) : (
              <div className="doc-body">
                {/* ── Tree Panel ── */}
                <div className="tree-panel">
                  <div className="tree-panel-header">
                    <span className="tree-panel-label">
                      <GridIcon size={11} />
                      Structure
                    </span>
                    {highlightedTitles.size > 0 && (
                      <span className="tree-matches-pill">{highlightedTitles.size} refs</span>
                    )}
                  </div>
                  <div className="tree-list">
                    {treeRoots.map((node, i) => (
                      <TreeNodeView key={i} node={node} highlightedTitles={highlightedTitles} />
                    ))}
                  </div>
                </div>

                {/* ── Chat Panel ── */}
                <div className="chat-panel">
                  <div className="chat-messages">
                    {messages.length === 0 && (
                      <div className="chat-empty">
                        <div className="chat-empty-icon">
                          <ChatIcon />
                        </div>
                        <div className="chat-empty-title">Ask about this document</div>
                        <div className="chat-empty-sub">
                          I'll search the structure and cite exact sections
                        </div>
                      </div>
                    )}

                    {messages.map((msg, i) => (
                      <div key={i} className={`message ${msg.role}`}>
                        {msg.role === 'assistant' && (
                          <div className="msg-avatar">
                            <GridIcon size={12} />
                          </div>
                        )}
                        <div className="message-body">
                          <div className="message-bubble">
                            {msg.content}
                            {msg.streaming && <span className="streaming-cursor" />}
                          </div>
                          {msg.source_nodes && msg.source_nodes.length > 0 && (
                            <div className="message-sources">
                              {msg.source_nodes.map((src, j) => (
                                <span key={j} className="source-chip">
                                  <span className="source-chip-glyph">§</span>
                                  {src.title}
                                  <span className="source-chip-page">p.{src.start}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="chat-input-area">
                    <div className={`chat-input-wrap${isStreaming ? ' streaming' : ''}`}>
                      <textarea
                        ref={textareaRef}
                        className="chat-input"
                        placeholder="Ask anything about this document…"
                        rows={1}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        disabled={isStreaming}
                      />
                      <button
                        className="send-btn"
                        onClick={sendQuery}
                        disabled={!input.trim() || isStreaming}
                        title="Send"
                      >
                        <SendIcon />
                      </button>
                    </div>
                    <div className="input-hint">⏎ send · ⇧⏎ new line</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
