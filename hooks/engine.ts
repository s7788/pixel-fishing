import type { FishId, LureCatch, LureChoice, LureGame as Game, LureId, LureMode, LureVenue } from '../types'
import type { FishDef } from './data'
import { FISH, MOTION, ODDS, SIZE_SKEW, TIER_UP_TO_MS, VENUES, VENUE_ORDER } from './data'

/**
 * The local fishing state machine: pure functions, one step per tick, no
 * model calls. Randomness comes from a seed kept in the state, so a saved
 * game draws on reproducibly and a test can check the odds.
 *
 * A main turn is one trip to the water: `beginTurn` ties on a lure and
 * starts working it, `endTurn` draws what the turn's length brings (a bite
 * and a fight, or nothing), `lose` lets the fish off when the turn is
 * interrupted.
 */

export type { Game }

export const SAVE_SCHEMA_VERSION = 1

/** mulberry32: the next value in [0, 1) and the next state. */
export function random(seed: number): [number, number] {
  const s = (seed + 0x6d2b79f5) | 0
  let t = s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s]
}

/** The turn-length tier, 0..3. */
export function tierOf(elapsedMs: number): number {
  const i = TIER_UP_TO_MS.findIndex(limit => elapsedMs < limit)
  return i === -1 ? TIER_UP_TO_MS.length : i
}

export const fishDef = (id: FishId): FishDef => FISH.find(f => f.id === id)!

export const poolOf = (venue: LureVenue): readonly FishDef[] => FISH.filter(f => f.venue === venue)

/** Weight in grams from length: k × cm³ / 1000, with the fish's own condition (±12%). */
export function weightOf(def: FishDef, mm: number, condition: number): number {
  const cm = mm / 10
  return Math.max(1, Math.round(((def.k * cm * cm * cm) / 1000) * (0.88 + 0.24 * condition)))
}

export function newGame(seed: number): Game {
  return {
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
    seed: seed | 0,
    mode: 'idle',
    modeT: 0,
    castNo: 0,
    venue: 'lake',
    lure: 'minnow',
    lureChoice: 'random',
    tier: 0,
    biteT: 0,
    fightTicks: MOTION.fightMin,
    catch: null,
    outcome: null,
    dex: {},
    longest: null,
    heaviest: null,
    caught: 0,
    skunks: 0,
    losses: 0,
    label: '',
    labelT: 0,
  }
}

const enter = (g: Game, mode: LureMode, extra: Partial<Game> = {}): Game => ({ ...g, ...extra, mode, modeT: 0 })
const say = (g: Game, label: string): Game => ({ ...g, label, labelT: 0 })

/** True while the lure is in the water: the modes a turn's end or interrupt acts on. */
export const isWorking = (g: Game): boolean => g.mode === 'working'

/** The lure a venue ties on for a pick: the pick when the venue allows it, else the venue's first; `random` draws one. */
export function lureFor(venue: LureVenue, choice: LureChoice, seed: number): [LureId, number] {
  const allowed = VENUES[venue].lures
  if (choice !== 'random') return [allowed.includes(choice) ? choice : allowed[0]!, seed]
  const [u, next] = random(seed)
  return [allowed[Math.floor(u * allowed.length)]!, next]
}

/** A main turn starts: the next venue, a lure for it, and the first cast. Anything under way is cut short. */
export function beginTurn(g: Game): Game {
  if (isWorking(g)) return g
  const venue = VENUE_ORDER[g.castNo % VENUE_ORDER.length]!
  const [lure, seed] = lureFor(venue, g.lureChoice, g.seed)
  const moved = venue !== g.venue
  return say(enter(g, 'working', { castNo: g.castNo + 1, venue, lure, seed, tier: 0, catch: null, outcome: null }), moved ? venue : 'castOut')
}

/** The pane's pick; a fixed lure is tied on at once unless a cast is out. */
export function chooseLure(g: Game, choice: LureChoice): Game {
  if (choice === g.lureChoice) return g
  const next = { ...g, lureChoice: choice }
  if (isWorking(g) || choice === 'random') return next
  return { ...next, lure: lureFor(g.venue, choice, g.seed)[0] }
}

export type Draw = { catch: LureCatch | null; seed: number }

/** Draw what a cast of this length brings up: a fish with its size, or nothing. Pure: returns the next seed too. */
export function drawCatch(g: Game, elapsedMs: number): Draw {
  const tier = tierOf(elapsedMs)
  const odds = ODDS[tier]!
  let seed = g.seed
  let u: number
  ;[u, seed] = random(seed)
  if (u < odds.skunk) return { catch: null, seed }
  const pool = poolOf(g.venue)
  const weights = pool.map(f => odds.rarity[f.rarity] * (f.likes.includes(g.lure) ? 2 : 1))
  const total = weights.reduce((a, b) => a + b, 0)
  ;[u, seed] = random(seed)
  let pick = u * total
  let fish = pool[0]!
  for (let i = 0; i < pool.length; i += 1) {
    pick -= weights[i]!
    if (pick < 0) {
      fish = pool[i]!
      break
    }
  }
  ;[u, seed] = random(seed)
  const mm = Math.round((fish.minCm + (fish.maxCm - fish.minCm) * Math.pow(u, SIZE_SKEW[tier]!)) * 10)
  ;[u, seed] = random(seed)
  const grams = weightOf(fish, mm, u)
  const known = g.dex[fish.id]
  return {
    catch: {
      fishId: fish.id,
      mm,
      g: grams,
      tier,
      isNew: known === undefined,
      isLengthRecord: known !== undefined && mm > known.maxMm,
      isWeightRecord: known !== undefined && grams > known.maxG,
      isLongestEver: g.longest === null || mm > g.longest.mm,
      isHeaviestEver: g.heaviest === null || grams > g.heaviest.g,
    },
    seed,
  }
}

