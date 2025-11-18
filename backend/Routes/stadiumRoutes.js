const express = require("express");
const router = express.Router();
const {
  createStadium,
  getAllStadiums,
  getStadiumById,
  updateStadium,
  deleteStadium
} = require("../controllers/stadiumController");
const { authenticate } = require("../middlewares/auth");

// If only admins should create/edit/delete stadiums:
// const { authenticate } = require("../middlewares/auth.js");

// Public routes
router.get("/", getAllStadiums);
router.get("/:id", getStadiumById);

// Admin-only routes
router.post("/", authenticate, createStadium);
router.put("/:id", authenticate, updateStadium);
router.delete("/:id", authenticate, deleteStadium);

module.exports = router;
