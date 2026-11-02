import React, { useState, useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import HomePage from './components/HomePage';
import FacultyConsole from './components/faculty/FacultyConsole';
import ScannerKiosk from './components/scanner/ScannerKiosk';
import StudentPortal from './components/student/StudentPortal';
import ReportHub from './components/ReportHub';
import BackgroundMotion from './components/common/BackgroundMotion';
import PortalTransitionOverlay from './components/common/PortalTransitionOverlay';
import { api } from './services/api';
import { wsClient } from './services/websocket';

export default function App() {
  const getTabFromHash = () => {
    const hash = window.location.hash.replace('#', '');
    if (['faculty', 'student', 'scanner', 'reports'].includes(hash)) {
      return hash;
    }
    return 'landing';
  };

  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [user, setUser] = useState(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState('faculty');

  useEffect(() => {
    // Restore session if available
    const currentUser = api.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }

    // Connect resilient WebSocket
    wsClient.connect();
    const unsubscribe = wsClient.addListener((msg) => {
      if (msg.event === 'WS_CONNECTION_STATE') {
        setIsWsConnected(msg.connected);
      }
    });

    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      unsubscribe();
      window.removeEventListener('hashchange', handleHashChange);
      wsClient.disconnect();
    };
  }, []);

  const handlePortalTransition = (targetId) => {
    let safeTarget = targetId;
    const currentUser = user || api.getCurrentUser();
    if (currentUser?.role === 'STUDENT' && ['faculty', 'scanner', 'reports'].includes(targetId)) {
      safeTarget = 'student';
    } else if (!currentUser && ['faculty', 'scanner', 'student', 'reports'].includes(targetId)) {
      safeTarget = 'landing';
    }

    setTransitionTarget(safeTarget);
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(safeTarget);
      window.location.hash = safeTarget === 'landing' ? '' : safeTarget;
      setIsTransitioning(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1250);
  };

  useEffect(() => {
    if (user?.role === 'STUDENT' && ['faculty', 'scanner', 'reports'].includes(activeTab)) {
      setActiveTab('student');
      window.location.hash = 'student';
    }
  }, [user, activeTab]);

  const handleLoginSuccess = (data, preferredPortal = null) => {
    setUser({ username: data.username, role: data.role });
    const destination = preferredPortal || (data.role === 'FACULTY' || data.role === 'ADMIN' ? 'faculty' : 'student');
    handlePortalTransition(destination);
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    handlePortalTransition('landing');
  };

  return (
    <div className="relative min-h-screen bg-transparent text-on-surface selection:bg-primary/30 selection:text-white">
      {/* 1. Fluid WebGL Shader & Parallax Shields Background */}
      <BackgroundMotion />

      {/* 2. 3D Transmission & Portal Transition Overlay */}
      <PortalTransitionOverlay
        isTransitioning={isTransitioning}
        targetPortal={transitionTarget}
      />

      {/* 3. Application Shell & Content Views */}
      {activeTab === 'landing' ? (
        <HomePage
          onLoginSuccess={handleLoginSuccess}
          user={user}
          onTriggerTransition={handlePortalTransition}
        />
      ) : (
        <AppShell
          activeTab={activeTab}
          setActiveTab={handlePortalTransition}
          user={user}
          onLogout={handleLogout}
          isWsConnected={isWsConnected}
        >
          {activeTab === 'faculty' && (
            <FacultyConsole user={user} />
          )}
          {activeTab === 'scanner' && (
            <ScannerKiosk sessionId={1} />
          )}
          {activeTab === 'student' && (
            <StudentPortal user={user} />
          )}
          {activeTab === 'reports' && (
            <ReportHub />
          )}
        </AppShell>
      )}
    </div>
  );
}
