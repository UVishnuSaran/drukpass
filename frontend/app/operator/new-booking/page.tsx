'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Argentina','Australia','Austria',
  'Bangladesh','Belgium','Brazil','Brunei','Cambodia','Canada','Chile',
  'China','Colombia','Czech Republic','Denmark','Ecuador','Egypt',
  'Finland','France','Germany','Ghana','Greece','Hungary','Iceland',
  'India','Indonesia','Iran','Ireland','Israel','Italy','Japan','Jordan',
  'Kazakhstan','Kenya','Kuwait','Latvia','Lebanon','Malaysia','Maldives',
  'Mexico','Mongolia','Morocco','Myanmar','Nepal','Netherlands',
  'New Zealand','Nigeria','Norway','Oman','Pakistan','Peru','Philippines',
  'Poland','Portugal','Qatar','Romania','Russia','Saudi Arabia','Singapore',
  'South Africa','South Korea','Spain','Sri Lanka','Sweden','Switzerland',
  'Thailand','Turkey','Ukraine','United Arab Emirates','United Kingdom',
  'United States','Uzbekistan','Vietnam','Zimbabwe',
]

const ENTRY_POINTS = [
  'Paro International Airport',
  'Phuentsholing Land Border',
  'Gelephu Land Border',
  'Samdrup Jongkhar Land Border',
]

const DISTRICTS = [
  'Bumthang','Chhukha','Dagana','Gasa','Haa','Lhuntse','Mongar','Paro',
  'Pemagatshel','Punakha','Samdrup Jongkhar','Samtse','Sarpang','Thimphu',
  'Trashigang','Trashiyangtse','Trongsa','Tsirang','Wangdue Phodrang','Zhemgang',
]

const TRAVEL_PURPOSES = [
  'Tourism','Cultural Tourism','Adventure Tourism','Business','Conference/Event',
  'Film/Media Production','Research/Academic','Religious Pilgrimage','VIP/Diplomatic',
]

const REGIONAL_COUNTRIES = ['India','Bangladesh','Maldives','Nepal','Sri Lanka']

type Step = 1 | 2 | 3

interface TravelerForm {
  name: string; nationality: string; passport: string; dob: string; email: string
}
interface TravelForm {
  entryDate: string; exitDate: string; entryPoint: string; districts: string[]; purpose: string
}

// ── Searchable Dropdown ────────────────────────────────────────────────────────

