# Pixel Fishing

**Claude works. Your 8-bit angler goes fishing.**

[繁體中文](README.zh-TW.md)

A side pane plugin for Claude Code (`lure-8bit`). Send a prompt and your angler casts, retrieves, and works a lure. When Claude finishes answering, the cast ends with a catch or an empty line. A catch plays out automatically: hookset, fight, landing net, catch card, and release. Interrupt the turn and the fish gets away.

Rotate between a lake, the coast, and a boat. Choose from six lures, collect 12 fish species, and set separate records for your longest and heaviest catches. Longer turns improve your chances of larger and rarer fish.

![Pixel Fishing asset overview: three fishing spots, angler animations, fish, and tackle](fishing-mod-assets-v1/overview.png)

The image above is an asset overview. Download the [full asset pack](fishing-mod-assets-v1.zip) and open its `preview.html` to explore the scenes and animations. The asset preview currently has Traditional Chinese labels.

## Install

Requires Claude Code with mod side pane support. The in-session install command below requires **2.1.275 or later**; the shell command with `--marketplace` requires **2.1.292 or later**.

At the prompt of a Claude Code terminal session:

```text
/plugin install lure-8bit --marketplace s7788/pixel-fishing
```

Confirm adding the marketplace, then choose an installation scope. If Claude Code asks you to reload the plugin, follow its instructions.

Or install from PowerShell or another shell:

```bash
claude plugin install lure-8bit --marketplace s7788/pixel-fishing
```

