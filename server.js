require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { ipl2026Players } = require('./players');
const { getSport } = require('./sports');

const BOT_NAMES = [
  'Bot-Alpha', 'Bot-Beta', 'Bot-Gamma', 'Bot-Delta', 'Bot-Epsilon',
  'Bot-Zeta', 'Bot-Eta', 'Bot-Theta', 'Bot-Iota', 'Bot-Kappa'
];

function getBotName(usedNames) {
  for (const name of BOT_NAMES) {
    if (!usedNames.includes(name)) return name;
  }
  return `Bot-${Math.floor(Math.random() * 1000)}`;
}

function shouldBotBid(bot, player, currentBid, room) {
  const sport = getSport(room.settings.sport);
  const needed = sport.isNeeded(bot.team, player);

  const value = sport.valuation(player);
  const needBonus = needed ? 1.5 : 1.0;
  const randomFactor = 0.7 + Math.random() * 0.6;
  const maxPrice = parseFloat((player.basePrice * needBonus * randomFactor * (1 + value / 100)).toFixed(2));
  const cappedMax = Math.min(maxPrice, bot.budget * 0.4);

  if (bot.team.length >= room.settings.squadSize) return { shouldBid: false };
  if (currentBid >= cappedMax) return { shouldBid: false };
  if (bot.budget <= currentBid) return { shouldBid: false };

  const increment = sport.increment(currentBid);
  const nextBid = parseFloat((Math.max(currentBid, player.basePrice) + increment).toFixed(2));
  if (nextBid > cappedMax || nextBid > bot.budget) return { shouldBid: false };

  return { shouldBid: true, amount: nextBid };
}

function runBotBids(roomCode) {
  const room = rooms[roomCode];
  if (!room || !room.currentPlayer || room.status !== 'auctioning') return;

  const bots = room.players.filter(p => p.isBot && p.connected && p.team.length < room.settings.squadSize);
  if (bots.length === 0) return;

  const currentAmount = room.currentBid > 0 ? room.currentBid : room.currentPlayer.basePrice;

  bots.forEach(bot => {
    const result = shouldBotBid(bot, room.currentPlayer, currentAmount, room);
    if (result.shouldBid) {
      const delay = 500 + Math.random() * 2500;
      setTimeout(() => {
        const freshRoom = rooms[roomCode];
        if (!freshRoom || freshRoom.status !== 'auctioning' || !freshRoom.currentPlayer || freshRoom.currentPlayer.id !== room.currentPlayer.id) return;
        if (freshRoom.currentBidder === bot.id) return;

        const freshCurrent = freshRoom.currentBid > 0 ? freshRoom.currentBid : freshRoom.currentPlayer.basePrice;
        const freshResult = shouldBotBid(bot, freshRoom.currentPlayer, freshCurrent, freshRoom);
        if (!freshResult.shouldBid) return;

        const increment = getSport(freshRoom.settings.sport).increment(freshCurrent);
        const minBid = parseFloat((freshCurrent + increment).toFixed(2));
        const bidAmount = Math.max(freshResult.amount, minBid);

        if (bidAmount > bot.budget || bidAmount <= freshCurrent) return;

        freshRoom.currentBid = bidAmount;
        freshRoom.currentBidder = bot.id;
        clearInterval(freshRoom.timerInterval);
        freshRoom.timer = freshRoom.settings.bidTimer;

        io.to(roomCode).emit('bid-placed', {
          bidderId: bot.id,
          bidderName: bot.name,
          amount: bidAmount,
          botBid: true,
          room: getRoomState(roomCode)
        });

        startTimer(roomCode);
        setTimeout(() => processAutoBids(roomCode), 800);
        setTimeout(() => runBotBids(roomCode), 1200);
      }, delay);
    }
  });
}

