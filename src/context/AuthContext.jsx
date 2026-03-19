import { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUser } from "../api/userApi"; // adjust path

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null); // ✅ add user state
  const [loading, setLoading] = useState(true);

  // ✅ Fetch user whenever token changes
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      fetchUser(); // fetch fresh user from /api/users/me
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData); // ✅ this will have imageUrl
    } catch (err) {
      console.error("Failed to fetch user:", err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (token) => {
    localStorage.setItem("token", token);
    setToken(token);
    await fetchUser(); // ✅ fetch user right after login
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null); // ✅ clear user on logout
  };

  return (
    // ✅ expose user and refreshUser to all components
    <AuthContext.Provider value={{ token, user, login, logout, loading, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);