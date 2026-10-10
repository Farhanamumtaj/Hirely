import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
const blank = () => ({
  title: "Untitled Resume",
  designation: "",
  preferredFormat: "standard",
  personalInformation: {
    fullName: "",
    phone: "",
    email: "",
    location: "",
    linkedin: "",
    github: "",
    leetcode: "",
    portfolio: "",
  },
  professionalSummary: "",
  resumeData: {
    education: [],
    experience: [],
    internships: [],
    projects: [],
    achievements: [],
    certifications: [],
    skillCategories: [{ name: "Technical Skills", skills: [] }],
    softSkills: [],
  },
  sectionOrder: [
    "summary",
    "skills",
    "education",
    "experience",
    "internships",
    "projects",
    "achievements",
    "certifications",
    "softSkills",
  ],
  sectionVisibility: {},
  customSectionConfiguration: [],
});
function Field({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <div className="mb-3">
      <label className="form-label small fw-semibold">{label}</label>
      <input
        className="form-control"
        type={type}
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
function Area({ label, value, onChange, placeholder = "" }) {
  return (
    <div className="mb-3">
      <label className="form-label small fw-semibold">{label}</label>
      <textarea
        className="form-control"
        rows="4"
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
const SECTION_META = [
  {
    id: "summary",
    label: "Professional summary",
    heading: "PROFESSIONAL SUMMARY",
  },
  { id: "skills", label: "Technical skills", heading: "TECHNICAL SKILLS" },
  { id: "education", label: "Education", heading: "EDUCATION" },
  { id: "experience", label: "Experience", heading: "EXPERIENCE" },
  { id: "internships", label: "Internships", heading: "INTERNSHIPS" },
  { id: "projects", label: "Projects", heading: "PROJECTS" },
  { id: "achievements", label: "Achievements", heading: "ACHIEVEMENTS" },
  {
    id: "certifications",
    label: "Certifications and participation",
    heading: "CERTIFICATIONS AND PARTICIPATION",
  },
  { id: "softSkills", label: "Soft skills", heading: "SOFT SKILLS" },
];
function sectionText(id, data) {
  const d = data.resumeData || {};
  const list = (key, fn) => (d[key] || []).map(fn).filter(Boolean).join("\n\n");
  switch (id) {
    case "summary":
      return data.professionalSummary || "";
    case "skills":
      return (d.skillCategories || [])
        .map((c) => `${c.name}: ${(c.skills || []).join(", ")}`)
        .filter((x) => x.split(": ")[1])
        .join("\n");
    case "education":
      return list("education", (x) =>
        [
          `${x.degree || ""} ${x.field ? `— ${x.field}` : ""}`.trim(),
          x.organization,
          [x.startDate, x.endDate].filter(Boolean).join(" – "),
          x.description,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    case "experience":
      return list("experience", (x) =>
        [
          `${x.title || ""}${x.organization ? ` — ${x.organization}` : ""}`.trim(),
          [x.startDate, x.current ? "Present" : x.endDate]
            .filter(Boolean)
            .join(" – "),
          x.description,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    case "internships":
      return list("internships", (x) =>
        [
          `${x.title || ""}${x.organization ? ` — ${x.organization}` : ""}`.trim(),
          [x.startDate, x.current ? "Present" : x.endDate]
            .filter(Boolean)
            .join(" – "),
          x.description,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    case "projects":
      return list("projects", (x) =>
        [
          x.title,
          x.description,
          (x.technologies || []).length
            ? `Technologies: ${x.technologies.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    case "achievements":
      return list("achievements", (x) =>
        [x.title, x.description].filter(Boolean).join(" — "),
      );
    case "certifications":
      return list("certifications", (x) =>
        [x.title, x.organization].filter(Boolean).join(" — "),
      );
    case "softSkills":
      return (d.softSkills || []).join(", ");
    default:
      return "";
  }
}
function ResumePreview({ data }) {
  const p = data.personalInformation || {};
  const ordered = [...SECTION_META].sort((a, b) => {
    const order = data.sectionOrder || [];
    const ai = order.indexOf(a.id),
      bi = order.indexOf(b.id);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
  return (
    <article className="resume-paper">
      <header className="resume-header">
        <h1>{p.fullName || "YOUR NAME"}</h1>
        <div className="resume-contact">
          {p.location && (
            <span>
              <i className="bi bi-geo-alt-fill" aria-hidden="true" />
              {p.location}
            </span>
          )}

          {p.phone && (
            <span>
              <i className="bi bi-telephone-fill" aria-hidden="true" />
              {p.phone}
            </span>
          )}

          {p.email && (
            <span>
              <i className="bi bi-envelope-fill" aria-hidden="true" />
              {p.email}
            </span>
          )}
        </div>

        <div className="resume-links">
          {[
            ["LinkedIn", p.linkedin, "bi-linkedin"],
            ["GitHub", p.github, "bi-github"],
            ["LeetCode", p.leetcode, "bi-code-slash"],
            ["Portfolio", p.portfolio, "bi-globe"],
          ]
            .filter(([, url]) => url)
            .map(([label, url, icon]) => {
              const displayUrl = url
                .replace(/^https?:\/\/(www\.)?/i, "")
                .replace(/\/$/, "");

              return (
                <span key={label}>
                  <i className={`bi ${icon}`} aria-hidden="true" />
                  {displayUrl}
                </span>
              );
            })}
        </div>
        {data.designation && <h2>{data.designation}</h2>}
      </header>
      {ordered.map((section) => {
        const content = sectionText(section.id, data);
        if (data.sectionVisibility?.[section.id] === false || !content.trim())
          return null;
        return (
          <section className="resume-section" key={section.id}>
            <h3>{section.heading}</h3>
            <div className="resume-content">{content}</div>
          </section>
        );
      })}
    </article>
  );
}
function validateResume(data) {
  const problems = [];
  const email = data.personalInformation?.email || "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    problems.push("Enter a valid email address.");
  for (const [label, url] of [
    ["LinkedIn", data.personalInformation?.linkedin],
    ["GitHub", data.personalInformation?.github],
    ["LeetCode", data.personalInformation?.leetcode],
    ["Portfolio", data.personalInformation?.portfolio],
  ])
    if (url && !/^https:\/\//i.test(url))
      problems.push(`${label} URL must start with https://.`);
  for (const section of [
    "education",
    "experience",
    "internships",
    "projects",
    "achievements",
    "certifications",
  ])
    for (const [index, item] of (data.resumeData?.[section] || []).entries()) {
      if (
        item.startDate &&
        item.endDate &&
        /^\d{4}-\d{2}$/.test(item.startDate) &&
        /^\d{4}-\d{2}$/.test(item.endDate) &&
        item.startDate > item.endDate
      )
        problems.push(
          `${section[0].toUpperCase() + section.slice(1)} entry ${index + 1}: end date is earlier than start date.`,
        );
    }
  return [...new Set(problems)];
}
export default function ResumeEditor() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(blank);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");
  const [importWarnings, setImportWarnings] = useState(
    location.state?.importWarnings || [],
  );
  useEffect(() => {
    let alive = true;
    if (id)
      api
        .get(`/resumes/${id}`)
        .then((r) => {
          if (alive) {
            const x = r.data.data.resume;
            setData({
              title: x.title,
              designation: x.designation,
              preferredFormat: x.preferredFormat,
              personalInformation: x.personalInformation || {},
              professionalSummary: x.professionalSummary || "",
              resumeData: { ...blank().resumeData, ...x.resumeData },
              sectionOrder: [
                ...(x.sectionOrder || blank().sectionOrder),
                ...SECTION_META.map((s) => s.id).filter(
                  (sid) =>
                    !(x.sectionOrder || blank().sectionOrder).includes(sid),
                ),
              ],
              sectionVisibility: x.sectionVisibility || {},
              customSectionConfiguration: x.customSectionConfiguration || [],
            });
          }
        })
        .catch((e) =>
          setError(
            e.response?.data?.error?.message || "Could not load this resume.",
          ),
        )
        .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);
  const setPersonal = (key, value) =>
    setData((old) => ({
      ...old,
      personalInformation: { ...old.personalInformation, [key]: value },
    }));
  const setField = (key, value) => setData((old) => ({ ...old, [key]: value }));
  const setArray = (section, index, key, value) =>
    setData((old) => ({
      ...old,
      resumeData: {
        ...old.resumeData,
        [section]: old.resumeData[section].map((r, i) =>
          i === index ? { ...r, [key]: value } : r,
        ),
      },
    }));
  const addRecord = (section) =>
    setData((old) => ({
      ...old,
      resumeData: {
        ...old.resumeData,
        [section]: [
          ...(old.resumeData[section] || []),
          {
            title: "",
            organization: "",
            degree: "",
            field: "",
            startDate: "",
            endDate: "",
            description: "",
            bullets: [],
            technologies: [],
            url: "",
          },
        ],
      },
    }));
  const removeRecord = (section, index) =>
    setData((old) => ({
      ...old,
      resumeData: {
        ...old.resumeData,
        [section]: old.resumeData[section].filter((_, i) => i !== index),
      },
    }));
  const exportDocument = async (format) => {
    if (!id) {
      setError("Save this resume before exporting it.");
      return;
    }
    setError("");
    setNotice("");
    setExporting(format);
    try {
      const response = await api.get(`/resumes/${id}/export/${format}`, {
        responseType: "blob",
      });
      const mime =
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const blob = new Blob([response.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${
        (data.title || "resume")
          .trim()
          .replace(/[^a-z0-9-_]+/gi, "-")
          .replace(/^-+|-+$/g, "") || "resume"
      }.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setNotice(`${format.toUpperCase()} export downloaded.`);
    } catch (e) {
      setError(
        e.response?.data?.error?.message ||
          `Could not export ${format.toUpperCase()}. Save the resume and try again.`,
      );
    } finally {
      setExporting("");
    }
  };
  const save = async () => {
    setError("");
    setNotice("");
    if (!data.title.trim()) {
      setError("Please enter a resume title.");
      return;
    }
    const validation = validateResume(data);
    if (validation.length) {
      setError(validation.join(" "));
      return;
    }
    setSaving(true);
    try {
      const response = id
        ? await api.put(`/resumes/${id}`, data)
        : await api.post("/resumes", data);
      const saved = response.data.data.resume;
      setNotice("Resume saved successfully.");
      if (!id) navigate(`/resumes/${saved.id}/edit`, { replace: true });
    } catch (e) {
      setError(
        e.response?.data?.error?.message ||
          "Could not save your resume. Your edits are still here; please try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <div className="screen-loader">Loading resume…</div>;
  return (
    <div className="container-fluid px-lg-4 py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <Link
            to="/dashboard"
            className="text-decoration-none small text-secondary"
          >
            <i className="bi bi-arrow-left me-1" />
            Dashboard
          </Link>
          <h1 className="h3 fw-bold mt-2 mb-1">Resume builder</h1>
          <p className="text-secondary mb-0">
            Edit your details and see the document preview update as you type.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link
            to={id ? `/resumes/${id}/optimize` : "/resumes/new"}
            className={`btn btn-outline-secondary ${!id ? "disabled" : ""}`}
            aria-disabled={!id}
          >
            <i className="bi bi-stars me-2" />
            AI optimize
          </Link>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => window.print()}
          >
            <i className="bi bi-printer me-2" />
            Print
          </button>
          <button
            type="button"
            className="btn btn-outline-dark"
            onClick={() => exportDocument("pdf")}
            disabled={!id || Boolean(exporting)}
          >
            <i className="bi bi-file-earmark-pdf me-2" />
            {exporting === "pdf" ? "Exporting…" : "Download PDF"}
          </button>
          <button
            type="button"
            className="btn btn-outline-dark"
            onClick={() => exportDocument("docx")}
            disabled={!id || Boolean(exporting)}
          >
            <i className="bi bi-file-earmark-word me-2" />
            {exporting === "docx" ? "Exporting…" : "Download DOCX"}
          </button>
          <select
            className="form-select"
            aria-label="Resume format"
            value={data.preferredFormat}
            onChange={(e) => setField("preferredFormat", e.target.value)}
          >
            <option value="one-page">One-page</option>
            <option value="standard">Standard</option>
          </select>
          <button className="btn btn-dark" onClick={save} disabled={saving}>
            <i className="bi bi-cloud-check me-2" />
            {saving ? "Saving…" : "Save resume"}
          </button>
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
      {importWarnings.length > 0 && (
        <div className="alert alert-warning" role="status">
          <strong>Review your imported resume before exporting.</strong>
          <ul className="mb-0 mt-2">
            {importWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary mt-2"
            onClick={() => setImportWarnings([])}
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="row g-4 resume-workspace align-items-start">
        <div className="col-xl-5 resume-editor-column">
          <div className="editor-panel">
            <Field
              label="Resume title"
              value={data.title}
              onChange={(v) => setField("title", v)}
            />
            <h2 className="editor-heading">Personal information</h2>
            <div className="row">
              <div className="col-md-6">
                <Field
                  label="Full name"
                  value={data.personalInformation.fullName}
                  onChange={(v) => setPersonal("fullName", v)}
                />
              </div>
              <div className="col-md-6">
                <Field
                  label="Target role / designation"
                  value={data.designation}
                  onChange={(v) => setField("designation", v)}
                />
              </div>
              <div className="col-md-6">
                <Field
                  label="Email"
                  value={data.personalInformation.email}
                  onChange={(v) => setPersonal("email", v)}
                  type="email"
                />
              </div>
              <div className="col-md-6">
                <Field
                  label="Phone"
                  value={data.personalInformation.phone}
                  onChange={(v) => setPersonal("phone", v)}
                />
              </div>
              <div className="col-md-6">
                <Field
                  label="Location"
                  value={data.personalInformation.location}
                  onChange={(v) => setPersonal("location", v)}
                />
              </div>
              <div className="col-md-6">
                <Field
                  label="LinkedIn URL"
                  value={data.personalInformation.linkedin}
                  onChange={(v) => setPersonal("linkedin", v)}
                />
              </div>
              <div className="col-md-6">
                <Field
                  label="GitHub URL"
                  value={data.personalInformation.github}
                  onChange={(v) => setPersonal("github", v)}
                />
              </div>
              <div className="col-md-6">
                <Field
                  label="LeetCode URL"
                  value={data.personalInformation.leetcode}
                  onChange={(v) => setPersonal("leetcode", v)}
                />
              </div>
              <div className="col-12">
                <Field
                  label="Portfolio URL"
                  value={data.personalInformation.portfolio}
                  onChange={(v) => setPersonal("portfolio", v)}
                />
              </div>
            </div>
            <h2 className="editor-heading">Professional summary</h2>
            <Area
              label="Summary"
              value={data.professionalSummary}
              onChange={(v) => setField("professionalSummary", v)}
              placeholder="Write a concise, factual professional summary…"
            />
            <section className="section-settings mt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h3 className="editor-heading mb-2">Sections in your resume</h3>
                <span className="small text-secondary">
                  Reorder · show/hide
                </span>
              </div>
              {[...SECTION_META]
                .sort((a, b) => {
                  const order = data.sectionOrder || [];
                  return (
                    (order.indexOf(a.id) < 0 ? 999 : order.indexOf(a.id)) -
                    (order.indexOf(b.id) < 0 ? 999 : order.indexOf(b.id))
                  );
                })
                .map((section, index, items) => (
                  <div className="section-setting-row" key={section.id}>
                    <label className="form-check-label d-flex align-items-center gap-2">
                      <input
                        className="form-check-input mt-0"
                        type="checkbox"
                        checked={data.sectionVisibility?.[section.id] !== false}
                        onChange={(e) =>
                          setData((old) => ({
                            ...old,
                            sectionVisibility: {
                              ...old.sectionVisibility,
                              [section.id]: e.target.checked,
                            },
                          }))
                        }
                      />
                      <span>{section.label}</span>
                    </label>
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        aria-label={`Move ${section.label} up`}
                        disabled={index === 0}
                        onClick={() =>
                          setData((old) => {
                            const order = [...old.sectionOrder];
                            const pos = order.indexOf(section.id);
                            if (pos > 0) {
                              [order[pos - 1], order[pos]] = [
                                order[pos],
                                order[pos - 1],
                              ];
                            }
                            return { ...old, sectionOrder: order };
                          })
                        }
                      >
                        <i className="bi bi-arrow-up" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        aria-label={`Move ${section.label} down`}
                        disabled={index === items.length - 1}
                        onClick={() =>
                          setData((old) => {
                            const order = [...old.sectionOrder];
                            const pos = order.indexOf(section.id);
                            if (pos >= 0 && pos < order.length - 1) {
                              [order[pos + 1], order[pos]] = [
                                order[pos],
                                order[pos + 1],
                              ];
                            }
                            return { ...old, sectionOrder: order };
                          })
                        }
                      >
                        <i className="bi bi-arrow-down" />
                      </button>
                    </div>
                  </div>
                ))}
            </section>
            <SectionEditor
              title="Skills"
              onAdd={() =>
                setData((old) => ({
                  ...old,
                  resumeData: {
                    ...old.resumeData,
                    skillCategories: [
                      ...old.resumeData.skillCategories,
                      { name: "Other", skills: [] },
                    ],
                  },
                }))
              }
              addLabel="Add category"
            >
              {data.resumeData.skillCategories.map((c, i) => (
                <div className="border rounded-3 p-3 mb-3" key={i}>
                  <Field
                    label="Category"
                    value={c.name}
                    onChange={(v) =>
                      setData((old) => ({
                        ...old,
                        resumeData: {
                          ...old.resumeData,
                          skillCategories: old.resumeData.skillCategories.map(
                            (x, j) => (j === i ? { ...x, name: v } : x),
                          ),
                        },
                      }))
                    }
                  />
                  <Field
                    label="Skills (comma-separated)"
                    value={c.skills.join(", ")}
                    onChange={(v) =>
                      setData((old) => ({
                        ...old,
                        resumeData: {
                          ...old.resumeData,
                          skillCategories: old.resumeData.skillCategories.map(
                            (x, j) =>
                              j === i
                                ? {
                                    ...x,
                                    skills: v
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  }
                                : x,
                          ),
                        },
                      }))
                    }
                  />
                  {i > 0 && (
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() =>
                        setData((old) => ({
                          ...old,
                          resumeData: {
                            ...old.resumeData,
                            skillCategories:
                              old.resumeData.skillCategories.filter(
                                (_, j) => j !== i,
                              ),
                          },
                        }))
                      }
                    >
                      Remove category
                    </button>
                  )}
                </div>
              ))}
            </SectionEditor>
            {[
              "education",
              "experience",
              "internships",
              "projects",
              "achievements",
              "certifications",
            ].map((section) => (
              <SectionEditor
                key={section}
                title={section[0].toUpperCase() + section.slice(1)}
                onAdd={() => addRecord(section)}
              >
                {data.resumeData[section].map((item, i) => (
                  <div className="border rounded-3 p-3 mb-3" key={i}>
                    <Field
                      label={
                        section === "education"
                          ? "Degree / qualification"
                          : "Title / role"
                      }
                      value={section === "education" ? item.degree : item.title}
                      onChange={(v) =>
                        setArray(
                          section,
                          i,
                          section === "education" ? "degree" : "title",
                          v,
                        )
                      }
                    />
                    <Field
                      label="Institution / company / issuer"
                      value={item.organization}
                      onChange={(v) => setArray(section, i, "organization", v)}
                    />
                    {section === "education" && (
                      <Field
                        label="Field of study"
                        value={item.field}
                        onChange={(v) => setArray(section, i, "field", v)}
                      />
                    )}
                    <div className="row">
                      <div className="col-6">
                        <Field
                          label="Start (month/year)"
                          value={item.startDate}
                          onChange={(v) => setArray(section, i, "startDate", v)}
                          placeholder="Jan 2025"
                        />
                      </div>
                      <div className="col-6">
                        <Field
                          label="End (month/year)"
                          value={item.endDate}
                          onChange={(v) => setArray(section, i, "endDate", v)}
                          placeholder="May 2026"
                        />
                      </div>
                    </div>
                    <Area
                      label="Description / bullet points"
                      value={item.description}
                      onChange={(v) => setArray(section, i, "description", v)}
                      placeholder="Describe only genuine work and achievements…"
                    />
                    {section === "projects" && (
                      <Field
                        label="Technologies (comma-separated)"
                        value={(item.technologies || []).join(", ")}
                        onChange={(v) =>
                          setArray(
                            section,
                            i,
                            "technologies",
                            v
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          )
                        }
                      />
                    )}
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeRecord(section, i)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </SectionEditor>
            ))}
            <button
              className="btn btn-dark w-100 mt-2"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save resume"}
            </button>
          </div>
        </div>
        <div className="col-xl-7 resume-preview-column">
          <div className="preview-panel">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small fw-semibold text-secondary">
                LIVE DOCUMENT PREVIEW
              </span>
              <span className="small text-secondary">
                A4 ·{" "}
                {data.preferredFormat === "one-page"
                  ? "One-page target"
                  : "Standard"}
              </span>
            </div>
            <div className="preview-document-scroll">
              <ResumePreview data={data} />
              <p className="small text-secondary mt-2">
                PDF and editable DOCX exports are generated from the saved
                resume. Page count may vary with the amount of content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function SectionEditor({ title, children, onAdd, addLabel = "Add entry" }) {
  return (
    <section className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="editor-heading mb-0">{title}</h2>
        <button className="btn btn-sm btn-outline-dark" onClick={onAdd}>
          <i className="bi bi-plus-lg me-1" />
          {addLabel}
        </button>
      </div>
      {children}
    </section>
  );
}