const app = express();
const server = http.createServer(app);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Allow multiple origins for dev + prod + dev tunnels
const ALLOWED_ORIGINS = [CLIENT_URL];
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    // Configured / production origin
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    // Allow any localhost / 127.0.0.1 port during local dev (5173, 3000, …)
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // Allow Dev Tunnels (*.devtunnels.ms) for local testing
    if (origin.endsWith('.devtunnels.ms')) {
      return callback(null, true);
    }
    console.log('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ["GET", "POST"]
};

const io = new Server(server, {
  cors: corsOptions
});

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'IPL 2026 Auction Server',
    serverUrl: `http://${req.headers.host}`,
    clientUrl: CLIENT_URL,
    players: ipl2026Players.length,
    activeRooms: Object.keys(rooms).length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// In-memory game storage
const rooms = {};

function generateRoomCode() {
  return 'IPL-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ---- Memory safety + abuse guards (tuned for a small single-instance host) --
const MAX_ROOMS = 80;                  // refuse new rooms past this to avoid OOM
const HUMAN_GRACE_MS = 2 * 60 * 1000;  // delete a room this long after the last human leaves
const IDLE_TTL_MS = 30 * 60 * 1000;    // delete a room idle (no activity) this long
const SWEEP_MS = 60 * 1000;            // how often the janitor runs

// Always clear the per-room timer when removing a room, or its setInterval leaks.
function destroyRoom(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  clearInterval(room.timerInterval);
  delete rooms[roomCode];
}

// Bots are always "connected", so cleanup must count HUMANS, not players.
function connectedHumans(room) {
  return room.players.filter(p => p.connected && !p.isBot).length;
}

function touch(room) {
  if (room) room.lastActivity = Date.now();
}

// Per-socket lightweight rate limiter — true if this event arrived too soon.
function tooFast(socket, key, ms) {
  socket._rl = socket._rl || {};
  const now = Date.now();
  if (socket._rl[key] && now - socket._rl[key] < ms) return true;
  socket._rl[key] = now;
  return false;
}

// Input sanitisers (a tampered client must not be able to send junk).
function cleanStr(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
function clampInt(v, min, max, dflt) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

// Janitor: reclaim abandoned (bots-only / everyone left) and idle rooms + timers.
setInterval(() => {
  const now = Date.now();
  for (const code in rooms) {
    const room = rooms[code];
    if (connectedHumans(room) === 0) {
      room.emptySince = room.emptySince || now;
      if (now - room.emptySince > HUMAN_GRACE_MS) destroyRoom(code);
    } else {
      room.emptySince = null;
      if (now - (room.lastActivity || now) > IDLE_TTL_MS) destroyRoom(code);
    }
  }
}, SWEEP_MS);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create Room
  socket.on('create-room', ({ hostName, settings }) => {
    if (Object.keys(rooms).length >= MAX_ROOMS) {
      socket.emit('error', { message: 'Server is busy — too many active rooms. Please try again shortly.' });
      return;
    }
    settings = settings || {};
    const hostNameClean = cleanStr(hostName, 20) || 'Host';
    const roomCode = generateRoomCode();
    const roomId = uuidv4();

    // Resolve the chosen sport pack (defaults to cricket).
    const sport = getSport(settings.sport);
    const sportPool = sport.players;

    // Sanitise/clamp settings so a tampered client can't set absurd values.
    const budget = clampInt(settings.budget, 10, 1000, sport.defaultBudget);
    const squadSize = clampInt(settings.squadSize, 5, 25, 11);
    const bidTimer = clampInt(settings.bidTimer, 3, 60, 15);
    // Only accept a franchise that belongs to this sport.
    const hostFranchiseRaw = cleanStr(settings.franchise, 8);
    const hostFranchise = sport.franchises.includes(hostFranchiseRaw) ? hostFranchiseRaw : null;

    // Honor the requested pool size: shuffle, then take the first N players.
    const poolLimit = settings.maxPlayers && settings.maxPlayers > 0
      ? clampInt(settings.maxPlayers, 1, sportPool.length, sportPool.length)
      : sportPool.length;
    const availablePlayers = shuffleArray(sportPool).slice(0, poolLimit);

    rooms[roomCode] = {
      id: roomId,
      code: roomCode,
      hostId: socket.id,
      players: [{
        id: socket.id,
        name: hostNameClean,
        isHost: true,
        franchise: hostFranchise,
        budget,
        team: [],
        spent: 0,
        connected: true
      }],
      settings: {
        sport: sport.id,
        budget,
        squadSize,
        bidTimer,
        maxPlayers: poolLimit
      },
      availablePlayers: availablePlayers,
      bidHistory: [],
      soldPlayers: [],
      unsoldPlayers: [],
      // Send the full player record so the client can render whichever sport's
      // stats apply (cricket batting/bowling, football goals/assists, etc.).
      allPlayers: availablePlayers.map(p => ({ ...p, status: 'available' })),
      currentPlayerIndex: -1,
      currentPlayer: null,
      currentBid: 0,
      currentBidder: null,
      status: 'waiting', // waiting, auctioning, paused, ended
      timer: null,
      timerInterval: null,
      chat: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      emptySince: null
    };

    socket.join(roomCode);
    // AI bots are disabled — rooms are human-only.

    socket.emit('room-created', { roomCode, room: getRoomState(roomCode) });
  });

  // Join Room
  socket.on('join-room', ({ roomCode, playerName, franchise }) => {
    const room = rooms[typeof roomCode === 'string' ? roomCode : ''];
    if (!room) {
      socket.emit('error', { message: 'Room not found!' });
      return;
    }
    const nameClean = cleanStr(playerName, 20);
    const frRaw = cleanStr(franchise, 8);
    const franchiseClean = getSport(room.settings.sport).franchises.includes(frRaw) ? frRaw : null;
    if (!nameClean) {
      socket.emit('error', { message: 'Please enter a valid name.' });
      return;
    }

    // Check if this is a reconnection (same name, previously disconnected)
    const disconnectedPlayer = room.players.find(p => p.name === nameClean && !p.connected);
    if (disconnectedPlayer) {
      disconnectedPlayer.id = socket.id;
      disconnectedPlayer.connected = true;
      room.emptySince = null;
      touch(room);
      socket.join(roomCode);
      socket.emit('joined-room', { roomCode, room: getRoomState(roomCode), playerId: socket.id });
      socket.to(roomCode).emit('player-joined', { player: disconnectedPlayer, room: getRoomState(roomCode) });
      return;
    }

    // New player joining
    if (room.status !== 'waiting') {
      socket.emit('error', { message: 'Auction already started!' });
      return;
    }
    if (room.players.filter(p => p.connected).length >= 10) {
      socket.emit('error', { message: 'Room is full (max 10 players)!' });
      return;
    }
    if (room.players.find(p => p.name === nameClean)) {
      socket.emit('error', { message: 'Name already taken in this room!' });
      return;
    }

    const newPlayer = {
      id: socket.id,
      name: nameClean,
      isHost: false,
      isBot: false,
      franchise: franchiseClean,
      budget: room.settings.budget,
      team: [],
      spent: 0,
      connected: true,
      autoBid: { enabled: false, maxPrice: 0 }
    };
    room.players.push(newPlayer);
    room.emptySince = null;
    touch(room);
    socket.join(roomCode);

    socket.emit('joined-room', { roomCode, room: getRoomState(roomCode), playerId: socket.id });
    socket.to(roomCode).emit('player-joined', { player: newPlayer, room: getRoomState(roomCode) });
  });

  // AI bots are disabled — add-bot / remove-bot handlers removed.

  // Start Auction
  socket.on('start-auction', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;
    if (room.players.filter(p => p.connected && !p.isBot).length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start the auction!' });
      return;
    }

    room.status = 'auctioning';
    room.currentPlayerIndex = 0;
    startNewAuction(roomCode);
    io.to(roomCode).emit('auction-started', { room: getRoomState(roomCode) });
  });

  // Place Bid
  socket.on('place-bid', ({ roomCode, amount }) => {
    if (tooFast(socket, 'bid', 150)) return; // throttle bid spam
    const room = rooms[roomCode];
    if (!room || room.status !== 'auctioning') return;
    if (!room.currentPlayer) return;
    if (!Number.isFinite(amount) || amount <= 0) return; // reject junk amounts

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.connected) return;

    // Prevent same bidder from bidding twice in a row
    if (room.currentBidder === socket.id) {
      socket.emit('error', { message: 'Wait for someone else to bid!' });
      return;
    }

    // Calculate minimum bid based on the sport's increment slabs
    const currentAmount = room.currentBid > 0 ? room.currentBid : room.currentPlayer.basePrice;
    const increment = getSport(room.settings.sport).increment(currentAmount);
    const minBid = parseFloat((currentAmount + increment).toFixed(2));
    if (amount < minBid) {
      socket.emit('error', { message: `Minimum bid is ₹${minBid} Cr` });
      return;
    }
    if (amount > player.budget) {
      socket.emit('error', { message: 'Not enough budget!' });
      return;
    }
    if (player.team.length >= room.settings.squadSize) {
      socket.emit('error', { message: 'Squad is full!' });
      return;
    }

    room.currentBid = amount;
    room.currentBidder = player.id;
    touch(room);

    // Add to bid history
    room.bidHistory.push({
      playerId: room.currentPlayer.id,
      playerName: room.currentPlayer.name,
      bidderName: player.name,
      bidderId: player.id,
      amount,
      timestamp: Date.now()
    });
    
    // Reset timer
    clearInterval(room.timerInterval);
    room.timer = room.settings.bidTimer;
    
    io.to(roomCode).emit('bid-placed', {
      bidderId: player.id,
      bidderName: player.name,
      amount,
      room: getRoomState(roomCode)
    });

    startTimer(roomCode);

    // Trigger auto-bids and bot bids
    setTimeout(() => {
      processAutoBids(roomCode);
    }, 800);
    setTimeout(() => {
      runBotBids(roomCode);
    }, 1000);
  });

  // Pass Player
  socket.on('pass-player', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.status !== 'auctioning') return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    // Mark player as passed (they won't auto-bid)
    io.to(roomCode).emit('player-passed', { playerId: socket.id, playerName: player.name });
  });

  // Pause/Resume Auction
  socket.on('toggle-pause', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;

    if (room.status === 'auctioning') {
      room.status = 'paused';
      clearInterval(room.timerInterval);
      io.to(roomCode).emit('auction-paused', { room: getRoomState(roomCode) });
    } else if (room.status === 'paused') {
      room.status = 'auctioning';
      startTimer(roomCode);
      io.to(roomCode).emit('auction-resumed', { room: getRoomState(roomCode) });
    }
  });

  // Toggle Auto Bid
  socket.on('toggle-auto-bid', ({ roomCode, enabled, maxPrice }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.autoBid = { enabled, maxPrice: parseFloat(maxPrice) || 0 };
    io.to(roomCode).emit('auto-bid-updated', { 
      playerId: socket.id, 
      autoBid: player.autoBid,
      room: getRoomState(roomCode) 
    });
  });

  // Reaction Emojis
  socket.on('send-reaction', ({ roomCode, emoji }) => {
    if (tooFast(socket, 'reaction', 300)) return;
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    const emojiClean = cleanStr(emoji, 8);
    if (!emojiClean) return;

    io.to(roomCode).emit('new-reaction', {
      playerName: player.name,
      emoji: emojiClean,
      timestamp: Date.now()
    });
  });

  // Chat Message
  socket.on('send-chat', ({ roomCode, message }) => {
    if (tooFast(socket, 'chat', 500)) return;
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    const text = cleanStr(message, 200);
    if (!text) return;

    const chatMsg = {
      id: uuidv4(),
      playerName: player.name,
      message: text,
      timestamp: Date.now()
    };
    room.chat.push(chatMsg);
    if (room.chat.length > 50) room.chat.shift();
    touch(room);

    io.to(roomCode).emit('new-chat', { chatMsg, room: getRoomState(roomCode) });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.connected = false;
        io.to(roomCode).emit('player-disconnected', { playerId: socket.id, room: getRoomState(roomCode) });
        
        // If host disconnects, hand host to another connected human (not a bot)
        if (player.isHost) {
          const newHost = room.players.find(p => p.connected && !p.isBot);
          if (newHost) {
            newHost.isHost = true;
            room.hostId = newHost.id;
            io.to(roomCode).emit('new-host', { hostId: newHost.id, room: getRoomState(roomCode) });
          }
        }

        // Mark when the room went human-less; the janitor reclaims it after a grace
        // period (a bots-only room counts as empty, so it can no longer leak).
        if (connectedHumans(room) === 0) {
          room.emptySince = room.emptySince || Date.now();
        }
      }
    }
  });
});

