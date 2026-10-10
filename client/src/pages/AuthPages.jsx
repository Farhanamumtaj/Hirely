import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return undefined;
    let cancelled = false;
    const renderButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current)
        return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          setError("");
          setBusy(true);
          try {
            await googleLogin(credential);
            navigate("/dashboard");
          } catch (err) {
            setError(
              err.response?.data?.error?.message ||
                "Google sign-in failed. Please try again.",
            );
          } finally {
            setBusy(false);
          }
        },
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: Math.max(
          240,
          Math.min(380, googleButtonRef.current.clientWidth || 320),
        ),
      });
      setGoogleReady(true);
    };
    if (window.google?.accounts?.id) {
      renderButton();
      return () => {
        cancelled = true;
      };
    }
    const existing = document.querySelector("script[data-google-identity]");
    const script = existing || document.createElement("script");
    if (!existing) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderButton);
    return () => {
      cancelled = true;
      script.removeEventListener("load", renderButton);
    };
  }, [googleClientId, googleLogin, navigate]);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell
      eyebrow="WELCOME BACK"
      title={
        <>
          Good to see
          <br />
          <em>you again.</em>
        </>
      }
      subtitle="Pick up where you left off. Your next chapter is still yours to write."
    >
      <form onSubmit={submit}>
        <Field
          label="Email address"
          type="email"
          value={form.email}
          onChange={(value) => setForm({ ...form, email: value })}
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={(value) => setForm({ ...form, password: value })}
          autoComplete="current-password"
        />
        {error && (
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        )}
        <button
          className="btn btn-editorial-primary w-100 py-3 mt-2"
          disabled={busy}
        >
          {busy ? "Signing in…" : "Sign in"}{" "}
          <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
        </button>
        {googleClientId ? (
          <div className="google-signin-slot mt-3">
            <div
              ref={googleButtonRef}
              className="google-signin-button"
              aria-label="Continue with Google"
            />
            {!googleReady && (
              <span className="small text-secondary">
                Loading Google sign-in…
              </span>
            )}
          </div>
        ) : (
          <div className="google-config-note mt-3">
            <i className="bi bi-info-circle me-2" aria-hidden="true" />
            Google sign-in is optional. Add VITE_GOOGLE_CLIENT_ID to the client
            environment to enable it.
          </div>
        )}
      </form>
      <p className="auth-switch">
        New to Hirely?{" "}
        <Link to="/register">
          Create an account{" "}
          <i className="bi bi-arrow-up-right" aria-hidden="true" />
        </Link>
      </p>
    </AuthShell>
  );
}

export function Register() {
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return undefined;

    let cancelled = false;

    const renderButton = () => {
      if (
        cancelled ||
        !window.google?.accounts?.id ||
        !googleButtonRef.current
      ) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          setError("");
          setBusy(true);

          try {
            await googleLogin(credential);
            navigate("/dashboard");
          } catch (err) {
            setError(
              err.response?.data?.error?.message ||
                "Google sign-in failed. Please try again.",
            );
          } finally {
            setBusy(false);
          }
        },
      });

      googleButtonRef.current.innerHTML = "";

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "signup_with",
        width: Math.max(
          240,
          Math.min(380, googleButtonRef.current.clientWidth || 320),
        ),
      });

      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.querySelector("script[data-google-identity]");
    const script = existing || document.createElement("script");

    if (!existing) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = "true";
      document.head.appendChild(script);
    }

    script.addEventListener("load", renderButton);

    return () => {
      cancelled = true;
      script.removeEventListener("load", renderButton);
    };
  }, [googleClientId, googleLogin, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          "Unable to create your account. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="A FRESH START"
      title={
        <>
          Make room for
          <br />
          <em>what’s next.</em>
        </>
      }
      subtitle="Create your account and start shaping a resume that tells your story clearly."
    >
      <form onSubmit={submit}>
        <Field
          label="Full name"
          value={form.fullName}
          onChange={(value) => setForm({ ...form, fullName: value })}
          autoComplete="name"
        />

        <Field
          label="Email address"
          type="email"
          value={form.email}
          onChange={(value) => setForm({ ...form, email: value })}
          autoComplete="email"
        />

        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={(value) => setForm({ ...form, password: value })}
          autoComplete="new-password"
          hint="At least 10 characters, including uppercase, lowercase, number, and symbol."
        />

        <Field
          label="Confirm password"
          type="password"
          value={form.confirmPassword}
          onChange={(value) => setForm({ ...form, confirmPassword: value })}
          autoComplete="new-password"
        />

        {error && (
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-editorial-primary w-100 py-3 mt-2"
          disabled={busy}
        >
          {busy ? "Creating account…" : "Create account"}
          <i className="bi bi-arrow-up-right ms-2" aria-hidden="true" />
        </button>

        {googleClientId ? (
          <div className="google-signin-slot mt-3">
            <div
              ref={googleButtonRef}
              className="google-signin-button"
              aria-label="Sign up with Google"
            />
            {!googleReady && (
              <span className="small text-secondary">
                Loading Google sign-in…
              </span>
            )}
          </div>
        ) : (
          <div className="google-config-note mt-3">
            <i className="bi bi-info-circle me-2" aria-hidden="true" />
            Google sign-up is optional. Add VITE_GOOGLE_CLIENT_ID to the client
            environment to enable it.
          </div>
        )}
      </form>

      <p className="auth-switch">
        Already have an account?{" "}
        <Link to="/login">
          Sign in <i className="bi bi-arrow-up-right" aria-hidden="true" />
        </Link>
      </p>

      <p className="auth-privacy">
        <i className="bi bi-lock me-2" aria-hidden="true" />
        Your resume stays yours. Review every suggestion before using it.
      </p>
    </AuthShell>
  );
}

function Field({ label, type = "text", value, onChange, hint, autoComplete }) {
  const id = `auth-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="mb-3">
      <label className="form-label editorial-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="form-control form-control-lg editorial-input"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        autoComplete={autoComplete}
      />
      {hint && <div className="form-text">{hint}</div>}
    </div>
  );
}

function AuthShell({ eyebrow, title, subtitle, children }) {
  return (
    <section className="auth-editorial-wrap">
      <div className="auth-editorial container">
        <aside className="auth-aside">
          <div className="eyebrow editorial-eyebrow">
            <span className="eyebrow-line" /> {eyebrow}
          </div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <div className="auth-aside-note">
            <span className="quote-rule" />{" "}
            <span>Thoughtful tools for your next chapter.</span>
          </div>
          <div className="auth-decoration" aria-hidden="true">
            <span>h.</span>
          </div>
        </aside>
        <div className="auth-form-panel">
          <div className="auth-form-kicker">YOUR WORKSPACE</div>
          {children}
          <p className="auth-privacy">
            <i className="bi bi-lock me-2" aria-hidden="true" />
            Your resume stays yours. Review every suggestion before using it.
          </p>
        </div>
      </div>
    </section>
  );
}
