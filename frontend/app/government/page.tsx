"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const statusColor: Record<string, string> = {
  government_review: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  pending: "bg-slate-100 text-slate-700 border-slate-200",
};

const permitLabel: Record<string, string> = {
  tourist_visa: "Tourist Visa",
  regional_tourist: "Regional Tourist",
  restricted_area_permit: "Restricted Area",
  trekking_permit: "Trekking Permit",
};

const countryFlag: Record<string, string> = {
  JP: "🇯🇵", US: "🇺🇸", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", AU: "🇦🇺",
  IN: "🇮🇳", CN: "🇨🇳", KR: "🇰🇷", SG: "🇸🇬", CA: "🇨🇦", NZ: "🇳🇿",
  BD: "🇧🇩", MV: "🇲🇻", NL: "🇳🇱", IT: "🇮🇹", ES: "🇪🇸", CH: "🇨🇭",
};

type DashboardData = {
  stats: {
    pending_permits: number;
    approved_today: number;
    sdf_revenue_today_usd: number;
    active_travelers: number;
  };
  pending_permits: Array<{
    permit_id: string;
    permit_number: string;
    permit_type: string;
    booking_reference: string;
    operator_name: string;
    entry_date: string;
    districts: string[];
    hours_pending: number;
    is_urgent: boolean;
    metadata: { traveler_name?: string; nationality?: string };
  }>;
  recent_events: Array<{
    actor: string;
    event_type: string;
    event_data: Record<string, unknown>;
    timestamp: string;
  }>;
};

// Mock data for demo when API not connected
const MOCK_DATA: DashboardData = {
  stats: { pending_permits: 7, approved_today: 12, sdf_revenue_today_usd: 8450, active_travelers: 34 },
  pending_permits: [
    { permit_id: "1", permit_number: "BTG-2026-TV-A1B2C3D4", permit_type: "tourist_visa", booking_reference: "DP-2026-001", operator_name: "Himava Tours", entry_date: "2026-06-01", districts: ["Paro", "Thimphu"], hours_pending: 0.3, is_urgent: false, metadata: { traveler_name: "Yuki Tanaka", nationality: "JP" } },
    { permit_id: "2", permit_number: "BTG-2026-RA-E5F6G7H8", permit_type: "restricted_area_permit", booking_reference: "DP-2026-002", operator_name: "Dragon Fly Travel", entry_date: "2026-06-03", districts: ["Haa"], hours_pending: 2.7, is_urgent: true, metadata: { traveler_name: "James Wilson", nationality: "US" } },
    { permit_id: "3", permit_number: "BTG-2026-TV-I9J0K1L2", permit_type: "tourist_visa", booking_reference: "DP-2026-003", operator_name: "Bhutan Travel Co", entry_date: "2026-06-05", districts: ["Punakha", "Bumthang"], hours_pending: 1.1, is_urgent: false, metadata: { traveler_name: "Sophie Martin", nationality: "FR" } },
    { permit_id: "4", permit_number: "BTG-2026-TR-M3N4O5P6", permit_type: "trekking_permit", booking_reference: "DP-2026-004", operator_name: "Himava Tours", entry_date: "2026-06-07", districts: ["Gasa"], hours_pending: 0.8, is_urgent: false, metadata: { traveler_name: "Lars Andersen", nationality: "DE" } },
  ],
  recent_events: [
    { actor: "agent:permit_generator", event_type: "permits_generated", event_data: { permits_created: 2 }, timestamp: new Date(Date.now() - 120000).toISOString() },
    { actor: "agent:sdf_calculator", event_type: "sdf_calculated", event_data: { total_usd: 1750 }, timestamp: new Date(Date.now() - 300000).toISOString() },
    { actor: "user:pema@btc.gov.bt", event_type: "permit_approved", event_data: { permit_number: "BTG-2026-TV-PREV01" }, timestamp: new Date(Date.now() - 600000).toISOString() },
    { actor: "agent:disruption_manager", event_type: "disruption_processed", event_data: { affected_bookings_count: 3 }, timestamp: new Date(Date.now() - 900000).toISOString() },
    { actor: "agent:eligibility", event_type: "eligibility_check_completed", event_data: { regime: "international", permit_type: "tourist_visa" }, timestamp: new Date(Date.now() - 1200000).toISOString() },
  ],
};

