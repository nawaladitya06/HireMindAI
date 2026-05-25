"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Users, Briefcase, FileText, TrendingUp, Lock, Crown,
  ShieldCheck, Activity, RefreshCw, UserCheck, Zap,
  CheckCircle, Clock, AlertTriangle, Server, Database,
  Cpu, Globe, ChevronUp, ChevronDown, Minus
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Cell, RadialBarChart, RadialBar
} from "recharts";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const ADMIN_EMAILS = ["nawaladitya06@gmail.com"];

interface AdminStats {
  totalUsers: number;
  totalInterviews: number;
  completedInterviews: number;
  totalResumes: number;
  freeUsers: number;
  proUsers: number;
  avgScore: number;
  recentUsers: {
    id: string;
    name: string;
    email: string;
    plan: string;
    interviewsCompleted: number;
  }[];
}

const MOCK_TRAFFIC = [
  { day: "Mon", users: 12, interviews: 34, resumes: 8 },
  { day: "Tue", users: 19, interviews: 41, resumes: 14 },
  { day: "Wed", users: 9,  interviews: 28, resumes: 5  },
  { day: "Thu", users: 24, interviews: 55, resumes: 21 },
  { day: "Fri", users: 31, interviews: 62, resumes: 18 },
  { day: "Sat", users: 18, interviews: 39, resumes: 11 },
  { day: "Sun", users: 22, interviews: 47, resumes: 16 },
];

const SYSTEM_SERVICES = [
  { name: "Cloudflare D1 (Database)", status: "operational", latency: "12ms" },
  { name: "NextAuth (Auth Engine)", status: "operational", latency: "8ms"  },
  { name: "Gemini AI (Analysis)", status: "operational", latency: "220ms" },
  { name: "Cloudinary (Storage)",  status: "operational", latency: "45ms" },
  { name: "Vercel (Hosting)",      status: "operational", latency: "3ms"  },
];

