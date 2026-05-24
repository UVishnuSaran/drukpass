const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('drukpass_token')
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || `Request failed: ${res.status}`)
  }

  return res.json()
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type BookingStatus = 'PROCESSING' | 'PENDING' | 'CONFIRMED' | 'DISRUPTED' | 'REJECTED'
export type PermitStatus  = 'PENDING'    | 'APPROVED' | 'REJECTED'  | 'EXPIRED'

export interface AgentEvent {
  id:          string
  agent:       string
  event_type:  string
  description: string
  status:      'processing' | 'complete' | 'error'
  timestamp:   string
  duration_ms?: number
  metadata?:   Record<string, unknown>
}

export interface Booking {
  id:                string
  reference:         string
  traveler_name:     string
  nationality:       string
  passport_number:   string
  date_of_birth:     string
  email:             string
  entry_date:        string
  exit_date:         string
  duration_days:     number
  entry_point:       string
  districts:         string[]
  travel_purpose:    string
  status:            BookingStatus
  sdf_amount:        number
  sdf_currency:      string
  permit_ids:        string[]
  operator_id:       string
  operator_name:     string
  guide_id?:         string
  guide_name?:       string
  agent_events:      AgentEvent[]
  created_at:        string
  updated_at:        string
}

export interface Permit {
  id:              string
  permit_number:   string
  type:            string
  booking_id:      string
  traveler_name:   string
  nationality:     string
  operator_name:   string
  guide_name?:     string
  entry_date:      string
  exit_date:       string
  districts:       string[]
  status:          PermitStatus
  qr_data:         string
  issued_at?:      string
  rejected_at?:    string
  rejection_reason?: string
  created_at:      string
}

export interface GovDashboard {
  stats: {
    permits_pending:     number
    approved_today:      number
    sdf_revenue_today:   number
    active_travelers:    number
  }
  pending_permits: Permit[]
  district_stats:  Array<{ district: string; travelers: number; active_permits: number }>
  recent_activity: AgentEvent[]
  disruption_alerts: Array<{
    id:          string
    severity:    'HIGH' | 'MEDIUM' | 'LOW'
    title:       string
    description: string
    affected:    string[]
    created_at:  string
  }>
}

export interface GuideAssignment {
  id:            string
  booking_id:    string
  traveler_name: string
  entry_date:    string
  exit_date:     string
  districts:     string[]
  operator_name: string
  operator_phone?: string
  status:        string
}

export interface GuideProfile {
  id:              string
  name:            string
  license_number:  string
  cert_expiry:     string
  permits:         Permit[]
  assignments:     GuideAssignment[]
}

export interface EligibilityCheckRequest {
  nationality:    string
  entry_date:     string
  exit_date:      string
  travel_purpose: string
}

export interface EligibilityCheckResponse {
  eligible:      boolean
  sdf_per_day:   number
  total_sdf:     number
  currency:      string
  requirements:  string[]
  restrictions:  string[]
}

export interface NewBookingPayload {
  traveler_name:   string
  nationality:     string
  passport_number: string
  date_of_birth:   string
  email:           string
  entry_date:      string
  exit_date:       string
  entry_point:     string
  districts:       string[]
  travel_purpose:  string
}

// ── API Functions ──────────────────────────────────────────────────────────────

export async function checkEligibility(data: EligibilityCheckRequest): Promise<EligibilityCheckResponse> {
  return request('/api/check-eligibility', {
    method: 'POST',
    body:   JSON.stringify(data),
  })
}

export async function createBooking(data: NewBookingPayload): Promise<Booking> {
  return request('/api/bookings', {
    method: 'POST',
    body:   JSON.stringify(data),
  })
}

export async function getBookings(): Promise<Booking[]> {
  return request('/api/bookings')
}

export async function getBooking(id: string): Promise<Booking> {
  return request(`/api/bookings/${id}`)
}

export async function getPermits(): Promise<Permit[]> {
  return request('/api/permits')
}

export async function approvePermit(id: string): Promise<Permit> {
  return request(`/api/permits/${id}/approve`, { method: 'POST' })
}

export async function rejectPermit(id: string, reason: string): Promise<Permit> {
  return request(`/api/permits/${id}/reject`, {
    method: 'POST',
    body:   JSON.stringify({ reason }),
  })
}

export async function getGovDashboard(): Promise<GovDashboard> {
  return request('/api/government/dashboard')
}

