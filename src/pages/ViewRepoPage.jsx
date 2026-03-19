import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRepoById, getCommits, deleteRepo } from "../api/repoApi";
import { useAuth } from "../context/AuthContext";
import FileManager from "../components/FileManager"
import "../css/viewRepo.css";

const langColor = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5",
  Java: "#b07219", "C++": "#f34b7d", Go: "#00add8", Rust: "#dea584",
  "HTML/CSS": "#e34c26", PHP: "#4F5D95", Ruby: "#701516",
  Swift: "#F05138", Kotlin: "#A97BFF",
};

const fileIcon = (name = "") => {
  const ext = name.split(".").pop().toLowerCase();
  const icons = {
    js: "#f1e05a", ts: "#3178c6", py: "#3572A5", java: "#b07219",
    html: "#e34c26", css: "#563d7c", json: "#cbcb41", md: "#083fa1",
    go: "#00add8", rs: "#dea584", cpp: "#f34b7d",
  };
  return icons[ext] || "#848d97";
};

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30)  return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ── sub-components ─────────────────────────────────────────────

function FileRow({ file, idx }) {
  const color = fileIcon(file.name || file.fileName);
  const name  = file.name || file.fileName || "untitled";
  return (
    <div className="vr-file-row" style={{ animationDelay: `${idx * 40}ms` }}>
      <div className="vr-file-left">
        <span className="vr-file-dot" style={{ background: color }} />
        <svg className="vr-file-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V6h-2.75A1.75 1.75 0 018.75 4.25V1.5H3.75zm5.75.56v2.19c0 .138.112.25.25.25h2.19L9.5 2.06z"/>
        </svg>
        <span className="vr-file-name">{name}</span>
      </div>
      <div className="vr-file-right">
        {file.size && <span className="vr-file-size">{file.size}</span>}
        <span className="vr-file-date">{fmtDate(file.updatedAt || file.createdAt)}</span>
      </div>
    </div>
  );
}

