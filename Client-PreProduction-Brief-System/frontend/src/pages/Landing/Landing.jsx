import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Landing.css';

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="landing-page-root">
      {/* Premium Header Navigation Menu */}
      <header className="landing-nav-header">
        <div className="landing-nav-brand">
          <span className="landing-brand-logo">⚡</span>
          <span className="landing-brand-name">DIGIQUEST STUDIO</span>
        </div>
        <nav className="landing-nav-menu">
          <a href="#home" className="landing-nav-link active">HOME</a>
          <a href="#about" className="landing-nav-link">ABOUT US</a>
          <a href="#services" className="landing-nav-link">SERVICES</a>
          <a href="#gallery" className="landing-nav-link">GALLERY</a>
          <a href="#contact" className="landing-nav-link">CONTACT US</a>
          <button className="btn btn-primary btn-nav-portal" onClick={handleStart}>
            {isAuthenticated ? 'DASHBOARD' : 'PORTAL LOGIN'}
          </button>
        </nav>
      </header>

      {/* Decorative Ambient Blur Orbs */}
      <div className="blur-orb orb-primary" />
      <div className="blur-orb orb-secondary" />

      {/* Premium Studio Hero Banner (similar to the reference image) */}
      <section id="home" className="landing-studio-hero" style={{ backgroundImage: `url(/studio_hero_banner.png)` }}>
        <div className="landing-hero-overlay"></div>
        <div className="landing-hero-content text-center">
          <h1 className="studio-hero-title">
            CREATIVE PRODUCTION
            <span>STUDIO</span>
          </h1>
          <div className="studio-hero-divider"></div>
          <p className="studio-hero-subtitle">
            Turn your creative visions into high-end cinematic production reality.
          </p>
          <div className="studio-hero-actions">
            <button className="btn-portfolio" onClick={handleStart}>
              ACCESS PORTAL ➔
            </button>
            {!isAuthenticated && (
              <button className="btn-portfolio-outline" onClick={() => navigate('/register')}>
                ONBOARDING
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Core Portal Features Section */}
      <section id="services" className="landing-features">
        <h2 className="text-center text-gradient">Centralized Requirements Collection</h2>
        <div className="features-grid">
          <div className="feature-card card-glass">
            <span className="feature-emoji">📋</span>
            <h3>Structured Brief Forms</h3>
            <p>No more missing fields or fragmented emails. Input scripts, timelines, priority constraints, and delivery expectations directly.</p>
          </div>
          <div className="feature-card card-glass">
            <span className="feature-emoji">📂</span>
            <h3>Secure Asset Uploads</h3>
            <p>Upload scripts, reference reels, style boards, and brand guideline catalogs directly to the brief record.</p>
          </div>
          <div className="feature-card card-glass">
            <span className="feature-emoji">💬</span>
            <h3>Collaborative Revisions</h3>
            <p>Write inline suggestions, mention crew members, and receive revision requests with clear workflow transitions.</p>
          </div>
          <div className="feature-card card-glass">
            <span className="feature-emoji">📈</span>
            <h3>Central Tracking</h3>
            <p>Know exactly when your brief is Under Review, Approved, or in Production with instant notifications.</p>
          </div>
        </div>
      </section>

      {/* Studio Capabilities Banner */}
      <section id="contact" className="landing-banner card-glass">
        <div className="banner-details">
          <h2>Ready to kickoff your next project?</h2>
          <p>Register your company profile to start submitting pre-production briefs for film, animation, promos, and commercials.</p>
        </div>
        <button className="btn btn-primary" onClick={handleStart}>
          Get Started
        </button>
      </section>
    </div>
  );
};

export default Landing;
