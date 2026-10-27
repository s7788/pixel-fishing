import type { LureGame as Game, LureLang, LurePhase } from '../types'
import { CANVAS, FISH, MOTION, SCENE_SCALE } from './data'
import { idleAction } from './extras'
import { dexCount } from './engine'
import type { TextId } from './i18n'
import { cmText, kgText, t } from './i18n'
import type { Layout, Placed } from './layout'
import { layoutOf } from './layout'
import type { PixelSprite } from './pixels'
import { eachRun } from './pixels'
import { catchPanel, fishIcon, fishPortrait, fishUnknown, measurementsFont, sceneBase, sceneOver, uiIcon } from './sprites'

/**
 * The picture as Svg: the venue's layers at 3x, every sprite as one stroked
 * path per colour (a pixel run is a 1px line), the line drawn at run time,
 * and the HUD in the host's font. Nothing here decides anything: layout.ts
 * places, engine.ts moves.
 */
const W = CANVAS.width
const H = CANVAS.height
export const LURE_SIZE = { width: W, height: H }

const PHASE_TEXT: Record<LurePhase, TextId> = { idle: 'phaseIdle', fishing: 'phaseFishing', landing: 'phaseLanding' }

/** The shadow's one colour, under the surface. */
const SHADOW = '#0a2f55'

/**
 * One stroked path per colour: each pixel run is a 1px-tall horizontal line,
 * later runs on the same row moved to relatively to keep the source short.
 * Rows sit on whole y: the group that holds the paths moves them down half a
 * pixel (`HALF`) onto the pixel centres.
 */
const HALF = ' translate(0 .5)'
function gridToPaths(rows: readonly string[], pal: Readonly<Record<string, string>>, one?: string): string {
  const runs = new Map<string, { d: string; row: number; end: number }>()
  rows.forEach((row, y) => {
    eachRun(row, (ch, x, len) => {
      if (ch === '.') return
      const color = one ?? pal[ch]
      if (color === undefined) return
      const run = runs.get(color) ?? { d: '', row: -1, end: 0 }
      run.d += run.row === y ? `m${x - run.end} 0h${len}` : `M${x} ${y}h${len}`
      run.row = y
      run.end = x + len
      runs.set(color, run)
    })
  })
  let out = ''
  for (const [color, run] of runs) out += `<path stroke="${color}" d="${run.d}"/>`
  return out
}

const pathCache = new Map<PixelSprite, string>()
const shadowCache = new Map<PixelSprite, string>()
function paths(s: PixelSprite, shadow = false): string {
  const cache = shadow ? shadowCache : pathCache
  let out = cache.get(s)
  if (out === undefined) {
    out = gridToPaths(s.rows, s.palette, shadow ? SHADOW : undefined)
    cache.set(s, out)
  }
  return out
}

/** A placed sprite: moved, scaled, mirrored about its own box when flipped. */
function placed(p: Placed, shadow = false, opacity?: number): string {
  const s = p.scale ?? 1
  const w = p.sprite.w * s
  const transform = p.flip ? `translate(${p.x + w} ${p.y}) scale(${-s} ${s})` : s === 1 ? `translate(${p.x} ${p.y})` : `translate(${p.x} ${p.y}) scale(${s})`
  return `<g transform="${transform}${HALF}"${opacity === undefined ? '' : ` opacity="${opacity}"`}>${paths(p.sprite, shadow)}</g>`
}

const sceneCache = new Map<string, string>()
function scene(venue: Game['venue'], layer: 'base' | 'over'): string {
  const key = `${venue}/${layer}`
  let out = sceneCache.get(key)
  if (out === undefined) {
    const s = layer === 'base' ? sceneBase(venue) : sceneOver(venue)
    out = `<g transform="scale(${SCENE_SCALE})${HALF}">${paths(s)}</g>`
    sceneCache.set(key, out)
  }
  return out
}

/** The pack's 3x5 digit font (assets/ui/measurements-font.png): glyph cells of 6x8, in this order. */
const GLYPH_ROWS = ['01234567', '89.:cmkg', '+-/ ']
let fontPixels: Set<number> | null = null
function glyphText(text: string, x: number, y: number, scale: number, color: string): string {
  if (fontPixels === null) {
    const f = measurementsFont()
    const set = new Set<number>()
    f.rows.forEach((row, py) => eachRun(row, (ch, px, len) => {
      if (ch === '.') return
      for (let i = 0; i < len; i += 1) set.add((py << 8) | (px + i))
    }))
    fontPixels = set
  }
  let d = ''
  let cx = 0
  for (const ch of text) {
    const row = GLYPH_ROWS.findIndex(r => r.includes(ch))
    if (row === -1) continue
    const gx = GLYPH_ROWS[row]!.indexOf(ch) * 6
    const gy = row * 8
    for (let py = 0; py < 5; py += 1) for (let px = 0; px < 3; px += 1) if (fontPixels.has(((gy + py) << 8) | (gx + px))) d += `M${cx + px} ${py}h1`
    cx += 4
  }
  return `<g transform="translate(${x} ${y}) scale(${scale})${HALF}"><path stroke="${color}" d="${d}"/></g>`
}