function processAutoBids(roomCode, depth = 0) {
  const room = rooms[roomCode];
  if (!room || room.status !== 'auctioning' || !room.currentPlayer || depth > 5) return;

  const currentAmount = room.currentBid > 0 ? room.currentBid : room.currentPlayer.basePrice;
  const increment = getSport(room.settings.sport).increment(currentAmount);
  const nextBid = parseFloat((currentAmount + increment).toFixed(2));

  // Find auto-bidders who should bid
  const autoBidders = room.players.filter(p => 
    p.id !== room.currentBidder &&
    p.connected &&
    p.autoBid &&
    p.autoBid.enabled &&
    p.autoBid.maxPrice >= nextBid &&
    p.budget >= nextBid &&
    p.team.length < room.settings.squadSize
  );

  if (autoBidders.length === 0) return;

  // Pick the auto-bidder with highest maxPrice (most aggressive)
  const bidder = autoBidders.sort((a, b) => b.autoBid.maxPrice - a.autoBid.maxPrice)[0];

  // Place bid for them
  room.currentBid = nextBid;
  room.currentBidder = bidder.id;
  clearInterval(room.timerInterval);
  room.timer = room.settings.bidTimer;

  io.to(roomCode).emit('bid-placed', {
    bidderId: bidder.id,
    bidderName: bidder.name,
    amount: nextBid,
    autoBid: true,
    room: getRoomState(roomCode)
  });

  startTimer(roomCode);

  // Chain reaction - check if another auto-bidder should respond
  setTimeout(() => {
    processAutoBids(roomCode, depth + 1);
  }, 1000);
}