function CommitRow({ commit, idx, isLast }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="vr-commit" style={{ animationDelay: `${idx * 50}ms` }}>
      <div className="vr-commit-line-wrap">
        <div className="vr-commit-dot" />
        {!isLast && <div className="vr-commit-line" />}
      </div>
      <div className="vr-commit-body">
        <div className="vr-commit-top" onClick={() => setExpanded(!expanded)}>
          <span className="vr-commit-msg">{commit.message}</span>
          <div className="vr-commit-meta">
            <span className="vr-commit-author">
              <svg viewBox="0 0 16 16" fill="currentColor" width="12">
                <path d="M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.005 6.005 0 00-3.432-5.142z"/>
              </svg>
              {commit.author}
            </span>
            <span className="vr-commit-date">{fmtDate(commit.createdAt)}</span>
            <span className="vr-commit-hash">{(commit.id || "").slice(0, 7)}</span>
            {commit.snapshot?.length > 0 && (
              <button
                className={`vr-commit-expand ${expanded ? "vr-commit-expand--open" : ""}`}
                onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" width="11">
                  <path d="M12.78 5.22a.75.75 0 010 1.06L8 11.06 3.22 6.28a.75.75 0 011.06-1.06L8 8.94l3.72-3.72a.75.75 0 011.06 0z"/>
                </svg>
                {commit.snapshot.length} file{commit.snapshot.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
        {expanded && commit.snapshot?.length > 0 && (
          <div className="vr-commit-snapshot">
            {commit.snapshot.map((f, i) => (
              <span key={i} className="vr-snap-file">
                <span className="vr-snap-dot" style={{ background: fileIcon(f.name || f.fileName) }} />
                {f.name || f.fileName}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────────
export default function ViewRepoPage() {
  const { repoId } = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [repo, setRepo]         = useState(null);
  const [commits, setCommits]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("files"); // files | commits
  const [deleting, setDeleting] = useState(false);
  const [showDel, setShowDel]   = useState(false);
  const [toast, setToast]       = useState(null);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 30); }, []);

  useEffect(() => {
    Promise.all([getRepoById(repoId), getCommits(repoId)])
      .then(([r, c]) => { setRepo(r); setCommits(Array.isArray(c) ? c : []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [repoId]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteRepo(repoId);
      showToast("Repository deleted");
      setTimeout(() => navigate("/profile"), 1200);
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setDeleting(false);
      setShowDel(false);
    }
  };

  const isOwner = user?.id === repo?.ownerId;

  if (loading) return (
    <div className="vr-loading">
      <div className="vr-loading-inner">
        {[1,2,3].map(i => <div key={i} className="vr-skel" style={{ width: `${[70,90,55][i-1]}%`, animationDelay: `${i*120}ms` }} />)}
      </div>
    </div>
  );

  if (!repo) return (
    <div className="vr-notfound">
      <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity=".3"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      <p>Repository not found</p>
      <button onClick={() => navigate(-1)}>Go back</button>
    </div>
  );

  const files = repo.files || [];

  return (
    <div className={`vr-page ${mounted ? "vr-page--in" : ""}`}>

      {/* TOAST */}
      {toast && (
        <div className={`vr-toast ${toast.type === "error" ? "vr-toast--err" : ""}`}>
          {toast.type === "error"
            ? <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z"/></svg>
            : <svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* DELETE MODAL */}
      {showDel && (
        <div className="vr-modal-overlay" onClick={() => setShowDel(false)}>
          <div className="vr-modal" onClick={e => e.stopPropagation()}>
            <div className="vr-modal-icon">
              <svg viewBox="0 0 16 16" fill="currentColor"><path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM6.5 1.75v1.25h3V1.75a.25.25 0 00-.25-.25h-2.5a.25.25 0 00-.25.25zM4.997 6.5a.75.75 0 10-1.493.148l.47 6.383A1.75 1.75 0 005.723 14.5h4.554a1.75 1.75 0 001.749-1.469l.47-6.383a.75.75 0 10-1.493-.148l-.47 6.383a.25.25 0 01-.249.21H5.723a.25.25 0 01-.249-.21L4.997 6.5z"/></svg>
            </div>
            <h3>Delete repository</h3>
            <p>Are you sure you want to delete <strong>{repo.name}</strong>? This action cannot be undone.</p>
            <div className="vr-modal-actions">
              <button className="vr-modal-cancel" onClick={() => setShowDel(false)}>Cancel</button>
              <button className="vr-modal-confirm" onClick={handleDelete} disabled={deleting}>
                {deleting ? <span className="vr-spinner" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="vr-container">

        {/* ── BREADCRUMB ── */}
        <div className="vr-breadcrumb">
          <button onClick={() => navigate("/profile")} className="vr-bread-link">
            {user?.username}
          </button>
          <span className="vr-bread-sep">/</span>
          <span className="vr-bread-current">{repo.name}</span>
          <span className={`vr-vis-badge ${repo.isPrivate ? "vr-vis-private" : "vr-vis-public"}`}>
            {repo.isPrivate ? "Private" : "Public"}
          </span>
        </div>

        {/* ── REPO HEADER ── */}
        <div className="vr-header">
          <div className="vr-header-left">
            <h1 className="vr-repo-name">
              <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20" style={{ color: "var(--accent, #2f81f7)" }}>
                <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z"/>
              </svg>
              {repo.name}
            </h1>
            {repo.description && <p className="vr-repo-desc">{repo.description}</p>}

            <div className="vr-repo-tags">
              {repo.language && (
                <span className="vr-tag">
                  <span className="vr-tag-dot" style={{ background: langColor[repo.language] || "#848d97" }} />
                  {repo.language}
                </span>
              )}
              <span className="vr-tag">
                <svg viewBox="0 0 16 16" fill="currentColor" width="12">
                  <path d="M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0zm.5 4.75a.75.75 0 00-1.5 0v3.5a.75.75 0 00.471.696l2.5 1a.75.75 0 00.557-1.392L8.5 7.742V4.75z"/>
                </svg>
                {fmtDate(repo.createdAt)}
              </span>
              <span className="vr-tag">
                <svg viewBox="0 0 16 16" fill="currentColor" width="12">
                  <path d="M1.643 3.143L.427 1.927A.25.25 0 000 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 00.177-.427L2.715 4.215a6.5 6.5 0 11-1.18 4.458.75.75 0 10-1.493.154 8.001 8.001 0 101.6-5.684zM7.75 4a.75.75 0 01.75.75v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.75.75 0 017 8.25v-3.5A.75.75 0 017.75 4z"/>
                </svg>
                {commits.length} commit{commits.length !== 1 ? "s" : ""}
              </span>
              <span className="vr-tag">
                <svg viewBox="0 0 16 16" fill="currentColor" width="12">
                  <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75z"/>
                </svg>
                {files.length} file{files.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="vr-header-right">
            {isOwner && (
              <button className="vr-btn-delete" onClick={() => setShowDel(true)}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="13">
                  <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.997 6.5a.75.75 0 10-1.493.148l.47 6.383A1.75 1.75 0 005.723 14.5h4.554a1.75 1.75 0 001.749-1.469l.47-6.383a.75.75 0 10-1.493-.148l-.47 6.383a.25.25 0 01-.249.21H5.723a.25.25 0 01-.249-.21L4.997 6.5z"/>
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="vr-tabs">
          <button
            className={`vr-tab ${activeTab === "files" ? "vr-tab--active" : ""}`}
            onClick={() => setActiveTab("files")}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" width="14">
              <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75z"/>
            </svg>
            Files
            <span className="vr-tab-count">{files.length}</span>
          </button>
          <button
            className={`vr-tab ${activeTab === "commits" ? "vr-tab--active" : ""}`}
            onClick={() => setActiveTab("commits")}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" width="14">
              <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zM8 6a2 2 0 100 4 2 2 0 000-4z"/>
            </svg>
            Commits
            <span className="vr-tab-count">{commits.length}</span>
          </button>
        </div>

        {/* files tab */}
        {activeTab === "files" && (
          <div className="vr-panel">
            <FileManager
              repoId={repoId}
              files={repo.files || []}
              isOwner={isOwner}
              onFilesChange={(updatedFiles) => setRepo(r => ({ ...r, files: updatedFiles }))}
            />
          </div>
        )}

        {/* ── COMMITS TAB ── */}
        {activeTab === "commits" && (
          <div className="vr-panel vr-commits-panel">
            {commits.length === 0 ? (
              <div className="vr-empty">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" opacity=".4"/>
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".3"/>
                </svg>
                <p>No commits yet</p>
                <span>Commits to this repository will appear here</span>
              </div>
            ) : (
              <div className="vr-commit-list">
                <p className="vr-commits-count">{commits.length} commit{commits.length !== 1 ? "s" : ""}</p>
                {commits.map((c, i) => (
                  <CommitRow key={c.id || i} commit={c} idx={i} isLast={i === commits.length - 1} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
