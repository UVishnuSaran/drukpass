'use client'

import Link from 'next/link'

const stats = [
  { value: '< 10s', label: 'Permit approval time', sub: 'end-to-end agent chain' },
  { value: '0',     label: 'Manual errors', sub: 'fully automated compliance' },
  { value: '3',     label: 'Stakeholders connected', sub: 'operators · guides · government' },
]

const portals = [
  {
    href:    '/government',
    icon:    '🏛️',
    title:   'Government Portal',
    role:    'Tourism Council of Bhutan',
    desc:    'Permit approval queue, live operations dashboard, SDF revenue tracking, and district-level traveler oversight.',
    accent:  'from-[#C0392B] to-[#E8762E]',
    border:  'border-[#C0392B]',
    hover:   'hover:bg-[#C0392B]',
    bg:      'bg-[#C0392B]',
    tagBg:   'bg-red-50 text-[#C0392B]',
  },
  {
    href:    '/operator',
    icon:    '🏢',
    title:   'Operator Portal',
    role:    'Licensed Tour Operators',
    desc:    'Submit bookings, track permit status in real time, view SDF calculations, and manage traveler documents.',
    accent:  'from-[#E8762E] to-[#F5A460]',
    border:  'border-[#E8762E]',
    hover:   'hover:bg-[#E8762E]',
    bg:      'bg-[#E8762E]',
    tagBg:   'bg-orange-50 text-[#E8762E]',
  },
  {
    href:    '/guide',
    icon:    '🧭',
    title:   'Guide Wallet',
    role:    'Licensed Guides',
    desc:    'View upcoming assignments, access digital permits and QR codes, and manage certification status.',
    accent:  'from-[#2E7D32] to-[#4CAF50]',
    border:  'border-[#2E7D32]',
    hover:   'hover:bg-[#2E7D32]',
    bg:      'bg-[#2E7D32]',
    tagBg:   'bg-green-50 text-[#2E7D32]',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FFF8E7] flex flex-col">
      {/* Top government bar */}
      <div className="bg-[#374151] text-white text-center py-1.5 text-xs tracking-widest font-medium uppercase">
        Official Platform &bull; Tourism Council of Bhutan &bull; Kingdom of Bhutan
      </div>

      {/* Navigation bar */}
      <nav className="bg-white border-b border-[#E5DDD0] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#E8762E] to-[#C0392B] flex items-center justify-center text-xl shadow">
              🇧🇹
            </div>
            <div>
              <div className="font-bold text-[#374151] text-lg leading-tight tracking-tight">DrukPass</div>
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-widest font-medium">Tourism Intelligence Platform</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#6B7280]">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] inline-block"></span>
            System Operational
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white border border-[#E8762E] rounded-full px-4 py-1.5 mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#E8762E] animate-pulse"></span>
            <span className="text-xs font-semibold text-[#E8762E] uppercase tracking-widest">Powered by Agentic AI</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-extrabold text-[#374151] mb-4 leading-tight">
            Bhutan Tourism Intelligence
            <br />
            <span className="bg-gradient-to-r from-[#E8762E] to-[#C0392B] bg-clip-text text-transparent">
              Automated.
            </span>
          </h1>
          <p className="text-xl text-[#6B7280] mb-12 max-w-xl mx-auto leading-relaxed">
            DrukPass connects operators, guides, and government in a single intelligent workflow — permits issued in seconds, compliance guaranteed.
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-14 max-w-2xl mx-auto">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-5 border border-[#E5DDD0] shadow-sm text-center">
                <div className="text-3xl font-extrabold text-[#E8762E] mb-1">{s.value}</div>
                <div className="text-sm font-semibold text-[#374151]">{s.label}</div>
                <div className="text-[11px] text-[#9CA3AF] mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Portal cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {portals.map((p) => (
              <Link key={p.href} href={p.href}>
                <div className={`group bg-white rounded-2xl border-2 ${p.border} p-6 text-left hover:shadow-xl transition-all duration-200 cursor-pointer h-full`}>
                  {/* Top */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{p.icon}</div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${p.tagBg}`}>
                      {p.role.split(' ')[0]}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#374151] mb-1">{p.title}</h3>
                  <p className="text-xs text-[#9CA3AF] font-medium mb-3">{p.role}</p>
                  <p className="text-sm text-[#6B7280] leading-relaxed mb-5">{p.desc}</p>

                  {/* CTA */}
                  <div className={`${p.bg} text-white text-sm font-semibold py-2.5 px-4 rounded-lg text-center transition-opacity group-hover:opacity-90`}>
                    Enter Portal →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Agent chain visual */}
      <section className="bg-white border-t border-[#E5DDD0] py-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-8">
            <div className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">How It Works</div>
            <h2 className="text-2xl font-bold text-[#374151]">The Agent Chain — Booking to Permit in One Flow</h2>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[
              { icon: '🔍', label: 'Eligibility\nAgent', color: 'bg-blue-50 border-blue-200 text-blue-700' },
              { icon: '→', label: '',  color: 'text-[#D1D5DB] text-2xl font-light' },
              { icon: '💰', label: 'SDF\nCalculator', color: 'bg-amber-50 border-amber-200 text-amber-700' },
              { icon: '→', label: '',  color: 'text-[#D1D5DB] text-2xl font-light' },
              { icon: '📄', label: 'Permit\nGenerator', color: 'bg-orange-50 border-orange-200 text-orange-700' },
              { icon: '→', label: '',  color: 'text-[#D1D5DB] text-2xl font-light' },
              { icon: '🏛️', label: 'Government\nReview', color: 'bg-red-50 border-red-200 text-red-700' },
              { icon: '→', label: '',  color: 'text-[#D1D5DB] text-2xl font-light' },
              { icon: '✅', label: 'Permit\nIssued', color: 'bg-green-50 border-green-200 text-green-700' },
            ].map((step, i) =>
              step.label === '' ? (
                <span key={i} className={step.color}>{step.icon}</span>
              ) : (
                <div key={i} className={`border rounded-xl px-4 py-3 text-center ${step.color}`}>
                  <div className="text-2xl mb-1">{step.icon}</div>
                  <div className="text-[11px] font-semibold whitespace-pre-line leading-tight">{step.label}</div>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#374151] text-center py-5 text-xs text-[#9CA3AF]">
        <div className="mb-1 font-semibold text-white">DrukPass — Kingdom of Bhutan</div>
        <div>Tourism Council of Bhutan &bull; Restricted Government System &bull; Authorized Users Only</div>
      </footer>
    </div>
  )
}
