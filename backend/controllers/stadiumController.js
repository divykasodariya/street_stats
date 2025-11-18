const db = require("../config/database");

// ===================================================
// CREATE STADIUM
// ===================================================
const createStadium = async (req, res) => {
  try {
    const { stadium_name, city } = req.body;

    if (!stadium_name) {
      return res.status(400).json({
        success: false,
        message: "Stadium name is required"
      });
    }

    // insert
    const [result] = await db.query(
      `INSERT INTO STADIUMS (stadium_name, city)
       VALUES (?, ?)`,
      [stadium_name, city || null]
    );

    const [rows] = await db.query(
      `SELECT * FROM STADIUMS WHERE stadium_id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Stadium created successfully!",
      data: rows[0]
    });

  } catch (error) {
    console.error("Error creating stadium:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating stadium",
      error: error.message
    });
  }
};

// ===================================================
// GET ALL STADIUMS
// ===================================================
const getAllStadiums = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM STADIUMS ORDER BY city ASC, stadium_name ASC`
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (error) {
    console.error("Error fetching stadiums:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching stadiums",
      error: error.message
    });
  }
};

// ===================================================
// GET ONE STADIUM BY ID
// ===================================================
const getStadiumById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM STADIUMS WHERE stadium_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Stadium not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    console.error("Error fetching stadium:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching stadium",
      error: error.message
    });
  }
};

// ===================================================
// UPDATE STADIUM
// ===================================================
const updateStadium = async (req, res) => {
  try {
    const { id } = req.params;
    const { stadium_name, city } = req.body;

    const [existing] = await db.query(
      `SELECT * FROM STADIUMS WHERE stadium_id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Stadium not found"
      });
    }

    await db.query(
      `UPDATE STADIUMS 
       SET stadium_name = ?, city = ?
       WHERE stadium_id = ?`,
      [stadium_name || existing[0].stadium_name, city || existing[0].city, id]
    );

    const [updated] = await db.query(
      `SELECT * FROM STADIUMS WHERE stadium_id = ?`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Stadium updated successfully",
      data: updated[0]
    });

  } catch (error) {
    console.error("Error updating stadium:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating stadium",
      error: error.message
    });
  }
};

// ===================================================
// DELETE STADIUM
// ===================================================
const deleteStadium = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `DELETE FROM STADIUMS WHERE stadium_id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Stadium not found or already deleted"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Stadium deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting stadium:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting stadium",
      error: error.message
    });
  }
};

// ===================================================
// EXPORT FUNCTIONS
// ===================================================
module.exports = {
  createStadium,
  getAllStadiums,
  getStadiumById,
  updateStadium,
  deleteStadium
};
