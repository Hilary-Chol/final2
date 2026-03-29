import '../styles/landing.css';

// Landing page component for selecting applicant or organization portal.

export default function Landing({ onNavigate }) {
  return (
    <div className="page page-landing">
      <header className="landing-topbar">
        <div className="landing-brand">Civira</div>
        <nav className="landing-topnav" aria-label="Landing Navigation">
          <button className="btn-link" type="button">Features</button>
          <button className="btn-link" type="button">Resources</button>
          <button className="btn-link" type="button">Pricing</button>
          <button className="btn-link" type="button">Company</button>
        </nav>
        <button className="btn-link" type="button" onClick={() => onNavigate('login')}>Sign In</button>
      </header>

      <section className="landing-hero">
        <p className="hero-pill">Apply Smarter • Get Seen Faster • Grow Your Career</p>
        <h1>Find the Right Opportunity in Time</h1>
        <p className="hero-subtitle">Build a stronger profile, apply with confidence, and track progress in a transparent hiring process.</p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => onNavigate('login')}>Login</button>
          <button className="btn-secondary" onClick={() => onNavigate('login')}>Register</button>
        </div>
        <div className="hero-social-proof" aria-label="Social channels">
          <span>○</span><span>○</span><span>○</span><span>○</span><span>○</span>
        </div>
        <div className="hero-dashboard-mock" aria-hidden="true">
          <img src="/images/hero-dashboard.svg" alt="Civira dashboard preview" className="hero-dashboard-image" />
        </div>
      </section>

      <section className="landing-section landing-speed">
        <div className="section-header">
          <h2>The Fastest Way to Find Your Next Role</h2>
        </div>
        <div className="feature-row">
          <article className="feature-card feature-card-active">
            <h3>Stand Out as a Candidate</h3>
            <p>Show your strengths with profile and CV insights.</p>
          </article>
          <article className="feature-card">
            <h3>Apply in a Few Clicks</h3>
            <p>Submit applications quickly and track every step.</p>
          </article>
          <article className="feature-card">
            <h3>Get Fair Evaluation</h3>
            <p>Transparent scoring based on skills and criteria.</p>
          </article>
          <article className="feature-card">
            <h3>Move Forward Faster</h3>
            <p>Structured interviews with clear outcomes.</p>
          </article>
        </div>
      </section>

      <section className="landing-section landing-trusted">
        <h2>Trusted by Candidates and Recruiters</h2>
        <p>Built for teams and applicants who value fairness, speed, and accountability.</p>
        <div className="trusted-grid" aria-label="Company list">
          <span>Colorado</span><span>Swiss</span><span>Savannah</span><span>Memphis</span>
          <span>Springfield</span><span>Kansas</span><span>California</span><span>Amsterdam</span>
        </div>
      </section>

      <section className="landing-section landing-tools">
        <div className="section-header">
          <h2>End-to-End Hiring Tools for Everyone</h2>
          <p>One platform where candidates apply clearly and recruiters evaluate consistently.</p>
        </div>
        <div className="tools-panel">
          <div className="tools-chart" aria-hidden="true">
            <img src="/images/hiring-analytics.svg" alt="Hiring analytics charts" className="tools-chart-image" />
          </div>
          <div className="tools-content">
            <h3>Built for Applicants and Hiring Teams</h3>
            <p>Enable merit-based hiring with clear workflows, visible progress, and accountable decisions.</p>
            <ul>
              <li>Candidate-friendly Application Flow</li>
              <li>Fair Shortlisting by Criteria</li>
              <li>Role-based Scorecards</li>
              <li>Interview Scheduling for Teams</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="landing-quote">
        <p>
          With Civira, candidates access better opportunities while recruiters hire faster through a transparent, merit-driven process.
        </p>
      </section>

      <section className="landing-section landing-candidate">
        <div className="section-header">
          <h2>Your Career Growth in Record Time</h2>
          <p>Track applications, improve profile strength, and stay interview-ready.</p>
        </div>
        <div className="candidate-layout">
          <div className="candidate-stats" aria-hidden="true">
            <div className="mini-stat">1,928<br /><span>Applications</span></div>
            <div className="mini-stat">85%<br /><span>Success Rate</span></div>
            <div className="mini-graph" />
            <img src="/images/candidate-success.svg" alt="Candidate success illustration" className="candidate-visual" />
          </div>
          <div className="candidate-points">
            <h3>Get Matched to the Right Roles</h3>
            <p>Applications are evaluated by clear criteria and panel scoring.</p>
            <p>Follow every hiring step in one timeline.</p>
            <p>Receive consistent, structured evaluation.</p>
            <p>Stay ready with scheduled interview updates.</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-success">
        <div className="section-header">
          <h2>Success Stories That Matter</h2>
          <p>Real outcomes from candidates and hiring teams using Civira.</p>
        </div>
        <div className="success-cards">
          <article className="success-card">
            <img src="/images/candidate-success.svg" alt="Wilson Thompson" className="avatar" />
            <h3>Wilson Thompson</h3>
            <p>“I could track each stage clearly and prepare better.”</p>
          </article>
          <article className="success-card success-card-highlight">
            <div className="success-value">85%</div>
            <p>Faster shortlisting and better candidate experience.</p>
          </article>
          <article className="success-card">
            <img src="/images/candidate-success.svg" alt="David Anderson" className="avatar" />
            <h3>David Anderson</h3>
            <p>“Scorecards helped our team make fair, confident decisions.”</p>
          </article>
        </div>
      </section>

      <section className="landing-section landing-process">
        <div className="section-header">
          <h2>Recruitment That Works for Both Sides</h2>
          <p>From candidate applications to recruiter decisions in one shared workflow.</p>
        </div>
        <div className="process-cards">
          <article className="process-card">
            <h3>Smart Matching</h3>
            <p>Connect candidate strengths to role criteria quickly.</p>
          </article>
          <article className="process-card">
            <h3>Clear Evaluation</h3>
            <p>Use consistent scorecards for fair shortlisting and interviews.</p>
          </article>
          <article className="process-card">
            <h3>Better Outcomes</h3>
            <p>Improve candidate experience while helping recruiters hire faster.</p>
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-brand">
          <h3>Civira</h3>
          <p>Join a fair hiring ecosystem for candidates and recruiters.</p>
          <button className="btn-primary" onClick={() => onNavigate('login')}>Register</button>
        </div>
        <div className="footer-links">
          <div>
            <h4>Quick Links</h4>
            <p>Home</p>
            <p>Features</p>
            <p>Pricing</p>
          </div>
          <div>
            <h4>Support</h4>
            <p>Contact</p>
            <p>Guides</p>
            <p>Privacy</p>
          </div>
          <div>
            <h4>Resources</h4>
            <p>Blog</p>
            <p>Case Studies</p>
            <p>Documentation</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
