"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Globe2,
  ImageUp,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Siren,
  UploadCloud
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { cn } from "@/lib/utils";
import type { AnalysisType, ReportStats, ScamAnalysis, ScamReport } from "@/lib/types";

type DetectorMode = AnalysisType;

type ReportsResponse = {
  reports: ScamReport[];
  stats: ReportStats;
};

const detectorTabs: {
  id: DetectorMode;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { id: "message", label: "Message", icon: MessageSquareText },
  { id: "url", label: "URL", icon: Globe2 },
  { id: "screenshot", label: "Screenshot", icon: ImageUp }
];

const riskColors: Record<string, string> = {
  Low: "#46d39a",
  Medium: "#ffcc66",
  High: "#ff8a5c",
  Critical: "#ff5c7c"
};

const fallbackStats: ReportStats = {
  totalReports: 0,
  highRiskAlerts: 0,
  categoryCounts: [],
  riskCounts: []
};

async function readApiError(response: Response) {
  try {
    const body = await response.json();
    return body.error || "Request failed.";
  } catch {
    return "Request failed.";
  }
}

function ScoreRing({ analysis }: { analysis: ScamAnalysis }) {
  const color = riskColors[analysis.riskLevel] || riskColors.Low;

  return (
    <div className="flex items-center gap-5">
      <div
        className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${analysis.scamScore * 3.6}deg, rgba(255,255,255,0.08) 0deg)`
        }}
      >
        <div className="grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-surface">
          <span className="text-3xl font-semibold">{analysis.scamScore}</span>
        </div>
      </div>
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-white/45">Risk Level</p>
        <p className="mt-1 text-3xl font-semibold" style={{ color }}>
          {analysis.riskLevel}
        </p>
        <p className="mt-2 text-sm text-white/60">{analysis.category}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="scan-line relative overflow-hidden rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
      <ShieldCheck className="mx-auto h-10 w-10 text-cyanline" />
      <p className="mt-4 text-lg font-semibold text-white">Ready to inspect</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/58">
        Submit a message, URL, or screenshot to generate a risk score, red flags, and a practical safety plan.
      </p>
    </div>
  );
}

function ResultPanel({ analysis }: { analysis: ScamAnalysis | null }) {
  if (!analysis) return <EmptyState />;

  return (
    <section className="rounded-lg border border-white/10 bg-panel/80 p-5 shadow-glow">
      <ScoreRing analysis={analysis} />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <AlertTriangle className="h-4 w-4 text-signal" />
            Red Flags
          </div>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {analysis.redFlags.length ? (
              analysis.redFlags.map((flag) => (
                <li key={flag} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                  <span>{flag}</span>
                </li>
              ))
            ) : (
              <li>No major red flags returned.</li>
            )}
          </ul>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Bot className="h-4 w-4 text-cyanline" />
            AI Scam Coach
          </div>
          <div className="mt-3 space-y-3 text-sm leading-6 text-white/70">
            <p>{analysis.explanation}</p>
            <p className="text-white/80">{analysis.recommendation}</p>
          </div>
        </div>
      </div>

      {analysis.coach ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {[
            ["Manipulation", analysis.coach.manipulationTechniques],
            ["Safety Steps", analysis.coach.safetySteps],
            ["Report It", analysis.coach.reportingSuggestions]
          ].map(([title, items]) => (
            <div key={title as string} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">{title as string}</p>
              <ul className="mt-3 space-y-2 text-sm text-white/64">
                {(items as string[]).length ? (
                  (items as string[]).map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>Verify independently before responding.</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StatsPanel({ stats }: { stats: ReportStats }) {
  const riskData = stats.riskCounts.length
    ? stats.riskCounts
    : [
        { riskLevel: "Low" as const, count: 0 },
        { riskLevel: "Medium" as const, count: 0 },
        { riskLevel: "High" as const, count: 0 },
        { riskLevel: "Critical" as const, count: 0 }
      ];

  return (
    <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
        {[
          { label: "Reports", value: stats.totalReports, icon: ClipboardList, tone: "text-cyanline" },
          { label: "High Risk", value: stats.highRiskAlerts, icon: Siren, tone: "text-danger" },
          { label: "Categories", value: stats.categoryCounts.length, icon: BarChart3, tone: "text-signal" }
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-white/10 bg-panel/75 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/56">{item.label}</p>
              <item.icon className={cn("h-5 w-5", item.tone)} />
            </div>
            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-panel/75 p-4">
          <p className="text-sm font-semibold text-white">Risk Distribution</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} dataKey="count" nameKey="riskLevel" innerRadius={52} outerRadius={78} paddingAngle={4}>
                  {riskData.map((entry) => (
                    <Cell key={entry.riskLevel} fill={riskColors[entry.riskLevel]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0d1a1e", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-panel/75 p-4">
          <p className="text-sm font-semibold text-white">Scam Categories</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryCounts}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="category" stroke="rgba(255,255,255,0.45)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.45)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#0d1a1e", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#38d9c8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecentReports({ reports }: { reports: ScamReport[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel/75 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Recent Reports</p>
          <p className="mt-1 text-xs text-white/45">Stored in MongoDB after analysis</p>
        </div>
        <LockKeyhole className="h-5 w-5 text-cyanline" />
      </div>
      <div className="space-y-3">
        {reports.length ? (
          reports.slice(0, 6).map((report) => (
            <article key={report.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{report.content}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {report.type} · {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{
                    background: `${riskColors[report.riskLevel]}22`,
                    color: riskColors[report.riskLevel]
                  }}
                >
                  {report.riskLevel}
                </span>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-white/52">
            No reports yet. Your next analysis will appear here.
          </p>
        )}
      </div>
    </section>
  );
}

export function ScamDashboard() {
  const [mode, setMode] = useState<DetectorMode>("message");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [context, setContext] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ScamAnalysis | null>(null);
  const [reports, setReports] = useState<ScamReport[]>([]);
  const [stats, setStats] = useState<ReportStats>(fallbackStats);
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);

  const activeTab = useMemo(() => detectorTabs.find((tab) => tab.id === mode) || detectorTabs[0], [mode]);

  async function loadReports() {
    setReportsLoading(true);
    try {
      const response = await fetch("/api/reports?limit=50", { cache: "no-store" });
      if (!response.ok) throw new Error(await readApiError(response));
      const data = (await response.json()) as ReportsResponse;
      setReports(data.reports);
      setStats(data.stats);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load reports.");
    } finally {
      setReportsLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  async function submitAnalysis() {
    setLoading(true);
    setAnalysis(null);

    try {
      let response: Response;

      if (mode === "message") {
        response = await fetch("/api/analyze/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content })
        });
      } else if (mode === "url") {
        response = await fetch("/api/analyze/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        });
      } else {
        if (!image) throw new Error("Choose a screenshot first.");
        const formData = new FormData();
        formData.append("image", image);
        formData.append("context", context);
        response = await fetch("/api/analyze/screenshot", {
          method: "POST",
          body: formData
        });
      }

      if (!response.ok) throw new Error(await readApiError(response));
      const data = (await response.json()) as { analysis: ScamAnalysis; report: ScamReport };
      setAnalysis(data.analysis);
      toast.success(`${data.analysis.riskLevel} risk analysis complete`);
      await loadReports();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg border border-cyanline/30 bg-cyanline/10 shadow-glow">
              <ShieldAlert className="h-7 w-7 text-cyanline" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">ScamShield AI</h1>
              <p className="mt-1 max-w-2xl text-sm text-white/58">
                AI-powered scam detection for messages, URLs, screenshots, and chat conversations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadReports}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white transition hover:border-cyanline/50 hover:bg-cyanline/10"
          >
            <RefreshCw className={cn("h-4 w-4", reportsLoading && "animate-spin")} />
            Refresh
          </button>
        </header>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-lg border border-white/10 bg-panel/80 p-4 shadow-glow">
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-surface/80 p-1">
              {detectorTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMode(tab.id)}
                  className={cn(
                    "flex h-11 items-center justify-center gap-2 rounded-md text-sm font-medium text-white/64 transition",
                    mode === tab.id && "bg-cyanline text-surface"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <activeTab.icon className="h-5 w-5 text-cyanline" />
              {activeTab.label} Scam Detector
            </div>

            {mode === "message" ? (
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Paste an SMS, email, WhatsApp message, or chat conversation..."
                className="min-h-72 w-full resize-y rounded-lg border border-white/10 bg-surface/80 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-white/32 focus:border-cyanline/60"
              />
            ) : null}

            {mode === "url" ? (
              <div className="space-y-4">
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/security-check"
                  className="h-12 w-full rounded-lg border border-white/10 bg-surface/80 px-4 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-cyanline/60"
                />
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/62">
                  URL analysis checks for impersonation, suspicious wording, typosquatting, and phishing patterns.
                </div>
              </div>
            ) : null}

            {mode === "screenshot" ? (
              <div className="space-y-4">
                <label className="grid min-h-52 cursor-pointer place-items-center rounded-lg border border-dashed border-cyanline/35 bg-surface/80 p-6 text-center transition hover:bg-cyanline/5">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => setImage(event.target.files?.[0] || null)}
                  />
                  <div>
                    <UploadCloud className="mx-auto h-10 w-10 text-cyanline" />
                    <p className="mt-3 text-sm font-semibold text-white">{image ? image.name : "Upload screenshot"}</p>
                    <p className="mt-1 text-xs text-white/48">PNG, JPEG, or WebP up to 5MB</p>
                  </div>
                </label>
                <textarea
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="Optional context: where you received it, sender name, claimed organization..."
                  className="min-h-28 w-full resize-y rounded-lg border border-white/10 bg-surface/80 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-white/32 focus:border-cyanline/60"
                />
              </div>
            ) : null}

            <button
              type="button"
              onClick={submitAnalysis}
              disabled={loading}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-cyanline px-5 text-sm font-semibold text-surface transition hover:bg-[#6ce5d8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
              {loading ? "Analyzing" : "Analyze with Gemini"}
            </button>
          </section>

          <ResultPanel analysis={analysis} />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <StatsPanel stats={stats} />
          <RecentReports reports={reports} />
        </div>

        <footer className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-white/42 sm:flex-row sm:items-center sm:justify-between">
          <span>Use official channels before sending money, OTPs, passwords, or identity documents.</span>
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-cyanline" />
            Gemini API · MongoDB · Next.js
          </span>
        </footer>
      </div>
    </main>
  );
}
