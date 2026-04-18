# Cattea — Soft Launch Playbook

**Goal (Week 2):** First 50 anonymous users. No friend-testing.
**Live URL:** https://csparkzxc1.github.io/Personal_project/P03(cattea-tile-match)/
**Status:** MVP · 30 stages · GA4 wired · Share button live · OG image template ready

---

## 0. Pre-flight Checklist (before first post)

- [ ] Replace `G-XXXXXXXXXX` in `index.html` (2 places) with real GA4 Measurement ID
- [ ] Export `og-image.html` → `og-image.png` (see instructions inside that file)
- [ ] Verify OG preview at https://www.opengraph.xyz/ (paste live URL)
- [ ] Verify Twitter card at https://cards-dev.twitter.com/validator
- [ ] Open browser devtools → Console → `Cattea.ProgressManager.reset()` on first visit
- [ ] Play stages 1, 6 (timeattack), 13 (spike), 14 (relief), 30 end-to-end once
- [ ] Confirm `stage_start` / `stage_clear` / `stage_fail` appear in GA4 DebugView
- [ ] Test Share button on: iOS Safari (Web Share API), Desktop Chrome (clipboard fallback)
- [ ] Verify game link accessible via portfolio index — `../../index.html`

---

## 1. itch.io Listing Draft

### Title
`Cattea — Triple Tile Match (Web)`

### Short Description (max ~140 chars)
`Cozy 3-tile match puzzle with 30 hand-crafted stages. No install, plays in your browser. Can you clear them all?`

### Tags
`puzzle`, `tile-matching`, `match-3`, `casual`, `cats`, `web`, `html5`, `mobile-friendly`, `relaxing`, `free`

### Classification
- **Kind:** HTML
- **Genre:** Puzzle
- **Tags:** as above
- **Release status:** Prototype
- **Pricing:** Free (no donations until traffic justifies)
- **Orientation:** Portrait / Mobile-friendly

### Description (Markdown)

```markdown
# Cattea — Triple Tile Match 🐱

A cozy 3-tile match puzzle you can play right in your browser.
Tap tiles from the board, drop them into the 7-slot tray, and
match 3 of a kind to clear them.

## Features
- 🎯 **30 hand-crafted stages** with a spike → relief difficulty curve
- ⏱ **5 time-attack variants** to break the rhythm
- 🧲 **3 boosters** — Undo, Magnet, Shuffle
- 💾 **Progress saved** in your browser (no login)
- 📱 **Mobile-friendly** portrait layout
- 🆓 **No install, no sign-up, no ads** (for now)

## Controls
- Click / tap a tile to send it to the tray
- 3 identical tiles in the tray auto-pop
- Grayed-out tiles are blocked by upper tiles — clear those first
- Use boosters in a pinch

## Feedback Wanted
This is a soft-launch prototype. I'm specifically looking for:
1. Which stage did you give up on?
2. Did the stage 13 difficulty spike feel fair?
3. Any booster feel useless / overpowered?

Leave a comment or DM me. Thanks for trying it! 🎮
```

### Embed settings
- Frame width: 520px
- Frame height: 820px
- Fullscreen button: ON
- Mobile-friendly: ON
- Orientation: Portrait

---

## 2. Reddit Post Drafts (English)

### r/WebGames (most forgiving, best first target)

**Title:**
`[WebGame] Cattea — A cozy 3-tile match puzzle with 30 hand-crafted stages, no install`

**Body:**
```
Hey r/WebGames,

I built a small browser-based tile-match puzzle called Cattea. You tap tiles
from a layered board, drop them into a 7-slot tray, and match 3 of a kind.

https://csparkzxc1.github.io/Personal_project/P03(cattea-tile-match)/

**What's in it:**
- 30 stages with a deliberate spike → relief difficulty curve
- 5 of them are time-attack variants
- 3 boosters (undo, magnet, shuffle)
- Progress saves locally, no account needed

**What I'd love feedback on:**
- Where does the difficulty feel off?
- Is the tutorial (stages 1–5) too slow or too fast?
- Any booster you'd remove/replace?

It's a side project — desktop and mobile browsers both work. No install,
no ads, no sign-in. Thanks for taking a look!
```

### r/playmygame

**Title:**
`[Web][Free] Cattea — Triple Tile Match puzzle · 30 stages · Feedback welcome`

**Body:** (same as above, remove intro line)

### r/IndieDev (weekly feedback thread only — read rules)

**Title for feedback thread comment:**
`[WebGame] Cattea — 3-tile match puzzle, 30 stages`

