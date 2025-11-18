
const db = require("../config/database");



const updateMatchScore = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { team, runs, isWicket } = req.body;

    if (![1, 2].includes(team)) {
      return res.status(400).json({ success: false, message: "Invalid team value" });
    }

    // Fetch current match state
    const [rows] = await db.query(
      `SELECT * FROM MATCHES WHERE match_id = ?`,
      [matchId]
    );

    if (rows.length === 0)
      return res.status(404).json({ success: false, message: "Match not found" });

    const match = rows[0];

    // Determine which fields to update
    let runsField = team === 1 ? "team1_runs" : "team2_runs";
    let wicketsField = team === 1 ? "team1_wickets" : "team2_wickets";
    let oversField = team === 1 ? "team1_overs" : "team2_overs";

    let currentRuns = match[runsField];
    let currentWickets = match[wicketsField];
    let overs = parseFloat(match[oversField]);

    // Update runs
    currentRuns += runs;

    // Update wickets
    if (isWicket) currentWickets += 1;

    // Update overs per ball
    let decimal = overs % 1;
    let wholeOvers = Math.floor(overs);

    if (decimal >= 0.5) {
      overs = wholeOvers + 1;
    } else {
      overs = parseFloat((overs + 0.1).toFixed(1));
    }

    // Update MATCHES table
    await db.query(
      `
      UPDATE MATCHES 
      SET ${runsField} = ?, ${wicketsField} = ?, ${oversField} = ?
      WHERE match_id = ?
      `,
      [currentRuns, currentWickets, overs, matchId]
    );

    // Update player performance (temporary logic — updates active batter)
    await db.query(
      `
      UPDATE PLAYER_PERFORMANCE
      SET 
        runs_scored = runs_scored + ?,
        balls_faced = balls_faced + 1,
        strike_rate = ((runs_scored + ?) / (balls_faced + 1)) * 100
      WHERE match_id = ? AND team_id = ?
      LIMIT 1
      `,
      [runs, runs, matchId, team === 1 ? match.team1_id : match.team2_id]
    );

    // Fetch updated summary
    const [summary] = await db.query(
      `SELECT * FROM vw_match_summary WHERE match_id = ?`,
      [matchId]
    );

    return res.status(200).json({
      success: true,
      message: "Score updated",
      data: summary[0]
    });

  } catch (err) {
    console.error("Score update error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating score",
      error: err.message,
    });
  }
};

