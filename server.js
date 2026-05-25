require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { ipl2026Players } = require('./players');

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

function calculatePlayerValue(player) {
  let score = player.basePrice * 10;
  if (player.battingAvg && player.strikeRate) {
    score += (player.battingAvg * player.strikeRate) / 50;
  }
  if (player.wickets !== null && player.economy) {
    score += player.wickets * (12 - Math.min(player.economy, 12)) * 2;
  }
  if (player.basePrice >= 1.5) score += 15;
  else if (player.basePrice >= 1.0) score += 10;
  else if (player.basePrice >= 0.5) score += 5;
  return score;
}

function getSquadBalance(team) {
  const counts = { 'WK-Batter': 0, 'Batter': 0, 'Bowler': 0, 'All-rounder': 0 };
  team?.forEach(p => { if (counts[p.role] !== undefined) counts[p.role]++; });
  return {
    wk: { have: counts['WK-Batter'], need: 1 },
    batters: { have: counts['Batter'] + counts['WK-Batter'], need: 3 },
    bowlers: { have: counts['Bowler'], need: 3 },
    allRounders: { have: counts['All-rounder'], need: 1 },
  };
}

function shouldBotBid(bot, player, currentBid, room) {
  const bal = getSquadBalance(bot.team);
  const needs = [];
  if (player.role === 'WK-Batter' && bal.wk.have < bal.wk.need) needs.push('wk');
  if ((player.role === 'Batter' || player.role === 'WK-Batter') && bal.batters.have < bal.batters.need) needs.push('batter');
  if (player.role === 'Bowler' && bal.bowlers.have < bal.bowlers.need) needs.push('bowler');
  if (player.role === 'All-rounder' && bal.allRounders.have < bal.allRounders.need) needs.push('allrounder');

  const value = calculatePlayerValue(player);
  const needBonus = needs.length > 0 ? 1.5 : 1.0;
  const randomFactor = 0.7 + Math.random() * 0.6;
  const maxPrice = parseFloat((player.basePrice * needBonus * randomFactor * (1 + value / 100)).toFixed(2));
  const cappedMax = Math.min(maxPrice, bot.budget * 0.4);

  if (bot.team.length >= room.settings.squadSize) return { shouldBid: false };
  if (currentBid >= cappedMax) return { shouldBid: false };
  if (bot.budget <= currentBid) return { shouldBid: false };

  let increment = 0.30;
  if (currentBid < 0.50) increment = 0.05;
  else if (currentBid < 1.00) increment = 0.10;
  else if (currentBid < 5.00) increment = 0.25;

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

        let increment = 0.30;
        if (freshCurrent < 0.50) increment = 0.05;
        else if (freshCurrent < 1.00) increment = 0.10;
        else if (freshCurrent < 5.00) increment = 0.25;
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

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: CLIENT_URL }));
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

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create Room
  socket.on('create-room', ({ hostName, settings }) => {
    const roomCode = generateRoomCode();
    const roomId = uuidv4();
    
    // Filter players by selected teams
    let availablePlayers = ipl2026Players;
    if (settings.teams && settings.teams.length > 0 && settings.teams.length < 10) {
      availablePlayers = ipl2026Players.filter(p => settings.teams.includes(p.team));
    }

    // Limit max players if set
    if (settings.maxPlayers && settings.maxPlayers < availablePlayers.length) {
      availablePlayers = shuffleArray(availablePlayers).slice(0, settings.maxPlayers);
    }

    rooms[roomCode] = {
      id: roomId,
      code: roomCode,
      hostId: socket.id,
      players: [{
        id: socket.id,
        name: hostName,
        isHost: true,
        budget: settings.budget || 100,
        team: [],
        spent: 0,
        connected: true
      }],
      settings: {
        budget: settings.budget || 100,
        squadSize: settings.squadSize || 11,
        bidTimer: settings.bidTimer || 15,
        teams: settings.teams || [],
        maxPlayers: settings.maxPlayers || availablePlayers.length
      },
      availablePlayers: shuffleArray(availablePlayers),
      bidHistory: [],
      soldPlayers: [],
      unsoldPlayers: [],
      allPlayers: availablePlayers.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        team: p.team,
        basePrice: p.basePrice,
        nationality: p.nationality,
        battingAvg: p.battingAvg,
        strikeRate: p.strikeRate,
        economy: p.economy,
        wickets: p.wickets,
        status: 'available'
      })),
      currentPlayerIndex: -1,
      currentPlayer: null,
      currentBid: 0,
      currentBidder: null,
      status: 'waiting', // waiting, auctioning, paused, ended
      timer: null,
      timerInterval: null,
      chat: []
    };

    socket.join(roomCode);
    // Add AI bots if requested
    if (settings.botCount && settings.botCount > 0) {
      const usedNames = [hostName];
      for (let i = 0; i < Math.min(settings.botCount, 9); i++) {
        const botName = getBotName(usedNames);
        usedNames.push(botName);
        rooms[roomCode].players.push({
          id: `bot-${i}-${Date.now()}`,
          name: botName,
          isHost: false,
          isBot: true,
          budget: rooms[roomCode].settings.budget,
          team: [],
          spent: 0,
          connected: true,
          autoBid: { enabled: false, maxPrice: 0 }
        });
      }
    }

    socket.emit('room-created', { roomCode, room: getRoomState(roomCode) });
  });

  // Join Room
  socket.on('join-room', ({ roomCode, playerName }) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit('error', { message: 'Room not found!' });
      return;
    }

    // Check if this is a reconnection (same name, previously disconnected)
    const disconnectedPlayer = room.players.find(p => p.name === playerName && !p.connected);
    if (disconnectedPlayer) {
      disconnectedPlayer.id = socket.id;
      disconnectedPlayer.connected = true;
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
    if (room.players.find(p => p.name === playerName)) {
      socket.emit('error', { message: 'Name already taken in this room!' });
      return;
    }

    const newPlayer = {
      id: socket.id,
      name: playerName,
      isHost: false,
      isBot: false,
      budget: room.settings.budget,
      team: [],
      spent: 0,
      connected: true,
      autoBid: { enabled: false, maxPrice: 0 }
    };
    room.players.push(newPlayer);
    socket.join(roomCode);

    socket.emit('joined-room', { roomCode, room: getRoomState(roomCode), playerId: socket.id });
    socket.to(roomCode).emit('player-joined', { player: newPlayer, room: getRoomState(roomCode) });
  });

  // Add Bot (Host only)
  socket.on('add-bot', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;
    if (room.status !== 'waiting') {
      socket.emit('error', { message: 'Can only add bots before auction starts!' });
      return;
    }
    if (room.players.filter(p => p.connected).length >= 10) {
      socket.emit('error', { message: 'Room is full!' });
      return;
    }
    const usedNames = room.players.map(p => p.name);
    const botName = getBotName(usedNames);
    const bot = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: botName,
      isHost: false,
      isBot: true,
      budget: room.settings.budget,
      team: [],
      spent: 0,
      connected: true,
      autoBid: { enabled: false, maxPrice: 0 }
    };
    room.players.push(bot);
    socket.emit('bot-added', { bot, room: getRoomState(roomCode) });
    socket.to(roomCode).emit('bot-added', { bot, room: getRoomState(roomCode) });
  });

  // Remove Bot (Host only)
  socket.on('remove-bot', ({ roomCode, botId }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;
    if (room.status !== 'waiting') return;
    room.players = room.players.filter(p => p.id !== botId);
    io.to(roomCode).emit('bot-removed', { room: getRoomState(roomCode) });
  });

  // Start Auction
  socket.on('start-auction', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;
    if (room.players.filter(p => p.connected && !p.isBot).length < 1) {
      socket.emit('error', { message: 'Need at least 1 human player!' });
      return;
    }

    room.status = 'auctioning';
    room.currentPlayerIndex = 0;
    startNewAuction(roomCode);
    io.to(roomCode).emit('auction-started', { room: getRoomState(roomCode) });
  });

  // Place Bid
  socket.on('place-bid', ({ roomCode, amount }) => {
    const room = rooms[roomCode];
    if (!room || room.status !== 'auctioning') return;
    if (!room.currentPlayer) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.connected) return;

    // Prevent same bidder from bidding twice in a row
    if (room.currentBidder === socket.id) {
      socket.emit('error', { message: 'Wait for someone else to bid!' });
      return;
    }

    // Calculate minimum bid based on current amount slabs
    let currentAmount = room.currentBid > 0 ? room.currentBid : room.currentPlayer.basePrice;
    let increment = 0.30; // default 30L above 5Cr
    if (currentAmount < 0.50) increment = 0.05;        // below 50L: +5L
    else if (currentAmount < 1.00) increment = 0.10;   // 50L to 1Cr: +10L
    else if (currentAmount < 5.00) increment = 0.25;   // 1Cr to 5Cr: +25L
    
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

  // Skip Player (Host only)
  socket.on('skip-player', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;
    if (room.status !== 'auctioning') return;

    clearInterval(room.timerInterval);
    room.unsoldPlayers.push(room.currentPlayer);
    moveToNextPlayer(roomCode);
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
    const room = rooms[roomCode];
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    io.to(roomCode).emit('new-reaction', {
      playerName: player.name,
      emoji,
      timestamp: Date.now()
    });
  });

  // Chat Message
  socket.on('send-chat', ({ roomCode, message }) => {
    const room = rooms[roomCode];
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const chatMsg = {
      id: uuidv4(),
      playerName: player.name,
      message,
      timestamp: Date.now()
    };
    room.chat.push(chatMsg);
    if (room.chat.length > 50) room.chat.shift();

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
        
        // If host disconnects, assign new host
        if (player.isHost && room.players.some(p => p.connected)) {
          const newHost = room.players.find(p => p.connected);
          if (newHost) {
            newHost.isHost = true;
            room.hostId = newHost.id;
            io.to(roomCode).emit('new-host', { hostId: newHost.id, room: getRoomState(roomCode) });
          }
        }
        
        // Clean up empty rooms after 5 minutes
        if (!room.players.some(p => p.connected)) {
          setTimeout(() => {
            if (rooms[roomCode] && !rooms[roomCode].players.some(p => p.connected)) {
              delete rooms[roomCode];
            }
          }, 300000);
        }
      }
    }
  });
});

function getBidIncrement(currentAmount) {
  if (currentAmount < 0.50) return 0.05;
  if (currentAmount < 1.00) return 0.10;
  if (currentAmount < 5.00) return 0.25;
  return 0.30;
}

function processAutoBids(roomCode, depth = 0) {
  const room = rooms[roomCode];
  if (!room || room.status !== 'auctioning' || !room.currentPlayer || depth > 5) return;

  const currentAmount = room.currentBid > 0 ? room.currentBid : room.currentPlayer.basePrice;
  const increment = getBidIncrement(currentAmount);
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 IPL 2026 Auction Server running on port ${PORT}`);
  console.log(`📊 Loaded ${ipl2026Players.length} players`);
});
