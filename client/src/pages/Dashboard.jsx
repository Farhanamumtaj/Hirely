import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState("");
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await api.get("/resumes");
      setResumes(
        Array.isArray(response.data?.data?.resumes)
          ? response.data.data.resumes
          : [],
      );
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          "Could not load saved resumes. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id) => {
    if (!window.confirm("Delete this resume? This action cannot be undone."))
      return;
    setDeleting(id);
    setError("");
    setNotice("");
    try {
      await api.delete(`/resumes/${id}`);
      setResumes((items) => items.filter((item) => item.id !== id));
      setNotice("Resume deleted.");
    } catch (err) {
      setError(
        err.response?.data?.error?.message || "Could not delete this resume.",
      );
    } finally {
      setDeleting("");
    }
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const supported = /\.(pdf|docx|txt)$/i.test(file.name);
    if (!supported) {
      setError("Choose a PDF, DOCX, or TXT resume.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("This file is larger than 10 MB. Choose a smaller file.");
      return;
    }
    setImporting(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await api.post("/resumes/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { resume, import: importInfo } = response.data.data;
      navigate(`/resumes/${resume.id}/edit`, {
        state: {
          importWarnings: importInfo.warnings,
          importDetectedSections: importInfo.hasDetectedSections,
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          "Could not import this resume. Try a text-based PDF, DOCX, or TXT file.",
      );
    } finally {
      setImporting(false);
    }
  };

  const firstName = (user?.fullName || "there").trim().split(/\s+/)[0];
  return (
    <section className="workspace-page container">
      <div className="workspace-topline">
        <span className="eyebrow editorial-eyebrow">
          <span className="eyebrow-line" /> YOUR WORKSPACE
        </span>
        <span className="workspace-date">A clearer story starts here.</span>
      </div>
      <div className="workspace-heading">
        <div>
          <p className="workspace-kicker">GOOD TO HAVE YOU BACK,</p>
          <h1>
            Hello, <em>{firstName}.</em>
          </h1>
          <p className="workspace-subtitle">
            Your experience has a story. Let’s make it easier to see.
          </p>
        </div>
        <div className="workspace-actions">
          <button
            type="button"
            className="btn btn-outline-editorial"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
          >
            <i
              className={`bi ${importing ? "bi-arrow-repeat" : "bi-upload"} me-2`}
              aria-hidden="true"
            />
            {importing ? "Importing…" : "Import resume"}
          </button>
          <Link to="/resumes/new" className="btn btn-editorial-primary">
            <i className="bi bi-plus-lg me-2" aria-hidden="true" />
            New resume
          </Link>
          <input
            ref={fileInput}
            type="file"
            className="visually-hidden"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={importFile}
            aria-label="Choose a resume to import"
          />
        </div>
      </div>
      <div className="workspace-stat-strip">
        <div className="workspace-stat">
          <span className="stat-number">
            {loading ? "—" : String(resumes.length).padStart(2, "0")}
          </span>
          <span className="stat-label">SAVED RESUMES</span>
        </div>
        <div className="workspace-stat-copy">
          <i className="bi bi-lightbulb" aria-hidden="true" />
          <span>
            Tip: tailor a resume for each role, but keep every detail true to
            your experience.
          </span>
        </div>
        <Link className="workspace-tip-link" to="/resumes">
          Your next step{" "}
          <i className="bi bi-arrow-down-right" aria-hidden="true" />
        </Link>
      </div>
      <div className="resume-library-heading">
        <div>
          <div className="eyebrow editorial-eyebrow">
            <span className="eyebrow-line" /> THE LIBRARY
          </div>
          <h2>
            Your resumes <span>({loading ? "…" : resumes.length})</span>
          </h2>
        </div>
        <p>Drafts, versions, and job-specific stories in one place.</p>
      </div>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}{" "}
          <button className="btn btn-sm btn-link" onClick={load}>
            Try again
          </button>
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {loading ? (
        <div className="workspace-loading" role="status">
          <span className="loading-mark">
            <i className="bi bi-feather" />
          </span>
          <span>Gathering your work…</span>
        </div>
      ) : resumes.length === 0 ? (
        <div className="workspace-empty">
          <div className="empty-paper-icon">
            <i className="bi bi-file-earmark-plus" aria-hidden="true" />
          </div>
          <div className="empty-copy">
            <div className="eyebrow editorial-eyebrow">
              <span className="eyebrow-line" /> A BLANK PAGE, IN A GOOD WAY
            </div>
            <h3>
              Your first resume
              <br />
              <em>starts here.</em>
            </h3>
            <p>
              Create a resume from scratch or bring in one you already have.
              We’ll help you organize it without adding things that aren’t true.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Link to="/resumes/new" className="btn btn-editorial-primary">
                Create a resume{" "}
                <i className="bi bi-arrow-up-right ms-1" aria-hidden="true" />
              </Link>
              <button
                className="btn btn-outline-editorial"
                onClick={() => fileInput.current?.click()}
                disabled={importing}
              >
                Import a file
              </button>
            </div>
          </div>
          <div className="empty-decoration" aria-hidden="true">
            01<span>BEGIN</span>
          </div>
        </div>
      ) : (
        <div className="resume-library-grid">
          {resumes.map((resume, index) => (
            <article className="resume-library-card" key={resume.id}>
              <div className="resume-card-top">
                <span className="resume-index">
                  RESUME / {String(index + 1).padStart(2, "0")}
                </span>
                <span className="resume-format">
                  {resume.preferredFormat === "one-page"
                    ? "ONE PAGE"
                    : "STANDARD"}
                </span>
              </div>
              <div className="resume-card-preview" aria-hidden="true">
                <div className="preview-monogram">
                  {(
                    resume.personalInformation?.fullName ||
                    user?.fullName ||
                    "R"
                  )
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="preview-name-line" />
                <div className="preview-role-line" />
                <div className="preview-section-label">EXPERIENCE</div>
                <div className="preview-rule" />
                <div className="preview-text-line long" />
                <div className="preview-text-line" />
                <div className="preview-text-line short" />
                <div className="preview-section-label">SKILLS</div>
                <div className="preview-skills">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className="resume-card-content">
                <h3>{resume.title || "Untitled resume"}</h3>
                <p className="resume-target">
                  {resume.designation || "No target role set"}
                </p>
                <div className="resume-card-updated">
                  <i className="bi bi-clock-history me-1" aria-hidden="true" />{" "}
                  Updated{" "}
                  {resume.updatedAt &&
                  !Number.isNaN(new Date(resume.updatedAt).getTime())
                    ? new Date(resume.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "recently"}
                </div>
                <div className="resume-card-actions">
                  <Link
                    to={`/resumes/${resume.id}/edit`}
                    className="btn btn-editorial-primary flex-grow-1"
                  >
                    Edit resume{" "}
                    <i
                      className="bi bi-arrow-up-right ms-1"
                      aria-hidden="true"
                    />
                  </Link>
                  <Link
                    to={`/resumes/${resume.id}/optimize`}
                    className="icon-action-button"
                    title="Analyze against a job description"
                    aria-label={`Optimize ${resume.title}`}
                  >
                    <i className="bi bi-stars" aria-hidden="true" />
                  </Link>
                  <button
                    className="icon-action-button danger-action"
                    disabled={deleting === resume.id}
                    onClick={() => remove(resume.id)}
                    aria-label={`Delete ${resume.title}`}
                    title="Delete resume"
                  >
                    <i
                      className={`bi ${deleting === resume.id ? "bi-arrow-repeat" : "bi-trash3"}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </article>
          ))}
          <Link to="/resumes/new" className="add-resume-card">
            <span className="add-resume-icon">
              <i className="bi bi-plus-lg" aria-hidden="true" />
            </span>
            <strong>Create another resume</strong>
            <span>Start a new version for a different role.</span>
          </Link>
        </div>
      )}
      <div className="import-footnote">
        <i className="bi bi-info-circle" aria-hidden="true" />
        <span>
          Import supports PDF, DOCX, and TXT files up to 10 MB. Scanned PDFs may
          not contain readable text. Imported content is a draft—review it
          before using or exporting.
        </span>
      </div>
    </section>
  );
}
