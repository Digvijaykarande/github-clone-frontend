import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyRepos } from "../api/repoApi";
import "../css/dashboard.css";

// ── constants ─────────────────────────────────────────────────
const LANG_COLOR = {
  JavaScript:"#f1e05a", TypeScript:"#3178c6", Python:"#3572A5",
  Java:"#b07219", Go:"#00add8", Rust:"#dea584", "C++":"#f34b7d",
  "HTML/CSS":"#e34c26", Kotlin:"#A97BFF", Swift:"#F05138",
  CSS:"#563d7c", PHP:"#4F5D95",
};

const fmtDate = (iso) => {
  if (!iso) return "";
  const d    = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m    = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const day  = Math.floor(diff / 86400000);
  if (m  < 1)  return "just now";
  if (m  < 60) return `${m}m ago`;
  if (h  < 24) return `${h}h ago`;
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
};

// ── Animated terminal lines ───────────────────────────────────
const TERMINAL_LINES = [
  { prefix: "$", text: "git init my-project", color: "#e6edf3" },
  { prefix: ">", text: "Initialized empty Git repository", color: "#3fb950" },
  { prefix: "$", text: "git add .", color: "#e6edf3" },
  { prefix: "$", text: 'git commit -m "Initial commit"', color: "#e6edf3" },
  { prefix: ">", text: "[main (root-commit)] Initial commit", color: "#3fb950" },
  { prefix: "$", text: "git push origin main", color: "#e6edf3" },
  { prefix: ">", text: "Branch 'main' set up to track remote", color: "#2f81f7" },
];

function Terminal() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    if (visibleLines < TERMINAL_LINES.length) {
      const t = setTimeout(() => setVisibleLines(v => v + 1), 600 + visibleLines * 80);
      return () => clearTimeout(t);
    }
  }, [visibleLines]);

  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="db-terminal">
      <div className="db-terminal-bar">
        <span className="db-tbar-dot db-tbar-red" />
        <span className="db-tbar-dot db-tbar-yellow" />
        <span className="db-tbar-dot db-tbar-green" />
        <span className="db-tbar-title">terminal — zsh</span>
      </div>
      <div className="db-terminal-body">
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="db-terminal-line" style={{ animationDelay: `${i * 0.05}s` }}>
            <span className="db-t-prefix" style={{ color: line.prefix === "$" ? "#f78166" : "#848d97" }}>
              {line.prefix}
            </span>
            <span style={{ color: line.color }}>{line.text}</span>
          </div>
        ))}
        {visibleLines < TERMINAL_LINES.length && (
          <div className="db-terminal-line">
            <span className="db-t-prefix" style={{ color: "#f78166" }}>$</span>
            <span className={`db-cursor ${cursor ? "db-cursor--on" : ""}`}>▌</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ icon, label, value, color, delay, onClick }) {
  return (
    <div
      className="db-stat-card"
      style={{ animationDelay:`${delay}ms`, "--card-accent": color }}
      onClick={onClick}
    >
      <div className="db-stat-icon" style={{ background:`${color}18`, color }}>
        {icon}
      </div>
      <div className="db-stat-body">
        <span className="db-stat-value">{value ?? 0}</span>
        <span className="db-stat-label">{label}</span>
      </div>
      <div className="db-stat-bar" style={{ background:`${color}22` }}>
        <div className="db-stat-fill" style={{ background: color }} />
      </div>
    </div>
  );
}

