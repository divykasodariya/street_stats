import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Tournaments from "./pages/Tournaments";
import TournamentDetails from "./pages/TournamentDetails";
import AdminScorePage from "./pages/AdminScorePage";
import Navbar from "./components/Navbar";
import MatchScore from "./pages/MatchScore";

export default function App() {
  return (
    <Router>
        <Navbar />
      <Routes>
        {/* Home redirects to login by default */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Auth pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />


        <Route path="/home" element={<Tournaments />}/>
         <Route path="/tournament/:id" element={<TournamentDetails />} />
         <Route path="/admin/match/:id" element={<AdminScorePage />} />
        {/* 404 fallback */}
        <Route path="*" element={<h1 className="text-center mt-20 text-2xl">404 - Page Not Found</h1>} />
        <Route path="/match/:id" element={<MatchScore />} />

      </Routes>
    </Router>
  );
}