function SearchableDropdown({
  options, value, onChange, placeholder,
}: {
  options: string[]; value: string; onChange: (v: string) => void; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase())).slice(0, 40)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={open ? query : value}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-[#E5DDD0] rounded-lg px-3 py-2.5 text-sm text-[#374151] placeholder-[#9CA3AF] focus:outline-none focus:border-[#E8762E] bg-white"
      />
      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[#E5DDD0] rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {filtered.length === 0
            ? <div className="px-3 py-2 text-sm text-[#9CA3AF]">No results</div>
            : filtered.map(opt => (
              <button key={opt} type="button"
                onClick={() => { onChange(opt); setOpen(false); setQuery('') }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-[#FFF8E7] transition-colors ${opt === value ? 'font-semibold text-[#E8762E] bg-[#FFF8E7]' : 'text-[#374151]'}`}>
                {opt}
              </button>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ── Agent Chain Animation ──────────────────────────────────────────────────────

interface AgentStep {
  id: string; icon: string; agent: string; desc: string
  status: 'waiting' | 'running' | 'done' | 'queued'; ms?: number
}

const STEP_DEFS = [
  { id:'s1', icon:'🔍', agent:'Eligibility Agent',  desc:'Checking nationality rules, visa requirements, and travel restrictions for Bhutan entry...' },
  { id:'s2', icon:'💰', agent:'SDF Calculator',     desc:'Computing Sustainable Development Fee based on duration and traveler category...' },
  { id:'s3', icon:'📄', agent:'Permit Generator',   desc:'Creating digital permits for selected districts with QR authentication codes...' },
  { id:'s4', icon:'🏛️', agent:'Government Queue',   desc:'Submitting to Tourism Council of Bhutan for regulatory review and formal approval.' },
]

const DURATIONS = [1400, 600, 900, 400]

function AgentChainScreen({ traveler, travel, onReset }: {
  traveler: TravelerForm; travel: TravelForm; onReset: () => void
}) {
  const [steps, setSteps] = useState<AgentStep[]>(
    STEP_DEFS.map((s, i) => ({ ...s, status: (i === 0 ? 'running' : 'waiting') as AgentStep['status'] }))
  )
  const [phase, setPhase]     = useState<'chain' | 'result'>('chain')
  const [totalMs, setTotalMs] = useState(0)
  const [permitNum]           = useState(() => `TP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8000)}`)

  const dayMs      = 1000 * 60 * 60 * 24
  const days       = Math.max(1, Math.round((new Date(travel.exitDate).getTime() - new Date(travel.entryDate).getTime()) / dayMs))
  const isRegional = REGIONAL_COUNTRIES.includes(traveler.nationality)
  const rate       = isRegional ? 1200 : 100
  const sdfUSD     = days * rate

  useEffect(() => {
    let accMs = 0
    function runStep(idx: number) {
      if (idx >= STEP_DEFS.length) { setTotalMs(accMs); setTimeout(() => setPhase('result'), 600); return }
      const dur = DURATIONS[idx]; accMs += dur
      setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: 'running' as const } : s))
      setTimeout(() => {
        const fs = idx === STEP_DEFS.length - 1 ? 'queued' as const : 'done' as const
        setSteps(prev => prev.map((s, i) =>
          i === idx ? { ...s, status: fs, ms: dur } :
          i === idx + 1 ? { ...s, status: 'running' as const } : s
        ))
        runStep(idx + 1)
      }, dur)
    }
    runStep(0)
  }, [])

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        {phase === 'chain' ? (
          <>
            <div className="text-center mb-10">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#E8762E] to-[#C0392B] flex items-center justify-center text-4xl mx-auto mb-5 shadow-xl">
                🤖
              </div>
              <h2 className="text-2xl font-bold text-[#374151]">Agent Chain Processing</h2>
              <p className="text-[#6B7280] text-sm mt-1.5">Automated permit workflow running in real-time...</p>
            </div>
            <div className="space-y-3">
              {steps.map((step) => {
                const isRunning = step.status === 'running'
                const isDone    = step.status === 'done'
                const isQueued  = step.status === 'queued'
                return (
                  <div key={step.id} className={`rounded-xl border p-4 transition-all duration-300 ${
                    isRunning ? 'bg-blue-50 border-blue-200 shadow-lg scale-[1.01]' :
                    isDone    ? 'bg-green-50 border-green-200' :
                    isQueued  ? 'bg-amber-50 border-amber-200' :
                                'bg-white border-[#E5DDD0] opacity-40'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-2xl ${
                        isRunning ? 'bg-blue-100' : isDone ? 'bg-green-100' : isQueued ? 'bg-amber-100' : 'bg-[#F0EBE3]'
                      }`}>
                        {isRunning ? (
                          <svg className="w-5 h-5 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : isDone ? '✅' : isQueued ? '⏳' : step.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold ${
                          isRunning ? 'text-blue-800' : isDone ? 'text-green-800' : isQueued ? 'text-amber-800' : 'text-[#C4BAB0]'
                        }`}>
                          {isRunning && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse mr-2 align-middle" />}
                          {step.agent}
                        </div>
                        <div className={`text-xs mt-0.5 leading-relaxed ${
                          isRunning ? 'text-blue-600' : isDone ? 'text-green-600' : isQueued ? 'text-amber-600' : 'text-[#C4BAB0]'
                        }`}>
                          {isQueued ? 'Queued for government review — awaiting Tourism Council approval.' : step.desc}
                        </div>
                        {isRunning && (
                          <div className="flex gap-0.5 mt-2">
                            {[0,1,2].map(i => (
                              <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
                                style={{ animationDelay: `${i * 0.12}s` }} />
                            ))}
                          </div>
                        )}
                      </div>
                      {(isDone || isQueued) && step.ms && (
                        <span className="text-[10px] font-mono text-[#9CA3AF] bg-white border border-[#E5DDD0] rounded-full px-2 py-0.5 flex-shrink-0">
                          {step.ms}ms
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="animate-fade-in">
            <div className="text-center mb-7">
              <div className="w-20 h-20 rounded-full bg-green-100 border-4 border-green-300 flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg">
                ✅
              </div>
              <h2 className="text-2xl font-bold text-[#374151]">Booking Submitted</h2>
              <p className="text-[#6B7280] text-sm mt-1">
                Chain completed in <span className="font-semibold text-[#E8762E]">{totalMs.toLocaleString()}ms</span>
              </p>
            </div>

            <div className="bg-white rounded-2xl border-2 border-[#2E7D32] shadow-lg overflow-hidden mb-4">
              <div className="h-1.5 bg-gradient-to-r from-[#2E7D32] to-[#4CAF50]" />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Tourism Permit</div>
                    <div className="font-mono text-xl font-bold text-[#374151] mt-0.5 tracking-wide">{permitNum}</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Pending Review
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <div className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider">Traveler</div>
                    <div className="font-semibold text-[#374151]">{traveler.name}</div>
                    <div className="text-[#6B7280] text-xs">{traveler.nationality}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider">Entry</div>
                    <div className="font-semibold text-[#374151] text-xs leading-snug">{travel.entryPoint}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider">Stay</div>
                    <div className="font-semibold text-[#374151] text-xs">{fmtDate(travel.entryDate)} to {fmtDate(travel.exitDate)}</div>
                    <div className="text-[#6B7280] text-xs">{days} day{days !== 1 ? 's' : ''}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider">SDF Due</div>
                    <div className="font-bold text-[#E8762E] text-xl">${sdfUSD.toLocaleString()}</div>
                    <div className="text-[11px] text-[#9CA3AF]">{days}d x ${rate}/day</div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider mb-1.5">Districts Approved</div>
                  <div className="flex flex-wrap gap-1">
                    {travel.districts.map(d => (
                      <span key={d} className="text-[11px] bg-[#FFF8E7] text-[#E8762E] border border-[#F5D5B0] rounded-full px-2 py-0.5 font-medium">{d}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E5DDD0] p-4 mb-4">
              <div className="text-xs font-bold text-[#374151] uppercase tracking-wider mb-3">Documents Required for Entry</div>
              {[
                'Valid passport (minimum 6 months validity from entry date)',
                'Comprehensive travel insurance with medical evacuation cover',
                `SDF payment receipt for $${sdfUSD.toLocaleString()} USD`,
                'Visa on arrival or pre-approved Bhutan visa',
                'Confirmed operator booking and guide assignment letter',
              ].map((doc, i) => (
                <div key={i} className="flex items-start gap-2.5 py-2 border-b border-[#F9F6F0] last:border-0">
                  <span className="text-[#D1D5DB] mt-0.5 flex-shrink-0 text-sm">-</span>
                  <span className="text-sm text-[#6B7280]">{doc}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Link href="/operator" className="flex-1 bg-[#E8762E] text-white font-semibold py-3 rounded-xl text-center hover:bg-[#D4601A] transition-colors shadow-sm">
                View Dashboard
              </Link>
              <button onClick={onReset} className="flex-1 bg-white text-[#374151] font-semibold py-3 rounded-xl border border-[#E5DDD0] hover:bg-[#F9F6F0] transition-colors">
                New Booking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function NewBookingPage() {
  const [step, setStep]           = useState<Step>(1)
  const [submitted, setSubmitted] = useState(false)
  const [traveler, setTraveler]   = useState<TravelerForm>({ name:'', nationality:'', passport:'', dob:'', email:'' })
  const [travel, setTravel]       = useState<TravelForm>({ entryDate:'', exitDate:'', entryPoint:'', districts:[], purpose:'' })

  const updateTraveler = (f: keyof TravelerForm, v: string) => setTraveler(p => ({ ...p, [f]: v }))
  const updateTravel   = (f: keyof TravelForm, v: string | string[]) => setTravel(p => ({ ...p, [f]: v }))
  const toggleDistrict = (d: string) => setTravel(p => ({
    ...p, districts: p.districts.includes(d) ? p.districts.filter(x => x !== d) : [...p.districts, d]
  }))
  const handleReset = () => {
    setSubmitted(false); setStep(1)
    setTraveler({ name:'', nationality:'', passport:'', dob:'', email:'' })
    setTravel({ entryDate:'', exitDate:'', entryPoint:'', districts:[], purpose:'' })
  }

  const step1Valid = !!(traveler.name && traveler.nationality && traveler.passport && traveler.dob && traveler.email)
  const step2Valid = !!(travel.entryDate && travel.exitDate && travel.entryPoint && travel.districts.length > 0 && travel.purpose)

  const dayMs      = 1000 * 60 * 60 * 24
  const days       = travel.entryDate && travel.exitDate
    ? Math.max(1, Math.round((new Date(travel.exitDate).getTime() - new Date(travel.entryDate).getTime()) / dayMs))
    : 0
  const isRegional = REGIONAL_COUNTRIES.includes(traveler.nationality)
  const rate       = isRegional ? 1200 : 100
  const sdfUSD     = days * rate

  if (submitted) return <AgentChainScreen traveler={traveler} travel={travel} onReset={handleReset} />

  const fc = "w-full border border-[#E5DDD0] rounded-lg px-3 py-2.5 text-sm text-[#374151] placeholder-[#9CA3AF] focus:outline-none focus:border-[#E8762E] bg-white"
  const lc = "block text-xs font-bold text-[#374151] uppercase tracking-wider mb-1.5"
  const fd = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : 'Not set'

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      <header className="bg-white border-b border-[#E5DDD0] shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/operator" className="text-[#9CA3AF] hover:text-[#374151] text-sm font-medium transition-colors">
            Back to Bookings
          </Link>
          <div className="w-px h-5 bg-[#E5DDD0]" />
          <div>
            <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">Operator Portal</div>
            <div className="font-bold text-[#374151]">New Booking</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Stepper */}
        <div className="flex items-center gap-0 mb-9">
          {['Traveler Details', 'Travel Details', 'Review and Submit'].map((label, idx) => {
            const n = idx + 1; const isActive = step === n; const isDone = step > n
            return (
              <div key={label} className={`flex items-center ${idx < 2 ? 'flex-1' : ''}`}>
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isDone   ? 'bg-[#2E7D32] text-white' :
                    isActive ? 'bg-[#E8762E] text-white shadow-lg ring-4 ring-[#E8762E]/25' :
                               'bg-white border-2 border-[#E5DDD0] text-[#9CA3AF]'
                  }`}>
                    {isDone ? '✓' : n}
                  </div>
                  <div className={`text-[11px] font-semibold mt-1.5 whitespace-nowrap ${
                    isActive ? 'text-[#E8762E]' : isDone ? 'text-[#2E7D32]' : 'text-[#9CA3AF]'
                  }`}>{label}</div>
                </div>
                {idx < 2 && <div className={`flex-1 h-0.5 mx-3 mb-5 rounded transition-all ${isDone ? 'bg-[#2E7D32]' : 'bg-[#E5DDD0]'}`} />}
              </div>
            )
          })}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-[#E5DDD0] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#374151] mb-5">Traveler Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lc}>Full Name</label>
                  <input type="text" value={traveler.name} onChange={e => updateTraveler('name', e.target.value)}
                    placeholder="As shown on passport" className={fc} />
                </div>
                <div>
                  <label className={lc}>Nationality</label>
                  <SearchableDropdown options={COUNTRIES} value={traveler.nationality}
                    onChange={v => updateTraveler('nationality', v)} placeholder="Search country..." />
                  {isRegional && <p className="text-xs text-green-700 mt-1 font-medium">SAARC region — $1,200/day SDF rate</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lc}>Passport Number</label>
                  <input type="text" value={traveler.passport}
                    onChange={e => updateTraveler('passport', e.target.value.toUpperCase())}
                    placeholder="e.g. N4821903" className={`${fc} font-mono tracking-wider`} />
                </div>
                <div>
                  <label className={lc}>Date of Birth</label>
                  <input type="date" value={traveler.dob} onChange={e => updateTraveler('dob', e.target.value)} className={fc} />
                </div>
              </div>
              <div>
                <label className={lc}>Email Address</label>
                <input type="email" value={traveler.email} onChange={e => updateTraveler('email', e.target.value)}
                  placeholder="traveler@email.com" className={fc} />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setStep(2)} disabled={!step1Valid}
                className="bg-[#E8762E] text-white font-semibold px-8 py-2.5 rounded-lg hover:bg-[#D4601A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-[#E5DDD0] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#374151] mb-5">Travel Details</h2>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lc}>Entry Date</label>
                  <input type="date" value={travel.entryDate} onChange={e => updateTravel('entryDate', e.target.value)} className={fc} />
                </div>
                <div>
                  <label className={lc}>Exit Date</label>
                  <input type="date" value={travel.exitDate} min={travel.entryDate}
                    onChange={e => updateTravel('exitDate', e.target.value)} className={fc} />
                </div>
              </div>

              {days > 0 && (
                <div className="bg-[#FFF8E7] border border-[#F5D5B0] rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#E8762E] uppercase tracking-wider">Duration</div>
                    <div className="font-bold text-[#374151]">{days} day{days !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#E8762E] uppercase tracking-wider">Estimated SDF</div>
                    <div className="font-bold text-[#374151] text-xl">${sdfUSD.toLocaleString()} <span className="text-xs text-[#9CA3AF]">USD</span></div>
                    <div className="text-[11px] text-[#9CA3AF]">{days} x ${rate}/day</div>
                  </div>
                </div>
              )}

              <div>
                <label className={lc}>Entry Point</label>
                <select value={travel.entryPoint} onChange={e => updateTravel('entryPoint', e.target.value)} className={fc}>
                  <option value="">Select entry point...</option>
                  {ENTRY_POINTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className={lc}>
                  Districts to Visit{' '}
                  <span className="text-[#9CA3AF] font-normal normal-case tracking-normal">({travel.districts.length} selected)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DISTRICTS.map(d => {
                    const checked = travel.districts.includes(d)
                    return (
                      <label key={d} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        checked ? 'bg-[#FFF8E7] border-[#E8762E]' : 'bg-white border-[#E5DDD0] hover:border-[#E8762E]/40'
                      }`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleDistrict(d)} className="sr-only" />
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          checked ? 'bg-[#E8762E] border-[#E8762E]' : 'border-[#D1D5DB]'
                        }`}>
                          {checked && (
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2.5 2.5 3.5-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-xs font-medium ${checked ? 'text-[#E8762E]' : 'text-[#6B7280]'}`}>{d}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className={lc}>Travel Purpose</label>
                <select value={travel.purpose} onChange={e => updateTravel('purpose', e.target.value)} className={fc}>
                  <option value="">Select purpose...</option>
                  {TRAVEL_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-between">
              <button onClick={() => setStep(1)} className="text-[#6B7280] font-medium px-4 py-2.5 hover:text-[#374151] transition-colors">Back</button>
              <button onClick={() => setStep(3)} disabled={!step2Valid}
                className="bg-[#E8762E] text-white font-semibold px-8 py-2.5 rounded-lg hover:bg-[#D4601A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E5DDD0] p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#374151] mb-5">Review and Submit</h2>
              <div className="space-y-4">
                <div className="bg-[#F9F6F0] rounded-xl p-4 border border-[#F0EBE3]">
                  <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Traveler</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-[#9CA3AF] text-xs">Name</span><div className="font-semibold text-[#374151]">{traveler.name}</div></div>
                    <div><span className="text-[#9CA3AF] text-xs">Nationality</span><div className="font-semibold text-[#374151]">{traveler.nationality}</div></div>
                    <div><span className="text-[#9CA3AF] text-xs">Passport</span><div className="font-mono text-[#374151]">{traveler.passport}</div></div>
                    <div><span className="text-[#9CA3AF] text-xs">Email</span><div className="text-[#374151] text-xs truncate">{traveler.email}</div></div>
                  </div>
                </div>
                <div className="bg-[#F9F6F0] rounded-xl p-4 border border-[#F0EBE3]">
                  <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Travel</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-[#9CA3AF] text-xs">Entry</span><div className="font-semibold text-[#374151]">{fd(travel.entryDate)}</div></div>
                    <div><span className="text-[#9CA3AF] text-xs">Exit</span><div className="font-semibold text-[#374151]">{fd(travel.exitDate)}</div></div>
                    <div><span className="text-[#9CA3AF] text-xs">Duration</span><div className="font-semibold text-[#374151]">{days} day{days !== 1 ? 's' : ''}</div></div>
                    <div><span className="text-[#9CA3AF] text-xs">Purpose</span><div className="font-semibold text-[#374151]">{travel.purpose}</div></div>
                    <div className="col-span-2"><span className="text-[#9CA3AF] text-xs">Entry Point</span><div className="font-semibold text-[#374151]">{travel.entryPoint}</div></div>
                    <div className="col-span-2">
                      <span className="text-[#9CA3AF] text-xs">Districts</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {travel.districts.map(d => (
                          <span key={d} className="text-[11px] bg-[#FFF8E7] text-[#E8762E] border border-[#F5D5B0] rounded-full px-2 py-0.5 font-medium">{d}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#FFF8E7] rounded-xl p-4 border border-[#F5D5B0] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#E8762E] uppercase tracking-wider">SDF (Sustainable Development Fee)</div>
                    <div className="text-sm text-[#6B7280] mt-0.5">{days} day{days !== 1 ? 's' : ''} x ${rate.toLocaleString()}/day {isRegional ? '(SAARC)' : '(Standard)'}</div>
                  </div>
                  <div className="text-3xl font-extrabold text-[#E8762E]">${sdfUSD.toLocaleString()} <span className="text-sm font-semibold">USD</span></div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="bg-white text-[#6B7280] font-medium px-5 py-3 rounded-xl border border-[#E5DDD0] hover:bg-[#F9F6F0] transition-colors">
                Back
              </button>
              <button onClick={() => setSubmitted(true)}
                className="flex-1 bg-gradient-to-r from-[#E8762E] to-[#C0392B] text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg text-base">
                Submit — Launch Agent Chain
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
