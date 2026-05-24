"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const MOCK_ASSIGNMENTS = [
  { id: "1", booking_reference: "DP-2026-001", traveler_name: "Yuki Tanaka", nationality: "JP", entry_date: "2026-06-01", exit_date: "2026-06-08", districts: ["Paro", "Thimphu"], status: "assigned", operator_name: "Himava Tours" },
  { id: "2", booking_reference: "DP-2026-005", traveler_name: "Lars Andersen", nationality: "DE", entry_date: "2026-06-12", exit_date: "2026-06-22", districts: ["Gasa", "Paro"], status: "confirmed", operator_name: "Himava Tours" },
];

const MOCK_PERMITS = [
  { permit_number: "BTG-2026-TV-A1B2C3D4", permit_type: "Tourist Visa", valid_from: "2026-06-01", valid_until: "2026-06-08", status: "approved", traveler_name: "Yuki Tanaka", booking_reference: "DP-2026-001" },
  { permit_number: "BTG-2026-TR-E5F6G7H8", permit_type: "Trekking Permit", valid_from: "2026-06-12", valid_until: "2026-06-22", status: "government_review", traveler_name: "Lars Andersen", booking_reference: "DP-2026-005" },
  { permit_number: "BTG-2026-RA-I9J0K1L2", permit_type: "Restricted Area", valid_from: "2026-06-12", valid_until: "2026-06-22", status: "government_review", traveler_name: "Lars Andersen", booking_reference: "DP-2026-005" },
];

const FLAG: Record<string, string> = { JP: "🇯🇵", US: "🇺🇸", DE: "🇩🇪", FR: "🇫🇷", IN: "🇮🇳", GB: "🇬🇧", AU: "🇦🇺", SG: "🇸🇬" };

function QRCodeDisplay({ permitNumber }: { permitNumber: string }) {
  const qrData = `https://drukpass.bt/verify/${permitNumber}`;
  return (
    <div className="flex flex-col items-center py-4">
      <div className="w-36 h-36 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center relative overflow-hidden">
        {/* Simplified QR visual */}
        <div className="grid grid-cols-7 gap-px w-28 h-28">
          {Array.from({ length: 49 }).map((_, i) => {
            // Corner markers
            const row = Math.floor(i / 7);
            const col = i % 7;
            const isCornerTL = row < 3 && col < 3;
            const isCornerTR = row < 3 && col > 3;
            const isCornerBL = row > 3 && col < 3;
            const isBorder = (row === 0 || row === 6 || col === 0 || col === 6) && (isCornerTL || isCornerTR || isCornerBL);
            const isData = (Math.random() > 0.5 || isBorder) && !(isCornerTL && row === 1 && col === 1);
            return <div key={i} className={`${isData ? "bg-slate-800" : "bg-white"} rounded-sm`} />;
          })}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-orange-600 rounded-sm flex items-center justify-center">
            <span className="text-white text-xs font-bold">🇧🇹</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-2 font-mono text-center break-all px-2">{permitNumber}</p>
      <p className="text-xs text-slate-400 mt-1">{qrData}</p>
    </div>
  );
}

