import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Video, Database, School, Home, LayoutDashboard,
  CheckCircle2, ArrowUpRight, Lock, Key, User, X
} from 'lucide-react';
import { api } from '../services/api';
import transparentShield from '../assets/transparent.png';

export default function HomePage({ onLoginSuccess, user, onTriggerTransition }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetPortal, setTargetPortal] = useState('faculty');
  const [username, setUsername] = useState('prof_nir');
  const [password, setPassword] = useState('Classroom2026!');
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isPortalPreviewing, setIsPortalPreviewing] = useState(false);
  const magneticRef = useRef(null);
  const portalPreviewTimerRef = useRef(null);

  const portalConfig = {
    faculty: {
      id: 'faculty',
      title: 'Faculty Portal',
      desc: 'Secure access to Live Staging and AI Verification.',
      subtitle: 'Monitor the Live Staging Buffer, explicitly accept/reject students, and commit the final ledger.',
      icon: ShieldCheck,
      color: 'text-[#818cf8]',
      accentGlow: 'bg-primary/20',
      iconBox: 'text-[#818cf8] border-white/20 bg-white/10 group-hover:bg-primary group-hover:text-white',
      glowFlash: 'portal-glow-blue',
      defaultUser: 'prof_nir',
      defaultPass: 'Classroom2026!'
    },
    student: {
      id: 'student',
      title: 'Student Hub',
      desc: 'Access your attendance records and compliance analytics.',
      subtitle: 'View daily attendance records, track anomaly risk scores, and check timetable subject enrollments.',
      icon: School,
      color: 'text-[#34d399]',
      accentGlow: 'bg-[#10b981]/20',
      iconBox: 'text-[#34d399] border-white/20 bg-white/10 group-hover:bg-[#10b981] group-hover:text-white',
      glowFlash: 'portal-glow-green',
      defaultUser: 'mann_chavda',
      defaultPass: 'Student2026@'
    },
    reports: {
      id: 'reports',
      title: 'Admin Panel',
      desc: 'System configuration, DB metrics, and model sync.',
      subtitle: 'Ingest student datasets, sync SNN Matrix models, view hardware telemetry, and manage database configs.',
      icon: Database,
      color: 'text-white',
      accentGlow: 'bg-white/10',
      iconBox: 'text-white border-white/20 bg-white/10 group-hover:bg-white group-hover:text-slate-900',
      glowFlash: 'portal-glow-black',
      defaultUser: 'admin_sarah',
      defaultPass: 'AdminPass2026#'
    },
    scanner: {
      id: 'scanner',
      title: 'Camera Edge Node',
      desc: 'Initialize classroom capture interface.',
      subtitle: 'Classroom kiosk UI. Captures frames, validates via WebSockets, and verifies student walk-in check-ins.',
      icon: Video,
      color: 'text-error',
      accentGlow: 'bg-error/20',
      iconBox: 'text-error border-white/20 bg-white/10 group-hover:bg-error group-hover:text-white',
      glowFlash: 'portal-glow-red',
      defaultUser: 'prof_nir',
      defaultPass: 'Classroom2026!'
    }
  };

  useEffect(() => {
    const el = magneticRef.current;
    if (!el) return;
    const handleMouseMove = (e) => {
      const xPos = (e.clientX / window.innerWidth) - 0.5;
      const yPos = (e.clientY / window.innerHeight) - 0.5;
      el.style.transform = `translate(${xPos * 20}px, ${yPos * 20}px)`;
    };
    const handleMouseOut = () => {
      el.style.transform = 'translate(0px, 0px)';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  useEffect(() => {
    const header = document.getElementById('main-header');
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    revealElements.forEach((element) => observer.observe(element));
    const handleScroll = () => {
      header?.classList.toggle('header-scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      if (portalPreviewTimerRef.current) {
        window.clearTimeout(portalPreviewTimerRef.current);
      }
    };
  }, []);

  const handleCardTilt = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;

    e.currentTarget.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    e.currentTarget.style.setProperty('--mouseX', `${(x / rect.width) * 100}%`);
    e.currentTarget.style.setProperty('--mouseY', `${(y / rect.height) * 100}%`);
  };

  const resetCardTilt = (e) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    e.currentTarget.style.setProperty('--mouseX', '50%');
    e.currentTarget.style.setProperty('--mouseY', '50%');
  };

  const openPortal = (portalId) => {
    const config = portalConfig[portalId] || portalConfig.faculty;
    setTargetPortal(portalId);
    setErrorMsg(null);

    const token = localStorage.getItem('auratrust_token');
    const currentUser = user || api.getCurrentUser();

    // If authenticated:
    if (token && currentUser) {
      if (currentUser.role === 'STUDENT' && portalId !== 'student') {
        setErrorMsg('Access Restricted: Student accounts can only access the Student Hub.');
        setIsModalOpen(true);
        return;
      }
      onTriggerTransition(portalId);
      return;
    }

    // Unauthenticated: ALWAYS require login for all portal access!
    setUsername(config.defaultUser);
    setPassword(config.defaultPass);
    if (portalPreviewTimerRef.current) {
      window.clearTimeout(portalPreviewTimerRef.current);
    }
    setIsPortalPreviewing(true);
    portalPreviewTimerRef.current = window.setTimeout(() => {
      setIsPortalPreviewing(false);
      setIsModalOpen(true);
    }, 600);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const data = await api.login(username, password);
      // Route student accounts exclusively to student hub
      let destination = targetPortal;
      if (data.role === 'STUDENT' && targetPortal !== 'student') {
        destination = 'student';
      }
      setIsModalOpen(false);
      if (onLoginSuccess) {
        onLoginSuccess(data, destination);
      } else {
        onTriggerTransition(destination);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const activeConfig = portalConfig[targetPortal] || portalConfig.faculty;
  const ActiveIcon = activeConfig.icon;

  return (
    <div className="relative z-10 w-full min-h-screen flex flex-col justify-between">
      <aside className="hidden md:flex flex-col items-center py-6 gap-8 fixed left-0 top-0 h-full w-[80px] bg-[#0a1128]/60 backdrop-blur-xl border-r border-white/5 shadow-2xl z-50">
        <button
          type="button"
          onClick={() => onTriggerTransition('landing')}
          className="mb-4 hover:scale-110 transition-transform"
          title="AuraTrust Home"
          aria-label="AuraTrust Home"
        >
          <img src="/app/auratrust_shield_logo.png" alt="AuraTrust Logo" className="w-10 h-10 object-contain drop-shadow-md" />
        </button>
        <div className="flex flex-col gap-6 items-center w-full px-2">
          <button
            type="button"
            onClick={() => onTriggerTransition('landing')}
            className="w-12 h-12 flex items-center justify-center text-secondary bg-secondary/20 border border-secondary/30 rounded-2xl transition-transform hover:scale-105 shadow-sm"
            title="Home"
            aria-label="Home"
          >
            <Home className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => openPortal('faculty')}
            className="w-12 h-12 flex items-center justify-center text-slate-400 rounded-2xl transition-all hover:bg-white/10 hover:text-white"
            title="Faculty Portal"
            aria-label="Faculty Portal"
          >
            <LayoutDashboard className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => openPortal('scanner')}
            className="w-12 h-12 flex items-center justify-center text-error bg-error/10 border border-error/20 rounded-2xl transition-all hover:scale-105 hover:bg-error hover:text-white"
            title="Camera Edge"
            aria-label="Camera Edge"
          >
            <Video className="w-6 h-6" />
          </button>
        </div>
      </aside>

      {/* Top Header */}
      <div className="flex-1 flex flex-col md:ml-[80px] w-full min-w-0 relative z-10">
      <header id="main-header" className="sticky top-0 w-full z-40 transition-all duration-300">
        <div className="flex justify-between items-center px-6 lg:px-16 py-5 max-w-7xl mx-auto h-[80px]">
          <button type="button" onClick={() => onTriggerTransition('landing')} className="font-bold text-white flex items-center gap-3 text-2xl cursor-pointer hover:scale-105 transition-transform">
            <img 
              src="/app/auratrust_shield_logo.png" 
              alt="AuraTrust Logo" 
              className="w-8 h-8 object-contain drop-shadow-md" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span>AuraTrust</span>
          </button>
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-semibold text-slate-300">
            <button 
              onClick={() => openPortal('student')} 
              className="hover:text-primary-light hover:-translate-y-0.5 transition-all"
            >
              Student Hub
            </button>
            <button 
              onClick={() => openPortal('faculty')} 
              className="hover:text-primary-light hover:-translate-y-0.5 transition-all"
            >
              Faculty Portal
            </button>
            <button 
              onClick={() => openPortal('reports')} 
              className="hover:text-primary-light hover:-translate-y-0.5 transition-all"
            >
              Admin Panel
            </button>
            <button 
              onClick={() => openPortal('scanner')} 
              className="text-error hover:text-red-400 hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
            >
              <Video className="w-4 h-4" />
              Camera Edge
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full pt-4 pb-16 px-6 lg:px-16 max-w-7xl mx-auto flex flex-col">
        {/* Hero Section */}
        <section className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 min-h-[50vh] mb-20 w-full">
          <div className="flex-1 flex flex-col justify-center items-start text-left">
            <div className="reveal-up inline-flex items-center gap-2 px-5 py-2 rounded-full glass-panel text-[#34d399] font-mono text-[13px] font-bold tracking-wide uppercase mb-6 border-white/10 shadow-lg shadow-[#34d399]/10">
              <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
              Monolith Engine Active
            </div>
            
            <h1 className="reveal-up text-[44px] lg:text-[66px] font-extrabold text-white leading-[1.08] mb-6 tracking-tight" style={{ transitionDelay: '100ms' }}>
              Frictionless Attendance.<br/>
              <span className="animate-gradient-text">Absolute Trust.</span>
            </h1>
            
            <p className="reveal-up text-[17px] lg:text-[18px] text-slate-300 leading-relaxed max-w-xl" style={{ transitionDelay: '200ms' }}>
              AuraTrust seamlessly blends advanced FaceNet512 biometrics with an authoritative Faculty workflow. Eradicate scan-and-run bunking without disrupting education.
            </p>
          </div>

          {/* Hero Image with Magnetic Parallax */}
          <div className="flex-1 w-full flex justify-center items-center reveal-scale max-w-[440px]" style={{ transitionDelay: '300ms' }}>
            <div 
              ref={magneticRef}
              className="relative w-full aspect-square rounded-[2.5rem] overflow-hidden animate-float-slow transition-transform duration-100 ease-out glass-panel flex items-center justify-center p-8 border border-white/10 shadow-2xl shadow-blue-900/30"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-secondary/10 mix-blend-overlay z-10"></div>
              <img 
                alt="Human Faces Shield" 
                className="w-full h-full object-contain relative z-20 drop-shadow-2xl scale-110" 
                src="/app/trusted-ai-shield.png"
                onError={(e) => {
                  e.target.src = '/app/auratrust_shield_logo.png';
                }}
              />
            </div>
          </div>
        </section>

        {/* 4 Portal Ecosystem Grid */}
        <section className="flex flex-col gap-8 relative z-10 w-full">
          <div className="text-center max-w-3xl mx-auto reveal-up">
            <h2 className="text-[30px] font-extrabold text-white mb-2 tracking-tight">The Ecosystem</h2>
            <p className="text-[16px] text-slate-300">Select your designated node. AuraTrust routes telemetry instantly across the classroom network.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {Object.values(portalConfig).map((portal, index) => {
              const IconComp = portal.icon;
              return (
                <div 
                  key={portal.id}
                  onClick={() => openPortal(portal.id)}
                  onMouseMove={handleCardTilt}
                  onMouseLeave={resetCardTilt}
                  className="glass-panel cursor-pointer rounded-[1.75rem] p-7 flex items-center gap-5 group border-white/10 relative transition-all duration-200 reveal-up"
                  style={{ transitionDelay: `${(index + 1) * 100}ms` }}
                >
                  <div className={`absolute top-0 right-0 w-40 h-40 ${portal.accentGlow} rounded-bl-[80px] -z-10 group-hover:scale-125 transition-transform duration-500 blur-2xl`}></div>
                  <div className={`w-14 h-14 rounded-2xl flex shrink-0 items-center justify-center border transition-all duration-300 shadow-lg ${portal.iconBox}`}>
                    <IconComp className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[20px] font-bold text-white mb-1">{portal.title}</h3>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                    <p className="text-[14px] text-slate-300 leading-relaxed">
                      {portal.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 bg-[#0a1128]/50 backdrop-blur-md py-6 px-6 lg:px-16 z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-bold text-white flex items-center gap-2 text-[15px]">
            <img 
              src="/app/auratrust_shield_logo.png" 
              alt="AuraTrust Logo" 
              className="w-5 h-5 object-contain"
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
            <span>AuraTrust</span>
          </div>
          <p className="text-[13px] font-medium text-slate-400 text-center flex-1">
            © 2026 Sentinel AI AuraTrust. All rights reserved. Zero-Trust Autonomous Attendance Architecture.
          </p>
        </div>
      </footer>

      {isPortalPreviewing && (
        <div className="portal-transition-overlay is-active" aria-live="polite" aria-label="Opening secure portal">
          <div className={`portal-transition-glow animate-flash-glow ${activeConfig.glowFlash}`} />
          <div className="portal-transition-ring portal-transition-ring-one is-active" />
          <div className="portal-transition-ring portal-transition-ring-two is-active" />
          <div
            key={`preview-shield-${targetPortal}`}
            className="portal-transition-shield-shell relative z-10 animate-shield-pulse"
          >
            <img
              src={transparentShield}
              alt=""
              className="portal-transition-shield"
            />
          </div>
          <div className="relative z-20 mt-6 text-center font-mono">
            <span className="text-xs uppercase tracking-widest text-[#94a3b8] block">Opening Secure Gateway</span>
            <span className="text-sm font-bold text-white mt-1 block tracking-wider">{activeConfig.title}</span>
          </div>
        </div>
      )}

      {/* Transparent Glass Login Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 transition-all duration-300">
          <div 
            className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setIsModalOpen(false)}
          />
          
          <div className="glass-panel rounded-[2rem] w-full max-w-md p-8 sm:p-10 relative z-10 flex flex-col gap-6 border-white/15 bg-[#111827]/95 shadow-2xl animate-in fade-in zoom-in-95">
            <button 
              className="absolute top-6 right-6 text-slate-400 hover:text-error hover:rotate-90 transition-all duration-300 bg-white/5 backdrop-blur-md w-8 h-8 rounded-full flex items-center justify-center border border-white/10"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="text-center flex flex-col items-center gap-3">
              <div className={`w-16 h-16 rounded-[1.25rem] bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center mb-1 shadow-lg ${activeConfig.color}`}>
                <ActiveIcon className="w-8 h-8" />
              </div>
              <h2 className="text-[26px] font-extrabold text-white tracking-tight">{activeConfig.title}</h2>
              <p className="text-[14px] text-slate-300 leading-relaxed px-2">{activeConfig.desc}</p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-mono">
                {errorMsg}
              </div>
            )}
            
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 mt-1">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[13px] font-semibold text-slate-300 pl-1">System ID</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-5 py-3.5 text-[15px] text-white focus:ring-2 focus:ring-primary/80 focus:bg-black/60 transition-all placeholder:text-slate-500 outline-none shadow-inner" 
                    placeholder="e.g. prof_nir or 2026-AIML-A01" 
                    type="text" 
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[13px] font-semibold text-slate-300 pl-1">Passcode</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-5 py-3.5 text-[15px] text-white focus:ring-2 focus:ring-primary/80 focus:bg-black/60 transition-all placeholder:text-slate-500 outline-none shadow-inner" 
                    placeholder="••••••••" 
                    type="password" 
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full bg-primary hover:bg-primary-light text-white rounded-2xl py-3.5 text-[15px] font-bold mt-2 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98] transition-all flex justify-center items-center gap-2 border border-white/15 disabled:opacity-60"
              >
                {isLoggingIn ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Authenticate</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
