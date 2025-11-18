import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function MatchScore() {
  const { id } = useParams(); // match_id
  const [match, setMatch] = useState(null);
  const [team1Players, setTeam1Players] = useState([]);
  const [team2Players, setTeam2Players] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchScorecard = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/matches/${id}/scorecard`
      );

      if (res.data.success) {
        const m = res.data.match;
        const players = res.data.players;

        setMatch(m);

        // 🟦 Split by teams
        setTeam1Players(players.filter((p) => p.team_id === m.team1_id));
        setTeam2Players(players.filter((p) => p.team_id === m.team2_id));
      }
    } catch (err) {
      console.error("Scorecard fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  // Auto refresh every 2 seconds
  useEffect(() => {
    fetchScorecard();
    const interval = setInterval(fetchScorecard, 2000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading || !match)
    return (
      <div className="h-screen flex justify-center items-center text-gray-500">
        Loading scorecard...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded shadow">

        {/* 🏏 MATCH TITLE */}
        <h1 className="text-2xl font-bold mb-1 text-center">
          {match.team1_name} vs {match.team2_name}
        </h1>

        {/* Tournament name + stadium */}
        <p className="text-center text-gray-600 mb-6">
          {match.tournament_name} — {match.stadium_name}
        </p>

        {/* SCORE SUMMARY */}
        <div className="grid grid-cols-2 gap-4 bg-gray-100 p-4 rounded-lg shadow-sm mb-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold">{match.team1_name}</h2>
            <p className="text-2xl font-bold text-blue-700">
              {match.team1_runs}/{match.team1_wickets}
            </p>
            <p className="text-sm text-gray-600">{match.team1_overs} overs</p>
          </div>

          <div className="text-center">
            <h2 className="text-lg font-semibold">{match.team2_name}</h2>
            <p className="text-2xl font-bold text-red-700">
              {match.team2_runs}/{match.team2_wickets}
            </p>
            <p className="text-sm text-gray-600">{match.team2_overs} overs</p>
          </div>
        </div>

        {/* TEAM 1 PLAYER TABLE */}
        <SectionTitle title={`${match.team1_name} Batting`} />
        <PlayerTable players={team1Players} />

        {/* TEAM 2 PLAYER TABLE */}
        <SectionTitle title={`${match.team2_name} Batting`} />
        <PlayerTable players={team2Players} />
      </div>
    </div>
  );
}

// 🔵 Section Header Component
function SectionTitle({ title }) {
  return (
    <h2 className="text-xl font-semibold mt-6 mb-2 border-b pb-1">
      {title}
    </h2>
  );
}

// 🔥 Player Table Component
function PlayerTable({ players }) {
  if (players.length === 0)
    return <p className="text-gray-500 mb-4">No player stats yet.</p>;

  return (
    <table className="w-full border mb-6 text-sm">
      <thead>
        <tr className="bg-gray-200">
          <th className="p-2 text-left">Player</th>
          <th className="p-2 text-center">Runs</th>
          <th className="p-2 text-center">Balls</th>
          <th className="p-2 text-center">SR</th>
          <th className="p-2 text-center">Wkts</th>
          <th className="p-2 text-center">Overs</th>
        </tr>
      </thead>

      <tbody>
        {players.map((p) => (
          <tr key={p.user_id} className="border-b">
            <td className="p-2">{p.full_name}</td>
            <td className="p-2 text-center">{p.runs_scored}</td>
            <td className="p-2 text-center">{p.balls_faced}</td>
            <td className="p-2 text-center">{p.strike_rate}</td>
            <td className="p-2 text-center">{p.wickets_taken}</td>
            <td className="p-2 text-center">{p.overs_bowled}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
