import type { LureGame } from '../types'
import type { PixelSprite } from './pixels'

/** Visual randomness has its own hash: rendering never advances the catch RNG. */
export function visualRoll(g: LureGame, slot: number, salt = 0): number {
  let n = (g.seed ^ Math.imul(g.castNo + 1, 0x45d9f3b) ^ Math.imul(slot + 1, 0x27d4eb2d) ^ salt) | 0
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

export type AmbientEvent = { kind: 'probe' | 'visitor'; age: number }
/** One five-second event per 32-second window, after an initial quiet period. */
export function ambientEvent(g: LureGame): AmbientEvent | null {
  if (g.mode !== 'working' && g.mode !== 'idle') return null
  const slot = Math.floor(g.modeT / 256)
  const start = 96 + Math.floor(visualRoll(g, slot, 17) * 65)
  const age = g.modeT % 256 - start
  if (age < 0 || age >= 40) return null
  // Alternation avoids consecutive repeats; the first event varies per cast.
  const probeFirst = visualRoll(g, 0, 31) < 0.5
  return { kind: g.mode === 'working' && ((slot % 2 === 0) === probeFirst) ? 'probe' : 'visitor', age }
}

const cache = new Map<string, PixelSprite>()
/** Small native pixel visitors, cached by venue and wing/leg frame. */
export function visitorSprite(venue: LureGame['venue'], frame: number): PixelSprite {
  const key = `${venue}/${frame & 1}`
  const prior = cache.get(key)
  if (prior) return prior
  const art = venue === 'lake'
    ? ['................', '..WW......WW....', '....WW..WW......', '......BB........', '...BBBBBBBBBB...', '......BB........', '....WW..WW......', '..WW......WW....']
    : venue === 'coast'
      ? ['................', '..R..........R..', '..RR..EE..RR....', '....RRRRRR......', '...RRRRRRRR.....', '..R.R....R.R....', '.R..R....R..R...', '................']
      : ['................', '........B.......', '.......BBB......', '...BBBBBBBBB....', '.BBBBBBBBBBBBB..', 'BB..WWWWWW..BBB.', 'B............BB.', '................']
  const rows = art.map((row, y) => frame & 1 && (y === 1 || y === 6) ? `.${row.slice(0, -1)}` : row)
  const sprite: PixelSprite = { w: 16, h: 8, rows, palette: { W: '#b9e1df', B: '#527e91', R: '#d77951', E: '#182b3d' } }
  cache.set(key, sprite)
  return sprite
}
