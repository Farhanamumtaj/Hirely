import { Link } from "react-router-dom";

const features = [
  {
    number: "01",
    icon: "bi-file-earmark-person",
    title: "Build with intention",
    description:
      "Bring your experience, projects, and skills into one clear, considered resume.",
  },
  {
    number: "02",
    icon: "bi-crosshair",
    title: "Understand the role",
    description:
      "Compare your resume with a job description and see where your evidence aligns.",
  },
  {
    number: "03",
    icon: "bi-feather",
    title: "Keep your story honest",
    description:
      "Get thoughtful wording suggestions without inventing skills or achievements.",
  },
];

export default function Landing() {
  return (
    <>
      <section className="editorial-hero">
        <div className="container editorial-hero-grid">
          <div className="hero-copy">
            <div className="eyebrow editorial-eyebrow">
              <span className="eyebrow-line" /> A MORE THOUGHTFUL WAY TO APPLY
            </div>
            <h1>
              Your work deserves
              <br />a <em>better story.</em>
            </h1>
            <p className="hero-description">
              A calmer, clearer way to build your resume, understand a job
              description, and show the value of what you’ve actually done.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-editorial-primary btn-lg" to="/register">
                Create your resume{" "}
                <i className="bi bi-arrow-up-right ms-2" aria-hidden="true" />
              </Link>
              <Link className="text-link" to="/login">
                I already have an account{" "}
                <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
              </Link>
            </div>
            <div className="hero-proof">
              <span className="proof-icon">
                <i className="bi bi-check2" />
              </span>
              <span>Honest suggestions. Your story stays yours.</span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Illustration of a neatly designed resume and job match report"
          >
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="mini-resume-paper">
              <div className="mini-paper-top">
                <span>RESUME / 01</span>
                <i className="bi bi-three-dots" />
              </div>
              <div className="mini-avatar">F</div>
              <div className="mini-name">
                Your Name<span>.</span>
              </div>
              <div className="mini-role">PRODUCT · ENGINEERING · DESIGN</div>
              <div className="mini-rule" />
              <div className="mini-heading">PROFILE</div>
              <div className="mini-line w-95" />
              <div className="mini-line w-88" />
              <div className="mini-line w-74" />
              <div className="mini-heading mini-heading-spaced">EXPERIENCE</div>
              <div className="mini-experience-row">
                <span className="mini-bullet" />
                <div>
                  <div className="mini-line w-70 dark-line" />
                  <div className="mini-line w-95" />
                  <div className="mini-line w-82" />
                </div>
              </div>
              <div className="mini-experience-row">
                <span className="mini-bullet olive" />
                <div>
                  <div className="mini-line w-60 dark-line" />
                  <div className="mini-line w-88" />
                </div>
              </div>
              <div className="mini-heading mini-heading-spaced">
                SELECTED SKILLS
              </div>
              <div className="mini-tags">
                <span>Research</span>
                <span>React</span>
                <span>Strategy</span>
              </div>
            </div>
            <div className="match-note">
              <div className="match-note-top">
                <span className="match-spark">
                  <i className="bi bi-stars" />
                </span>
                <span>JOB MATCH</span>
                <span className="match-live-dot" />
              </div>
              <div className="match-note-score">
                Good alignment<span>↗</span>
              </div>
              <div className="match-note-bottom">
                <span className="match-meter">
                  <i />
                </span>
                <span>Evidence-led insights</span>
              </div>
            </div>
            <div className="hero-art-caption">
              <span>01 — YOUR NEXT CHAPTER</span>
              <span>MADE CLEARER</span>
            </div>
          </div>
        </div>
        <div className="hero-bottom-rule">
          <span>LESS GUESSWORK</span>
          <span>MORE CLARITY</span>
          <span>BETTER APPLICATIONS</span>
        </div>
      </section>

      <section className="editorial-features container section-space">
        <div className="section-intro">
          <div>
            <div className="eyebrow editorial-eyebrow">
              <span className="eyebrow-line" /> THE PROCESS
            </div>
            <h2>
              Make every line
              <br />
              <em>mean something.</em>
            </h2>
          </div>
          <p>
            Not another template that asks you to sound like everyone else. Just
            useful tools to help you communicate your experience with clarity.
          </p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="editorial-feature" key={feature.number}>
              <div className="feature-meta">
                <span>{feature.number}</span>
                <i className={`bi ${feature.icon}`} aria-hidden="true" />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <div className="feature-underline" />
            </article>
          ))}
        </div>
      </section>

      <section className="editorial-quote-section">
        <div className="container quote-layout">
          <div className="quote-mark">“</div>
          <div>
            <p className="editorial-quote">
              The strongest resume isn’t the one that says the most. It’s the
              one that makes <em>your contribution clear.</em>
            </p>
            <div className="quote-attribution">
              <span className="quote-rule" /> A PRINCIPLE WE BUILD AROUND
            </div>
          </div>
          <div className="quote-stamp">
            <i className="bi bi-feather" />
            <span>
              KEEP IT
              <br />
              GENUINE
            </span>
          </div>
        </div>
      </section>

      <section className="container editorial-cta-wrap">
        <div className="editorial-cta">
          <div className="cta-overline">A GOOD PLACE TO BEGIN</div>
          <div className="cta-main">
            <div>
              <h2>
                Start with what
                <br />
                you’ve <em>already done.</em>
              </h2>
              <p>
                Your skills, projects, education, and experience—organized into
                a story that feels like you.
              </p>
            </div>
            <Link to="/register" className="btn btn-editorial-light btn-lg">
              Build your resume{" "}
              <i className="bi bi-arrow-up-right ms-2" aria-hidden="true" />
            </Link>
          </div>
          <div className="cta-bottom">
            <span>NO MADE-UP QUALIFICATIONS</span>
            <span>JUST A CLEARER PRESENTATION</span>
          </div>
        </div>
      </section>
    </>
  );
}
