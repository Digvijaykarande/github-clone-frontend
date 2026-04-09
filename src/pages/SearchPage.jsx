import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { searchUsers }  from "../api/userApi";
import { searchRepos }  from "../api/repoApi";
import "../css/searchpage.css"
// ── helpers ───────────────────────────────────────────────────────────────────
const timeAgo = (iso) => {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return "today";
  if (d < 30)  return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

// ── Sub-components ────────────────────────────────────────────────────────────
function UserCard({ user, navigate }) {
  return (
    <div className="sp-card sp-card--user" onClick={() => navigate(`/profile/${user.id}`)}>
      <div className="sp-uav">
        {user.imageUrl
          ? <img src={user.imageUrl} alt={user.username} />
          : <span>{user.username?.charAt(0).toUpperCase()}</span>
        }
      </div>
      <div className="sp-card-body">
        <span className="sp-card-title">{user.username}</span>
        {user.bio && <p className="sp-card-sub">{user.bio}</p>}
        <div className="sp-card-meta">
          <span>
            <svg viewBox="0 0 16 16" fill="currentColor" width="11">
              <path d="M2 5.5a3.5 3.5 0 115.898 2.549 5.508 5.508 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.493 3.493 0 012 5.5z"/>
            </svg>
            {user.followerCount} followers
          </span>
        </div>
      </div>
      <svg className="sp-card-arrow" viewBox="0 0 16 16" fill="currentColor" width="12">
        <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
      </svg>
    </div>
  );
}

function RepoCard({ repo, navigate }) {
  return (
    <div className="sp-card sp-card--repo" onClick={() => navigate(`/repos/${repo.id}`)}>
      <div className="sp-repo-icon">
        <svg viewBox="0 0 16 16" fill="currentColor" width="14">
          <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z"/>
        </svg>
      </div>
      <div className="sp-card-body">
        <div className="sp-card-title-row">
          <span className="sp-card-title">{repo.ownerUserName} / {repo.name}</span>
          <span className={`sp-vis ${repo.isPrivate ? "sp-vis--priv" : "sp-vis--pub"}`}>
            {repo.isPrivate ? "Private" : "Public"}
          </span>
        </div>
        {repo.description && <p className="sp-card-sub">{repo.description}</p>}
        <div className="sp-card-meta">
          {repo.createdAt && <span>Updated {timeAgo(repo.createdAt)}</span>}
          <span>
            <svg viewBox="0 0 16 16" fill="currentColor" width="11">
              <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32z"/>
            </svg>
            {repo.commits?.length ?? 0} commits
          </span>
        </div>
      </div>
      <svg className="sp-card-arrow" viewBox="0 0 16 16" fill="currentColor" width="12">
        <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
      </svg>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="sp-skel">
      <div className="sp-skel-av" />
      <div className="sp-skel-lines">
        <div className="sp-skel-line sp-skel-50" />
        <div className="sp-skel-line sp-skel-75" />
        <div className="sp-skel-line sp-skel-35" />
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate            = useNavigate();
  const query               = params.get("q") || "";

  const [tab, setTab]         = useState("all"); // "all" | "users" | "repos"
  const [users, setUsers]     = useState([]);
  const [repos, setRepos]     = useState([]);
  const [loadingU, setLU]     = useState(false);
  const [loadingR, setLR]     = useState(false);
  const [input, setInput]     = useState(query);

  // Run both searches whenever query changes
  useEffect(() => {
    if (!query.trim()) return;
    setInput(query);

    setLU(true);
    searchUsers(query)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLU(false));

    setLR(true);
    searchRepos(query)
      .then(setRepos)
      .catch(() => setRepos([]))
      .finally(() => setLR(false));
  }, [query]);

  const handleSearch = (e) => {
    if (e.key === "Enter" && input.trim()) {
      setParams({ q: input.trim() });
    }
  };

  const loading = loadingU || loadingR;
  const visibleUsers = tab === "repos" ? [] : users;
  const visibleRepos = tab === "users" ? [] : repos;
  const totalCount   = users.length + repos.length;

  return (
    <div className="sp">
      {/* Header */}
      <div className="sp-header">
        <h1 className="sp-heading">
          {query
            ? <>Results for <em>"{query}"</em></>
            : "Search DevHub"
          }
        </h1>
        {!loading && query && (
          <p className="sp-count">{totalCount} result{totalCount !== 1 ? "s" : ""}</p>
        )}
      </div>

      {/* Search bar */}
      <div className="sp-searchbar">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <input
          className="sp-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Search repos, users…"
          autoFocus
        />
        {input && (
          <button className="sp-clear" onClick={() => { setInput(""); setParams({}); }}>
            <svg viewBox="0 0 16 16" fill="currentColor" width="11">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      {query && (
        <div className="sp-tabs">
          {[
            { key:"all",   label:"All",         count: users.length + repos.length },
            { key:"users", label:"Users",        count: users.length },
            { key:"repos", label:"Repositories", count: repos.length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              className={`sp-tab ${tab === key ? "sp-tab--active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
              {!loading && <span className="sp-tab-badge">{count}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="sp-results">
        {!query ? (
          <div className="sp-empty">
            <svg viewBox="0 0 24 24" fill="none" width="40" height="40">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" opacity=".4"/>
              <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".4"/>
            </svg>
            <p>Search for repositories or users</p>
          </div>
        ) : loading ? (
          [1,2,3,4].map(i => <Skeleton key={i} />)
        ) : totalCount === 0 ? (
          <div className="sp-empty">
            <svg viewBox="0 0 24 24" fill="none" width="40" height="40">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" opacity=".3"/>
              <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".4"/>
            </svg>
            <p>No results for "{query}"</p>
            <span>Try a different search term</span>
          </div>
        ) : (
          <>
            {visibleUsers.length > 0 && (
              <section className="sp-section">
                {tab === "all" && <h2 className="sp-section-title">Users</h2>}
                {visibleUsers.map(u => <UserCard key={u.id} user={u} navigate={navigate} />)}
              </section>
            )}
            {visibleRepos.length > 0 && (
              <section className="sp-section">
                {tab === "all" && <h2 className="sp-section-title">Repositories</h2>}
                {visibleRepos.map(r => <RepoCard key={r.id} repo={r} navigate={navigate} />)}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}