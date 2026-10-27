import type { FishId, LureChoice, LureId, LureVenue } from '../types'

/**
 * Tuning data for v1. Every number here is this mod's own design: the fish
 * pools and sizes are a game's, not a field guide's. Change the game here,
 * not in the engine.
 */

/** One frame per tick: the hooks step the game and send the frame on show. */
export const TICK_MS = 125
export const GAME_VERSION = '0.2.1'

/** The picture: the pack's 384x216 canvas; scene layers are 128x72 shown at 3x. */
export const CANVAS = { width: 384, height: 216 } as const
export const SCENE_SCALE = 3

export type VenueDef = {
  /** Where the angler's feet go, in canvas pixels (the pack's `feet`). */
  feet: readonly [number, number]
  waterline: number
  /** Where a cast lands, and how far in the lure is retrieved before the next cast. */
  lureAt: readonly [number, number]
  lureNear: readonly [number, number]
  /** The fish's resting height in the water. */
  fishY: number
  /** The boat stands high over the water: its rod is drawn smaller, as the pack's preview does. */
  rodScale: number
  /** The lures this venue allows; the first is tied on when the pick does not fit. */
  lures: readonly LureId[]
  /** The boat drops a jig straight down instead of casting. */
  isDrop: boolean
}

export const VENUES: Readonly<Record<LureVenue, VenueDef>> = {
  lake: { feet: [75, 159], waterline: 174, lureAt: [268, 171], lureNear: [168, 171], fishY: 156, rodScale: 1, lures: ['minnow', 'popper', 'pencil', 'soft_worm'], isDrop: false },
  coast: { feet: [72, 162], waterline: 174, lureAt: [262, 171], lureNear: [168, 171], fishY: 156, rodScale: 1, lures: ['minnow', 'popper', 'pencil', 'shore_jig'], isDrop: false },
  boat: { feet: [174, 102], waterline: 132, lureAt: [250, 163], lureNear: [250, 163], fishY: 170, rodScale: 0.8, lures: ['boat_jig'], isDrop: true },
}

/** Casts rotate through the venues, the lake first; a cast never changes venue. */
export const VENUE_ORDER: readonly LureVenue[] = ['lake', 'coast', 'boat']

/** The pane's buttons, in order; each id is also its text id (hooks/i18n.ts). */
export const LURE_IDS: readonly LureId[] = ['minnow', 'popper', 'pencil', 'soft_worm', 'shore_jig', 'boat_jig']
export const LURE_CHOICES: readonly LureChoice[] = [...LURE_IDS, 'random']

/** Lures worked on top make a surface splash (the pack's popper effect). */
export const TOPWATER: readonly LureId[] = ['popper', 'pencil']

export type FishDef = {
  id: FishId
  venue: LureVenue
  /** 0 common, 1 uncommon, 2 rare (a star in the dex). */
  rarity: 0 | 1 | 2
  minCm: number
  maxCm: number
  /** Weight in grams is about k × cm³ / 1000: a stout fish has a larger k. */
  k: number
  /** The lures this species takes twice as readily. */
  likes: readonly LureId[]
}

