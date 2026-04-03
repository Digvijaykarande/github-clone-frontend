import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/authApi";
import "../css/auth.css";

const PERKS = [
  { icon: "🚀", label: "Create repositories",   sub: "Host unlimited projects"    },
  { icon: "👥", label: "Collaborate with devs", sub: "Follow and discover talent" },
  { icon: "🔒", label: "Secure by default",     sub: "JWT + Spring Boot backend"  },
  { icon: "📊", label: "Track your activity",   sub: "Commits, files, history"    },
];

function PasswordStrength({ pw }) {
  const checks = [
    { label:"8+ chars",  ok: pw.length >= 8   },
    { label:"Uppercase", ok: /[A-Z]/.test(pw) },
    { label:"Number",    ok: /\d/.test(pw)    },
  ];
  const score  = checks.filter(c => c.ok).length;
  const colors = ["","#f85149","#e3b341","#3fb950"];
  const labels = ["","Weak","Fair","Strong"];
  if (!pw) return null;
  return (
    <div className="auth-pw-strength">
      <div className="auth-pw-bars">
        {[1,2,3].map(i => (
          <div key={i} className="auth-pw-bar" style={{ background: i <= score ? colors[score] : "#1e2433" }} />
        ))}
      </div>
      <span className="auth-pw-label" style={{ color: colors[score] }}>{labels[score]}</span>
      <div className="auth-pw-checks">
        {checks.map((c, i) => (
          <span key={i} className={`auth-pw-check ${c.ok ? "auth-pw-check--ok" : ""}`}>
            {c.ok ? "✓" : "·"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm]       = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState(null);

  useEffect(() => { setTimeout(() => setMounted(true), 40); }, []);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) {
      setError("Please fill in all fields"); return;
    }
    setLoading(true);
    setError("");
    try {
      await registerUser(form);
      navigate("/login");
    } catch (err) {
      setError(err?.message || "Registration failed — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-page auth-page--reg ${mounted ? "auth-page--in" : ""}`}>

      {/* ── SIMPLE LOADER OVERLAY ── */}
      {loading && (
        <div className="auth-loader-overlay">
          <div className="auth-loader-card">
            <div className="auth-loader-ring" />
            <p className="auth-loader-text">Creating your account…</p>
          </div>
        </div>
      )}

      {/* ── LEFT ── */}
      <div className="auth-left">
        <div className="auth-left-bg">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
          <div className="auth-orb auth-orb-3" />
          <div className="auth-grid">
            {Array.from({ length: 80 }).map((_, i) => (
              <span key={i} className="auth-cell" style={{ animationDelay:`${(i*71)%4000}ms` }} />
            ))}
          </div>
        </div>

        <div className="auth-left-content">
          <div className="auth-brand">
            <div className="auth-brand-mark">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
            </div>
            <span className="auth-brand-name">Dev<em>Hub</em></span>
          </div>

          <div className="auth-hero">
            <h1 className="auth-hero-title">Join the<br/>community 🌍</h1>
            <p className="auth-hero-sub">Build, share and collaborate on code. Free forever.</p>
          </div>

          <div className="auth-perks">
            {PERKS.map((p, i) => (
              <div key={i} className="auth-perk" style={{ animationDelay:`${0.2 + i * 0.1}s` }}>
                <div className="auth-perk-icon">{p.icon}</div>
                <div>
                  <p className="auth-perk-label">{p.label}</p>
                  <p className="auth-perk-sub">{p.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-stats">
            {[["∞","Repos"],["100%","Free"],["24/7","Access"]].map(([v, l]) => (
              <div key={l} className="auth-stat">
                <span className="auth-stat-val">{v}</span>
                <span className="auth-stat-lbl">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Create account</h2>
            <p className="auth-form-sub">
              Already have one? <Link to="/login" className="auth-link">Sign in</Link>
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>

            {/* Username */}
            <div className={`auth-field ${focused === "username" ? "auth-field--focus" : ""}`}>
              <label className="auth-label">Username</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 16 16" fill="currentColor" width="14">
                  <path d="M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.005 6.005 0 00-3.432-5.142z"/>
                </svg>
                <input
                  type="text" name="username" placeholder="digvijay"
                  className="auth-input" value={form.username} autoComplete="username"
                  onChange={e => set("username", e.target.value)}
                  onFocus={() => setFocused("username")} onBlur={() => setFocused(null)}
                />
                {form.username.length >= 3 && (
                  <span className="auth-field-ok">
                    <svg viewBox="0 0 16 16" fill="currentColor" width="12">
                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                    </svg>
                  </span>
                )}
              </div>
            </div>

            {/* Email */}
            <div className={`auth-field ${focused === "email" ? "auth-field--focus" : ""}`}>
              <label className="auth-label">Email address</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 16 16" fill="currentColor" width="14">
                  <path d="M1.75 2A1.75 1.75 0 000 3.75v.736a.75.75 0 000 .027v7.737C0 13.216.784 14 1.75 14h12.5A1.75 1.75 0 0016 12.25v-8.5A1.75 1.75 0 0014.25 2H1.75zM14.5 4.07v-.32a.25.25 0 00-.25-.25H1.75a.25.25 0 00-.25.25v.32L8 7.88l6.5-3.81zm-13 1.74l5.63 3.3a1.5 1.5 0 001.54 0l5.63-3.3v6.44a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V5.81z"/>
                </svg>
                <input
                  type="email" name="email" placeholder="you@example.com"
                  className="auth-input" value={form.email} autoComplete="email"
                  onChange={e => set("email", e.target.value)}
                  onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                />
              </div>
            </div>

            {/* Password */}
            <div className={`auth-field ${focused === "password" ? "auth-field--focus" : ""}`}>
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 16 16" fill="currentColor" width="14">
                  <path d="M4 4a4 4 0 018 0v2h.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0112.25 15h-8.5A1.75 1.75 0 012 13.25v-5.5C2 6.784 2.784 6 3.75 6H4V4zm8 2V4a4 4 0 00-8 0v2h8zm-4 4.5a1 1 0 110 2 1 1 0 010-2z" clipRule="evenodd" fillRule="evenodd"/>
                </svg>
                <input
                  type={showPw ? "text" : "password"} name="password" placeholder="Min 8 characters"
                  className="auth-input auth-input--pw" value={form.password} autoComplete="new-password"
                  onChange={e => set("password", e.target.value)}
                  onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(s => !s)} tabIndex={-1}>
                  {showPw
                    ? <svg viewBox="0 0 16 16" fill="currentColor" width="14"><path d="M.143 2.31a.75.75 0 011.047-.167l14.5 10.5a.75.75 0 11-.88 1.214l-2.248-1.628C11.346 12.67 9.792 13 8 13c-3.205 0-5.755-1.538-7.37-3.17A10.69 10.69 0 01.336 8.5a10.69 10.69 0 01.295-.83C.663 7.57.143 2.31.143 2.31z"/></svg>
                    : <svg viewBox="0 0 16 16" fill="currentColor" width="14"><path d="M8 2c4.07 0 7.25 2.79 7.25 6S12.07 14 8 14c-4.07 0-7.25-2.79-7.25-6S3.93 2 8 2zm0 1.5C4.82 3.5 2.25 5.64 2.25 8S4.82 12.5 8 12.5c3.18 0 5.75-2.14 5.75-4.5S11.18 3.5 8 3.5zM8 6a2 2 0 110 4 2 2 0 010-4z"/></svg>
                  }
                </button>
              </div>
              <PasswordStrength pw={form.password} />
            </div>

            {error && (
              <div className="auth-error">
                <svg viewBox="0 0 16 16" fill="currentColor" width="13">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="auth-submit auth-submit--green" disabled={loading}>
              {loading
                ? <><span className="auth-btn-spinner" /> Creating account…</>
                : <>Create account <svg viewBox="0 0 16 16" fill="currentColor" width="13"><path d="M8.22 2.97a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06l2.97-2.97H3.75a.75.75 0 010-1.5h7.44L8.22 4.03a.75.75 0 010-1.06z"/></svg></>
              }
            </button>

            <p className="auth-terms">
              By signing up, you agree to our <span className="auth-link">Terms</span> and <span className="auth-link">Privacy Policy</span>.
            </p>

          </form>
        </div>
      </div>
    </div>
  );
}