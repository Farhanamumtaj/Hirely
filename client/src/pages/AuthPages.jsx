import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login, googleLogin, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(location.state?.message || "");
  const [busy, setBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
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
    setVerificationMessage("");
    setBusy(true);

    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      const code = err.response?.data?.error?.code;
      const message = err.response?.data?.error?.message;

      setError(message || "Unable to sign in. Please try again.");

      if (code === "EMAIL_NOT_VERIFIED") {
        setVerificationMessage(
          "Your email address still needs to be verified.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setError("");
    setVerificationMessage("");
    setVerificationBusy(true);

    try {
      await resendVerification(form.email);
      navigate("/verify-email", { state: { email: form.email.trim() } });
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          "Unable to send a verification code.",
      );
    } finally {
      setVerificationBusy(false);
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

        {verificationMessage && (
          <div className="alert alert-info py-2" role="status">
            {verificationMessage}
            <div className="mt-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                disabled={verificationBusy || !form.email.trim()}
                onClick={resendCode}
              >
                {verificationBusy ? "Sending code…" : "Send verification code"}
              </button>
            </div>
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
      const result = await register(form);
      navigate("/verify-email", {
        state: { email: result.email || form.email.trim() },
      });
    } catch (err) {
      const code = err.response?.data?.error?.code;
      const message = err.response?.data?.error?.message;

      if (code === "EMAIL_ALREADY_REGISTERED") {
        navigate("/login", {
          state: {
            message: "This email is already registered. Please log in instead.",
          },
        });
        return;
      }

      if (code === "EMAIL_NOT_VERIFIED") {
        navigate("/verify-email", { state: { email: form.email.trim() } });
        return;
      }

      setError(message || "Unable to create your account. Please try again.");
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
    </AuthShell>
  );
}

export function VerifyEmail() {
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(
      () => setCooldown((value) => value - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      await verifyEmail(email.trim(), code);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.error?.message || "Unable to verify your email.",
      );
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    setMessage("");
    setResending(true);
    try {
      await resendVerification(email.trim());
      setMessage("A new verification code has been sent.");
      setCooldown(60);
    } catch (err) {
      setError(
        err.response?.data?.error?.message || "Unable to resend the code.",
      );
      if (err.response?.data?.error?.code === "RESEND_COOLDOWN")
        setCooldown(60);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      eyebrow="CHECK YOUR INBOX"
      title={
        <>
          One last
          <br />
          <em>little step.</em>
        </>
      }
      subtitle="Enter the six-digit code we emailed you to verify your Hirely account."
    >
      <form onSubmit={submit}>
        <Field
          label="Email address"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <Field
          label="Six-digit verification code"
          value={code}
          onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
          autoComplete="one-time-code"
          hint="The code expires after 10 minutes."
        />
        {error && (
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="alert alert-success py-2" role="status">
            {message}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-editorial-primary w-100 py-3 mt-2"
          disabled={busy || !email.trim() || code.length !== 6}
        >
          {busy ? "Verifying…" : "Verify email"}
          <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary w-100 py-3 mt-3"
          disabled={resending || cooldown > 0 || !email.trim()}
          onClick={resend}
        >
          {resending
            ? "Sending…"
            : cooldown > 0
              ? `Resend code in ${cooldown}s`
              : "Resend verification code"}
        </button>
      </form>
      <p className="auth-switch">
        Already verified? <Link to="/login">Sign in</Link>
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
        inputMode={
          label === "Six-digit verification code" ? "numeric" : undefined
        }
        maxLength={label === "Six-digit verification code" ? 6 : undefined}
      />
      {hint && <div className="form-text auth-field-hint">{hint}</div>}
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
