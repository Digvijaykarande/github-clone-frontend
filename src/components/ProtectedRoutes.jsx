import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
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

  if (!token) return <Navigate to="/login" replace />;

  return children;
}