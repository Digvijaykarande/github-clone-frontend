import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateProfile, uploadProfileImage, getMyRepos } from "../api/Profileapi";
import { getFollowers, getFollowing, getPublicProfile } from "../api/userApi";
import { getUserRepos } from "../api/repoApi";
import "../css/profile.css";

// ── helpers ───────────────────────────────────────────────────────────────────
const LANG_COLOR = {
  Java:"#b07219", JavaScript:"#f1e05a", Python:"#3572A5",
  TypeScript:"#3178c6", "C++":"#f34b7d", Go:"#00add8",
  Rust:"#dea584", HTML:"#e34c26", CSS:"#563d7c",
  Kotlin:"#A97BFF", Swift:"#F05138", PHP:"#4F5D95",
};

const fmtShort = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month:"short", year:"numeric" }) : "";

const timeAgo = (iso) => {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return "today";
  if (d < 30)  return `${d}d ago`;
  if (d < 365) return `${Math.floor(d/30)}mo ago`;
  return `${Math.floor(d/365)}y ago`;
};

// ── Contribution Heatmap ──────────────────────────────────────────────────────
function ContributionHeatmap({ repos }) {
  const WEEKS = 26, DAYS = 7;

  const commitMap = useMemo(() => {
    const map = {};
    repos.forEach(r => {
      (r.commits || []).forEach(c => {
        if (c.createdAt) {
          const key = new Date(c.createdAt).toISOString().split("T")[0];
          map[key] = (map[key] || 0) + 1;
        }
      });
    });
    return map;
  }, [repos]);

  const cells = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = WEEKS * DAYS - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      result.push({ key, count: commitMap[key] || 0 });
    }
    return result;
  }, [commitMap]);

  const max = Math.max(...cells.map(c => c.count), 1);
  const getLevel = c => {
    if (c === 0) return 0;
    if (c <= max * 0.25) return 1;
    if (c <= max * 0.5)  return 2;
    if (c <= max * 0.75) return 3;
    return 4;
  };
  const totalContribs = cells.reduce((s, c) => s + c.count, 0);

  return (
    <div className="pp-heatmap">
      <div className="pp-heatmap-top">
        <span className="pp-heatmap-title">
          <svg viewBox="0 0 16 16" fill="currentColor" width="13">
            <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zM8 6a2 2 0 100 4 2 2 0 000-4z"/>
          </svg>
          <strong>{totalContribs}</strong> commits in the last 6 months
        </span>
        <div className="pp-heatmap-legend">
          <span>Less</span>
          {[0,1,2,3,4].map(l => <span key={l} className={`pp-hm-sq pp-hm-l${l}`} />)}
          <span>More</span>
        </div>
      </div>
      <div className="pp-heatmap-grid">
        {Array.from({ length: WEEKS }).map((_, w) => (
          <div key={w} className="pp-hm-week">
            {cells.slice(w * DAYS, w * DAYS + DAYS).map((cell, d) => (
              <div
                key={d}
                className={`pp-hm-sq pp-hm-l${getLevel(cell.count)}`}
                title={`${cell.key}: ${cell.count} commit${cell.count !== 1 ? "s" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Language bar ──────────────────────────────────────────────────────────────
function LanguageBar({ repos }) {
  const stats = useMemo(() => {
    const map = {};
    repos.forEach(r => { if (r.language) map[r.language] = (map[r.language] || 0) + 1; });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map).sort((a,b) => b[1]-a[1])
      .map(([lang, count]) => ({ lang, pct: Math.round((count/total)*100) }));
  }, [repos]);

  if (!stats.length) return null;

  return (
    <div className="pp-langbar">
      <p className="pp-langbar-title">
        <svg viewBox="0 0 16 16" fill="currentColor" width="12">
          <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0114.25 16H1.75A1.75 1.75 0 010 14.25V1.75zM6.5 6.5l-2.5 2.5 2.5 2.5.75-.75L5.5 9l1.75-1.75L6.5 6.5zm3 .75L11.25 9l-1.75 1.75.75.75 2.5-2.5-2.5-2.5-.75.75z"/>
        </svg>
        Languages
      </p>
      <div className="pp-langbar-track">
        {stats.map(({ lang, pct }) => (
          <div key={lang} className="pp-langbar-seg"
            style={{ width:`${pct}%`, background: LANG_COLOR[lang]||"#848d97" }}
            title={`${lang} ${pct}%`}
          />
        ))}
      </div>
      <div className="pp-langbar-legend">
        {stats.slice(0,6).map(({ lang, pct }) => (
          <span key={lang} className="pp-langbar-item">
            <span className="pp-ld" style={{ background: LANG_COLOR[lang]||"#848d97" }} />
            {lang} <em>{pct}%</em>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Repo card ─────────────────────────────────────────────────────────────────
function RepoCard({ repo, idx, navigate }) {
  const color = LANG_COLOR[repo.language] || "#848d97";
  return (
    <div
      className="pp-rcard"
      style={{ animationDelay:`${idx*50}ms` }}
      onClick={() => navigate(`/repos/${repo.id}`)}
    >
      <div className="pp-rcard-glow" style={{ background: color }} />
      <div className="pp-rcard-top">
        <svg className="pp-rcard-repoicon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z"/>
        </svg>
        <span className="pp-rcard-name">{repo.name}</span>
        <span className={`pp-rcard-vis ${!repo.isPrivate ? "pp-vis-pub" : "pp-vis-priv"}`}>
          {repo.isPrivate ? "Private" : "Public"}
        </span>
      </div>
      {repo.description && <p className="pp-rcard-desc">{repo.description}</p>}
      <div className="pp-rcard-footer">
        {repo.language && (
          <span className="pp-rcard-lang">
            <span className="pp-ld" style={{ background: color }} />{repo.language}
          </span>
        )}
        <span className="pp-rcard-stat">
          <svg viewBox="0 0 16 16" fill="currentColor" width="11">
            <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32z"/>
          </svg>
          {repo.commits?.length ?? 0}
        </span>
        <span className="pp-rcard-stat">
          <svg viewBox="0 0 16 16" fill="currentColor" width="11">
            <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75z"/>
          </svg>
          {repo.files?.length ?? 0}
        </span>
        {repo.createdAt && <span className="pp-rcard-date">{timeAgo(repo.createdAt)}</span>}
      </div>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ value, label, icon, color, delay, onClick }) {
  return (
    <div
      className={`pp-spill ${onClick ? "pp-spill--clickable" : ""}`}
      style={{ animationDelay:`${delay}ms`, "--pc": color }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="pp-spill-icon" style={{ color, background:`${color}18` }}>{icon}</div>
      <div>
        <div className="pp-spill-val">{value ?? 0}</div>
        <div className="pp-spill-lbl">{label}</div>
      </div>
    </div>
  );
}

// ── Followers / Following modal ───────────────────────────────────────────────
function UserListModal({ title, users, loading, onClose, navigate }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div className="pp-modal-backdrop" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>
        <div className="pp-modal-head">
          <h3>{title}</h3>
          <button className="pp-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 16 16" fill="currentColor" width="14">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
            </svg>
          </button>
        </div>
        <div className="pp-modal-body">
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} className="pp-modal-skel">
                <div className="pp-modal-skel-av" />
                <div className="pp-modal-skel-lines">
                  <div className="pp-skel-line pp-skel-50" />
                  <div className="pp-skel-line pp-skel-35" />
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <p className="pp-modal-empty">Nobody here yet.</p>
          ) : (
            users.map(u => (
              <div
                key={u.id}
                className="pp-modal-user"
                onClick={() => { navigate(`/profile/${u.id}`); onClose(); }}
              >
                <div className="pp-modal-av">
                  {u.imageUrl
                    ? <img src={u.imageUrl} alt={u.username} />
                    : <span>{u.username?.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <div className="pp-modal-info">
                  <span className="pp-modal-uname">{u.username}</span>
                  {u.bio && <span className="pp-modal-bio">{u.bio}</span>}
                </div>
                <div className="pp-modal-counts">
                  <span>{u.followerCount} followers</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {

  const { user: authUser, refreshUser } = useAuth();
  const { userId } = useParams();
  
  // SECURE TOGGLE: True if no userId in URL parameters
  const isOwnProfile = !userId; 

  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const [editing, setEditing]           = useState(false);
  const [form, setForm]                 = useState({ username:"", bio:"" });
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgPreview, setImgPreview]     = useState(null);
  const fileRef = useRef(null);

  const [repos, setRepos]               = useState([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [filter, setFilter]             = useState("");
  const [tab, setTab]                   = useState("all");
  const [sortBy, setSortBy]             = useState("updated");
  const [mounted, setMounted]           = useState(false);

  const [followersList, setFollowersList]     = useState([]);
  const [followingList, setFollowingList]     = useState([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);

  const [modal, setModal] = useState(null);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 30); return () => clearTimeout(t); }, []);
  
  useEffect(() => {
    const loadUser = async () => {
      try {
        if (!isOwnProfile) {
          // Other user's profile
          const data = await getPublicProfile(userId);
          setUser(data);
        } else {
          // Logged-in user
          setUser(authUser);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadUser();
  }, [userId, authUser, isOwnProfile]);

  useEffect(() => {
    if (user) {
      setForm({ username: user.username||"", bio: user.bio||"" });
      setImgPreview(user.imageUrl||null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    setReposLoading(true);

    if (!isOwnProfile) {
      getUserRepos(user.username)
        .then(setRepos)
        .catch(console.error)
        .finally(() => setReposLoading(false));
    } else {
      getMyRepos()
        .then(setRepos)
        .catch(console.error)
        .finally(() => setReposLoading(false));
    }
  }, [user, isOwnProfile]); 

  useEffect(() => {
    if (!user?.id) return;

    setFollowersLoading(true);
    getFollowers(user.id)
      .then(setFollowersList)
      .catch(console.error)
      .finally(() => setFollowersLoading(false));

    setFollowingLoading(true);
    getFollowing(user.id)
      .then(setFollowingList)
      .catch(console.error)
      .finally(() => setFollowingLoading(false));
  }, [user?.id]);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      await refreshUser();
      setEditing(false);
      showToast("Profile updated!");
    } catch {
      showToast("Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleImg = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setImgPreview(ev.target.result);
    reader.readAsDataURL(file);

    setImgUploading(true);
    try {
      await uploadProfileImage(file);
      await refreshUser();
      showToast("Avatar updated!");
    } catch {
      showToast("Image upload failed", "error");
    } finally {
      setImgUploading(false);
    }
  };

  const visible = useMemo(() => {
    let list = repos.filter(r => {
      const matchesFilter = r.name?.toLowerCase().includes(filter.toLowerCase());
      const matchesTab = tab==="all" || (tab==="public" && !r.isPrivate) || (tab==="private" && r.isPrivate);
      return matchesFilter && matchesTab;
    });
    if (sortBy==="name")    list = [...list].sort((a,b) => a.name.localeCompare(b.name));
    if (sortBy==="commits") list = [...list].sort((a,b) => (b.commits?.length??0)-(a.commits?.length??0));
    if (sortBy==="updated") list = [...list].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    return list;
  }, [repos, filter, tab, sortBy]);

  const tabCount    = t => t==="all" ? repos.length : repos.filter(r => t==="public" ? !r.isPrivate : r.isPrivate).length;
  const totalCommits = repos.reduce((s,r) => s+(r.commits?.length??0), 0);
  const totalFiles   = repos.reduce((s,r) => s+(r.files?.length??0), 0);

  const memberSince = repos.length > 0
    ? fmtShort(repos.reduce((e,r) => r.createdAt && (!e || r.createdAt < e) ? r.createdAt : e, null))
    : null;

  return (
    <div className={`pp ${mounted?"pp--in":""}`}>

      {/* TOAST */}
      {toast && (
        <div className={`pp-toast ${toast.type==="error"?"pp-toast--err":""}`}>
          {toast.type==="error"
            ? <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z"/></svg>
            : <svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* FOLLOWERS / FOLLOWING MODAL */}
      {modal && (
        <UserListModal
          title={modal === "followers" ? "Followers" : "Following"}
          users={modal === "followers" ? followersList : followingList}
          loading={modal === "followers" ? followersLoading : followingLoading}
          onClose={() => setModal(null)}
          navigate={navigate}
        />
      )}

      {/* BANNER */}
      <div className="pp-banner">
        <div className="pp-banner-orbs">
          <div className="pp-orb pp-orb-1" /><div className="pp-orb pp-orb-2" /><div className="pp-orb pp-orb-3" />
        </div>
        <div className="pp-banner-grid">
          {Array.from({length:112}).map((_,i)=>(
            <span key={i} className="pp-cell" style={{animationDelay:`${(i*43)%3500}ms`}} />
          ))}
        </div>
        <div className="pp-banner-glow" />
        <div className="pp-banner-code" aria-hidden="true">
          <span className="pbc-kw">const</span> <span className="pbc-id">dev</span> <span className="pbc-op">=</span> <span className="pbc-str">"{user?.username}"</span><span className="pbc-op">;</span>
        </div>
      </div>

      <div className="pp-layout">

        {/* ── SIDEBAR ── */}
        <aside className="pp-sidebar">
          
          {/* Avatar - SECURED: Only clickable if isOwnProfile */}
          <div 
            className="pp-avatar-wrap" 
            onClick={isOwnProfile ? () => fileRef.current?.click() : undefined}
            style={{ cursor: isOwnProfile ? "pointer" : "default" }}
          >
            <div className={`pp-avatar ${imgUploading?"pp-avatar--pulse":""}`}>
              {imgPreview
                ? <img src={imgPreview} alt="avatar" />
                : <span>{user?.username?.charAt(0).toUpperCase()}</span>
              }
              <div className="pp-avatar-ring" />
            </div>

            {/* SECURED: Only show 'Change photo' overlay if own profile */}
            {isOwnProfile && (
              <div className="pp-avatar-overlay">
                {imgUploading
                  ? <span className="pp-spinner" />
                  : <svg viewBox="0 0 24 24" fill="none">
                      <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.8"/>
                      <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.8"/>
                    </svg>
                }
                <span>{imgUploading?"Uploading…":"Change photo"}</span>
              </div>
            )}

            {/* SECURED: Only mount the file input if own profile */}
            {isOwnProfile && (
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImg}/>
            )}
          </div>

          {/* Identity */}
          {editing && isOwnProfile ? (
            <div className="pp-edit-form">
              <label className="pp-label">Username</label>
              <input className="pp-input" value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/>
              <label className="pp-label">Bio</label>
              <textarea className="pp-textarea" rows={3} placeholder="Tell the world about yourself…" value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/>
              <div className="pp-edit-btns">
                <button className="pp-btn-save" onClick={handleSave} disabled={saving}>
                  {saving?<span className="pp-spinner"/>:"Save changes"}
                </button>
                <button className="pp-btn-cancel" onClick={()=>setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="pp-identity">
              <h1 className="pp-username">{user?.username}</h1>
              <p className={`pp-bio ${!user?.bio?"pp-bio--empty":""}`}>{user?.bio||"No bio yet"}</p>
              
              {/* SECURED: Only show Edit Button if own profile */}
              {isOwnProfile && (
                <button className="pp-btn-edit" onClick={()=>setEditing(true)}>
                  Edit profile
                </button>
              )}
            </div>
          )}

          <div className="pp-divider"/>

          {/* Stats grid */}
          <div className="pp-stats-grid">
            <StatPill
              value={followersList.length}
              label="Followers"
              color="#2f81f7"
              delay={80}
              onClick={() => setModal("followers")}
              icon={<svg viewBox="0 0 16 16" fill="currentColor" width="14"><path d="M2 5.5a3.5 3.5 0 115.898 2.549 5.508 5.508 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.493 3.493 0 012 5.5z"/></svg>}
            />
            <StatPill
              value={followingList.length}
              label="Following"
              color="#bc8cff"
              delay={160}
              onClick={() => setModal("following")}
              icon={<svg viewBox="0 0 16 16" fill="currentColor" width="14"><path d="M2 5.5a3.5 3.5 0 115.898 2.549 5.508 5.508 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.493 3.493 0 012 5.5zM11 4a.75.75 0 100 1.5 1.5 1.5 0 01.666 2.844.75.75 0 00-.416.672v.352a.75.75 0 00.574.73c1.2.289 2.162 1.2 2.522 2.372a.75.75 0 101.434-.44 5.01 5.01 0 00-2.56-3.012A3 3 0 0011 4z"/></svg>}
            />
            <StatPill
              value={totalCommits}
              label="Commits"
              color="#3fb950"
              delay={240}
              icon={<svg viewBox="0 0 16 16" fill="currentColor" width="14"><path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zM8 6a2 2 0 100 4 2 2 0 000-4z"/></svg>}
            />
            <StatPill
              value={totalFiles}
              label="Files"
              color="#e3b341"
              delay={320}
              icon={<svg viewBox="0 0 16 16" fill="currentColor" width="14"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75z"/></svg>}
            />
          </div>

          <div className="pp-divider"/>

          {/* Meta */}
          <div className="pp-meta-list">
            <div className="pp-meta-row">
              <svg viewBox="0 0 16 16" fill="currentColor" width="13"><path d="M1.75 2A1.75 1.75 0 000 3.75v.736a.75.75 0 000 .027v7.737C0 13.216.784 14 1.75 14h12.5A1.75 1.75 0 0016 12.25v-8.5A1.75 1.75 0 0014.25 2H1.75zM14.5 4.07v-.32a.25.25 0 00-.25-.25H1.75a.25.25 0 00-.25.25v.32L8 7.88l6.5-3.81zm-13 1.74l5.63 3.3a1.5 1.5 0 001.54 0l5.63-3.3v6.44a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V5.81z"/></svg>
              <span>{user?.email}</span>
            </div>
            {memberSince && (
              <div className="pp-meta-row">
                <svg viewBox="0 0 16 16" fill="currentColor" width="13"><path d="M4.75 0a.75.75 0 01.75.75V2h5V.75a.75.75 0 011.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0113.25 16H2.75A1.75 1.75 0 011 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 014.75 0zm0 3.5h-2a.25.25 0 00-.25.25V6h10.5V3.75a.25.25 0 00-.25-.25h-2V4.25a.75.75 0 01-1.5 0V3.5h-5v.75a.75.75 0 01-1.5 0V3.5z"/></svg>
                <span>Since {memberSince}</span>
              </div>
            )}
            <div className="pp-meta-row">
              <svg viewBox="0 0 16 16" fill="currentColor" width="13"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z"/></svg>
              <span>{repos.length} repositor{repos.length !== 1 ? "ies" : "y"}</span>
            </div>
          </div>

          <div className="pp-divider"/>
          <LanguageBar repos={repos}/>

          {isOwnProfile && (
            <button className="pp-new-repo-btn" onClick={()=>navigate("/new")}>
              <svg viewBox="0 0 16 16" fill="currentColor" width="13"><path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/></svg>
              New repository
            </button>
          )}
        </aside>

        {/* ── MAIN ── */}
        <main className="pp-main">
          <ContributionHeatmap repos={repos}/>

          <div className="pp-repos-header">
            <div className="pp-tabs">
              {["all","public","private"].map(t=>(
                <button key={t} className={`pp-tab ${tab===t?"pp-tab--active":""}`} onClick={()=>setTab(t)}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                  <span className="pp-tab-badge">{tabCount(t)}</span>
                </button>
              ))}
            </div>
            <div className="pp-repos-controls">
              <div className="pp-repo-search">
                <svg viewBox="0 0 16 16" fill="currentColor" width="12"><path d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06L10.68 11.74z"/></svg>
                <input className="pp-search" placeholder="Find a repository…" value={filter} onChange={e=>setFilter(e.target.value)}/>
              </div>
              <select className="pp-sort" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                <option value="updated">Last updated</option>
                <option value="name">Name</option>
                <option value="commits">Most commits</option>
              </select>
            </div>
          </div>

          <div className="pp-repos">
            {reposLoading ? (
              [1,2,3].map(i=>(
                <div key={i} className="pp-skeleton" style={{animationDelay:`${i*100}ms`}}>
                  <div className="pp-skel-line pp-skel-50"/>
                  <div className="pp-skel-line pp-skel-80"/>
                  <div className="pp-skel-line pp-skel-35"/>
                </div>
              ))
            ) : visible.length===0 ? (
              <div className="pp-empty">
                <div className="pp-empty-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" opacity=".3"/>
                    <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".4"/>
                  </svg>
                </div>
                <p>{filter?"No repositories match":"No repositories yet"}</p>
                {!filter && isOwnProfile && <button className="pp-empty-cta" onClick={()=>navigate("/new")}>Create your first repository →</button>}
              </div>
            ) : (
              <div className="pp-repo-grid">
                {visible.map((r,i)=><RepoCard key={r.id||i} repo={r} idx={i} navigate={navigate}/>)}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}