const rect = (x: number, y: number, w: number, h: number, fill: string, extra = ''): string => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`

/** The tension bar while fighting: green, amber, red by how hard the fish pulls. */
function tensionBar(tension: number, lang: LureLang): string {
  const w = 96
  const fill = Math.round(w * Math.max(0, Math.min(1, tension)))
  const color = tension < 0.45 ? '#38c998' : tension < 0.8 ? '#ffcb4d' : '#ff2637'
  return (
    `<text x="${W - 8}" y="17" class="r">${t(lang, 'tension')}</text>` +
    rect(W - 8 - w - 2, 22, w + 4, 8, '#101e38') +
    rect(W - 8 - w, 24, w, 4, '#263b56') +
    rect(W - 8 - w, 24, fill, 4, color)
  )
}

function hud(phase: LurePhase, g: Game, clock: string, lang: LureLang, lay: Layout): string {
  const icon = uiIcon(g.venue)
  let out =
    rect(6, 6, 118, 36, '#101e38', ' fill-opacity=".85"') +
    placed({ sprite: icon, x: 9, y: 11 }) +
    `<text x="32" y="21" class="n">${t(lang, g.venue)}</text>` +
    `<text x="32" y="36" class="s">${t(lang, PHASE_TEXT[phase])}</text>` +
    `<text x="120" y="36" class="c">${clock}</text>`
  const activity = idleAction(g)
  if (activity !== null) out += `<text x="8" y="56" class="w">${t(lang, activity)}</text>`
  if (g.mode === 'working' && lay.fish !== null) out += `<text x="8" y="56" class="w">${t(lang, 'shadow', { size: t(lang, `size${g.tier}`) })}</text>`
  if (lay.tension !== null) out += tensionBar(lay.tension, lang)
  out += `<text x="8" y="${H - 8}" class="w">${t(lang, 'lureInHand', { lure: t(lang, g.lure) })}${g.lureChoice === 'random' ? t(lang, 'randomSuffix') : ''}</text>`
  if (g.label !== '' && g.labelT < MOTION.labelTicks && !lay.isCard) out += `<text x="${W / 2}" y="${H - 30}" class="a">${t(lang, g.label)}</text>`
  return out
}

/** The catch card: the pack's panel, the species' portrait, name, length, weight and record marks. */
function card(g: Game, lang: LureLang): string {
  const c = g.catch
  if (c === null) return ''
  const panel = catchPanel()
  const x = (W - panel.w) >> 1
  const y = 40
  const portrait = fishPortrait(c.fishId)
  let out = placed({ sprite: panel, x, y }) + placed({ sprite: portrait, x: x + 12, y: y + 30 })
  const tx = x + 124
  out += `<text x="${tx}" y="${y + 28}" class="k">${t(lang, c.fishId)}</text>`
  out += `<text x="${tx}" y="${y + 44}" class="p">${t(lang, g.label)}</text>`
  out += glyphText(`${cmText(c.mm)} cm`, tx, y + 56, 2, '#ffe0a2')
  out += glyphText(`${kgText(c.g)} kg`, tx, y + 76, 2, '#ffe0a2')
  if (c.isLengthRecord || c.isNew) out += placed({ sprite: uiIcon('length-record'), x: tx + 96, y: y + 50 })
  if (c.isWeightRecord || c.isNew) out += placed({ sprite: uiIcon('weight-record'), x: tx + 96, y: y + 70 })
  return out
}

const CSS =
  `.n{font:bold 13px sans-serif;fill:#f4f8ff}` +
  `.s{font:bold 11px sans-serif;fill:#ffc23a}` +
  `.c{font:bold 12px monospace;fill:#ffd21f;text-anchor:end}` +
  `.r{font:bold 10px sans-serif;fill:#f4f8ff;text-anchor:end;paint-order:stroke;stroke:#10183a;stroke-width:3px}` +
  `.w{font:bold 11px sans-serif;fill:#f4f8ff;paint-order:stroke;stroke:#10183a;stroke-width:3px}` +
  `.a{font:bold 14px sans-serif;fill:#f4f8ff;text-anchor:middle;paint-order:stroke;stroke:#10183a;stroke-width:3px}` +
  `.k{font:bold 14px sans-serif;fill:#ffe0a2}` +
  `.p{font:11px sans-serif;fill:#9ddff0}`

/** The picture at one tick, in `lang`. */
export function lureSvg(phase: LurePhase, g: Game, tick: number, clock: string, lang: LureLang = 'en'): string {
  const lay = layoutOf(g, tick)
  let actors = ''
  if (lay.fish !== null && !lay.isCard && g.mode !== 'land') actors += placed(lay.fish, lay.fish.shadow, lay.fish.shadow ? 0.6 : undefined)
  if (lay.line !== null) actors += `<path d="M${lay.line[0][0]} ${lay.line[0][1]}L${lay.line[1][0]} ${lay.line[1][1]}" stroke="#fff2c9" stroke-opacity=".9"/>`
  if (lay.lure !== null) actors += placed(lay.lure)
  actors += placed(lay.angler)
  if (lay.rod !== null) actors += placed(lay.rod)
  if (lay.net !== null) actors += placed(lay.net)
  // a held or netted fish is drawn over the angler
  if (lay.fish !== null && (lay.isCard || g.mode === 'land')) actors += placed(lay.fish)
  for (const e of lay.effects) actors += placed(e)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges">` +
    `<style>${CSS}</style><g fill="none" stroke-width="1">${scene(g.venue, 'base')}${actors}${scene(g.venue, 'over')}</g>` +
    `${lay.isCard ? `<g fill="none" stroke-width="1">${card(g, lang)}</g>` : ''}${hud(phase, g, clock, lang, lay)}</svg>`
  )
}

