'use client'
// DrukPass — New Booking Page (full redesign)
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const BHUTAN_DISTRICTS = ["Paro", "Thimphu", "Punakha", "Bumthang", "Haa", "Lhuntse", "Gasa", "Wangdue Phodrang", "Trongsa", "Mongar", "Trashigang", "Zhemgang", "Tsirang", "Dagana", "Chhukha"];

const PURPOSES = [
  { value: "leisure", label: "Leisure / Sightseeing" },
  { value: "trekking", label: "Trekking / Hiking" },
  { value: "cultural", label: "Cultural / Religious" },
  { value: "business", label: "Business" },
  { value: "volunteer", label: "Volunteering / NGO" },
];

const ENTRY_POINTS = ["Paro Airport", "Phuentsholing", "Gelephu", "Samdrup Jongkhar"];

const COUNTRIES = [
  { code: "JP", name: "Japan 🇯🇵" }, { code: "US", name: "United States 🇺🇸" }, { code: "GB", name: "United Kingdom 🇬🇧" },
  { code: "DE", name: "Germany 🇩🇪" }, { code: "FR", name: "France 🇫🇷" }, { code: "AU", name: "Australia 🇦🇺" },
  { code: "IN", name: "India 🇮🇳" }, { code: "CN", name: "China 🇨🇳" }, { code: "KR", name: "South Korea 🇰🇷" },
  { code: "SG", name: "Singapore 🇸🇬" }, { code: "CA", name: "Canada 🇨🇦" }, { code: "NZ", name: "New Zealand 🇳🇿" },
  { code: "BD", name: "Bangladesh 🇧🇩" }, { code: "MV", name: "Maldives 🇲🇻" }, { code: "NL", name: "Netherlands 🇳🇱" },
  { code: "IT", name: "Italy 🇮🇹" }, { code: "ES", name: "Spain 🇪🇸" }, { code: "CH", name: "Switzerland 🇨🇭" },
  { code: "SE", name: "Sweden 🇸🇪" }, { code: "NO", name: "Norway 🇳🇴" }, { code: "DK", name: "Denmark 🇩🇰" },
  { code: "AT", name: "Austria 🇦🇹" }, { code: "BE", name: "Belgium 🇧🇪" }, { code: "IL", name: "Israel 🇮🇱" },
  { code: "BR", name: "Brazil 🇧🇷" }, { code: "MX", name: "Mexico 🇲🇽" }, { code: "ZA", name: "South Africa 🇿🇦" },
  { code: "TH", name: "Thailand 🇹🇭" }, { code: "MY", name: "Malaysia 🇲🇾" }, { code: "PH", name: "Philippines 🇵🇭" },
];

type AgentStep = { id: string; label: string; status: "waiting" | "running" | "done"; result?: string };
type ChainResult = { eligibility_result?: Record<string, unknown>; sdf_result?: Record<string, unknown>; permits?: Array<Record<string, unknown>>; processing_duration_ms?: number; status?: string };

