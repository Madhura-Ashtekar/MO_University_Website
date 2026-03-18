const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

const mealKeywords = [
  'breakfast', 'lunch', 'dinner', 'snack', 'snacks', 'recovery', 'smoothies',
  'pregame', 'pre-game', 'post game', 'post-game', 'pre-practice', 'post-practice',
]

const tzMap = {
  est: 'America/New_York', edt: 'America/New_York',
  cst: 'America/Chicago', cdt: 'America/Chicago',
  mst: 'America/Denver', mdt: 'America/Denver',
  pst: 'America/Los_Angeles', pdt: 'America/Los_Angeles',
}

// ─── TBD detection vocabulary ────────────────────────────────────────────────

const CUISINE_WORDS = new Set([
  'italian', 'greek', 'mexican', 'chinese', 'japanese', 'thai', 'indian',
  'mediterranean', 'american', 'barbecue', 'bbq', 'sushi', 'pizza', 'burgers',
  'sandwiches', 'seafood', 'steakhouse', 'steaks', 'asian', 'fusion',
])

// Words that by themselves flag vague vendors
const VAGUE_PATTERNS = [
  /^no\s+preference$/i,
  /^tbd$/i,
  /^to\s+be\s+(determined|decided)$/i,
  /\?/,   // any question mark
]

/**
 * Determine whether a parsed vendor string is ambiguous / unconfirmed.
 * Returns { isTbd, tbdReason } where tbdReason is one of:
 *   'unconfirmed' | 'multiple_options' | 'cuisine_only' | 'no_vendor' | null
 */
export function detectTbd(vendor) {
  if (!vendor || vendor.trim() === '') return { isTbd: true, tbdReason: 'no_vendor' }

  const v = vendor.trim()

  // Question mark anywhere → unconfirmed
  if (v.includes('?')) return { isTbd: true, tbdReason: 'unconfirmed' }

  // " or " between options → multiple options, user must pick
  if (/ or /i.test(v)) return { isTbd: true, tbdReason: 'multiple_options' }

  // Vague phrases
  if (VAGUE_PATTERNS.some(p => p.test(v))) return { isTbd: true, tbdReason: 'no_vendor' }

  // Pure cuisine label — check if every meaningful word is a cuisine/vague word
  const words = v.toLowerCase().replace(/[-/,]/g, ' ').split(/\s+/).filter(Boolean)
  const cuisineOrVague = words.every(w =>
    CUISINE_WORDS.has(w) || ['style', 'fancier', 'nicer', 'place', 'local', 'food', 'and'].includes(w)
  )
  if (cuisineOrVague) return { isTbd: true, tbdReason: 'cuisine_only' }

  return { isTbd: false, tbdReason: null }
}

// ─── Address splitting ────────────────────────────────────────────────────────

const ROAD_ABBREVS = /\b(Rd|St|Ave|Blvd|Dr|Ln|Way|Ct|Pl|Hwy|Pkwy|Road|Street|Avenue|Boulevard|Drive|Lane|Court|Place|Highway|Parkway)\b/i
const STARTS_WITH_NUMBER = /^\d+\s/

/**
 * Split a string that may be "VendorName, 1234 Street, City, ST ZIP"
 * into { vendor, address }.
 *
 * Strategy:
 *  1. Split by comma; find first segment that starts with a number + road keyword.
 *  2. If no comma-segment match, scan for an inline address (number + road) anywhere in text.
 *  3. Otherwise return whole string as vendor.
 */
