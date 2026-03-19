import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRepo } from "../api/repoApi";
import "../css/createRepo.css";

const LANGUAGES = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "Go",
  "Rust", "HTML/CSS", "PHP", "Ruby", "Swift", "Kotlin", "Other",
];

const langColor = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5",
  Java: "#b07219", "C++": "#f34b7d", Go: "#00add8", Rust: "#dea584",
  "HTML/CSS": "#e34c26", PHP: "#4F5D95", Ruby: "#701516",
  Swift: "#F05138", Kotlin: "#A97BFF", Other: "#848d97",
};

export default function CreateRepoPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    isPrivate: false,
    language: "",
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Repository name is required";
    else if (!/^[a-zA-Z0-9_.-]+$/.test(form.name))
      e.name = "Only letters, numbers, hyphens, dots, underscores allowed";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const repo = await createRepo(form);
      showToast(`Repository "${repo.name}" created!`);
      setTimeout(() => navigate(`/repos/${repo.id}`), 1200);
    } catch (err) {
      showToast(err?.message || "Failed to create repository", "error");
    } finally {
      setLoading(false);
    }
  };

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  return (
    <div className="cr-page">
      {toast && (
        <div className={`cr-toast ${toast.type === "error" ? "cr-toast--err" : ""}`}>
          {toast.type === "error"
            ? <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z"/></svg>
            : <svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
          }
          {toast.msg}
        </div>
      )}

      <div className="cr-container">

        {/* ── HEADER ── */}
        <div className="cr-header">
          <button className="cr-back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
              <path d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z"/>
            </svg>
            Back
          </button>
          <div className="cr-title-wrap">
            <svg className="cr-title-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"/>
            </svg>
            <h1>Create a new repository</h1>
          </div>
          <p className="cr-subtitle">
            A repository contains all your project's files, revision history, and more.
          </p>
        </div>

        <div className="cr-divider" />

        {/* ── FORM ── */}
        <div className="cr-form">

          {/* Name */}
          <div className={`cr-field ${errors.name ? "cr-field--err" : ""}`}>
            <label className="cr-label">
              Repository name <span className="cr-required">*</span>
            </label>
            <div className="cr-input-wrap">
              <input
                className="cr-input"
                placeholder="my-awesome-project"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                autoFocus
              />
              {form.name && !errors.name && (
                <span className="cr-input-check">
                  <svg viewBox="0 0 16 16" fill="currentColor" width="14">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                  </svg>
                </span>
              )}
            </div>
            {errors.name && <span className="cr-err-msg">{errors.name}</span>}
            <span className="cr-hint">Great repository names are short and memorable.</span>
          </div>

          {/* Description */}
          <div className="cr-field">
            <label className="cr-label">
              Description <span className="cr-optional">(optional)</span>
            </label>
            <textarea
              className="cr-textarea"
              placeholder="What's this project about?"
              rows={3}
              value={form.description}
              onChange={e => set("description", e.target.value)}
            />
          </div>

          {/* Language */}
          <div className="cr-field">
            <label className="cr-label">
              Primary language <span className="cr-optional">(optional)</span>
            </label>
            <div className="cr-lang-grid">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  className={`cr-lang-btn ${form.language === lang ? "cr-lang-btn--active" : ""}`}
                  onClick={() => set("language", form.language === lang ? "" : lang)}
                  type="button"
                >
                  <span
                    className="cr-lang-dot"
                    style={{ background: langColor[lang] || "#848d97" }}
                  />
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="cr-divider" />

          {/* Visibility */}
          <div className="cr-field">
            <label className="cr-label">Visibility</label>
            <div className="cr-visibility">
              {/* Public */}
              <div
                className={`cr-vis-card ${!form.isPrivate ? "cr-vis-card--active" : ""}`}
                onClick={() => set("isPrivate", false)}
              >
                <div className="cr-vis-radio">
                  {!form.isPrivate && <span className="cr-vis-dot" />}
                </div>
                <div className="cr-vis-icon cr-vis-icon--public">
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                </div>
                <div>
                  <p className="cr-vis-title">Public</p>
                  <p className="cr-vis-desc">Anyone on the internet can see this repository.</p>
                </div>
              </div>

              {/* Private */}
              <div
                className={`cr-vis-card ${form.isPrivate ? "cr-vis-card--active" : ""}`}
                onClick={() => set("isPrivate", true)}
              >
                <div className="cr-vis-radio">
                  {form.isPrivate && <span className="cr-vis-dot" />}
                </div>
                <div className="cr-vis-icon cr-vis-icon--private">
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 4v2h-.25A1.75 1.75 0 002 7.75v5.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-5.5A1.75 1.75 0 0012.25 6H12V4a4 4 0 10-8 0zm6.5 2V4a2.5 2.5 0 00-5 0v2h5zM8 9.5a1 1 0 110 2 1 1 0 010-2z" clipRule="evenodd" fillRule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <p className="cr-vis-title">Private</p>
                  <p className="cr-vis-desc">You choose who can see and commit to this repository.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="cr-divider" />

          {/* Submit */}
          <div className="cr-actions">
            <button
              className="cr-btn-create"
              onClick={handleSubmit}
              disabled={loading || !form.name.trim()}
            >
              {loading ? (
                <><span className="cr-spinner" /> Creating repository…</>
              ) : (
                <><svg viewBox="0 0 16 16" fill="currentColor" width="14"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z"/></svg> Create repository</>
              )}
            </button>
            <button className="cr-btn-cancel" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
