import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProfileSettings() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await updateProfile({ fullName });
      setNotice("Your profile has been updated.");
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          "Could not update your profile. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="container profile-page">
      <Link to="/dashboard" className="text-link">
        <i className="bi bi-arrow-left me-2" aria-hidden="true" />
        Back to workspace
      </Link>
      <div className="profile-heading">
        <div className="eyebrow editorial-eyebrow">
          <span className="eyebrow-line" /> ACCOUNT DETAILS
        </div>
        <h1>
          Your profile,
          <br />
          <em>your details.</em>
        </h1>
        <p>
          Keep the basics up to date. Your email is used to sign in and can’t be
          changed here.
        </p>
      </div>
      <div className="profile-card">
        <div className="profile-avatar">
          {(user?.fullName || user?.email || "U")
            .trim()
            .charAt(0)
            .toUpperCase()}
        </div>
        <form onSubmit={submit}>
          <div className="mb-4">
            <label
              className="form-label editorial-label"
              htmlFor="profile-name"
            >
              Full name
            </label>
            <input
              id="profile-name"
              className="form-control form-control-lg editorial-input"
              required
              minLength={1}
              maxLength={120}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="mb-4">
            <label
              className="form-label editorial-label"
              htmlFor="profile-email"
            >
              Email address
            </label>
            <input
              id="profile-email"
              className="form-control form-control-lg editorial-input"
              value={user?.email || ""}
              readOnly
              disabled
            />
            <div className="form-text">
              Email changes are disabled to protect your sign-in identity.
            </div>
          </div>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="alert alert-success" role="status">
              {notice}
            </div>
          )}
          <button
            className="btn btn-editorial-primary"
            type="submit"
            disabled={busy || !fullName.trim()}
          >
            {busy ? "Saving…" : "Save profile"}{" "}
            <i className="bi bi-arrow-up-right ms-2" aria-hidden="true" />
          </button>
        </form>
        <div className="profile-security-note">
          <i className="bi bi-shield-check" aria-hidden="true" />
          <span>
            Authentication tokens remain in secure cookies. This page never
            exposes them.
          </span>
        </div>
      </div>
    </section>
  );
}
