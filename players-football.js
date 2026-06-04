// ============================================================================
// Football starter dataset — EPL + LaLiga (curated)
// ----------------------------------------------------------------------------
// These are an illustrative starter pool for the football auction mode.
// Roster/values are approximate (2024-25 vibe) and meant to be tweaked freely.
// Base prices are in € millions and represent the AUCTION starting bid
// (intentionally lower than real market value so a squad fits inside a budget).
//
// Compact row format keeps this readable:
//   [id, name, club, role, position, nationality, basePrice, apps, goals, assists, rating, age]
//   role: GK | DEF | MID | FWD
// ============================================================================

const FOOTBALL_CLUBS = [
  // English Premier League
  { code: 'MCI', name: 'Manchester City', color: '#6caddf', league: 'EPL' },
  { code: 'ARS', name: 'Arsenal', color: '#ef0107', league: 'EPL' },
  { code: 'LIV', name: 'Liverpool', color: '#c8102e', league: 'EPL' },
  { code: 'MUN', name: 'Manchester United', color: '#da291c', league: 'EPL' },
  { code: 'CHE', name: 'Chelsea', color: '#034694', league: 'EPL' },
  { code: 'TOT', name: 'Tottenham Hotspur', color: '#132257', league: 'EPL' },
  { code: 'NEW', name: 'Newcastle United', color: '#241f20', league: 'EPL' },
  { code: 'AVL', name: 'Aston Villa', color: '#95bfe5', league: 'EPL' },
  // LaLiga
  { code: 'RMA', name: 'Real Madrid', color: '#febe10', league: 'LaLiga' },
  { code: 'BAR', name: 'FC Barcelona', color: '#a50044', league: 'LaLiga' },
  { code: 'ATM', name: 'Atlético Madrid', color: '#cb3524', league: 'LaLiga' },
  { code: 'ATH', name: 'Athletic Bilbao', color: '#ee2523', league: 'LaLiga' },
  { code: 'RSO', name: 'Real Sociedad', color: '#143c8b', league: 'LaLiga' },
  { code: 'VIL', name: 'Villarreal', color: '#ffe667', league: 'LaLiga' },
  { code: 'BET', name: 'Real Betis', color: '#00954c', league: 'LaLiga' },
  { code: 'SEV', name: 'Sevilla', color: '#d2122e', league: 'LaLiga' },
];