function eventIcon(actor: string): string {
  if (actor.includes("eligibility")) return "🔍";
  if (actor.includes("sdf")) return "💰";
  if (actor.includes("permit")) return "📄";
  if (actor.includes("disruption")) return "⚡";
  if (actor.includes("user")) return "👤";
  return "🔄";
}

function eventLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function timeAgo(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

export default function GovernmentDashboard() {
  const [data, setData] = useState<DashboardData>(MOCK_DATA);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadDashboard = useCallback(async () => {
    try {
      const result = await api.govDashboard() as DashboardData;
      setData(result);
      setLastRefresh(new Date());
    } catch {
      // Use mock data if API not available
      setData(MOCK_DATA);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const handleApprove = async (permitId: string, permitNumber: string) => {
    setApproving(permitId);
    try {
      await api.approvePermit(permitId);
      showToast(`✅ Permit ${permitNumber} approved`);
      await loadDashboard();
    } catch {
      // Demo: update local state
      setData(prev => ({
        ...prev,
        stats: { ...prev.stats, pending_permits: prev.stats.pending_permits - 1, approved_today: prev.stats.approved_today + 1 },
        pending_permits: prev.pending_permits.filter(p => p.permit_id !== permitId),
        recent_events: [{ actor: "user:pema@btc.gov.bt", event_type: "permit_approved", event_data: { permit_number: permitNumber }, timestamp: new Date().toISOString() }, ...prev.recent_events.slice(0, 9)],
      }));
      showToast(`✅ Permit ${permitNumber} approved`);
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (permitId: string, permitNumber: string) => {
    if (!rejectReason.trim()) { showToast("Enter a rejection reason", "error"); return; }
    try {
      await api.rejectPermit(permitId, rejectReason);
      showToast(`Permit ${permitNumber} rejected`, "error");
      setRejectingId(null);
      setRejectReason("");
      await loadDashboard();
    } catch {
      setData(prev => ({
        ...prev,
        stats: { ...prev.stats, pending_permits: prev.stats.pending_permits - 1 },
        pending_permits: prev.pending_permits.filter(p => p.permit_id !== permitId),
      }));
      showToast(`Permit ${permitNumber} rejected`);
      setRejectingId(null);
      setRejectReason("");
    }
  };

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === "success" ? "bg-green-700 text-white" : "bg-red-700 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-red-800 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🇧🇹</span>
          <div>
            <h1 className="font-bold text-lg leading-tight">Tourism Council of Bhutan</h1>
            <p className="text-red-200 text-xs">Operations Dashboard — DrukPass</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-red-200">Last updated: {lastRefresh.toLocaleTimeString()}</span>
          <button onClick={loadDashboard} className="bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded text-xs font-medium transition-colors">
            ↻ Refresh
          </button>
          <div className="w-8 h-8 bg-red-700 rounded-full flex items-center justify-center text-sm font-bold">P</div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-0 border-b border-amber-200 bg-white shadow-sm">
        {[
          { label: "Pending Review", value: data.stats.pending_permits, color: "text-amber-600", icon: "⏳" },
          { label: "Approved Today", value: data.stats.approved_today, color: "text-green-700", icon: "✅" },
          { label: "SDF Revenue Today", value: `$${data.stats.sdf_revenue_today_usd.toLocaleString()}`, color: "text-blue-700", icon: "💰" },
          { label: "Active Travelers", value: data.stats.active_travelers, color: "text-purple-700", icon: "🧳" },
        ].map((stat) => (
          <div key={stat.label} className="p-5 border-r border-amber-100 last:border-r-0">
            <div className="flex items-center gap-2 mb-1">
              <span>{stat.icon}</span>
              <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex gap-0 h-[calc(100vh-140px)]">
        {/* Left: Approval Queue */}
        <div className="w-2/3 border-r border-amber-200 overflow-y-auto bg-white">
          <div className="px-5 py-3 border-b border-amber-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              Permit Approval Queue
              <span className="ml-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">{data.pending_permits.length}</span>
            </h2>
            <span className="text-xs text-slate-400">Sorted by submission time</span>
          </div>

          {data.pending_permits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-medium">All permits reviewed</p>
              <p className="text-sm">No pending applications</p>
            </div>
          ) : (
            <div className="divide-y divide-amber-50">
              {data.pending_permits.map((permit) => (
                <div key={permit.permit_id} className={`p-5 hover:bg-amber-50 transition-colors ${permit.is_urgent ? "border-l-4 border-l-red-500" : ""}`}>
                  {permit.is_urgent && (
                    <div className="text-xs text-red-600 font-semibold mb-2 flex items-center gap-1">
                      🔴 Pending {permit.hours_pending}h — requires attention
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{countryFlag[permit.metadata?.nationality || ""] || "🌍"}</span>
                        <span className="font-semibold text-slate-800">{permit.metadata?.traveler_name || "Unknown Traveler"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[permit.permit_type] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {permitLabel[permit.permit_type] || permit.permit_type}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs text-slate-600 mb-3">
                        <div><span className="text-slate-400">Operator</span><br /><span className="font-medium">{permit.operator_name}</span></div>
                        <div><span className="text-slate-400">Entry Date</span><br /><span className="font-medium">{new Date(permit.entry_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></div>
                        <div><span className="text-slate-400">Districts</span><br /><span className="font-medium">{permit.districts?.join(", ") || "N/A"}</span></div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border">{permit.permit_number}</span>
                        <span>•</span>
                        <span>Ref: {permit.booking_reference}</span>
                        <span>•</span>
                        <span>{permit.hours_pending < 1 ? `${Math.round(permit.hours_pending * 60)}m` : `${permit.hours_pending}h`} ago</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 min-w-[120px]">
                      {rejectingId === permit.permit_id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            className="text-xs border border-red-200 rounded p-2 w-full resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
                            placeholder="Rejection reason..."
                            rows={2}
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                          />
                          <button onClick={() => handleReject(permit.permit_id, permit.permit_number)} className="bg-red-600 text-white text-xs px-3 py-1.5 rounded font-medium hover:bg-red-700 transition-colors">
                            Confirm Reject
                          </button>
                          <button onClick={() => { setRejectingId(null); setRejectReason(""); }} className="text-slate-500 text-xs hover:text-slate-700">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleApprove(permit.permit_id, permit.permit_number)}
                            disabled={approving === permit.permit_id}
                            className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-semibold hover:bg-green-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
                          >
                            {approving === permit.permit_id ? <span className="animate-spin">⟳</span> : "✓"} Approve
                          </button>
                          <button onClick={() => setRejectingId(permit.permit_id)} className="border border-red-300 text-red-600 text-xs px-4 py-1.5 rounded-lg font-medium hover:bg-red-50 transition-colors">
                            Reject
                          </button>
                          <button className="text-slate-400 text-xs hover:text-slate-600 text-center">Defer →</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Activity Feed */}
        <div className="w-1/3 bg-slate-50 overflow-y-auto">
          <div className="px-4 py-3 border-b border-amber-200 sticky top-0 bg-slate-50 z-10">
            <h2 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              ⚡ Live Activity
            </h2>
          </div>

          {/* District Overview */}
          <div className="p-4 border-b border-amber-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Active by District</h3>
            <div className="space-y-2">
              {[
                { district: "Paro", count: 12, color: "bg-orange-500" },
                { district: "Thimphu", count: 8, color: "bg-red-600" },
                { district: "Punakha", count: 6, color: "bg-green-600" },
                { district: "Bumthang", count: 4, color: "bg-blue-600" },
                { district: "Haa", count: 2, color: "bg-purple-600" },
                { district: "Gasa", count: 2, color: "bg-teal-600" },
              ].map(({ district, count, color }) => (
                <div key={district} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-600 w-20">{district}</span>
                  <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                    <div className={`${color} h-1.5 rounded-full`} style={{ width: `${(count / 12) * 100}%` }} />
                  </div>
                  <span className="text-slate-500 font-medium w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Event Feed */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">System Events</h3>
            <div className="space-y-3">
              {data.recent_events.map((event, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="text-base mt-0.5 flex-shrink-0">{eventIcon(event.actor)}</span>
                  <div>
                    <p className="text-slate-700 font-medium leading-snug">{eventLabel(event.event_type)}</p>
                    <p className="text-slate-400">{event.actor.replace("agent:", "").replace("user:", "")}</p>
                    <p className="text-slate-400 mt-0.5">{timeAgo(event.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