export default function GuideDashboard() {
  const [assignments, setAssignments] = useState(MOCK_ASSIGNMENTS);
  const [permits, setPermits] = useState(MOCK_PERMITS);
  const [activeTab, setActiveTab] = useState<"assignments" | "permits">("assignments");
  const [expandedPermit, setExpandedPermit] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.guideAssignments().catch(() => null),
      api.guidePermits().catch(() => null),
    ]).then(([a, p]) => {
      if (Array.isArray(a) && a.length > 0) setAssignments(a as typeof MOCK_ASSIGNMENTS);
      if (Array.isArray(p) && p.length > 0) setPermits(p as typeof MOCK_PERMITS);
    });
  }, []);

  const handleConfirm = async (id: string) => {
    try {
      await api.confirmAssignment(id);
    } catch {}
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: "confirmed" } : a));
    setToast("Assignment confirmed!");
    setTimeout(() => setToast(null), 3000);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      approved: "bg-green-100 text-green-700 border-green-200",
      government_review: "bg-amber-100 text-amber-700 border-amber-200",
      pending: "bg-slate-100 text-slate-500 border-slate-200",
      confirmed: "bg-blue-100 text-blue-700 border-blue-200",
      assigned: "bg-orange-100 text-orange-700 border-orange-200",
    };
    const labels: Record<string, string> = { approved: "✅ Approved", government_review: "⏳ Pending Review", pending: "Draft", confirmed: "Confirmed", assigned: "New Assignment" };
    return <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${map[status] || "bg-slate-100 text-slate-500 border-slate-200"}`}>{labels[status] || status}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-700 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg">{toast}</div>}

      {/* Phone frame */}
      <div className="w-full max-w-sm bg-white min-h-screen shadow-2xl relative">
        {/* Header */}
        <div className="bg-green-800 text-white px-5 pt-10 pb-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-green-300 text-xs">Licensed Guide</p>
              <h1 className="text-xl font-bold">Tenzin Wangchuk</h1>
            </div>
            <div className="w-11 h-11 bg-green-700 rounded-full flex items-center justify-center text-xl">🧭</div>
          </div>
          <p className="text-green-300 text-xs mt-1">License: TCB-G-2024-0847 • Valid until Dec 2026</p>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 bg-green-900 text-center">
          {[
            { label: "Upcoming", value: assignments.filter(a => new Date(a.entry_date) > new Date()).length },
            { label: "Active Permits", value: permits.filter(p => p.status === "approved").length },
            { label: "This Month", value: assignments.length },
          ].map(s => (
            <div key={s.label} className="py-3 border-r border-green-800 last:border-r-0">
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-green-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Cert Warning */}
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-xs font-semibold text-amber-800">Certification Reminder</p>
            <p className="text-xs text-amber-700">First Aid cert expires in 23 days — renew before Jun 16</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex mx-4 mt-4 bg-slate-100 rounded-xl p-1">
          {[["assignments", "My Assignments"], ["permits", "Permit Wallet"]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key as "assignments" | "permits")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? "bg-white text-green-800 shadow-sm" : "text-slate-500"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Assignments Tab */}
        {activeTab === "assignments" && (
          <div className="px-4 py-4 space-y-3 pb-24">
            {assignments.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-2">🧭</div>
                <p>No upcoming assignments</p>
              </div>
            ) : assignments.map(a => (
              <div key={a.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{FLAG[a.nationality] || "🌍"}</span>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{a.traveler_name}</p>
                      <p className="text-xs text-slate-400">{a.operator_name}</p>
                    </div>
                  </div>
                  {statusBadge(a.status)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-slate-400">From</p>
                    <p className="font-semibold text-slate-700">{new Date(a.entry_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-slate-400">To</p>
                    <p className="font-semibold text-slate-700">{new Date(a.exit_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2 mb-3">
                  <p className="text-xs text-slate-400 mb-1">Districts</p>
                  <div className="flex flex-wrap gap-1">
                    {a.districts.map(d => (
                      <span key={d} className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">{d}</span>
                    ))}
                  </div>
                </div>
                {a.status === "assigned" && (
                  <button onClick={() => handleConfirm(a.id)}
                    className="w-full bg-green-700 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-green-800 transition-colors">
                    ✓ Confirm Assignment
                  </button>
                )}
                {a.status === "confirmed" && (
                  <div className="text-center text-xs text-green-600 font-semibold py-1">✅ Assignment confirmed</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Permits Tab */}
        {activeTab === "permits" && (
          <div className="px-4 py-4 space-y-3 pb-24">
            {permits.map(p => (
              <div key={p.permit_number} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{p.permit_type}</p>
                      <p className="text-xs text-slate-400">{p.traveler_name}</p>
                    </div>
                    {statusBadge(p.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <span>📅 {new Date(p.valid_from).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {new Date(p.valid_until).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  <p className="font-mono text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">{p.permit_number}</p>
                </div>

                {p.status === "approved" && (
                  <>
                    <button onClick={() => setExpandedPermit(expandedPermit === p.permit_number ? null : p.permit_number)}
                      className="w-full bg-green-700 text-white py-3 text-sm font-semibold hover:bg-green-800 transition-colors">
                      {expandedPermit === p.permit_number ? "Hide QR Code ↑" : "📱 Show at Checkpoint ↓"}
                    </button>
                    {expandedPermit === p.permit_number && (
                      <div className="border-t border-slate-100">
                        <QRCodeDisplay permitNumber={p.permit_number} />
                        <p className="text-center text-xs text-slate-400 pb-4">Present this QR code at the district checkpoint</p>
                      </div>
                    )}
                  </>
                )}
                {p.status === "government_review" && (
                  <div className="bg-amber-50 px-4 py-3 text-xs text-amber-700 font-medium flex items-center gap-2">
                    <span className="animate-pulse">⏳</span> Awaiting government approval — you will be notified
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
