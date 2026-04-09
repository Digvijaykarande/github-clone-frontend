import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "../css/navbar.css";

const NAV_LINKS = [
  {
    label: "Dashboard", path: "/",
    icon: <svg viewBox="0 0 16 16" fill="currentColor" width="13"><path d="M1.5 1.75V13.5h13V1.75a.25.25 0 00-.25-.25h-12.5a.25.25 0 00-.25.25zM0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v11.75a1 1 0 01-1 1H1a1 1 0 01-1-1V1.75z"/></svg>,
  },
  {
    label: "Repos", path: "/repos",
    icon: <svg viewBox="0 0 16 16" fill="currentColor" width="13"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z"/></svg>,
  },
  {
    label: "Explore", path: "/explore",
    icon: <svg viewBox="0 0 16 16" fill="currentColor" width="13"><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/></svg>,
  },
];

export default function Navbar() {
  const { logout, user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const dropRef   = useRef(null);
  const searchRef = useRef(null);

  const [open, setOpen]                 = useState(false);
  const [scrolled, setScrolled]         = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");  // Fix 1: controlled input

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchActive(true);
      }
      if (e.key === "Escape") {
        searchRef.current?.blur();
        setSearchActive(false);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };

  // Fix 2: search was a decorative input — now actually navigates on Enter.
  // Routes to /search?q=... which can show both repo and user results.
  const handleSearchSubmit = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      searchRef.current?.blur();
      setSearchActive(false);
    }
  };

  const avatarInner = user?.imageUrl
    ? <img src={user.imageUrl} alt="avatar" />
    : <span>{user?.username?.charAt(0).toUpperCase()}</span>;

  return (
    <nav className={`nb ${scrolled ? "nb--scrolled" : ""}`}>

      {/* Shimmer accent line at very top */}
      <div className="nb-shimmer-line" aria-hidden="true" />

      {/* ══ LEFT ══ */}
      <div className="nb-left">
        <button className="nb-logo" onClick={() => navigate("/")} aria-label="Home">
          <div className="nb-logo-mark">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
          </div>
          <span className="nb-logo-text">Dev<em>Hub</em></span>
          <span className="nb-logo-pill">beta</span>
        </button>

        <div className="nb-vsep" aria-hidden="true" />

        {/* Fix 3: search is now wired — controlled value + submit on Enter */}
        <div className={`nb-search ${searchActive ? "nb-search--on" : ""}`}>
          <svg className="nb-search-icon" viewBox="0 0 16 16" fill="none" width="13" height="13">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            ref={searchRef}
            className="nb-search-input"
            placeholder="Search repos, users…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchSubmit}
            onFocus={() => setSearchActive(true)}
            onBlur={() => setSearchActive(false)}
          />
          <div className="nb-search-kbd-group">
            {searchActive
              ? <kbd className="nb-kbd nb-kbd--esc">Esc</kbd>
              : <><kbd className="nb-kbd">⌘</kbd><kbd className="nb-kbd">K</kbd></>
            }
          </div>
        </div>
      </div>

      {/* ══ CENTER ══ */}
      <div className="nb-center">
        {NAV_LINKS.map(({ label, path, icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              className={`nb-link ${active ? "nb-link--active" : ""}`}
              onClick={() => navigate(path)}
            >
              <span className="nb-link-icon">{icon}</span>
              <span>{label}</span>
              {active && <span className="nb-link-pip" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/* ══ RIGHT ══ */}
      <div className="nb-right">

        {/* Notification */}
        <button className="nb-icon-btn" aria-label="Notifications">
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="nb-notif-pip" />
        </button>

        {/* New */}
        <button className="nb-new-btn" onClick={() => navigate("/new")}>
          <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
          </svg>
          New
        </button>

        {/* Avatar */}
        <div className="nb-av-wrap" ref={dropRef}>
          <button
            className={`nb-av ${open ? "nb-av--open" : ""}`}
            onClick={() => setOpen(o => !o)}
            aria-label="User menu"
            aria-expanded={open}
          >
            <div className="nb-av-inner">{avatarInner}</div>
            <span className="nb-av-ring" aria-hidden="true" />
            <span className="nb-av-online" aria-hidden="true" />
          </button>

          {open && (
            <div className="nb-dropdown">

              {/* User header */}
              <div className="nb-dd-head">
                <div className="nb-dd-av">
                  {user?.imageUrl
                    ? <img src={user.imageUrl} alt="" />
                    : <span>{user?.username?.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <div className="nb-dd-meta">
                  <p className="nb-dd-name">{user?.username}</p>
                  <p className="nb-dd-email">{user?.email}</p>
                </div>
              </div>

              {/* Status */}
              <div className="nb-dd-status">
                <span className="nb-dd-status-dot" />
                <span>Active now</span>
              </div>

              <div className="nb-dd-sep" />

              {[
                { label:"Your profile",   path:"/profile",  d:"M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.005 6.005 0 00-3.432-5.142z" },
                { label:"Dashboard",      path:"/",         d:"M1.5 1.75V13.5h13V1.75a.25.25 0 00-.25-.25h-12.5a.25.25 0 00-.25.25zM0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v11.75a1 1 0 01-1 1H1a1 1 0 01-1-1V1.75z" },
                { label:"New repository", path:"/new",      d:"M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z" },
                { label:"Explore",        path:"/explore",  d:"M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" },
              ].map(({ label, path, d }) => (
                <button key={path} className="nb-dd-item" onClick={() => { navigate(path); setOpen(false); }}>
                  <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13" className="nb-dd-item-icon"><path d={d}/></svg>
                  {label}
                  <svg className="nb-dd-chevron" viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
                    <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
                  </svg>
                </button>
              ))}

              <div className="nb-dd-sep" />

              <button className="nb-dd-item nb-dd-item--danger" onClick={handleLogout}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13" className="nb-dd-item-icon">
                  <path d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 010 1.5h-2.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 010 1.5h-2.5A1.75 1.75 0 012 13.25V2.75zm9.344 3.844a.75.75 0 010 1.06L9.97 9.03a.75.75 0 01-1.06-1.06l.97-.97H6.75a.75.75 0 010-1.5h3.13l-.97-.97a.75.75 0 011.06-1.06l1.374 1.374z"/>
                </svg>
                Sign out
              </button>

            </div>
          )}
        </div>
      </div>
    </nav>
  );
}