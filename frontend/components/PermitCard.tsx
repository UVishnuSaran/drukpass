'use client'

import { useState } from 'react'
import { Permit, PermitStatus } from '@/lib/api'

const STATUS_STYLES: Record<PermitStatus, { label: string; bg: string; text: string; border: string }> = {
  PENDING:  { label: 'Pending Review', bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200' },
  APPROVED: { label: 'Approved',       bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200'  },
  REJECTED: { label: 'Rejected',       bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200'    },
  EXPIRED:  { label: 'Expired',        bg: 'bg-gray-50',    text: 'text-gray-500',    border: 'border-gray-200'   },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Simple QR code placeholder SVG
function QRCodeDisplay({ data, size = 120 }: { data: string; size?: number }) {
  // Generate a simple deterministic pattern from data string
  const hash = data.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const cells = 21
  const cellSize = size / cells

  const grid: boolean[][] = Array.from({ length: cells }, (_, row) =>
    Array.from({ length: cells }, (_, col) => {
      // Always-on cells for finder patterns (top-left, top-right, bottom-left corners)
      const inTopLeft     = row < 7 && col < 7
      const inTopRight    = row < 7 && col >= cells - 7
      const inBottomLeft  = row >= cells - 7 && col < 7

      if (inTopLeft || inTopRight || inBottomLeft) {
        const lr = inTopLeft ? row : inTopRight ? row : row - (cells - 7)
        const lc = inTopLeft ? col : inTopRight ? col - (cells - 7) : col
        return (lr === 0 || lr === 6 || lc === 0 || lc === 6) ||
               (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4)
      }
      // Data cells — pseudo-random from hash
      return (hash * (row + 1) * (col + 1) * 31) % 7 < 3
    })
  )

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded">
      <rect width={size} height={size} fill="white" />
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#1F2937"
            />
          ) : null
        )
      )}
    </svg>
  )
}

interface Props {
  permit:            Permit
  showActions?:      boolean
  onApprove?:        (id: string) => void
  onReject?:         (id: string, reason: string) => void
  compact?:          boolean
}

export default function PermitCard({
  permit,
  showActions = false,
  onApprove,
  onReject,
  compact = false,
}: Props) {
  const [showQR, setShowQR]           = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason]   = useState('')

  const status = STATUS_STYLES[permit.status] || STATUS_STYLES.PENDING

  function handleReject() {
    if (rejectReason.trim() && onReject) {
      onReject(permit.id, rejectReason.trim())
      setShowRejectForm(false)
      setRejectReason('')
    }
  }

  return (
    <>
      <div className={`bg-white rounded-xl border ${status.border} overflow-hidden transition-all duration-200 permit-card`}>
        {/* Top status stripe */}
        <div className={`h-1 w-full ${
          permit.status === 'APPROVED' ? 'bg-[#2E7D32]' :
          permit.status === 'PENDING'  ? 'bg-amber-400' :
          permit.status === 'REJECTED' ? 'bg-[#C0392B]' :
                                         'bg-gray-300'
        }`} />

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-0.5">{permit.type}</div>
              <div className="permit-mono text-lg font-bold text-[#374151]">{permit.permit_number}</div>
            </div>
            <span className={`badge ${status.bg} ${status.text} border ${status.border}`}>
              {permit.status === 'PENDING' && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 pulse-dot" />
              )}
              {status.label}
            </span>
          </div>

          {/* Traveler info */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
            <div>
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-semibold">Traveler</div>
              <div className="font-semibold text-[#374151] truncate">{permit.traveler_name}</div>
              <div className="text-[#6B7280] text-xs">{permit.nationality}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-semibold">Operator</div>
              <div className="font-semibold text-[#374151] truncate text-xs">{permit.operator_name}</div>
              {permit.guide_name && (
                <div className="text-[#6B7280] text-xs">Guide: {permit.guide_name}</div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-4 mb-3 text-sm">
            <div>
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-semibold">Entry</div>
              <div className="font-medium text-[#374151]">{formatDate(permit.entry_date)}</div>
            </div>
            <div className="text-[#D1D5DB] self-end mb-1">→</div>
            <div>
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-semibold">Exit</div>
              <div className="font-medium text-[#374151]">{formatDate(permit.exit_date)}</div>
            </div>
          </div>

          {/* Districts */}
          {permit.districts.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-semibold mb-1">Districts</div>
              <div className="flex flex-wrap gap-1">
                {permit.districts.map(d => (
                  <span key={d} className="text-[11px] bg-[#FFF8E7] text-[#E8762E] border border-[#F5D5B0] rounded-full px-2 py-0.5 font-medium">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!compact && (
            <>
              {/* QR code section */}
              <div className="border-t border-[#F0EBE3] pt-3 mt-3">
                {showQR ? (
                  <div className="flex flex-col items-center gap-2 animate-fade-in">
                    <div className="p-3 bg-white border border-[#E5DDD0] rounded-lg shadow-sm">
                      <QRCodeDisplay data={permit.qr_data} size={140} />
                    </div>
                    <div className="permit-mono text-[11px] text-[#9CA3AF] text-center break-all max-w-[200px]">
                      {permit.qr_data}
                    </div>
                    <button
                      onClick={() => setShowQR(false)}
                      className="text-xs text-[#9CA3AF] hover:text-[#374151] underline"
                    >
                      Hide QR
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowQR(true)}
                    className="w-full text-sm font-semibold text-[#E8762E] hover:text-[#C0392B] py-2 border border-[#F5D5B0] rounded-lg hover:bg-[#FFF8E7] transition-colors"
                  >
                    📱 Show at Checkpoint
                  </button>
                )}
              </div>

              {/* Action buttons */}
              {showActions && permit.status === 'PENDING' && (
                <div className="border-t border-[#F0EBE3] pt-3 mt-3">
                  {!showRejectForm ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onApprove?.(permit.id)}
                        className="flex-1 bg-[#2E7D32] text-white text-sm font-semibold py-2 rounded-lg hover:bg-[#1B5E20] transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setShowRejectForm(true)}
                        className="flex-1 bg-white text-[#C0392B] text-sm font-semibold py-2 rounded-lg border border-[#C0392B] hover:bg-red-50 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-slide-up">
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="State the reason for rejection..."
                        rows={2}
                        className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#C0392B] text-[#374151] placeholder-[#9CA3AF] resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleReject}
                          disabled={!rejectReason.trim()}
                          className="flex-1 bg-[#C0392B] text-white text-sm font-semibold py-2 rounded-lg hover:bg-[#A93226] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                          className="flex-1 text-sm text-[#6B7280] py-2 rounded-lg border border-[#E5DDD0] hover:bg-[#F9F6F0] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
