// One-time prep: fetch real headshots for the football pool from TheSportsDB
// and cache them into football-images.json (id → image URL). Re-runnable /
// resumable — already-fetched players are skipped.
//
//   THESPORTSDB_KEY=<your key> node scripts/fetch-football-images.mjs
//
// The free public key "3" works for the player search endpoint. Get your own
// (higher limits) at https://www.thesportsdb.com/api.php
//
// After it finishes, players-football.js automatically picks up the URLs;
// any player not matched keeps the initials-avatar fallback.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { footballPlayers } = require('../players-football.js');

const KEY = process.env.THESPORTSDB_KEY || '3';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, '..', 'football-images.json');

let map = {};
if (fs.existsSync(OUT)) {
  try { map = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { map = {}; }
}

// club code → keyword variants expected to appear in a TheSportsDB team name
const CLUB_KW = {
  MCI: ['manchester city', 'man city'], ARS: ['arsenal'], LIV: ['liverpool'],
  MUN: ['manchester united', 'man united', 'man utd'], CHE: ['chelsea'],
  TOT: ['tottenham', 'spurs'], NEW: ['newcastle'], AVL: ['aston villa'],
  RMA: ['real madrid'], BAR: ['barcelona'], ATM: ['atletico'], ATH: ['athletic'],
  RSO: ['real sociedad', 'sociedad'], VIL: ['villarreal'], BET: ['betis'], SEV: ['sevilla'],
  MIA: ['miami'], NAS: ['nassr'], SAN: ['santos'], BAY: ['bayern'],
  ITT: ['ittihad'], PSG: ['paris'], INT: ['inter'], MIL: ['milan'],
  GAL: ['galatasaray'], JUV: ['juventus'],
};

const norm = s => (s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z ]/g, '').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Pick the best candidate, accepting only confident matches:
//   • all of our name's words appear in the candidate's name (name-subset), AND
//   • for single-word names (Rodri, Ederson, Neymar…) the club must also match,
//     since those are ambiguous; multi-word names are trusted on the name alone.
// Anything weaker → null (keeps the avatar rather than risk a wrong face).
function pick(cands, name, clubCode) {
  const myTokens = norm(name.replace(/\s+Jr\.?$/i, '')).split(' ').filter(Boolean);
  const single = myTokens.length === 1;
  const kws = CLUB_KW[clubCode] || [];
  let best = null, bestScore = 0;
  for (const c of cands) {
    if (!(c.strThumb || c.strCutout)) continue;
    const ct = norm(c.strPlayer).split(' ').filter(Boolean);
    const nameSubset = myTokens.every(t => ct.includes(t));
    if (!nameSubset) continue;
    const teamHit = kws.some(k => norm(c.strTeam).includes(k));
    if (single && !teamHit) continue; // ambiguous mononym needs club confirmation
    const exact = ct.join(' ') === myTokens.join(' ');
    const score = 50 + (exact ? 20 : 0) + (teamHit ? 40 : 0);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

// Query the search endpoint, retrying through rate limits (HTTP 429).
async function query(q) {
  const url = `https://www.thesportsdb.com/api/v1/json/${KEY}/searchplayers.php?p=${encodeURIComponent(q)}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    let res;
    try { res = await fetch(url); } catch { await sleep(2500); continue; }
    if (res.status === 429) { await sleep(6000); continue; } // throttled — wait and retry
    try { return (await res.json()).player || []; } catch { return []; }
  }
  return [];
}

// Players TheSportsDB only indexes under a full/registered name → search alias.
const ALIASES = {
  bar03: 'Pedro Gonzalez Lopez', // Pedri
  bar06: 'Pablo Paez Gavira',    // Gavi
};

async function lookup(name, clubCode, alias) {
  const surname = norm(name.replace(/\s+Jr\.?$/i, '')).split(' ').pop();
  const variants = [...new Set([alias, name, surname].filter(Boolean))];

  let all = [];
  for (const v of variants) {
    const cands = (await query(v)).filter(p => p.strSport === 'Soccer');
    all = all.concat(cands);
    const hit = pick(all, name, clubCode);
    if (hit) return { img: hit.strThumb || hit.strCutout, matched: hit.strPlayer, team: hit.strTeam };
    await sleep(300);
  }
  return null;
}

let found = 0, miss = 0, done = 0;
console.log(`Fetching images for ${footballPlayers.length} players (key=${KEY})...\n`);

for (const p of footballPlayers) {
  done++;
  if (map[p.id]) { found++; continue; } // resume
  const r = await lookup(p.name, p.team, ALIASES[p.id]);
  if (r) {
    map[p.id] = r.img;
    found++;
    console.log(`✓ ${p.name}  →  ${r.matched} (${r.team || '—'})`);
  } else {
    miss++;
    console.log(`✗ ${p.name}  (no match — keeps avatar)`);
  }
  if (done % 5 === 0) fs.writeFileSync(OUT, JSON.stringify(map, null, 2));
  await sleep(1300);
}

fs.writeFileSync(OUT, JSON.stringify(map, null, 2));
console.log(`\nDone. matched=${found}  missing=${miss}  total=${footballPlayers.length}\n→ ${OUT}`);
