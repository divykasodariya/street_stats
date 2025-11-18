import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Replace this with your actual API
        const res = await axios.get("http://localhost:5000/api/users/1");
        setUser(res.data.data || res.data);
      } catch (err) {
        setError("Failed to fetch user details");
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white shadow p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        {error && <p className="text-red-500">{error}</p>}
        {user ? (
          <div>
            <p>
              <strong>Username:</strong> {user.username}
            </p>
            <p>
              <strong>Full Name:</strong> {user.full_name || "N/A"}
            </p>
          </div>
        ) : (
          <p>Loading user data...</p>
        )}

        <button
          onClick={() => navigate("/login")}
          className="mt-6 w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
