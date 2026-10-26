/** The turn side: `fishing` while a main turn runs, `landing` from its end until the angler idles again, `idle` between. */
export type LurePhase = 'idle' | 'fishing' | 'landing'

export type LureEvent = { at: number; text: string }

/** The pane's language: Traditional Chinese, or English for everyone else (hooks/i18n.ts pickLang). */
export type LureLang = 'zh-TW' | 'en'

/** The three fishing grounds of the asset pack; casts rotate through them. */
export type LureVenue = 'lake' | 'coast' | 'boat'

/** The six lures; `random` draws one the venue allows for each new cast. */
export type LureId = 'minnow' | 'popper' | 'pencil' | 'soft_worm' | 'shore_jig' | 'boat_jig'
export type LureChoice = LureId | 'random'

/** The twelve species (hooks/data.ts FISH), four per venue. */
export type FishId =
  | 'largemouth_bass'
  | 'striped_snakehead'
  | 'peacock_bass'
  | 'topmouth_culter'
  | 'spotted_seabass'
  | 'indo_pacific_tarpon'
  | 'great_barracuda'
  | 'malabar_grouper'
  | 'greater_amberjack'
  | 'mahi_mahi'
  | 'yellowfin_tuna'
  | 'narrow_barred_mackerel'

/**
 * The state machine's place: idling on the bank, working the lure (cast,
 * retrieve, cast again), the bite, the hookset, the fight, landing the fish,
 * the catch card, the release; or a cast that came up empty (`empty`) or lost
 * its fish to an interrupted turn (`lost`).
 */
export type LureMode = 'idle' | 'working' | 'bite' | 'hookset' | 'fight' | 'land' | 'card' | 'release' | 'empty' | 'lost'

/** How the last cast ended. */
export type LureOutcome = 'fish' | 'skunk' | 'lost'

export type LureCatch = {
  fishId: FishId
  /** Length in whole millimetres and weight in whole grams, as the save keeps them. */
  mm: number
  g: number
  /** The turn-length tier (0..3) the catch was drawn from. */
  tier: number
  /** First of its species. */
  isNew: boolean
  /** Longer or heavier than the species' own record (never on a first catch). */
  isLengthRecord: boolean
  isWeightRecord: boolean
  /** Longer or heavier than anything caught before, any species. */
  isLongestEver: boolean
  isHeaviestEver: boolean
}

export type LureDexEntry = { count: number; maxMm: number; maxG: number }

export type LureGame = {
  saveSchemaVersion: number
  /** The RNG state (mulberry32), kept so a saved game draws on reproducibly. */
  seed: number
  mode: LureMode
  modeT: number
  /** Casts started so far; the venue rotates with it. */
  castNo: number
  venue: LureVenue
  /** The lure tied on for this cast; never changes while the angler works it. */
  lure: LureId
  /** The pane's pick: a fixed lure, or `random` drawn when a cast starts. */
  lureChoice: LureChoice
  /** The turn-length tier so far, while a turn runs; shown as the shadow's size. */
  tier: number
  /** The working tick the turn ended on: where in its cycle the lure was when the bite came (or did not). */
  biteT: number
  /** How long this fight lasts, from the fish's size. */
  fightTicks: number
  /** The last cast's fish and how it ended; null before the first cast. */
  catch: LureCatch | null
  outcome: LureOutcome | null
  /** The dex: species to times caught and its own longest and heaviest. */
  dex: Partial<Record<FishId, LureDexEntry>>
  /** The longest and the heaviest catch ever, kept apart: they may be different fish. */
  longest: { fishId: FishId; mm: number } | null
  heaviest: { fishId: FishId; g: number } | null
  caught: number
  skunks: number
  losses: number
  /** A callout over the scene (a text id or a fish id), and the ticks it has shown. */
  label: string
  labelT: number
}

/** One tick's world: the clock for working_elapsed and the fishing state machine. */
export type LureWorld = { tick: number; now: number; game: LureGame }

declare module 'claude-code' {
  interface PluginState {
    'pixel-fishing': {
      phase: LurePhase
      turnStartedAt: number | null
      lastElapsedMs: number
      world: LureWorld | null
      log: LureEvent[]
      /** The language the pane draws in, picked at session start. */
      lang: LureLang
      /** The dex list under the picture is unfolded. */
      dexOpen: boolean
    }
  }
}
