import type { LureLang } from '../types'

/**
 * Every word the pane draws, in Traditional Chinese and in English. The game
 * keeps ids (a callout is an id in the save), and the drawing looks them up.
 * Fish, venue and lure ids are text ids too.
 */
const ZH = {
  // the turn side, in the HUD box
  phaseIdle: '待機',
  phaseFishing: '垂釣中',
  phaseLanding: '收竿',
  // venues
  lake: '湖泊',
  coast: '海岸',
  boat: '船上',
  // lures and the pane's pick
  minnow: '米諾',
  popper: '波扒',
  pencil: '鉛筆',
  soft_worm: '軟蟲',
  shore_jig: '岸拋鐵板',
  boat_jig: '船釣鐵板',
  random: '隨機',
  lureInHand: '路亞 {lure}',
  randomSuffix: '（隨機）',
  pickAfterTurn: '・回合結束後可換',
  // fish
  largemouth_bass: '大口黑鱸',
  striped_snakehead: '線鱧',
  peacock_bass: '孔雀鱸',
  topmouth_culter: '翹嘴鮊',
  spotted_seabass: '花鱸',
  indo_pacific_tarpon: '大眼海鰱',
  great_barracuda: '大梭魚',
  malabar_grouper: '點帶石斑魚',
  greater_amberjack: '紅甘',
  mahi_mahi: '鬼頭刀',
  yellowfin_tuna: '黃鰭鮪',
  narrow_barred_mackerel: '土魠',
  // callouts over the water
  castOut: '拋投',
  bite: '咬餌！',
  hookset: '作合！',
  fight: '搏魚中',
  landed: '上岸！',
  newSpecies: '新魚種！',
  recordLength: '最長紀錄！',
  recordWeight: '最重紀錄！',
  recordBoth: '最長・最重紀錄！',
  released: '放流',
  skunk: '空軍…',
  lost: '脫鉤…',
  // the HUD's shadow line
  shadow: '魚影 {size}',
  size0: '小',
  size1: '中',
  size2: '大',
  size3: '巨',
  tension: '張力',
  // the tally strip and the dex
  caughtCount: '漁獲 {n}',
  dexOpen: '圖鑑 ▾',
  dexClosed: '圖鑑 ▸',
  dexUnknown: '???',
  dexEntry: '{name} 最長 {cm} cm・最重 {kg} kg ×{n}',
  dexTotals: '漁獲 {caught}／空軍 {skunks}／脫鉤 {losses}',
  dexLongest: '最長：{name} {cm} cm',
  dexHeaviest: '最重：{name} {kg} kg',
  hudSep: '・',
  noSvg: '（此介面不畫 Svg，略過釣魚畫面）',
  loading: '釣魚載入中…',
} as const

export type TextId = keyof typeof ZH

const EN: Readonly<Record<TextId, string>> = {
  phaseIdle: 'Idle',
  phaseFishing: 'Fishing',
  phaseLanding: 'Landing',
  lake: 'Lake',
  coast: 'Coast',
  boat: 'Boat',
  minnow: 'Minnow',
  popper: 'Popper',
  pencil: 'Pencil',
  soft_worm: 'Soft Worm',
  shore_jig: 'Shore Jig',
  boat_jig: 'Boat Jig',
  random: 'Random',
  lureInHand: 'Lure: {lure}',
  randomSuffix: ' (random)',
  pickAfterTurn: ' · pick after the turn',
  largemouth_bass: 'Largemouth Bass',
  striped_snakehead: 'Striped Snakehead',
  peacock_bass: 'Peacock Bass',
  topmouth_culter: 'Topmouth Culter',
  spotted_seabass: 'Spotted Seabass',
  indo_pacific_tarpon: 'Indo-Pacific Tarpon',
  great_barracuda: 'Great Barracuda',
  malabar_grouper: 'Malabar Grouper',
  greater_amberjack: 'Greater Amberjack',
  mahi_mahi: 'Mahi-mahi',
  yellowfin_tuna: 'Yellowfin Tuna',
  narrow_barred_mackerel: 'Spanish Mackerel',
  castOut: 'Cast',
  bite: 'Bite!',
  hookset: 'Hookset!',
  fight: 'Fight on',
  landed: 'Landed!',
  newSpecies: 'New species!',
  recordLength: 'Length record!',
  recordWeight: 'Weight record!',
  recordBoth: 'Length & weight record!',
  released: 'Released',
  skunk: 'Skunked…',
  lost: 'Lost it…',
  shadow: 'Shadow: {size}',
  size0: 'small',
  size1: 'medium',
  size2: 'large',
  size3: 'huge',
  tension: 'Tension',
  caughtCount: 'Caught {n}',
  dexOpen: 'Dex ▾',
  dexClosed: 'Dex ▸',
  dexUnknown: '???',
  dexEntry: '{name} longest {cm} cm · heaviest {kg} kg ×{n}',
  dexTotals: 'Caught {caught} / skunked {skunks} / lost {losses}',
  dexLongest: 'Longest: {name} {cm} cm',
  dexHeaviest: 'Heaviest: {name} {kg} kg',
  hudSep: ' · ',
  noSvg: '(this surface draws no Svg; fishing scene skipped)',
  loading: 'Fishing is loading…',
}

const TABLES: Readonly<Record<LureLang, Readonly<Record<TextId, string>>>> = { 'zh-TW': ZH, en: EN }

/** The text for an id; a string that is no id is drawn as it is. */
export function t(lang: LureLang, id: string, vars: Readonly<Record<string, string>> = {}): string {
  const text = (TABLES[lang] as Readonly<Record<string, string>>)[id] ?? id
  return text.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
}

/** Whole millimetres as one-decimal centimetres; whole grams as two-decimal kilograms. */
export const cmText = (mm: number): string => (mm / 10).toFixed(1)
export const kgText = (g: number): string => (g / 1000).toFixed(2)

/** Traditional Chinese, however it is written: 繁體中文, Traditional Chinese, zh-TW, zh_Hant, zh-HK. */
const TRADITIONAL = /繁|正體|臺灣|台灣|traditional|\bzh[-_](tw|hk|mo|hant)\b/i

/**
 * The pane's language from the first source that says anything, in order:
 * Claude's `language` setting, then the system locale. Traditional Chinese
 * draws Chinese; anything else, Simplified Chinese included, draws English.
 */
export function pickLang(sources: readonly unknown[]): LureLang {
  for (const source of sources) {
    if (typeof source === 'string' && source.trim() !== '') return TRADITIONAL.test(source) ? 'zh-TW' : 'en'
  }
  return 'en'
}
