import type { FishId, LureGame as Game, LureId } from '../types'
import { MOTION, SHADOW_SCALE, TOPWATER, VENUES } from './data'
import type { PixelSprite } from './pixels'
import type { AnglerAnim, EffectId, RodId } from './sprites'
import { anchor, anglerFrame, effectFrame, fishFrame, holdsNet, lureWorld, netSprite, rodOf, rodSprite } from './sprites'

/**
 * Where everything stands at one tick, in canvas pixels (384x216): the
 * geometry the pack's README lays out. The angler's feet go on the venue's
 * `feet`; the rod hangs from the frame's `grip`; the line runs from the rod's
 * `tip` to the lure's `tie`, or to the fish's `mouth` once it is on; effects
 * sit by their `water` anchor. Pure, so a test can check that the line meets
 * the lure and the fish stays in the water.
 */

export type Point = readonly [number, number]
export type Placed = { sprite: PixelSprite; x: number; y: number; scale?: number; flip?: boolean }
export type Layout = {
  angler: Placed
  rod: Placed | null
  net: Placed | null
  lure: Placed | null
  /** From the rod tip to the lure's tie or the fish's mouth; null when nothing is tied on. */
  line: readonly [Point, Point] | null
  /** The fish in the water, or held up; `shadow` draws it as a dark shape under the surface. */
  fish: (Placed & { shadow: boolean; mouth: Point }) | null
  effects: Placed[]
  /** 0..1 while fighting, else null. */
  tension: number | null
  isCard: boolean
}

const lerp = (a: number, b: number, f: number): number => a + (b - a) * f

/** The lure's tie point at tick `c` of the working cycle on a venue. */
export function lurePointAt(venue: Game['venue'], c: number): Point | null {
  const v = VENUES[venue]
  if (v.isDrop) return [v.lureAt[0], v.lureAt[1] + [0, 3, 6, 3][(c >> 1) & 3]!]
  const t = c % MOTION.cycle
  if (t < MOTION.splashAt) return null
  if (t < MOTION.retrieveEnd) {
    const f = Math.min(1, (t - MOTION.castTicks) / (MOTION.retrieveEnd - MOTION.castTicks))
    return [Math.round(lerp(v.lureAt[0], v.lureNear[0], Math.max(0, f))), v.lureAt[1]]
  }
  return v.lureNear
}

/** The angler's animation and frame at tick `c` of the working cycle. */
export function anglerAt(venue: Game['venue'], c: number): { anim: AnglerAnim; frame: number } {
  if (VENUES[venue].isDrop) return { anim: 'boat_drop', frame: (c >> 1) & 3 }
  const t = c % MOTION.cycle
  if (t < MOTION.castTicks) return { anim: 'cast', frame: Math.min(t, 3) }
  if (t < MOTION.retrieveEnd) {
    const r = t - MOTION.castTicks
    return { anim: ((r >> 3) & 1) === 0 ? 'retrieve' : 'twitch', frame: r & 3 }
  }
  return { anim: 'idle', frame: ((t - MOTION.retrieveEnd) >> 1) & 3 }
}

function placeAngler(g: Game, anim: AnglerAnim, frame: number): { angler: Placed; grip: Point } {
  const v = VENUES[g.venue]
  const sprite = anglerFrame(anim, frame)
  const feet = anchor(sprite, 'feet')
  const x = v.feet[0] - feet[0]
  const y = v.feet[1] - feet[1]
  const grip = anchor(sprite, 'grip')
  return { angler: { sprite, x, y }, grip: [x + grip[0], y + grip[1]] }
}

function placeRod(g: Game, frame: PixelSprite, grip: Point, fallback: RodId | null): { rod: Placed | null; tip: Point | null } {
  const id = rodOf(frame, fallback)
  if (id === null) return { rod: null, tip: null }
  const s = VENUES[g.venue].rodScale
  const sprite = rodSprite(id)
  const rg = anchor(sprite, 'grip')
  const rt = anchor(sprite, 'tip')
  const x = Math.round(grip[0] - rg[0] * s)
  const y = Math.round(grip[1] - rg[1] * s)
  return { rod: { sprite, x, y, scale: s }, tip: [Math.round(x + rt[0] * s), Math.round(y + rt[1] * s)] }
}

function placeLure(id: LureId, tie: Point): Placed {
  const sprite = lureWorld(id)
  const a = anchor(sprite, 'tie')
  return { sprite, x: tie[0] - a[0], y: tie[1] - a[1] }
}