/** The words a surface without Svg shows: phase, venue, lure, the clock. */
export function hudText(phase: LurePhase, g: Game, clock: string, lang: LureLang = 'en'): string {
  const sep = t(lang, 'hudSep')
  return `${t(lang, idleAction(g) ?? PHASE_TEXT[phase])}${sep}${t(lang, g.venue)}${sep}${t(lang, g.lure)}${sep}${clock}`
}

/** One line of text for a surface without Svg: 漁獲 7：大口黑鱸×3 花鱸×4 (only species caught). */
export function statsText(g: Game, lang: LureLang = 'en'): string {
  const parts = FISH.filter(f => (g.dex[f.id]?.count ?? 0) > 0).map(f => `${t(lang, f.id)}×${g.dex[f.id]!.count}`)
  return `${t(lang, 'caughtCount', { n: String(g.caught) })}${parts.length > 0 ? ': ' + parts.join(' ') : ''}`
}

const STATS_H = 80
const STATS_COLUMNS = 12
const STATS_CELL = 27
/**
 * The tally strip under the scene: 漁獲 N, then each species' 24x16 icon
 * (its silhouette until caught) with ×count under it, in dex order. Its own
 * small Svg, so the scene's source limit is untouched.
 */
export function statsSvg(g: Game, lang: LureLang = 'en'): string {
  let cells = ''
  FISH.forEach((f, i) => {
    const n = g.dex[f.id]?.count ?? 0
    const x = 56 + (i % STATS_COLUMNS) * STATS_CELL
    const y = Math.floor(i / STATS_COLUMNS) * 40
    cells +=
      placed({ sprite: n === 0 ? fishUnknown(f.id) : fishIcon(f.id), x, y: y + 3 }, false, n === 0 ? 0.55 : undefined) +
      `<text x="${x + 12}" y="${y + 34}" class="k${n === 0 ? ' d' : ''}">${n === 0 ? '·' : `×${n}`}</text>`
  })
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${STATS_H}" width="${W}" height="${STATS_H}" shape-rendering="crispEdges">` +
    `<style>.k{font:bold 10px monospace;fill:#f4f8ff;text-anchor:middle}.d{fill:#6f7c99}.t{font:bold 12px sans-serif;fill:#ffc23a}.u{font:10px sans-serif;fill:#9ddff0}</style>` +
    rect(0, 0, W, STATS_H, '#10183a') +
    `<text x="4" y="16" class="t">${t(lang, 'caughtCount', { n: String(g.caught) })}</text>` +
    `<text x="4" y="32" class="u">${dexCount(g)}/${FISH.length}</text>` +
    `<g fill="none" stroke-width="1">${cells}</g></svg>`
  )
}

export const STATS_SIZE = { width: W, height: STATS_H }
