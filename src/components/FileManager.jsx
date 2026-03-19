import { useState, useRef, useCallback } from "react";
import API from "../api/axios";
import "../css/fileManager.css";

// ── helpers ──────────────────────────────────────────────────
const EXT_COLOR = {
  js:"#f1e05a", jsx:"#61dafb", ts:"#3178c6", tsx:"#3178c6",
  py:"#3572A5", java:"#b07219", go:"#00add8", rs:"#dea584",
  html:"#e34c26", css:"#563d7c", scss:"#c6538c", json:"#cbcb41",
  md:"#083fa1", txt:"#848d97", cpp:"#f34b7d", c:"#555555",
  sh:"#89e051", yml:"#cb171e", yaml:"#cb171e", xml:"#e37933",
};

const getExt  = (path = "") => path.split(".").pop().toLowerCase();
const getColor = (path)     => EXT_COLOR[getExt(path)] || "#848d97";
const getName  = (path = "") => path.split("/").pop();

const fmtDate = (iso) => {
  if (!iso) return "";
  const d    = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m    = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const day  = Math.floor(diff / 86400000);
  if (m < 60)   return `${m}m ago`;
  if (h < 24)   return `${h}h ago`;
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
};

const fmtSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/(1024*1024)).toFixed(1)} MB`;
};

// ── syntax highlight (minimal, CSS-based) ────────────────────
function CodeViewer({ content, path }) {
  const ext = getExt(path);
  return (
    <div className="fm-code-viewer">
      <div className="fm-code-header">
        <span className="fm-code-lang-dot" style={{ background: getColor(path) }} />
        <span className="fm-code-filename">{getName(path)}</span>
        <span className="fm-code-lines">{content?.split("\n").length ?? 0} lines</span>
      </div>
      <div className="fm-code-body">
        <div className="fm-line-nums">
          {(content || "").split("\n").map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <pre className={`fm-pre language-${ext}`}><code>{content}</code></pre>
      </div>
    </div>
  );
}

// ── CodeEditor ────────────────────────────────────────────────
function CodeEditor({ value, onChange, path }) {
  const taRef = useRef(null);

  const handleTab = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta  = taRef.current;
      const s   = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = value.substring(0, s) + "  " + value.substring(end);
      onChange(newVal);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 2; }, 0);
    }
  };

  return (
    <div className="fm-editor-wrap">
      <div className="fm-editor-header">
        <span className="fm-code-lang-dot" style={{ background: getColor(path) }} />
        <span className="fm-code-filename">{getName(path) || "new file"}</span>
        <span className="fm-editor-hint">Tab = 2 spaces</span>
      </div>
      <div className="fm-editor-body">
        <div className="fm-line-nums">
          {(value || "").split("\n").map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <textarea
          ref={taRef}
          className="fm-editor-ta"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleTab}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>
    </div>
  );
}

// ── MAIN FileManager ──────────────────────────────────────────
export default function FileManager({ repoId, files: initialFiles, isOwner, onFilesChange }) {
  const [files, setFiles]           = useState(initialFiles || []);
  const [selectedFile, setSelectedFile] = useState(null);  // full CodeFile obj
  const [loadingFile, setLoadingFile]   = useState(false);

  // modal modes: null | "create" | "upload" | "edit" | "view"
  const [modal, setModal]   = useState(null);
  const [delTarget, setDelTarget] = useState(null);

  // form state
  const [newPath, setNewPath]       = useState("");
  const [newContent, setNewContent] = useState("");
  const [commitMsg, setCommitMsg]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [toast, setToast]           = useState(null);

  // drag-drop
  const [dragging, setDragging]     = useState(false);
  const dropRef = useRef(null);
  const fileInputRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refreshFiles = (updatedRepo) => {
    const f = updatedRepo?.files || [];
    setFiles(f);
    onFilesChange?.(f);
  };

  // ── Open file for viewing ──
  const openFile = async (file) => {
    setLoadingFile(true);
    setModal("view");
    try {
      const res = await API.get(`/api/repos/${repoId}/files/${file.id}`);
      setSelectedFile(res.data);
    } catch {
      showToast("Failed to load file", "error");
      setModal(null);
    } finally {
      setLoadingFile(false);
    }
  };

  // ── Open file for editing ──
  const openEdit = async (file) => {
    setLoadingFile(true);
    try {
      const res = await API.get(`/api/repos/${repoId}/files/${file.id}`);
      setSelectedFile(res.data);
      setNewPath(res.data.path);
      setNewContent(res.data.content || "");
      setCommitMsg("");
      setModal("edit");
    } catch {
      showToast("Failed to load file", "error");
    } finally {
      setLoadingFile(false);
    }
  };

  // ── CREATE file ──
  const handleCreate = async () => {
    if (!newPath.trim()) { showToast("File path is required", "error"); return; }
    setSaving(true);
    try {
      const res = await API.post(`/api/repos/${repoId}/files`, {
        path: newPath.trim(),
        content: newContent,
        commitMessage: commitMsg || `Add ${newPath.trim()}`,
      });
      refreshFiles(res.data);
      setModal(null);
      setNewPath(""); setNewContent(""); setCommitMsg("");
      showToast(`File "${getName(newPath)}" created!`);
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to create file", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── UPLOAD file from device ──
  const processUpload = useCallback(async (file) => {
    const text = await file.text();
    const path = file.name;
    setSaving(true);
    try {
      const res = await API.post(`/api/repos/${repoId}/files`, {
        path,
        content: text,
        commitMessage: `Upload ${path}`,
      });
      refreshFiles(res.data);
      showToast(`"${path}" uploaded!`);
    } catch (err) {
      showToast(err?.response?.data?.message || "Upload failed", "error");
    } finally {
      setSaving(false);
    }
  }, [repoId]);

  const handleFileInputChange = async (e) => {
    const picked = Array.from(e.target.files || []);
    for (const f of picked) await processUpload(f);
    e.target.value = "";
    setModal(null);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    setModal(null);
    const dropped = Array.from(e.dataTransfer.files || []);
    for (const f of dropped) await processUpload(f);
  };

  // ── EDIT / UPDATE file ──
  const handleUpdate = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      const res = await API.put(`/api/repos/${repoId}/files/${selectedFile.id}`, {
        path: newPath.trim(),
        content: newContent,
        commitMessage: commitMsg || `Update ${getName(newPath)}`,
      });
      refreshFiles(res.data);
      setModal(null);
      showToast(`"${getName(newPath)}" updated!`);
    } catch (err) {
      showToast(err?.response?.data?.message || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── DELETE file ──
  const handleDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      const res = await API.delete(`/api/repos/${repoId}/files/${delTarget.id}`);
      refreshFiles(res.data);
      setDelTarget(null);
      showToast(`"${getName(delTarget.path)}" deleted`);
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setNewPath(""); setNewContent(""); setCommitMsg("");
    setModal("create");
  };

  return (
    <div className="fm-root">

      {/* ── TOAST ── */}
      {toast && (
        <div className={`fm-toast ${toast.type === "error" ? "fm-toast--err" : ""}`}>
          {toast.type === "error"
            ? <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z"/></svg>
            : <svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* ── FILE LIST HEADER ── */}
      <div className="fm-list-header">
        <div className="fm-list-header-left">
          <svg viewBox="0 0 16 16" fill="currentColor" width="14" style={{ color:"var(--accent,#2f81f7)" }}>
            <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75z"/>
          </svg>
          <span>{files.length} file{files.length !== 1 ? "s" : ""}</span>
        </div>
        {isOwner && (
          <div className="fm-actions">
            <button className="fm-btn fm-btn--ghost" onClick={() => setModal("upload")}>
              <svg viewBox="0 0 16 16" fill="currentColor" width="13"><path d="M8.75 1.75a.75.75 0 00-1.5 0V7H3.56a.25.25 0 00-.177.427l4.25 4.25a.25.25 0 00.354 0l4.25-4.25A.25.25 0 0012 7H8.75V1.75zM1.75 14.5a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H1.75z" transform="rotate(180 8 8)"/></svg>
              Upload
            </button>
            <button className="fm-btn fm-btn--accent" onClick={openCreate}>
              <svg viewBox="0 0 16 16" fill="currentColor" width="13"><path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/></svg>
              New file
            </button>
          </div>
        )}
      </div>

      {/* ── FILE TABLE ── */}
      {files.length === 0 ? (
        isOwner ? (
          <div
            className={`fm-dropzone ${dragging ? "fm-dropzone--active" : ""}`}
            ref={dropRef}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" multiple style={{ display:"none" }} onChange={handleFileInputChange} />
            <div className="fm-dropzone-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="fm-dropzone-title">
              {dragging ? "Drop files here" : "Drop files or click to upload"}
            </p>
            <p className="fm-dropzone-sub">or use <strong>New file</strong> to create one in the editor</p>
          </div>
        ) : (
          <div className="fm-empty">
            <svg viewBox="0 0 24 24" fill="none"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" stroke="currentColor" strokeWidth="1.5" opacity=".3"/></svg>
            <p>No files in this repository</p>
          </div>
        )
      ) : (
        <div className="fm-table">
          <div className="fm-table-head">
            <span>Name</span>
            <span>Last updated</span>
            {isOwner && <span />}
          </div>
          {files.map((file, idx) => (
            <div key={file.id || idx} className="fm-row" style={{ animationDelay:`${idx*40}ms` }}>
              <div className="fm-row-name" onClick={() => openFile(file)}>
                <span className="fm-row-dot" style={{ background: getColor(file.path) }} />
                <svg className="fm-row-fileicon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V6h-2.75A1.75 1.75 0 018.75 4.25V1.5H3.75zm5.75.56v2.19c0 .138.112.25.25.25h2.19L9.5 2.06z"/>
                </svg>
                <span className="fm-row-path">{file.path}</span>
              </div>
              <span className="fm-row-date">{fmtDate(file.updatedAt || file.createdAt)}</span>
              {isOwner && (
                <div className="fm-row-btns">
                  <button className="fm-icon-btn" title="Edit" onClick={() => openEdit(file)}>
                    <svg viewBox="0 0 16 16" fill="currentColor" width="13"><path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61z"/></svg>
                  </button>
                  <button className="fm-icon-btn fm-icon-btn--danger" title="Delete" onClick={() => setDelTarget(file)}>
                    <svg viewBox="0 0 16 16" fill="currentColor" width="13"><path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.997 6.5a.75.75 0 10-1.493.148l.47 6.383A1.75 1.75 0 005.723 14.5h4.554a1.75 1.75 0 001.749-1.469l.47-6.383a.75.75 0 10-1.493-.148l-.47 6.383a.25.25 0 01-.249.21H5.723a.25.25 0 01-.249-.21L4.997 6.5z"/></svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══ MODALS ══════════════════════════════════════════════ */}

      {/* ── VIEW modal ── */}
      {modal === "view" && (
        <div className="fm-overlay" onClick={() => setModal(null)}>
          <div className="fm-modal fm-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="fm-modal-topbar">
              <span className="fm-modal-title">View file</span>
              <div className="fm-modal-topbar-right">
                {isOwner && selectedFile && (
                  <button className="fm-btn fm-btn--ghost fm-btn--sm"
                    onClick={() => { openEdit(selectedFile); }}>
                    <svg viewBox="0 0 16 16" fill="currentColor" width="12"><path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61z"/></svg>
                    Edit
                  </button>
                )}
                <button className="fm-close-btn" onClick={() => setModal(null)}>
                  <svg viewBox="0 0 16 16" fill="currentColor" width="14"><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg>
                </button>
              </div>
            </div>
            {loadingFile
              ? <div className="fm-modal-loading"><span className="fm-spinner-lg" /></div>
              : selectedFile && <CodeViewer content={selectedFile.content} path={selectedFile.path} />
            }
          </div>
        </div>
      )}

      {/* ── CREATE modal ── */}
      {modal === "create" && (
        <div className="fm-overlay" onClick={() => setModal(null)}>
          <div className="fm-modal fm-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="fm-modal-topbar">
              <span className="fm-modal-title">
                <svg viewBox="0 0 16 16" fill="currentColor" width="15" style={{ color:"var(--accent,#2f81f7)" }}><path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/></svg>
                New file
              </span>
              <button className="fm-close-btn" onClick={() => setModal(null)}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="14"><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg>
              </button>
            </div>
            <div className="fm-modal-body">
              <div className="fm-field">
                <label className="fm-label">File path</label>
                <input
                  className="fm-input fm-mono"
                  placeholder="src/components/App.jsx"
                  value={newPath}
                  onChange={e => setNewPath(e.target.value)}
                  autoFocus
                />
                <span className="fm-hint">Use slashes for folders: <code>src/utils/helper.js</code></span>
              </div>
              <div className="fm-field fm-field--grow">
                <label className="fm-label">Content</label>
                <CodeEditor value={newContent} onChange={setNewContent} path={newPath} />
              </div>
              <div className="fm-field">
                <label className="fm-label">Commit message</label>
                <input
                  className="fm-input"
                  placeholder={`Add ${getName(newPath) || "new file"}`}
                  value={commitMsg}
                  onChange={e => setCommitMsg(e.target.value)}
                />
              </div>
            </div>
            <div className="fm-modal-footer">
              <button className="fm-btn fm-btn--cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="fm-btn fm-btn--green" onClick={handleCreate} disabled={saving || !newPath.trim()}>
                {saving ? <><span className="fm-spinner" /> Saving…</> : "Commit new file"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD modal ── */}
      {modal === "upload" && (
        <div className="fm-overlay" onClick={() => setModal(null)}>
          <div className="fm-modal" onClick={e => e.stopPropagation()}>
            <div className="fm-modal-topbar">
              <span className="fm-modal-title">Upload files</span>
              <button className="fm-close-btn" onClick={() => setModal(null)}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="14"><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg>
              </button>
            </div>
            <div className="fm-modal-body">
              <div
                className={`fm-dropzone fm-dropzone--modal ${dragging ? "fm-dropzone--active" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" multiple style={{ display:"none" }} onChange={handleFileInputChange} />
                <div className="fm-dropzone-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="fm-dropzone-title">{dragging ? "Release to upload" : "Drag & drop files here"}</p>
                <p className="fm-dropzone-sub">or <strong>click to browse</strong> your device</p>
                {saving && <div className="fm-upload-progress"><span className="fm-spinner-lg" /> Uploading…</div>}
              </div>
              <p className="fm-upload-note">
                Files are read as text. Binary files (images, etc.) may not display correctly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT modal ── */}
      {modal === "edit" && (
        <div className="fm-overlay" onClick={() => setModal(null)}>
          <div className="fm-modal fm-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="fm-modal-topbar">
              <span className="fm-modal-title">
                <svg viewBox="0 0 16 16" fill="currentColor" width="14" style={{ color:"var(--accent,#2f81f7)" }}><path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61z"/></svg>
                Edit — <code className="fm-title-code">{getName(selectedFile?.path || newPath)}</code>
              </span>
              <button className="fm-close-btn" onClick={() => setModal(null)}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="14"><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg>
              </button>
            </div>
            {loadingFile
              ? <div className="fm-modal-loading"><span className="fm-spinner-lg" /></div>
              : (
                <>
                  <div className="fm-modal-body">
                    <div className="fm-field">
                      <label className="fm-label">File path</label>
                      <input
                        className="fm-input fm-mono"
                        value={newPath}
                        onChange={e => setNewPath(e.target.value)}
                      />
                    </div>
                    <div className="fm-field fm-field--grow">
                      <label className="fm-label">Content</label>
                      <CodeEditor value={newContent} onChange={setNewContent} path={newPath} />
                    </div>
                    <div className="fm-field">
                      <label className="fm-label">Commit message</label>
                      <input
                        className="fm-input"
                        placeholder={`Update ${getName(newPath)}`}
                        value={commitMsg}
                        onChange={e => setCommitMsg(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="fm-modal-footer">
                    <button className="fm-btn fm-btn--cancel" onClick={() => setModal(null)}>Cancel</button>
                    <button className="fm-btn fm-btn--green" onClick={handleUpdate} disabled={saving}>
                      {saving ? <><span className="fm-spinner" /> Saving…</> : "Commit changes"}
                    </button>
                  </div>
                </>
              )
            }
          </div>
        </div>
      )}

      {/* ── DELETE confirm ── */}
      {delTarget && (
        <div className="fm-overlay" onClick={() => setDelTarget(null)}>
          <div className="fm-modal fm-modal--sm" onClick={e => e.stopPropagation()}>
            <div className="fm-del-icon">
              <svg viewBox="0 0 16 16" fill="currentColor"><path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.997 6.5a.75.75 0 10-1.493.148l.47 6.383A1.75 1.75 0 005.723 14.5h4.554a1.75 1.75 0 001.749-1.469l.47-6.383a.75.75 0 10-1.493-.148l-.47 6.383a.25.25 0 01-.249.21H5.723a.25.25 0 01-.249-.21L4.997 6.5z"/></svg>
            </div>
            <h3>Delete file</h3>
            <p>Delete <code className="fm-del-name">{getName(delTarget.path)}</code>? This cannot be undone.</p>
            <div className="fm-modal-footer">
              <button className="fm-btn fm-btn--cancel" onClick={() => setDelTarget(null)}>Cancel</button>
              <button className="fm-btn fm-btn--danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? <span className="fm-spinner" /> : "Delete file"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