function placeEffect(id: EffectId, frame: number, water: Point): Placed {
  const sprite = effectFrame(id, frame)
  const a = anchor(sprite, 'water')
  return { sprite, x: water[0] - a[0], y: water[1] - a[1] }
}

/**
 * A fish centred on (cx, cy), facing `facing`; the pack's frames face right
 * except the turn frames, so a frame is mirrored when its own facing differs.
 */
function placeFish(id: FishId, frame: number, cx: number, cy: number, facing: 'left' | 'right', scale = 1, shadow = false): NonNullable<Layout['fish']> {
  const sprite = fishFrame(id, frame)
  const flip = (sprite.facing ?? 'right') !== facing
  const w = sprite.w * scale
  const h = sprite.h * scale
  const x = Math.round(cx - w / 2)
  const y = Math.round(cy - h / 2)
  const m = anchor(sprite, 'mouth')
  const mouth: Point = [Math.round(flip ? x + w - m[0] * scale : x + m[0] * scale), Math.round(y + m[1] * scale)]
  return { sprite, x, y, scale, flip, shadow, mouth }
}

/** A fish placed so its mouth is on `tie`. */
function fishAtMouth(id: FishId, frame: number, tie: Point, facing: 'left' | 'right'): NonNullable<Layout['fish']> {
  const probe = placeFish(id, frame, 0, 0, facing)
  return placeFish(id, frame, tie[0] - probe.mouth[0], tie[1] - probe.mouth[1], facing)
}

const empty = (angler: Placed): Layout => ({ angler, rod: null, net: null, lure: null, line: null, fish: null, effects: [], tension: null, isCard: false })

/** The lure being worked at cycle tick `c`, with the shadow of a fish sized by the tier. */
function working(g: Game, c: number): Layout {
  const v = VENUES[g.venue]
  const { anim, frame } = anglerAt(g.venue, c)
  const { angler, grip } = placeAngler(g, anim, frame)
  const { rod, tip } = placeRod(g, angler.sprite, grip, 'straight')
  const out = { ...empty(angler), rod }
  if (tip === null) return out
  const t = v.isDrop ? c : c % MOTION.cycle
  let tie = lurePointAt(g.venue, c)
  // the cast: the lure flies from the tip to where it lands
  if (tie === null && !v.isDrop && t >= MOTION.flyFrom) {
    const f = (t - MOTION.flyFrom) / (MOTION.splashAt - MOTION.flyFrom)
    tie = [Math.round(lerp(tip[0], v.lureAt[0], f)), Math.round(lerp(tip[1], v.lureAt[1], f) - 28 * Math.sin(Math.PI * f))]
  }
  if (tie === null) return out
  out.lure = placeLure(g.lure, tie)
  out.line = [tip, tie]
  if (!v.isDrop && t >= MOTION.splashAt && t < MOTION.splashAt + 4) out.effects.push(placeEffect('entry', t - MOTION.splashAt, [tie[0], v.waterline]))
  const inWater = v.isDrop ? t >= 4 : t >= MOTION.castTicks + 4
  if (inWater) {
    const r = v.isDrop ? t : t - MOTION.castTicks
    const scale = SHADOW_SCALE[g.tier] ?? 1
    const species = shadowSpecies(g)
    out.fish = placeFish(species, r & 3, tie[0] + 26 + Math.round(4 * Math.sin(r / 3)), v.fishY + 8 + Math.round(2 * Math.sin(r / 5)), 'left', scale, true)
    if (TOPWATER.includes(g.lure) && anim === 'twitch') out.effects.push(placeEffect('popper', r & 3, [tie[0], v.waterline]))
    else if (g.tier >= 2 && (r & 15) < 4) out.effects.push(placeEffect('chase', r & 3, [tie[0] + 10, v.waterline]))
  }
  return out
}

/** The shadow's species is only a shape: the venue's first fish stands for them all. */
const shadowSpecies = (g: Game): FishId => (g.venue === 'lake' ? 'largemouth_bass' : g.venue === 'coast' ? 'spotted_seabass' : 'greater_amberjack')

const biteTie = (g: Game): Point => lurePointAt(g.venue, g.biteT) ?? VENUES[g.venue].lureAt

