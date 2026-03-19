import { useState, useRef, useCallback } from "react";
import axios from "axios";
import API from "../api/axios";

// Raw axios — bypasses auth interceptor so 401/403/404 never triggers logout
const rawAxios = axios.create({ baseURL: API.defaults.baseURL });

const WARM_MESSAGES = [
  { icon: "⚡", text: "Waking up the server…",  sub: "Free tier servers sleep when idle" },
  { icon: "🔧", text: "Initializing services…", sub: "Almost there, just a few seconds"  },
  { icon: "🚀", text: "Starting up DevHub…",    sub: "Your workspace is being prepared"  },
  { icon: "🌐", text: "Connecting to backend…", sub: "Establishing a secure connection"  },
  { icon: "✅", text: "Nearly ready!",           sub: "Just finishing the last steps"     },
];

// ─────────────────────────────────────────────────────────────
// useServerWarmup
//
// Returns { warming, startWarmup(callback) }
//
// Usage:
//   const { warming, startWarmup } = useServerWarmup();
//
//   // In your submit handler:
//   startWarmup(async () => {
//     const data = await loginUser(form);   // ← your actual API call
//     login(data.token);
//     navigate("/");
//   });
//
// How it works:
//   1. Calls the callback immediately (optimistic — server might be warm)
//   2. If the callback throws a network/timeout error → shows warmup overlay
//      and retries the callback every 3s until it succeeds
//   3. If the callback throws a non-network error (e.g. wrong password) →
//      re-throws it immediately so the form can show the error message
// ─────────────────────────────────────────────────────────────
export function useServerWarmup() {
  const [warming, setWarming]   = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const [msgIdx,  setMsgIdx]    = useState(0);
  const cancelledRef            = useRef(false);
  const timerRef                = useRef(null);
  const msgTimerRef             = useRef(null);
  const retryRef                = useRef(null);

  const cleanup = () => {
    cancelledRef.current = true;
    clearInterval(timerRef.current);
    clearInterval(msgTimerRef.current);
    clearTimeout(retryRef.current);
  };

  // Returns true if the error looks like a cold-start / network issue
  const isColdStart = (err) => {
    if (!err) return false;
    const status = err?.response?.status;
    // No response at all = server is sleeping (ECONNREFUSED / timeout)
    if (!status) return true;
    // 502 / 503 / 504 = server starting up behind a proxy
    if ([502, 503, 504].includes(status)) return true;
    return false;
  };

  const startWarmup = useCallback(async (callback) => {
    cancelledRef.current = false;
    let start;

    const showLoader = () => {
      setWarming(true);
      setElapsed(0);
      setMsgIdx(0);
      start = Date.now();

      timerRef.current = setInterval(() => {
        if (!cancelledRef.current)
          setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);

      msgTimerRef.current = setInterval(() => {
        if (!cancelledRef.current)
          setMsgIdx(i => (i + 1) % WARM_MESSAGES.length);
      }, 4000);
    };

    const hideLoader = () => {
      cleanup();
      setWarming(false);
    };

    // ── First attempt ─────────────────────────────────────────
    try {
      await callback();
      // Success on first try — server was already warm, no loader needed
      return;
    } catch (err) {
      if (!isColdStart(err)) {
        // Real error (wrong password, validation, etc.) — bubble up immediately
        throw err;
      }
    }

    // ── Server appears cold — show loader and retry ───────────
    showLoader();

    await new Promise((resolve, reject) => {
      const attempt = async () => {
        if (cancelledRef.current) return;
        try {
          await callback();
          hideLoader();
          resolve();
        } catch (err) {
          if (cancelledRef.current) return;
          if (!isColdStart(err)) {
            // Real error came back — server is awake but credentials are wrong etc.
            hideLoader();
            reject(err);
          } else {
            // Still cold — retry in 3s
            retryRef.current = setTimeout(attempt, 3000);
          }
        }
      };
      retryRef.current = setTimeout(attempt, 3000);
    });
  }, []);

  // Call this on component unmount to avoid state leaks
  const cancelWarmup = useCallback(() => { cleanup(); setWarming(false); }, []);

  return {
    warming,
    elapsed,
    msg: WARM_MESSAGES[msgIdx],
    startWarmup,
    cancelWarmup,
  };
}

// ── Loader overlay UI ─────────────────────────────────────────
export function ServerWarmLoader({ elapsed, msg }) {
  return (
    <div className="swl-overlay">
      <div className="swl-card">
        <div className="swl-rings">
          <div className="swl-ring swl-ring-1" />
          <div className="swl-ring swl-ring-2" />
          <div className="swl-ring swl-ring-3" />
          <div className="swl-icon-wrap">
            <span className="swl-icon">{msg.icon}</span>
          </div>
        </div>
        <div className="swl-body">
          <h3 className="swl-title">{msg.text}</h3>
          <p className="swl-sub">{msg.sub}</p>
        </div>
        <div className="swl-bar-track">
          <div className="swl-bar-fill" />
        </div>
        <div className="swl-footer">
          <span className="swl-elapsed">
            <svg viewBox="0 0 16 16" fill="currentColor" width="11">
              <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zm7-3.25v3.5a.75.75 0 01-.75.75H4.5a.75.75 0 010-1.5h2.5V4.75a.75.75 0 011.5 0z"/>
            </svg>
            {elapsed}s elapsed
          </span>
          <span className="swl-tip">Free tier servers sleep after inactivity</span>
        </div>
      </div>
    </div>
  );
}