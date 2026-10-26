import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import type { LureLang, LureVenue } from '../types'
import { FISH, LURE_CHOICES, MOTION, ODDS, VENUES, VENUE_ORDER } from './data'
import type { Game } from './engine'
import { beginTurn, chooseLure, drawCatch, endTurn, lose, newGame, poolOf, restore, step, tierOf, weightOf } from './engine'
import { t } from './i18n'
import { layoutOf } from './layout'
import { lureSvg, statsSvg, statsText } from './svg'

const PANE = {
  plugin: 'pixel-fishing',
  component: 'Pane',
  requestId: 'pixel-fishing',
  props: {
    title: 'pixel-fishing',
    isFocused: false,
    bodyColumns: 43,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

const MIN = 60_000

const run = (g: Game, ticks: number, elapsedMs = 0): Game => {
  let out = g
  for (let i = 0; i < ticks; i += 1) out = step(out, elapsedMs)
  return out
}

/** A game whose next answered turn lands a fish (the draw is deterministic per seed). */
function landed(g: Game, elapsedMs: number): Game {
  let seed = g.seed
  for (;;) {
    const out = endTurn({ ...g, seed }, elapsedMs)
    if (out.outcome === 'fish') return out
    seed += 1
  }
}

test('every frame of every mode and venue fits the Svg source limit, in both languages', () => {
  let largest = 0
  const modes = new Set<string>()
  let g = newGame(1)
  for (let cast = 0; cast < 6; cast += 1) {
    g = beginTurn(g)
    for (let i = 0; i < MOTION.cycle + 8; i += 1) {
      g = step(g, 9 * MIN)
      modes.add(g.mode)
      largest = Math.max(largest, lureSvg('fishing', g, i, '88:88:88', 'zh-TW').length, lureSvg('fishing', g, i, '88:88:88', 'en').length)
    }
    g = cast === 5 ? lose(g) : cast === 4 ? { ...g, seed: 7 } : landed(g, cast * 2 * MIN)
    if (cast === 4) g = endTurn(g, 0)
    for (let i = 0; i < 120; i += 1) {
      g = step(g)
      modes.add(g.mode)
      largest = Math.max(largest, lureSvg('landing', g, i, '00:00', 'zh-TW').length)
    }
  }
  expect(largest).toBeLessThan(131072)
  expect(statsSvg(g).length).toBeLessThan(131072)
  expect([...modes].sort()).toEqual(['bite', 'card', 'empty', 'fight', 'hookset', 'idle', 'land', 'lost', 'release', 'working'])
})

test('turn length picks the tier', () => {
  expect(tierOf(0)).toBe(0)
  expect(tierOf(29_999)).toBe(0)
  expect(tierOf(30_000)).toBe(1)
  expect(tierOf(2 * MIN)).toBe(2)
  expect(tierOf(5 * MIN)).toBe(3)
  expect(tierOf(60 * MIN)).toBe(3)
})

test('longer turns draw rarer and bigger fish, skunks as tuned; a liked lure doubles its takers', () => {
  const stats = [0, 1, 2, 3].map(tier => {
    let g = { ...beginTurn(newGame(42)), lure: 'minnow' as const }
    let rare = 0
    let fish = 0
    let sizeFrac = 0
    let skunk = 0
    let liked = 0
    const n = 4000
    for (let i = 0; i < n; i += 1) {
      const d = drawCatch(g, [0, MIN, 3 * MIN, 10 * MIN][tier]!)
      g = { ...g, seed: d.seed }
      if (d.catch === null) {
        skunk += 1
        continue
      }
      const def = FISH.find(f => f.id === d.catch!.fishId)!
      fish += 1
      if (def.rarity === 2) rare += 1
      if (def.likes.includes('minnow')) liked += 1
      sizeFrac += (d.catch.mm / 10 - def.minCm) / (def.maxCm - def.minCm)
      expect(d.catch.g).toBe(weightOf(def, d.catch.mm, (d.catch.g / ((def.k * (d.catch.mm / 10) ** 3) / 1000) - 0.88) / 0.24))
    }
    return { rare: rare / fish, size: sizeFrac / fish, skunk: skunk / n, liked: liked / fish }
  })
  expect(stats[0]!.rare).toBe(0)
  for (let i = 1; i < 4; i += 1) {
    expect(stats[i]!.rare).toBeGreaterThan(stats[i - 1]!.rare)
    expect(stats[i]!.size).toBeGreaterThan(stats[i - 1]!.size)
  }
  stats.forEach((s, i) => expect(Math.abs(s.skunk - ODDS[i]!.skunk)).toBeLessThan(0.03))
  // at tier 0: bass and culter (both like the minnow) weigh 170 each, the snakehead 15, the peacock 0
  expect(Math.abs(stats[0]!.liked - 340 / 355)).toBeLessThan(0.02)
})

test('a turn casts at the next venue with a lure it allows; the answer brings the bite, fight, landing, card and release', () => {
  let g = beginTurn(newGame(3))
  expect(g.mode).toBe('working')
  expect(g.venue).toBe('lake')
  expect(VENUES.lake.lures).toContain(g.lure)
  g = run(g, 200, 3 * MIN)
  expect(g.mode).toBe('working')
  expect(g.tier).toBe(2)
  g = landed(g, 5 * MIN)
  const c = g.catch!
  expect(c.isNew).toBe(true)
  expect(g.dex[c.fishId]).toEqual({ count: 1, maxMm: c.mm, maxG: c.g })
  expect(g.longest).toEqual({ fishId: c.fishId, mm: c.mm })
  expect(g.heaviest).toEqual({ fishId: c.fishId, g: c.g })
  expect(poolOf('lake').some(f => f.id === c.fishId)).toBe(true)
  expect(g.mode).toBe('bite')
  g = run(g, MOTION.biteTicks)
  expect(g.mode).toBe('hookset')
  g = run(g, MOTION.hooksetTicks)
  expect(g.mode).toBe('fight')
  expect(g.fightTicks).toBeGreaterThan(MOTION.fightMin - 1)
  g = run(g, g.fightTicks)
  expect(g.mode).toBe('land')
  g = run(g, MOTION.landTicks)
  expect(g.mode).toBe('card')
  expect(g.label).toBe('newSpecies')
  g = run(g, MOTION.cardTicks)
  expect(g.mode).toBe('release')
  g = run(g, MOTION.releaseTicks)
  expect(g.mode).toBe('idle')
  // the next cast rotates to the coast, then the boat, then the lake again
  const venues: LureVenue[] = []
  for (let i = 0; i < 3; i += 1) {
    g = beginTurn(g)
    venues.push(g.venue)
    g = run(lose(g), 40)
  }
  expect(venues).toEqual(['coast', 'boat', 'lake'])
  expect(VENUE_ORDER).toEqual(['lake', 'coast', 'boat'])
})

test('a bigger one of a known fish is a length or weight record, kept apart from the all-time longest and heaviest', () => {
  let g = beginTurn(newGame(5))
  g = { ...g, dex: Object.fromEntries(FISH.map(f => [f.id, { count: 1, maxMm: Math.round(((f.minCm + f.maxCm) / 2) * 10), maxG: weightOf(f, Math.round(((f.minCm + f.maxCm) / 2) * 10), 0.5) }])), longest: { fishId: 'yellowfin_tuna', mm: 9999 }, heaviest: { fishId: 'yellowfin_tuna', g: 999999 } }
  let records = 0
  let plain = 0
  for (let i = 0; i < 300; i += 1) {
    const d = drawCatch(g, 10 * MIN)
    g = { ...g, seed: d.seed }
    if (d.catch === null) continue
    expect(d.catch.isNew).toBe(false)
    expect(d.catch.isLongestEver).toBe(false)
    expect(d.catch.isHeaviestEver).toBe(false)
    const known = g.dex[d.catch.fishId]!
    expect(d.catch.isLengthRecord).toBe(d.catch.mm > known.maxMm)
    expect(d.catch.isWeightRecord).toBe(d.catch.g > known.maxG)
    if (d.catch.isLengthRecord || d.catch.isWeightRecord) records += 1
    else plain += 1
  }
  expect(records).toBeGreaterThan(0)
  expect(plain).toBeGreaterThan(0)
})

test('an interrupt loses the fish: nothing recorded, the loss counted; a short answered turn can come up empty', () => {
  let g = run(beginTurn(newGame(7)), 60)
  g = lose(g)
  expect(g.mode).toBe('lost')
  expect(g.outcome).toBe('lost')
  expect(g.losses).toBe(1)
  expect(Object.keys(g.dex)).toHaveLength(0)
  g = run(g, MOTION.lostTicks)
  expect(g.mode).toBe('idle')
  let seed = 1
  let empty = endTurn({ ...beginTurn(g), seed }, 0)
  while (empty.outcome !== 'skunk') {
    seed += 1
    empty = endTurn({ ...beginTurn(g), seed }, 0)
  }
  expect(empty.mode).toBe('empty')
  expect(empty.skunks).toBe(1)
  expect(empty.caught).toBe(0)
})

test('the pick: a fixed lure is tied on at once, a lure the venue refuses gives way to its first, random draws per cast', () => {
  let g = newGame(9)
  g = chooseLure(g, 'popper')
  expect(g.lure).toBe('popper')
  g = beginTurn(g)
  expect(g.lure).toBe('popper')
  g = chooseLure(g, 'minnow')
  expect(g.lure).toBe('popper')
  g = run(lose(g), 40)
  g = beginTurn(g)
  expect(g.venue).toBe('coast')
  expect(g.lure).toBe('minnow')
  g = run(lose(g), 40)
  g = chooseLure(g, 'soft_worm')
  g = beginTurn(g)
  expect(g.venue).toBe('boat')
  expect(g.lure).toBe('boat_jig')
  g = run(lose(g), 40)
  g = chooseLure(g, 'random')
  const seen = new Set<string>()
  for (let i = 0; i < 30; i += 1) {
    g = beginTurn(g)
    if (g.venue === 'lake') seen.add(g.lure)
    g = run(lose(g), 40)
  }
  expect(seen.size).toBeGreaterThan(1)
  for (const lure of seen) expect(VENUES.lake.lures).toContain(lure as never)
})

test('the line runs from the rod tip to the lure, the fish stays in the water, and everything stays on the canvas', () => {
  for (const venue of VENUE_ORDER) {
    let g = { ...beginTurn(newGame(11)), venue, tier: 3 }
    let lured = 0
    let shadowed = 0
    for (let i = 0; i < MOTION.cycle * 2; i += 1) {
      const lay = layoutOf(g, i)
      expect(lay.angler.x + 24).toBe(VENUES[venue].feet[0])
      expect(lay.angler.y + 62).toBe(VENUES[venue].feet[1])
      expect(lay.rod).not.toBeNull()
      if (lay.lure !== null) {
        lured += 1
        expect(lay.line).not.toBeNull()
        const tie = lay.lure.sprite.anchors!.tie!
        expect(lay.line![1]).toEqual([lay.lure.x + tie[0], lay.lure.y + tie[1]])
        expect(lay.lure.x).toBeGreaterThan(0)
        expect(lay.lure.x + 16).toBeLessThan(384)
      }
      if (lay.fish !== null) {
        shadowed += 1
        expect(lay.fish.shadow).toBe(true)
        expect(lay.fish.y).toBeGreaterThan(VENUES[venue].waterline - 40)
        expect(lay.fish.x + lay.fish.sprite.w * (lay.fish.scale ?? 1)).toBeLessThan(384)
      }
      g = step(g, 10 * MIN)
    }
    expect(lured).toBeGreaterThan(MOTION.cycle)
    expect(shadowed).toBeGreaterThan(MOTION.cycle / 2)
    // the fight: the line goes to the fish's mouth, the lure sits on it, and the rod bends hard
    g = landed(g, 10 * MIN)
    g = run(g, MOTION.biteTicks + MOTION.hooksetTicks)
    expect(g.mode).toBe('fight')
    for (let i = 0; i < g.fightTicks; i += 1) {
      const lay = layoutOf(g, i)
      expect(lay.fish).not.toBeNull()
      expect(lay.fish!.shadow).toBe(false)
      expect(lay.line![1]).toEqual(lay.fish!.mouth)
      expect(lay.rod!.sprite.anchors!.tip![1]).toBeGreaterThan(30)
      expect(lay.tension).not.toBeNull()
      g = step(g)
    }
    // landing: the net, then the fish held up with no rod; the card shows
    g = run(g, 2)
    expect(layoutOf(g, 0).net).not.toBeNull()
    g = run(g, MOTION.landTicks)
    const held = layoutOf(g, 0)
    expect(held.isCard).toBe(true)
    expect(held.rod).toBeNull()
    expect(held.fish).not.toBeNull()
  }
})

test('every id the game shows has words in both languages, and the English has no Chinese left', () => {
  const ids = [
    ...FISH.map(f => f.id),
    ...LURE_CHOICES,
    ...VENUE_ORDER,
    'castOut',
    'bite',
    'hookset',
    'fight',
    'landed',
    'newSpecies',
    'recordLength',
    'recordWeight',
    'recordBoth',
    'released',
    'skunk',
    'lost',
    'size0',
    'size1',
    'size2',
    'size3',
  ]
  for (const lang of ['zh-TW', 'en'] as LureLang[]) for (const id of ids) expect(t(lang, id)).not.toBe(id)
  for (const id of ids) expect(/[一-鿿]/.test(t('en', id))).toBe(false)
  const g = { ...newGame(1), caught: 2, dex: { peacock_bass: { count: 2, maxMm: 555, maxG: 2500 } } }
  expect(statsText(g, 'zh-TW')).toBe('漁獲 2: 孔雀鱸×2')
  expect(statsText(g, 'en')).toBe('Caught 2: Peacock Bass×2')
})

test('a save from a session that ended mid-cast comes back idle, dex and records kept', () => {
  let g = run(beginTurn(newGame(13)), 20)
  g = { ...g, dex: { mahi_mahi: { count: 2, maxMm: 1234, maxG: 9876 } }, longest: { fishId: 'mahi_mahi', mm: 1234 }, caught: 2 }
  const back = restore(JSON.parse(JSON.stringify(g)) as Game)
  expect(back.mode).toBe('idle')
  expect(back.catch).toBeNull()
  expect(back.dex.mahi_mahi).toEqual({ count: 2, maxMm: 1234, maxG: 9876 })
  expect(back.longest).toEqual({ fishId: 'mahi_mahi', mm: 1234 })
  // an older save without the newer fields takes the new game's values
  const old = { ...back } as Partial<Game>
  delete old.biteT
  delete old.heaviest
  const migrated = restore(old as Game)
  expect(migrated.biteT).toBe(0)
  expect(migrated.heaviest).toBeNull()
})

const boot = async ($: Parameters<TestBody>[0], on: On, store?: Record<string, unknown>, language = 'English', observed?: { commands: string[]; panes: { id: string; title: string }[] }) => {
  mock.clock(on)
  mock.store(on, store)
  on('settings.read', () => ({ value: { language } }))
  on('ui.open', (_, e) => {
    observed?.panes.push({ id: e.id, title: e.title })
    return { value: { isPlaced: true as const } }
  })
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => {
    observed?.commands.push(e.name)
    return { value: { command: e.name } }
  })
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
}

test('the published commands open the renamed pane and run a demo trip', async ($, on) => {
  const observed = { commands: [] as string[], panes: [] as { id: string; title: string }[] }
  await boot($, on, undefined, 'English', observed)
  expect(observed.commands).toEqual(['pixel-fishing', 'pixel-fishing-demo'])
  await $.command.run({ command: 'pixel-fishing', args: '' } as never)
  await $.command.run({ command: 'pixel-fishing-demo', args: '' } as never)
  expect(observed.panes.length).toBe(3)
  expect(observed.panes.every(pane => pane.id === 'pixel-fishing' && pane.title === 'pixel-fishing')).toBe(true)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe('8-bit lure fishing: working')
  await ui.unmount()
})

test('main turns cast, answers bring the fish in, interrupts lose it; subagent turns change nothing', async ($, on) => {
  await boot($, on)
  const mode = async () => {
    const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
    const svg = await ui.find({ type: 'Svg' })
    await ui.unmount()
    return svg?.props.alt
  }
  expect(await mode()).toBe('8-bit lure fishing: idle')
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(await mode()).toBe('8-bit lure fishing: working')
  await $.turn.start({ text: 'sub', turnId: 's1', agentId: 'a1' })
  await $.turn.complete({ reason: 'answer', turnId: 's1', agentId: 'a1' } as never)
  expect(await mode()).toBe('8-bit lure fishing: working')
  await $.turn.complete({ reason: 'answer', turnId: 't1' } as never)
  expect(['8-bit lure fishing: bite', '8-bit lure fishing: empty']).toContain(await mode())
  await $.turn.start({ text: 'again', turnId: 't2' })
  expect(await mode()).toBe('8-bit lure fishing: working')
  await $.turn.complete({ reason: 'aborted', turnId: 't2' } as never)
  expect(await mode()).toBe('8-bit lure fishing: lost')
})

test('the terminal draws the pane as text, with the tally; the desktop draws two Svgs', async ($, on) => {
  await boot($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /fishing scene skipped/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Caught 0/ })).toBeDefined()
  await ui.unmount()
  const desk = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const svgs = await desk.findAll({ type: 'Svg' })
  expect(svgs.map(s => s.props.alt)).toEqual(['8-bit lure fishing: idle', 'Caught 0'])
  await desk.unmount()
})

