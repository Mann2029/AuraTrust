import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { wsClient } from '../../services/websocket';
import { 
  Camera, Upload, CheckCircle2, AlertTriangle, ShieldAlert, 
  Volume2, VolumeX, Zap, 
  RefreshCw, UserCheck, Lock, Unlock, Square, PlusCircle, Timer, FlipHorizontal
} from 'lucide-react';

export default function ScannerKiosk({ sessionId: initialSessionId = 1 }) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [streamActive, setStreamActive] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [scanState, setScanState] = useState('IDLE'); // 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FLAGGED' | 'DENIED'
  const [scanResult, setScanResult] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [facultyAuthorized, setFacultyAuthorized] = useState(false);
  const [activating, setActivating] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [extendingSession, setExtendingSession] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(0);
  const [autoCapture, setAutoCapture] = useState(true);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [clock, setClock] = useState('');
  const facultyName = 'Prof. Nir Gandhi';
  const [allSessions, setAllSessions] = useState([]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const isProcessingRef = useRef(false);
  const cooldownMapRef = useRef({}); // { [regNo]: timestamp }
  const autoScanTimerRef = useRef(null);

  // Auto-discover today's active session on mount
  useEffect(() => {
    let isMounted = true;
    const autoDiscoverSession = async () => {
      try {
        const curRes = await api.getCurrentSession();
        if (isMounted && curRes?.session?.session_id) {
          setSessionId(curRes.session.session_id);
          wsClient.switchSession(curRes.session.session_id);
        }
      } catch (err) {
        console.warn('Auto-session discovery error:', err);
      }
    };
    autoDiscoverSession();
    return () => { isMounted = false; };
  }, []);

  // 1. Fetch real session status & timer
  const checkSession = useCallback(async () => {
    try {
      const [data, sessRes] = await Promise.allSettled([
        api.getSession(sessionId),
        api.getAllSessions()
      ]);
      if (data.status === 'fulfilled') {
        const d = data.value;
        setSessionStatus(d);
        if (d?.status === 'ACTIVE') {
          setFacultyAuthorized(true);
          if (d.time_remaining_seconds !== undefined) {
            setTimeRemainingSeconds(Math.max(0, d.time_remaining_seconds));
          }
        } else {
          setFacultyAuthorized(false);
          setTimeRemainingSeconds(0);
        }
      }
      if (sessRes.status === 'fulfilled' && Array.isArray(sessRes.value.sessions)) {
        setAllSessions(sessRes.value.sessions);
      }
    } catch (e) {
      console.warn('Session query error:', e);
    }
  }, [sessionId]);

  // Live countdown timer for active session grace window
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Load live staged records from MySQL
  const loadStagedAttendance = useCallback(async () => {
    try {
      const stageData = await api.getStagedAttendance(sessionId);
      if (stageData && Array.isArray(stageData.records)) {
        const records = stageData.records.map(r => ({
          regNo: r.registration_no,
          name: r.name || r.student_name || r.registration_no,
          time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString(),
          method: r.verification_method || 'Face Vector (512-D)',
          risk: r.risk_score || 0.0,
          status: 'Verified'
        }));
        setRecentCheckIns(records.reverse());
      }
    } catch (e) {
      console.warn('Failed to load staged attendance:', e);
    }
  }, [sessionId]);

  // 3. Web Audio chime generator
  const playChime = useCallback((type = 'success') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(329.63, audioCtx.currentTime); // E4
        osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.2); // A3
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch {
      // Audio not supported or gesture blocked
    }
  }, [soundEnabled]);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  }, []);

  // 4. Initialize session, clock, and WebSocket subscription
  useEffect(() => {
    checkSession();
    loadStagedAttendance();

    const updateClock = () => {
      setClock(new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    updateClock();
    const clockTimer = window.setInterval(updateClock, 1000);

    // Subscribe to real-time WebSocket channel for this session
    const channelName = `session_${sessionId}`;
    wsClient.subscribe(channelName);

    const unsubscribeWs = wsClient.addListener((msg) => {
      if (msg.event === 'STUDENT_CHECKIN_SUCCESS') {
        const newRecord = {
          regNo: msg.registration_no,
          name: msg.name || msg.student_name || msg.registration_no,
          time: msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          method: msg.method || 'Face Vector (512-D)',
          risk: msg.risk_score || 0.0,
          status: 'Verified'
        };

        setRecentCheckIns(prev => {
          // Avoid duplicate entry if already present
          if (prev.some(p => p.regNo === newRecord.regNo)) return prev;
          return [newRecord, ...prev];
        });
      } else if (msg.event === 'SESSION_ACTIVATED') {
        if (msg.session_id && msg.session_id !== sessionId) {
          setSessionId(msg.session_id);
          wsClient.switchSession(msg.session_id);
          setSuccessToast(`Live Session #${msg.session_id} (${msg.subject_code || 'Lecture'}) activated! Scanning enabled.`);
        }
        setFacultyAuthorized(true);
        checkSession();
        playChime('success');
      } else if (msg.event === 'SESSION_COMMITTED_AND_CLOSED') {
        if (msg.session_id === sessionId) {
          setFacultyAuthorized(false);
          setTimeRemainingSeconds(0);
          checkSession();
        }
      } else if (msg.event === 'TRANSACTION_RESOLVED' || msg.event === 'ATTENDANCE_STAGED') {
        loadStagedAttendance();
      } else if (msg.event === 'STUDENT_BUNKING_REJECTED') {
        setRecentCheckIns(prev => prev.filter(p => p.regNo !== msg.registration_no));
        loadStagedAttendance();
      } else if (msg.event === 'NEW_SESSION_STARTED') {
        checkSession();
      }
    });

    wsClient.subscribe('sessions_global');

    return () => {
      window.clearInterval(clockTimer);
      wsClient.unsubscribe(channelName);
      wsClient.unsubscribe('sessions_global');
      unsubscribeWs();
      stopCamera();
    };
  }, [sessionId, checkSession, loadStagedAttendance, playChime]);

  // 5. Phase 1: Faculty Biometric Unlock via Camera
  const handleFacultyUnlock = async (imageFile, isAuto = false) => {
    if (!imageFile) {
      if (!isAuto) setErrorMessage('Camera image required for faculty biometric authentication.');
      return;
    }
    setActivating(true);
    if (!isAuto) setErrorMessage(null);
    try {
      const res = await api.startSession(sessionId, imageFile);
      setFacultyAuthorized(true);
      await checkSession();
      playChime('success');
      const simPercent = res.match_similarity ? ` (${(res.match_similarity * 100).toFixed(1)}% match)` : '';
      setSuccessToast(`Faculty identity verified${simPercent}! Session #${sessionId} unlocked.`);
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (e) {
      if (!isAuto) {
        setErrorMessage(e.message || 'Faculty authorization failed: Live face does not match Prof. Nir Gandhi.');
        playChime('warning');
      }
    } finally {
      setActivating(false);
    }
  };

  const captureFacultyFrame = (isAuto = false) => {
    if (!videoRef.current || !canvasRef.current || activating || isProcessingRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      if (!isAuto) setErrorMessage('Camera sensor initializing. Please wait a moment.');
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'faculty_camera_unlock.jpg', { type: 'image/jpeg' });
      await handleFacultyUnlock(file, isAuto);
    }, 'image/jpeg', 0.95);
  };

  // 6. Extend Attendance Grace Window by 5 Minutes
  const handleExtend5Minutes = async () => {
    setExtendingSession(true);
    setErrorMessage(null);
    try {
      await api.extendSession(sessionId, 5);
      await checkSession();
      playChime('success');
      setSuccessToast(`Session #${sessionId} extended by +5 minutes!`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (e) {
      setErrorMessage(e.message || 'Failed to extend session window.');
    } finally {
      setExtendingSession(false);
    }
  };

  // 7. End Session & Commit Attendance to Permanent Ledger
  const handleEndSession = async () => {
    if (!window.confirm(`Are you sure you want to end Session #${sessionId}? This will commit all ${recentCheckIns.length} verified student(s) to the permanent ledger and close the attendance window.`)) {
      return;
    }

    setClosingSession(true);
    setErrorMessage(null);
    try {
      const res = await api.closeSession(sessionId);
      setFacultyAuthorized(false);
      await checkSession();
      playChime('success');
      setSuccessToast(`Session #${sessionId} successfully closed! ${res.permanent_records_written || recentCheckIns.length} attendance records committed.`);
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (e) {
      setErrorMessage(e.message || 'Failed to close session. Please try again.');
    } finally {
      setClosingSession(false);
    }
  };

  // 6. Camera stream management
  const startCamera = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
      setErrorMessage('Optical camera sensor unavailable. Please allow camera permissions or use upload.');
    }
  };



  // 7. Core Verification Executor
  const executeVerification = async (file, isAuto = false) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    if (!isAuto) setScanState('PROCESSING');
    setErrorMessage(null);

    try {
      const result = await api.verifyAttendance(sessionId, file);
      setScanResult(result);

      if (result.status === 'AUTO_APPROVED' || result.status === 'ALREADY_VERIFIED' || result.already_marked) {
        const regNo = result.registration_no;
        const now = Date.now();
        const lastSeen = cooldownMapRef.current[regNo] || 0;

        // Debounce / cooldown: If this exact student was verified within 15 seconds, don't spam
        if (now - lastSeen > 15000) {
          cooldownMapRef.current[regNo] = now;
          setScanState('SUCCESS');
          playChime('success');

          const newRecord = {
            regNo: result.registration_no,
            name: result.name || result.student_name || 'Verified Student',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            method: result.verification_method || 'Face Vector (512-D)',
            risk: result.risk_score || 0.0,
            status: result.status === 'ALREADY_VERIFIED' || result.already_marked ? 'Already Verified' : 'Verified'
          };

          setRecentCheckIns(prev => {
            if (prev.some(p => p.regNo === newRecord.regNo)) return prev;
            return [newRecord, ...prev];
          });

          // Reset reticle back to IDLE after 2.5s
          setTimeout(() => {
            setScanState('IDLE');
          }, 2500);
        } else {
          // Already marked, subtle flash
          setScanState('SUCCESS');
          setTimeout(() => setScanState('IDLE'), 1200);
        }
      } else if (result.status === 'QUEUED_FOR_DUAL_VERIFICATION') {
        setScanState('FLAGGED');
        playChime('warning');
        setTimeout(() => setScanState('IDLE'), 3500);
      } else {
        setScanState('DENIED');
        playChime('warning');
        setTimeout(() => setScanState('IDLE'), 3000);
      }
    } catch (err) {
      if (!isAuto) {
        setErrorMessage(err.message || 'Check-in denied: Verification rejected by security pipeline.');
        setScanState('DENIED');
        playChime('warning');
        setTimeout(() => setScanState('IDLE'), 3000);
      } else {
        // Auto-scan gracefully resets reticle on network drop/abort
        setScanState('IDLE');
      }
    } finally {
      isProcessingRef.current = false;
    }
  };

  // 8. Capture frame from canvas
  const captureFrame = (isAuto = false) => {
    if (!videoRef.current || !canvasRef.current || isProcessingRef.current || (isAuto && scanState !== 'IDLE')) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'kiosk_capture.jpg', { type: 'image/jpeg' });
      await executeVerification(file, isAuto);
    }, 'image/jpeg', 0.92);
  };

  // 9. Phase 2: Live Continuous Auto-Capture Loop (Chained setTimeout to prevent congestion)
  useEffect(() => {
    let timer = null;
    let isCancelled = false;

    const scheduleNextScan = () => {
      if (isCancelled) return;
      timer = setTimeout(async () => {
        if (!isProcessingRef.current && scanState === 'IDLE' && streamActive && autoCapture && sessionStatus?.status === 'ACTIVE') {
          captureFrame(true);
        }
        scheduleNextScan();
      }, 2500); // Clean 2.5s interval between complete scans
    };

    if (streamActive && autoCapture && sessionStatus?.status === 'ACTIVE') {
      scheduleNextScan();
    }

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [streamActive, autoCapture, sessionStatus?.status, scanState]);

  // Live continuous auto-capture for Phase 1 (Faculty optical camera verification)
  useEffect(() => {
    let timer = null;
    let isCancelled = false;

    const scheduleFacultyScan = () => {
      if (isCancelled) return;
      timer = setTimeout(async () => {
        if (!activating && streamActive && autoCapture && sessionStatus && sessionStatus.status !== 'ACTIVE') {
          captureFacultyFrame(true);
        }
        scheduleFacultyScan();
      }, 3000);
    };

    if (streamActive && autoCapture && sessionStatus && sessionStatus.status !== 'ACTIVE') {
      scheduleFacultyScan();
    }

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [streamActive, autoCapture, sessionStatus?.status, activating]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!facultyAuthorized) {
        handleFacultyUnlock(file);
      } else {
        executeVerification(file, false);
      }
    }
  };

  const stateTone = {
    SUCCESS: 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10',
    FLAGGED: 'text-amber-300 border-amber-400/40 bg-amber-400/10',
    DENIED: 'text-rose-300 border-rose-400/40 bg-rose-400/10',
  }[scanState] || 'text-slate-300 border-white/10 bg-white/[0.03]';

  const reticleTone = {
    SUCCESS: 'border-emerald-400 shadow-[0_0_65px_rgba(16,185,129,0.5)]',
    FLAGGED: 'border-amber-400 shadow-[0_0_65px_rgba(234,179,8,0.45)]',
    DENIED: 'border-rose-400 shadow-[0_0_65px_rgba(239,68,68,0.5)]',
    PROCESSING: 'border-sky-300 animate-pulse shadow-[0_0_55px_rgba(59,130,246,0.4)]',
  }[scanState] || 'border-sky-400/70 shadow-[0_0_55px_rgba(59,130,246,0.3)]';

  const isSessionActive = sessionStatus?.status === 'ACTIVE' && facultyAuthorized;
  const minutesLeft = Math.floor(timeRemainingSeconds / 60);
  const secondsLeft = timeRemainingSeconds % 60;

  return (
    <div className="relative z-10 min-h-full w-full px-3 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5">
        
        {/* Top Kiosk Header */}
        <header className="flex flex-col gap-4 border-b border-white/10 bg-[#0a1128]/55 px-4 py-3 rounded-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between shadow-lg">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-sky-400" />
              <h1 className="text-lg font-extrabold tracking-tight text-white">Camera Edge Node</h1>
            </div>
            <div className="hidden h-5 w-px bg-white/20 sm:block" />
            
            {/* Session Selector */}
            <select 
              value={sessionId} 
              onChange={(e) => {
                const newId = Number(e.target.value);
                setSessionId(newId);
                wsClient.switchSession(newId);
              }}
              className="custom-select rounded-full border border-slate-600/50 bg-[#1e293b]/90 px-3.5 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-blue-400 font-mono cursor-pointer"
            >
              {allSessions.length > 0 ? (
                allSessions.map(s => (
                  <option key={s.session_id} value={s.session_id}>
                    Session #{s.session_id}: {s.subject_code} • {s.start_date_formatted || s.status} [{s.status}]
                  </option>
                ))
              ) : (
                <option value={sessionId}>Session #{sessionId}</option>
              )}
            </select>

            <span className="text-xs font-mono text-slate-400 hidden lg:inline">
              Faculty: <strong className="text-white">{facultyName}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Session Window Countdown & Grace Controls */}
            {isSessionActive && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold">
                  <Timer className="w-3.5 h-3.5" />
                  <span>{minutesLeft}m {secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}s</span>
                </div>

                <button
                  onClick={handleExtend5Minutes}
                  disabled={extendingSession}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 transition disabled:opacity-50"
                  title="Extend session grace window by +5 minutes"
                >
                  <PlusCircle className="w-3 h-3 text-emerald-400" />
                  +5m
                </button>
              </div>
            )}

            {/* End Session Button */}
            {isSessionActive && (
              <button
                onClick={handleEndSession}
                disabled={closingSession}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 shadow-md transition disabled:opacity-50"
                title="Commit attendance to MySQL ledger and close session"
              >
                <Square className="w-3 h-3 fill-rose-400 text-rose-400" />
                {closingSession ? 'Closing...' : 'End Session'}
              </button>
            )}

            {/* Auto-Capture Indicator & Toggle */}
            <button
              onClick={() => setAutoCapture(!autoCapture)}
              disabled={!isSessionActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold transition border ${
                autoCapture && isSessionActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              } disabled:opacity-40`}
              title="Toggle continuous biometric auto-capture"
            >
              <Zap className={`h-3.5 w-3.5 ${autoCapture && isSessionActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              Auto-Capture: {autoCapture && isSessionActive ? 'ACTIVE' : 'OFF'}
            </button>

            {/* Session State Badge */}
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
              <span className={`h-2.5 w-2.5 rounded-full ${isSessionActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {isSessionActive ? 'Active' : 'Locked'}
            </div>

            {/* Sound Toggle */}
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)} 
              className="rounded-full border border-white/10 bg-white/5 p-2 text-emerald-400 transition hover:bg-white/10" 
              aria-label="Toggle Chimes"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
            </button>

            {/* Live Clock */}
            <span className="hidden font-mono text-base font-bold tracking-widest text-slate-300 sm:inline">{clock}</span>
          </div>
        </header>

        {/* Success Toast */}
        {successToast && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-xs font-mono text-emerald-300 shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-400 font-bold hover:text-white">✕</button>
          </div>
        )}

        {/* Main View: Camera Viewport + Verification Log */}
        <div className="flex flex-col gap-6 xl:flex-row">
          
          {/* Left: Optical Camera Viewport */}
          <section className="relative min-h-[460px] flex-1 rounded-[1.75rem] border border-white/10 bg-black/30 p-2 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
            <div className={`relative h-full min-h-[440px] overflow-hidden rounded-[1.4rem] border-2 transition-all duration-500 ${reticleTone}`}>
              
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`h-full min-h-[440px] w-full object-cover transition-transform duration-200 ${isMirrored ? '-scale-x-100' : ''} ${streamActive ? 'block' : 'hidden'}`} 
                style={{ filter: 'contrast(1.08) saturate(1.12) brightness(1.04)' }} 
              />

              {/* Camera Offline Overlay */}
              {!streamActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#0c152d] to-[#030817] px-6 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-sky-400/50 bg-sky-400/10 text-sky-300 shadow-[0_0_40px_rgba(56,189,248,0.25)]">
                    <Camera className="h-9 w-9" />
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-white">Camera Sensor Idle</h2>
                  <p className="mt-2 max-w-md text-sm text-slate-300">
                    Initialize the optical camera feed to begin automated biometric presence verification.
                  </p>
                  <button 
                    onClick={startCamera} 
                    className="mt-5 rounded-full border border-sky-400/40 bg-sky-500/20 px-6 py-2.5 text-xs font-mono uppercase tracking-widest text-sky-300 transition hover:bg-sky-500/30 shadow-lg"
                  >
                    Start Camera Sensor
                  </button>
                </div>
              )}

              {/* Phase 1: Faculty Camera Verification Overlay & Live Reticle HUD */}
              {streamActive && !isSessionActive && (
                <>
                  {/* Amber Corner Brackets */}
                  <div className="pointer-events-none absolute inset-8">
                    <div className="absolute left-0 top-0 h-11 w-11 rounded-tl-xl border-l-4 border-t-4 border-amber-400" />
                    <div className="absolute right-0 top-0 h-11 w-11 rounded-tr-xl border-r-4 border-t-4 border-amber-400" />
                    <div className="absolute bottom-0 left-0 h-11 w-11 rounded-bl-xl border-b-4 border-l-4 border-amber-400" />
                    <div className="absolute bottom-0 right-0 h-11 w-11 rounded-br-xl border-b-4 border-r-4 border-amber-400" />
                  </div>

                  {/* Centered Faculty Target Reticle */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`h-64 w-64 rounded-2xl border-2 transition-all duration-300 relative flex items-center justify-center ${
                      activating 
                        ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_35px_rgba(245,158,11,0.5)] animate-pulse' 
                        : 'border-dashed border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                    }`}>
                      <div className="absolute top-2 left-2 text-[10px] font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30">
                        FACULTY BIOMETRIC SENSOR
                      </div>
                      <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                        <Lock className="w-8 h-8" />
                      </div>
                    </div>
                  </div>

                  {/* Top HUD Status Pill */}
                  <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
                    <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-[#050b1c]/85 px-3.5 py-1 text-[11px] font-mono font-bold text-amber-300 shadow-xl backdrop-blur-md">
                      <Lock className="w-3.5 h-3.5" />
                      <span>PHASE 1: FACULTY CAMERA VERIFICATION</span>
                    </div>
                    <div className="rounded-full border border-white/10 bg-[#050b1c]/85 px-3 py-1 text-[10px] font-mono text-slate-300 backdrop-blur-md">
                      Required: <span className="text-white font-bold">{facultyName}</span>
                    </div>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="absolute bottom-4 inset-x-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-[#050b1c]/90 p-3.5 shadow-2xl backdrop-blur-md">
                    <div className="text-left">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <Camera className="w-4 h-4 text-amber-400" />
                        <span>Camera Biometric Verification</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5 font-sans">
                        Position <strong className="text-amber-300">{facultyName}</strong> in camera view to authorize Session #{sessionId}.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => captureFacultyFrame(false)}
                        disabled={activating}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-xl transition disabled:opacity-50 font-mono tracking-wide"
                      >
                        <Camera className="w-4 h-4" />
                        {activating ? 'Verifying Face via Camera...' : 'Verify Faculty via Camera'}
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono border border-white/15 transition"
                        title="Optical faculty photo upload fallback"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Phase 2: Active Reticle HUD & Corner Brackets */}
              {streamActive && isSessionActive && (
                <>
                  <div className="pointer-events-none absolute inset-8">
                    <div className="absolute left-0 top-0 h-11 w-11 rounded-tl-xl border-l-4 border-t-4 border-current text-sky-400" />
                    <div className="absolute right-0 top-0 h-11 w-11 rounded-tr-xl border-r-4 border-t-4 border-current text-sky-400" />
                    <div className="absolute bottom-0 left-0 h-11 w-11 rounded-bl-xl border-b-4 border-l-4 border-current text-sky-400" />
                    <div className="absolute bottom-0 right-0 h-11 w-11 rounded-br-xl border-b-4 border-r-4 border-current text-sky-400" />
                  </div>

                  {/* Centered Face Reticle */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`h-64 w-64 rounded-2xl border-2 transition-all duration-300 ${reticleTone}`} />
                  </div>

                  {/* Live HUD Status Strip */}
                  <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3">
                    <div className="rounded-xl border-l-4 border-blue-400 bg-[#0a1128]/85 p-3 font-mono text-[11px] text-white backdrop-blur-md shadow-xl">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>InsightFace SCRFD + ArcFace (512-D GPU)</span>
                      </div>
                      <div className="mt-1 text-emerald-400">
                        {scanState === 'PROCESSING' 
                          ? 'Extracting biometric vector & evaluating liveness...' 
                          : autoCapture 
                            ? 'Auto-Capture Active | Step in front of camera' 
                            : 'Camera Ready | Click Verify Presence below'}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        type="button"
                        onClick={() => setIsMirrored(prev => !prev)} 
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-mono font-bold transition shadow-sm ${
                          isMirrored 
                            ? 'border-sky-400/40 bg-sky-500/20 text-sky-300 hover:bg-sky-500/30' 
                            : 'border-white/15 bg-[#050b1c]/85 text-slate-300 hover:bg-white/10'
                        }`}
                        title="Toggle Mirror (Left-to-Left Selfie Mode)"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                        <span>{isMirrored ? 'Mirror: ON' : 'Mirror: OFF'}</span>
                      </button>
                      <button 
                        onClick={stopCamera} 
                        className="rounded-lg border border-white/15 bg-[#050b1c]/85 px-3 py-2 text-[11px] font-mono text-slate-300 hover:bg-white/10 transition"
                      >
                        Stop
                      </button>
                      <button 
                        onClick={() => captureFrame(false)} 
                        disabled={scanState === 'PROCESSING'} 
                        className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-[11px] font-bold text-white shadow-lg transition disabled:opacity-50"
                      >
                        {scanState === 'PROCESSING' ? 'Processing...' : 'Verify Presence'}
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="rounded-lg border border-white/15 bg-[#050b1c]/85 px-3 py-2 text-[11px] font-mono text-slate-300 hover:bg-white/10 transition"
                      >
                        Upload
                      </button>
                    </div>
                  </div>
                </>
              )}

              <canvas ref={canvasRef} className="hidden" />
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>
          </section>

          {/* Right: Real-time Verification Log */}
          <aside className="flex w-full flex-col gap-4 xl:w-[32%]">
            <div className="flex items-center justify-between border-b border-white/10 px-2 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">Live Verification Log</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/20 text-primary-light border border-primary/30">
                  {recentCheckIns.length} Present
                </span>
              </div>
              <button 
                onClick={loadStagedAttendance}
                className="text-slate-400 hover:text-white p-1 transition"
                title="Refresh staged records"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px] pr-1">
              
              {/* Most Recent Scan Result Callout */}
              {scanResult && (
                <div className={`rounded-2xl border-l-4 p-4 shadow-lg ${stateTone}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-white">
                        {scanResult.name || scanResult.student_name || scanResult.registration_no || 'Check-in Processed'}
                      </h3>
                      <p className="mt-1 font-mono text-[11px] text-slate-300">
                        {scanResult.registration_no} • {scanResult.section || '5 AIML'}
                      </p>
                    </div>
                    {scanState === 'SUCCESS' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : scanState === 'FLAGGED' ? (
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-rose-400" />
                    )}
                  </div>
                  <div className="mt-3 flex justify-between text-[11px] font-mono">
                    <span className="rounded bg-white/10 px-2 py-0.5 uppercase font-bold">
                      {scanResult.status || scanState}
                    </span>
                    <span>Risk: {scanResult.risk_score?.toFixed(1) || '0.0'} / 100</span>
                  </div>
                </div>
              )}

              {/* Live Staged Check-In Cards */}
              {recentCheckIns.map((st, idx) => (
                <div 
                  key={`${st.regNo}-${idx}`} 
                  className="rounded-2xl border border-white/10 border-l-4 border-l-emerald-400 bg-[#0d1b3d]/70 p-3.5 shadow-xl backdrop-blur-xl transition hover:border-white/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar preview */}
                      <img 
                        src={`/api/v1/faces/registered/student_${st.regNo}.jpg`} 
                        alt={st.name}
                        className="w-10 h-10 rounded-xl object-cover border border-white/15 bg-slate-800 shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div>
                        <h3 className="font-extrabold tracking-tight text-white text-sm">{st.name}</h3>
                        <p className="font-mono text-[11px] text-slate-400">{st.regNo}</p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  </div>
                  
                  <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400 border-t border-white/5 pt-2">
                    <span className="rounded bg-emerald-400/15 px-2 py-0.5 font-bold uppercase text-emerald-300">
                      {st.status || 'Verified'}
                    </span>
                    <span>{st.time}</span>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {recentCheckIns.length === 0 && !scanResult && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs font-mono text-slate-400 space-y-2">
                  <UserCheck className="w-8 h-8 mx-auto text-slate-500 opacity-60" />
                  <p>No check-ins recorded yet for Session #{sessionId}.</p>
                  <p className="text-[11px] text-slate-500">
                    {isSessionActive 
                      ? 'Auto-capture is active and awaiting students in camera view.' 
                      : 'Authorize session to begin student check-ins.'}
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Bottom Error / Warning Toast */}
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-xs font-mono text-rose-300 shadow-lg">
            <ShieldAlert className="h-4 w-4 shrink-0" /> {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
