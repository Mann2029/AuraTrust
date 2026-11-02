import React, { useState } from 'react';
import { 
  LayoutDashboard, Camera, UserCheck, FileText, Home, 
  LogOut, Radio, ChevronRight, Menu, X
} from 'lucide-react';

export default function AppShell({ 
  children, 
  activeTab, 
  setActiveTab, 
  user, 
  onLogout, 
  isWsConnected 
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allNavItems = [
    { id: 'landing', label: 'Ecosystem Overview', icon: Home, roles: ['STUDENT', 'FACULTY', 'ADMIN'] },
    { id: 'student', label: 'Student Hub', icon: UserCheck, roles: ['STUDENT', 'FACULTY', 'ADMIN'] },
    { id: 'faculty', label: 'Faculty Console', icon: LayoutDashboard, roles: ['FACULTY', 'ADMIN'] },
    { id: 'scanner', label: 'Camera Edge Kiosk', icon: Camera, roles: ['FACULTY', 'ADMIN'] },
    { id: 'reports', label: 'Audit & Telemetry', icon: FileText, roles: ['FACULTY', 'ADMIN'] },
  ];

  const currentRole = user?.role || 'STUDENT';
  const navItems = allNavItems.filter(item => item.roles.includes(currentRole));

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col md:flex-row antialiased relative">
      {/* 1. Desktop & Tablet Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/10 bg-[#0a1128]/80 backdrop-blur-2xl shrink-0 select-none z-20 shadow-2xl">
        {/* Institutional Branding */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <img 
            src="/app/auratrust_shield_logo.png" 
            alt="AuraTrust Sentinel Crest" 
            className="w-10 h-10 object-contain rounded-xl bg-primary/15 p-1 border border-primary/30 shrink-0 shadow-sm" 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-white">AURATRUST</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/25 text-primary-light font-mono font-bold border border-primary/30">
                v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate font-mono">Dept. of AI & Data Science</p>
          </div>
        </div>

        {/* Live Operational Session Badge */}
        <div className="p-3.5 mx-3 my-3 rounded-2xl glass-panel shadow-sm space-y-1.5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Active Lecture</span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="text-xs font-bold text-white truncate">CS-502: Deep Learning</div>
          <div className="text-[11px] font-mono text-slate-400">Hall B-204 • Sec 5 AIML A</div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive 
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 border border-white/15' 
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-90" />}
              </button>
            );
          })}
        </nav>

        {/* User & Network Status Footer */}
        <div className="p-3.5 border-t border-white/10 bg-[#0a1128]/90 space-y-2">
          {/* WebSocket telemetry */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/5 text-[11px] font-mono border border-white/10">
            <span className="text-slate-400">WebSocket Relay</span>
            <span className={`flex items-center gap-1.5 font-bold ${isWsConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
              <Radio className={`w-3 h-3 ${isWsConnected ? 'animate-pulse' : ''}`} />
              {isWsConnected ? 'SYNCED' : 'OFFLINE'}
            </span>
          </div>

          {/* User Profile */}
          {user ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 shadow-sm">
              <div className="overflow-hidden pr-2">
                <div className="text-xs font-bold text-white truncate">{user.username}</div>
                <div className="text-[10px] font-mono text-primary-light font-semibold">{user.role}</div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('landing')}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md transition"
            >
              Sign In
            </button>
          )}
        </div>
      </aside>

      {/* 2. Mobile Minimal Top Header (320px–767px) */}
      <header className="md:hidden sticky top-0 z-40 bg-[#0a1128]/90 backdrop-blur-xl border-b border-white/10 px-4 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <img 
            src="/app/auratrust_shield_logo.png" 
            alt="Logo" 
            className="w-7 h-7 object-contain rounded-lg bg-primary/20 p-0.5 border border-primary/30" 
          />
          <div>
            <span className="font-extrabold text-xs text-white">AURATRUST</span>
            <span className="text-[9px] text-slate-400 font-mono block -mt-0.5">Dept. of AI & Data Science</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          {user && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-primary/20 border border-primary/30 text-primary-light font-bold">
              {user.username}
            </span>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0a1128]/95 backdrop-blur-2xl border-b border-white/10 p-4 space-y-2 z-30 shadow-xl">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold ${
                activeTab === item.id ? 'bg-primary text-white shadow-md border border-white/10' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
          {user && (
            <button
              onClick={() => {
                onLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs text-rose-400 hover:bg-rose-500/20 border-t border-white/10 pt-3 font-bold"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </div>
      )}

      {/* 3. Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 overflow-y-auto relative z-10">
        {children}
      </main>

      {/* 4. Mobile Ergonomic Bottom Navigation Bar (320px–767px) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#0a1128]/95 backdrop-blur-xl border-t border-white/10 z-40 flex items-center justify-around h-14 shadow-panel">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-[48px] min-h-[48px] transition ${
                isActive ? 'text-primary-light font-bold' : 'text-slate-400 hover:text-white'
              }`}
              aria-label={item.label}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 truncate">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
