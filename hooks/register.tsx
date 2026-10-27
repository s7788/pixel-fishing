import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { LureEvent, LureLang, LurePhase, LureWorld, VenueChoice } from '../types'
import { FISH, LURE_CHOICES, SAVE_EVERY, TICK_MS, VENUE_ORDER, VENUES } from './data'
import type { Game } from './engine'
import { beginTurn, chooseVenue, chooseLure, endTurn, lose, newGame, restore, step } from './engine'
import { cmText, kgText, pickLang, t } from './i18n'
import { LURE_SIZE, STATS_SIZE, hudText, lureSvg, statsSvg, statsText } from './svg'

const PLUGIN = 'pixel-fishing'
const PANE = 'pixel-fishing'
const TITLE = 'pixel-fishing'
const SAVE_KEY = 'save'
const DEX_KEY = 'dexOpen'

const phase = atom({ plugin: 'pixel-fishing', key: 'phase' } as const, 'idle' as LurePhase)
const activeTurnId = atom({ plugin: 'pixel-fishing', key: 'activeTurnId' } as const, null as string | null)
const turnStartedAt = atom({ plugin: 'pixel-fishing', key: 'turnStartedAt' } as const, null as number | null)
const lastElapsedMs = atom({ plugin: 'pixel-fishing', key: 'lastElapsedMs' } as const, 0)
const world = atom({ plugin: 'pixel-fishing', key: 'world' } as const, null as LureWorld | null)
const log = atom({ plugin: 'pixel-fishing', key: 'log' } as const, [] as LureEvent[])
const lang = atom({ plugin: 'pixel-fishing', key: 'lang' } as const, 'en' as LureLang)
const dexOpen = atom({ plugin: 'pixel-fishing', key: 'dexOpen' } as const, false)

/** working_elapsed: MM:SS, HH:MM:SS past an hour. */
const fmt = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const hh = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return hh > 0 ? `${String(hh).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`
}

async function note($: EngineInterface, text: string): Promise<void> {
  const at = await $.clock.now()
  await update($, log, list => [...list, { at, text }].slice(-30))
}

async function save($: EngineInterface, game: Game): Promise<void> {
  await $.store.set(SAVE_KEY, game)
}

async function changeGame($: EngineInterface, fn: (g: Game) => Game): Promise<Game> {
  let out: Game | undefined
  await update($, world, w => {
    const current = w ?? { tick: 0, now: 0, game: newGame(Date.now()) }
    out = fn(current.game)
    return { ...current, game: out }
  })
  return out!
}

/** One tick: the game steps (the running turn's length sets the shadow's size) and the pane redraws. */
async function advance($: EngineInterface): Promise<void> {
  const p = await read($, phase)
  const started = await read($, turnStartedAt)
  const n = await $.clock.now()
  let saved: Game | undefined
  let isIdle = false
  await update($, world, w => {
    if (w === null) return w
    const game = step(w.game, started === null ? 0 : Math.max(0, n - started))
    if ((w.tick + 1) % SAVE_EVERY === 0 || game.mode !== w.game.mode) saved = game
    isIdle = game.mode === 'idle'
    return { tick: w.tick + 1, now: n, game }
  })
  if (saved !== undefined) await save($, saved)
  // the show after a turn is over: the HUD reads 待機 again
  if (p === 'landing' && isIdle) await update($, phase, () => 'idle')
}

/**
 * Traditional Chinese where Claude speaks it, English for everyone else:
 * Claude's `language` setting first, then the system locale. A setting that
 * cannot be read is passed over.
 */
async function detectLang($: EngineInterface): Promise<LureLang> {
  let language: unknown
  try {
    language = await $.settings.read({ key: 'language' })
  } catch {
    language = undefined
  }
  // the whole settings object, should the read hand it back
  if (typeof language === 'object' && language !== null && 'language' in language) language = (language as { language: unknown }).language
  return pickLang([language, Intl.DateTimeFormat().resolvedOptions().locale])
}

async function pickLure($: EngineInterface, choice: (typeof LURE_CHOICES)[number]): Promise<void> {
  await save($, await changeGame($, g => chooseLure(g, choice)))
  await note($, `lure ${choice}`)
}

async function pickVenue($: EngineInterface, choice: VenueChoice): Promise<void> {
  await save($, await changeGame($, g => chooseVenue(g, choice)))
  await note($, `venue ${choice}`)
}

async function toggleDex($: EngineInterface): Promise<void> {
  const next = !(await read($, dexOpen))
  await update($, dexOpen, () => next)
  await $.store.set(DEX_KEY, next)
}

