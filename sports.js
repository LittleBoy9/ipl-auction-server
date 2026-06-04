// ============================================================================
// Sport config registry (server-side game logic)
// ----------------------------------------------------------------------------
// Each sport "pack" describes everything the auction engine needs that is NOT
// generic: the player pool, franchises, bid increments, valuation (for bots),
// and squad-balance requirements. The engine itself stays sport-agnostic.
//
// The client has a parallel pack (client/src/data/sports.js) for DISPLAY
// concerns (money formatting, star ratings, stat fields). Keep the two in sync.
// ============================================================================

const { ipl2026Players } = require('./players');
const { footballPlayers, FOOTBALL_CLUBS } = require('./players-football');

// ---- Cricket (IPL) ---------------------------------------------------------

const CRICKET_FRANCHISES = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'DC', 'PBKS', 'RR', 'LSG', 'GT'];

function cricketIncrement(amount) {
  if (amount < 0.50) return 0.05;
  if (amount < 1.00) return 0.10;
  if (amount < 5.00) return 0.25;
  return 0.30;
}

function cricketValuation(player) {
  let score = player.basePrice * 10;
  if (player.battingAvg && player.strikeRate) {
    score += (player.battingAvg * player.strikeRate) / 50;
  }
  if (player.wickets !== null && player.wickets !== undefined && player.economy) {
    score += player.wickets * (12 - Math.min(player.economy, 12)) * 2;
  }
  if (player.basePrice >= 1.5) score += 15;
  else if (player.basePrice >= 1.0) score += 10;
  else if (player.basePrice >= 0.5) score += 5;
  return score;
}

// squadNeeds returns role-requirement rows; `match(player)` decides if a player
// counts toward that row. Shared shape across sports so the engine is generic.
function cricketSquadNeeds(team) {
  const counts = { 'WK-Batter': 0, 'Batter': 0, 'Bowler': 0, 'All-rounder': 0 };
  (team || []).forEach(p => { if (counts[p.role] !== undefined) counts[p.role]++; });
  return [
    { key: 'wk', need: 1, have: counts['WK-Batter'], match: p => p.role === 'WK-Batter' },
    { key: 'batters', need: 3, have: counts['Batter'] + counts['WK-Batter'], match: p => p.role === 'Batter' || p.role === 'WK-Batter' },
    { key: 'bowlers', need: 3, have: counts['Bowler'], match: p => p.role === 'Bowler' },
    { key: 'allRounders', need: 1, have: counts['All-rounder'], match: p => p.role === 'All-rounder' },
  ];
}

// ---- Football (EPL + LaLiga) ----------------------------------------------

const FOOTBALL_FRANCHISES = FOOTBALL_CLUBS.map(c => c.code);

function footballIncrement(amount) {
  if (amount < 5) return 0.5;
  if (amount < 20) return 1;
  if (amount < 50) return 2.5;
  return 5;
}

function footballValuation(player) {
  // Keep magnitude comparable to cricket so the bot maxPrice formula behaves.
  let score = player.basePrice / 2;
  score += (player.rating || 6.5) * 6;          // quality
  score += (player.goals || 0) * 1.2;           // production
  score += (player.assists || 0) * 1.0;
  if (player.basePrice >= 45) score += 20;
  else if (player.basePrice >= 25) score += 12;
  else if (player.basePrice >= 12) score += 6;
  return score;
}

function footballSquadNeeds(team) {
  const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  (team || []).forEach(p => { if (counts[p.role] !== undefined) counts[p.role]++; });
  return [
    { key: 'gk', need: 1, have: counts.GK, match: p => p.role === 'GK' },
    { key: 'def', need: 4, have: counts.DEF, match: p => p.role === 'DEF' },
    { key: 'mid', need: 3, have: counts.MID, match: p => p.role === 'MID' },
    { key: 'fwd', need: 2, have: counts.FWD, match: p => p.role === 'FWD' },
  ];
}

// ---- Registry --------------------------------------------------------------

function buildSport(cfg) {
  return {
    ...cfg,
    // True if `player` fills an unmet squad requirement for `team`.
    isNeeded(team, player) {
      return cfg.squadNeeds(team).some(n => n.match(player) && n.have < n.need);
    },
  };
}

const SPORTS = {
  cricket: buildSport({
    id: 'cricket',
    label: 'IPL Cricket',
    players: ipl2026Players,
    franchises: CRICKET_FRANCHISES,
    defaultBudget: 100,
    increment: cricketIncrement,
    valuation: cricketValuation,
    squadNeeds: cricketSquadNeeds,
  }),
  football: buildSport({
    id: 'football',
    label: 'Football (EPL + LaLiga)',
    players: footballPlayers,
    franchises: FOOTBALL_FRANCHISES,
    defaultBudget: 300,
    increment: footballIncrement,
    valuation: footballValuation,
    squadNeeds: footballSquadNeeds,
  }),
};

function getSport(id) {
  return SPORTS[id] || SPORTS.cricket;
}

module.exports = { SPORTS, getSport };
