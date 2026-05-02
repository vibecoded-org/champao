# Champao

A client-side sports championship manager for organizing football/soccer tournaments — leagues, cups, or both. No backend required; everything runs in the browser and persists to localStorage.

![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss) ![DaisyUI](https://img.shields.io/badge/DaisyUI-5-5A0EF8) ![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest)

---

## Features

**Team & Player Setup**
- Create teams with custom name, short display name, emoji flag, and color
- Add players per team; bulk-paste a list to import a full squad at once
- Load sample World Cup squads (Argentina, Brazil, France, Portugal) for quick testing

**Championship Formats**
- League (round-robin), Cup (knockout), or both running simultaneously
- Configurable home-and-away for both league and cup
- Custom points per result (win / draw / loss)
- Cup draw tiebreaker: penalty shootout or away goals
- Unique final match option (no second leg in the final)

**Match Recording**
- Enter goals with scorer name or player from roster, including own goals
- Record yellow and red cards per player
- Mark penalty shootout winner for drawn cup ties
- Track match status (in progress / finished)

**Discipline & Suspensions**
- Configurable yellow and red card suspension thresholds and games-out
- Automatic suspension detection; suspended players are shown and blocked in the match modal

**Rankings & Statistics**
- League table with fully configurable tiebreaker criteria (drag-drop order, ascending/descending)
- Top scorers ranking with own-goal attribution
- Disciplinary cards ranking by player
- Best attack / best defense stats
- Results page with champion, biggest win, most goals, most/least exciting matches

**Data Management**
- All state auto-saved to browser localStorage
- Export full championship state as a JSON file
- Import a previous JSON backup (with schema validation)
- Full data reset option

**i18n**
- Portuguese (Brazil) — default
- English (United States)
- Switch at any time from the config page

---

## Tech Stack

| Area | Library / Version |
|---|---|
| Framework | Angular 21.2 |
| Language | TypeScript 5.9 |
| UI components | DaisyUI 5 + Tailwind CSS 4 |
| Icons | Lucide-Angular 1.0 |
| Drag & drop | Angular CDK |
| State | Angular Signals |
| Testing | Vitest 4 |
| Package manager | Bun 1.3 |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Bun](https://bun.sh/) 1.3+
- Angular CLI (`bun add -g @angular/cli`)

### Install

```bash
git clone <repo-url>
cd champao
bun install
```

### Development server

```bash
bun start
# or: ng serve
```

Open [http://localhost:4200](http://localhost:4200). The app hot-reloads on file changes.

### Build

```bash
bun run build
```

Production artifacts are written to `dist/champao/browser/`.

### Build for GitHub Pages

```bash
bun run build:gh-pages
```

Outputs directly to `docs/` at the repo root, which GitHub Pages can serve from the `main` branch. Enable it under **Settings → Pages → Source: Deploy from a branch → `main` / `docs`**.

> **Note:** `baseHref` is set to `./` (relative). If your app uses deep Angular routes and you see 404s on page refresh, set `baseHref` to your repository path (e.g. `/champao/`) in `angular.json` under the `gh-pages` configuration.

### Tests

```bash
bun test
# or: ng test
```

Runs unit tests with Vitest.

---

## Usage

### 1 — Configure teams
Go to the **Config** page, add your teams (name, flag emoji, color), then add players to each team.

### 2 — Set championship rules
Still on Config, choose a format (League, Cup, or Both) and tune the rules:
- Points for win/draw/loss
- Home-and-away legs
- Cup draw tiebreaker (penalties or away goals)
- Yellow/red card suspension thresholds

### 3 — Generate fixtures
Click the **Generate Fixtures** button in the top bar. The app creates a full round-robin schedule (league) and/or a knockout bracket (cup), with teams shuffled randomly.

### 4 — Record results
Go to the **Fixtures** page, open any match, and enter goals and cards. Mark the match as finished when done. Rankings update automatically.

### 5 — View standings and results
- **Ranking** page — live league table, top scorers, cards ranking
- **Results** page — champion, statistical highlights, full tournament summary

---

## Pages

| Page | Route | Description |
|---|---|---|
| Config | `/config` | Teams, players, format rules, import/export |
| Fixtures | `/fixtures` | Match schedule, score entry, suspension view |
| Ranking | `/ranking` | League table, scorers, disciplinary stats |
| Results | `/result` | Champion, trophies, tournament highlights |

When the format is **Both** (league + cup), a scope selector in the nav bar lets you switch between League, Cup, and Total views.

---

## Championship Formats

### League
Round-robin — every team plays every other team. Configure:
- **Home & Away** — each pairing plays twice (once at each home venue)
- **Points** — custom values for win, draw, and loss (default: 3 / 1 / 0)
- **Ranking criteria** — drag-drop priority list: Points, Wins, Goal Difference, Goals For, Goals Against, Games Played, Team Name; each with ascending/descending direction

### Cup
Single-elimination knockout bracket. Configure:
- **Home & Away** — two-legged ties with aggregate scoring
- **Single Elimination** — standard bracket (lose = out)
- **Unique Final** — one-match final even when home-and-away is on
- **Draw Tiebreaker** — Penalties or Away Goals

### Both
League and Cup run in parallel. All teams participate in both. Stats are tracked separately and can be viewed by competition scope.

---

## Discipline

Card suspension rules apply across finished matches:

| Setting | Default | Meaning |
|---|---|---|
| Yellow card threshold | 2 | Cards before a 1-game suspension |
| Yellow suspension games | 1 | Games missed per yellow threshold |
| Red card threshold | 1 | Cards before a 1-game suspension |
| Red suspension games | 1 | Games missed per red card |

Suspended players are flagged in the match modal and shown in the Suspended Players list.

---

## Data Persistence

The app stores the entire championship state in browser **localStorage** under the key `champao_state`. State is saved automatically on every change.

**Export** — Downloads the current state as `championship-backup-<date>.json`. Use this to back up your data or share it.

**Import** — Load a previously exported JSON file. The app validates the schema before applying.

**Reset** — Clears all data from localStorage and resets to a blank state.

---

## Project Structure

```
src/app/
├── core/
│   ├── models/          # TypeScript interfaces (Championship, Team, Player, Fixture, Ranking)
│   └── services/
│       ├── championship-store.service.ts  # Central state (Angular signals)
│       ├── fixture-generator.service.ts   # Round-robin & bracket generation
│       ├── ranking.service.ts             # League table & scorer calculations
│       ├── import-export.service.ts       # JSON serialization + validation
│       ├── storage.service.ts             # localStorage read/write
│       ├── i18n.service.ts                # Translation dictionary (pt-BR / en-US)
│       └── toast.service.ts               # In-app notifications
├── components/          # Reusable UI components (match modal, forms, tables, etc.)
├── pages/
│   ├── config-page/     # Team/player setup and championship configuration
│   ├── fixtures-page/   # Match schedule and result entry
│   ├── ranking-page/    # League standings and stats
│   └── result-page/     # Tournament results and highlights
└── layout/
    └── app-shell/       # Top navigation, scope selector, toast outlet
```

---

## Contributing

1. Fork the repo and create a branch
2. Run `bun install` and `bun start` to verify your setup
3. Make your changes; run `bun test` to ensure tests pass
4. Open a pull request with a clear description of what changed and why