// ── Repo card ─────────────────────────────────────────────────
function RepoCard({ repo, idx, navigate }) {
  const color = LANG_COLOR[repo.language] || "#848d97";
  return (
    <div
      className="db-repo-card"
      style={{ animationDelay:`${idx * 60}ms` }}
      onClick={() => navigate(`/repos/${repo.id}`)}
    >
      <div className="db-repo-card-top">
        <div className="db-repo-card-icon">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z"/>
          </svg>
        </div>
        <span className="db-repo-card-name">{repo.name}</span>
        <span className={`db-repo-vis ${repo.isPrivate ? "db-repo-vis--priv" : "db-repo-vis--pub"}`}>
          {repo.isPrivate ? "Private" : "Public"}
        </span>
      </div>
      {repo.description && <p className="db-repo-card-desc">{repo.description}</p>}
      <div className="db-repo-card-footer">
        {repo.language && (
          <span className="db-repo-lang">
            <span className="db-lang-dot" style={{ background: color }} />
            {repo.language}
          </span>
        )}
        <span className="db-repo-meta-item">
          <svg viewBox="0 0 16 16" fill="currentColor" width="11">
            <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75z"/>
          </svg>
          {repo.files?.length ?? 0}
        </span>
        <span className="db-repo-meta-item">
          <svg viewBox="0 0 16 16" fill="currentColor" width="11">
            <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32z"/>
          </svg>
          {repo.commits?.length ?? 0}
        </span>
        <span className="db-repo-date">{fmtDate(repo.createdAt)}</span>
      </div>
      <div className="db-repo-card-glow" style={{ background: color }} />
    </div>
  );
}

