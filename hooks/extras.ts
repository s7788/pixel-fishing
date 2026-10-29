import type { FishId, LureGame } from '../types'
import type { PixelSprite } from './pixels'
import { eachRun } from './pixels'
import { ANGLER } from './gen/angler'
import { visualRoll } from './ambience'

// Native pixel artwork: kept separate from the generated asset-pack files.
const species = {
  rainbow_trout: ['#75969b', '#e48b9c', '#e5e8cc', 7, 0],
  mandarin_fish: ['#9a9951', '#424d32', '#e6d39a', 9, 1],
  black_porgy: ['#526376', '#263547', '#bdc5cf', 10, 2],
  giant_trevally: ['#6b929d', '#31546a', '#d3ddd2', 10, 0],
  red_seabream: ['#d9787c', '#ae405a', '#f7c5ae', 10, 1],
  dogtooth_tuna: ['#3a6989', '#24465e', '#c6ded9', 6, 0],
} as const

const cache = new Map<string, PixelSprite>()
export function extraFish(id: FishId, kind: number | 'portrait' | 'icon' | 'unknown'): PixelSprite | undefined {
  if (!(id in species)) return undefined
  const key = `${id}/${kind}`
  const prior = cache.get(key)
  if (prior) return prior
  const [body, marking, belly, depth, pattern] = species[id as keyof typeof species]
  const icon = kind === 'icon' || kind === 'unknown'
  const w = icon ? 24 : kind === 'portrait' ? 96 : 48
  const h = icon ? 16 : kind === 'portrait' ? 64 : 24
  const scale = icon ? 0.5 : kind === 'portrait' ? 2 : 1
  const frame = typeof kind === 'number' ? kind : 0
  const left = frame === 4 || frame === 5
  const tail = [0, 1, 0, -1][frame % 4]!
  const rows = Array.from({ length: h }, (_, py) => {
    let row = ''
    for (let px = 0; px < w; px++) {
      const x = (left ? w - 1 - px : px) / scale
      const y = (py - h / 2) / scale
      let c = '.'
      const shape = ((x - 27) / 15) ** 2 + (y / (depth * 0.65)) ** 2
      if (x >= 5 && x <= 15 && Math.abs(y - tail) < (15 - x) * 0.7) c = 'B'
      if (x > 19 && x < 31 && y < -3 && y > -depth + Math.abs(x - 25) * 0.5) c = 'B'
      if (x > 23 && x < 32 && y > 3 && y < depth - Math.abs(x - 28) * 0.5) c = 'B'
      if (shape < 1) {
        c = shape > 0.82 ? 'O' : y > 2 ? 'C' : 'A'
        if (shape < 0.8 && x < 35 && (pattern === 0 ? Math.abs(y) < 1 : pattern === 1 ? (Math.floor(x) + Math.floor(y) * 3) % 7 === 0 : Math.floor(x / 3) % 2 === 0)) c = 'B'
        if (x > 35 && x < 38 && y > -3 && y < -1) c = 'E'
        if (x > 36 && x < 38 && y > -2.5 && y < -1.5) c = 'O'
        if (x > 38 && Math.abs(y - 1) < 0.5) c = 'O'
      }
      row += c
    }
    return row
  })
  const colors = { A: body, B: marking, C: belly, O: '#101e30', E: '#fff3ce' }
  const palette = kind === 'unknown' ? Object.fromEntries(Object.keys(colors).map(k => [k, '#6f7c99'])) : colors
  const sprite: PixelSprite = { w, h, rows, palette, facing: left ? 'left' : 'right', anchors: { mouth: [Math.round((left ? 7 : 41) * scale), Math.round(h / 2 + scale)] } }
  cache.set(key, sprite)
  return sprite
}

export type IdleAction = 'repair' | 'campfire' | 'daydream'
export function idleAction(g: LureGame): IdleAction | null {
  if (g.mode !== 'idle' || g.modeT < 40) return null
  const slot = Math.floor((g.modeT - 40) / 80)
  // Two seconds standing between activities. Alternate action groups so adjacent
  // slots cannot repeat, without a growing history or new save fields.
  if ((g.modeT - 40) % 80 >= 64) return null
  const offset = visualRoll(g, 0, 47) < 0.5 ? 0 : 1
  if ((slot + offset) % 2 === 0) return 'daydream'
  return g.venue !== 'boat' && visualRoll(g, slot, 53) < 0.45 ? 'campfire' : 'repair'
}

// Reuse the angler's hat and shirt, then draw a seated pose with bent legs.
export function restingAngler(action: IdleAction, frame: number): PixelSprite {
  const key = `rest/${action}/${frame}`
  const prior = cache.get(key)
  if (prior) return prior
  const source = ANGLER['idle/0']!
  const rows = Array.from({ length: 64 }, () => Array<string>(48).fill('.'))
  source.rows.slice(0, 35).forEach((row, y) => eachRun(row, (ch, x, n) => {
    for (let i = x; i < x + n; i++) rows[y + 12]![i] = ch
  }))
  const box = (x: number, y: number, w: number, h: number, c: string): void => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) rows[j]![i] = c
  }
  box(13, 47, 20, 7, 'A'); box(15, 47, 17, 5, 'V')
  box(28, 50, 8, 10, 'A'); box(30, 51, 4, 7, 'T')
  box(27, 58, 14, 4, 'A'); box(29, 58, 10, 2, 'K')
  box(13, 51, 9, 9, 'A'); box(15, 52, 5, 7, 'T')
  box(12, 59, 15, 3, 'K')
  if (action !== 'daydream') {
    box(27, 41 + frame % 2, 11, 4, 'A'); box(28, 42 + frame % 2, 9, 2, 'L')
  }
  const sprite: PixelSprite = { ...source, rows: rows.map(r => r.join('')), equipment: null }
  cache.set(key, sprite)
  return sprite
}

export function idleProp(action: IdleAction, frame: number): PixelSprite {
  const key = `prop/${action}/${frame}`
  const prior = cache.get(key)
  if (prior) return prior
  const rows = Array.from({ length: 40 }, () => Array<string>(48).fill('.'))
  const box = (x: number, y: number, w: number, h: number, c: string): void => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) rows[j]![i] = c
  }
  if (action === 'campfire') {
    box(9, 34, 28, 4, 'S'); box(13, 30, 20, 5, 'W')
    box(17, 20 - frame, 13, 13 + frame, 'R'); box(21, 17 + frame, 5, 16 - frame, 'Y')
    box(6, 12, 34, 2, 'W'); box(18, 8, 14, 7, 'F'); box(14, 9, 4, 5, 'F')
    box(29, 9, 1, 1, 'S'); box(23 + frame, 1, 2, 3, 'S')
  } else if (action === 'repair') {
    box(7, 29, 24, 10, 'S'); box(9, 31, 20, 6, 'W'); box(15, 26, 8, 3, 'S')
    box(1, 16, 44, 2, 'W'); box(26, 17, 6, 6, 'S'); box(28, 18, 2, 3, 'Y')
    box(4 + frame * 2, 25, 2, 4, 'Y')
  } else {
    box(13 + frame * 3, 5 - frame, 3, 3, 'S'); box(22 + frame * 2, 0, 5, 3, 'S')
  }
  const sprite = { w: 48, h: 40, rows: rows.map(r => r.join('')), palette: { S: '#718497', W: '#784826', R: '#ef6233', Y: '#ffd46a', F: '#d8aa70' } }
  cache.set(key, sprite)
  return sprite
}