function splitVendorFromAddress(text) {
  if (!text) return { vendor: null, address: null }
  const t = text.trim()

  // --- Pass 1: comma-segment scan ---
  const parts = t.split(',').map(p => p.trim())
  for (let i = 0; i < parts.length; i++) {
    if (STARTS_WITH_NUMBER.test(parts[i]) && ROAD_ABBREVS.test(parts[i])) {
      const vendor = parts.slice(0, i).join(', ').trim() || null
      const address = parts.slice(i).join(', ').trim()
      return { vendor, address }
    }
  }

  // --- Pass 2: inline address anywhere in the string (no brackets) ---
  // e.g. "Jimmy Johns 7404 Broadview Rd, Parma, OH 44134"
  const inlineMatch = t.match(/\s(\d+\s+\w[\w\s]*?\b(?:Rd|St|Ave|Blvd|Dr|Ln|Way|Ct|Pl|Hwy|Pkwy|Road|Street|Avenue|Boulevard|Drive|Lane|Court|Place|Highway|Parkway)\b[^\[]*)/i)
  if (inlineMatch) {
    const vendor = t.slice(0, inlineMatch.index).trim() || null
    const address = inlineMatch[1].trim()
    return { vendor, address }
  }

  // --- Pass 3: whole string is an address ---
  if (STARTS_WITH_NUMBER.test(t) && ROAD_ABBREVS.test(t)) {
    return { vendor: null, address: t }
  }

  return { vendor: t || null, address: null }
}

// ─── Line content parsing ─────────────────────────────────────────────────────

/**
 * Parse a single meal line into { vendor, address, notes }.
 *
 * Handles:
 *  - Bullet + bracket:      "- Lunch: Honeygrow [1485 Nagel Rd, Avon, OH 44011]"
 *  - Bracket with vendor:   "- Lunch: Jimmy Johns [Jimmy John's, 7404 Broadview Rd]"
 *  - Parenthetical note:    "- Breakfast: McDonalds (Cole handle)"
 *  - Simple preference:     "- Dinner: Italian"
 *  - "or" options:          "- Lunch: Roxa or Board and Brew"
 *  - Time-prefixed (MLB):   "8:30 PM CST Dinner - at Hotel"
 */
function parseLineContent(line) {
  const trimmed = line.trim()
  let vendor = null, address = null, notes = null

  // Extract bracket content, then remove brackets from line for colon parsing
  const bracketMatch = trimmed.match(/\[([^\]]+)\]/)
  const withoutBracket = bracketMatch
    ? (trimmed.slice(0, bracketMatch.index) + trimmed.slice(bracketMatch.index + bracketMatch[0].length)).trim()
    : trimmed

  // For bullet lines, extract text after the first colon
  const isBullet = /^[-•*]/.test(trimmed)
  let afterColon = null
  if (isBullet) {
    const colonIdx = withoutBracket.indexOf(':')
    if (colonIdx > -1) {
      afterColon = withoutBracket.slice(colonIdx + 1).trim() || null
    }
  }

  if (bracketMatch) {
    const { vendor: bv, address: ba } = splitVendorFromAddress(bracketMatch[1].trim())
    address = ba
    // Prefer explicit text before bracket (afterColon) as vendor name
    vendor = afterColon || bv || null
  } else if (afterColon) {
    // Check for parenthetical annotation: "McDonalds (Cole handle)"
    const parenMatch = afterColon.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
    if (parenMatch) {
      const { vendor: v, address: a } = splitVendorFromAddress(parenMatch[1].trim())
      vendor = v
      address = a
      notes = parenMatch[2].trim()
    } else {
      const { vendor: v, address: a } = splitVendorFromAddress(afterColon)
      vendor = v
      address = a
    }
  } else {
    // Time-prefixed lines: "8:30 PM CST Dinner - at Hotel"
    const dashMatch = trimmed.match(/\s+-\s+(.+)$/)
    if (dashMatch) notes = dashMatch[1].trim()
  }

  return { vendor, address, notes }
}

// ─── Core utility functions ───────────────────────────────────────────────────

function pad2(n) { return String(n).padStart(2, '0') }
function toIsoDate({ year, month, day }) { return `${year}-${pad2(month)}-${pad2(day)}` }

function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function looksLikeMealLine(line) {
  const lower = line.toLowerCase()
  return mealKeywords.some((k) => lower.includes(k))
}