function updatePlayerStatus(roomCode, playerId, status, soldTo, soldPrice) {
  const room = rooms[roomCode];
  if (!room || !room.allPlayers) return;
  const p = room.allPlayers.find(ap => ap.id === playerId);
  if (p) {
    p.status = status;
    if (soldTo) p.soldTo = soldTo;
    if (soldPrice) p.soldPrice = soldPrice;
  }
}

function getRoomState(roomCode) {
  const room = rooms[roomCode];
  if (!room) return null;
  
  return {
    code: room.code,
    hostId: room.hostId,
    allPlayers: room.allPlayers || [],
    bidHistory: room.bidHistory || [],
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isBot: p.isBot || false,
      franchise: p.franchise || null,
      budget: p.budget,
      team: p.team,
      spent: p.spent,
      connected: p.connected,
      teamSize: p.team.length,
      autoBid: p.autoBid
    })),
    settings: room.settings,
    status: room.status,
    currentPlayer: room.currentPlayer,
    currentBid: room.currentBid,
    currentBidder: room.currentBidder ? room.players.find(p => p.id === room.currentBidder)?.name || null : null,
    currentBidderId: room.currentBidder,
    timer: room.timer,
    totalPlayers: room.availablePlayers.length,
    soldCount: room.soldPlayers.length,
    unsoldCount: room.unsoldPlayers.length,
    remainingCount: room.availablePlayers.length - room.currentPlayerIndex - 1,
    chat: room.chat
  };
}

