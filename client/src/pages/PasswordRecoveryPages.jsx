import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      const response = await api.post("/auth/forgot-password", {
        email: email.trim(),
      });

      setMessage(
        response.data?.message ||
          "If an account with that email supports password recovery, a reset link will be sent shortly.",
      );
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Unable to process your request. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthRecoveryShell
      eyebrow="ACCOUNT RECOVERY"
      title={
        <>
          A way back to <em>your next chapter.</em>
        </>
      }
      subtitle="Forgot your password? Request a reset link to regain access to your Hirely workspace."
    >
      <form onSubmit={submit}>
        <div className="mb-3">
          <label
            className="form-label editorial-label"
            htmlFor="recovery-email"
          >
            Email address
          </label>

          <input
            id="recovery-email"
            className="form-control form-control-lg editorial-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            maxLength={254}
            placeholder="you@example.com"
            required
          />
        </div>

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
          disabled={busy}
        >
          {busy ? "Requesting link…" : "Request reset link"}
          <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
        </button>
      </form>

      <p className="auth-switch">
        Remembered your password? <Link to="/login">Back to sign in</Link>
      </p>
    </AuthRecoveryShell>
  );
}

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError(
        "This reset link is missing its token. Please request a new one.",
      );
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setError("Your password must contain between 8 and 128 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const response = await api.post("/auth/reset-password", {
        token,
        password,
      });

      setSuccess(
        response.data?.message ||
          "Your password has been reset successfully. Please sign in again.",
      );

      setPassword("");
      setConfirmPassword("");

      window.setTimeout(() => {
        navigate("/login", {
          state: {
            message: "Password reset successfully. Please sign in.",
            success: true,
          },
        });
      }, 1800);
    } catch (err) {
      const status = err.response?.status;
      const code = err.response?.data?.error?.code;
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message;

      if (
        status === 400 ||
        status === 401 ||
        code === "INVALID_RESET_TOKEN" ||
        code === "PASSWORD_RESET_TOKEN_EXPIRED"
      ) {
        setError(
          "This reset link has expired or has already been used. Please request a new one.",
        );
      } else {
        setError(
          message || "Unable to reset your password. Please try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthRecoveryShell
      eyebrow="CHOOSE A NEW PASSWORD"
      title={
        <>
          Start fresh, <em>securely.</em>
        </>
      }
      subtitle="Choose a new password for your Hirely account. You can sign in again once the reset is complete."
    >
      {!token ? (
        <>
          <div className="alert alert-danger" role="alert">
            This reset link is incomplete because its token is missing.
          </div>

          <Link
            to="/forgot-password"
            className="btn btn-editorial-primary w-100 py-3"
          >
            Request a new reset link
          </Link>
        </>
      ) : (
        <form onSubmit={submit}>
          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />

          <PasswordField
            id="confirm-new-password"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />

          <p className="form-text auth-field-hint">
            Use between 8 and 128 characters.
          </p>

          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success py-2" role="status">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-editorial-primary w-100 py-3 mt-2"
            disabled={busy}
          >
            {busy ? "Updating password…" : "Reset password"}
            <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
          </button>
        </form>
      )}

      <p className="auth-switch">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthRecoveryShell>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mb-3">
      <label className="form-label editorial-label" htmlFor={id}>
        {label}
      </label>

      <div className="input-group">
        <input
          id={id}
          className="form-control form-control-lg editorial-input"
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          minLength={8}
          maxLength={128}
          required
        />

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          <i
            className={`bi ${visible ? "bi-eye-slash" : "bi-eye"}`}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}

function AuthRecoveryShell({ eyebrow, title, subtitle, children }) {
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
            <span className="quote-rule" />
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
            Your account security matters. Reset links expire and can only be
            used once.
          </p>
        </div>
      </div>
    </section>
  );
}
