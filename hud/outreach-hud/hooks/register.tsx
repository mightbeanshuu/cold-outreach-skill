import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Snapshot } from '../types'
import { snapshot } from './data'
import type { Files } from './data'

// Live side panel for the cold-outreach skill, in Synapse's palette.
const PANE = 'outreach-hud'
const TITLE = 'Outreach'
const REFRESH_MS = 3000
const snap = atom({ plugin: 'outreach-hud', key: 'snap' } as const, null)

const GRADIENT = [
  [0.0, 0x5c, 0x7c, 0xff],
  [0.3, 0x00, 0xb8, 0xff],
  [0.6, 0x00, 0xef, 0xd4],
  [1.0, 0x00, 0xff, 0xaa],
] as const
const CYAN = '#00efd4'
const BLUE = '#5c7cff'
const SKY = '#00b8ff'
const GREEN = '#00ff88'
const AMBER = '#ffae00'
const RED = '#ff5c7c'

function lerp(t: number): string {
  const x = Math.max(0, Math.min(1, t))
  for (let i = 0; i < GRADIENT.length - 1; i++) {
    const a = GRADIENT[i]
    const b = GRADIENT[i + 1]
    if (!a || !b) break
    const [p0, r0, g0, b0] = a
    const [p1, r1, g1, b1] = b
    if (x >= p0 && x <= p1) {
      const k = (x - p0) / (p1 - p0)
      const c = (u: number, v: number) => Math.round(u + (v - u) * k).toString(16).padStart(2, '0')
      return `#${c(r0, r1)}${c(g0, g1)}${c(b0, b1)}`
    }
  }
  return '#00ffaa'
}

async function workspace($: EngineInterface): Promise<string> {
  const ws = await $.env.get('OUTREACH_WS')
  const home = (await $.env.get('HOME')) ?? ''
  const raw = ws && ws.length ? ws : `${home}/Documents/cold-email`
  return raw.replace(/^~(?=\/|$)/, home)
}

async function readOr($: EngineInterface, path: string): Promise<string> {
  return (await $.fs.exists(path)) ? $.fs.read(path) : ''
}

async function load($: EngineInterface): Promise<Files> {
  const ws = await workspace($)
  let round: Files['round'] = null
  const roundsDir = `${ws}/rounds`
  if (await $.fs.exists(roundsDir)) {
    const dirs = (await $.fs.list(roundsDir)).filter(d => d.kind === 'dir').map(d => d.name).sort()
    const name = dirs[dirs.length - 1]
    if (name) {
      const entries = await $.fs.list(`${roundsDir}/${name}`)
      const tsvs = await Promise.all(
        entries.filter(x => x.kind === 'file' && /^_research_.*\.tsv$/.test(x.name))
          .map(x => $.fs.read(`${roundsDir}/${name}/${x.name}`)),
      )
      let drafts = 0
      for (const d of entries.filter(x => x.kind === 'dir')) {
        if (await $.fs.exists(`${roundsDir}/${name}/${d.name}/email.txt`)) drafts++
      }
      round = { name, tsvs, drafts }
    }
  }
  return {
    workspace: ws,
    profile: await readOr($, `${ws}/profile.toml`),
    sendLog: await readOr($, `${ws}/SEND-LOG.csv`),
    fuLog: await readOr($, `${ws}/FOLLOWUP-LOG.csv`),
    round,
  }
}

async function refresh($: EngineInterface, tick: number): Promise<void> {
  const now = await $.clock.now()
  let next: Snapshot
  try {
    next = snapshot(await load($), now, tick)
  } catch (err) {
    const prev = await read($, snap)
    if (!prev) return
    next = { ...prev, updatedAt: now, tick, error: String(err).slice(0, 80) }
  }
  await update($, snap, () => next)
}