export async function getGuideProfile(): Promise<GuideProfile> {
  return request('/api/guide/profile')
}

export async function getGuideAssignments(): Promise<GuideAssignment[]> {
  return request('/api/guide/assignments')
}

// ── Mock data for offline/demo use ────────────────────────────────────────────

export const MOCK_BOOKINGS: Booking[] = [
  {
    id:              'bk-001',
    reference:       'DPK-2025-0841',
    traveler_name:   'Rajesh Mehta',
    nationality:     'India',
    passport_number: 'N4821903',
    date_of_birth:   '1985-03-22',
    email:           'rajesh.mehta@gmail.com',
    entry_date:      '2025-07-15',
    exit_date:       '2025-07-22',
    duration_days:   7,
    entry_point:     'Paro International Airport',
    districts:       ['Paro', 'Thimphu', 'Punakha'],
    travel_purpose:  'Tourism',
    status:          'CONFIRMED',
    sdf_amount:      1750,
    sdf_currency:    'USD',
    permit_ids:      ['pm-001'],
    operator_id:     'op-001',
    operator_name:   'Tashi Gyeltshen Tours',
    guide_id:        'gd-001',
    guide_name:      'Tenzin Norbu',
    agent_events: [
      { id:'ae-1', agent:'EligibilityAgent',   event_type:'CHECK',    description:'India passport verified. SAARC region — standard SDF applies.',  status:'complete', timestamp:'2025-06-10T08:01:02Z', duration_ms:1240 },
      { id:'ae-2', agent:'SDFCalculatorAgent', event_type:'COMPUTE',  description:'SDF: 7 days × $250/day = $1,750 USD.', status:'complete', timestamp:'2025-06-10T08:01:03Z', duration_ms:380  },
      { id:'ae-3', agent:'PermitAgent',        event_type:'GENERATE', description:'Tourism permit TP-0841 generated for Paro, Thimphu, Punakha.', status:'complete', timestamp:'2025-06-10T08:01:04Z', duration_ms:820  },
      { id:'ae-4', agent:'GovernmentQueue',    event_type:'REVIEW',   description:'Submitted to Tourism Council review queue.', status:'complete', timestamp:'2025-06-10T08:01:05Z', duration_ms:210  },
      { id:'ae-5', agent:'ApprovalAgent',      event_type:'APPROVE',  description:'Permit approved by Pema Wangdi, Tourism Council.', status:'complete', timestamp:'2025-06-10T08:03:11Z', duration_ms:0 },
    ],
    created_at:  '2025-06-10T08:01:00Z',
    updated_at:  '2025-06-10T08:03:11Z',
  },
  {
    id:              'bk-002',
    reference:       'DPK-2025-0842',
    traveler_name:   'Sarah Thompson',
    nationality:     'United Kingdom',
    passport_number: 'GB8821044',
    date_of_birth:   '1990-09-14',
    email:           's.thompson@travel.co.uk',
    entry_date:      '2025-07-20',
    exit_date:       '2025-07-30',
    duration_days:   10,
    entry_point:     'Paro International Airport',
    districts:       ['Paro', 'Haa', 'Bumthang'],
    travel_purpose:  'Cultural Tourism',
    status:          'PROCESSING',
    sdf_amount:      2000,
    sdf_currency:    'USD',
    permit_ids:      [],
    operator_id:     'op-001',
    operator_name:   'Tashi Gyeltshen Tours',
    agent_events: [
      { id:'ae-6', agent:'EligibilityAgent',   event_type:'CHECK',   description:'UK passport verified. Standard SDF rate applies.', status:'complete', timestamp:'2025-06-11T09:10:00Z', duration_ms:980 },
      { id:'ae-7', agent:'SDFCalculatorAgent', event_type:'COMPUTE', description:'SDF: 10 days × $200/day = $2,000 USD.', status:'complete', timestamp:'2025-06-11T09:10:01Z', duration_ms:310 },
      { id:'ae-8', agent:'PermitAgent',        event_type:'GENERATE', description:'Generating permits for Paro, Haa, Bumthang...', status:'processing', timestamp:'2025-06-11T09:10:02Z' },
    ],
    created_at: '2025-06-11T09:10:00Z',
    updated_at: '2025-06-11T09:10:02Z',
  },
  {
    id:              'bk-003',
    reference:       'DPK-2025-0843',
    traveler_name:   'Hiroshi Tanaka',
    nationality:     'Japan',
    passport_number: 'TK9913820',
    date_of_birth:   '1978-12-01',
    email:           'h.tanaka@softbank.jp',
    entry_date:      '2025-08-05',
    exit_date:       '2025-08-12',
    duration_days:   7,
    entry_point:     'Phuentsholing Land Border',
    districts:       ['Thimphu', 'Wangdue Phodrang'],
    travel_purpose:  'Business',
    status:          'PENDING',
    sdf_amount:      1400,
    sdf_currency:    'USD',
    permit_ids:      ['pm-003'],
    operator_id:     'op-001',
    operator_name:   'Tashi Gyeltshen Tours',
    agent_events: [
      { id:'ae-9',  agent:'EligibilityAgent',   event_type:'CHECK',    description:'Japan passport verified. Business visa category confirmed.', status:'complete', timestamp:'2025-06-12T11:00:00Z', duration_ms:1100 },
      { id:'ae-10', agent:'SDFCalculatorAgent', event_type:'COMPUTE',  description:'SDF: 7 days × $200/day = $1,400 USD.', status:'complete', timestamp:'2025-06-12T11:00:01Z', duration_ms:290  },
      { id:'ae-11', agent:'PermitAgent',        event_type:'GENERATE', description:'Business travel permit BP-0843 generated.', status:'complete', timestamp:'2025-06-12T11:00:02Z', duration_ms:760  },
      { id:'ae-12', agent:'GovernmentQueue',    event_type:'REVIEW',   description:'Awaiting government review. Queued for 2h 15m.', status:'processing', timestamp:'2025-06-12T11:00:03Z' },
    ],
    created_at: '2025-06-12T11:00:00Z',
    updated_at: '2025-06-12T13:15:00Z',
  },
  {
    id:              'bk-004',
    reference:       'DPK-2025-0838',
    traveler_name:   'Maria Santos',
    nationality:     'Brazil',
    passport_number: 'BR7741920',
    date_of_birth:   '1995-06-30',
    email:           'maria.s@tourismo.br',
    entry_date:      '2025-06-28',
    exit_date:       '2025-07-05',
    duration_days:   7,
    entry_point:     'Paro International Airport',
    districts:       ['Paro', 'Thimphu'],
    travel_purpose:  'Tourism',
    status:          'DISRUPTED',
    sdf_amount:      1400,
    sdf_currency:    'USD',
    permit_ids:      ['pm-004'],
    operator_id:     'op-001',
    operator_name:   'Tashi Gyeltshen Tours',
    agent_events: [
      { id:'ae-13', agent:'EligibilityAgent',    event_type:'CHECK',    description:'Brazil passport verified.', status:'complete',    timestamp:'2025-06-05T07:00:00Z', duration_ms:890 },
      { id:'ae-14', agent:'SDFCalculatorAgent',  event_type:'COMPUTE',  description:'SDF: 7 days × $200/day = $1,400 USD.', status:'complete', timestamp:'2025-06-05T07:00:01Z', duration_ms:340 },
      { id:'ae-15', agent:'PermitAgent',         event_type:'GENERATE', description:'Tourism permit issued.', status:'complete',    timestamp:'2025-06-05T07:00:02Z', duration_ms:810 },
      { id:'ae-16', agent:'DisruptionAgent',     event_type:'ALERT',    description:'Flight cancellation detected: PBH→DEL on 2025-06-28. Permit suspended pending rescheduling.', status:'error', timestamp:'2025-06-27T22:10:00Z' },
    ],
    created_at: '2025-06-05T07:00:00Z',
    updated_at: '2025-06-27T22:10:00Z',
  },
]

