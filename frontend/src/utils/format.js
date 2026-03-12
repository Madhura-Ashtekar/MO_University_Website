const STATUS_LABELS = {
  submitted: 'Submitted',
  approved: 'Approved',
  billing_prepped: 'Billing Ready',
  dispatch_approved: 'Dispatched',
  context_only: 'Context Only',
}

const FULFILLMENT_LABELS = {
  mo_delivery: 'MO Delivery',
  mo_pickup: 'MO Pickup',
  not_mo: 'Not MO',
  tbd: 'TBD',
}

const QUEUE_TYPE_LABELS = {
  feasibility: 'Feasibility Review',
  resolve_tbd: 'Resolve TBD Vendor',
  billing_prep: 'Billing Preparation',
  dispatch_approval: 'Dispatch Approval',
}

const TZ_SHORT = {
  'America/New_York': 'ET',
  'America/Chicago': 'CT',
  'America/Denver': 'MT',
  'America/Los_Angeles': 'PT',
}

export function statusLabel(raw) {
  return STATUS_LABELS[raw] || raw
}

export function fulfillmentLabel(raw) {
  return FULFILLMENT_LABELS[raw] || raw
}

export function queueTypeLabel(raw) {
  return QUEUE_TYPE_LABELS[raw] || raw
}

export function tzShort(iana) {
  return TZ_SHORT[iana] || iana
}

export function fmtDate(isoDate) {
  if (!isoDate) return '—'
  try {
    const d = new Date(isoDate + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return isoDate
  }
}

export function fmtDateShort(isoDate) {
  if (!isoDate) return '—'
  try {
    const d = new Date(isoDate + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return isoDate
  }
}

export function fmtTime12(time24) {
  if (!time24 || time24 === 'TBD') return time24 || '—'
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}
