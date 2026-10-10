import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/client";

function ListSection({ title, items, render }) {
  if (!items?.length) return null;

  return (
    <section className="analysis-section">
      <h2 className="h6 fw-bold mb-3">{title}</h2>
      <div className="d-grid gap-3">
        {items.map((item, i) => (
          <article className="analysis-item" key={`${title}-${i}`}>
            {render ? render(item) : <p className="mb-0">{item}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function ResumeOptimizer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api
      .get(`/resumes/${id}`)
      .then((r) => {
        if (active) setResume(r.data.data.resume);
      })
      .catch((e) => {
        if (active) {
          setError(
            e.response?.data?.error?.message || "Could not load this resume.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const runAnalysis = async (e) => {
    e.preventDefault();
    setError("");
    setAnalysis(null);
    setAnalyzing(true);

    try {
      const r = await api.post(`/resumes/${id}/optimize`, {
        jobDescription,
      });

      setAnalysis(r.data.data.analysis);
    } catch (e) {
      setError(
        e.response?.data?.error?.message ||
          "Analysis failed. Please try again.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const generateTailoredResume = async () => {
    if (generating || analyzing) return;

    if (jobDescription.trim().length < 80) {
      setError("Please provide a job description of at least 80 characters.");
      return;
    }

    setError("");
    setGenerating(true);

    try {
      const response = await api.post(`/resumes/${id}/generate-tailored`, {
        jobDescription,
      });

      const newResumeId = response.data?.data?.resume?.id;

      if (!newResumeId) {
        throw new Error("The server did not return the generated resume ID.");
      }

      navigate(`/resumes/${newResumeId}/edit`);
    } catch (e) {
      setError(
        e.response?.data?.error?.message ||
          e.message ||
          "Could not generate the tailored resume. Please try again.",
      );
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="screen-loader">Loading resume…</div>;
  }

  return (
    <div className="container py-5 optimizer-page">
      <Link to={`/resumes/${id}/edit`} className="small text-decoration-none">
        <i className="bi bi-arrow-left me-1" />
        Back to resume editor
      </Link>

      <div className="mt-3 mb-4">
        <p className="eyebrow mb-2">JOB MATCH ANALYZER</p>
        <h1 className="h2 fw-bold">Optimize for a job description</h1>
        <p className="text-secondary">
          Compare <strong>{resume?.title || "your resume"}</strong> with a role.
          Suggestions stay grounded in your real experience.
        </p>
      </div>

      <form className="editor-panel mb-4" onSubmit={runAnalysis}>
        <label htmlFor="job-description" className="form-label fw-semibold">
          Job description
        </label>

        <textarea
          id="job-description"
          className="form-control job-description-input"
          rows="9"
          minLength={80}
          maxLength={16000}
          required
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the complete job description, including responsibilities and required skills…"
        />

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
          <span className="small text-secondary">
            {jobDescription.length.toLocaleString()} / 16,000 characters ·
            Minimum 80
          </span>

          <button
            className="btn btn-dark"
            type="submit"
            disabled={
              analyzing || generating || jobDescription.trim().length < 80
            }
          >
            <i className="bi bi-stars me-2" />
            {analyzing ? "Analyzing…" : "Analyze job match"}
          </button>
        </div>
      </form>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {analysis && (
        <div className="analysis-results">
          <div className="analysis-score-card mb-4">
            <div>
              <p className="small fw-semibold mb-1">ESTIMATED JOB MATCH</p>
              <div className="analysis-score">
                {analysis.matchScore}
                <span>%</span>
              </div>
              <p className="mb-0">{analysis.scoreExplanation}</p>
            </div>

            <div
              className="score-ring"
              role="img"
              aria-label={`Match score ${analysis.matchScore} percent`}
              style={{ "--score": `${analysis.matchScore}%` }}
            >
              <span>{analysis.matchScore}%</span>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-lg-6">
              <ListSection
                title="Skills supported by your resume"
                items={analysis.matchedSkills}
                render={(x) => (
                  <>
                    <div className="fw-semibold">{x.skill}</div>
                    <p className="small text-secondary mb-0 mt-1">
                      Evidence: {x.evidence}
                    </p>
                  </>
                )}
              />
            </div>

            <div className="col-lg-6">
              <ListSection
                title="Potential skill gaps"
                items={analysis.missingSkills}
                render={(x) => (
                  <>
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <strong>{x.skill}</strong>
                      <span
                        className={`badge ${
                          x.importance === "high"
                            ? "text-bg-warning"
                            : "text-bg-secondary"
                        }`}
                      >
                        {x.importance || "review"}
                      </span>
                    </div>
                    <p className="small text-secondary mb-0 mt-1">{x.note}</p>
                  </>
                )}
              />
            </div>
          </div>

          <ListSection
            title="Your strongest matches"
            items={analysis.strengths}
          />

          <ListSection
            title="Evidence-based bullet improvements"
            items={analysis.improvements}
            render={(x) => (
              <>
                <div className="small text-secondary mb-1">{x.section}</div>
                <p className="mb-2">
                  <strong>Current:</strong>{" "}
                  {x.currentText || "No existing bullet provided"}
                </p>
                <p className="mb-2">
                  <strong>Suggestion:</strong> {x.suggestedText}
                </p>
                <p className="small text-secondary mb-0">{x.reason}</p>
              </>
            )}
          />

          <ListSection
            title="Suggested learning plan"
            items={analysis.learningPlan}
            render={(x) => (
              <>
                <strong>{x.skill}</strong>
                <p className="mb-1 mt-1">{x.action}</p>
                <p className="small text-secondary mb-0">
                  Search for: {x.resourceSearch}
                </p>
              </>
            )}
          />

          <div className="alert alert-info mt-4">
            <i className="bi bi-info-circle me-2" />
            {analysis.disclaimer}
          </div>

          <div className="editor-panel mt-4">
            <div className="d-flex align-items-start gap-3">
              <div className="fs-3 text-primary">
                <i className="bi bi-file-earmark-person" />
              </div>

              <div className="flex-grow-1">
                <h2 className="h5 fw-bold">Create your tailored resume</h2>
                <p className="text-secondary mb-3">
                  Generate a separate resume that emphasizes relevant evidence
                  from your existing experience. Your original resume will
                  remain unchanged. Review every suggestion before using the
                  generated resume.
                </p>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={generateTailoredResume}
                  disabled={generating || analyzing}
                >
                  <i className="bi bi-magic me-2" />
                  {generating
                    ? "Generating tailored resume…"
                    : "Generate Tailored Resume"}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary mt-4"
            disabled={generating}
            onClick={() => {
              setAnalysis(null);
              setError("");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Analyze another job description
          </button>
        </div>
      )}
    </div>
  );
}
