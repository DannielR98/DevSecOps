import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "../home/HomePage";
import RegisterPage from "../Register/RegisterPage";
import LoginPage from "../Login/LoginPage";
import Navigation from "../Navigation/Navigation";
import UpdateUserInfo from "../UpdateUserInfo.tsx/UpdateUserInfo";
import UserInfoPage from "../UserInfoPage/UserInfoPage";
import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  mainWrapper: {
    marginTop: "100px",
  },
});

export default function RouterPage() {
  const classes = useStyles();
  return (
    <Router>
      <Navigation />
      <div className={classes.mainWrapper}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/update-user" element={<UpdateUserInfo />} />
          <Route path="/user-info/:id" element={<UserInfoPage />} />
        </Routes>
      </div>
    </Router>
  );
}