**Body:**
```
Link: https://csparkzxc1.github.io/Personal_project/P03(cattea-tile-match)/

Context: Solo dev, HTML/CSS/JS MVP. Trying to validate difficulty curve
before investing in more stages.

Specific questions:
1. Stage 13 is an intentional spike — did it feel fair or cheap?
2. Stage 14 is the relief — did you notice the breather?
3. Does the Magnet booster feel useful or useless?

Appreciate any 3-minute playthrough notes!
```

### r/incremental_games (only if you add more meta loop later — SKIP for now)

---

## 3. Twitter / X Post

**Copy:**
```
Built a tiny browser tile-match puzzle: Cattea 🐱

→ 30 hand-crafted stages
→ spike → relief difficulty curve
→ no install, no login, no ads

Feedback wanted on where you give up.

https://csparkzxc1.github.io/Personal_project/P03(cattea-tile-match)/
```

Attach: og-image.png as the card (auto-embedded via meta tags).

---

## 4. Hacker News (Show HN)

**Title (low-key, follow HN norms — no emoji):**
`Show HN: Cattea – A 3-tile match puzzle that runs in the browser`

**First comment (immediately after posting):**
```
Hi HN — solo dev here.

This is a small experiment: a classic 3-tile-match puzzle (like Triple
Tile / Zen Match) but in-browser, no install, no account, progress saved
in localStorage. 30 hand-tuned stages with a deliberate spike-then-relief
difficulty curve.

I'm at the "does the core loop actually land" phase and would love notes
on: (a) where the difficulty felt off, (b) whether the tray-cluster
feedback is readable, (c) if the boosters feel meaningful.

Tech: vanilla HTML/CSS/JS (no framework), ~40KB gzipped. GA4 is the only
tracker.

Thanks for the clicks.
```

Expected outcome: 99% static, occasional front-page hit. Don't count on it.

---

## 5. Product Hunt (Week 3 only — needs better assets first)

**Skip for Week 2.** PH requires polished assets, ideally a short demo video,
and a launch-day burst of votes. Revisit after you have 100+ plays and the
OG image is in final form.

---

## 6. Korean Communities — DO NOT POST YET

Per plan: 디시/루리웹 are hostile to "made by me" posts at MVP stage.
Re-evaluate after Week 4 with a post-mortem/devlog framing instead.

---

## 7. Day-by-Day Schedule

| Day | Task | Time |
| --- | --- | --- |
| 1 | Web Share API + OG meta + OG image export ✅ | 2h |
| 2 | itch.io account + upload + fill listing | 2h |
| 3 | Reddit post #1 → r/WebGames · respond to comments | 1h + 1h throughout day |
| 4 | Twitter post + Reddit post #2 → r/playmygame | 1h |
| 5 | HN Show HN (evening PT) + check GA4 | 1h |
| 6 | Read all feedback, no code yet | 1h |
| 7 | Write Week 3 plan based on actual numbers | 1h |

---

## 8. Response Templates

### Generic positive comment
`Thanks for playing! Which stage did you stop at? That data point helps more than you'd guess.`

### "UI looks generic / cheap"
`Fair — emoji tiles are placeholder. What would a better look like for you: illustrated cats, food items, something else?`

### "Too easy / too hard"
`Which stage specifically? I'm tracking where players drop off so the more precise, the better.`

### Bug report
`Nice catch, thanks. Logged. Mind sharing browser + OS + roughly which stage?`

### Toxic / low-effort negative
`Appreciate you looking.` (One sentence. Move on. Don't engage.)

---

## 9. Success Metrics (end of Week 2)

| Metric | Floor (try again) | Goal | Stretch |
| --- | --- | --- | --- |
| Unique visitors | < 30 | 50–100 | 200+ |
| Median stages reached | < 3 | 5–10 | 15+ |
| Stage 13 drop-off | > 60% | 30–50% | < 30% |
| Share button uses | 0 | 3+ | 10+ |
| Positive comments | 0 | 3+ | 10+ |

---

## 10. When Week 3 Kicks Off

Three branches based on what you observe:

1. **50+ visitors, decent feedback** → tune stages 13/24/29 based on drop-off, file AdSense re-application with real traffic numbers.
2. **10–50 visitors, ambiguous feedback** → more traffic sources (Product Hunt prep, gamejolt mirror, Twitter dev community).
3. **< 10 visitors** → the listing/title/thumbnail is the problem, not the game. A/B test the itch.io page before more posts.

Data first. Never skip to "just add more stages" when the real blocker is discovery.
