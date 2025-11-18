import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useNavigate } from "react-router-dom";
export default function TournamentDetails() {
  const { id } = useParams(); // tournament_id
  const [tab, setTab] = useState("matches");

  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stadiums, setStadiums] = useState([]);
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add Match Modal
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [formData, setFormData] = useState({
    team1_id: "",
    team2_id: "",
    stadium_id: "",
    match_date: "",
    match_type: "T20",
    toss_winner_team_id: "",
    toss_decision: "",
  });

  // Add Team Modal
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [playerUsernames, setPlayerUsernames] = useState([""]); // start with 1

  // 🟢 Fetch matches + basic teams + stadiums + full players
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matchesRes, teamsRes, stadiumsRes] = await Promise.allSettled([
          axios.get(`http://localhost:5000/api/matches/tournament/${id}`),
          axios.get(`http://localhost:5000/api/teams/tournament/${id}`),
          axios.get(`http://localhost:5000/api/stadiums`),
        ]);

        // Matches
        if (matchesRes.status === "fulfilled" && matchesRes.value.data.success) {
          setMatches(matchesRes.value.data.data || []);
        }

        // Stadiums
        if (stadiumsRes.status === "fulfilled" && stadiumsRes.value.data.success) {
          setStadiums(stadiumsRes.value.data.data || []);
        }

        // Teams + Fetch players for each team
        let baseTeams = [];
        if (teamsRes.status === "fulfilled" && teamsRes.value.data.success) {
          baseTeams = teamsRes.value.data.data;
        }

        const fullTeams = await Promise.all(
          baseTeams.map(async (t) => {
            try {
              const res = await axios.get(`http://localhost:5000/api/teams/${t.team_id}`);
              return { ...t, players: res.data.players || [] };
            } catch {
              return { ...t, players: [] };
            }
          })
        );

        setTeams(fullTeams);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);
  // 🔄 Auto-refresh match scores every 2 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/matches/tournament/${id}`);
      if (res.data.success) {
        setMatches(res.data.data);
      }
    } catch (err) {
      console.log("Auto-refresh failed", err);
    }
  }, 2000);

  return () => clearInterval(interval);
}, [id]);



  // handle match click ie nav to admin
  const handleMatchClick = async(m)=>{
    console.log(m);
    window.open(`/admin/match/${m}`, "_blank");

    nav(`/admin/match/${m}`)
  }
  const handleMatchScore = async(m)=>{
    console.log(m);
    nav(`/match/${m}`)

  }
  // 🟣 Add Team Handler
  const handleAddTeam = async (e) => {
    e.preventDefault();
    try {
      // 1️⃣ Create the team
      const res = await axios.post(
        "http://localhost:5000/api/teams",
        { team_name: teamName, tournament_id: id },
        { withCredentials: true }
      );

      if (!res.data.success) throw new Error("Team creation failed");

      const teamId = res.data.data.team_id;

      // 2️⃣ Add players one by one
      for (const username of playerUsernames) {
        if (username.trim()) {
          await axios.post(
            `http://localhost:5000/api/teams/${teamId}/players`,
            { username },
            { withCredentials: true }
          );
        }
      }

      // 3️⃣ Refresh teams with players
      const teamsRes = await axios.get(`http://localhost:5000/api/teams/tournament/${id}`);
      const basicTeams = teamsRes.data.data || [];

      const fullTeams = await Promise.all(
        basicTeams.map(async (t) => {
          const res = await axios.get(`http://localhost:5000/api/teams/${t.team_id}`);
          return { ...t, players: res.data.players || [] };
        })
      );

      setTeams(fullTeams);

      // Reset modal
      setTeamName("");
      setPlayerUsernames([""]);
      setShowAddTeam(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add team or players");
    }
  };

  // Player input update
  const handlePlayerChange = (idx, value) => {
    const updated = [...playerUsernames];
    updated[idx] = value;
    setPlayerUsernames(updated);
  };

  // 🟣 Add Match Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, tournament_id: id };

      const res = await axios.post(
        "http://localhost:5000/api/matches",
        payload,
        { withCredentials: true }
      );

      if (!res.data.success) throw new Error(res.data.message);

      // Add to list
      setMatches((prev) => [...prev, res.data.data]);
      setShowAddMatch(false);

      // Clear form
      setFormData({
        team1_id: "",
        team2_id: "",
        stadium_id: "",
        match_date: "",
        match_type: "T20",
        toss_winner_team_id: "",
        toss_decision: "",
      });
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create match");
    }
  };

  // Loading + Error
  if (loading)
    return <div className="h-screen flex justify-center items-center">Loading...</div>;

  if (error)
    return <div className="h-screen flex justify-center items-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tournament Overview</h1>

          {/* Only Add Match button here */}
          <button
            onClick={() => setShowAddMatch(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Add Match
          </button>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setTab("matches")}
            className={`px-4 py-2 rounded ${tab === "matches" ? "bg-blue-600 text-white" : "bg-gray-300"}`}
          >
            Matches
          </button>
          <button
            onClick={() => setTab("teams")}
            className={`px-4 py-2 rounded ${tab === "teams" ? "bg-blue-600 text-white" : "bg-gray-300"}`}
          >
            Teams
          </button>
        </div>

        {/* MATCHES TAB */}
        {tab === "matches" && (
          <div >
            {matches.length === 0 ? (
              <p>No matches found</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.map((m) => (
                  <div key={m.match_id} onClick={()=>handleMatchScore(m.match_id)} className="border rounded p-4 shadow">
                    <h3 className="text-lg font-bold">{m.team1} vs {m.team2}</h3>
                    <p>{m.stadium_name}</p>
                    <p>{m.match_date ? new Date(m.match_date).toLocaleDateString() : "N/A"}</p>
                    <p>{m.team1_score || "0/0"} • {m.team2_score || "0/0"}</p>
                    <button  onClick={()=>handleMatchClick(m.match_id) } className="px-2 py-1 rounded bg-blue-600 text-white">edit</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TEAMS TAB */}
        {tab === "teams" && (
          <div>
            <div className="flex justify-between mb-6">
              <h2 className="text-2xl font-semibold">Teams</h2>
              <button
                onClick={() => setShowAddTeam(true)}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Add Team
              </button>
            </div>

            {teams.length === 0 ? (
              <p>No teams yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((t) => (
                  <div key={t.team_id} className="border rounded p-5 shadow">
                    <h3 className="text-lg font-semibold">{t.team_name}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      Players: {t.players?.length || 0}
                    </p>

                    {t.players?.length > 0 && (
                      <ul className="list-disc ml-4 text-sm">
                        {t.players.map((p, idx) => (
                          <li key={idx}>
                            <strong>{p.full_name}</strong> — {p.player_role}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ADD TEAM MODAL */}
      {showAddTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded p-6 w-full max-w-md relative">
            <button
              onClick={() => setShowAddTeam(false)}
              className="absolute top-3 right-4 text-gray-600 text-xl"
            >
              ×
            </button>

            <h2 className="text-xl font-bold mb-4">Create Team</h2>

            <form onSubmit={handleAddTeam} className="space-y-4">
              {/* Team Name */}
              <div>
                <label>Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  className="w-full border rounded px-3 py-2 mt-1"
                />
              </div>

              {/* Player Inputs */}
              <div>
                <label className="block mb-2">Players (Usernames)</label>

                {playerUsernames.map((u, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder={`Player ${idx + 1} username`}
                      value={u}
                      onChange={(e) => handlePlayerChange(idx, e.target.value)}
                      className="border rounded px-3 py-2 flex-1"
                    />

                    {/* Remove */}
                    {playerUsernames.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPlayerUsernames(playerUsernames.filter((_, i) => i !== idx))
                        }
                        className="px-2 text-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                {/* Add more */}
                <button
                  type="button"
                  onClick={() =>
                    playerUsernames.length < 11
                      ? setPlayerUsernames([...playerUsernames, ""])
                      : alert("Max 11 players")
                  }
                  className="text-blue-600 mt-2"
                >
                  + Add Player
                </button>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  Create Team + Players
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MATCH MODAL */}
      {showAddMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded p-6 w-full max-w-md relative">
            <button
              onClick={() => setShowAddMatch(false)}
              className="absolute top-3 right-4 text-xl text-gray-600"
            >
              ×
            </button>

            <h2 className="text-xl font-bold mb-4">Schedule Match</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Team 1 */}
              <div>
                <label>Team 1</label>
                <select
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={formData.team1_id}
                  onChange={(e) => setFormData({ ...formData, team1_id: e.target.value })}
                  required
                >
                  <option value="">Select Team 1</option>
                  {teams.map((t) => (
                    <option key={t.team_id} value={t.team_id}>
                      {t.team_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Team 2 */}
              <div>
                <label>Team 2</label>
                <select
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={formData.team2_id}
                  onChange={(e) => setFormData({ ...formData, team2_id: e.target.value })}
                  required
                >
                  <option value="">Select Team 2</option>
                  {teams.map((t) => (
                    <option key={t.team_id} value={t.team_id}>
                      {t.team_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stadium */}
              <div>
                <label>Stadium</label>
                <select
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={formData.stadium_id}
                  onChange={(e) => setFormData({ ...formData, stadium_id: e.target.value })}
                  required
                >
                  <option value="">Select Stadium</option>
                  {stadiums.map((s) => (
                    <option key={s.stadium_id} value={s.stadium_id}>
                      {s.stadium_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label>Match Date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={formData.match_date}
                  onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                  required
                />
              </div>

              {/* Toss Winner */}
              <div>
                <label>Toss Winner</label>
                <select
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={formData.toss_winner_team_id}
                  onChange={(e) =>
                    setFormData({ ...formData, toss_winner_team_id: e.target.value })
                  }
                  required
                >
                  <option value="">Select</option>
                  {teams.map((t) => (
                    <option key={t.team_id} value={t.team_id}>
                      {t.team_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toss Decision */}
              <div>
                <label>Toss Decision</label>
                <select
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={formData.toss_decision}
                  onChange={(e) => setFormData({ ...formData, toss_decision: e.target.value })}
                  required
                >
                  <option value="">Select</option>
                  <option value="BAT">BAT</option>
                  <option value="BOWL">BOWL</option>
                </select>
              </div>

              <div className="flex justify-end pt-3">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                  Create Match
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