test('/pixel-fishing-demo casts and reels in without a turn, and the lure buttons pick', async ($, on) => {
  await boot($, on)
  await $.command.run({ command: 'pixel-fishing-demo', args: '' } as never)
  let ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toBe('8-bit lure fishing: working')
  // a cast is out: the buttons give way to the lure in hand
  expect(await ui.find({ type: 'Text', text: /pick after the turn/ })).toBeDefined()
  await ui.unmount()
  await $.command.run({ command: 'pixel-fishing-demo', args: '' } as never)
  ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(['8-bit lure fishing: bite', '8-bit lure fishing: empty']).toContain((await ui.find({ type: 'Svg' }))?.props.alt)
  await ui.press({ key: 'lure-popper' })
  await ui.unmount()
  ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ key: 'lure-popper' }))?.text).toContain('●')
  expect((await ui.find({ key: 'lure-random' }))?.text).toContain('○')
  await ui.unmount()
})

test('where Claude speaks Traditional Chinese the pane does too', async ($, on) => {
  await boot($, on, undefined, '繁體中文')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /漁獲 0/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /待機・湖泊/ })).toBeDefined()
  await ui.unmount()
})

test('a new session restores the dex and the dex list shows it', async ($, on) => {
  const saved = { ...newGame(17), caught: 3, dex: { peacock_bass: { count: 3, maxMm: 612, maxG: 3260 } }, longest: { fishId: 'peacock_bass', mm: 612 } }
  await boot($, on, { save: saved, dexOpen: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /Peacock Bass longest 61\.2 cm · heaviest 3\.26 kg ×3/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Longest: Peacock Bass 61\.2 cm/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Caught 3 \/ skunked 0 \/ lost 0/ })).toBeDefined()
  await ui.unmount()
})
