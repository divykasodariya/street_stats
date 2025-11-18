import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function AdminScorePage() {
  const { id } = useParams(); // match_id

  const [match, setMatch] = useState(null);
  const [team, setTeam] = useState(1);

  const [teamPlayers, setTeamPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch match + teams + players
  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/matches/${id}`);
        setMatch(res.data.data);

        // fetch players for each team
        const t1 = await axios.get(
          `http://localhost:5000/api/teams/${res.data.data.team1_id}`
        );
        const t2 = await axios.get(
          `http://localhost:5000/api/teams/${res.data.data.team2_id}`
        );

        setTeamPlayers({
          1: t1.data.players || [],
          2: t2.data.players || [],
        });
      } catch (err) {
        setError("Failed to fetch match data");
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [id]);

  // UPDATE MATCH + PLAYER PERFORMANCE
  const handleScoreUpdate = async (runs, isWicket = false) => {
    if (!selectedPlayer) {
      alert("Select a player first!");
      return;
    }

    try {
      // 1️⃣ Update match score
      const matchRes = await axios.post(
        `http://localhost:5000/api/matches/${id}/update`,
        { team, runs, isWicket },
        { withCredentials: true }
      );

      // 2️⃣ Update player performance
      const playerRes = await axios.patch(
        `http://localhost:5000/api/matches/${id}/players/performance`,
        {
          user_id: selectedPlayer,
          runs_scored: runs,
          balls_faced: 1,
        },
        { withCredentials: true }
      );

      // update state
      setMatch(matchRes.data.data);
    } catch (err) {
      console.error(err);
      alert("Failed to update score");
    }
  };

  if (loading)
    return <div className="h-screen flex justify-center items-center">Loading match...</div>;

  if (error)
    return <div className="h-screen flex justify-center items-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white shadow p-6 rounded">

        <h1 className="text-2xl font-bold text-center mb-4">Admin Score Panel</h1>

        <h2 className="text-xl text-center font-semibold mb-2">
          {match.team1} vs {match.team2}
        </h2>

        {/* TEAM SELECT */}
        <div className="flex justify-center gap-3 mb-6">
          <button
            onClick={() => {
              setTeam(1);
              setSelectedPlayer("");
            }}
            className={`px-4 py-2 rounded ${
              team === 1 ? "bg-blue-600 text-white" : "bg-gray-300"
            }`}
          >
            {match.team1}
          </button>

          <button
            onClick={() => {
              setTeam(2);
              setSelectedPlayer("");
            }}
            className={`px-4 py-2 rounded ${
              team === 2 ? "bg-blue-600 text-white" : "bg-gray-300"
            }`}
          >
            {match.team2}
          </button>
        </div>

        {/* PLAYER SELECT */}
        <div className="mb-6">
          <label className="block text-sm font-medium">Select Batsman</label>
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="w-full border rounded px-3 py-2 mt-1"
          >
            <option value="">Choose Player</option>
            {teamPlayers[team].map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* SCORE BUTTONS */}
        <div className="flex justify-center gap-3 mt-4 mb-6">
          {[0,1,2,3,4,5,6].map((run) => (
            <button
              key={run}
              onClick={() => handleScoreUpdate(run, false)}
              className="px-4 py-2 bg-green-600 text-white rounded shadow"
            >
              {run}
            </button>
          ))}

          <button
            onClick={() => handleScoreUpdate(0, true)}
            className="px-4 py-2 bg-red-600 text-white rounded shadow"
          >
            Wicket
          </button>
        </div>

        {/* SCORE DISPLAY */}
        <div className="text-center bg-gray-100 p-4 rounded">
          <p className="text-lg font-semibold">
            {match.team1}: {match.team1_score}
          </p>
          <p className="text-lg font-semibold">
            {match.team2}: {match.team2_score}
          </p>
          {match.winner && (
            <p className="text-green-600 font-bold mt-2">
              Winner: {match.winner}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
