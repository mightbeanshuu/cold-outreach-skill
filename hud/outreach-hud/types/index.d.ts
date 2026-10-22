export type Day = { label: string; sent: number; fu: number; bounced: number }

export type Round = {
  name: string
  pass: number
  fail: number
  reveal: number
  apply: number
  drafts: number
  topFail: string
}

export type Snapshot = {
  updatedAt: number
  tick: number
  workspace: string
  sender: string
  lo: number
  hi: number
  stopPct: number
  todaySent: number
  todayBounced: number
  todayFu: number
  dueFu1: number
  dueFu2: number
  replies: number
  allSent: number
  allBounced: number
  allFu: number
  days: Day[]
  round: Round | null
  error: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'outreach-hud': { snap: Snapshot | null }
  }
}
