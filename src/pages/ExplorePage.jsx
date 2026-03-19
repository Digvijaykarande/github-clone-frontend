import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { searchRepos, getPublicRepos } from "../api/repoApi";
import API from "../api/axios";
import "../css/explore.css";

// ── constants ─────────────────────────────────────────────────
const LANGUAGES = [
  "All", "JavaScript", "TypeScript", "Python", "Java",
  "Go", "Rust", "C++", "HTML/CSS", "Kotlin", "Swift",
];

const LANG_COLOR = {
  JavaScript:"#f1e05a", TypeScript:"#3178c6", Python:"#3572A5",
  Java:"#b07219", Go:"#00add8", Rust:"#dea584", "C++":"#f34b7d",
  "HTML/CSS":"#e34c26", Kotlin:"#A97BFF", Swift:"#F05138",
};

const TABS = [
  { key:"repos",  label:"Repositories", icon:"M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z" },
  { key:"users",  label:"Users",         icon:"M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.005 6.005 0 00-3.432-5.142z" },
];

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d) / 86400000);
  if (days === 0) return "today";
  if (days < 30)  return `${days}d ago`;
  if (days < 365) return `${Math.floor(days/30)}mo ago`;
  return `${Math.floor(days/365)}y ago`;
};

// ── Skeleton ─────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="ex-skel-row">
      <div className="ex-skel-line ex-skel-50" />
      <div className="ex-skel-line ex-skel-80" />
      <div className="ex-skel-line ex-skel-30" />
    </div>
  );
}

// ── RepoRow ───────────────────────────────────────────────────
function RepoRow({ repo, idx, navigate }) {
  const color = LANG_COLOR[repo.language] || "#848d97";
  return (
    <div
      className="ex-repo-row"
      style={{ animationDelay:`${idx * 45}ms` }}
      onClick={() => navigate(`/repos/${repo.id}`)}
    >
      <div className="ex-row-main">
        <div className="ex-row-title">
          <svg className="ex-repo-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z"/>
          </svg>
          <span className="ex-row-owner">{repo.ownerUserName}</span>
          <span className="ex-row-sep">/</span>
          <span className="ex-row-name">{repo.name}</span>
          <span className="ex-vis-badge ex-vis-public">Public</span>
        </div>
        {repo.description && (
          <p className="ex-row-desc">{repo.description}</p>
        )}
        <div className="ex-row-meta">
          {repo.language && (
            <span className="ex-meta-item">
              <span className="ex-lang-dot" style={{ background: color }} />
              {repo.language}
            </span>
          )}
          <span className="ex-meta-item">
            <svg viewBox="0 0 16 16" fill="currentColor" width="12">
              <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75z"/>
            </svg>
            {repo.files?.length ?? 0} files
          </span>
          <span className="ex-meta-item">
            <svg viewBox="0 0 16 16" fill="currentColor" width="12">
              <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32z"/>
            </svg>
            {repo.commits?.length ?? 0} commits
          </span>
          {repo.createdAt && (
            <span className="ex-meta-item ex-meta-date">
              Updated {fmtDate(repo.createdAt)}
            </span>
          )}
        </div>
      </div>
      <div className="ex-row-arrow">
        <svg viewBox="0 0 16 16" fill="currentColor" width="14">
          <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
        </svg>
      </div>
    </div>
  );
}