function inferMealType(text) {
  const lower = text.toLowerCase()
  if (lower.includes('breakfast')) return 'Breakfast'
  if (lower.includes('lunch')) return 'Lunch'
  if (lower.includes('dinner')) return 'Dinner'
  if (lower.includes('smoothies')) return 'Pregame Smoothies'
  if (lower.includes('pre-practice')) return 'Pre-Practice Meal'
  if (lower.includes('pre-game') || lower.includes('pregame')) return 'Pre-Game Meal'
  if (lower.includes('post-game') || lower.includes('post game')) return 'Post-Game Meal'
  if (lower.includes('recovery') || lower.includes('snack')) return 'Snacks / Recovery'
  return 'Meal'
}

function inferLocationType(text) {
  const lower = text.toLowerCase()
  if (lower.includes('airport')) return 'airport'
  if (lower.includes('hotel')) return 'hotel'
  if (lower.includes('field') || lower.includes('stadium') || lower.includes('arena')) return 'field'
  if (lower.includes('bus') || lower.includes('transit')) return 'bus'
  if (lower.includes('per-diem') || lower.includes('per diem')) return 'perdiem'
  return 'restaurant'
}

function extractAtClause(text) {
  const match = text.match(/\(at ([^)]+)\)/i)
  return match ? match[1].trim() : null
}

function extractTimezone(text, fallback) {
  const match = text.match(/\b(EST|EDT|CST|CDT|MST|MDT|PST|PDT)\b/i)
  if (!match) return fallback
  return tzMap[match[1].toLowerCase()] || fallback
}

function extractTime(text) {
  const match12 = text.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i)
  if (match12) {
    let hours = Number(match12[1])
    const minutes = match12[2]
    const period = match12[3].toUpperCase()
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    return `${pad2(hours)}:${minutes}`
  }
  const match24 = text.match(/\b(\d{1,2}):(\d{2})\b/)
  if (match24) return `${pad2(match24[1])}:${match24[2]}`
  return null
}

function extractMmDd(text) {
  const match = text.match(/\b(\d{1,2})\/(\d{1,2})\b/)
  if (!match) return null
  return { month: Number(match[1]), day: Number(match[2]) }
}

function parseDayHeader(line, year) {
  const m = line.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b\s+(\d{1,2})/i)
  if (m) {
    const month = MONTHS[m[1].toLowerCase()]
    const day = Number(m[2])
    return toIsoDate({ year, month, day })
  }
  const dayNumMatch = line.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\/(\d{1,2})/i)
  if (dayNumMatch) {
    return toIsoDate({ year, month: Number(dayNumMatch[1]), day: Number(dayNumMatch[2]) })
  }
  return null
}

// ─── Metadata extraction ──────────────────────────────────────────────────────

const DIV_TOKENS = ['NCAA', 'NAIA', 'NJCAA', 'DI', 'DII', 'DIII']

