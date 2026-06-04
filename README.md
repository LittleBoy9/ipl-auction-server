# Multiplayer Sports Auction Game — Server

> Real-time multiplayer player-auction game. Friends create a room, bid on players, and build squads. Two game modes: **Cricket (IPL)** and **Football (EPL + LaLiga)**. Built with Node.js + Express + Socket.io.

This is the **backend** repo (the canonical project doc).
Frontend lives at **[ipl-auction-client](https://github.com/LittleBoy9/ipl-auction-client)** (React + Vite, deployed to Vercel).

> **Multi-sport architecture:** the auction engine is sport-agnostic. Each sport is a "pack" that supplies its player pool, franchises, bid increments, currency, valuation, and squad-balance rules. Adding a sport = add a data file + a config entry, no engine changes (see [Adding a Sport](#game-modes--adding-a-sport)).

---

## Quick Start

```bash
# Server (this repo)
npm install
npm start            # → http://localhost:3001  (npm run dev for nodemon)

# Client (separate repo)
cd ../client
npm install
npm run dev          # → http://localhost:5173
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express + Socket.io |
| Frontend | React 18 + Vite (separate repo) |
| State | In-memory (no DB) |
| Styling | Pure CSS |
| Audio | Web Audio API (no external files) |

---

## Project Structure (server)

```
server/
├── server.js              # Socket.io + Express server (sport-agnostic engine)
├── sports.js              # Sport config registry (game logic per sport)
├── players.js             # Cricket (IPL) players (203)
├── players-football.js    # Football EPL + LaLiga players (140)
├── football-images.json   # Cached player headshot URLs (TheSportsDB)
└── scripts/
    └── fetch-football-images.mjs   # One-time: fetch football player photos
```

---

## Features

- **Two sports** — Cricket (IPL, 203 players) or Football (EPL + LaLiga, 140 players); chosen at the lobby and reflected in the client URL (`?sport=football`) so it's shareable.
- **Real-time multiplayer auction** — up to 10 players per room; **minimum 2 players** to start.
- **Single-click bidding** with sport-specific increment slabs; no self-bidding twice in a row.
- **Auto-bid** — set a max price and the system bids for you, including multi-bidder auto-bid wars.
- **Real imagery** — player photos and team crests (sourced once from TheSportsDB, see [below](#team-crests--player-photos)).
- **Live leaderboard, team-strength score, squad-balance tracker, smart "need" highlights** — all sport-driven.
- **Player Pool & Teams tabs**, bid history, chat, emoji reactions, confetti, sound effects + drama overlays.
- **Every player is auctioned** — there is **no skip**; an un-bid player auto-goes unsold when the timer ends.

> **No AI bots.** Bot players have been removed; rooms are human-only.

---

## Game Modes / Adding a Sport

The engine never hardcodes sport rules. Each sport is one entry in **two parallel registries** that must stay in sync:

| File | Owns |
|------|------|
| `server/sports.js` | Game logic: player pool, franchises, `increment(amount)`, `valuation(player)`, `squadNeeds(team)`, `defaultBudget` |
| `client/src/data/sports.js` | Display: `money(amount)`, increments + labels, `starRating`, `playerScore`, `squadNeeds` (icons/labels), `statFields(player)`, `poolCategories`, `franchises`, `budgetOptions` |

Built-in sports:

| Sport | id | Currency | Pool | Roles | Squad needs |
|-------|----|----------|------|-------|-------------|
| Cricket (IPL) | `cricket` | ₹ Cr (₹L below 1Cr) | 203 | Batter / WK-Batter / Bowler / All-rounder | WK 1, Bat 3, Bowl 3, AR 1 |
| Football (EPL + LaLiga) | `football` | € M | 140 | GK / DEF / MID / FWD | GK 1, DEF 4, MID 3, FWD 2 |

**Cricket increments:** `<₹0.5Cr → +0.05` · `<₹1Cr → +0.10` · `<₹5Cr → +0.25` · `else +0.30`
**Football increments:** `<€5M → +0.5` · `<€20M → +1` · `<€50M → +2.5` · `else +5`

**To add a sport (e.g. NBA):**
1. Create `server/players-<sport>.js` with the player rows.
2. Add a `buildSport({...})` entry to `SPORTS` in `server/sports.js`.
3. Add the matching display entry to `SPORTS` in `client/src/data/sports.js`.
4. It automatically appears in the lobby sport selector — no engine edits.

> The football dataset is a curated **starter set** (approximate rosters/values); base prices are auction starting bids in € millions, not real market value.

---

## Player Data Schema

**Cricket** (`players.js`):
```js
{
  id: "csk001", name: "Ruturaj Gaikwad",
  team: "CSK",            // franchise code
  role: "Batter",         // Batter | WK-Batter | Bowler | All-rounder
  position: "Top-order", nationality: "India",
  basePrice: 1.33,        // ₹ Crore (auction starting bid)
  battingAvg: 42.5, strikeRate: 142.3,
  bowlingAvg: null, economy: null, wickets: null,
  matches: 13, runs: 477, hs: 89,
  image: "https://scores.iplt20.com/.../<name>.png"
}
```

**Football** (`players-football.js`):
```js
{
  id: "rma01", name: "Kylian Mbappé",
  team: "RMA",            // club code
  role: "FWD",            // GK | DEF | MID | FWD
  position: "Striker", nationality: "France",
  basePrice: 60,          // € millions (auction starting bid)
  appearances: 34, goals: 27, assists: 6,
  rating: 8.6, age: 25,
  image: "..."            // from football-images.json, else initials avatar
}
```

---

## Socket Events

All payloads are validated/sanitised server-side and rate-limited (see [Production Hardening](#production-hardening)).

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `create-room` | `{ hostName, settings }` | Host creates room (`settings` incl. `sport`, `franchise`) |
| `join-room` | `{ roomCode, playerName, franchise }` | Player joins / reconnects |
| `start-auction` | `{ roomCode }` | Host starts auction (needs ≥ 2 players) |
| `place-bid` | `{ roomCode, amount }` | Place a bid |
| `pass-player` | `{ roomCode }` | Signal a pass (broadcast only; player auto-goes unsold on timeout) |
| `toggle-pause` | `{ roomCode }` | Host pause/resume |
| `toggle-auto-bid` | `{ roomCode, enabled, maxPrice }` | Enable/disable auto-bid |
| `send-reaction` | `{ roomCode, emoji }` | Emoji reaction |
| `send-chat` | `{ roomCode, message }` | Chat message |

### Server → Client
| Event | Description |
|-------|-------------|
| `room-created` / `joined-room` | Room created / joined |
| `player-joined` / `player-disconnected` | Roster changed |
| `new-host` | Host reassigned (passes to a connected player) |
| `auction-started` · `new-player` · `timer-update` | Auction flow |
| `bid-placed` | Someone bid (`autoBid: true` if auto-bid) |
| `player-sold` / `player-unsold` / `player-passed` | Lot resolved |
| `auction-paused` / `auction-resumed` | Pause state |
| `auto-bid-updated` · `new-reaction` · `new-chat` | Misc updates |
| `auction-ended` | Auction complete with rankings |
| `error` | Error message |

---

## Room Settings

```js
{
  sport: "cricket",   // "cricket" | "football" — selects the pool & rules
  budget: 100,        // cricket: 50/75/100/120/150/200 Cr — football: 200/300/400/500 M
  squadSize: 11,      // 7, 9, 11, 13, 15
  bidTimer: 15,       // 5, 10, 15, 20, 30 (seconds)
  franchise: "CSK",   // team/club the player represents (validated against the sport)
  maxPlayers: 203     // pool size limit (50/100/150/all); capped at pool size
}
```

---

## Team Crests & Player Photos

Imagery is fetched once from **TheSportsDB** by one-time scripts and cached as JSON — **no per-game API calls**.

| Asset | Script | Cache |
|-------|--------|-------|
| Team crests (both sports) | `client/scripts/fetch-team-logos.mjs` | `client/src/data/team-logos.json` |
| Football player photos | `server/scripts/fetch-football-images.mjs` | `server/football-images.json` |

```bash
# optional: a free key raises rate limits (default public key is "3")
THESPORTSDB_KEY=xxxx node scripts/fetch-football-images.mjs
```

- Re-runnable / resumable (already-fetched entries are skipped).
- Club-aware matching: ambiguous names fall back to an avatar rather than risk a wrong face; hard cases use the `ALIASES` map.
- Fallbacks: crest → local `/teams/<code>.svg` → coloured monogram; photo → initials avatar.
- Cricket player headshots come from the IPL CDN (name-based) directly in `players.js`.

> Imagery is hot-linked from TheSportsDB / IPL CDNs — fine for a personal/portfolio build; crests are the clubs' trademarks, so review before any commercial use.

---

## Production Hardening

Tuned for a **single small instance** (no Redis / horizontal scaling needed):

- **Room reclamation (janitor, every 60s):** deletes rooms with no connected players after a 2-min grace, or idle rooms after 30 min — and clears their timers (`destroyRoom`), so nothing leaks.
- **Room cap:** `MAX_ROOMS = 80` — new rooms past that get a "server busy" error.
- **Input validation:** all socket payloads sanitised — strings length-capped/typed; settings clamped (`budget 10-1000`, `squadSize 5-25`, `bidTimer 3-60`); franchise validated against the room's sport; bid amount must be a finite positive number.
- **Rate limiting (per-socket):** bids ≥150ms, chat ≥500ms, reactions ≥300ms apart.
- **XSS:** chat/names render through React (auto-escaped).

---

## Environment Variables

| Var | Default | Description |
|-----|---------|-------------|
| `PORT` | 3001 | Server port |
| `CLIENT_URL` | http://localhost:5173 | Frontend URL for CORS (any localhost port is allowed in dev) |
| `THESPORTSDB_KEY` | `3` (public) | *Scripts only* — higher rate limits for the image fetch |

---

## Deployment (Ubuntu + PM2)

```bash
git pull origin main
npm install
# .env →  PORT=3001 ; CLIENT_URL=https://your-frontend.vercel.app
pm2 start server.js --name auction-server   # first time
pm2 restart auction-server                  # subsequent deploys
pm2 save
```

Optional Nginx reverse proxy with SSL (Let's Encrypt) — proxy `/` to `localhost:3001` with WebSocket upgrade headers.

**Before deploying:** set `CLIENT_URL` to your Vercel URL, open the server port in the firewall, and use HTTPS in production.