export const MOCK_PERMITS: Permit[] = [
  {
    id:            'pm-001',
    permit_number: 'TP-2025-0841',
    type:          'Tourism Permit',
    booking_id:    'bk-001',
    traveler_name: 'Rajesh Mehta',
    nationality:   'India',
    operator_name: 'Tashi Gyeltshen Tours',
    guide_name:    'Tenzin Norbu',
    entry_date:    '2025-07-15',
    exit_date:     '2025-07-22',
    districts:     ['Paro', 'Thimphu', 'Punakha'],
    status:        'APPROVED',
    qr_data:       'DRUKPASS:TP-2025-0841:APPROVED:2025-07-15:2025-07-22',
    issued_at:     '2025-06-10T08:03:11Z',
    created_at:    '2025-06-10T08:01:04Z',
  },
  {
    id:            'pm-003',
    permit_number: 'BP-2025-0843',
    type:          'Business Travel Permit',
    booking_id:    'bk-003',
    traveler_name: 'Hiroshi Tanaka',
    nationality:   'Japan',
    operator_name: 'Tashi Gyeltshen Tours',
    entry_date:    '2025-08-05',
    exit_date:     '2025-08-12',
    districts:     ['Thimphu', 'Wangdue Phodrang'],
    status:        'PENDING',
    qr_data:       'DRUKPASS:BP-2025-0843:PENDING:2025-08-05:2025-08-12',
    created_at:    '2025-06-12T11:00:02Z',
  },
]

