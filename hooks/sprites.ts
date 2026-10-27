import type { FishId, LureId } from '../types'
import { extraFish } from './extras'
import { ANGLER } from './gen/angler'
import { FISH_SPRITES } from './gen/fish'
import { GEAR } from './gen/gear'
import { SCENE_SPRITES } from './gen/scenes'
import { UI } from './gen/ui'
import type { PixelSprite } from './pixels'

/** The asset pack's sprites by group (hooks/gen, written by tools/gen-sprites.cjs), looked up by their ids. */

export type AnglerAnim = 'idle' | 'cast' | 'retrieve' | 'twitch' | 'hookset' | 'fight' | 'land' | 'release' | 'boat_drop'
export type RodId = 'straight' | 'light_bend' | 'heavy_bend' | 'cast_back' | 'drop'
export type EffectId = 'entry' | 'chase' | 'popper' | 'bite' | 'leap' | 'release'

function must(group: Readonly<Record<string, PixelSprite>>, key: string): PixelSprite {
  const s = group[key]
  if (s === undefined) throw new Error(`no sprite ${key}`)
  return s
}

/** An angler frame, 48x64, feet at [24,62]; frames beyond the animation's four wrap. */
export const anglerFrame = (anim: AnglerAnim, i: number): PixelSprite => must(ANGLER, `${anim}/${((i % 4) + 4) % 4}`)

/** A fish's eight frames: swim 0..3, turn 4..5 (facing left), leap 6..7. */
export const fishFrame = (id: FishId, i: number): PixelSprite => extraFish(id, i) ?? must(FISH_SPRITES, `${id}/${i}`)
export const fishPortrait = (id: FishId): PixelSprite => extraFish(id, 'portrait') ?? must(FISH_SPRITES, `${id}/portrait`)
export const fishIcon = (id: FishId): PixelSprite => extraFish(id, 'icon') ?? must(FISH_SPRITES, `${id}/icon`)
export const fishUnknown = (id: FishId): PixelSprite => extraFish(id, 'unknown') ?? must(FISH_SPRITES, `${id}/unknown`)

export const rodSprite = (id: RodId): PixelSprite => must(GEAR, `rod/${id}`)
export const netSprite = (): PixelSprite => must(GEAR, 'net')
export const lureWorld = (id: LureId): PixelSprite => must(GEAR, `lure/${id}/world`)
export const lureIcon = (id: LureId): PixelSprite => must(GEAR, `lure/${id}/icon`)
export const effectFrame = (id: EffectId, i: number): PixelSprite => must(GEAR, `effect/${id}/${((i % 4) + 4) % 4}`)

/** A venue's base (all four layers composited) and its foreground, drawn again over the actors. */
export const sceneBase = (venue: string): PixelSprite => must(SCENE_SPRITES, `${venue}/base`)
export const sceneOver = (venue: string): PixelSprite => must(SCENE_SPRITES, `${venue}/over`)

export const uiIcon = (id: 'lake' | 'coast' | 'boat' | 'catch' | 'unknown' | 'length-record' | 'weight-record'): PixelSprite => must(UI, `icon/${id}`)
export const catchPanel = (): PixelSprite => must(UI, 'catch-panel')
export const measurementsFont = (): PixelSprite => must(UI, 'font')

/** The rod an angler frame holds, by its manifest `equipment`; `fallback` when the frame names none. */
export function rodOf(frame: PixelSprite, fallback: RodId | null): RodId | null {
  const eq = frame.equipment
  if (eq === null) return null
  if (eq === undefined) return fallback
  return eq.startsWith('gear/rod/') ? (eq.slice('gear/rod/'.length) as RodId) : fallback
}

export const holdsNet = (frame: PixelSprite): boolean => frame.equipment === 'gear/landing-net'

/** An anchor in sprite pixels; a sprite without it reports its centre. */
export function anchor(s: PixelSprite, name: string): readonly [number, number] {
  return s.anchors?.[name] ?? [s.w >> 1, s.h >> 1]
}