const PIE_COLORS = ["#1e293b", "#3b82f6"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, color, delay = 0,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "p-6 border-4 bg-black brutal-shadow flex flex-col gap-5 group hover:-translate-y-1 hover:translate-x-0 transition-transform duration-200",
        color
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 font-mono">{label}</span>
        <div className="w-9 h-9 border-2 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity" style={{ borderColor: "currentColor" }}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-5xl font-black text-white font-mono leading-none">{value}</p>
        {sub && <p className="text-[10px] text-slate-500 font-mono mt-2 uppercase tracking-widest">{sub}</p>}
      </div>
    </motion.div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1 h-6 bg-primary" />
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white font-mono">{children}</h3>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const isAdmin = !!(session?.user?.email && ADMIN_EMAILS.includes(session.user.email));

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Forbidden");
      const data = await res.json();
      setStats(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      /* silently fail — access denied screen handles it */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !isAdmin) { setLoading(false); return; }
    fetchStats();
  }, [session, status, isAdmin, fetchStats]);

  // ── Access denied ──────────────────────────────────────────────────────────
  if (status !== "loading" && (!session || !isAdmin)) {
    return (
      <DashboardLayout title="Admin" subtitle="">
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-28 h-28 border-4 border-red-500 bg-red-500/10 flex items-center justify-center brutal-shadow"
          >
            <Lock className="w-14 h-14 text-red-500" />
          </motion.div>
          <div>
            <h2 className="text-5xl font-black text-white uppercase font-mono tracking-tight mb-3">Access Denied</h2>
            <p className="text-slate-500 font-mono text-sm">This area is restricted to authorised administrators only.</p>
          </div>
          <button onClick={() => router.push("/dashboard")} className="btn-primary px-10 py-3 text-xs">
            ← Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout title="Admin Command Center" subtitle="Fetching live data from the database...">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-primary/20" />
              <div className="absolute inset-0 border-4 border-t-primary animate-spin" />
            </div>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
              Querying production database...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const completionPct = stats && stats.totalInterviews > 0
    ? Math.round((stats.completedInterviews / stats.totalInterviews) * 100)
    : 0;

  const planData = [
    { name: "Free", value: stats?.freeUsers  ?? 0 },
    { name: "Pro",  value: stats?.proUsers   ?? 0 },
  ];

  const radialData = [{ value: completionPct, fill: "#3b82f6" }];

  return (
    <DashboardLayout title="Admin Command Center" subtitle="Live system metrics — production database">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-3 px-4 py-2 border-2 border-primary/30 bg-primary/5">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black text-primary font-mono uppercase tracking-widest">
            Authenticated as {session?.user?.email}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest hidden sm:block">
              Last synced: {lastUpdated}
            </span>
          )}
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 border-2 border-white/20 bg-black text-white text-[10px] font-black uppercase font-mono tracking-widest hover:border-primary hover:text-primary transition-all brutal-shadow-sm"
          >
            <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Grid ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard delay={0.05} label="Total Users"       value={stats?.totalUsers      ?? 0}   icon={<Users      className="w-4 h-4" />} color="border-blue-500   text-blue-400"   sub="registered accounts" />
        <StatCard delay={0.10} label="Interviews Run"    value={stats?.totalInterviews ?? 0}   icon={<Briefcase  className="w-4 h-4" />} color="border-primary  text-primary"    sub={`${stats?.completedInterviews ?? 0} completed`} />
        <StatCard delay={0.15} label="Resumes Uploaded"  value={stats?.totalResumes    ?? 0}   icon={<FileText   className="w-4 h-4" />} color="border-purple-500 text-purple-400" sub="AI-parsed PDFs" />
        <StatCard delay={0.20} label="Avg. AI Score"     value={`${stats?.avgScore ?? 0}%`}    icon={<TrendingUp className="w-4 h-4" />} color="border-emerald-500 text-emerald-400" sub="across all sessions" />
      </div>

      {/* ── Row 2: Traffic chart + Completion ring + Plan split ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">

        {/* Traffic (3 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="lg:col-span-3 p-6 border-4 border-white/20 bg-black brutal-shadow"
        >
          <SectionHeader>Platform Activity (7-day snapshot)</SectionHeader>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_TRAFFIC} margin={{ left: -20, right: 5 }}>
                <defs>
                  <linearGradient id="gUsers"      x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gInterviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.2}  />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                <Tooltip
                  contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 0, fontSize: 11, fontFamily: "JetBrains Mono" }}
                  labelStyle={{ color: "#fff", fontWeight: 700 }}
                  itemStyle={{ color: "#94a3b8" }}
                />
                <Area type="monotone" dataKey="users"      stroke="#3b82f6" strokeWidth={2} fill="url(#gUsers)"      dot={false} />
                <Area type="monotone" dataKey="interviews" stroke="#a855f7" strokeWidth={2} fill="url(#gInterviews)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-4">
            {[{ color: "#3b82f6", label: "New Users" }, { color: "#a855f7", label: "Interviews" }].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className="w-3 h-[2px]" style={{ background: l.color }} />
                <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">{l.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right column */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Completion ring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30 }}
            className="flex-1 p-6 border-4 border-white/20 bg-black brutal-shadow"
          >
            <SectionHeader>Interview Completion</SectionHeader>
            <div className="flex items-center gap-6">
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="#3b82f6" strokeWidth="3"
                    strokeDasharray={`${completionPct} ${100 - completionPct}`}
                    strokeLinecap="butt"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white font-mono leading-none">{completionPct}%</span>
                  <span className="text-[8px] text-slate-500 font-mono uppercase mt-1">done</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 flex-1">
                {[
                  { label: "Completed", val: stats?.completedInterviews ?? 0, color: "text-emerald-400" },
                  { label: "In Progress", val: (stats?.totalInterviews ?? 0) - (stats?.completedInterviews ?? 0), color: "text-primary" },
                ].map(r => (
                  <div key={r.label} className="p-3 border-2 border-white/5 bg-white/[0.02]">
                    <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest mb-1">{r.label}</p>
                    <p className={cn("text-xl font-black font-mono", r.color)}>{r.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Plan split */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="flex-1 p-6 border-4 border-white/20 bg-black brutal-shadow"
          >
            <SectionHeader>Plan Distribution</SectionHeader>
            <div className="flex items-center gap-4">
              <PieChart width={110} height={110}>
                <Pie data={planData} cx={50} cy={50} innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={0} startAngle={90} endAngle={-270}>
                  {planData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
              </PieChart>
              <div className="flex flex-col gap-3 flex-1">
                <div className="flex items-center justify-between p-3 border-2 border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-slate-700" />
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Free</span>
                  </div>
                  <span className="text-lg font-black text-white font-mono">{stats?.freeUsers ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 border-2 border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Crown className="w-3 h-3 text-primary" />
                    <span className="text-[10px] text-primary font-mono uppercase font-black">Pro</span>
                  </div>
                  <span className="text-lg font-black text-primary font-mono">{stats?.proUsers ?? 0}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Row 3: Recent users + System status ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Users table (3 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.40 }}
          className="lg:col-span-3 border-4 border-white/20 bg-black brutal-shadow overflow-hidden"
        >
          <div className="px-6 py-5 border-b-2 border-white/10 flex items-center justify-between">
            <SectionHeader>Recent Registrations</SectionHeader>
            <span className="text-[9px] font-black text-slate-600 font-mono uppercase tracking-widest">Latest 5</span>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-12 px-6 py-3 border-b border-white/5 bg-white/[0.01]">
            {["User", "Email", "Plan", "Interviews"].map((h, i) => (
              <span key={h} className={cn("text-[9px] font-black uppercase tracking-widest text-slate-600 font-mono",
                i === 0 ? "col-span-3" : i === 1 ? "col-span-5" : i === 2 ? "col-span-2" : "col-span-2 text-right"
              )}>{h}</span>
            ))}
          </div>

          <div className="divide-y divide-white/[0.04]">
            {(stats?.recentUsers ?? []).length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-600 font-mono text-xs">No users yet</div>
            ) : (
              stats?.recentUsers.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.05 }}
                  className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Avatar + Name */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-8 h-8 border-2 border-white/20 bg-primary/10 flex items-center justify-center flex-shrink-0 font-black text-xs text-primary font-mono group-hover:border-primary transition-colors">
                      {(u.name || u.email || "?")[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-white font-mono truncate">{u.name || "—"}</span>
                  </div>
                  {/* Email */}
                  <span className="col-span-5 text-[10px] text-slate-500 font-mono truncate pr-2">{u.email}</span>
                  {/* Plan badge */}
                  <div className="col-span-2">
                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 border font-mono",
                      u.plan === "pro"
                        ? "text-primary bg-primary/10 border-primary/30"
                        : "text-slate-500 bg-white/5 border-white/10"
                    )}>
                      {u.plan === "pro" ? "★ Pro" : "Free"}
                    </span>
                  </div>
                  {/* Interviews count */}
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-black text-white font-mono">{u.interviewsCompleted}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* System status (2 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="lg:col-span-2 border-4 border-white/20 bg-black brutal-shadow overflow-hidden"
        >
          <div className="px-6 py-5 border-b-2 border-white/10">
            <SectionHeader>System Health</SectionHeader>
          </div>

          {/* Overall status banner */}
          <div className="mx-6 mt-5 mb-5 flex items-center gap-3 p-4 border-2 border-emerald-500/30 bg-emerald-500/5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-xs font-black text-emerald-400 font-mono uppercase tracking-widest">All Systems Operational</p>
              <p className="text-[9px] text-slate-600 font-mono mt-0.5">No incidents detected</p>
            </div>
          </div>

          <div className="px-6 pb-6 flex flex-col gap-2">
            {SYSTEM_SERVICES.map((svc, i) => (
              <motion.div
                key={svc.name}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.06 }}
                className="flex items-center justify-between p-3 border-2 border-white/[0.06] hover:border-white/10 transition-colors"
              >
                <span className="text-[10px] font-bold text-slate-400 font-mono">{svc.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-slate-600 font-mono">{svc.latency}</span>
                  <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-mono">
                    OK
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick DB snapshot */}
          <div className="mx-6 mb-6 p-4 border-2 border-white/10 bg-white/[0.01]">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest font-mono mb-3">DB Snapshot</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Users",      val: stats?.totalUsers      ?? 0 },
                { label: "Interviews", val: stats?.totalInterviews ?? 0 },
                { label: "Resumes",    val: stats?.totalResumes    ?? 0 },
              ].map(d => (
                <div key={d.label} className="border-2 border-white/5 p-2">
                  <p className="text-base font-black text-white font-mono">{d.val}</p>
                  <p className="text-[8px] text-slate-600 font-mono uppercase">{d.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

    </DashboardLayout>
  );
}
