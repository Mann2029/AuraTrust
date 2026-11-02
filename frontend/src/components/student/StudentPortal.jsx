import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  AlertTriangle, Sparkles, Send, ShieldCheck, 
  BookOpen, CheckCircle, Clock, Check, RefreshCw,
  GraduationCap, ChevronDown
} from 'lucide-react';

const COHORT_STUDENTS = [
  { reg: '2026-AIML-A01', name: 'Mann Chavda', section: '5 AIML A' },
  { reg: '2026-AIML-A02', name: 'Akshat Bansal', section: '5 AIML A' },
  { reg: '2026-AIML-A03', name: 'Ani Sharma', section: '5 AIML A' },
  { reg: '2026-AIML-A04', name: 'Aswini Jena', section: '5 AIML A' },
  { reg: '2026-AIML-A05', name: 'Bhupesh Singh', section: '5 AIML A' },
  { reg: '2026-AIML-A06', name: 'Meet Dave', section: '5 AIML A' },
  { reg: '2026-AIML-A07', name: 'Dev Jain', section: '5 AIML A' },
  { reg: '2026-AIML-B01', name: 'Lavina Korani', section: '5 AIML B' },
  { reg: '2026-AIML-B02', name: 'Arpitia Rana', section: '5 AIML B' },
  { reg: '2026-AIML-B03', name: 'Heman Darji', section: '5 AIML B' },
  { reg: '2026-AIML-B04', name: 'Kathan Shah', section: '5 AIML B' },
  { reg: '2026-AIML-B05', name: 'Rana Saud', section: '5 AIML B' },
  { reg: '2026-AIML-B06', name: 'Sana M', section: '5 AIML B' },
  { reg: '2026-AIML-B07', name: 'Bhavya Patel', section: '5 AIML B' },
];

