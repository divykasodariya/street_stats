const db = require("../config/database");

const createTeam = async (req, res) => {
    try {

        const { tournament_id, team_name } = req.body
        if (!tournament_id || !team_name) {
            return res.status(400).json({
                success: false,
                message: "invallid team details"
            });
        }
        const [user] = await db.query(
            `SELECT t.*, u.full_name AS admin_name
       FROM TOURNAMENTS t
       JOIN USERS u ON t.admin_user_id = u.user_id
       WHERE t.tournament_id = ?`,
            [tournament_id]
        );
        // console.log(user[0].admin_user_id);
        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Tournament not found!"
            });
        }
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized — user token missing or invalid."
            });
        }


        if (req.user.user_id !== user[0].admin_user_id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized — only the tournament admin can create teams."
            });
        }

        const [result] = await db.query(
            ` insert into TEAMS(tournament_id,team_name)
            values(?,?)
            `, [tournament_id, team_name]
        )
        const [rows] = await db.query(
            `SELECT * FROM TEAMS WHERE team_id = ?`,
            [result.insertId]
        );
        return res.status(200).json({
            success: true,
            data: rows[0],
            message: "successfully created team "

        })
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "error creating team "
            , error: error
        });
    }
}
const getAllTeams = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.team_id, t.team_name, tr.tournament_name, tr.location
      FROM TEAMS t
      JOIN TOURNAMENTS tr ON t.tournament_id = tr.tournament_id
      ORDER BY tr.start_date DESC, t.team_name ASC
    `);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch teams",
      error: error.message
    });
  }
};



// ===================================================
// GET ALL TEAMS IN A SPECIFIC TOURNAMENT
// ===================================================
// routes/teams.js  (add player_count to getTeamsByTournament)
const getTeamsByTournament = async (req, res) => {
  try {
    const { tournament_id } = req.params;
    const [teams] = await db.query(
      `SELECT 
         t.team_id, 
         t.team_name,
         COUNT(tp.user_id) AS player_count
       FROM TEAMS t
       LEFT JOIN TEAM_PLAYERS tp ON t.team_id = tp.team_id
       WHERE t.tournament_id = ?
       GROUP BY t.team_id`,
      [tournament_id]
    );
    return res.status(200).json({
      success: true,
      count: teams.length,
      data: teams,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to fetch teams" });
  }
};

// ===================================================
// GET A SINGLE TEAM WITH ITS PLAYERS
// ===================================================
const getTeamWithPlayers = async (req, res) => {
  try {
    const { team_id } = req.params;

    // Fetch team details
    const [teamRows] = await db.query(
      `SELECT t.*, tr.tournament_name
       FROM TEAMS t
       JOIN TOURNAMENTS tr ON t.tournament_id = tr.tournament_id
       WHERE t.team_id = ?`,
      [team_id]
    );

    if (teamRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }

    // Fetch team players
    const [players] = await db.query(
      `SELECT u.user_id, u.full_name, u.player_role
       FROM TEAM_PLAYERS tp
       JOIN USERS u ON tp.user_id = u.user_id
       WHERE tp.team_id = ?`,
      [team_id]
    );

    return res.status(200).json({
      success: true,
      team: teamRows[0],
      players
    });

  } catch (error) {
    console.error("Error fetching team with players:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch team details",
      error: error.message
    });
  }
};



// ===================================================
// ADD PLAYER TO A TEAM (admin only)
// ===================================================
const addPlayerToTeam = async (req, res) => {
  try {
    const { team_id } = req.params;
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Player user_id is required"
      });
    }
   const [ress] = await db.query(
  `SELECT user_id FROM USERS WHERE username = ?`,
  [username]
);

if (ress.length === 0) {
  return res.status(404).json({
    success: false,
    message: `User '${username}' not found`
  });
}

const user_id = ress[0].user_id;


    // Get tournament info for this team
    const [team] = await db.query(
      `SELECT t.*, tr.admin_user_id 
       FROM TEAMS t
       JOIN TOURNAMENTS tr ON t.tournament_id = tr.tournament_id
       WHERE t.team_id = ?`,
      [team_id]
    );

    if (team.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }

    const tournamentAdmin = team[0].admin_user_id;

    if (req.user.user_id !== tournamentAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized — only the tournament admin can add players"
      });
    }

    await db.query(
      `INSERT INTO TEAM_PLAYERS (team_id, user_id) VALUES (?, ?)`,
      [team_id, user_id]
    );

    return res.status(201).json({
      success: true,
      message: "Player added to team successfully"
    });

  } catch (error) {
    console.error("Error adding player to team:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add player to team",
      error: error.message
    });
  }
};

const deleteTeam = async (req, res) => {
  try {
    const { team_id } = req.params;

    const [team] = await db.query(
      `SELECT t.*, tr.admin_user_id 
       FROM TEAMS t
       JOIN TOURNAMENTS tr ON t.tournament_id = tr.tournament_id
       WHERE t.team_id = ?`,
      [team_id]
    );

    if (team.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }

    if (req.user.user_id !== team[0].admin_user_id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized — only the tournament admin can delete a team"
      });
    }

    await db.query(`DELETE FROM TEAMS WHERE team_id = ?`, [team_id]);
    await db.query(`DELETE FROM TEAM_PLAYERS WHERE team_id = ?`, [team_id]);

    return res.status(200).json({
      success: true,
      message: "Team deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting team:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete team",
      error: error.message
    });
  }
};

module.exports = {
  createTeam,
  getAllTeams,
  getTeamsByTournament,
  getTeamWithPlayers,
  addPlayerToTeam,
  deleteTeam
};