After installing from a shell, start a new Claude Code session or run `/reload-plugins` in an existing one. See the [official installation guide](https://code.claude.com/docs/en/discover-plugins) for details.

If you have already added this marketplace, you can also install by its full plugin name:

```bash
claude plugin install lure-8bit@pixel-fishing
```

### Your first cast

1. The **Lure** pane opens automatically when a session starts with the plugin loaded. You can also open it with `/lure`.
2. Pick a lure below the scene, or leave the default **Random** selection.
3. Send Claude a prompt as usual. Your angler starts fishing, and the catch is decided when Claude finishes answering.
4. Expand **Dex** to see discovered species, catch counts, and records.

To try it without a Claude turn, run `/lure-demo` to cast, wait a while, then run it again to reel in.

**Display and language:** Surfaces with `Svg` support show the pixel art scene. The terminal currently shows text status, catch statistics, and the fish collection. The game checks Claude's `language` setting first, then the system locale if no language is set. It uses Traditional Chinese for Traditional Chinese settings and English for other languages.

## How it plays

- **One main turn, one fishing trip.** A prompt starts the trip; a normal answer decides the catch. An interruption or error loses the fish. Subagent turns do not affect your trip.
- **Three spots rotate automatically.** Lake → coast → boat → lake. On shore, your angler casts, retrieves, and twitches the lure. On the boat, it drops a jig vertically and works it up and down.
- **Choose a lure between turns.** There are six lures plus **Random**. You cannot change lures during a cast. If your selection does not fit the next spot, the game uses that spot's default lure. Random picks from the available lures each trip.
- **Time affects the catch.** Longer turns reduce the chance of an empty cast and improve the odds of rarer species and larger sizes. The underwater shadow grows with the time tier; it is a hint about the tier, not the species. The species is drawn when the turn ends.
- **Build your collection and records.** Undiscovered fish appear as silhouettes. Discovered entries show the species, catch count, longest length, and heaviest weight. Records are kept per species and across all catches. Length and weight records can belong to different fish.
- **Catches are released automatically.** The fight, netting, and release are animations. The catch is recorded as soon as the turn ends, so sending another prompt immediately does not lose it.

### Spots, lures, and fish

| Spot | Available lures (default first) | Fish |
|---|---|---|
| Lake | Minnow, Popper, Pencil, Soft Worm | Largemouth Bass, Topmouth Culter, Striped Snakehead, Peacock Bass★ |
| Coast | Minnow, Popper, Pencil, Shore Jig | Spotted Seabass, Great Barracuda, Indo-Pacific Tarpon, Malabar Grouper★ |
| Boat | Boat Jig | Spanish Mackerel, Mahi-mahi, Greater Amberjack, Yellowfin Tuna★ |

Each spot has two common species, one uncommon species, and one rare species (★). Each lake and coast species favors two lures; a favored lure doubles that species' selection weight. All boat species use the Boat Jig. Fish pools and sizes are game settings.

| Claude main turn duration | Chance of an empty cast |
|---|---|
| Under 30 seconds | 30% |
| 30 seconds to under 2 minutes | 10% |
| 2 minutes to under 5 minutes | 4% |
| 5 minutes or longer | 2% |

Turns under 30 seconds cannot draw rare fish. Other tiers use weighted draws based on the spot and lure. Empty-cast probabilities apply only after a normal answer; an interruption or error loses the fish directly.

## Commands

| Command | What it does |
|---|---|
| `/lure` | Opens the fishing pane; it also opens automatically at session start |
| `/lure-demo` | Starts a fishing trip without a Claude prompt; run it again to reel in and decide the catch |

## Saves and runtime

- **Fishing runs locally.** The game updates eight times a second, makes no model calls, and sends no network requests. It does not call a model to decide your catch. Your normal Claude work is billed as usual.
- **Progress survives sessions.** The collection, catch counts, lure selection, and length/weight records live in the plugin's own store. Sessions share one angler.
- **Reopening returns you to idle.** If you close a session during a cast, reopening does not resume that trip or count it as a lost fish. Saved catch records remain.

## Updates and troubleshooting

### How do I update?

From PowerShell or another shell:

```bash
claude plugin marketplace update pixel-fishing
claude plugin update lure-8bit@pixel-fishing
```

Restart Claude Code afterward to load the new version.

### The pane did not appear after installation

Try `/lure`. If the command is missing, run `/plugin`, check that `lure-8bit` is installed and enabled, then follow the reload instructions or start a new session. The terminal currently shows text only; pixel art requires a host surface with `Svg` support.

### Why did I catch nothing, or why did my lure change?

A normal answer can still end with an empty cast. Interruptions and errors lose the fish. Each trip moves to the next spot, and an incompatible lure is replaced with that spot's default. The boat, for example, only uses the Boat Jig.

## Contributing

Open a shell in the repository root to load a local copy:

```bash
claude --plugin-dir .
```

Run checks from the repository root:

```bash
claude plugin validate .
claude plugin test .
```

`hooks/gen/*.ts` is generated by `node tools/gen-sprites.cjs` from the asset pack's `pixel-data.json` and `manifest.json`. Regenerate these files after changing assets; do not edit the generated output by hand. Design decisions and the file map are in [HANDOFF.md](HANDOFF.md) (Traditional Chinese).

## Asset pack and preview

The repository includes **252 game PNGs** covering three layered fishing spots, 12 fish species, nine angler animations, six lures, tackle, effects, and record UI. It also includes source images, atlases, animation sequences, anchors, and RLE pixel data.

- [Download the full asset pack ZIP](fishing-mod-assets-v1.zip)
- [Asset usage guide (Traditional Chinese)](fishing-mod-assets-v1/README.zh-TW.md)
- [Dimensions, frames, and anchors](fishing-mod-assets-v1/manifest.json)
- [Asset validation results](fishing-mod-assets-v1/validation.json)

After downloading, open `fishing-mod-assets-v1/preview.html` to switch spots, angler actions, and species. This is an asset demonstration. GitHub's source viewer does not run the preview page.

For a local preview server or asset checks, install **Node.js 20.9 or later** and run from the repository root:

```bash
npm install
npm run preview
```

Open the local URL printed in your terminal. To validate the assets:

```bash
npm run validate:assets
```

The main canvas is **384×216**. Background layers are **128×72**, scaled by an integer factor of three. Fish names, weights, lengths, and record markers are drawn at runtime. See the asset usage guide for integration details.

Images were generated with image_gen, then cropped, palette-adjusted, aligned to the pixel grid, and checked for transparency. Rods and simple UI use integer-pixel drawing. Generation prompts and style references are included in the asset pack.

## Support

lure-8bit is an original project by s7788. If you enjoy it, you can [buy the author a coffee on PayPal](https://www.paypal.me/s7788pixel) to support further development.