function clock(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function pct(n: number, of: number): string {
  return of ? `${((100 * n) / of).toFixed(1)}%` : '0.0%'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'outreach', description: 'Open the live cold-outreach panel' })
    let tick = 0
    void refresh($, tick)
    $.clock.every(REFRESH_MS, () => {
      tick += 1
      void refresh($, tick)
    })
    return next(e)
  })

  on('command.run', { command: 'outreach' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Outreach panel opened. It refreshes every 3 seconds from the workspace logs.' }
  })

  // Open the panel the moment the cold-outreach skill loads (slash command or Skill tool).
  on('skill.prompt', { skill: 'cold-outreach' }, async ($, e, next) => {
    void $.ui.open({ id: PANE, title: TITLE })
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const s = await read($, snap)
    const cols = Math.max(28, e.props.bodyColumns)
    const rule = <Text dimColor>{'─'.repeat(cols)}</Text>

    if (!s) {
      return (
        <Box flexDirection="column">
          <Text color={CYAN} bold>◈ COLD OUTREACH</Text>
          <Text dimColor>⟨ linking to workspace… ⟩</Text>
        </Box>
      )
    }

    const barW = Math.max(10, Math.min(30, cols - 20))
    const killed = s.todaySent > 0 && (100 * s.todayBounced) / s.todaySent > s.stopPct
    const state = killed ? RED : s.todaySent >= s.hi ? AMBER : s.todaySent >= s.lo ? GREEN : SKY
    const filled = Math.min(barW, Math.round((barW * s.todaySent) / Math.max(1, s.hi)))
    const tickAt = Math.min(barW - 1, Math.round((barW * s.lo) / Math.max(1, s.hi)))
    const empty = Array.from({ length: barW - filled }, (_, i) => (filled + i === tickAt ? '│' : '░')).join('')
    const status = killed
      ? '✗ kill switch: stop new sends'
      : s.todaySent >= s.hi
        ? '✓ daily max reached'
        : s.todaySent >= s.lo
          ? '✓ in range'
          : `${s.lo - s.todaySent} to min · ${s.hi - s.todaySent} to max`
    const allPct = s.allSent ? (100 * s.allBounced) / s.allSent : 0
    const peak = Math.max(s.hi, ...s.days.map(d => d.sent + d.fu))
    const dayW = Math.max(6, cols - 22)
    const pulse = s.tick % 2 === 0 ? GREEN : '#00a860'
    const r = s.round

    return (
      <Box flexDirection="column" width={cols}>
        <Box justifyContent="space-between">
          <Text color={CYAN} bold>◈ COLD OUTREACH</Text>
          <Text>
            <Text color={pulse}>●</Text>
            <Text dimColor> live {clock(s.updatedAt)}</Text>
          </Text>
        </Box>
        <Text>
          {Array.from({ length: cols }, (_, i) => (
            <Text color={lerp(i / Math.max(1, cols - 1))}>▄</Text>
          ))}
        </Text>
        <Text dimColor wrap="truncate-end">{s.sender}</Text>
        {s.error && <Text color={AMBER} wrap="truncate-end">⚠ {s.error}</Text>}

        <Box marginTop={1}><Text color={BLUE} bold>TODAY</Text></Box>
        <Text>
          <Text dimColor>New      </Text>
          <Text color={state}>{'█'.repeat(filled)}</Text>
          <Text dimColor>{empty}</Text>
          <Text bold> {s.todaySent}</Text>
          <Text dimColor> / {s.lo}-{s.hi}</Text>
        </Text>
        <Text color={state} wrap="truncate-end">{'         '}{status}</Text>
        <Text>
          <Text dimColor>Bounces  </Text>
          <Text color={killed ? RED : s.todayBounced ? AMBER : GREEN}>
            {s.todayBounced} of {s.todaySent} · {pct(s.todayBounced, s.todaySent)}
          </Text>
          <Text dimColor> (stop &gt;{s.stopPct}%)</Text>
        </Text>
        <Text>
          <Text dimColor>Follow   </Text>
          <Text color={CYAN}>{s.todayFu} sent</Text>
          <Text dimColor> · due </Text>
          <Text color={s.dueFu1 ? AMBER : GREEN}>FU1 {s.dueFu1}</Text>
          <Text dimColor> · </Text>
          <Text color={s.dueFu2 ? AMBER : GREEN}>FU2 {s.dueFu2}</Text>
        </Text>

        <Box marginTop={1}>{rule}</Box>
        <Text color={BLUE} bold>LAST 7 DAYS <Text dimColor>█ new ▒ follow-up</Text></Text>
        {s.days.map(d => {
          const n = Math.round((dayW * d.sent) / peak)
          const f = Math.min(dayW - n, Math.round((dayW * d.fu) / peak))
          return (
            <Text>
              <Text dimColor>{d.label} </Text>
              <Text color={SKY}>{'█'.repeat(n)}</Text>
              <Text color={CYAN} dimColor>{'▒'.repeat(f)}</Text>
              <Text>{' '.repeat(Math.max(0, dayW - n - f))}</Text>
              <Text>{String(d.sent).padStart(4)}</Text>
              <Text dimColor>{String(d.fu).padStart(4)}</Text>
              <Text color={d.bounced ? RED : undefined} dimColor={!d.bounced}>
                {d.bounced ? ` ✗${d.bounced}` : '   '}
              </Text>
            </Text>
          )
        })}

        <Box marginTop={1}>{rule}</Box>
        <Text color={BLUE} bold>ROUND{r ? <Text dimColor> {r.name}</Text> : ''}</Text>
        {r ? (
          <Box flexDirection="column">
            <Text>
              <Text color={GREEN}>✓ {r.pass} pass</Text>
              <Text dimColor> · </Text>
              <Text color={RED}>✗ {r.fail} fail</Text>
              <Text dimColor> · </Text>
              <Text color={AMBER}>◆ {r.reveal} reveal</Text>
              <Text dimColor> · </Text>
              <Text color={SKY}>→ {r.apply} apply</Text>
            </Text>
            <Text dimColor>{r.drafts} drafts in folders</Text>
            {r.topFail && <Text dimColor wrap="truncate-end">top fail: {r.topFail}</Text>}
          </Box>
        ) : (
          <Text dimColor>no round yet: ask for a new round</Text>
        )}

        <Box marginTop={1}>{rule}</Box>
        <Text color={BLUE} bold>ALL TIME</Text>
        <Text>
          <Text bold>{s.allSent}</Text>
          <Text dimColor> sent · </Text>
          <Text color={allPct > s.stopPct ? RED : GREEN}>{s.allBounced} bounced {allPct.toFixed(1)}%</Text>
        </Text>
        <Text>
          <Text color={CYAN}>{s.replies} replies</Text>
          <Text dimColor> ({pct(s.replies, s.allSent)}) · </Text>
          <Text color={CYAN}>{s.allFu}</Text>
          <Text dimColor> follow-ups</Text>
        </Text>

        <Box marginTop={1}>
          <Text dimColor>⟨ refresh 3s · /outreach ⟩</Text>
        </Box>
      </Box>
    )
  })
}
