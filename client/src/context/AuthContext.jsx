import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const restore = useCallback(async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restore();

    const expired = () => setUser(null);
    window.addEventListener("hirely:session-expired", expired);

    return () => {
      window.removeEventListener("hirely:session-expired", expired);
    };
  }, [restore]);

  // Create an account without sending a verification email.
  const register = useCallback(async (data) => {
    const response = await api.post("/auth/register", data);
    return response.data.data;
  }, []);

  const signIn = useCallback(async (path, body) => {
    const response = await api.post(path, body);
    const signedInUser = response.data.data.user;
    setUser(signedInUser);
    return signedInUser;
  }, []);

  const login = useCallback(
    (data) => signIn("/auth/login", data),
    [signIn],
  );

  const googleLogin = useCallback(
    (credential) => signIn("/auth/google", { credential }),
    [signIn],
  );

  const updateProfile = useCallback(async (data) => {
    const response = await api.patch("/auth/profile", data);
    const updatedUser = response.data.data.user;
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      register,
      login,
      googleLogin,
      updateProfile,
      signOut,
      refreshUser: restore,
    }),
    [
      user,
      loading,
      register,
      login,
      googleLogin,
      updateProfile,
      signOut,
      restore,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