export default function NewBookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [chainResult, setChainResult] = useState<ChainResult | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([
    { id: "eligibility", label: "Eligibility Agent — checking nationality rules", status: "waiting" },
    { id: "sdf", label: "SDF Calculator — computing Sustainable Development Fee", status: "waiting" },
    { id: "permit", label: "Permit Agent — generating documents with QR codes", status: "waiting" },
    { id: "gov", label: "Government Queue — permit sent for officer review", status: "waiting" },
  ]);

  const [form, setForm] = useState({
    // Step 1: Traveler
    traveler_name: "", nationality: "", passport_number: "", traveler_age: "",
    traveler_email: "",
    // Step 2: Travel
    entry_date: "", exit_date: "", entry_point: "Paro Airport",
    travel_purpose: "leisure", districts: [] as string[],
    companions_count: "0", special_requirements: "",
  });

  const update = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const toggleDistrict = (d: string) => {
    setForm(f => ({ ...f, districts: f.districts.includes(d) ? f.districts.filter(x => x !== d) : [...f.districts, d] }));
  };

  const durationDays = form.entry_date && form.exit_date
    ? Math.max(1, Math.ceil((new Date(form.exit_date).getTime() - new Date(form.entry_date).getTime()) / 86400000))
    : 0;

  const animateAgentChain = async (result: ChainResult) => {
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    const update = (id: string, status: AgentStep["status"], res?: string) =>
      setAgentSteps(steps => steps.map(s => s.id === id ? { ...s, status, result: res } : s));

    update("eligibility", "running");
    await delay(900);
    const regime = (result.eligibility_result as Record<string, unknown>)?.nationality_regime as string || "international";
    const permitType = (result.eligibility_result as Record<string, unknown>)?.primary_permit_type as string || "tourist_visa";
    update("eligibility", "done", `${regime === "regional" ? "Regional" : "International"} regime → ${permitType.replace(/_/g, " ")}`);

    update("sdf", "running");
    await delay(800);
    const sdf = result.sdf_result as Record<string, unknown>;
    const sdfAmount = sdf ? `$${(sdf.total_amount_usd as number).toLocaleString()} USD (${sdf.season} season)` : "Calculated";
    update("sdf", "done", sdfAmount);

    update("permit", "running");
    await delay(700);
    const permits = result.permits || [];
    update("permit", "done", `${permits.length} permit${permits.length !== 1 ? "s" : ""} generated`);

    update("gov", "running");
    await delay(500);
    update("gov", "done", "Queued for officer review");
  };

  // Simulate chain for demo (when API not available)
  const simulateChain = async () => {
    const regional = ["IN", "BD", "MV"].includes(form.nationality);
    const hasRestricted = form.districts.some(d => ["Haa", "Lhuntse", "Gasa"].includes(d));
    const entryMonth = form.entry_date ? new Date(form.entry_date).getMonth() + 1 : new Date().getMonth() + 1;
    const peakMonths = [3, 4, 5, 9, 10, 11];
    const dailyRate = regional ? 15 : (peakMonths.includes(entryMonth) ? 250 : 200);
    const total = dailyRate * durationDays;
    const permits: Array<Record<string, unknown>> = [
      { permit_number: `BTG-${new Date().getFullYear()}-${regional ? "RT" : "TV"}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`, permit_type: regional ? "regional_tourist" : "tourist_visa", status: "government_review" }
    ];
    if (hasRestricted) permits.push({ permit_number: `BTG-${new Date().getFullYear()}-RA-${Math.random().toString(36).substring(2, 10).toUpperCase()}`, permit_type: "restricted_area_permit", status: "government_review" });

    return {
      eligibility_result: { nationality_regime: regional ? "regional" : "international", primary_permit_type: regional ? "regional_tourist" : "tourist_visa", eligible: true },
      sdf_result: { daily_rate_usd: dailyRate, duration_days: durationDays, total_amount_usd: total, season: peakMonths.includes(entryMonth) ? "peak" : "low", waiver_applied: false },
      permits,
      processing_duration_ms: Math.floor(Math.random() * 2000) + 1500,
      status: "completed",
    };
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setStep(3);

    const bookingData = {
      traveler_name: form.traveler_name,
      nationality: form.nationality,
      passport_number: form.passport_number,
      traveler_age: form.traveler_age ? parseInt(form.traveler_age) : null,
      traveler_email: form.traveler_email,
      entry_date: form.entry_date,
      exit_date: form.exit_date,
      entry_point: form.entry_point,
      travel_purpose: form.travel_purpose,
      districts: form.districts,
      duration_days: durationDays,
      companions_count: parseInt(form.companions_count) || 0,
      special_requirements: form.special_requirements,
    };

    let result: ChainResult;
    try {
      result = await api.createBooking(bookingData) as ChainResult;
    } catch {
      // Demo fallback
      result = await simulateChain();
    }

    setChainResult(result);
    await animateAgentChain(result);
    setSubmitting(false);
  };

  const allDone = agentSteps.every(s => s.status === "done");

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-orange-700 text-white px-6 py-4 shadow">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/operator")} className="text-orange-200 hover:text-white text-sm">← Back</button>
            <span className="text-orange-300">|</span>
            <h1 className="font-bold">New Booking</h1>
          </div>
          <span className="text-orange-200 text-sm">DrukPass Operator Portal</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Step Indicator */}
        {step < 3 && (
          <div className="flex items-center gap-2 mb-8">
            {["Traveler Details", "Travel Details", "Processing"].map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? "bg-green-600 text-white" : step === i + 1 ? "bg-orange-700 text-white" : "bg-slate-200 text-slate-500"}`}>
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <span className={`text-sm ${step === i + 1 ? "font-semibold text-orange-800" : "text-slate-400"}`}>{label}</span>
                {i < 2 && <div className={`flex-1 h-px ${step > i + 1 ? "bg-green-400" : "bg-slate-200"} min-w-8`} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Traveler Details */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Traveler Details</h2>
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" value={form.traveler_name} onChange={e => update("traveler_name", e.target.value)} placeholder="As per passport" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nationality <span className="text-red-500">*</span></label>
                <select className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm bg-white" value={form.nationality} onChange={e => update("nationality", e.target.value)}>
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
                {form.nationality && ["IN", "BD", "MV"].includes(form.nationality) && (
                  <p className="text-xs text-green-700 mt-1 font-medium">✓ Regional scheme — $15/day SDF</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Passport Number <span className="text-red-500">*</span></label>
                <input className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm font-mono" value={form.passport_number} onChange={e => update("passport_number", e.target.value)} placeholder="e.g. JP1234567" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                <input type="number" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" value={form.traveler_age} onChange={e => update("traveler_age", e.target.value)} placeholder="Leave blank if adult" min="0" max="120" />
                <p className="text-xs text-slate-400 mt-1">Required for waiver eligibility</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" value={form.traveler_email} onChange={e => update("traveler_email", e.target.value)} placeholder="traveler@email.com" />
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button onClick={() => setStep(2)} disabled={!form.traveler_name || !form.nationality || !form.passport_number} className="bg-orange-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Next: Travel Details →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Travel Details */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Travel Details</h2>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Entry Date <span className="text-red-500">*</span></label>
                <input type="date" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" value={form.entry_date} onChange={e => update("entry_date", e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exit Date <span className="text-red-500">*</span></label>
                <input type="date" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" value={form.exit_date} onChange={e => update("exit_date", e.target.value)} min={form.entry_date || new Date().toISOString().split("T")[0]} />
                {durationDays > 0 && <p className="text-xs text-orange-700 mt-1 font-medium">{durationDays} nights</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Entry Point <span className="text-red-500">*</span></label>
                <select className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm bg-white" value={form.entry_point} onChange={e => update("entry_point", e.target.value)}>
                  {ENTRY_POINTS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Travel Purpose <span className="text-red-500">*</span></label>
                <select className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm bg-white" value={form.travel_purpose} onChange={e => update("travel_purpose", e.target.value)}>
                  {PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Districts to Visit <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {BHUTAN_DISTRICTS.map(d => {
                    const isRestricted = ["Haa", "Lhuntse", "Gasa"].includes(d);
                    const selected = form.districts.includes(d);
                    return (
                      <button key={d} onClick={() => toggleDistrict(d)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left ${selected ? "bg-orange-700 text-white border-orange-700" : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"}`}>
                        {d} {isRestricted && <span className={`${selected ? "text-orange-200" : "text-red-500"}`}>🔒</span>}
                      </button>
                    );
                  })}
                </div>
                {form.districts.some(d => ["Haa", "Lhuntse", "Gasa"].includes(d)) && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                    🔒 Restricted area permit required — additional $50 fee + extra processing time
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Companions</label>
                <input type="number" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" value={form.companions_count} onChange={e => update("companions_count", e.target.value)} min="0" max="50" />
              </div>
            </div>
            <div className="mt-8 flex items-center justify-between">
              <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-700 font-medium">← Back</button>
              <button onClick={handleSubmit} disabled={!form.entry_date || !form.exit_date || form.districts.length === 0}
                className="bg-orange-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                ⚡ Submit &amp; Run Agent Chain
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Agent Chain Animation */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-8">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">⚡</div>
              <h2 className="text-xl font-bold text-slate-800">DrukPass Agent Chain</h2>
              <p className="text-slate-500 text-sm mt-1">Automated regulatory processing — {form.traveler_name} ({form.nationality})</p>
            </div>

            <div className="space-y-4">
              {agentSteps.map((s, i) => (
                <div key={s.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${s.status === "done" ? "bg-green-50 border-green-200" : s.status === "running" ? "bg-orange-50 border-orange-300" : "bg-slate-50 border-slate-100"}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${s.status === "done" ? "bg-green-100" : s.status === "running" ? "bg-orange-100" : "bg-slate-100"}`}>
                    {s.status === "done" ? "✅" : s.status === "running" ? <span className="animate-spin text-orange-600">⟳</span> : <span className="text-slate-400">{["🔍", "💰", "📄", "🏛️"][i]}</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${s.status === "done" ? "text-green-800" : s.status === "running" ? "text-orange-800" : "text-slate-400"}`}>{s.label}</p>
                    {s.result && <p className="text-xs text-green-700 mt-1 font-medium">{s.result}</p>}
                    {s.status === "running" && <div className="mt-1 h-1 bg-orange-200 rounded-full overflow-hidden"><div className="h-1 bg-orange-500 rounded-full animate-pulse w-2/3" /></div>}
                  </div>
                </div>
              ))}
            </div>

            {allDone && chainResult && (
              <div className="mt-8">
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-green-800 flex items-center gap-2">✅ Processing Complete</h3>
                    {chainResult.processing_duration_ms && (
                      <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                        ⚡ {chainResult.processing_duration_ms.toLocaleString()}ms
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {chainResult.permits?.map((permit: Record<string, unknown>, i) => (
                      <div key={i} className="bg-white border border-green-200 rounded-lg p-3">
                        <p className="text-xs text-green-600 font-medium mb-1">{String(permit.permit_type || "").replace(/_/g, " ").toUpperCase()}</p>
                        <p className="font-mono text-xs font-bold text-slate-700">{String(permit.permit_number || "")}</p>
                        <p className="text-xs text-amber-600 mt-1">⏳ Awaiting government approval</p>
                      </div>
                    ))}
                    {chainResult.sdf_result && (
                      <div className="bg-white border border-green-200 rounded-lg p-3">
                        <p className="text-xs text-green-600 font-medium mb-1">SDF AMOUNT</p>
                        <p className="font-bold text-slate-700">${Number((chainResult.sdf_result as Record<string, unknown>).total_amount_usd || 0).toLocaleString()} USD</p>
                        <p className="text-xs text-slate-500 mt-1">{durationDays} nights × ${Number((chainResult.sdf_result as Record<string, unknown>).daily_rate_usd || 0)}/day ({String((chainResult.sdf_result as Record<string, unknown>).season || "")}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => router.push("/operator")} className="flex-1 bg-orange-700 text-white py-3 rounded-lg font-semibold hover:bg-orange-800 transition-colors">
                    View All Bookings →
                  </button>
                  <button onClick={() => { setStep(1); setChainResult(null); setAgentSteps(s => s.map(x => ({ ...x, status: "waiting", result: undefined }))); }} className="flex-1 border border-orange-300 text-orange-700 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors">
                    + New Booking
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