function startNewAuction(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  if (room.currentPlayerIndex >= room.availablePlayers.length) {
    endAuction(roomCode);
    return;
  }

  room.currentPlayer = room.availablePlayers[room.currentPlayerIndex];
  room.currentBid = 0;
  room.currentBidder = null;
  room.timer = room.settings.bidTimer;
  room.bidHistory = []; // Reset bid history for new player
  touch(room);
  
  if (room.currentPlayer) {
    updatePlayerStatus(roomCode, room.currentPlayer.id, 'current');
  }

  io.to(roomCode).emit('new-player', { room: getRoomState(roomCode) });
  startTimer(roomCode);

  // Trigger bot bids for new player
  setTimeout(() => {
    runBotBids(roomCode);
  }, 1500);
}

function startTimer(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  clearInterval(room.timerInterval);
  room.timerInterval = setInterval(() => {
    room.timer--;
    io.to(roomCode).emit('timer-update', { timer: room.timer });

    if (room.timer <= 0) {
      clearInterval(room.timerInterval);
      finalizeBid(roomCode);
    }
  }, 1000);
}

function finalizeBid(roomCode) {
  const room = rooms[roomCode];
  if (!room || !room.currentPlayer) return;

  if (room.currentBidder) {
    // Player sold
    const winner = room.players.find(p => p.id === room.currentBidder);
    if (winner) {
      winner.team.push({
        ...room.currentPlayer,
        soldPrice: room.currentBid
      });
      winner.budget -= room.currentBid;
      winner.spent += room.currentBid;
      room.soldPlayers.push({
        player: room.currentPlayer,
        soldTo: winner.id,
        soldToName: winner.name,
        soldPrice: room.currentBid
      });
      
      updatePlayerStatus(roomCode, room.currentPlayer.id, 'sold', winner.name, room.currentBid);

      io.to(roomCode).emit('player-sold', {
        player: room.currentPlayer,
        winnerName: winner.name,
        winnerId: winner.id,
        price: room.currentBid,
        room: getRoomState(roomCode)
      });
    }
  } else {
    // Player unsold
    room.unsoldPlayers.push(room.currentPlayer);
    updatePlayerStatus(roomCode, room.currentPlayer.id, 'unsold');
    io.to(roomCode).emit('player-unsold', {
      player: room.currentPlayer,
      room: getRoomState(roomCode)
    });
  }

  // Delay before next player
  setTimeout(() => {
    moveToNextPlayer(roomCode);
  }, 3000);
}

function moveToNextPlayer(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  room.currentPlayerIndex++;
  
  if (room.currentPlayerIndex >= room.availablePlayers.length) {
    endAuction(roomCode);
  } else {
    startNewAuction(roomCode);
  }
}

function endAuction(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  room.status = 'ended';
  clearInterval(room.timerInterval);
  
  // Calculate rankings
  const rankings = [...room.players]
    .sort((a, b) => b.team.length - a.team.length || b.spent - a.spent)
    .map((p, i) => ({
      rank: i + 1,
      name: p.name,
      teamSize: p.team.length,
      spent: p.spent,
      remaining: p.budget
    }));

  io.to(roomCode).emit('auction-ended', { room: getRoomState(roomCode), rankings });
}

// Keep a single small instance alive through unexpected errors instead of
// crashing every live room. We log loudly so issues are still visible; a
// process manager (pm2) can still restart on truly fatal states.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Auction server running on port ${PORT}`);
  console.log(`📊 Loaded ${ipl2026Players.length} cricket players`);
});
