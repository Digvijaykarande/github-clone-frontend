import { Suspense, lazy } from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoutes";
import "./App.css";

// ── Lazy-load pages (code splitting — faster initial load) ─────
const Dashboard      = lazy(() => import("./pages/Dashboard"));
const ProfilePage    = lazy(() => import("./pages/ProfilePage"));
const CreateRepoPage = lazy(() => import("./pages/CreateRepoPage"));
const ViewRepoPage   = lazy(() => import("./pages/ViewRepoPage"));
const ExplorePage    = lazy(() => import("./pages/ExplorePage"));
const Login          = lazy(() => import("./pages/Login"));
const Register       = lazy(() => import("./pages/Register"));

// ── Loading fallback ───────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-base, #080a0f)",
    }}>
      <div style={{
        width: 32, height: 32,
        border: "2px solid #1e2433",
        borderTopColor: "#388bfd",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }} />
    </div>
  );
}

// ── Layout with Navbar (used by all protected pages) ──────────
function AppLayout() {
  return (
    <>
      <Navbar />
      <main>
        {/* Outlet renders whichever child route matched */}
        <Outlet />
      </main>
    </>
  );
}

// ── Auth layout (no Navbar — login / register) ─────────────────
function AuthLayout() {
  return <Outlet />;
}

// ── App ────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── Protected routes (have Navbar) ── */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/profile"       element={<ProfilePage />} />
            <Route path="/new"           element={<CreateRepoPage />} />
            <Route path="/repos/:repoId" element={<ViewRepoPage />} />
            <Route path="/explore"       element={<ExplorePage />} />
          </Route>

          {/* ── Public routes (no Navbar) ── */}
          <Route element={<AuthLayout />}>
            <Route path="/login"        element={<Login />} />
            <Route path="/registration" element={<Register />} />
          </Route>

          {/* ── 404 fallback ── */}
          <Route path="*" element={
            <div style={{
              minHeight:"100vh", display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center",
              background:"var(--bg-base,#080a0f)", color:"#e2eaf5",
              gap:16, fontFamily:"'Syne',sans-serif"
            }}>
              <span style={{ fontSize:64, lineHeight:1 }}>404</span>
              <p style={{ color:"#7d8fa8", margin:0 }}>Page not found</p>
              <a href="/" style={{ color:"#388bfd", fontSize:14 }}>← Back to dashboard</a>
            </div>
          } />

        </Routes>
      </Suspense>
    </AuthProvider>
  );
}