/** A turn (or the demo) starts: the angler heads to the next venue and casts. */
async function startTurn($: EngineInterface, label: string, turnId: string | null = null): Promise<void> {
  const now = await $.clock.now()
  await update($, activeTurnId, () => turnId)
  await update($, turnStartedAt, () => now)
  await update($, phase, () => 'fishing')
  const game = await changeGame($, beginTurn)
  await save($, game)
  await note($, `${label} -> ${game.venue} ${game.lure}`)
}

/** The turn ended: answered, the bite comes (or nothing does); interrupted, the fish gets off. */
async function finishTurn($: EngineInterface, reason: string, turnId?: string): Promise<void> {
  // Delayed/duplicate completion events must not end a newer running turn.
  if (turnId !== undefined && turnId !== await read($, activeTurnId)) return
  await update($, activeTurnId, () => null)
  const started = await read($, turnStartedAt)
  const now = await $.clock.now()
  const elapsed = started === null ? 0 : now - started
  await update($, lastElapsedMs, () => elapsed)
  await update($, turnStartedAt, () => null)
  await update($, phase, () => 'landing')
  const game = await changeGame($, g => (reason === 'answer' ? endTurn(g, elapsed) : lose(g)))
  await save($, game)
  const c = game.catch
  const what = game.outcome === 'fish' && c !== null ? `${c.fishId} ${cmText(c.mm)}cm ${kgText(c.g)}kg${c.isNew ? ' new' : ''}` : (game.outcome ?? '-')
  await note($, `turn.complete ${reason} ${fmt(elapsed)} -> ${what}`)
}

