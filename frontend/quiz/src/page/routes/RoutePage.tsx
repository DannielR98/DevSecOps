import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "../home/HomePage";
import RegisterPage from "../UserPages/Register/RegisterPage";
import LoginPage from "../UserPages/Login/LoginPage";
import Navbar from "../../components/Navbar";
import UpdateUserInfo from "../UserPages/UpdateUserInfo.tsx/UpdateUserInfo";
import UserInfoPage from "../UserPages/UserInfoPage/UserInfoPage";
import { createUseStyles } from "react-jss";
import Footer from "../../utilities/commonSection/Footer";

const useStyles = createUseStyles({
  mainWrapper: {
    marginTop: "100px",
  },
});

export default function RouterPage() {
  const classes = useStyles();
  return (
    <Router>
      <Navbar />
      <div className={classes.mainWrapper}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/update-user" element={<UpdateUserInfo />} />
          <Route path="/user-info/:id" element={<UserInfoPage />} />
        </Routes>
      </div>
      <Footer />
    </Router>
  );
}