function extractMetadata(text) {
  const lower = text.toLowerCase()
  const meta = { team: null, sport: null, division: null, venue: null, city: null, state: null, school: null }

  const teamMatch = text.match(/(?:planning|trip|itinerary|schedule)\s+(?:for|of)\s+([^.\n]+)/i)
  if (teamMatch) {
    const parts = teamMatch[1].trim().split(/\s+/)
    meta.team = parts[0]
    meta.sport = parts[0]
    const divToken = parts.slice(1).find(p => DIV_TOKENS.includes(p.toUpperCase()))
    if (divToken) meta.division = divToken.toUpperCase()
  } else if (lower.includes('wrestling')) {
    meta.team = 'Wrestling'; meta.sport = 'Wrestling'
  } else if (lower.includes('baseball')) {
    meta.team = 'Baseball'; meta.sport = 'Baseball'
  }

  const venueMatch = text.match(/Venue Info:\s*([^,.\n]+)/i) || text.match(/at\s+([^,.\n]+(?:Arena|Stadium|Field|Center|Complex))/i)
  if (venueMatch) meta.venue = venueMatch[1].trim()

  const addrMatch = text.match(/([^,.\n]+),\s*([A-Z]{2})\s*(\d{5})/i)
  if (addrMatch) {
    meta.city = addrMatch[1].trim()
    meta.state = addrMatch[2].trim()
  } else {
    const cityInMatch = text.match(/(?:is in|in|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/)
    if (cityInMatch) {
      const city = cityInMatch[1].trim()
      const blacklist = ['Good', 'Morning', 'The', 'They', 'Here', 'Once', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      if (city.length < 20 && !blacklist.includes(city)) meta.city = city
    }
  }

  return meta
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function parseAthleticsEmailToDraft({ text, year = 2026, defaultTimezone = 'America/New_York' }) {
  const raw = normalizeWhitespace(text)
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)

  const meta = extractMetadata(text)
  let currentDate = null
  const rows = []

  for (const line of lines) {
    const headerDate = parseDayHeader(line, year)
    if (headerDate) { currentDate = headerDate; continue }

    const mmdd = extractMmDd(line)
    if (mmdd && !currentDate) {
      currentDate = toIsoDate({ year, month: mmdd.month, day: mmdd.day })
    }

    if (!looksLikeMealLine(line)) continue

    const mealType = inferMealType(line)
    const atClause = extractAtClause(line)
    const time = extractTime(line)
    const timezone = extractTimezone(line, defaultTimezone)
    const locationType = inferLocationType(`${line} ${atClause || ''}`)

    let vendor = null, address = null, notes = null
    if (atClause) {
      vendor = atClause
    } else {
      const parsed = parseLineContent(line)
      vendor = parsed.vendor
      address = parsed.address
      notes = parsed.notes
    }

    const { isTbd, tbdReason } = detectTbd(vendor)

    rows.push({
      date: currentDate || toIsoDate({ year, month: 1, day: 1 }),
      time: time || null,
      timezone,
      mealType,
      locationType,
      vendor,
      address,
      notes: notes || '',
      isTbd,
      tbdReason,
    })
  }

  const seen = new Set()
  const unique = []
  for (const r of rows) {
    const key = `${r.date}|${r.time}|${r.mealType}|${r.vendor}|${r.address}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(r)
  }

  return { rows: unique, metadata: meta }
}

export const EXAMPLE_EMAIL_BASEBALL = `THURSDAY, FEBRUARY 19
8:00 AM EST Breakfast (at Cracked Eggery)
10:45 AM EST Lunch (at At Airport) Per-Diem
3:00 PM CST Pre-Practice Meal (at TBD-Pickup)
8:30 PM CST Dinner - at Hotel

FRIDAY, FEBRUARY 20
9:00 AM CST Breakfast
12:00 PM CST Lunch (at TBD Dropped Off At Hotel)
4:00 PM CST Pregame Smoothies (at At Field)
8:00 PM EST Dinner Provided (at At Field)
`

export const EXAMPLE_EMAIL_WRESTLING = `We wanted to get ahead of things and start some planning for Wrestling NCAA. They will be leaving 3/17 - 3/22 and need several meals.
Venue Info: Rocket Arena, 1 Center Court, Cleveland, OH 44115
Tuesday 3/17:
- Lunch meal in College Park: Roxa or Board and Brew
- Dinner meal in Cleveland: No preference
Wednesday 3/18 (Cleveland)
- Breakfast: Local Breakfast Place?
- Lunch: Honeygrow [1485 Nagel Rd, Avon, OH 44011]
- Dinner : Italian
Thursday 3/19 (Start Wrestling)
- Breakfast: McDonalds (Cole handle)
- Lunch: Jimmy Johns [Jimmy John's, 7404 Broadview Rd, Parma, OH 44134]
- Dinner: Italian
Sunday 3/22:
- Breakfast: Breakfast sandwich place
`
