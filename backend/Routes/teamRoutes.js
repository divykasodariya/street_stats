const { createTeam,
  getAllTeams,
  getTeamsByTournament,
  getTeamWithPlayers,
  addPlayerToTeam,
  deleteTeam } = require('../controllers/teamController');
const { authenticate } = require('../middlewares/auth');

const teamrouter = require('express').Router();


teamrouter.post('/create',authenticate,createTeam)
teamrouter.post("/", authenticate, createTeam);
teamrouter.get("/", getAllTeams);
teamrouter.get("/tournament/:tournament_id", getTeamsByTournament);
teamrouter.get("/:team_id", getTeamWithPlayers);
teamrouter.post("/:team_id/players", authenticate, addPlayerToTeam);
teamrouter.delete("/:team_id", authenticate, deleteTeam);
module.exports=teamrouter