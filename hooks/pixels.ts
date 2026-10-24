/**
 * One native-pixel sprite from the asset pack (fishing-mod-assets-v1), as
 * tools/gen-sprites.cjs writes it: RLE rows over a palette, plus the
 * manifest's anchors in the sprite's own pixel coordinates.
 */
export type PixelSprite = {
  w: number
  h: number
  palette: Readonly<Record<string, string>>
  /** A palette letter or '.', then its run length when over 1. */
  rows: readonly string[]
  anchors?: Readonly<Record<string, readonly [number, number]>>
  /** Which way a fish frame faces; the turn frames face left. */
  facing?: 'left' | 'right'
  /** An angler frame's rod or net; null when the hands hold nothing drawn. */
  equipment?: string | null
}

/** Visits each run of a row without building strings. */
export function eachRun(row: string, fn: (ch: string, x: number, len: number) => void): void {
  let x = 0
  let i = 0
  while (i < row.length) {
    const ch = row.charAt(i)
    i += 1
    let n = 0
    let has = false
    while (i < row.length && row.charCodeAt(i) >= 48 && row.charCodeAt(i) <= 57) {
      n = n * 10 + (row.charCodeAt(i) - 48)
      has = true
      i += 1
    }
    const len = has ? n : 1
    fn(ch, x, len)
    x += len
  }
}