export const register: Register = on => {
  let animation: Timer | undefined
  /**
   * Ticks, turn changes and the demo run one at a time, in arrival order, so a
   * tick queued before a turn's end can never step the cast it ended.
   */
  let queue: Promise<void> = Promise.resolve()
  const serial = (work: () => Promise<void>): Promise<void> => {
    const run = queue.then(work, work)
    queue = run.catch(() => undefined)
    return run
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'pixel-fishing', description: 'Open the 8-bit lure fishing pane' })
    await $.command.register({ name: 'pixel-fishing-demo', description: 'Cast or reel in without a Claude turn (debug)' })
    const stored = (await $.store.get(SAVE_KEY)) as Game | undefined
    const language = await detectLang($)
    await update($, lang, () => language)
    const isDex = await $.store.get(DEX_KEY)
    if (typeof isDex === 'boolean') await update($, dexOpen, () => isDex)
    const now = await $.clock.now()
    // a hot reload keeps the session's world; a new session restores the save
    await update($, world, w => (w !== null ? w : { tick: 0, now, game: stored === undefined ? newGame(now) : restore(stored) }))
    void $.ui.open({ id: PANE, title: TITLE })
    await note($, stored === undefined ? 'session.start (new angler)' : 'session.start (save restored)')
    animation?.cancel()
    animation = $.clock.every(TICK_MS, () => {
      void serial(() => advance($))
    })
    return next(e)
  })

  on('command.run', { command: 'pixel-fishing' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'pixel-fishing pane opened.' }
  })

  on('command.run', { command: 'pixel-fishing-demo' }, async $ => {
    const isFishing = (await read($, phase)) === 'fishing'
    await serial(() => (isFishing ? finishTurn($, 'answer') : startTurn($, 'pixel-fishing-demo')))
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: `pixel-fishing demo: ${isFishing ? 'reel in' : 'cast'}.` }
  })

  /**
   * The pane's buttons, answered here by key rather than by their onPress: the
   * pane redraws every tick, and a closure lives only as long as the drawing
   * that held it, so a click landing just after a redraw would be lost.
   */
  on('ui.press', { plugin: PLUGIN }, async ($, e, next) => {
    const lure = LURE_CHOICES.find(c => `lure-${c}` === e.element)
    if (lure !== undefined) await serial(() => pickLure($, lure))
    else if (['auto', ...VENUE_ORDER].some(c => `venue-${c}` === e.element)) {
      await serial(() => pickVenue($, e.element.slice(6) as VenueChoice))
    } else if (e.element === 'dex') await toggleDex($)
    else return next(e)
    return { element: e.element }
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    await serial(() => startTurn($, `turn.start ${e.turnId.slice(0, 8)}`, e.turnId))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    await serial(() => finishTurn($, e.reason, e.turnId))
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    const Svg = e.surface !== 'terminal' && 'Svg' in els ? els.Svg : undefined
    const p = await read($, phase)
    const started = await read($, turnStartedAt)
    const w = await read($, world)
    const last = await read($, lastElapsedMs)
    const lg = await read($, lang)
    const isDex = await read($, dexOpen)
    if (w === null) return <Text dimColor>{t(lg, 'loading')}</Text>
    const g = w.game
    const elapsed = started === null ? last : Math.max(0, w.now - started)
    const clock = fmt(elapsed)
    // pickable as soon as the turn ends, whether or not the fish is landed yet (engine.ts chooseLure)
    const canChoose = p !== 'fishing'
    const showPool = g.lureChoice === 'random' && canChoose
    const fishHint = FISH.filter(f => f.venue === g.venue && (showPool || f.likes.includes(g.lure)))
      .map(f => t(lg, f.id)).join(lg === 'zh-TW' ? '、' : ', ')

    return (
      <Box flexDirection="column">
        {Svg !== undefined ? (
          <Svg key="scene" source={lureSvg(p, g, w.tick, clock, lg)} alt={`8-bit lure fishing: ${g.mode}`} width={LURE_SIZE.width} height={LURE_SIZE.height} />
        ) : (
          <Box flexDirection="column">
            <Text dimColor>{t(lg, 'noSvg')}</Text>
            <Text bold>{hudText(p, g, clock, lg)}</Text>
            {g.label !== '' && <Text>{t(lg, g.label)}</Text>}
          </Box>
        )}
        {Svg !== undefined ? (
          <Svg key="stats" source={statsSvg(g, lg)} alt={statsText(g, lg)} width={STATS_SIZE.width} height={STATS_SIZE.height} />
        ) : (
          <Text>{statsText(g, lg)}</Text>
        )}
        {canChoose && (
          <Box flexDirection="row" flexWrap="wrap">
            <Text dimColor>{t(lg, 'venuePick')} </Text>
            {(['auto', ...VENUE_ORDER] as const).map(c => (
              <Button key={`venue-${c}`} plain dimColor={c !== g.venueChoice} onPress={() => serial(() => pickVenue($, c))}>
                {`${c === g.venueChoice ? '●' : '○'} ${t(lg, c)}  `}
              </Button>
            ))}
          </Box>
        )}
        {canChoose ? (
          <Box flexDirection="row" flexWrap="wrap">
            {LURE_CHOICES.filter(c => c === 'random' || VENUES[g.venue].lures.includes(c)).map(c => (
              <Button key={`lure-${c}`} plain dimColor={c !== g.lureChoice} onPress={() => serial(() => pickLure($, c))}>
                {`${c === g.lureChoice ? '●' : '○'} ${t(lg, c)}  `}
              </Button>
            ))}
          </Box>
        ) : (
          <Text dimColor>
            {t(lg, 'lureInHand', { lure: t(lg, g.lure) })}
            {g.lureChoice === 'random' ? t(lg, 'randomSuffix') : ''}
            {t(lg, 'pickAfterTurn')}
          </Text>
        )}
        <Text dimColor>{t(lg, showPool ? 'poolHint' : 'fishHint', { fish: fishHint })}</Text>
        <Button key="dex" plain onPress={() => toggleDex($)}>
          {t(lg, isDex ? 'dexOpen' : 'dexClosed')}
        </Button>
        {isDex && (
          <Box flexDirection="column">
            {FISH.map(f => {
              const d = g.dex[f.id]
              const where = t(lg, f.venue)
              return d === undefined ? (
                <Text dimColor>{`${t(lg, 'dexUnknown')} ${where}`}</Text>
              ) : (
                <Text>{`${f.rarity === 2 ? '★' : ' '}${t(lg, 'dexEntry', { name: t(lg, f.id), cm: cmText(d.maxMm), kg: kgText(d.maxG), n: String(d.count) })} ${where}`}</Text>
              )
            })}
            {g.longest !== null && <Text dimColor>{t(lg, 'dexLongest', { name: t(lg, g.longest.fishId), cm: cmText(g.longest.mm) })}</Text>}
            {g.heaviest !== null && <Text dimColor>{t(lg, 'dexHeaviest', { name: t(lg, g.heaviest.fishId), kg: kgText(g.heaviest.g) })}</Text>}
            <Text dimColor>{t(lg, 'dexTotals', { caught: String(g.caught), skunks: String(g.skunks), losses: String(g.losses) })}</Text>
          </Box>
        )}
      </Box>
    )
  })
}
