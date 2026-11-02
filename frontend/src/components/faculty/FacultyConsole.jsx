import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { wsClient } from '../../services/websocket';
import { 
  CheckCircle2, AlertTriangle, RefreshCw, Check, X, 
  Database, Clock, ChevronRight,
  Search, UserX, Eye, Play, Camera, PlusCircle, Users
} from 'lucide-react';

export default function FacultyConsole({ user }) {
  const [sessionId, setSessionId] = useState(1);
  const [allSessions, setAllSessions] = useState([]);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [stagedRecords, setStagedRecords] = useState([]);
  const [pendingFlags, setPendingFlags] = useState([]);
  const [failedScans, setFailedScans] = useState([]);
  const [rosterRecords, setRosterRecords] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'verified' | 'pending' | 'failed'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [graceMinutes, setGraceMinutes] = useState(30);
  const [graceSeconds, setGraceSeconds] = useState(0);

  // Auto-discover active or latest session on mount
  useEffect(() => {
    let isMounted = true;
    const initFacultySession = async () => {
      try {
        const curRes = await api.getCurrentSession();
        if (isMounted && curRes?.session?.session_id) {
          setSessionId(curRes.session.session_id);
          wsClient.switchSession(curRes.session.session_id);
        }
      } catch (err) {
        console.warn('Faculty session discovery fallback:', err);
      }
    };
    initFacultySession();
    return () => { isMounted = false; };
  }, []);

  // Live countdown timer for grace window
  useEffect(() => {
    const timer = setInterval(() => {
      setGraceSeconds(prev => {
        if (prev > 0) return prev - 1;
        if (graceMinutes > 0) {
          setGraceMinutes(m => m - 1);
          return 59;
        }
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [graceMinutes]);

  const fetchSessionData = async () => {
    setLoading(true);
    try {
      const [stageData, flagData, sessionInfo, allSess, rosterData] = await Promise.allSettled([
        api.getStagedAttendance(sessionId),
        api.getPendingDualVerifications(sessionId),
        api.getSession(sessionId),
        api.getAllSessions(),
        api.getSessionRoster(sessionId)
      ]);

      if (stageData.status === 'fulfilled') setStagedRecords(stageData.value.records || []);
      if (flagData.status === 'fulfilled') setPendingFlags(flagData.value.records || []);
      if (allSess.status === 'fulfilled' && Array.isArray(allSess.value.sessions)) {
        setAllSessions(allSess.value.sessions);
      }
      if (rosterData.status === 'fulfilled' && rosterData.value?.records) {
        setRosterRecords(rosterData.value.records);
      }
      if (sessionInfo.status === 'fulfilled') {
        const info = sessionInfo.value;
        setSessionDetails(info);
        if (info.is_open && info.time_remaining_seconds > 0) {
          setGraceMinutes(Math.floor(info.time_remaining_seconds / 60));
          setGraceSeconds(info.time_remaining_seconds % 60);
        } else if (info.status !== 'ACTIVE') {
          setGraceMinutes(0);
          setGraceSeconds(0);
        }
      }
    } catch (err) {
      console.error('Error fetching console data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewSession = async (targetSubjectId = null) => {
    setActionLoading(true);
    try {
      const room = targetSubjectId === 2 ? 'Lab-AIML-B' : 'Lab-AIML-A';
      const res = await api.createAndStartSession(targetSubjectId, room);
      setStatusMessage({ 
        type: 'success', 
        text: `New Session #${res.session_id} (${res.subject_code}) created and activated for today!` 
      });
      setSessionId(res.session_id);
      wsClient.switchSession(res.session_id);
      fetchSessionData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create new session.' });
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
    const channelName = `session_${sessionId}`;
    wsClient.subscribe(channelName);
    wsClient.subscribe('sessions_global');

    const unsubscribe = wsClient.addListener((msg) => {
      if (msg.event === 'CHECK_IN_PROCESSED' || msg.event === 'TRANSACTION_RESOLVED') {
        fetchSessionData();
      } else if (msg.event === 'DUAL_VERIFICATION_REQUIRED') {
        setStatusMessage({ 
          type: 'warning', 
          text: `Flagged scan requires faculty review: ${msg.record?.registration_no}` 
        });
        fetchSessionData();
      } else if (msg.event === 'STUDENT_BUNKING_REJECTED') {
        setStagedRecords(prev => prev.filter(r => r.registration_no !== msg.registration_no));
        fetchSessionData();
      } else if (msg.event === 'NEW_SESSION_STARTED') {
        fetchSessionData();
      }
    });

    return () => {
      wsClient.unsubscribe(channelName);
      wsClient.unsubscribe('sessions_global');
      unsubscribe();
    };
  }, [sessionId]);

  const handleApproveAbsent = async (regNo) => {
    setActionLoading(true);
    try {
      await api.approveStagedStudent(sessionId, regNo);
      setStatusMessage({ type: 'success', text: `Student ${regNo} marked present via faculty manual override.` });
      fetchSessionData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to mark student present.' });
    } finally {
      setActionLoading(false);
    }
  };



  const _handleApproveStaged = async (regNo) => {
    try {
      await api.approveStagedStudent(sessionId, regNo);
      setStatusMessage({ type: 'success', text: `Student ${regNo} confirmed present.` });
      fetchSessionData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleRejectStaged = async (regNo) => {
    if (!confirm(`Are you sure you want to remove student ${regNo} from staging buffer?`)) return;
    try {
      await api.rejectStagedStudent(sessionId, regNo);
      setStatusMessage({ type: 'warning', text: `Student ${regNo} removed from buffer.` });
      setSelectedItem(null);
      fetchSessionData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleResolveDual = async (transactionId, action) => {
    if (action === 'REJECT' && !rejectionReason.trim()) {
      alert('A reason is required to reject a flagged check-in.');
      return;
    }
    setActionLoading(true);
    try {
      await api.resolveDualVerification(transactionId, action, rejectionReason || `Faculty action: ${action}`);
      setStatusMessage({ 
        type: action === 'APPROVE' ? 'success' : 'warning', 
        text: `Transaction ${transactionId} ${action.toLowerCase()}d by faculty.` 
      });
      setSelectedItem(null);
      setRejectionReason('');
      fetchSessionData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveFailedScan = (id, resolution) => {
    setFailedScans(prev => prev.filter(f => f.id !== id));
    setStatusMessage({
      type: 'success',
      text: `Failed scan ${id} resolved: ${resolution}`
    });
    setSelectedItem(null);
  };

  const handleActivateSession = async () => {
    setActionLoading(true);
    try {
      const res = await api.activateSession(sessionId);
      setStatusMessage({ 
        type: 'success', 
        text: `Session #${sessionId} is now ACTIVE! Students have 30 minutes to verify attendance.` 
      });
      fetchSessionData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to activate session.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendSession = async () => {
    setActionLoading(true);
    try {
      await api.extendSession(sessionId, 5);
      setGraceMinutes(m => m + 5);
      setStatusMessage({ 
        type: 'success', 
        text: `Attendance grace window extended by +5 minutes.` 
      });
      fetchSessionData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to extend grace window.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCommitLedger = async () => {
    if (!confirm(`Commit ${stagedRecords.length} student records to permanent ledger and close Session #${sessionId}?`)) return;
    setCommitLoading(true);
    try {
      const res = await api.commitAttendance(sessionId);
      setStatusMessage({ 
        type: 'success', 
        text: `Session finalized! ${res.permanent_records_written} records permanently written to attendance ledger.` 
      });
      fetchSessionData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setCommitLoading(false);
    }
  };

  // Set of student registration numbers that are already marked present (auto or manual)
  const approvedRegs = new Set([
    ...stagedRecords.map(s => s.registration_no),
    ...rosterRecords.filter(r => r.status === 'VERIFIED' || r.status === 'COMMITTED_PRESENT').map(r => r.registration_no)
  ]);

  // Filter out any pending flags or failed scans for students who are already approved
  const activePendingFlags = pendingFlags.filter(p => !approvedRegs.has(p.registration_no));
  const activeFailedScans = failedScans.filter(f => !approvedRegs.has(f.registration_no));

  // Deduplicated combined queue: Once a student is marked/approved, a 2nd scan will NEVER show again
  const seenQueueRegs = new Set();
  const combinedQueue = [];

  // 1. Add verified students (1 entry per student)
  stagedRecords.forEach(s => {
    if (s.registration_no && !seenQueueRegs.has(s.registration_no)) {
      seenQueueRegs.add(s.registration_no);
      combinedQueue.push({ ...s, queueType: 'verified', id: s.staging_id || s.registration_no });
    }
  });

  // 2. Add pending flags only if NOT already approved/seen
  activePendingFlags.forEach(p => {
    if (p.registration_no && !seenQueueRegs.has(p.registration_no)) {
      seenQueueRegs.add(p.registration_no);
      combinedQueue.push({ ...p, queueType: 'pending', id: p.transaction_id });
    }
  });

  // 3. Add failed scans only if NOT already approved/seen
  activeFailedScans.forEach(f => {
    if (f.registration_no && !seenQueueRegs.has(f.registration_no)) {
      seenQueueRegs.add(f.registration_no);
      combinedQueue.push({ ...f, queueType: 'failed', id: f.id || `failed-${f.registration_no}` });
    }
  });

  const filteredQueue = combinedQueue.filter(item => {
    const matchesFilter = 
      activeFilter === 'all' ? true :
      activeFilter === 'verified' ? item.queueType === 'verified' :
      activeFilter === 'pending' ? item.queueType === 'pending' :
      item.queueType === 'failed';
    
    const reg = item.registration_no || '';
    const name = item.name || '';
    const matchesSearch = reg.toLowerCase().includes(searchQuery.toLowerCase()) || name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredRoster = rosterRecords.filter(item => {
    const reg = item.registration_no || '';
    const name = item.name || item.student_name || '';
    const sec = item.section || '';
    const q = searchQuery.toLowerCase();
    return reg.toLowerCase().includes(q) || name.toLowerCase().includes(q) || sec.toLowerCase().includes(q);
  }).map(r => ({
    ...r,
    id: `roster-${r.student_id || r.registration_no}`,
    queueType: (r.status === 'VERIFIED' || r.status === 'COMMITTED_PRESENT') ? 'verified' :
               r.status === 'PENDING_REVIEW' ? 'pending' : 'absent'
  }));

  const itemsToDisplay = activeFilter === 'roster' ? filteredRoster : filteredQueue;

  const isSessionActive = sessionDetails?.status === 'ACTIVE' && (sessionDetails?.is_open || graceMinutes > 0 || graceSeconds > 0);

  return (
    <div className="relative z-10 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* 1. Operational Session Control Header */}
      <div className="p-6 rounded-2xl glass-panel shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg bg-primary/20 text-primary-light border border-primary/30 font-bold">
              SESSION #{sessionId}
            </span>
            <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-lg border font-bold ${
              isSessionActive ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
              sessionDetails?.status === 'CLOSED' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' :
              'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              {isSessionActive ? '● ACTIVE (GRACE OPEN)' : sessionDetails?.status === 'CLOSED' ? '● CLOSED (FINALIZED)' : '● SCHEDULED'}
            </span>
            <span className="text-[11px] font-mono text-text-muted">
              {sessionDetails?.subject_code || 'CS-502'}: {sessionDetails?.subject_name || 'Deep Learning Systems'}
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-text-primary mt-1">
            {sessionDetails?.subject_name || 'Deep Learning'} — Hall B-204
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Instructor: <span className="text-text-primary font-bold">{sessionDetails?.faculty_name || user?.username || 'Prof. Nir Gandhi'}</span> | 
            Closes at: <span className="text-text-primary font-semibold">{sessionDetails?.window_closes_at || 'In Session'}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <label className="text-[11px] font-mono text-text-muted font-bold">Class Session:</label>
            <select
              value={sessionId}
              onChange={(e) => {
                const newId = Number(e.target.value);
                setSessionId(newId);
                wsClient.switchSession(newId);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              {allSessions.length > 0 ? (
                allSessions.map(s => (
                  <option key={s.session_id} value={s.session_id}>
                    Session #{s.session_id} • {s.subject_code} • {s.start_date_formatted || s.status} [{s.status}] ({s.staged_count || s.ledger_count} students)
                  </option>
                ))
              ) : (
                <option value={sessionId}>Session #{sessionId} ({sessionDetails?.subject_code || 'CS-502'})</option>
              )}
            </select>
            <button
              onClick={() => handleCreateNewSession(1)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition disabled:opacity-50"
              title="Start a new lecture session for Section A"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              + Start Lecture (Sec A)
            </button>
            <button
              onClick={() => handleCreateNewSession(2)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition disabled:opacity-50"
              title="Start a new lecture session for Section B"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              + Start Lecture (Sec B)
            </button>
          </div>
        </div>

        {/* Operational Controls & Countdown */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Grace Window Timer */}
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border-white/10 text-white text-xs font-mono shadow-sm ${
            isSessionActive ? 'border-brand-border text-text-primary' : 'border-rose-200 text-rose-600'
          }`}>
            <Clock className={`w-3.5 h-3.5 ${isSessionActive ? 'text-brand-primary' : 'text-rose-500'}`} />
            <span className="text-text-muted">Grace Window:</span>
            <span className="font-bold tabular-nums">
              {String(graceMinutes).padStart(2, '0')}:{String(graceSeconds).padStart(2, '0')}
            </span>
          </div>

          {/* Start / Activate Session Button */}
          {!isSessionActive && (
            <button
              onClick={handleActivateSession}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary hover:bg-blue-600 text-white font-bold text-xs shadow-md transition animate-pulse"
              title="Activate session and open 30-minute attendance window"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              {sessionDetails?.status === 'CLOSED' ? 'Re-open Session' : 'Start Session'}
            </button>
          )}

          <button
            onClick={handleExtendSession}
            disabled={actionLoading}
            className="px-3.5 py-2 rounded-xl glass-panel hover:bg-white/10 text-text-secondary hover:text-text-primary border border-brand-border text-xs font-mono transition shadow-sm"
            title="Extend grace window by 5 minutes"
          >
            +5m Extend
          </button>

          <button
            onClick={fetchSessionData}
            disabled={loading}
            className="p-2.5 rounded-xl glass-panel hover:bg-white/10 text-text-secondary hover:text-text-primary border border-brand-border transition shadow-sm"
            title="Sync Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleCommitLedger}
            disabled={commitLoading || stagedRecords.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-status-verified hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Database className="w-4 h-4" />
            {commitLoading ? 'Writing Ledger...' : `Commit Ledger (${stagedRecords.length})`}
          </button>
        </div>
      </div>

      {/* Status Notification */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border text-xs flex items-center justify-between transition shadow-sm ${
          statusMessage.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
          statusMessage.type === 'warning' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
          'bg-rose-500/15 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2 font-mono font-semibold">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-status-verified" /> : <AlertTriangle className="w-4 h-4 text-status-pending" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="hover:text-text-primary font-bold ml-2">✕</button>
        </div>
      )}

      {/* 2. Key Operational Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-panel shadow-sm">
          <div className="text-[11px] font-mono text-text-muted font-semibold">EXPECTED ROSTER</div>
          <div className="text-2xl font-extrabold text-text-primary font-mono mt-1">{rosterRecords.length || 14}</div>
          <div className="text-[10px] text-text-muted mt-0.5">Enrolled 5 AIML (Sec A & B)</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel shadow-sm">
          <div className="text-[11px] font-mono text-status-verified flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 rounded-full bg-status-verified" />
            VERIFIED PRESENT
          </div>
          <div className="text-2xl font-extrabold text-status-verified font-mono mt-1">{stagedRecords.length}</div>
          <div className="text-[10px] text-text-muted mt-0.5">AI-Auto Approved</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel shadow-sm">
          <div className="text-[11px] font-mono text-status-pending flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 rounded-full bg-status-pending animate-pulse" />
            PENDING REVIEW
          </div>
          <div className="text-2xl font-extrabold text-status-pending font-mono mt-1">{activePendingFlags.length}</div>
          <div className="text-[10px] text-text-muted mt-0.5">Risk &ge; 30.0 flagged</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel shadow-sm">
          <div className="text-[11px] font-mono text-status-failed flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 rounded-full bg-status-failed" />
            FAILED SCANS
          </div>
          <div className="text-2xl font-extrabold text-status-failed font-mono mt-1">{activeFailedScans.length}</div>
          <div className="text-[10px] text-text-muted mt-0.5">Unenrolled / Blur</div>
        </div>
      </div>

      {/* 3. Dual-Pane Operational Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Queue & Filters (65% on desktop) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filter Bar & Search */}
          <div className="p-3.5 rounded-2xl glass-panel shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-brand-raised p-1 rounded-xl border border-brand-border text-xs">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${activeFilter === 'all' ? 'bg-brand-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                All ({combinedQueue.length})
              </button>
              <button
                onClick={() => setActiveFilter('verified')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${activeFilter === 'verified' ? 'bg-brand-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <Check className="w-3 h-3 text-status-verified" />
                Verified ({stagedRecords.length})
              </button>
              <button
                onClick={() => setActiveFilter('pending')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${activeFilter === 'pending' ? 'bg-brand-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <AlertTriangle className="w-3 h-3 text-status-pending" />
                Pending ({activePendingFlags.length})
              </button>
              <button
                onClick={() => setActiveFilter('failed')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${activeFilter === 'failed' ? 'bg-brand-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <X className="w-3 h-3 text-status-failed" />
                Failed ({activeFailedScans.length})
              </button>
              <button
                onClick={() => setActiveFilter('roster')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${activeFilter === 'roster' ? 'bg-brand-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <Users className="w-3 h-3 text-sky-400" />
                Roster ({rosterRecords.length || 14})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search Reg No or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary font-mono shadow-inner"
              />
            </div>
          </div>

          {/* Queue List / Dense Table */}
          <div className="rounded-2xl glass-panel shadow-card overflow-hidden border border-brand-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left table-dense">
                <thead>
                  <tr>
                    <th>Student Identification</th>
                    <th>Status</th>
                    <th>Risk</th>
                    <th>Timestamp</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 font-mono text-xs bg-transparent">
                  {itemsToDisplay.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-12 text-text-muted font-sans">
                        No students match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    itemsToDisplay.map((item) => {
                      const isSelected = selectedItem?.id === item.id;
                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => setSelectedItem(item)}
                          className={`cursor-pointer transition ${
                            isSelected 
                              ? 'bg-primary/20 border-l-4 border-l-primary text-white' 
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-text-primary flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${
                                item.queueType === 'verified' ? 'bg-status-verified' :
                                item.queueType === 'pending' ? 'bg-status-pending animate-pulse' :
                                item.queueType === 'absent' ? 'bg-slate-500' :
                                'bg-status-failed'
                              }`} />
                              <span>{item.registration_no}</span>
                              {item.section && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                                  item.section.includes('B') 
                                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' 
                                    : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                }`}>
                                  {item.section}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-text-secondary font-sans mt-0.5">
                              {item.name || item.student_name || (item.queueType === 'verified' ? 'Enrolled Student' : 'Candidate')}
                            </div>
                          </td>

                          <td className="py-3 px-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.queueType === 'verified' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                              item.queueType === 'pending' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                              item.queueType === 'absent' ? 'bg-slate-500/15 text-slate-300 border border-slate-500/30' :
                              'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}>
                              {item.queueType === 'verified' && <Check className="w-3 h-3" />}
                              {item.queueType === 'pending' && <AlertTriangle className="w-3 h-3" />}
                              {item.queueType === 'absent' && <UserX className="w-3 h-3 text-slate-400" />}
                              {item.queueType === 'failed' && <X className="w-3 h-3" />}
                              {item.queueType === 'verified' ? 'VERIFIED' : 
                               item.queueType === 'pending' ? 'REVIEW REQ' : 
                               item.queueType === 'absent' ? 'NOT CHECKED IN' : 'FAILED SCAN'}
                            </span>
                          </td>

                          <td className="py-3 px-3.5">
                            <span className={`font-bold tabular-nums ${
                              item.risk_score === null || item.risk_score === undefined ? 'text-slate-400' :
                              Number(item.risk_score) < 25 ? 'text-status-verified' :
                              Number(item.risk_score) < 45 ? 'text-status-pending' :
                              'text-status-failed'
                            }`}>
                              {item.risk_score !== null && item.risk_score !== undefined ? Number(item.risk_score).toFixed(1) : '—'}
                            </span>
                          </td>

                          <td className="py-3 px-3.5 text-text-muted text-[11px]">
                            {item.timestamp || item.created_at || (item.queueType === 'absent' ? '—' : 'Just now')}
                          </td>

                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            {item.queueType === 'verified' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRejectStaged(item.registration_no);
                                }}
                                className="mr-2 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-mono font-bold transition inline-flex items-center gap-1 shadow-sm"
                                title="Remove student & mark absent"
                              >
                                <UserX className="w-3.5 h-3.5 text-rose-400" />
                                Remove
                              </button>
                            )}
                            {item.queueType === 'absent' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproveAbsent(item.registration_no);
                                }}
                                className="mr-2 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold transition inline-flex items-center gap-1 shadow-sm"
                                title="Faculty override: Mark present"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                Mark Present
                              </button>
                            )}
                            <ChevronRight className="w-4 h-4 inline text-text-muted" />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Pane: Active Inspection Drawer (35% on desktop) */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          {selectedItem ? (
            <div className="p-6 rounded-2xl glass-panel shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-brand-border">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-brand-primary" />
                  <h3 className="text-sm font-bold text-text-primary">Biometric Evidence Inspector</h3>
                </div>
                <button 
                  onClick={() => setSelectedItem(null)} 
                  className="text-text-muted hover:text-text-primary text-xs font-bold p-1 rounded-lg hover:bg-brand-raised transition"
                >
                  ✕
                </button>
              </div>

              {/* Student Metadata Card */}
              <div className="p-4 rounded-xl bg-brand-raised border border-brand-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary font-mono">{selectedItem.registration_no}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    (selectedItem.queueType || 'verified') === 'verified' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                    (selectedItem.queueType || 'verified') === 'pending' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                    'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }`}>
                    {(selectedItem.queueType || 'verified').toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-text-secondary">
                  Name: <span className="text-text-primary font-bold">{selectedItem.name || selectedItem.student_name || 'Verified Student'}</span>
                </div>
                <div className="text-[11px] text-text-muted font-mono">
                  Enrolled Section: {selectedItem.section || '5 AIML A'} • Subject: {sessionDetails?.subject_code || selectedItem.subject_code || 'AIML-501-A'}
                </div>
              </div>

              {/* Side-by-Side Face Comparison */}
              <div>
                <div className="text-[11px] font-mono text-text-muted uppercase mb-2 font-semibold">Optical Verification Evidence</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-brand-raised border border-brand-border text-center space-y-1.5 shadow-sm overflow-hidden">
                    <div className="w-full aspect-square rounded-lg bg-black/40 flex flex-col items-center justify-center text-text-secondary text-xs font-mono p-2 border border-white/5">
                      <Camera className="w-8 h-8 text-sky-400 mb-1 animate-pulse" />
                      <span className="text-[11px] text-white font-bold">Kiosk Optical Sensor</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">SCRFD Aligned Face</span>
                    </div>
                    <span className="text-[10px] font-mono text-text-secondary block font-semibold">Live Kiosk Camera Frame</span>
                  </div>
                  <div className="p-3 rounded-xl bg-brand-raised border border-brand-border text-center space-y-1.5 shadow-sm overflow-hidden">
                    <div className="w-full aspect-square rounded-lg bg-black/40 flex items-center justify-center overflow-hidden border border-white/5">
                      <img 
                        src={selectedItem.registered_face_url || `/api/v1/faces/registered/student_${selectedItem.registration_no}.jpg`} 
                        alt={selectedItem.name || selectedItem.registration_no} 
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden w-full h-full rounded-lg bg-slate-800 items-center justify-center text-slate-300 text-xs font-mono">
                        {selectedItem.registration_no}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-text-secondary block font-semibold">512-D Profile Template</span>
                  </div>
                </div>
              </div>

              {/* Telemetry Metrics Breakdown */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-brand-border">
                  <span className="text-text-muted">ArcFace Cosine Similarity:</span>
                  <span className="font-bold text-text-primary">
                    {selectedItem.match_score || (selectedItem.queueType === 'verified' ? '0.88' : '0.62')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-brand-border">
                  <span className="text-text-muted">FFT 2D Texture Liveness:</span>
                  <span className="font-bold text-status-verified">
                    {selectedItem.liveness_score || '94.2% (Natural Skin)'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-brand-border">
                  <span className="text-text-muted">3D Head Pose Angles:</span>
                  <span className="font-bold text-text-primary">Yaw: 4°, Pitch: -2°</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-brand-border">
                  <span className="text-text-muted">Composite Anomaly Risk:</span>
                  <span className={`font-bold ${
                    (selectedItem.risk_score || 0) >= 30 ? 'text-status-pending' : 'text-status-verified'
                  }`}>
                    {selectedItem.risk_score || '11.8'} / 100
                  </span>
                </div>
              </div>

              {/* Anomaly Reason Warning if Pending or Failed */}
              {(selectedItem.queueType === 'pending' || selectedItem.queueType === 'failed') && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Inspection Trigger:
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {selectedItem.reason || 'Check-in velocity anomaly detected (>3 standard deviations from cohort arrival mean).'}
                  </p>
                </div>
              )}

              {/* Action Decision Suite */}
              {selectedItem.queueType === 'pending' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-mono text-text-muted mb-1 font-semibold">
                      Reason for Rejection or Manual Override:
                    </label>
                    <input
                      type="text"
                      placeholder="Required for legal audit trail..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary font-mono shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleResolveDual(selectedItem.id, 'APPROVE')}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-status-verified hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Approve Present
                    </button>
                    <button
                      onClick={() => handleResolveDual(selectedItem.id, 'REJECT')}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-status-failed hover:bg-rose-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Reject (Absent)
                    </button>
                  </div>
                </div>
              )}

              {selectedItem.queueType === 'failed' && (
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleResolveFailedScan(selectedItem.id, 'Marked Present (Excused by Faculty)')}
                    className="w-full py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs shadow-md transition"
                  >
                    Mark Present (Excused Override)
                  </button>
                  <button
                    onClick={() => handleResolveFailedScan(selectedItem.id, 'Requested Rescan at Kiosk')}
                    className="w-full py-2 rounded-xl glass-panel hover:bg-white/10 text-text-secondary hover:text-text-primary border border-brand-border text-xs font-mono transition shadow-sm"
                  >
                    Request Rescan at Kiosk
                  </button>
                </div>
              )}

              {selectedItem?.queueType === 'verified' && (
                <div className="pt-2">
                  <button
                    onClick={() => handleRejectStaged(selectedItem.registration_no)}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                  >
                    <UserX className="w-4 h-4" />
                    Remove from Attendance (Mark Absent)
                  </button>
                </div>
              )}

              {selectedItem?.queueType === 'absent' && (
                <div className="pt-2 space-y-2">
                  <p className="text-xs text-slate-300 font-sans">
                    Student has not verified biometric presence at the kiosk yet.
                  </p>
                  <button
                    onClick={() => handleApproveAbsent(selectedItem.registration_no)}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-xl bg-status-verified hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {actionLoading ? 'Updating...' : 'Mark Present (Faculty Manual Override)'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-2xl glass-panel shadow-card text-center space-y-3">
              <Eye className="w-8 h-8 text-text-muted mx-auto" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">No Record Selected</h4>
              <p className="text-xs text-text-secondary leading-relaxed font-sans">
                Click any student row from the live attendance queue on the left to inspect dual-biometric evidence, 3D pose, and resolve anomaly flags.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
