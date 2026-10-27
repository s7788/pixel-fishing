/** Render the README GIFs from the actual game engine and SVG scene/collection strip.
 * Run with npm run build:demo. No Claude session or saved player data is used.
 */
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'
import type { LureLang, LurePhase } from '../types'
import { MOTION, TICK_MS } from '../hooks/data'
import { beginTurn, chooseLure, endTurn, newGame, step } from '../hooks/engine'
import type { Game } from '../hooks/engine'
import { lureSvg, statsSvg, STATS_SIZE } from '../hooks/svg'

const out = process.argv[2] ?? 'docs/media'
await mkdir(out, { recursive: true })

async function demo(lang: LureLang): Promise<void> {
  const frames: Buffer[] = []
  const scenes: { venue: string; fish: string; elapsedMs: number }[] = []
  let tick = 0
  let g = newGame(20261025)
  async function frame(phase: LurePhase, elapsedMs: number): Promise<void> {
    const seconds = Math.floor(elapsedMs / 1000)
    const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    const scene = await sharp(Buffer.from(lureSvg(phase, g, tick++, clock, lang))).png().toBuffer()
    const stats = await sharp(Buffer.from(statsSvg(g, lang))).png().toBuffer()
    frames.push(await sharp({ create: { width: 384, height: 216 + STATS_SIZE.height, channels: 3, background: '#10183a' } })
      .composite([{ input: scene, top: 0, left: 0 }, { input: stats, top: 216, left: 0 }])
      .removeAlpha().raw().toBuffer())
  }

  for (let cast = 0; cast < 3; cast++) {
    g = chooseLure(g, cast === 0 ? 'popper' : cast === 1 ? 'shore_jig' : 'boat_jig')
    g = beginTurn(g)
    // Show one full casting/retrieval cycle from a turn already in progress.
    // Longer example turn durations demonstrate larger shadows and catches.
    const elapsedBase = [30_000, 120_000, 300_000][cast]!
    const elapsedEnd = elapsedBase + (MOTION.cycle - 1) * TICK_MS
    // Choose a deterministic successful example without changing the game's odds.
    let success: Game | undefined
    for (let offset = 0; offset < 1000; offset++) {
      const candidate = endTurn({ ...g, seed: g.seed + offset }, elapsedEnd)
      if (candidate.outcome === 'fish') {
        g = { ...g, seed: g.seed + offset }
        success = candidate
        break
      }
    }
    if (success === undefined || success.catch === null) throw new Error('No catch found for demo')
    for (let i = 0; i < MOTION.cycle; i++) {
      const elapsed = elapsedBase + i * TICK_MS
      await frame('fishing', elapsed)
      if (i < MOTION.cycle - 1) g = step(g, elapsedBase + (i + 1) * TICK_MS)
    }
    // Resolve at the last rendered cast position, as a real turn completion does.
    g = endTurn(g, elapsedEnd)
    if (g.catch === null) throw new Error('Demo cast unexpectedly came up empty')
    scenes.push({ venue: g.venue, fish: g.catch.fishId, elapsedMs: elapsedEnd })
    for (let i = 0; i < 120 && g.mode !== 'idle'; i++) {
      await frame('landing', elapsedEnd)
      g = step(g)
    }
    if (g.mode !== 'idle') throw new Error('Landing animation did not finish')
    for (let i = 0; i < 4; i++) {
      await frame('idle', elapsedEnd)
      g = step(g)
    }
  }

  const name = lang === 'en' ? 'demo.gif' : 'demo.zh-TW.gif'
  const rawFile = join(tmpdir(), `pixel-fishing-demo-${process.pid}-${lang}.rgb`)
  await writeFile(rawFile, Buffer.concat(frames))
  try {
    const encoded = spawnSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'rawvideo', '-pixel_format', 'rgb24', '-video_size', `384x${216 + STATS_SIZE.height}`,
      '-framerate', String(1000 / TICK_MS), '-i', rawFile,
      '-filter_complex', `[0:v]scale=768:${(216 + STATS_SIZE.height) * 2}:flags=neighbor,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=none`,
      '-loop', '0', join(out, name),
    ], { encoding: 'utf8' })
    if (encoded.error) throw encoded.error
    if (encoded.status !== 0) throw new Error(encoded.stderr)
  } finally {
    await unlink(rawFile)
  }
  const metadata = await sharp(join(out, name), { animated: true }).metadata()
  if (metadata.width !== 768 || metadata.pageHeight !== 512 || (metadata.pages ?? 0) < 100) {
    throw new Error(`Invalid demo GIF: ${JSON.stringify(metadata)}`)
  }
  await writeFile(join(out, name.replace('.gif', '.json')), JSON.stringify({
    language: lang, source: 'hooks/engine.ts + hooks/svg.ts',
    note: 'Three successful example turns; longer working periods are excerpted.',
    frameCount: frames.length, tickMs: TICK_MS, scenes,
  }, null, 2) + '\n')
  console.log(`${name}: ${frames.length} source frames, ${metadata.pages} GIF frames, 768×512`)
}

await demo('en')
await demo('zh-TW')