const updatePlayerPerformance = async (req, res) => {
  try {
    const { match_id } = req.params;
    const { user_id, runs_scored = 0, balls_faced = 0, wickets_taken = 0, overs_bowled = 0 } = req.body;

    // Validate input
    if (!user_id || !match_id) {
      return res.status(400).json({ success: false, message: "Missing user_id or match_id" });
    }

    // Check if record exists
    const [existing] = await db.query(
      `SELECT * FROM PLAYER_PERFORMANCE WHERE user_id = ? AND match_id = ?`,
      [user_id, match_id]
    );
    const [match]= await db.query(`
      select tournament_id from MATCHES 
      where match_id = ?
      `,[match_id]
    )
    const tournament_id = match[0].tournament_id;

    const [ussss]= await db.query(`
      select admin_user_id from TOURNAMENTS 
      where tournament_id = ?
      `,[tournament_id]
    )
    console.log(ussss[0])
    const admin_id=ussss[0].admin_user_id;

    if(admin_id!==req.user.user_id){
      return res.status(401).json({
        success:false,
        message:"user must be admin to edit" 
      })
    }
    if (existing.length > 0) {
      // Update existing performance (incremental)
      await db.query(
        `UPDATE PLAYER_PERFORMANCE
         SET runs_scored = runs_scored + ?,
             balls_faced = balls_faced + ?,
             wickets_taken = wickets_taken + ?,
             overs_bowled = overs_bowled + ?
         WHERE user_id = ? AND match_id = ?`,
        [runs_scored, balls_faced, wickets_taken, overs_bowled, user_id, match_id]
      );
    } else {
      // Insert new record
      await db.query(
        `INSERT INTO PLAYER_PERFORMANCE (user_id, match_id, runs_scored, balls_faced, wickets_taken, overs_bowled)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, match_id, runs_scored, balls_faced, wickets_taken, overs_bowled]
      );
    }

    // Fetch updated record
    const [updated] = await db.query(
      `SELECT user_id, runs_scored, balls_faced, wickets_taken, overs_bowled, strike_rate
       FROM PLAYER_PERFORMANCE
       WHERE user_id = ? AND match_id = ?`,
      [user_id, match_id]
    );

    return res.status(200).json({
      success: true,
      message: "Player performance updated successfully",
      data: updated[0]
    });

  } catch (error) {
    console.error("Error updating player performance:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating player performance",
      error: error.message
    });
  }
};

const createMatch = async (req, res) => {
  try {

    const { tournament_id, stadium_id,
      team1_id, team2_id,
      match_date, match_type,
      toss_winner_team_id, toss_decision,
    } = req.body

    if (!tournament_id ||
      !stadium_id || !toss_winner_team_id ||
      !team1_id || !team2_id ||
      !toss_decision || team1_id == team2_id || (toss_decision !== ("BAT" || "BOWL"))) {


      return res.status(400).json({
        success: false,
        message: "invalid match details !"
      })
    }
    // Verify tournament and admin
    const [tournament] = await db.query(
      `SELECT admin_user_id FROM TOURNAMENTS WHERE tournament_id = ?`,
      [tournament_id]
    );
    if (tournament.length === 0) {
      return res.status(404).json({ success: false, message: "Tournament not found" });
    }

    if (req.user.user_id !== tournament[0].admin_user_id) {
      return res.status(403).json({ success: false, message: "Unauthorized — only admin can create matches" });
    }

    // Insert new match
    const [result] = await db.query(
      `INSERT INTO MATCHES (tournament_id, stadium_id, team1_id, team2_id, match_date, match_type,toss_winner_team_id,toss_decision)
       VALUES (?, ?, ?, ?, ?, ?,?,?)`,
      [tournament_id, stadium_id, team1_id, team2_id, match_date, match_type || 'T20', toss_winner_team_id, toss_decision]
    );

    const [match] = await db.query(`SELECT * FROM MATCHES WHERE match_id = ?`, [result.insertId]);

    // io.emit("match_created", match[0]); // broadcast to everyone

    return res.status(201).json({
      success: true,
      message: "Match scheduled successfully",
      data: match[0]
    });

  } catch (err) {
    return res.status(100).json({
      success: false,
      message: "error creating match",
      error: err
    })

  }
}

const getAllMatches = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        m.match_id, m.match_date, m.match_type, 
        t1.team_name AS team1, t2.team_name AS team2,
        s.stadium_name, tr.tournament_name, 
        m.team1_runs, m.team2_runs, m.winner_team_id
      FROM MATCHES m
      JOIN TEAMS t1 ON m.team1_id = t1.team_id
      JOIN TEAMS t2 ON m.team2_id = t2.team_id
      JOIN STADIUMS s ON m.stadium_id = s.stadium_id
      JOIN TOURNAMENTS tr ON m.tournament_id = tr.tournament_id
      ORDER BY m.match_date DESC
    `);

    return res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return res.status(500).json({ success: false, message: "Error fetching matches", error: error.message });
  }
};


const getMatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(`
      SELECT 
        m.*, 
        t1.team_name AS team1, 
        t2.team_name AS team2,
        s.stadium_name, 
        tr.tournament_name 
      FROM MATCHES m
      JOIN TEAMS t1 ON m.team1_id = t1.team_id
      JOIN TEAMS t2 ON m.team2_id = t2.team_id
      JOIN STADIUMS s ON m.stadium_id = s.stadium_id
      JOIN TOURNAMENTS tr ON m.tournament_id = tr.tournament_id
      WHERE m.match_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }

    return res.status(200).json({ success: true, data: rows[0] });

  } catch (error) {
    console.error("Error fetching match:", error);
    return res.status(500).json({ success: false, message: "Error fetching match", error: error.message });
  }
};

const getMatchesByTournamentId = async (req, res) => {
  try {
    const { id } = req.params; // tournament_id

    // Fetch all matches belonging to that tournament
    const [rows] = await db.query(`
      SELECT 
        m.match_id,
        tr.tournament_name,
        s.stadium_name,
        t1.team_name AS team1,
        t2.team_name AS team2,
        CONCAT(m.team1_runs, '/', m.team1_wickets, ' (', m.team1_overs, ' overs)') AS team1_score,
        CONCAT(m.team2_runs, '/', m.team2_wickets, ' (', m.team2_overs, ' overs)') AS team2_score,
        w.team_name AS winner,
        tw.team_name AS toss_winner,
        m.toss_decision,
        m.match_type,
        m.match_date
      FROM MATCHES m
      JOIN TOURNAMENTS tr ON tr.tournament_id = m.tournament_id
      JOIN TEAMS t1 ON t1.team_id = m.team1_id
      JOIN TEAMS t2 ON t2.team_id = m.team2_id
      LEFT JOIN TEAMS w ON w.team_id = m.winner_team_id
      LEFT JOIN TEAMS tw ON tw.team_id = m.toss_winner_team_id
      JOIN STADIUMS s ON s.stadium_id = m.stadium_id
      WHERE m.tournament_id = ?
      ORDER BY m.match_date DESC
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No matches found for this tournament"
      });
    }

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (error) {
    console.error("Error fetching matches by tournament:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching matches by tournament",
      error: error.message
    });
  }
};
const finalizeMatch = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const matchId = req.params.id;
    const { toss_winner_team_id } = req.body;

    await conn.beginTransaction();

    const [match] = await conn.query(`SELECT * FROM MATCHES WHERE match_id = ?`, [matchId]);
    if (match.length === 0) throw new Error("Match not found");

    // Update match details
    await conn.query(
      `UPDATE MATCHES 
       SET , winner_team_id=? 
       WHERE match_id=?`,
      [winner_team_id, matchId]
    );

    // Update points table
    const [[{ tournament_id, team1_id, team2_id }]] = await conn.query(
      `SELECT tournament_id, team1_id, team2_id FROM MATCHES WHERE match_id = ?`,
      [matchId]
    );

    const teams = [team1_id, team2_id];
    for (const teamId of teams) {
      const isWinner = teamId === winner_team_id;
      await conn.query(`
        INSERT INTO POINTS_TABLE (tournament_id, team_id, matches_played, matches_won, matches_lost, points)
        VALUES (?, ?, 1, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          matches_played = matches_played + 1,
          matches_won = matches_won + VALUES(matches_won),
          matches_lost = matches_lost + VALUES(matches_lost),
          points = points + VALUES(points)
      `, [tournament_id, teamId, isWinner ? 1 : 0, isWinner ? 0 : 1, isWinner ? 2 : 0]);
    }

    await conn.commit();

    io.to(`match_${matchId}`).emit("match_finalized", {
      match_id: matchId,
      winner_team_id,
      message: "Match finalized successfully"
    });

    return res.status(200).json({
      success: true,
      message: "Match finalized successfully"
    });

  } catch (error) {
    await conn.rollback();
    console.error("Error finalizing match:", error);
    return res.status(500).json({ success: false, message: "Error finalizing match", error: error.message });
  } finally {
    conn.release();
  }
};

const deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM MATCHES WHERE match_id = ?`, [id]);
    io.emit("match_deleted", { match_id: id });
    return res.status(200).json({ success: true, message: "Match deleted successfully" });
  } catch (error) {
    console.error("Error deleting match:", error);
    return res.status(500).json({ success: false, message: "Error deleting match", error: error.message });
  }
};
const getPlayersByMatch = async (req, res) => {
  const { matchId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT 
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
      ORDER BY p.runs_scored DESC`,
      [matchId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "No player data found for this match",
      });
    }

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching player data:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching player data",
    });
  }
};
// ===================================================
// GET MATCH SUMMARY
// ===================================================
const getMatchSummary = async (req, res) => {
  try {
    const { match_id } = req.params;

    const [rows] = await db.query(
      `SELECT 
        m.match_id,
        tr.tournament_name,
        s.stadium_name,
        t1.team_name AS team1,
        t2.team_name AS team2,
        CONCAT(m.team1_runs, '/', m.team1_wickets, ' (', m.team1_overs, ' overs)') AS team1_score,
        CONCAT(m.team2_runs, '/', m.team2_wickets, ' (', m.team2_overs, ' overs)') AS team2_score,
        w.team_name AS winner,
        tw.team_name AS toss_winner,
        m.toss_decision,
        m.match_type,
        m.match_date
      FROM MATCHES m
      JOIN TOURNAMENTS tr ON tr.tournament_id = m.tournament_id
      JOIN TEAMS t1 ON t1.team_id = m.team1_id
      JOIN TEAMS t2 ON t2.team_id = m.team2_id
      LEFT JOIN TEAMS w ON w.team_id = m.winner_team_id
      LEFT JOIN TEAMS tw ON tw.team_id = m.toss_winner_team_id
      JOIN STADIUMS s ON s.stadium_id = m.stadium_id
      WHERE m.match_id = ?`,
      [match_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Error fetching match summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch match summary",
      error: error.message,
    });
  }
};