// ── Quick action button ───────────────────────────────────────
function QuickAction({ icon, label, sub, onClick, color, delay }) {
  return (
    <button
      className="db-quick-action"
      onClick={onClick}
      style={{ animationDelay:`${delay}ms`, "--qa-color": color }}
    >
      <div className="db-qa-icon" style={{ background:`${color}15`, color }}>
        {icon}
      </div>
      <div className="db-qa-text">
        <span className="db-qa-label">{label}</span>
        <span className="db-qa-sub">{sub}</span>
      </div>
      <svg className="db-qa-arrow" viewBox="0 0 16 16" fill="currentColor" width="13">
        <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
      </svg>
    </button>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [repos, setRepos]         = useState([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [mounted, setMounted]     = useState(false);
  const [timeLabel, setTimeLabel] = useState("");

  // greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    setTimeout(() => setMounted(true), 30);
    const now = new Date();
    setTimeLabel(now.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" }));
  }, []);

  useEffect(() => {
    getMyRepos()
      .then(setRepos)
      .catch(console.error)
      .finally(() => setReposLoading(false));
  }, []);

  const recentRepos   = [...repos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
  const totalCommits  = repos.reduce((s, r) => s + (r.commits?.length ?? 0), 0);
  const totalFiles    = repos.reduce((s, r) => s + (r.files?.length ?? 0), 0);
  const publicCount   = repos.filter(r => !r.isPrivate).length;

  // Recent commit activity across all repos
  const recentActivity = repos
    .flatMap(r => (r.commits || []).map(c => ({ ...c, repoName: r.name, repoId: r.id })))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  return (
    <>
    <div className={`db-page ${mounted ? "db-page--in" : ""}`}>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section className="db-hero">

        {/* Layered background */}
        <div className="db-hero-bg">
          <div className="db-hero-grid" aria-hidden="true">
            {Array.from({ length: 120 }).map((_, i) => (
              <span key={i} className="db-grid-cell"
                style={{ animationDelay:`${(i * 113) % 5000}ms`, animationDuration:`${4 + (i % 4)}s` }} />
            ))}
          </div>
          <div className="db-hero-orb db-hero-orb-1" />
          <div className="db-hero-orb db-hero-orb-2" />
          <div className="db-hero-orb db-hero-orb-3" />
          <div className="db-hero-noise" />
        </div>

        <div className="db-hero-inner">

          {/* Left: greeting + stats */}
          <div className="db-hero-left">
            <div className="db-hero-date">{timeLabel}</div>

            <div className="db-hero-greeting">
              <div className="db-avatar-hero">
                {user?.imageUrl
                  ? <img src={user.imageUrl} alt="avatar" />
                  : <span>{user?.username?.charAt(0).toUpperCase()}</span>
                }
                <span className="db-avatar-status" />
              </div>
              <div>
                <p className="db-greeting-top">{greeting},</p>
                <h1 className="db-greeting-name">{user?.username}
                  <span className="db-greeting-wave">👋</span>
                </h1>
              </div>
            </div>

            <p className="db-hero-bio">
              {user?.bio || "Welcome to your DevHub dashboard — your code, your world."}
            </p>

            <div className="db-hero-cta">
              <button className="db-cta-primary" onClick={() => navigate("/new")}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="14">
                  <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
                </svg>
                New Repository
              </button>
              <button className="db-cta-secondary" onClick={() => navigate("/explore")}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="14">
                  <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
                </svg>
                Explore
              </button>
            </div>
          </div>

          {/* Right: animated terminal */}
          <div className="db-hero-right">
            <Terminal />
          </div>

        </div>
      </section>

      {/* ══ STATS ROW ══════════════════════════════════════════ */}
      <section className="db-stats-section">
        <div className="db-stats-grid">
          <StatCard
            delay={0}
            color="#2f81f7"
            label="Repositories"
            value={repos.length}
            onClick={() => navigate("/profile")}
            icon={<svg viewBox="0 0 16 16" fill="currentColor" width="18"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z"/></svg>}
          />
          <StatCard
            delay={80}
            color="#3fb950"
            label="Total Commits"
            value={totalCommits}
            onClick={() => navigate("/profile")}
            icon={<svg viewBox="0 0 16 16" fill="currentColor" width="18"><path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zM8 6a2 2 0 100 4 2 2 0 000-4z"/></svg>}
          />
          <StatCard
            delay={160}
            color="#e3b341"
            label="Files"
            value={totalFiles}
            onClick={() => navigate("/profile")}
            icon={<svg viewBox="0 0 16 16" fill="currentColor" width="18"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75z"/></svg>}
          />
          <StatCard
            delay={240}
            color="#bc8cff"
            label="Followers"
            value={user?.followers}
            onClick={() => navigate("/profile")}
            icon={<svg viewBox="0 0 16 16" fill="currentColor" width="18"><path d="M2 5.5a3.5 3.5 0 115.898 2.549 5.508 5.508 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.493 3.493 0 012 5.5zM11 4a.75.75 0 100 1.5 1.5 1.5 0 01.666 2.844.75.75 0 00-.416.672v.352a.75.75 0 00.574.73c1.2.289 2.162 1.2 2.522 2.372a.75.75 0 101.434-.44 5.01 5.01 0 00-2.56-3.012A3 3 0 0011 4z"/></svg>}
          />
          <StatCard
            delay={320}
            color="#f78166"
            label="Public Repos"
            value={publicCount}
            onClick={() => navigate("/explore")}
            icon={<svg viewBox="0 0 16 16" fill="currentColor" width="18"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>}
          />
        </div>
      </section>

      {/* ══ MAIN CONTENT GRID ══════════════════════════════════ */}
      <section className="db-content">

        {/* ── LEFT: Recent repos + quick actions ── */}
        <div className="db-content-left">

          {/* Quick actions */}
          <div className="db-section">
            <h2 className="db-section-title">
              <svg viewBox="0 0 16 16" fill="currentColor" width="14">
                <path d="M8 1.5a.5.5 0 00-.5.5v5.5H2a.5.5 0 000 1h5.5V14a.5.5 0 001 0V8.5H14a.5.5 0 000-1H8.5V2a.5.5 0 00-.5-.5z"/>
              </svg>
              Quick actions
            </h2>
            <div className="db-quick-actions">
              <QuickAction
                delay={0} color="#2f81f7" label="New repository" sub="Start a new project"
                onClick={() => navigate("/new")}
                icon={<svg viewBox="0 0 16 16" fill="currentColor" width="16"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z"/></svg>}
              />
              <QuickAction
                delay={60} color="#3fb950" label="View profile" sub="See your public page"
                onClick={() => navigate("/profile")}
                icon={<svg viewBox="0 0 16 16" fill="currentColor" width="16"><path d="M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.005 6.005 0 00-3.432-5.142z"/></svg>}
              />
              <QuickAction
                delay={120} color="#e3b341" label="Explore" sub="Discover open source"
                onClick={() => navigate("/explore")}
                icon={<svg viewBox="0 0 16 16" fill="currentColor" width="16"><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/></svg>}
              />
            </div>
          </div>

          {/* Recent repositories */}
          <div className="db-section">
            <div className="db-section-header">
              <h2 className="db-section-title">
                <svg viewBox="0 0 16 16" fill="currentColor" width="14">
                  <path d="M1.5 1.75V13.5h13V1.75a.25.25 0 00-.25-.25h-12.5a.25.25 0 00-.25.25zM0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v11.75a1 1 0 01-1 1H1a1 1 0 01-1-1V1.75z"/>
                </svg>
                Recent repositories
              </h2>
              <button className="db-section-link" onClick={() => navigate("/profile")}>
                View all →
              </button>
            </div>

            {reposLoading ? (
              <div className="db-repo-grid">
                {[1,2,3,4].map(i => (
                  <div key={i} className="db-repo-skel" style={{ animationDelay:`${i*80}ms` }}>
                    <div className="db-skel-line db-skel-50" />
                    <div className="db-skel-line db-skel-80" />
                    <div className="db-skel-line db-skel-35" />
                  </div>
                ))}
              </div>
            ) : recentRepos.length === 0 ? (
              <div className="db-repos-empty">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 14H11v-2h2v2zm0-4H11V7h2v5z" fill="currentColor" opacity=".2"/>
                </svg>
                <p>No repositories yet</p>
                <button onClick={() => navigate("/new")}>Create your first repo →</button>
              </div>
            ) : (
              <div className="db-repo-grid">
                {recentRepos.map((r, i) => (
                  <RepoCard key={r.id || i} repo={r} idx={i} navigate={navigate} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Activity feed ── */}
        <div className="db-content-right">
          <div className="db-section db-section--sticky">
            <h2 className="db-section-title">
              <svg viewBox="0 0 16 16" fill="currentColor" width="14">
                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zm7-3.25v3.5a.75.75 0 01-.75.75H4.5a.75.75 0 010-1.5h2.5V4.75a.75.75 0 011.5 0z"/>
              </svg>
              Recent activity
            </h2>

            {recentActivity.length === 0 ? (
              <div className="db-activity-empty">
                <div className="db-activity-empty-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" opacity=".4"/>
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".25"/>
                  </svg>
                </div>
                <p>No activity yet</p>
                <span>Commits will appear here</span>
              </div>
            ) : (
              <div className="db-activity-feed">
                {recentActivity.map((commit, i) => (
                  <div
                    key={commit.id || i}
                    className="db-activity-item"
                    style={{ animationDelay:`${i * 55}ms` }}
                    onClick={() => navigate(`/repos/${commit.repoId}`)}
                  >
                    <div className="db-activity-left">
                      <div className="db-activity-dot" />
                      {i < recentActivity.length - 1 && <div className="db-activity-line" />}
                    </div>
                    <div className="db-activity-body">
                      <div className="db-activity-top">
                        <svg viewBox="0 0 16 16" fill="currentColor" width="11" style={{ color:"#3fb950", flexShrink:0 }}>
                          <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zM8 6a2 2 0 100 4 2 2 0 000-4z"/>
                        </svg>
                        <span className="db-activity-msg">{commit.message}</span>
                      </div>
                      <div className="db-activity-meta">
                        <span className="db-activity-repo" onClick={e => { e.stopPropagation(); navigate(`/repos/${commit.repoId}`); }}>
                          {commit.repoName}
                        </span>
                        <span className="db-activity-time">{fmtDate(commit.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile completion card */}
          <div className="db-profile-card">
            <div className="db-profile-card-avatar">
              {user?.imageUrl
                ? <img src={user.imageUrl} alt="avatar" />
                : <span>{user?.username?.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div className="db-profile-card-info">
              <p className="db-profile-card-name">{user?.username}</p>
              <p className="db-profile-card-email">{user?.email}</p>
            </div>
            <div className="db-profile-card-stats">
              <div className="db-pc-stat">
                <span>{user?.followers ?? 0}</span>
                <span>Followers</span>
              </div>
              <div className="db-pc-divider" />
              <div className="db-pc-stat">
                <span>{user?.following ?? 0}</span>
                <span>Following</span>
              </div>
              <div className="db-pc-divider" />
              <div className="db-pc-stat">
                <span>{repos.length}</span>
                <span>Repos</span>
              </div>
            </div>
            <button className="db-profile-card-btn" onClick={() => navigate("/profile")}>
              View profile
            </button>
          </div>
        </div>

      </section>
    </div>
  </>
  );
}
