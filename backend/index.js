const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// routes
const userRoutes = require('./Routes/userRoutes');
const trouter = require('./Routes/tournamentRoutes');
const teamrouter = require('./Routes/teamRoutes');
const stadiumrouter = require("./Routes/stadiumRoutes");
const matchrouter = require('./Routes/matchRoutes');

dotenv.config();
const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true, // CRITICAL: This allows cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// Initialize Socket.IO
const io = new Server(server, {
 cors: {
    origin: "http://localhost:5173", // same frontend URL
    credentials: true,
    methods: ["GET", "POST"],
  },
});


module.exports.io = io;

// Handle socket connections  
const INTERVAL = 1500; // 1.5 seconds

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Viewer joins a specific match room
  socket.on("join_match", async (matchId) => {
    socket.join(`match_${matchId}`);
    console.log(` ${socket.id} joined match_${matchId}`);

    // Periodically emit match summary
    const intervalId = setInterval(async () => {
      try {
        const [rows] = await db.query(
          `SELECT * FROM vw_match_summary WHERE match_id = ?`,
          [matchId]
        );
        if (rows.length > 0) {
          io.to(`match_${matchId}`).emit("live_match_summary", rows[0]);
        }
      } catch (err) {
        console.error("Error fetching match summary:", err.message);
      }
    }, INTERVAL);

    // Clean up when user leaves
    socket.on("disconnect", () => {
      clearInterval(intervalId);
      console.log(`🔴 ${socket.id} disconnected from match_${matchId}`);
    });
  });

  socket.on("join_detailed_summary", async (matchId) => {
  socket.join(`details_${matchId}`);
  console.log(`🧾 ${socket.id} joined detailed view for match_${matchId}`);

  const intervalId = setInterval(async () => {
    try {
      const [players] = await db.query(
        `
        SELECT 
          u.user_id,
          u.full_name,
          u.player_role,
          p.runs_scored,
          p.balls_faced,
          p.wickets_taken,
          p.overs_bowled,
          p.strike_rate
        FROM PLAYER_PERFORMANCE p
        JOIN USERS u ON u.user_id = p.user_id
        WHERE p.match_id = ?
        ORDER BY p.runs_scored DESC
        `,
        [matchId]
      );

      const [match] = await db.query(
        `SELECT * FROM vw_match_summary WHERE match_id = ?`,
        [matchId]
      );

      io.to(`details_${matchId}`).emit("live_detailed_summary", {
        match: match[0],
        players
      });
    } catch (err) {
      console.error("Error fetching detailed summary:", err.message);
    }
  }, INTERVAL);

  socket.on("disconnect", () => {
    clearInterval(intervalId);
    console.log(`${socket.id} left detailed summary for match_${matchId}`);
  });
});

});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/tournaments', trouter);
app.use('/api/teams', teamrouter);
app.use('/api/stadiums', stadiumrouter);
app.use('/api/matches', matchrouter);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
