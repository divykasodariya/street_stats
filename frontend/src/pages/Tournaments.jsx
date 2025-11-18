import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    tournament_name: "",
    location: "",
    start_date: "",
    end_date: "",
  });

  const nav = useNavigate();

  // 🟢 Fetch tournaments
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/tournaments/");
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Failed to load");
        setTournaments(data.data);
      } catch (err) {
        console.error(err);
        setError("Unable to fetch tournaments.");
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  // 🟢 Handle form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🟢 Handle create tournament
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:5000/api/tournaments/create",
        formData,
        { withCredentials: true }
      );

      if (!res.data.success) throw new Error(res.data.message);
      setTournaments((prev) => [...prev, res.data.data]);
      setShowModal(false);
      setFormData({ tournament_name: "", location: "", start_date: "", end_date: "" });
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to create tournament");
    }
  };

  // 🟡 Loading / Error states
  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-xl text-gray-600">
        Loading tournaments...
      </div>
    );

  if (error)
    return (
      <div className="h-screen flex items-center justify-center text-red-500 text-lg">
        {error}
      </div>
    );

  // 🟢 Main UI
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">All Tournaments</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Tournament
        </button>
      </div>

      {tournaments.length === 0 ? (
        <p className="text-center text-gray-600 text-lg">No tournaments found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <div
              key={t.tournament_id}
              onClick={() => nav(`/tournament/${t.tournament_id}`)}
              className="bg-white border border-gray-200 rounded-lg shadow-md p-5 hover:shadow-lg transition cursor-pointer"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t.tournament_name}
              </h2>
              <p className="text-sm text-gray-500 mb-1">
                Admin: {t.admin_name || "Unknown"}
              </p>
              <p className="text-sm text-gray-500 mb-1">
                Location: {t.location || "Not specified"}
              </p>
              <p className="text-sm text-gray-500 mb-1">
                Start: {t.start_date || "N/A"}
              </p>
              <p className="text-sm text-gray-500">
                End: {t.end_date || "N/A"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 🟣 Modal for adding tournament */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-xl"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 text-center text-gray-800">
              Create New Tournament
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tournament Name
                </label>
                <input
                  type="text"
                  name="tournament_name"
                  value={formData.tournament_name}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