export const MOCK_GOV_DASHBOARD: GovDashboard = {
  stats: {
    permits_pending:   12,
    approved_today:    47,
    sdf_revenue_today: 38400,
    active_travelers:  214,
  },
  pending_permits: [
    {
      id:            'pm-003',
      permit_number: 'BP-2025-0843',
      type:          'Business Travel Permit',
      booking_id:    'bk-003',
      traveler_name: 'Hiroshi Tanaka',
      nationality:   'Japan',
      operator_name: 'Tashi Gyeltshen Tours',
      entry_date:    '2025-08-05',
      exit_date:     '2025-08-12',
      districts:     ['Thimphu', 'Wangdue Phodrang'],
      status:        'PENDING',
      qr_data:       'DRUKPASS:BP-2025-0843:PENDING',
      created_at:    '2025-06-12T11:00:02Z',
    },
    {
      id:            'pm-005',
      permit_number: 'TP-2025-0844',
      type:          'Tourism Permit',
      booking_id:    'bk-005',
      traveler_name: 'Elena Volkov',
      nationality:   'Russia',
      operator_name: 'Druk Heritage Expeditions',
      entry_date:    '2025-07-18',
      exit_date:     '2025-07-28',
      districts:     ['Bumthang', 'Trongsa', 'Zhemgang'],
      status:        'PENDING',
      qr_data:       'DRUKPASS:TP-2025-0844:PENDING',
      created_at:    '2025-06-12T07:22:00Z',
    },
    {
      id:            'pm-006',
      permit_number: 'TP-2025-0845',
      type:          'Tourism Permit',
      booking_id:    'bk-006',
      traveler_name: 'James O\'Brien',
      nationality:   'Ireland',
      operator_name: 'Himalayan Spirit Tours',
      entry_date:    '2025-07-25',
      exit_date:     '2025-08-04',
      districts:     ['Paro', 'Haa'],
      status:        'PENDING',
      qr_data:       'DRUKPASS:TP-2025-0845:PENDING',
      created_at:    '2025-06-12T05:44:00Z',
    },
  ],
  district_stats: [
    { district: 'Thimphu',          travelers: 84,  active_permits: 71  },
    { district: 'Paro',             travelers: 73,  active_permits: 66  },
    { district: 'Punakha',          travelers: 41,  active_permits: 38  },
    { district: 'Bumthang',         travelers: 29,  active_permits: 26  },
    { district: 'Haa',              travelers: 18,  active_permits: 16  },
    { district: 'Wangdue Phodrang', travelers: 15,  active_permits: 13  },
    { district: 'Trongsa',          travelers: 12,  active_permits: 11  },
    { district: 'Zhemgang',         travelers: 8,   active_permits: 7   },
    { district: 'Gasa',             travelers: 4,   active_permits: 4   },
    { district: 'Lhuntse',          travelers: 3,   active_permits: 3   },
  ],
  recent_activity: [
    { id:'ra-1', agent:'ApprovalAgent',    event_type:'APPROVE',  description:'Permit TP-2025-0839 approved for Akira Watanabe (Japan)',      status:'complete', timestamp:'2025-06-12T13:41:00Z' },
    { id:'ra-2', agent:'PermitAgent',      event_type:'GENERATE', description:'New permit TP-2025-0845 generated — James O\'Brien, Ireland',   status:'complete', timestamp:'2025-06-12T13:38:00Z' },
    { id:'ra-3', agent:'SDFCalculator',   event_type:'COMPUTE',  description:'SDF $1,800 computed for booking DPK-2025-0846',                 status:'complete', timestamp:'2025-06-12T13:35:00Z' },
    { id:'ra-4', agent:'EligibilityAgent', event_type:'CHECK',    description:'Eligibility confirmed: Chen Wei (China) — 12 days, Thimphu',   status:'complete', timestamp:'2025-06-12T13:30:00Z' },
    { id:'ra-5', agent:'ApprovalAgent',    event_type:'APPROVE',  description:'Permit BP-2025-0840 approved for Fatima Al-Rashid (UAE)',       status:'complete', timestamp:'2025-06-12T13:22:00Z' },
    { id:'ra-6', agent:'DisruptionAgent',  event_type:'ALERT',    description:'Weather alert: Haa district — road closure on Chele La Pass',  status:'error',    timestamp:'2025-06-12T13:10:00Z' },
    { id:'ra-7', agent:'PermitAgent',      event_type:'GENERATE', description:'Permit TP-2025-0844 generated — Elena Volkov, Russia',          status:'complete', timestamp:'2025-06-12T13:05:00Z' },
    { id:'ra-8', agent:'ApprovalAgent',    event_type:'REJECT',   description:'Permit rejected: insufficient travel insurance documentation',   status:'error',    timestamp:'2025-06-12T12:58:00Z' },
    { id:'ra-9', agent:'EligibilityAgent', event_type:'CHECK',    description:'Eligibility verified: Lena Schmidt (Germany) — 14 days tour',  status:'complete', timestamp:'2025-06-12T12:45:00Z' },
    { id:'ra-10',agent:'SDFCalculator',   event_type:'COMPUTE',  description:'SDF $2,800 computed for 14-day booking DPK-2025-0847',          status:'complete', timestamp:'2025-06-12T12:40:00Z' },
  ],
  disruption_alerts: [
    {
      id:          'da-1',
      severity:    'HIGH',
      title:       'Flight Disruption — Maria Santos (Brazil)',
      description: 'Inbound flight PBH-DEL cancelled 2025-06-27. Traveler stranded. Permit DPK-2025-0838 suspended.',
      affected:    ['DPK-2025-0838'],
      created_at:  '2025-06-27T22:10:00Z',
    },
    {
      id:          'da-2',
      severity:    'MEDIUM',
      title:       'Road Closure — Chele La Pass (Haa District)',
      description: 'Landslide reported. Alternative routes advised for permits covering Haa district.',
      affected:    ['DPK-2025-0845', 'DPK-2025-0831'],
      created_at:  '2025-06-12T13:10:00Z',
    },
  ],
}