// ===================================================
// UPDATE MATCH SCORE (Admin Only)
// ===================================================
const updateMatchScoresimple = async (req, res) => {
  try {
    const { match_id } = req.params;
    const { team, runs, isWicket } = req.body; // team = 1 or 2

    if (![1, 2].includes(Number(team))) {
      return res.status(400).json({
        success: false,
        message: "Invalid team number (must be 1 or 2)"
      });
    }

    const [matches] = await db.query("SELECT * FROM MATCHES WHERE match_id = ?", [match_id]);
    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Match not found"
      });
    }

    const match = matches[0];

    // Safely parse all numeric fields (in case they come as strings)
    const team1_runs = Number(match.team1_runs) || 0;
    const team1_wickets = Number(match.team1_wickets) || 0;
    const team1_overs = parseFloat(match.team1_overs) || 0;

    const team2_runs = Number(match.team2_runs) || 0;
    const team2_wickets = Number(match.team2_wickets) || 0;
    const team2_overs = parseFloat(match.team2_overs) || 0;

    let query = "";
    let values = [];

    if (team === 1) {
      let newRuns = team1_runs + runs;
      let newWickets = isWicket ? team1_wickets + 1 : team1_wickets;
      let newOvers = parseFloat((team1_overs + 0.1).toFixed(1));

      // fix overs format like 4.6 → 5.0
      if (newOvers % 1 >= 0.6) newOvers = Math.floor(newOvers) + 1;

      query = `
        UPDATE MATCHES
        SET team1_runs = ?, team1_wickets = ?, team1_overs = ?
        WHERE match_id = ?
      `;
      values = [newRuns, newWickets, newOvers, match_id];
    } else {
      let newRuns = team2_runs + runs;
      let newWickets = isWicket ? team2_wickets + 1 : team2_wickets;
      let newOvers = parseFloat((team2_overs + 0.1).toFixed(1));

      if (newOvers % 1 >= 0.6) newOvers = Math.floor(newOvers) + 1;

      query = `
        UPDATE MATCHES
        SET team2_runs = ?, team2_wickets = ?, team2_overs = ?
        WHERE match_id = ?
      `;
      values = [newRuns, newWickets, newOvers, match_id];
    }

    await db.query(query, values);

    // Fetch updated match summary for response
    const [updated] = await db.query(
      `SELECT 
          m.match_id,
          t1.team_name AS team1,
          t2.team_name AS team2,
          CONCAT(m.team1_runs, '/', m.team1_wickets, ' (', m.team1_overs, ' overs)') AS team1_score,
          CONCAT(m.team2_runs, '/', m.team2_wickets, ' (', m.team2_overs, ' overs)') AS team2_score,
          m.match_date,
          s.stadium_name
       FROM MATCHES m
       JOIN TEAMS t1 ON m.team1_id = t1.team_id
       JOIN TEAMS t2 ON m.team2_id = t2.team_id
       JOIN STADIUMS s ON s.stadium_id = m.stadium_id
       WHERE m.match_id = ?`,
      [match_id]
    );

    res.status(200).json({
      success: true,
      message: "Score updated successfully",
      data: updated[0]
    });

  } catch (error) {
    console.error("Server error while updating score:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating score",
      error: error.message
    });
  }
};


const getMatchScorecard = async (req, res) => {
  try {
    const { matchId } = req.params;

    // Get match basic details (teams, stadium, scores)
    const [matchInfo] = await db.query(
      `
      SELECT 
        m.match_id,
        t1.team_id AS team1_id,
        t1.team_name AS team1_name,
        t2.team_id AS team2_id,
        t2.team_name AS team2_name,
        m.team1_runs,
        m.team1_wickets,
        m.team1_overs,
        m.team2_runs,
        m.team2_wickets,
        m.team2_overs,
        s.stadium_name,
        tr.tournament_name
      FROM MATCHES m
      JOIN TEAMS t1 ON m.team1_id = t1.team_id
      JOIN TEAMS t2 ON m.team2_id = t2.team_id
      JOIN STADIUMS s ON s.stadium_id = m.stadium_id
      JOIN TOURNAMENTS tr ON tr.tournament_id = m.tournament_id
      WHERE m.match_id = ?
      `,
      [matchId]
    );

    if (matchInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    const match = matchInfo[0];

    // Get detailed player performance
    const [players] = await db.query(
      `
      SELECT 
  u.user_id,
  u.full_name,
  u.player_role,
  CASE 
    WHEN tp.team_id = m.team1_id THEN m.team1_id
    WHEN tp.team_id = m.team2_id THEN m.team2_id
  END AS team_id,
  p.runs_scored,
  p.balls_faced,
  p.wickets_taken,
  p.overs_bowled,
  p.strike_rate
FROM PLAYER_PERFORMANCE p
JOIN USERS u ON u.user_id = p.user_id
JOIN MATCHES m ON m.match_id = p.match_id
JOIN TEAM_PLAYERS tp 
  ON tp.user_id = p.user_id 
 AND (tp.team_id = m.team1_id OR tp.team_id = m.team2_id)
WHERE p.match_id = ?
ORDER BY p.runs_scored DESC;

      `,
      [matchId]
    );

    return res.status(200).json({
      success: true,
      match,
      players,
    });

  } catch (err) {
    console.error("Scorecard error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch scorecard",
      error: err.message
    });
  }
};



module.exports = {
  getMatchScorecard,
  getMatchSummary,
  createMatch,
  getAllMatches,
  getMatchById,
  updateMatchScore,
  finalizeMatch,
  deleteMatch,
  updatePlayerPerformance,
  getMatchesByTournamentId,
  getPlayersByMatch,
  updateMatchScoresimple
};
