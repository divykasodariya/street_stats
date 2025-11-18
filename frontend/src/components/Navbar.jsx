import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    console.log(stored)
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    nav("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">

        {/* LEFT SIDE — BRAND */}
        <Link to="/home" className="text-2xl font-bold text-blue-600">
          StreetStats
        </Link>

        {/* RIGHT SIDE — LOGIN + TOURNAMENTS */}
        <div className="flex items-center space-x-6 text-gray-700 font-medium">

          <Link
            to="/home"
            className="hover:text-blue-600 transition-colors"
          >
            Tournaments
          </Link>
          

          {user ? (
            <>
              <span className="text-sm text-gray-700">
                {user.username}
              </span>
              <button
                onClick={logout}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => nav("/login")}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