/** Six species per venue: two common, two uncommon, two rare. The dex lists them in this order. */
export const FISH: readonly FishDef[] = [
  { id: 'largemouth_bass', venue: 'lake', rarity: 0, minCm: 25, maxCm: 60, k: 15, likes: ['soft_worm', 'minnow'] },
  { id: 'topmouth_culter', venue: 'lake', rarity: 0, minCm: 30, maxCm: 80, k: 9, likes: ['minnow', 'pencil'] },
  { id: 'striped_snakehead', venue: 'lake', rarity: 1, minCm: 30, maxCm: 90, k: 11, likes: ['popper', 'soft_worm'] },
  { id: 'peacock_bass', venue: 'lake', rarity: 2, minCm: 30, maxCm: 75, k: 16, likes: ['popper', 'pencil'] },
  { id: 'rainbow_trout', venue: 'lake', rarity: 1, minCm: 20, maxCm: 65, k: 12, likes: ['minnow', 'soft_worm'] },
  { id: 'mandarin_fish', venue: 'lake', rarity: 2, minCm: 25, maxCm: 70, k: 17, likes: ['soft_worm', 'minnow'] },
  { id: 'spotted_seabass', venue: 'coast', rarity: 0, minCm: 30, maxCm: 90, k: 12, likes: ['minnow', 'pencil'] },
  { id: 'great_barracuda', venue: 'coast', rarity: 0, minCm: 60, maxCm: 150, k: 7, likes: ['shore_jig', 'pencil'] },
  { id: 'indo_pacific_tarpon', venue: 'coast', rarity: 1, minCm: 30, maxCm: 70, k: 10, likes: ['minnow', 'popper'] },
  { id: 'malabar_grouper', venue: 'coast', rarity: 2, minCm: 40, maxCm: 150, k: 18, likes: ['shore_jig', 'minnow'] },
  { id: 'black_porgy', venue: 'coast', rarity: 1, minCm: 20, maxCm: 55, k: 20, likes: ['shore_jig'] },
  { id: 'giant_trevally', venue: 'coast', rarity: 2, minCm: 45, maxCm: 160, k: 22, likes: ['popper', 'pencil'] },
  { id: 'narrow_barred_mackerel', venue: 'boat', rarity: 0, minCm: 60, maxCm: 160, k: 8, likes: ['boat_jig'] },
  { id: 'mahi_mahi', venue: 'boat', rarity: 0, minCm: 60, maxCm: 150, k: 11, likes: ['boat_jig'] },
  { id: 'greater_amberjack', venue: 'boat', rarity: 1, minCm: 60, maxCm: 150, k: 15, likes: ['boat_jig'] },
  { id: 'yellowfin_tuna', venue: 'boat', rarity: 2, minCm: 60, maxCm: 180, k: 20, likes: ['boat_jig'] },
  { id: 'red_seabream', venue: 'boat', rarity: 1, minCm: 25, maxCm: 85, k: 20, likes: ['boat_jig'] },
  { id: 'dogtooth_tuna', venue: 'boat', rarity: 2, minCm: 60, maxCm: 200, k: 19, likes: ['boat_jig'] },
]

/**
 * Turn length picks the tier: under 30 s, under 2 min, under 5 min, longer.
 * The fish's shadow grows with it while the lure is worked.
 */
export const TIER_UP_TO_MS = [30_000, 120_000, 300_000] as const

/** Per tier: the chance the cast comes up empty, and the weights of common / uncommon / rare. */
export const ODDS = [
  { skunk: 0.3, rarity: [85, 15, 0] },
  { skunk: 0.1, rarity: [55, 38, 7] },
  { skunk: 0.04, rarity: [35, 45, 20] },
  { skunk: 0.02, rarity: [20, 45, 35] },
] as const

/** Size skew per tier: the size fraction is u^skew, so a longer turn draws bigger fish. */
export const SIZE_SKEW = [1.8, 1.3, 1.0, 0.7] as const

/** The shadow's scale per tier. */
export const SHADOW_SCALE = [0.6, 0.8, 1.0, 1.25] as const

export const MOTION = {
  /** One lure-working cycle on the bank: cast, splash, retrieve, pause, in ticks. */
  cycle: 56,
  castTicks: 8,
  /** The lure flies from tick `flyFrom` and lands at `splashAt`. */
  flyFrom: 2,
  splashAt: 7,
  retrieveEnd: 48,
  biteTicks: 4,
  hooksetTicks: 4,
  /** A fight lasts fightMin plus up to fightSpan more, by the fish's size fraction. */
  fightMin: 16,
  fightSpan: 24,
  landTicks: 8,
  cardTicks: 32,
  releaseTicks: 8,
  emptyTicks: 12,
  lostTicks: 12,
  /** Ticks a callout stays. */
  labelTicks: 16,
} as const

/** Ticks between saves while the game moves (10 s). */
export const SAVE_EVERY = 80