/** Everything at this tick. `tick` is the pane's clock, for the idle sway. */
export function layoutOf(g: Game, tick: number): Layout {
  const v = VENUES[g.venue]
  const t = g.modeT
  const fish = g.catch?.fishId ?? shadowSpecies(g)
  switch (g.mode) {
    case 'working':
      return working(g, t)
    case 'bite': {
      const out = working({ ...g, tier: g.tier }, g.biteT)
      const tie = biteTie(g)
      out.fish = fishAtMouth(fish, t & 3, tie, 'left')
      out.effects = [placeEffect('bite', t, [tie[0], v.waterline])]
      return out
    }
    case 'hookset': {
      const { angler, grip } = placeAngler(g, 'hookset', Math.min(t, 3))
      const { rod, tip } = placeRod(g, angler.sprite, grip, 'light_bend')
      const tie = biteTie(g)
      return { ...empty(angler), rod, lure: placeLure(g.lure, tie), line: tip === null ? null : [tip, tie], fish: fishAtMouth(fish, 4 + (t & 1), tie, 'left') }
    }
    case 'fight': {
      const { angler, grip } = placeAngler(g, 'fight', (t >> 1) & 3)
      const { rod, tip } = placeRod(g, angler.sprite, grip, 'heavy_bend')
      const base = biteTie(g)
      const mid = g.fightTicks >> 1
      const isLeap = t >= mid && t < mid + 4
      const cx = base[0] + Math.round(30 * Math.sin(t / 5))
      const facing: 'left' | 'right' = Math.cos(t / 5) > 0 ? 'right' : 'left'
      const f = isLeap
        ? placeFish(fish, 6 + ((t - mid) >> 1), cx, v.fishY - 24, 'right')
        : placeFish(fish, t & 3, cx, v.fishY + Math.round(8 * Math.sin(t / 3)), facing)
      const effects = isLeap ? [placeEffect('leap', t - mid, [cx, v.waterline])] : []
      return { ...empty(angler), rod, lure: placeLure(g.lure, f.mouth), line: tip === null ? null : [tip, f.mouth], fish: f, effects, tension: 0.55 + 0.4 * Math.sin(t / 2.5) }
    }
    case 'land':
    case 'card': {
      const frame = g.mode === 'card' ? 3 : Math.min(t >> 1, 3)
      const { angler, grip } = placeAngler(g, 'land', frame)
      const out = empty(angler)
      if (holdsNet(angler.sprite)) {
        const n = netSprite()
        const ng = anchor(n, 'grip')
        const nb = anchor(n, 'basket')
        const x = grip[0] - ng[0]
        const y = grip[1] - ng[1]
        out.net = { sprite: n, x, y }
        out.fish = placeFish(fish, 0, x + nb[0], y + nb[1], 'left', 0.75)
      } else {
        out.fish = placeFish(fish, 0, grip[0] - 8, grip[1] + 10, 'left', 0.75)
      }
      out.isCard = g.mode === 'card'
      return out
    }
    case 'release': {
      const { angler } = placeAngler(g, 'release', Math.min(t >> 1, 3))
      const out = empty(angler)
      const water: Point = [v.feet[0] + 44, v.waterline]
      out.effects = [placeEffect('release', t >> 1, water)]
      if (t < 4) out.fish = placeFish(fish, t & 3, water[0] + 12, water[1] - 6, 'right', 0.75)
      return out
    }
    case 'empty': {
      const { angler, grip } = placeAngler(g, 'retrieve', t & 3)
      const { rod, tip } = placeRod(g, angler.sprite, grip, 'straight')
      const from = biteTie(g)
      const tie: Point = [Math.round(lerp(from[0], v.lureNear[0], Math.min(1, t / MOTION.emptyTicks))), from[1]]
      return { ...empty(angler), rod, lure: placeLure(g.lure, tie), line: tip === null ? null : [tip, tie] }
    }
    case 'lost': {
      const early = t < 4
      const { angler, grip } = placeAngler(g, early ? 'hookset' : 'retrieve', early ? t : t & 3)
      const { rod } = placeRod(g, angler.sprite, grip, early ? 'light_bend' : 'straight')
      const out = { ...empty(angler), rod }
      if (early) out.effects = [placeEffect('release', t, [biteTie(g)[0], v.waterline])]
      return out
    }
    default: {
      const { angler, grip } = placeAngler(g, 'idle', (tick >> 1) & 3)
      const { rod } = placeRod(g, angler.sprite, grip, 'straight')
      return { ...empty(angler), rod }
    }
  }
}
