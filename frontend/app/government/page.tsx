'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MOCK_GOV_DASHBOARD, GovDashboard, Permit, AgentEvent } from '@/lib/api'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return formatDate(ts)
}

function getWaitHours(ts: string) {
  return (new Date().getTime() - new Date(ts).getTime()) / (1000 * 60 * 60)
}

function activityIcon(e: AgentEvent) {
  if (e.status === 'error') return '⚡'
  if (e.event_type === 'APPROVE') return '✅'
  if (e.event_type === 'REJECT') return '❌'
  if (e.event_type === 'GENERATE') return '📄'
  if (e.event_type === 'COMPUTE') return '💰'
  return '🔍'
}

function PermitQueueCard({
  permit,
  onApprove,
  onReject,
}: {
  permit: Permit
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
}) {
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason]         = useState('')
  const [decision, setDecision]     = useState<'approved' | 'rejected' | null>(null)

  const waitHours  = getWaitHours(permit.created_at)
  const isLongWait = waitHours > 2

  if (decision === 'approved') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">✅</div>
          <div>
            <div className="font-semibold text-green-800">Permit Approved</div>
            <div className="text-sm text-green-600 font-mono">{permit.permit_number}</div>
          </div>
        </div>
      </div>
    )
  }

  if (decision === 'rejected') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl">❌</div>
          <div>
            <div className="font-semibold text-red-800">Permit Rejected</div>
            <div className="text-sm text-red-600 font-mono">{permit.permit_number}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl border permit-card transition-all duration-200 overflow-hidden ${
      isLongWait ? 'border-amber-300 ring-2 ring-amber-100' : 'border-[#E5DDD0]'
    }`}>
      {isLongWait && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <span className="text-amber-500 text-sm">⚠</span>
          <span className="text-xs font-semibold text-amber-700">
            Pending {Math.floor(waitHours)}h — exceeds 2-hour threshold
          </span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{permit.type}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending
              </span>
            </div>
            <div className="font-mono text-base font-bold text-[#374151] tracking-wide">{permit.permit_number}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div>
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-semibold">Traveler</div>
            <div className="font-semibold text-[#374151] truncate">{permit.traveler_name}</div>
            <div className="text-xs text-[#6B7280]">{permit.nationality}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-semibold">Operator</div>
            <div className="font-semibold text-[#374151] text-xs truncate">{permit.operator_name}</div>
          </div>
        </div>

        <div className="flex gap-4 mb-3 text-sm">
          <div>
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-semibold">Entry</div>
            <div className="font-medium text-[#374151]">{formatDate(permit.entry_date)}</div>
          </div>
          <div className="text-[#D1D5DB] self-end mb-0.5">to</div>
          <div>
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-semibold">Exit</div>
            <div className="font-medium text-[#374151]">{formatDate(permit.exit_date)}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {permit.districts.map(d => (
            <span key={d} className="text-[10px] bg-[#FFF8E7] text-[#E8762E] border border-[#F5D5B0] rounded-full px-2 py-0.5 font-semibold">{d}</span>
          ))}
        </div>

        <div className="bg-[#F9F6F0] rounded-lg p-2.5 mb-3">
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">Documents Submitted</div>
          {['Passport copy', 'Travel insurance', 'SDF payment', 'Operator confirmation'].map((doc, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-[#6B7280] py-0.5">
              <span className="text-green-500 text-[10px]">✓</span>
              {doc}
            </div>
          ))}
        </div>

        {!showReject ? (
          <div className="flex gap-2">
            <button
              onClick={() => { onApprove(permit.id); setDecision('approved') }}
              className="flex-1 bg-[#2E7D32] text-white text-sm font-bold py-2.5 rounded-lg hover:bg-[#1B5E20] transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => setShowReject(true)}
              className="flex-1 bg-white text-[#C0392B] text-sm font-bold py-2.5 rounded-lg border border-[#C0392B] hover:bg-red-50 transition-colors"
            >
              Reject
            </button>
            <button className="px-3 py-2.5 text-xs font-semibold text-[#9CA3AF] hover:text-[#374151] border border-[#E5DDD0] rounded-lg hover:bg-[#F9F6F0] transition-colors">
              Defer
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="State the reason for rejection..."
              rows={2}
              className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#C0392B] text-[#374151] placeholder-[#9CA3AF] resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { if (reason.trim()) { onReject(permit.id, reason.trim()); setDecision('rejected') } }}
                disabled={!reason.trim()}
                className="flex-1 bg-[#C0392B] text-white text-sm font-bold py-2 rounded-lg hover:bg-[#A93226] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Confirm Reject
              </button>
              <button
                onClick={() => { setShowReject(false); setReason('') }}
                className="flex-1 text-sm text-[#6B7280] py-2 rounded-lg border border-[#E5DDD0] hover:bg-[#F9F6F0] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GovernmentDashboard() {
  const [data, setData] = useState<GovDashboard>(MOCK_GOV_DASHBOARD)

  function handleApprove(id: string) {
    setData(prev => ({
      ...prev,
      stats: { ...prev.stats, permits_pending: Math.max(0, prev.stats.permits_pending - 1), approved_today: prev.stats.approved_today + 1 },
    }))
  }

  function handleReject(id: string) {
    setData(prev => ({
      ...prev,
      stats: { ...prev.stats, permits_pending: Math.max(0, prev.stats.permits_pending - 1) },
    }))
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      {/* Header */}
      <header className="bg-[#374151] text-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="w-10 h-10 rounded-lg bg-[#E8762E] flex items-center justify-center text-xl shadow hover:opacity-90 transition-opacity">
                🇧🇹
              </Link>
              <div>
                <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">Tourism Council of Bhutan</div>
                <div className="font-bold text-white text-lg leading-tight">Operations Dashboard</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-white">Pema Wangdi</div>
                <div className="text-xs text-[#9CA3AF]">Senior Permit Officer</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#E8762E] flex items-center justify-center font-bold text-white text-sm">PW</div>
            </div>
          </div>
        </div>
      </header>

      {/* Disruption banner */}
      {data.disruption_alerts.length > 0 && (
        <div className="bg-[#C0392B]">
          <div className="max-w-7xl mx-auto px-6 py-2.5 space-y-1">
            {data.disruption_alerts.map(alert => (
              <div key={alert.id} className="flex items-start gap-3 text-sm text-white">
                <span className="font-bold text-red-200 text-xs whitespace-nowrap mt-0.5 uppercase tracking-wide">
                  {alert.severity === 'HIGH' ? 'HIGH' : alert.severity === 'MEDIUM' ? 'MED' : 'LOW'}
                </span>
                <div>
                  <span className="font-bold">{alert.title}</span>
                  <span className="text-red-200 mx-1.5">—</span>
                  <span className="text-red-100 text-xs">{alert.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Permits Pending Review', value: data.stats.permits_pending,  icon: '⏳', color: 'text-amber-600',   bg: 'bg-amber-50',      sub: 'awaiting decision' },
            { label: 'Approved Today',          value: data.stats.approved_today,   icon: '✅', color: 'text-[#2E7D32]',   bg: 'bg-green-50',      sub: 'permits issued' },
            { label: 'SDF Revenue Today',       value: `$${data.stats.sdf_revenue_today.toLocaleString()}`, icon: '💰', color: 'text-[#E8762E]', bg: 'bg-orange-50', sub: 'USD collected' },
            { label: 'Active Travelers',         value: data.stats.active_travelers, icon: '🧳', color: 'text-[#374151]',  bg: 'bg-[#F9F6F0]',    sub: 'currently in Bhutan' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl border border-[#E5DDD0] p-5 shadow-sm`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider leading-tight">{s.label}</span>
              </div>
              <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-[#9CA3AF] mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* LEFT — Queue */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#374151]">Permit Approval Queue</h2>
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {data.pending_permits.length} pending
              </div>
            </div>
            <div className="space-y-4">
              {data.pending_permits.map(permit => (
                <PermitQueueCard
                  key={permit.id}
                  permit={permit}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          </div>

          {/* RIGHT — Live ops */}
          <div className="space-y-5">
            {/* District breakdown */}
            <div className="bg-white rounded-xl border border-[#E5DDD0] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#F0EBE3] flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#374151]">District Breakdown</h3>
                <span className="text-xs text-[#9CA3AF]">Live</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#FAFAF8] border-b border-[#F0EBE3]">
                      <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">District</th>
                      <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Travelers</th>
                      <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Active Permits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.district_stats.map((row, idx) => (
                      <tr key={row.district} className={`border-b border-[#F9F6F0] hover:bg-[#FFF8E7] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#FAFAF8]'}`}>
                        <td className="px-4 py-2.5 font-medium text-[#374151]">{row.district}</td>
                        <td className="px-4 py-2.5 text-right text-[#6B7280]">{row.travelers}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-14 bg-[#F0EBE3] rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-[#E8762E] rounded-full"
                                style={{ width: `${Math.min(100, (row.active_permits / data.stats.active_travelers) * 350)}%` }}
                              />
                            </div>
                            <span className="text-[#374151] font-semibold w-6 text-right">{row.active_permits}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity feed */}
            <div className="bg-white rounded-xl border border-[#E5DDD0] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#F0EBE3] flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#374151]">Recent Activity</h3>
                <div className="flex items-center gap-1.5 text-xs text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </div>
              </div>
              <div className="divide-y divide-[#F9F6F0] max-h-80 overflow-y-auto">
                {data.recent_activity.map(event => (
                  <div key={event.id} className="px-4 py-3 flex items-start gap-3 hover:bg-[#FAFAF8] transition-colors">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm mt-0.5 ${
                      event.status === 'error'         ? 'bg-red-50' :
                      event.event_type === 'APPROVE'   ? 'bg-green-50' :
                                                         'bg-[#FFF8E7]'
                    }`}>
                      {activityIcon(event)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#374151] leading-snug">{event.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#9CA3AF]">{event.agent}</span>
                        <span className="text-[10px] text-[#D1D5DB]">·</span>
                        <span className="text-[10px] text-[#9CA3AF]">{formatTime(event.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
