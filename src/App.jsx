import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import './App.css';

// Import Auth, Onboarding, Dashboard, and AdminPanel
import { AuthProvider, useAuth } from './AuthContext';
import Onboarding from './Onboarding';
import Dashboard from './Dashboard'; 
import AdminPanel from './AdminPanel';

// --- 1. PROTECTED ROUTE (Keeps strangers out) ---
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
     return <div className="preloader-container">Checking Login...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/" />;
  }
  
  return children;
};

// --- 2. LANDING PAGE COMPONENT (Your Design) ---
const LandingPage = () => {
  const { googleSignIn, currentUser } = useAuth();
  // Note: We removed 'navigate' because RootRoute handles redirection now.
  
  // Start loading only if we are NOT logged in (Pure UI animation)
  const [loading, setLoading] = useState(true); 
  const [activeModal, setActiveModal] = useState(null);
  const modalRef = useRef(null);
  const [error, setError] = useState('');

  // Preloader Timer (Just for visual effect now)
  useEffect(() => {
     const timer = setTimeout(() => setLoading(false), 1000);
     return () => clearTimeout(timer);
  }, []);

  // GSAP Animation for Modals
  useEffect(() => {
    if (activeModal && modalRef.current) {
      gsap.fromTo(modalRef.current, 
        { y: 50, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" }
      );
    }
    setError('');
  }, [activeModal]);

  // Google Login Handler
  const handleGoogleAuth = async () => {
    try {
      setError('');
      await googleSignIn();
      // No need to navigate manually; The RootRoute (below) will detect the change and auto-redirect.
    } catch (err) {
      console.error(err);
      setError('Google Login Failed: ' + err.message);
    }
  };

  // Modal Content
  const renderModalContent = () => {
    switch (activeModal) {
      case 'login':
      case 'signup':
        return (
          <>
            <h2>Welcome to Campus Crush</h2>
            <p className="modal-subtitle">
              Join the largest student dating community.
            </p>
            
            {error && <div className="error-alert">{error}</div>}

            <button className="google-btn" onClick={handleGoogleAuth}>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/330px-Google_%22G%22_logo.svg.png" 
                alt="Google" 
                className="google-icon"
              />
              Continue with Google
            </button>
          </>
        );
      case 'terms': return <div><h2>Terms of Service</h2><p>18+ Only.</p></div>;
      case 'guidelines': return <div><h2>Guidelines</h2><p>Be respectful.</p></div>;
      case 'privacy':
      case 'safety': return <div><h2>Privacy & Safety</h2><p>Your data is safe.</p></div>;
      case 'about':
      case 'careers':
      case 'blog':
      case 'contact': return <div><h2>{activeModal}</h2><p>Content coming soon.</p></div>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="preloader-container">
        <div className="heartbeat-wrapper"><div className="heart-icon-big">❤️</div></div>
        <h1 className="loader-text">Campus Crush</h1>
      </div>
    );
  }

  return (
    <div className="app-container fade-in">
      <nav className="navbar">
        <div className="nav-logo">
          <span className="heart-logo">❤️</span> <span className="brand-name">Campus Crush</span>
        </div>
        <div className="nav-actions">
          <button className="btn-text" onClick={() => setActiveModal('login')}>Login</button>
          <button className="btn-primary" onClick={() => setActiveModal('signup')}>Sign Up</button>
        </div>
      </nav>

      <header className="hero-section">
        <div className="floating-heart h1">❤️</div>
        <div className="floating-heart h2">💖</div>
        <div className="floating-heart h3">💘</div>

        <div className="hero-content">
          <div className="hero-badge">✨ Made for College Students</div>
          <h1 className="hero-title">Find Your <br /><span className="highlight-red">Campus Crush</span></h1>
          <p className="hero-subtitle">College love starts here ❤️</p>
          <p className="hero-description">Connect with fellow students, find your perfect match.</p>
          <div className="hero-buttons">
            <button className="btn-gradient" onClick={() => setActiveModal('signup')}>♡ Get Started Free</button>
            <button className="btn-outline" onClick={() => setActiveModal('about')}>Learn More</button>
          </div>
           <div className="hero-stats">
            <div className="stat-item"><span className="stat-icon">👥</span><strong>50K+</strong><small>Users</small></div>
            <div className="stat-item"><span className="stat-icon">❤️</span><strong>10K+</strong><small>Matches</small></div>
            <div className="stat-item"><span className="stat-icon">💭</span><strong>500+</strong><small>Stories</small></div>
          </div>
        </div>
      </header>
      
       <section className="features-section">
        <h2 className="section-title">Why Students <span className="highlight-red">Love Us</span></h2>
        <div className="features-grid">
           <div className="feature-card"><div className="icon-box red-icon">🎓</div><h3>Campus Verified</h3><p>Only verified college students can join.</p></div>
           <div className="feature-card"><div className="icon-box pink-icon">♡</div><h3>Smart Matching</h3><p>Our algorithm connects you with compatible matches.</p></div>
           <div className="feature-card"><div className="icon-box red-icon">⚡</div><h3>Instant Connection</h3><p>Match, chat, and meet in real-time.</p></div>
           <div className="feature-card"><div className="icon-box pink-icon">🛡️</div><h3>Safe & Secure</h3><p>Your privacy is our priority.</p></div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand"><div className="footer-logo"><span>❤️</span> Campus Crush</div><p>Making college connections meaningful.</p></div>
          <div className="footer-links-grid">
            <div className="link-column"><h4>Product</h4><span onClick={() => setActiveModal('about')}>How it Works</span><span onClick={() => window.scrollTo(0, 800)}>Features</span></div>
            <div className="link-column"><h4>Company</h4><span onClick={() => setActiveModal('about')}>About Us</span><span onClick={() => setActiveModal('careers')}>Careers</span><span onClick={() => setActiveModal('blog')}>Blog</span><span onClick={() => setActiveModal('contact')}>Contact</span></div>
            <div className="link-column"><h4>Legal</h4><span onClick={() => setActiveModal('privacy')}>Privacy Policy</span><span onClick={() => setActiveModal('terms')}>Terms of Service</span><span onClick={() => setActiveModal('safety')}>Safety Tips</span><span onClick={() => setActiveModal('guidelines')}>Community Guidelines</span></div>
          </div>
        </div>
        <div className="footer-bottom"><p>&copy; 2024 Campus Crush. All rights reserved.</p></div>
      </footer>

      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-card" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setActiveModal(null)}>&times;</button>
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
};



 // --- 3. ROOT ROUTE (The Traffic Cop - UPDATED) ---
const RootRoute = () => {
  const { currentUser, userProfile, loading } = useAuth(); // Get userProfile too

  // 1. Loading State
  if (loading) {
    return (
      <div style={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fff0f5'}}>
        <div className="heart-icon-big" style={{fontSize: '50px'}}>❤️</div>
      </div>
    );
  }

  // 2. IF LOGGED IN: Check if Profile is Complete
  if (currentUser) {
    // If they have a "branch", they completed onboarding -> Dashboard
    if (userProfile?.branch) {
      return <Navigate to="/dashboard" replace />;
    }
    // If no branch, they are new -> Onboarding
    return <Navigate to="/onboarding" replace />;
  }

  // 3. IF NOT LOGGED IN: Show Landing Page
  return <LandingPage />;
};

// --- 4. MAIN APP COMPONENT ---
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Smart Traffic Cop at the Root */}
          <Route path="/" element={<RootRoute />} />
          
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          } />

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;