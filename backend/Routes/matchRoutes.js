const express = require('express');
const router = express.Router();

// Import the match controller functions from the file you provided
const {
    createMatch,
    getAllMatches,
    getMatchById,
    updateMatchScore,
    finalizeMatch,
    deleteMatch,
    updatePlayerPerformance,
    getMatchesByTournamentId,
    getPlayersByMatch,
    getMatchSummary,
    updateMatchScoresimple,
    getMatchScorecard
} = require('../controllers/matchController');
const { authenticate } = require('../middlewares/auth');


// ------------------------------

// Public Routes (Anyone can view matches)
router.get('/', getAllMatches);
router.get('/:id', getMatchById);
router.get('/tournament/:id',getMatchesByTournamentId)
router.get('/players/:matchId',getPlayersByMatch)
// authenticateed Routes (Require Authentication and often Authorization)

// ADMIN ACTIONS: Create, Finalize, Delete
router.post('/', authenticate, createMatch);
router.patch('/:id/finalize', authenticate, finalizeMatch);
router.delete('/:id', authenticate, deleteMatch);

// Note: Changed player update endpoint to include match_id in params as the controller uses it.
// router.patch('/:id/score', authenticate, updateMatchScore); // Update aggregated match score (runs, wickets, overs)
router.patch('/:match_id/players/performance', authenticate, updatePlayerPerformance); // Update individual player stats (used by controllers/updatePlayerPerformance)


router.get("/summary/:match_id", getMatchSummary);
router.post("/:match_id/update", authenticate, updateMatchScoresimple);
router.get("/:matchId/scorecard", getMatchScorecard);
router.post('/:matchId/update', authenticate, updateMatchScore);
module.exports = router;