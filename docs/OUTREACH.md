# pixel-fishing outreach

## Project facts

- Repository: https://github.com/s7788/pixel-fishing
- Install: `claude plugin install pixel-fishing --marketplace s7788/pixel-fishing`
- Open pane: `/pixel-fishing`; try a cast: `/pixel-fishing-demo`.
- English demo: https://raw.githubusercontent.com/s7788/pixel-fishing/main/docs/media/demo.gif
- Traditional Chinese demo: https://raw.githubusercontent.com/s7788/pixel-fishing/main/docs/media/demo.zh-TW.gif
- Short English clip: [demo-short.mp4](media/demo-short.mp4)
- Short Traditional Chinese clip: [demo-short.zh-TW.mp4](media/demo-short.zh-TW.mp4)
- Source code: MIT. Pixel artwork: reserved; link to hosted demos rather than redistributing the asset collection.

## X post draft

I made pixel-fishing, an 8-bit fishing companion for Claude Code. It casts while Claude works and lands fish when it answers. Three spots, 12 species, and persistent records. Fishing runs locally, with no model calls.

https://github.com/s7788/pixel-fishing

Attach `media/demo-short.mp4`.

## Reddit showcase draft

Title: I made pixel-fishing, an 8-bit fishing companion for Claude Code

pixel-fishing is a side pane mod built for Claude Code. Sending a prompt starts a fishing trip; a normal answer decides the catch, while an interrupted turn loses it. The angler rotates between a lake, the coast, and a boat, with six lures and 12 species to collect.

The animation is driven by Claude Code's main-turn events and a local state machine updated eight times a second. The game's own SVG renderer draws the scenes, tackle, fish, and catch cards. It does not call a model to decide catches or make network requests. Subagent turns do not start extra trips.

Catch counts and separate longest/heaviest records persist in the plugin store. The interface supports English and Traditional Chinese. The terminal has a text interface; pixel art requires a host with Svg support.

Install from a shell with Claude Code 2.1.292 or later:

```bash
claude plugin install pixel-fishing --marketplace s7788/pixel-fishing
```

Source, animated demos, compatibility notes, and installation details:
https://github.com/s7788/pixel-fishing

Feedback on installation and pane behavior across hosts would be helpful. Code is MIT; the pixel artwork is reserved.

Attach `media/demo-short.mp4`. Recheck the target community's current showcase rules before posting.

## ClaudeMods update request

Target: the existing, author-claimed pixel-fishing listing on ClaudeMods.

Title: `pixel-fishing: 跟著 Claude 工作節奏出門路亞的釣手`

Replace the About section with only the Traditional Chinese animated GIF. Use the English GIF for the English page. Refresh the stored original README from the repository's current English README.

Replace the installation commands with:

```bash
claude plugin marketplace add s7788/pixel-fishing
claude plugin install pixel-fishing@pixel-fishing
```

Keep the existing listing and authorship claim. Ask the site to choose whether a URL change or redirect is needed; the repository cannot change the site's slug directly.
