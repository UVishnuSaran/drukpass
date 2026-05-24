'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MOCK_GUIDE_PROFILE, GuideProfile } from '@/lib/api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(dateStr: string) {
  const now  = new Date()
  const date = new Date(dateStr)
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// Deterministic QR pattern from a data string
function QRCodeMini({ data, size = 100 }: { data: string; size?: number }) {
  const hash = data.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const cells = 17
  const cellSize = size / cells

  const grid: boolean[][] = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      const inTL = r < 7 && c < 7
      const inTR = r < 7 && c >= cells - 7
      const inBL = r >= cells - 7 && c < 7
      if (inTL || inTR || inBL) {
        const lr = inTL ? r : inTR ? r : r - (cells - 7)
        const lc = inTL ? c : inTR ? c - (cells - 7) : c
        return (lr === 0 || lr === 6 || lc === 0 || lc === 6) || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4)
      }
      return (hash * (r + 1) * (c + 1) * 31) % 7 < 3
    })
  )

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-sm">
      <rect width={size} height={size} fill="white" />
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect key={`${r}-${c}`} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#1F2937" />
          ) : null
        )
      )}
    </svg>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GuidePage() {
  const [profile] = useState<GuideProfile>(MOCK_GUIDE_PROFILE)
  const [expandedQR, setExpandedQR] = useState<string | null>(null)

  const certDaysLeft = daysUntil(profile.cert_expiry)
  const certWarning  = certDaysLeft <= 90

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex flex-col items-center py-0">
      {/* Mobile-simulated container */}
      <div className="w-full max-w-sm bg-white min-h-screen shadow-2xl flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-b from-[#374151] to-[#2D3748] text-white px-5 pt-8 pb-5">
          <div className="flex items-start justify-between mb-4">
            <Link href="/" className="text-[#9CA3AF] hover:text-white text-xs font-medium transition-colors">
              ← Home
            </Link>
            <div className="text-xs text-[#9CA3AF] font-medium uppercase tracking-widest">Guide Wallet</div>
          </div>

          {/* Guide identity */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#E8762E] flex items-center justify-center text-2xl shadow-lg font-bold text-white">
              {profile.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="font-bold text-white text-lg leading-tight">{profile.name}</div>
              <div className="text-[#9CA3AF] text-xs mt-0.5">Licensed Tour Guide</div>
              <div className="font-mono text-xs text-[#E8762E] mt-1 font-semibold">{profile.license_number}</div>
            </div>
          </div>

          {/* Cert status */}
          <div className={`mt-4 rounded-xl p-3 flex items-center gap-3 ${
            certWarning ? 'bg-red-900/40 border border-red-700/50' : 'bg-white/10 border border-white/20'
          }`}>
            <div className="text-xl">{certWarning ? '⚠️' : '✅'}</div>
            <div>
              <div className={`text-xs font-bold uppercase tracking-wide ${certWarning ? 'text-red-300' : 'text-green-300'}`}>
                Certification {certWarning ? 'Expiring Soon' : 'Valid'}
              </div>
              <div className={`text-xs mt-0.5 ${certWarning ? 'text-red-200' : 'text-[#9CA3AF]'}`}>
                Expires {formatDate(profile.cert_expiry)}
                {certWarning && ` — ${certDaysLeft} days left`}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">

          {/* Upcoming assignments */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#374151] uppercase tracking-wider">Upcoming Assignments</h2>
              <span className="text-xs text-[#9CA3AF] bg-[#F0EBE3] rounded-full px-2 py-0.5 font-semibold">
                {profile.assignments.length}
              </span>
            </div>

            {profile.assignments.length === 0 ? (
              <div className="bg-[#F9F6F0] rounded-xl p-4 text-center text-sm text-[#9CA3AF]">
                No upcoming assignments
              </div>
            ) : (
              <div className="space-y-3">
                {profile.assignments.map(a => (
                  <div key={a.id} className="bg-white rounded-xl border border-[#E5DDD0] p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-[#374151]">{a.traveler_name}</div>
                        <div className="text-xs text-[#9CA3AF]">{a.operator_name}</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                        {a.status}
                      </span>
                    </div>

                    <div className="flex gap-4 mb-2 text-sm">
                      <div>
                        <div className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider">From</div>
                        <div className="font-medium text-[#374151] text-xs">{formatDate(a.entry_date)}</div>
                      </div>
                      <div className="text-[#D1D5DB] self-end mb-0.5 text-xs">to</div>
                      <div>
                        <div className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider">To</div>
                        <div className="font-medium text-[#374151] text-xs">{formatDate(a.exit_date)}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {a.districts.map(d => (
                        <span key={d} className="text-[10px] bg-[#FFF8E7] text-[#E8762E] border border-[#F5D5B0] rounded-full px-2 py-0.5 font-semibold">
                          {d}
                        </span>
                      ))}
                    </div>

                    {a.operator_phone && (
                      <div className="text-xs text-[#9CA3AF]">
                        <span className="font-medium text-[#374151]">Operator:</span> {a.operator_phone}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* My Permits */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#374151] uppercase tracking-wider">My Permits</h2>
              <span className="text-xs text-[#9CA3AF] bg-[#F0EBE3] rounded-full px-2 py-0.5 font-semibold">
                {profile.permits.length}
              </span>
            </div>

            {profile.permits.length === 0 ? (
              <div className="bg-[#F9F6F0] rounded-xl p-4 text-center text-sm text-[#9CA3AF]">
                No active permits
              </div>
            ) : (
              <div className="space-y-4">
                {profile.permits.map(permit => {
                  const isApproved  = permit.status === 'APPROVED'
                  const isExpanded  = expandedQR === permit.id

                  return (
                    <div key={permit.id} className={`bg-white rounded-xl border-2 overflow-hidden shadow-sm ${
                      isApproved ? 'border-[#2E7D32]' : 'border-amber-300'
                    }`}>
                      {/* Status stripe */}
                      <div className={`h-1 ${isApproved ? 'bg-gradient-to-r from-[#2E7D32] to-[#4CAF50]' : 'bg-amber-400'}`} />

                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{permit.type}</div>
                            <div className="font-mono text-base font-bold text-[#374151] mt-0.5 tracking-wide">{permit.permit_number}</div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            isApproved ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {isApproved ? '✓ Approved' : '⏳ Pending'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <div className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider">Traveler</div>
                            <div className="font-semibold text-[#374151] text-xs">{permit.traveler_name}</div>
                            <div className="text-[#6B7280] text-[11px]">{permit.nationality}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider">Valid</div>
                            <div className="font-medium text-[#374151] text-[11px]">{formatDate(permit.entry_date)}</div>
                            <div className="text-[#6B7280] text-[11px]">to {formatDate(permit.exit_date)}</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-4">
                          {permit.districts.map(d => (
                            <span key={d} className="text-[10px] bg-[#FFF8E7] text-[#E8762E] border border-[#F5D5B0] rounded-full px-2 py-0.5 font-semibold">
                              {d}
                            </span>
                          ))}
                        </div>

                        {/* QR section */}
                        {isExpanded ? (
                          <div className="flex flex-col items-center gap-3 py-2">
                            <div className="p-3 bg-white border-2 border-[#E5DDD0] rounded-xl shadow-inner">
                              <QRCodeMini data={permit.qr_data} size={160} />
                            </div>
                            <div className="text-center">
                              <div className="text-xs font-bold text-[#374151] mb-0.5">Show to Checkpoint Officer</div>
                              <div className="font-mono text-[10px] text-[#9CA3AF] break-all max-w-[200px] text-center">
                                {permit.qr_data}
                              </div>
                            </div>
                            <button
                              onClick={() => setExpandedQR(null)}
                              className="text-xs text-[#9CA3AF] hover:text-[#374151] underline"
                            >
                              Close
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setExpandedQR(permit.id)}
                            className={`w-full text-sm font-bold py-3 rounded-xl transition-colors ${
                              isApproved
                                ? 'bg-[#2E7D32] text-white hover:bg-[#1B5E20]'
                                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            {isApproved ? '📱 Show at Checkpoint' : '⏳ Pending Approval'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Bottom spacing */}
          <div className="h-6" />
        </div>

        {/* Bottom nav */}
        <div className="border-t border-[#E5DDD0] bg-white px-4 py-3 flex gap-4">
          {[
            { icon: '🏠', label: 'Home',        href: '/'          },
            { icon: '📋', label: 'Assignments',  href: '/guide'     },
            { icon: '📄', label: 'Permits',      href: '/guide'     },
            { icon: '👤', label: 'Profile',      href: '/guide'     },
          ].map(item => (
            <Link key={item.label} href={item.href}
              className="flex-1 flex flex-col items-center gap-1 text-[#9CA3AF] hover:text-[#E8762E] transition-colors">
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
