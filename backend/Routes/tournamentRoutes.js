const { createTournament, getTournamentById, getAllTournaments, deleteTournament } = require('../controllers/tournamentController');
const { authenticate } = require('../middlewares/auth');
const router = require('express').Router()

router.post('/create',authenticate,createTournament)
router.get('/:id', getTournamentById);
router.get('/',getAllTournaments)
router.delete('/:id', authenticate, deleteTournament);


module.exports = router;