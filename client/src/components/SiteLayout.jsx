import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function SiteLayout() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const active = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch {
      navigate("/");
    }
  };

  return (
    <div className="site-shell">
      <nav
        className="navbar navbar-expand-lg sticky-top app-navbar border-bottom"
        aria-label="Main navigation"
      >
        <div className="container nav-inner">
          <Link
            className="navbar-brand brand-lockup"
            to="/"
            aria-label="hirely home"
          >
            <span className="brand-mark">h.</span>
            <span>Hirely</span>
          </Link>
          <div className="nav-actions">
            {user && (
              <div className="desktop-nav-links">
                <Link
                  className={`nav-link-editorial ${active("/dashboard") ? "active" : ""}`}
                  to="/dashboard"
                >
                  My workspace
                </Link>
                <Link
                  className={`nav-link-editorial ${active("/resumes") ? "active" : ""}`}
                  to="/dashboard"
                >
                  Resumes
                </Link>
                <Link
                  className={`nav-link-editorial ${active("/settings") ? "active" : ""}`}
                  to="/settings"
                >
                  Profile
                </Link>
              </div>
            )}
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              <i
                className={`bi ${theme === "dark" ? "bi-sun" : "bi-moon-stars"}`}
                aria-hidden="true"
              />
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            {user ? (
              <>
                <Link
                  className="nav-user-chip nav-profile-link"
                  to="/settings"
                  title="Profile settings"
                >
                  <span className="avatar-dot">
                    {(user.fullName || user.email || "U")
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <span className="nav-user-name">
                    {(user.fullName || "Your account").split(" ")[0]}
                  </span>
                </Link>
                <button
                  className="btn btn-outline-secondary signout-button"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link className="nav-login" to="/login">
                  Log in
                </Link>
                <Link className="btn btn-editorial-primary" to="/register">
                  Get started{" "}
                  <i className="bi bi-arrow-up-right ms-1" aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
      <footer className="app-footer border-top">
        <div className="container footer-inner">
          <Link className="footer-brand" to="/">
            <span className="brand-mark">h.</span>Hirely
          </Link>
          <span>Thoughtful tools for your next chapter.</span>
          <span className="footer-note">
            Your experience. Clearly presented.
          </span>
        </div>
      </footer>
    </div>
  );
}
