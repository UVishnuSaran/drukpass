'use client'

import { AgentEvent } from '@/lib/api'

const AGENT_ICONS: Record<string, string> = {
  EligibilityAgent:    '🔍',
  SDFCalculatorAgent:  '💰',
  SDFCalculator:       '💰',
  PermitAgent:         '📄',
  GovernmentQueue:     '🏛️',
  ApprovalAgent:       '✅',
  DisruptionAgent:     '⚡',
  GuideAssignment:     '🧭',
}

const EVENT_TYPE_ICONS: Record<string, string> = {
  CHECK:    '🔍',
  COMPUTE:  '💰',
  GENERATE: '📄',
  REVIEW:   '🏛️',
  APPROVE:  '✅',
  REJECT:   '❌',
  ALERT:    '⚡',
  ASSIGN:   '🧭',
}

function getIcon(event: AgentEvent): string {
  return AGENT_ICONS[event.agent] || EVENT_TYPE_ICONS[event.event_type] || '⚙️'
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getTotalDuration(events: AgentEvent[]): number {
  return events.reduce((acc, e) => acc + (e.duration_ms || 0), 0)
}

interface Props {
  events:    AgentEvent[]
  className?: string
}

export default function AgentChainTimeline({ events, className = '' }: Props) {
  const totalMs = getTotalDuration(events)

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#374151] uppercase tracking-wider">Agent Chain Audit</h3>
        {totalMs > 0 && (
          <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5 font-semibold">
            {totalMs.toLocaleString()}ms total
          </span>
        )}
      </div>

      <div className="relative">
        {events.map((event, idx) => {
          const isLast = idx === events.length - 1
          const isProcessing = event.status === 'processing'
          const isError = event.status === 'error'
          const isComplete = event.status === 'complete'

          return (
            <div key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
              {/* Connector line */}
              {!isLast && (
                <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-[#E5DDD0] to-transparent z-0" />
              )}

              {/* Icon bubble */}
              <div className="relative z-10 flex-shrink-0">
                {isProcessing ? (
                  <div className="w-10 h-10 rounded-full bg-blue-50 border-2 border-blue-300 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : isError ? (
                  <div className="w-10 h-10 rounded-full bg-red-50 border-2 border-red-300 flex items-center justify-center text-lg">
                    {getIcon(event)}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center text-lg">
                    {getIcon(event)}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 min-w-0 pt-1.5 pb-1 px-3 rounded-lg ${
                isProcessing ? 'bg-blue-50/60 border border-blue-100' :
                isError      ? 'bg-red-50/60 border border-red-100' :
                               'bg-white border border-[#F0EBE3]'
              }`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-xs font-bold text-[#374151] uppercase tracking-wide">
                      {event.agent}
                    </span>
                    {event.event_type && (
                      <span className={`ml-2 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isProcessing ? 'bg-blue-100 text-blue-700' :
                        isError      ? 'bg-red-100 text-red-700' :
                                       'bg-[#F3EDE3] text-[#6B7280]'
                      }`}>
                        {event.event_type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {event.duration_ms != null && event.duration_ms > 0 && (
                      <span className="text-[10px] text-[#9CA3AF] font-mono">{event.duration_ms}ms</span>
                    )}
                    <span className="text-[10px] text-[#9CA3AF]">{formatTimestamp(event.timestamp)}</span>
                  </div>
                </div>

                <p className={`text-sm mt-1 leading-snug ${
                  isProcessing ? 'text-blue-700' :
                  isError      ? 'text-red-700'  :
                                 'text-[#6B7280]'
                }`}>
                  {event.description}
                </p>

                {/* Processing indicator */}
                {isProcessing && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-blue-500 font-medium">Processing...</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary footer */}
      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#F0EBE3] flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-[#9CA3AF]">
            <span>{events.filter(e => e.status === 'complete').length} completed</span>
            {events.filter(e => e.status === 'processing').length > 0 && (
              <span className="text-blue-500">{events.filter(e => e.status === 'processing').length} in progress</span>
            )}
            {events.filter(e => e.status === 'error').length > 0 && (
              <span className="text-red-500">{events.filter(e => e.status === 'error').length} alerts</span>
            )}
          </div>
          {totalMs > 0 && (
            <div className="text-xs font-semibold text-[#374151]">
              Chain completed in <span className="text-[#E8762E]">{totalMs.toLocaleString()}ms</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