export const MOCK_GUIDE_PROFILE: GuideProfile = {
  id:             'gd-001',
  name:           'Tenzin Norbu',
  license_number: 'GTB-2019-0471',
  cert_expiry:    '2025-12-31',
  permits: [
    {
      id:            'pm-001',
      permit_number: 'TP-2025-0841',
      type:          'Tourism Permit',
      booking_id:    'bk-001',
      traveler_name: 'Rajesh Mehta',
      nationality:   'India',
      operator_name: 'Tashi Gyeltshen Tours',
      guide_name:    'Tenzin Norbu',
      entry_date:    '2025-07-15',
      exit_date:     '2025-07-22',
      districts:     ['Paro', 'Thimphu', 'Punakha'],
      status:        'APPROVED',
      qr_data:       'DRUKPASS:TP-2025-0841:APPROVED:2025-07-15:2025-07-22:GTB-2019-0471',
      issued_at:     '2025-06-10T08:03:11Z',
      created_at:    '2025-06-10T08:01:04Z',
    },
  ],
  assignments: [
    {
      id:            'as-001',
      booking_id:    'bk-001',
      traveler_name: 'Rajesh Mehta',
      entry_date:    '2025-07-15',
      exit_date:     '2025-07-22',
      districts:     ['Paro', 'Thimphu', 'Punakha'],
      operator_name: 'Tashi Gyeltshen Tours',
      operator_phone: '+975-2-123456',
      status:        'CONFIRMED',
    },
    {
      id:            'as-002',
      booking_id:    'bk-007',
      traveler_name: 'Anna Bergström',
      entry_date:    '2025-08-01',
      exit_date:     '2025-08-08',
      districts:     ['Paro', 'Haa'],
      operator_name: 'Tashi Gyeltshen Tours',
      operator_phone: '+975-2-123456',
      status:        'CONFIRMED',
    },
  ],
}
