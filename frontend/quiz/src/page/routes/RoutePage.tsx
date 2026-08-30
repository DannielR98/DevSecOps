import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "../home/HomePage";
import RegisterPage from "../Register/RegisterPage";
import LoginPage from "../Login/LoginPage";

export default function RouterPage() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}