const ROWS = [
  // ---- Manchester City ----
  ['mci01', 'Erling Haaland', 'MCI', 'FWD', 'Striker', 'Norway', 60, 31, 27, 5, 8.6, 24],
  ['mci02', 'Kevin De Bruyne', 'MCI', 'MID', 'Attacking Mid', 'Belgium', 38, 26, 6, 12, 8.2, 33],
  ['mci03', 'Rodri', 'MCI', 'MID', 'Defensive Mid', 'Spain', 50, 28, 8, 7, 8.5, 28],
  ['mci04', 'Phil Foden', 'MCI', 'MID', 'Winger', 'England', 45, 35, 19, 8, 8.3, 24],
  ['mci05', 'Bernardo Silva', 'MCI', 'MID', 'Winger', 'Portugal', 32, 33, 8, 9, 7.9, 30],
  ['mci06', 'Rúben Dias', 'MCI', 'DEF', 'Centre-Back', 'Portugal', 34, 30, 1, 2, 8.0, 27],
  ['mci07', 'Joško Gvardiol', 'MCI', 'DEF', 'Left-Back', 'Croatia', 30, 32, 4, 3, 7.8, 22],
  ['mci08', 'Ederson', 'MCI', 'GK', 'Goalkeeper', 'Brazil', 22, 30, 0, 2, 7.6, 31],

  // ---- Arsenal ----
  ['ars01', 'Bukayo Saka', 'ARS', 'FWD', 'Winger', 'England', 48, 35, 16, 13, 8.4, 23],
  ['ars02', 'Martin Ødegaard', 'ARS', 'MID', 'Attacking Mid', 'Norway', 42, 35, 8, 10, 8.1, 25],
  ['ars03', 'Declan Rice', 'ARS', 'MID', 'Central Mid', 'England', 44, 38, 7, 9, 8.2, 25],
  ['ars04', 'William Saliba', 'ARS', 'DEF', 'Centre-Back', 'France', 40, 37, 2, 1, 8.1, 23],
  ['ars05', 'Gabriel Magalhães', 'ARS', 'DEF', 'Centre-Back', 'Brazil', 30, 36, 5, 1, 7.9, 26],
  ['ars06', 'Gabriel Martinelli', 'ARS', 'FWD', 'Winger', 'Brazil', 28, 33, 8, 6, 7.5, 23],
  ['ars07', 'Kai Havertz', 'ARS', 'FWD', 'Striker', 'Germany', 30, 37, 13, 7, 7.6, 25],
  ['ars08', 'David Raya', 'ARS', 'GK', 'Goalkeeper', 'Spain', 22, 38, 0, 1, 7.7, 28],

  // ---- Liverpool ----
  ['liv01', 'Mohamed Salah', 'LIV', 'FWD', 'Winger', 'Egypt', 50, 32, 18, 10, 8.5, 32],
  ['liv02', 'Virgil van Dijk', 'LIV', 'DEF', 'Centre-Back', 'Netherlands', 34, 36, 3, 1, 8.2, 33],
  ['liv03', 'Alisson', 'LIV', 'GK', 'Goalkeeper', 'Brazil', 28, 28, 0, 1, 7.9, 31],
  ['liv04', 'Alexis Mac Allister', 'LIV', 'MID', 'Central Mid', 'Argentina', 36, 33, 5, 6, 7.9, 25],
  ['liv05', 'Dominik Szoboszlai', 'LIV', 'MID', 'Attacking Mid', 'Hungary', 30, 34, 6, 4, 7.6, 24],
  ['liv06', 'Darwin Núñez', 'LIV', 'FWD', 'Striker', 'Uruguay', 28, 36, 11, 8, 7.3, 25],
  ['liv07', 'Andrew Robertson', 'LIV', 'DEF', 'Left-Back', 'Scotland', 22, 30, 1, 5, 7.5, 30],
  ['liv08', 'Cody Gakpo', 'LIV', 'FWD', 'Winger', 'Netherlands', 28, 34, 10, 5, 7.5, 25],

  // ---- Manchester United ----
  ['mun01', 'Bruno Fernandes', 'MUN', 'MID', 'Attacking Mid', 'Portugal', 40, 35, 10, 8, 8.0, 30],
  ['mun02', 'Marcus Rashford', 'MUN', 'FWD', 'Winger', 'England', 34, 33, 8, 5, 7.2, 27],
  ['mun03', 'Rasmus Højlund', 'MUN', 'FWD', 'Striker', 'Denmark', 28, 30, 10, 2, 7.0, 21],
  ['mun04', 'Casemiro', 'MUN', 'MID', 'Defensive Mid', 'Brazil', 22, 25, 3, 2, 7.0, 32],
  ['mun05', 'Lisandro Martínez', 'MUN', 'DEF', 'Centre-Back', 'Argentina', 30, 27, 1, 1, 7.6, 26],
  ['mun06', 'André Onana', 'MUN', 'GK', 'Goalkeeper', 'Cameroon', 22, 38, 0, 0, 7.3, 28],
  ['mun07', 'Alejandro Garnacho', 'MUN', 'FWD', 'Winger', 'Argentina', 28, 36, 7, 4, 7.2, 20],
  ['mun08', 'Kobbie Mainoo', 'MUN', 'MID', 'Central Mid', 'England', 26, 30, 3, 2, 7.3, 19],

  // ---- Chelsea ----
  ['che01', 'Cole Palmer', 'CHE', 'MID', 'Attacking Mid', 'England', 45, 34, 22, 11, 8.4, 22],
  ['che02', 'Enzo Fernández', 'CHE', 'MID', 'Central Mid', 'Argentina', 34, 33, 4, 7, 7.6, 23],
  ['che03', 'Moisés Caicedo', 'CHE', 'MID', 'Defensive Mid', 'Ecuador', 32, 35, 1, 3, 7.7, 22],
  ['che04', 'Nicolas Jackson', 'CHE', 'FWD', 'Striker', 'Senegal', 26, 30, 14, 5, 7.3, 23],
  ['che05', 'Reece James', 'CHE', 'DEF', 'Right-Back', 'England', 26, 18, 1, 3, 7.5, 24],
  ['che06', 'Marc Cucurella', 'CHE', 'DEF', 'Left-Back', 'Spain', 22, 32, 2, 4, 7.5, 26],
  ['che07', 'Robert Sánchez', 'CHE', 'GK', 'Goalkeeper', 'Spain', 16, 28, 0, 0, 7.0, 26],
  ['che08', 'Noni Madueke', 'CHE', 'FWD', 'Winger', 'England', 22, 30, 8, 4, 7.2, 22],

  // ---- Tottenham Hotspur ----
  ['tot01', 'Son Heung-min', 'TOT', 'FWD', 'Winger', 'South Korea', 38, 35, 17, 10, 8.0, 32],
  ['tot02', 'James Maddison', 'TOT', 'MID', 'Attacking Mid', 'England', 32, 33, 9, 9, 7.7, 27],
  ['tot03', 'Cristian Romero', 'TOT', 'DEF', 'Centre-Back', 'Argentina', 34, 30, 3, 2, 7.8, 26],
  ['tot04', 'Micky van de Ven', 'TOT', 'DEF', 'Centre-Back', 'Netherlands', 28, 26, 1, 1, 7.6, 23],
  ['tot05', 'Guglielmo Vicario', 'TOT', 'GK', 'Goalkeeper', 'Italy', 20, 36, 0, 0, 7.4, 28],
  ['tot06', 'Dejan Kulusevski', 'TOT', 'MID', 'Winger', 'Sweden', 28, 35, 8, 7, 7.5, 24],
  ['tot07', 'Yves Bissouma', 'TOT', 'MID', 'Defensive Mid', 'Mali', 18, 30, 1, 2, 7.2, 28],
  ['tot08', 'Dominic Solanke', 'TOT', 'FWD', 'Striker', 'England', 26, 38, 19, 3, 7.4, 27],

  // ---- Newcastle United ----
  ['new01', 'Alexander Isak', 'NEW', 'FWD', 'Striker', 'Sweden', 40, 30, 21, 2, 8.0, 25],
  ['new02', 'Bruno Guimarães', 'NEW', 'MID', 'Central Mid', 'Brazil', 38, 35, 7, 8, 7.9, 27],
  ['new03', 'Anthony Gordon', 'NEW', 'FWD', 'Winger', 'England', 32, 35, 11, 10, 7.7, 23],
  ['new04', 'Sandro Tonali', 'NEW', 'MID', 'Central Mid', 'Italy', 26, 20, 2, 3, 7.4, 24],
  ['new05', 'Sven Botman', 'NEW', 'DEF', 'Centre-Back', 'Netherlands', 26, 22, 1, 0, 7.5, 24],
  ['new06', 'Kieran Trippier', 'NEW', 'DEF', 'Right-Back', 'England', 18, 30, 1, 6, 7.3, 34],
  ['new07', 'Nick Pope', 'NEW', 'GK', 'Goalkeeper', 'England', 16, 28, 0, 0, 7.1, 32],
  ['new08', 'Joelinton', 'NEW', 'MID', 'Central Mid', 'Brazil', 22, 28, 5, 4, 7.4, 28],

  // ---- Aston Villa ----
  ['avl01', 'Ollie Watkins', 'AVL', 'FWD', 'Striker', 'England', 36, 37, 19, 13, 7.9, 28],
  ['avl02', 'John McGinn', 'AVL', 'MID', 'Central Mid', 'Scotland', 22, 36, 6, 5, 7.4, 29],
  ['avl03', 'Leon Bailey', 'AVL', 'FWD', 'Winger', 'Jamaica', 24, 35, 10, 9, 7.4, 26],
  ['avl04', 'Emiliano Martínez', 'AVL', 'GK', 'Goalkeeper', 'Argentina', 24, 36, 0, 0, 7.6, 31],
  ['avl05', 'Ezri Konsa', 'AVL', 'DEF', 'Centre-Back', 'England', 22, 35, 3, 1, 7.4, 26],
  ['avl06', 'Youri Tielemans', 'AVL', 'MID', 'Central Mid', 'Belgium', 22, 34, 4, 6, 7.3, 27],
  ['avl07', 'Lucas Digne', 'AVL', 'DEF', 'Left-Back', 'France', 16, 33, 1, 4, 7.1, 30],
  ['avl08', 'Morgan Rogers', 'AVL', 'MID', 'Attacking Mid', 'England', 20, 30, 6, 5, 7.3, 22],

  // ---- Real Madrid ----
  ['rma01', 'Kylian Mbappé', 'RMA', 'FWD', 'Striker', 'France', 60, 34, 27, 6, 8.6, 25],
  ['rma02', 'Vinícius Júnior', 'RMA', 'FWD', 'Winger', 'Brazil', 55, 31, 18, 9, 8.5, 24],
  ['rma03', 'Jude Bellingham', 'RMA', 'MID', 'Attacking Mid', 'England', 55, 33, 19, 8, 8.6, 21],
  ['rma04', 'Rodrygo', 'RMA', 'FWD', 'Winger', 'Brazil', 42, 35, 14, 9, 8.0, 23],
  ['rma05', 'Federico Valverde', 'RMA', 'MID', 'Central Mid', 'Uruguay', 44, 37, 7, 6, 8.1, 26],
  ['rma06', 'Aurélien Tchouaméni', 'RMA', 'MID', 'Defensive Mid', 'France', 38, 33, 2, 2, 7.8, 24],
  ['rma07', 'Antonio Rüdiger', 'RMA', 'DEF', 'Centre-Back', 'Germany', 30, 34, 3, 1, 7.9, 31],
  ['rma08', 'Thibaut Courtois', 'RMA', 'GK', 'Goalkeeper', 'Belgium', 28, 20, 0, 0, 7.9, 32],

  // ---- FC Barcelona ----
  ['bar01', 'Robert Lewandowski', 'BAR', 'FWD', 'Striker', 'Poland', 38, 35, 25, 5, 8.2, 36],
  ['bar02', 'Lamine Yamal', 'BAR', 'FWD', 'Winger', 'Spain', 50, 37, 9, 13, 8.3, 17],
  ['bar03', 'Pedri', 'BAR', 'MID', 'Central Mid', 'Spain', 44, 30, 4, 6, 8.1, 21],
  ['bar04', 'Raphinha', 'BAR', 'FWD', 'Winger', 'Brazil', 36, 35, 13, 12, 8.0, 27],
  ['bar05', 'Frenkie de Jong', 'BAR', 'MID', 'Central Mid', 'Netherlands', 38, 26, 2, 3, 7.8, 27],
  ['bar06', 'Gavi', 'BAR', 'MID', 'Central Mid', 'Spain', 36, 20, 2, 3, 7.6, 20],
  ['bar07', 'Pau Cubarsí', 'BAR', 'DEF', 'Centre-Back', 'Spain', 30, 28, 1, 1, 7.7, 17],
  ['bar08', 'Marc-André ter Stegen', 'BAR', 'GK', 'Goalkeeper', 'Germany', 24, 18, 0, 1, 7.6, 32],

  // ---- Atlético Madrid ----
  ['atm01', 'Antoine Griezmann', 'ATM', 'FWD', 'Forward', 'France', 38, 36, 16, 8, 8.0, 33],
  ['atm02', 'Julián Álvarez', 'ATM', 'FWD', 'Striker', 'Argentina', 42, 36, 17, 6, 7.9, 24],
  ['atm03', 'Jan Oblak', 'ATM', 'GK', 'Goalkeeper', 'Slovenia', 26, 32, 0, 0, 7.7, 31],
  ['atm04', 'Koke', 'ATM', 'MID', 'Central Mid', 'Spain', 18, 34, 2, 5, 7.3, 32],
  ['atm05', 'Rodrigo De Paul', 'ATM', 'MID', 'Central Mid', 'Argentina', 28, 35, 4, 7, 7.6, 30],
  ['atm06', 'Marcos Llorente', 'ATM', 'MID', 'Central Mid', 'Spain', 26, 34, 5, 4, 7.5, 29],
  ['atm07', 'José Giménez', 'ATM', 'DEF', 'Centre-Back', 'Uruguay', 24, 28, 2, 1, 7.6, 29],
  ['atm08', 'Samuel Lino', 'ATM', 'FWD', 'Winger', 'Brazil', 24, 33, 7, 5, 7.4, 24],

  // ---- Athletic Bilbao ----
  ['ath01', 'Nico Williams', 'ATH', 'FWD', 'Winger', 'Spain', 40, 34, 11, 9, 7.9, 22],
  ['ath02', 'Iñaki Williams', 'ATH', 'FWD', 'Striker', 'Ghana', 26, 37, 10, 7, 7.6, 30],
  ['ath03', 'Oihan Sancet', 'ATH', 'MID', 'Attacking Mid', 'Spain', 28, 33, 12, 4, 7.6, 24],
  ['ath04', 'Dani Vivian', 'ATH', 'DEF', 'Centre-Back', 'Spain', 24, 35, 3, 1, 7.5, 24],
  ['ath05', 'Unai Simón', 'ATH', 'GK', 'Goalkeeper', 'Spain', 22, 34, 0, 0, 7.5, 27],
  ['ath06', 'Álex Berenguer', 'ATH', 'MID', 'Winger', 'Spain', 18, 36, 8, 6, 7.4, 28],
  ['ath07', 'Gorka Guruzeta', 'ATH', 'FWD', 'Striker', 'Spain', 16, 35, 12, 2, 7.3, 28],
  ['ath08', 'Mikel Jauregizar', 'ATH', 'MID', 'Defensive Mid', 'Spain', 14, 30, 1, 2, 7.1, 21],

  // ---- Real Sociedad ----
  ['rso01', 'Mikel Oyarzabal', 'RSO', 'FWD', 'Forward', 'Spain', 30, 35, 14, 5, 7.7, 27],
  ['rso02', 'Takefusa Kubo', 'RSO', 'MID', 'Winger', 'Japan', 32, 34, 7, 6, 7.6, 23],
  ['rso03', 'Martín Zubimendi', 'RSO', 'MID', 'Defensive Mid', 'Spain', 36, 33, 2, 3, 7.8, 25],
  ['rso04', 'Robin Le Normand', 'RSO', 'DEF', 'Centre-Back', 'Spain', 26, 30, 2, 1, 7.6, 27],
  ['rso05', 'Álex Remiro', 'RSO', 'GK', 'Goalkeeper', 'Spain', 22, 36, 0, 0, 7.5, 29],
  ['rso06', 'Brais Méndez', 'RSO', 'MID', 'Attacking Mid', 'Spain', 24, 34, 8, 7, 7.5, 27],
  ['rso07', 'Aritz Elustondo', 'RSO', 'DEF', 'Centre-Back', 'Spain', 12, 28, 1, 0, 7.0, 30],
  ['rso08', 'Sheraldo Becker', 'RSO', 'FWD', 'Winger', 'Suriname', 16, 30, 6, 4, 7.2, 29],

  // ---- Villarreal ----
  ['vil01', 'Alexander Sørloth', 'VIL', 'FWD', 'Striker', 'Norway', 28, 34, 19, 4, 7.7, 28],
  ['vil02', 'Yeremy Pino', 'VIL', 'FWD', 'Winger', 'Spain', 26, 33, 8, 6, 7.5, 21],
  ['vil03', 'Dani Parejo', 'VIL', 'MID', 'Central Mid', 'Spain', 20, 34, 5, 8, 7.5, 35],
  ['vil04', 'Álex Baena', 'VIL', 'MID', 'Attacking Mid', 'Spain', 30, 35, 8, 11, 7.7, 23],
  ['vil05', 'Gerard Moreno', 'VIL', 'FWD', 'Forward', 'Spain', 20, 28, 11, 5, 7.4, 32],
  ['vil06', 'Raúl Albiol', 'VIL', 'DEF', 'Centre-Back', 'Spain', 8, 30, 1, 0, 7.0, 39],
  ['vil07', 'Juan Foyth', 'VIL', 'DEF', 'Right-Back', 'Argentina', 20, 28, 1, 2, 7.3, 26],
  ['vil08', 'Diego Conde', 'VIL', 'GK', 'Goalkeeper', 'Spain', 10, 28, 0, 0, 7.0, 26],

  // ---- Real Betis ----
  ['bet01', 'Isco', 'BET', 'MID', 'Attacking Mid', 'Spain', 22, 30, 8, 9, 7.7, 32],
  ['bet02', 'Nabil Fekir', 'BET', 'MID', 'Attacking Mid', 'France', 22, 28, 6, 7, 7.5, 31],
  ['bet03', 'Giovani Lo Celso', 'BET', 'MID', 'Central Mid', 'Argentina', 22, 32, 5, 6, 7.4, 28],
  ['bet04', 'Marc Bartra', 'BET', 'DEF', 'Centre-Back', 'Spain', 12, 30, 2, 1, 7.2, 33],
  ['bet05', 'Rui Silva', 'BET', 'GK', 'Goalkeeper', 'Portugal', 14, 34, 0, 0, 7.2, 30],
  ['bet06', 'Vitor Roque', 'BET', 'FWD', 'Striker', 'Brazil', 22, 30, 8, 3, 7.3, 19],
  ['bet07', 'Abde Ezzalzouli', 'BET', 'FWD', 'Winger', 'Morocco', 20, 33, 6, 5, 7.3, 22],
  ['bet08', 'Héctor Bellerín', 'BET', 'DEF', 'Right-Back', 'Spain', 12, 30, 1, 4, 7.2, 29],

  // ---- Sevilla ----
  ['sev01', 'Dodi Lukebakio', 'SEV', 'FWD', 'Winger', 'Belgium', 24, 35, 11, 5, 7.4, 26],
  ['sev02', 'Saúl Ñíguez', 'SEV', 'MID', 'Central Mid', 'Spain', 14, 30, 3, 3, 7.1, 29],
  ['sev03', 'Jesús Navas', 'SEV', 'DEF', 'Right-Back', 'Spain', 8, 28, 0, 3, 7.0, 38],
  ['sev04', 'Ørjan Nyland', 'SEV', 'GK', 'Goalkeeper', 'Norway', 10, 30, 0, 0, 7.0, 33],
  ['sev05', 'Loïc Badé', 'SEV', 'DEF', 'Centre-Back', 'France', 20, 32, 2, 1, 7.4, 24],
  ['sev06', 'Djibril Sow', 'SEV', 'MID', 'Central Mid', 'Switzerland', 16, 30, 2, 2, 7.2, 27],
  ['sev07', 'Kelechi Iheanacho', 'SEV', 'FWD', 'Striker', 'Nigeria', 14, 26, 6, 2, 7.1, 27],
  ['sev08', 'Suso', 'SEV', 'MID', 'Winger', 'Spain', 14, 30, 5, 6, 7.2, 30],

  // ---- Global Icons (household names from other leagues) ----
  ['ico01', 'Lionel Messi', 'MIA', 'FWD', 'Forward', 'Argentina', 48, 29, 24, 16, 8.7, 37],
  ['ico02', 'Cristiano Ronaldo', 'NAS', 'FWD', 'Striker', 'Portugal', 42, 32, 30, 6, 8.3, 40],
  ['ico03', 'Neymar Jr', 'SAN', 'FWD', 'Winger', 'Brazil', 34, 16, 8, 10, 7.9, 33],
  ['ico04', 'Harry Kane', 'BAY', 'FWD', 'Striker', 'England', 56, 34, 38, 9, 8.7, 31],
  ['ico05', 'Karim Benzema', 'ITT', 'FWD', 'Striker', 'France', 32, 30, 22, 7, 7.9, 37],
  ['ico06', 'Ousmane Dembélé', 'PSG', 'FWD', 'Winger', 'France', 40, 33, 23, 10, 8.3, 27],
  ['ico07', 'Achraf Hakimi', 'PSG', 'DEF', 'Right-Back', 'Morocco', 32, 34, 6, 9, 7.9, 26],
  ['ico08', 'Lautaro Martínez', 'INT', 'FWD', 'Striker', 'Argentina', 40, 33, 22, 6, 8.0, 27],
  ['ico09', 'Rafael Leão', 'MIL', 'FWD', 'Winger', 'Portugal', 36, 34, 14, 10, 7.8, 25],
  ['ico10', 'Victor Osimhen', 'GAL', 'FWD', 'Striker', 'Nigeria', 38, 30, 24, 5, 8.0, 26],
  ['ico11', 'Khvicha Kvaratskhelia', 'PSG', 'FWD', 'Winger', 'Georgia', 38, 32, 13, 11, 8.1, 24],
  ['ico12', 'Dušan Vlahović', 'JUV', 'FWD', 'Striker', 'Serbia', 34, 33, 18, 4, 7.7, 25],
];

// Real headshots fetched once via scripts/fetch-football-images.mjs (TheSportsDB).
// Any player not in the map falls back to a generated initials avatar.
let IMAGE_MAP = {};
try { IMAGE_MAP = require('./football-images.json'); } catch { IMAGE_MAP = {}; }

function makePlayer(row) {
  const [id, name, team, role, position, nationality, basePrice, appearances, goals, assists, rating, age] = row;
  return {
    id,
    name,
    team,            // club code (hidden franchise vibe, parallels cricket "team")
    role,            // GK | DEF | MID | FWD
    position,
    nationality,
    basePrice,       // € millions (auction starting bid)
    appearances,
    goals,
    assists,
    rating,          // average match rating 0-10
    age,
    image: IMAGE_MAP[id] || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0d1b2a&color=ffffff&size=128&bold=true`,
  };
}

const footballPlayers = ROWS.map(makePlayer);

module.exports = { footballPlayers, FOOTBALL_CLUBS };