// ── UserRow ───────────────────────────────────────────────────
function UserRow({ user, idx, navigate }) {
  const letter = user.username?.charAt(0).toUpperCase();
  return (
    <div
      className="ex-user-row"
      style={{ animationDelay:`${idx * 45}ms` }}
      onClick={() => navigate(`/user/${user.username}`)}
    >
      <div className="ex-user-avatar">
        {user.imageUrl
          ? <img src={user.imageUrl} alt={user.username} />
          : <span>{letter}</span>
        }
      </div>
      <div className="ex-user-info">
        <div className="ex-user-name">{user.username}</div>
        <div className="ex-user-email">{user.email}</div>
        {user.bio && <p className="ex-user-bio">{user.bio}</p>}
      </div>
      <div className="ex-user-stats">
        <span className="ex-user-stat">
          <svg viewBox="0 0 16 16" fill="currentColor" width="12">
            <path d="M2 5.5a3.5 3.5 0 115.898 2.549 5.508 5.508 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.493 3.493 0 012 5.5z"/>
          </svg>
          {user.followers ?? 0} followers
        </span>
      </div>
      <div className="ex-row-arrow">
        <svg viewBox="0 0 16 16" fill="currentColor" width="14">
          <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
        </svg>
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
export default function ExplorePage() {
  const navigate = useNavigate();

  const [tab, setTab]               = useState("repos");
  const [query, setQuery]           = useState("");
  const [langFilter, setLangFilter] = useState("All");
  const [mounted, setMounted]       = useState(false);

  // repos state
  const [allRepos, setAllRepos]     = useState([]);
  const [reposLoading, setReposLoading] = useState(true);

  // users state
  const [users, setUsers]           = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearched, setUsersSearched] = useState(false);

  const searchDebounce = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => setMounted(true), 30); }, []);

  // Load public repos on mount
  useEffect(() => {
    getPublicRepos()
      .then(setAllRepos)
      .catch(console.error)
      .finally(() => setReposLoading(false));
  }, []);

  // Search repos via API when query changes
  const doRepoSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setReposLoading(true);
      getPublicRepos().then(setAllRepos).catch(console.error).finally(() => setReposLoading(false));
      return;
    }
    setReposLoading(true);
    try {
      const res = await searchRepos(q);
      setAllRepos(res);
    } catch { setAllRepos([]); }
    finally { setReposLoading(false); }
  }, []);

  // Search users via API
  const doUserSearch = useCallback(async (q) => {
    if (!q.trim()) { setUsers([]); setUsersSearched(false); return; }
    setUsersLoading(true);
    setUsersSearched(true);
    try {
      const res = await API.get(`/api/users/search?q=${encodeURIComponent(q)}`);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch { setUsers([]); }
    finally { setUsersLoading(false); }
  }, []);

  // Debounced search
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      if (tab === "repos") doRepoSearch(val);
      else doUserSearch(val);
    }, 380);
  };

  // When tab switches, re-run search with current query
  const switchTab = (t) => {
    setTab(t);
    setQuery("");
    setUsers([]);
    setUsersSearched(false);
    if (t === "repos" && allRepos.length === 0) {
      setReposLoading(true);
      getPublicRepos().then(setAllRepos).catch(console.error).finally(() => setReposLoading(false));
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Client-side language filter
  const visibleRepos = allRepos.filter(r =>
    langFilter === "All" || r.language === langFilter
  );

  const repoLangCounts = LANGUAGES.reduce((acc, l) => {
    acc[l] = l === "All" ? allRepos.length : allRepos.filter(r => r.language === l).length;
    return acc;
  }, {});

  // Keyboard shortcut: / focuses search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className={`ex-page ${mounted ? "ex-page--in" : ""}`}>

      {/* ── HERO ── */}
      <div className="ex-hero">
        <div className="ex-hero-bg">
          {Array.from({ length: 60 }).map((_, i) => (
            <span key={i} className="ex-hero-dot"
              style={{ animationDelay:`${(i * 83) % 4000}ms`, animationDuration:`${3 + (i % 3)}s` }} />
          ))}
        </div>
        <div className="ex-hero-content">
          <div className="ex-hero-label">
            <svg viewBox="0 0 16 16" fill="currentColor" width="13">
              <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
            </svg>
            Discover open source
          </div>
          <h1 className="ex-hero-title">Explore DevHub</h1>
          <p className="ex-hero-sub">Find repositories and developers from the community</p>

          {/* Big search bar */}
          <div className="ex-search-bar">
            <svg className="ex-search-icon" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input
              ref={inputRef}
              className="ex-search-input"
              placeholder={tab === "repos" ? "Search repositories…" : "Search users by username…"}
              value={query}
              onChange={handleQueryChange}
              autoFocus
            />
            {query && (
              <button className="ex-search-clear" onClick={() => {
                setQuery("");
                if (tab === "repos") doRepoSearch("");
                else { setUsers([]); setUsersSearched(false); }
              }}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="13">
                  <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                </svg>
              </button>
            )}
            <kbd className="ex-search-kbd">/</kbd>
          </div>

          {/* Tab switcher */}
          <div className="ex-hero-tabs">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`ex-hero-tab ${tab === t.key ? "ex-hero-tab--active" : ""}`}
                onClick={() => switchTab(t.key)}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" width="13">
                  <path d={t.icon}/>
                </svg>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="ex-body">

        {/* ── REPOS TAB ── */}
        {tab === "repos" && (
          <div className="ex-layout">

            {/* Sidebar: language filters */}
            <aside className="ex-sidebar">
              <div className="ex-sidebar-title">
                <svg viewBox="0 0 16 16" fill="currentColor" width="13">
                  <path d="M.75 3a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H.75zm3 5a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5zm3 5a.75.75 0 000 1.5h2.5a.75.75 0 000-1.5h-2.5z"/>
                </svg>
                Filter by language
              </div>
              <div className="ex-lang-list">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    className={`ex-lang-item ${langFilter === lang ? "ex-lang-item--active" : ""}`}
                    onClick={() => setLangFilter(lang)}
                  >
                    <span className="ex-lang-left">
                      {lang !== "All" && (
                        <span className="ex-lang-dot" style={{ background: LANG_COLOR[lang] || "#848d97" }} />
                      )}
                      {lang}
                    </span>
                    <span className="ex-lang-count">{repoLangCounts[lang] || 0}</span>
                  </button>
                ))}
              </div>
            </aside>

            {/* Results */}
            <div className="ex-results">
              <div className="ex-results-header">
                <span className="ex-results-count">
                  {reposLoading ? "Searching…" : (
                    <>
                      <strong>{visibleRepos.length}</strong> repositor{visibleRepos.length !== 1 ? "ies" : "y"}
                      {query && <> matching <em>"{query}"</em></>}
                      {langFilter !== "All" && <> in <em>{langFilter}</em></>}
                    </>
                  )}
                </span>
              </div>

              {reposLoading ? (
                <div className="ex-list">
                  {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
                </div>
              ) : visibleRepos.length === 0 ? (
                <div className="ex-empty">
                  <svg viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity=".25"/>
                    <path d="M22 32h20M32 22v20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".3"/>
                  </svg>
                  <p>No repositories found</p>
                  <span>{query ? `Try a different search term` : `No public repositories yet`}</span>
                </div>
              ) : (
                <div className="ex-list">
                  {visibleRepos.map((r, i) => (
                    <RepoRow key={r.id || i} repo={r} idx={i} navigate={navigate} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div className="ex-layout ex-layout--full">
            <div className="ex-results ex-results--full">
              {!usersSearched ? (
                <div className="ex-users-prompt">
                  <div className="ex-prompt-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" opacity=".5"/>
                      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".3"/>
                    </svg>
                  </div>
                  <p className="ex-prompt-title">Search for developers</p>
                  <p className="ex-prompt-sub">Type a username in the search bar above to find users on DevHub</p>
                </div>
              ) : usersLoading ? (
                <div className="ex-list">
                  {[1,2,3].map(i => <SkeletonRow key={i} />)}
                </div>
              ) : users.length === 0 ? (
                <div className="ex-empty">
                  <svg viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity=".25"/>
                    <path d="M22 32h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".3"/>
                  </svg>
                  <p>No users found</p>
                  <span>Try searching for a different username</span>
                </div>
              ) : (
                <>
                  <div className="ex-results-header">
                    <span className="ex-results-count">
                      <strong>{users.length}</strong> user{users.length !== 1 ? "s" : ""} matching <em>"{query}"</em>
                    </span>
                  </div>
                  <div className="ex-list">
                    {users.map((u, i) => (
                      <UserRow key={u.id || i} user={u} idx={i} navigate={navigate} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