export default function StudentPortal({ user }) {
  const isFaculty = user?.role === 'FACULTY' || user?.role === 'ADMIN';

  const getInitialReg = () => {
    if (user?.username) {
      const u = user.username.toLowerCase();
      if (u.includes('aiml')) {
        return u.replace('user_', '').replace(/_/g, '-').toUpperCase();
      }
      if (u === 'mann_chavda') return '2026-AIML-A01';
    }
    return '2026-AIML-A01';
  };

  const [selectedReg, setSelectedReg] = useState(getInitialReg);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResponse, setCopilotResponse] = useState(null);

  const fetchStudentData = async (targetReg = selectedReg) => {
    setLoading(true);
    try {
      const data = await api.getStudentDashboard(targetReg);
      setDashboardData(data);
    } catch (err) {
      console.error('Error fetching live student records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData(selectedReg);
  }, [selectedReg]);

  const triggerCopilotQuery = async (queryText) => {
    if (!queryText || !queryText.trim()) return;
    setCopilotLoading(true);
    setCopilotResponse(null);
    try {
      const res = await api.chatWithBot(queryText.trim());
      setCopilotResponse(res);
    } catch (err) {
      setCopilotResponse({ error: err.message || 'Failed to connect to AI copilot.' });
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleCopilotSubmit = (e) => {
    e.preventDefault();
    triggerCopilotQuery(copilotQuery);
  };

  const activeStudentMeta = COHORT_STUDENTS.find(s => s.reg === selectedReg);

  const student = dashboardData || {
    name: activeStudentMeta ? activeStudentMeta.name : 'Mann Chavda',
    registration_no: selectedReg,
    department: 'AIML',
    section: activeStudentMeta ? activeStudentMeta.section : '5 AIML A',
    batch_year: 2026,
    overall_attendance: 0.0,
    total_lectures: 0,
    attended_lectures: 0,
    safe_to_miss: 0,
    biometric_status: '512-D ARC-FACE ACTIVE',
    courses: [],
    recent_history: []
  };

  return (
    <div className="relative z-10 p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* 0. Faculty Inspection Mode Header Bar */}
      {isFaculty && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-indigo-950/80 border border-brand-primary/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-brand-primary font-bold shrink-0">
              <GraduationCap className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Faculty Academic Inspector Mode
                </span>
                <span className="px-2 py-0.5 rounded bg-brand-primary/20 text-sky-300 text-[10px] font-mono font-bold border border-sky-400/30">
                  {user?.username === 'prof_nir' ? 'Prof. Nir Gandhi' : (user?.username || 'Faculty')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Viewing enrolled student academic records. Select any student below to inspect live records.
              </p>
            </div>
          </div>

          {/* Student Selector Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-[11px] font-mono text-slate-300 font-semibold">Inspect Student:</label>
            <div className="relative">
              <select
                value={selectedReg}
                onChange={(e) => setSelectedReg(e.target.value)}
                className="appearance-none px-3.5 py-2 pr-8 rounded-xl bg-slate-900 border border-brand-primary/50 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer shadow-md"
              >
                {COHORT_STUDENTS.map(s => (
                  <option key={s.reg} value={s.reg} className="bg-slate-900 text-white">
                    {s.reg} — {s.name} ({s.section})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* 1. Student Academic Standing Banner */}
      <div className="p-6 rounded-2xl glass-panel shadow-card flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-slate-800 shrink-0 shadow-md flex items-center justify-center">
            <img 
              src={`/api/v1/faces/registered/student_${student.registration_no}.jpg`} 
              alt={student.name}
              className="w-full h-full object-cover"
              onError={(e) => { 
                e.target.style.display = 'none'; 
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden w-full h-full bg-brand-primary items-center justify-center text-white text-xl font-bold font-mono">
              {student.name ? student.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'ST'}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-text-primary">{student.name}</h1>
              <span className="px-2.5 py-0.5 rounded-lg bg-primary/20 border border-primary/30 text-primary-light text-xs font-mono font-bold">
                {student.registration_no}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1 font-sans">
              Department of {student.department || 'AIML'} • Section {student.section || '5 AIML A'} • Batch of {student.batch_year || 2026}
            </p>
          </div>
        </div>

        {/* Real Live Biometric Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchStudentData(selectedReg)}
            disabled={loading}
            className="p-2 rounded-xl glass-panel hover:bg-white/10 text-text-secondary hover:text-text-primary transition shadow-sm"
            title="Refresh live attendance"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono shadow-sm">
            <ShieldCheck className="w-4 h-4 text-status-verified shrink-0" />
            <span className="text-text-secondary">Biometrics:</span>
            <span className="text-status-verified font-bold">{student.biometric_status || '512-D ARC-FACE ACTIVE'}</span>
          </div>
        </div>
      </div>

      {/* 2. Compliance Margin & Safety Callout (Live Calculation) */}
      <div className={`p-5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
        student.overall_attendance >= 75 
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
          : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
      }`}>
        <div className="flex items-center gap-3 font-mono">
          {student.overall_attendance >= 75 ? (
            <CheckCircle className="w-6 h-6 text-status-verified shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-status-failed shrink-0" />
          )}
          <div>
            <span className="font-bold text-sm tracking-wide block">
              {student.overall_attendance >= 75 
                ? 'ACADEMIC COMPLIANCE VERIFIED (GOOD STANDING)' 
                : student.attended_lectures === 0
                  ? 'ACADEMIC STATUS: ABSENT (0.0% ATTENDANCE)'
                  : 'DEBARMENT RISK WARNING (<75%)'}
            </span>
            <span className="text-text-secondary block font-sans text-xs mt-0.5">
              Verified cumulative attendance is <strong className="text-text-primary font-bold">{student.overall_attendance}%</strong> ({student.attended_lectures} of {student.total_lectures} conducted lectures recorded in MySQL ledger).
            </span>
          </div>
        </div>

        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-right shrink-0 shadow-sm">
          <span className="text-[10px] font-mono text-text-muted block font-semibold">ATTENDANCE SAFETY MARGIN</span>
          <span className="text-xs font-bold text-text-primary font-mono">
            {student.safe_to_miss > 0 
              ? `Safe to miss ${student.safe_to_miss} more lecture${student.safe_to_miss > 1 ? 's' : ''}` 
              : 'Zero buffer: attendance mandatory'}
          </span>
        </div>
      </div>

      {/* 3. Course-Wise Attendance Breakdown (Real Subjects from Database) */}
      <div className="p-6 rounded-2xl glass-panel shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">
              Enrolled Course Breakdown (Live Database)
            </h2>
          </div>
          <span className="text-xs font-mono text-text-muted">Mandatory Threshold: 75.0%</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/40">
          <table className="w-full text-left table-dense">
            <thead className="bg-slate-900/80 text-slate-300 font-mono text-[11px] uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-3 text-center">Sr.No</th>
                <th className="py-3 px-3">Academic Year</th>
                <th className="py-3 px-3">Course Code</th>
                <th className="py-3 px-4">Course Name</th>
                <th className="py-3 px-3 text-center">Semester/Year</th>
                <th className="py-3 px-3 text-center font-bold text-sky-400">Held</th>
                <th className="py-3 px-3 text-center font-bold text-emerald-400">Present</th>
                <th className="py-3 px-3 text-center font-bold text-rose-400">Absent</th>
                <th className="py-3 px-4 text-center">Attendance(%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-xs font-mono bg-transparent">
              {student.courses.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-text-muted font-sans">
                    {loading ? 'Fetching enrolled courses from database...' : 'No enrolled courses found for this student.'}
                  </td>
                </tr>
              ) : (
                student.courses.map((c, idx) => (
                  <tr key={c.code || idx} className="hover:bg-white/5 transition">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">{c.sr_no || idx + 1}</td>
                    <td className="py-3 px-3 text-slate-300 font-mono">{c.academic_year || '2026-27'}</td>
                    <td className="py-3 px-3 text-sky-400 font-bold font-mono">{c.code}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-text-primary">{c.name}</div>
                      <div className="text-[10px] text-text-muted font-sans mt-0.5">{c.faculty}</div>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300 font-mono">{c.semester || 'V'}</td>
                    <td className="py-3 px-3 text-center text-text-primary font-bold">{c.held || c.total || 0}</td>
                    <td className="py-3 px-3 text-center text-emerald-400 font-bold">{c.present || c.attended || 0}</td>
                    <td className="py-3 px-3 text-center text-rose-400 font-bold">{c.absent !== undefined ? c.absent : Math.max(0, (c.held || 0) - (c.present || 0))}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] font-mono border ${
                          c.pct >= 75 
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}>
                          {Number(c.pct).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Recent Verified Check-ins & Grounded XAI Copilot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Recent Check-in Timeline from Database */}
        <div className="lg:col-span-6 p-6 rounded-2xl glass-panel shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-primary" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">
              Recent Check-in Ledger Entries
            </h3>
          </div>

          <div className="divide-y divide-brand-border font-mono text-xs">
            {student.recent_history.length === 0 ? (
              <div className="py-8 text-center text-text-muted font-sans space-y-1">
                <p className="text-amber-400 font-semibold text-xs">No verified check-in records found.</p>
                <p className="text-[11px] text-slate-400">Student is currently marked ABSENT in institutional ledger.</p>
              </div>
            ) : (
              student.recent_history.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-bold text-text-primary flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-status-verified" />
                      <span>{item.subject}</span>
                    </div>
                    <div className="text-[11px] text-text-muted font-sans">{item.room} • {item.method}</div>
                  </div>
                  <div className="text-right text-[11px] text-text-secondary">
                    <div>{item.date}</div>
                    <span className="text-status-verified font-bold text-[10px]">VERIFIED</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Grounded XAI Copilot */}
        <div className="lg:col-span-6 p-6 rounded-2xl glass-panel shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-primary" />
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">
                Attendance Inquiry Copilot
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Ollama Llama 3.2
            </span>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed font-sans">
            Ask natural-language questions regarding student attendance, active classroom sessions, defaulter cohorts, or proxy defense.
          </p>

          {/* Quick Prompt Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              "What is my attendance?",
              "Active class sessions",
              "Who are defaulters?",
              "How does proxy prevention work?"
            ].map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCopilotQuery(promptText);
                  triggerCopilotQuery(promptText);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-brand-primary/20 hover:text-sky-300 hover:border-brand-primary/40 border border-white/10 text-[11px] text-slate-300 font-sans transition text-left"
              >
                {promptText}
              </button>
            ))}
          </div>

          <form onSubmit={handleCopilotSubmit} className="flex gap-2 pt-1">
            <input
              type="text"
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
              placeholder="e.g. 'What is my attendance?' or 'Active sessions'"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary font-mono shadow-inner"
            />
            <button
              type="submit"
              disabled={copilotLoading || !copilotQuery.trim()}
              className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center justify-center"
            >
              {copilotLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>

          {copilotResponse && (
            <div className="p-4 rounded-xl bg-brand-raised border border-brand-border space-y-2.5 text-xs font-mono">
              {copilotResponse.error ? (
                <div className="text-status-failed font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{copilotResponse.error}</span>
                </div>
              ) : (
                <>
                  {/* Natural Language Conversational Reply */}
                  {(copilotResponse.reply || copilotResponse.answer || copilotResponse.message) && (
                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-slate-200 text-xs font-sans leading-relaxed whitespace-pre-wrap">
                      {copilotResponse.reply || copilotResponse.answer || copilotResponse.message}
                    </div>
                  )}

                  {/* Intent & Verification Badge */}
                  {(copilotResponse.detected_intent || copilotResponse.action_executed) && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-brand-primary font-bold text-[11px]">
                        Intent: {copilotResponse.detected_intent || copilotResponse.action_executed}
                      </span>
                      <div className="text-[10px] text-status-verified flex items-center gap-1 font-bold">
                        <Check className="w-3.5 h-3.5" />
                        Grounded AI Verified
                      </div>
                    </div>
                  )}

                  {/* Generated SQL if present */}
                  {copilotResponse.generated_sql && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-slate-400 font-mono">Read-Only SQL Statement:</span>
                      <pre className="p-2.5 rounded-lg bg-black/50 text-slate-300 text-[11px] overflow-x-auto border border-white/10">
                        {copilotResponse.generated_sql}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
