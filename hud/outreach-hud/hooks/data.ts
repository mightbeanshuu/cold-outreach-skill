import type { Day, Round, Snapshot } from '../types'

// Pure parsing of the cold-outreach workspace files; the same numbers scripts/stats.py prints.

export type Files = {
  workspace: string
  profile: string
  sendLog: string
  fuLog: string
  round: { name: string; tsvs: string[]; drafts: number } | null
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some(c => c !== '')) rows.push(row)
      row = []
    } else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  const [head, ...body] = rows
  if (!head) return []
  return body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ''])))
}

// Only the handful of keys the panel shows; a full TOML parser isn't needed for them.
function tomlValue(text: string, key: string): string | undefined {
  const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*("([^"]*)"|[^#\\n]+)`, 'm'))
  if (!m) return undefined
  return (m[2] ?? m[1] ?? '').trim()
}

export function localDay(ms: number, offsetDays = 0): string {
  const d = new Date(ms + offsetDays * 86400000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function isBounced(r: Record<string, string>): boolean {
  const o = (r.outcome ?? '').toUpperCase()
  return o.includes('BOUNCE') || o.includes('REJECT')
}

export function parseRound(name: string, tsvs: string[], drafts: number): Round {
  let pass = 0, fail = 0, reveal = 0, apply = 0
  const reasons = new Map<string, number>()
  for (const t of tsvs) {
    for (const line of t.split('\n')) {
      const cells = line.split('\t').map(c => c.trim()).filter(Boolean)
      if (!cells.length) continue
      const last = cells[cells.length - 1] ?? ''
      if (cells.includes('NEED-REVEAL')) reveal++
      else if (last.startsWith('PASS')) pass++
      else if (last.startsWith('APPLY-LINK')) apply++
      else if (last.startsWith('FAIL')) {
        fail++
        const why = last.replace(/^FAIL\s*/, '').slice(0, 40)
        reasons.set(why, (reasons.get(why) ?? 0) + 1)
      }
    }
  }
  const top = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0]
  return { name, pass, fail, reveal, apply, drafts, topFail: top ? `${top[0]} ×${top[1]}` : '' }
}

export function snapshot(f: Files, now: number, tick: number): Snapshot {
  const rows = parseCsv(f.sendLog)
  const fus = parseCsv(f.fuLog)
  const hi = Number(tomlValue(f.profile, 'daily_cap') ?? 40)
  const lo = Math.min(hi, Number(tomlValue(f.profile, 'daily_min') ?? Math.round(hi * 0.75)))
  const today = localDay(now)
  const day = rows.filter(r => r.date_sent === today)
  const due = (col: string, lab: string) =>
    rows.filter(r => r[col] && r[col] <= today && !(r.outcome ?? '').toUpperCase().includes(lab)
      && !(r.reply ?? '').trim() && !isBounced(r)).length
  const days: Day[] = []
  for (let i = 6; i >= 0; i--) {
    const d = localDay(now, -i)
    const dt = new Date(now - i * 86400000)
    days.push({
      label: `${DOW[dt.getDay()]} ${String(dt.getDate()).padStart(2, '0')}`,
      sent: rows.filter(r => r.date_sent === d).length,
      fu: fus.filter(r => r.date === d && r.result === 'SENT').length,
      bounced: rows.filter(r => r.date_sent === d && isBounced(r)).length,
    })
  }
  return {
    updatedAt: now,
    tick,
    workspace: f.workspace,
    sender: tomlValue(f.profile, 'gmail_address') ?? '(no sender set)',
    lo,
    hi,
    stopPct: Number(tomlValue(f.profile, 'bounce_stop_pct') ?? 3),
    todaySent: day.length,
    todayBounced: day.filter(isBounced).length,
    todayFu: fus.filter(r => r.date === today && r.result === 'SENT').length,
    dueFu1: due('followup1_due', 'FU1'),
    dueFu2: due('followup2_due', 'FU2'),
    replies: rows.filter(r => (r.reply ?? '').trim()).length,
    allSent: rows.length,
    allBounced: rows.filter(isBounced).length,
    allFu: fus.filter(r => r.result === 'SENT').length,
    days,
    round: f.round ? parseRound(f.round.name, f.round.tsvs, f.round.drafts) : null,
    error: null,
  }
}
