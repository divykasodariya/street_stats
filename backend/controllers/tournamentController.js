const db = require('../config/database.js');

const createTournament = async (req, res) => {
    const userId = req.user.user_id;
    if (!userId) {
        return res.status(401).json({
            message: "invalid user!"
        })
    }

    try {
        const { tournament_name, location, start_date, end_date } = req.body;
        if (!tournament_name ) {
            res.status(400).json({
                success: false,
                message: "enter proper tournament and admin details"
            })
        }
        const [result] = await db.query(
            `INSERT INTO TOURNAMENTS (tournament_name, location, start_date , end_date, admin_user_id) 
       VALUES (?, ?, ?, ?, ?)`,
            [tournament_name, location || null, start_date|| null, end_date ||  null ,req.user.user_id]
        )
        // Fetch the created record
        const [rows] = await db.query(
            `SELECT * FROM TOURNAMENTS WHERE tournament_id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: "Tournament created successfully!",
            data: rows[0],
        });


    } catch (error) {
        console.error('tournament creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during tournament creation',
            error: error.message
        });
    }
}

const getAllTournaments = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, u.full_name AS admin_name
      FROM TOURNAMENTS t
      JOIN USERS u ON t.admin_user_id = u.user_id
      ORDER BY t.start_date DESC
    `);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tournaments',
      error: error.message,
    });
  }
};


const getTournamentById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT t.*, u.full_name AS admin_name
       FROM TOURNAMENTS t
       JOIN USERS u ON t.admin_user_id = u.user_id
       WHERE t.tournament_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0],
    });

  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tournament',
      error: error.message,
    });
  }
};

const deleteTournament = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `DELETE FROM TOURNAMENTS WHERE tournament_id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found or already deleted',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tournament deleted successfully',
    });

  } catch (error) {
    console.error('Delete tournament error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting tournament',
      error: error.message,
    });
  }
};

module.exports = {
  createTournament,
  getAllTournaments,
  getTournamentById,
  deleteTournament,
};
