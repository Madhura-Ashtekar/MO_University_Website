const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

const mealKeywords = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'snacks',
  'recovery',
  'smoothies',
  'pregame',
  'pre-game',
  'post game',
  'post-game',
  'pre-practice',
  'post-practice',
]

const tzMap = {
  est: 'America/New_York',
  edt: 'America/New_York',
  cst: 'America/Chicago',
  cdt: 'America/Chicago',
  mst: 'America/Denver',
  mdt: 'America/Denver',
  pst: 'America/Los_Angeles',
  pdt: 'America/Los_Angeles',
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toIsoDate({ year, month, day }) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

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
  if (match24) {
    return `${pad2(match24[1])}:${match24[2]}`
  }
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

function extractNotesFromBullet(line) {
  // Bracketed address always wins over everything else
  const bracketMatch = line.match(/\[([^\]]+)\]/)
  if (bracketMatch) return bracketMatch[1].trim()

  // Bullet-format lines (wrestling style): "- Lunch: Roxa or Board and Brew"
  // Only search for a colon in lines that start with a bullet marker
  const trimmed = line.trim()
  if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx > -1) {
      const afterColon = trimmed.slice(colonIdx + 1).trim()
      if (afterColon.length > 0) return afterColon
    }
    return ''
  }

  // Time-prefixed lines (baseball style): "8:30 PM CST Dinner - at Hotel"
  // Look for a " - " separator after the time, NOT the colon inside the time
  const dashMatch = trimmed.match(/\s-\s(.+)$/)
  if (dashMatch) return dashMatch[1].trim()

  // No useful notes extractable from this line
  return ''
}

export function parseAthleticsEmailToDraft({ text, year = 2026, defaultTimezone = 'America/New_York' }) {
  const raw = normalizeWhitespace(text)
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)

  let currentDate = null
  const rows = []

  for (const line of lines) {
    const headerDate = parseDayHeader(line, year)
    if (headerDate) {
      currentDate = headerDate
      continue
    }

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

    let notes = ''
    if (atClause) {
      notes = atClause
    } else {
      notes = extractNotesFromBullet(line)
    }

    rows.push({
      date: currentDate || toIsoDate({ year, month: 1, day: 1 }),
      time: time || null,
      timezone,
      mealType,
      locationType,
      notes,
    })
  }

  const seen = new Set()
  const unique = []
  for (const r of rows) {
    const key = `${r.date}|${r.time}|${r.mealType}|${r.notes}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(r)
  }

  return { rows: unique }
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
