import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "../home/HomePage";
import RegisterPage from "../Register/RegisterPage";
import LoginPage from "../Login/LoginPage";
import Navbar from "../../components/Navbar";

export default function RouterPage() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}
