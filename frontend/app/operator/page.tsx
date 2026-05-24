'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MOCK_BOOKINGS, Booking, BookingStatus } from '@/lib/api'
import AgentChainTimeline from '@/components/AgentChainTimeline'

const STATUS_CONFIG: Record<BookingStatus, { label: string; bg: string; text: string; border: string; dot?: string }> = {
  PROCESSING: { label: 'Processing',  bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  dot: 'bg-blue-500' },
  PENDING:    { label: 'Pending',     bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200',dot: 'bg-yellow-500' },
  CONFIRMED:  { label: 'Confirmed',   bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
  DISRUPTED:  { label: 'Disrupted',   bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   dot: 'bg-red-500' },
  REJECTED:   { label: 'Rejected',    bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-200'   },
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      {cfg.dot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'PROCESSING' ? 'animate-pulse' : ''}`} />}
      {cfg.label}
    </span>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Booking detail drawer
function BookingDrawer({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl animate-slide-up flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E5DDD0] px-6 py-4 flex items-start justify-between z-10">
          <div>
            <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">Booking Reference</div>
            <div className="text-xl font-bold text-[#374151] permit-mono mt-0.5">{booking.reference}</div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-[#F9F6F0] flex items-center justify-center text-[#6B7280] hover:text-[#374151] transition-colors mt-1"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* Status + quick facts */}
          <div className="flex items-center gap-3">
            <StatusBadge status={booking.status} />
            <span className="text-sm text-[#6B7280]">{booking.duration_days} day{booking.duration_days !== 1 ? 's' : ''}</span>
            <span className="text-sm text-[#6B7280]">·</span>
            <span className="text-sm font-semibold text-[#E8762E]">${booking.sdf_amount.toLocaleString()} {booking.sdf_currency} SDF</span>
          </div>

          {/* Traveler */}
          <div className="bg-[#FFF8E7] rounded-xl p-4 border border-[#F5D5B0]">
            <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Traveler</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-[#9CA3AF]">Name</span><div className="font-semibold text-[#374151]">{booking.traveler_name}</div></div>
              <div><span className="text-[#9CA3AF]">Nationality</span><div className="font-semibold text-[#374151]">{booking.nationality}</div></div>
              <div><span className="text-[#9CA3AF]">Passport</span><div className="font-mono text-[#374151]">{booking.passport_number}</div></div>
              <div><span className="text-[#9CA3AF]">Email</span><div className="text-[#374151] truncate">{booking.email}</div></div>
            </div>
          </div>

          {/* Travel details */}
          <div className="bg-white rounded-xl p-4 border border-[#E5DDD0]">
            <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Travel Details</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-[#9CA3AF]">Entry</span><div className="font-semibold text-[#374151]">{formatDate(booking.entry_date)}</div></div>
              <div><span className="text-[#9CA3AF]">Exit</span><div className="font-semibold text-[#374151]">{formatDate(booking.exit_date)}</div></div>
              <div className="col-span-2"><span className="text-[#9CA3AF]">Entry Point</span><div className="font-semibold text-[#374151]">{booking.entry_point}</div></div>
              <div className="col-span-2">
                <span className="text-[#9CA3AF]">Districts</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {booking.districts.map(d => (
                    <span key={d} className="text-[11px] bg-[#FFF8E7] text-[#E8762E] border border-[#F5D5B0] rounded-full px-2 py-0.5 font-medium">{d}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Agent chain timeline */}
          <div className="bg-white rounded-xl p-4 border border-[#E5DDD0]">
            <AgentChainTimeline events={booking.agent_events} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OperatorDashboard() {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const bookings = MOCK_BOOKINGS

  const stats = {
    total:     bookings.length,
    pending:   bookings.filter(b => b.status === 'PENDING' || b.status === 'PROCESSING').length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    sdf:       bookings.reduce((acc, b) => acc + b.sdf_amount, 0),
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5DDD0] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#E8762E] to-[#C0392B] flex items-center justify-center text-lg shadow hover:opacity-90 transition-opacity">
              🇧🇹
            </Link>
            <div>
              <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">Operator Portal</div>
              <div className="font-bold text-[#374151] text-lg leading-tight">Tashi Gyeltshen Tours</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-[#374151]">Karma Wangchuk</div>
              <div className="text-xs text-[#9CA3AF]">Account Manager</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#E8762E] text-white flex items-center justify-center font-bold text-sm">KW</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Bookings',       value: stats.total,     sub: 'all time',                        icon: '📋', color: 'text-[#374151]' },
            { label: 'Pending Permits',       value: stats.pending,   sub: 'awaiting processing',             icon: '⏳', color: 'text-amber-600' },
            { label: 'Confirmed This Month',  value: stats.confirmed, sub: 'permits issued',                  icon: '✅', color: 'text-[#2E7D32]' },
            { label: 'SDF Due',               value: `$${stats.sdf.toLocaleString()}`, sub: 'USD total SDF', icon: '💰', color: 'text-[#E8762E]' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-[#E5DDD0] p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">{s.label}</span>
              </div>
              <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-[#9CA3AF] mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#374151]">Bookings</h2>
          <Link
            href="/operator/new-booking"
            className="inline-flex items-center gap-2 bg-[#E8762E] text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-[#D4601A] transition-colors shadow-sm text-sm"
          >
            <span>+</span>
            <span>New Booking</span>
          </Link>
        </div>

        {/* Bookings table */}
        <div className="bg-white rounded-xl border border-[#E5DDD0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F0EBE3] bg-[#FAFAF8]">
                  {['Reference', 'Traveler', 'Nationality', 'Entry Date', 'Status', 'Permits', 'SDF Amount', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, idx) => (
                  <tr
                    key={b.id}
                    className={`border-b border-[#F9F6F0] hover:bg-[#FFF8E7] transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-[#FAFAF8]'}`}
                    onClick={() => setSelectedBooking(b)}
                  >
                    <td className="px-4 py-3">
                      <span className="permit-mono font-semibold text-[#374151]">{b.reference}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#374151]">{b.traveler_name}</div>
                      <div className="text-[11px] text-[#9CA3AF]">{b.email}</div>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{b.nationality}</td>
                    <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{formatDate(b.entry_date)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3">
                      {b.permit_ids.length > 0 ? (
                        <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-semibold">
                          {b.permit_ids.length} issued
                        </span>
                      ) : (
                        <span className="text-xs text-[#9CA3AF]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[#E8762E]">${b.sdf_amount.toLocaleString()}</span>
                      <span className="text-[11px] text-[#9CA3AF] ml-1">{b.sdf_currency}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedBooking(b) }}
                        className="text-xs font-semibold text-[#E8762E] hover:text-[#C0392B] px-3 py-1.5 rounded-lg border border-[#F5D5B0] hover:bg-[#FFF8E7] transition-colors whitespace-nowrap"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-[#F0EBE3] bg-[#FAFAF8] flex items-center justify-between text-xs text-[#9CA3AF]">
            <span>Showing {bookings.length} bookings</span>
            <span>Tashi Gyeltshen Tours · License TGT-2018-0044</span>
          </div>
        </div>
      </main>

      {/* Booking drawer */}
      {selectedBooking && (
        <BookingDrawer booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </div>
  )
}