/** The fight's length from where the fish sits in its species' size range. */
export function fightTicksOf(c: LureCatch): number {
  const def = fishDef(c.fishId)
  const frac = (c.mm / 10 - def.minCm) / (def.maxCm - def.minCm)
  return MOTION.fightMin + Math.round(MOTION.fightSpan * Math.max(0, Math.min(1, frac)))
}

/** The turn answered: the bite comes (or nothing does) and the catch is recorded at once, so an interrupted show loses nothing. */
export function endTurn(g: Game, elapsedMs: number): Game {
  if (!isWorking(g)) return g
  const drawn = drawCatch(g, elapsedMs)
  const c = drawn.catch
  const biteT = g.modeT
  if (c === null) return say(enter(g, 'empty', { seed: drawn.seed, outcome: 'skunk', skunks: g.skunks + 1, tier: tierOf(elapsedMs), biteT }), 'skunk')
  const known = g.dex[c.fishId]
  const dex = { ...g.dex, [c.fishId]: { count: (known?.count ?? 0) + 1, maxMm: Math.max(known?.maxMm ?? 0, c.mm), maxG: Math.max(known?.maxG ?? 0, c.g) } }
  return say(
    enter(g, 'bite', {
      seed: drawn.seed,
      catch: c,
      outcome: 'fish',
      tier: c.tier,
      biteT,
      fightTicks: fightTicksOf(c),
      dex,
      caught: g.caught + 1,
      longest: c.isLongestEver ? { fishId: c.fishId, mm: c.mm } : g.longest,
      heaviest: c.isHeaviestEver ? { fishId: c.fishId, g: c.g } : g.heaviest,
    }),
    'bite',
  )
}

/** The turn was interrupted: the fish gets off, nothing is recorded, the loss counted. */
export function lose(g: Game): Game {
  if (!isWorking(g)) return g
  return say(enter(g, 'lost', { outcome: 'lost', losses: g.losses + 1, catch: null, biteT: g.modeT }), 'lost')
}

/** The callout a catch shows on its card: new species first, then the records. */
export function catchLabel(c: LureCatch): string {
  if (c.isNew) return 'newSpecies'
  if (c.isLengthRecord && c.isWeightRecord) return 'recordBoth'
  if (c.isLengthRecord) return 'recordLength'
  if (c.isWeightRecord) return 'recordWeight'
  return 'landed'
}

/** One tick; `elapsedMs` is the running turn's length (0 when none runs), which sets the shadow's tier. */
export function step(g: Game, elapsedMs = 0): Game {
  const t = g.modeT + 1
  const labelT = g.labelT + 1
  const next = (mode: LureMode, label?: string): Game => (label === undefined ? enter({ ...g, labelT }, mode) : say(enter(g, mode), label))
  const stay = (): Game => ({ ...g, modeT: t, labelT })
  switch (g.mode) {
    case 'working':
      return { ...stay(), tier: tierOf(elapsedMs) }
    case 'bite':
      return t >= MOTION.biteTicks ? next('hookset', 'hookset') : stay()
    case 'hookset':
      return t >= MOTION.hooksetTicks ? next('fight', 'fight') : stay()
    case 'fight':
      return t >= g.fightTicks ? next('land', 'landed') : stay()
    case 'land':
      return t >= MOTION.landTicks ? next('card', g.catch === null ? 'landed' : catchLabel(g.catch)) : stay()
    case 'card':
      return t >= MOTION.cardTicks ? next('release', 'released') : stay()
    case 'release':
      return t >= MOTION.releaseTicks ? next('idle') : stay()
    case 'empty':
      return t >= MOTION.emptyTicks ? next('idle') : stay()
    case 'lost':
      return t >= MOTION.lostTicks ? next('idle') : stay()
    default:
      return stay()
  }
}

/**
 * A saved game from an earlier session: a cast that session never finished
 * is dropped (no catch, no loss counted) and the angler idles on the bank.
 * Fields a newer save has and an older one lacks take the new game's values.
 */
export function restore(saved: Game): Game {
  const base = newGame(saved.seed)
  const g: Game = { ...base, ...saved, saveSchemaVersion: SAVE_SCHEMA_VERSION, dex: { ...(saved.dex ?? {}) }, label: '', labelT: MOTION.labelTicks }
  return g.mode === 'idle' ? g : enter(g, 'idle', { catch: isWorking(g) ? null : g.catch })
}

export const dexCount = (g: Game): number => FISH.filter(f => g.dex[f.id] !== undefined).length
