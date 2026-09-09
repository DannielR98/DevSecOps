import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import GroupDashboard from "../../components/GroupDashboard";
import QuizManager from "../../components/QuizManager";
import { createUseStyles } from "react-jss";

import HeroSection from "./childComponent/HeroSection";
import FeaturesSection from "./childComponent/FeaturesSection";
import HowItWorksSection from "./childComponent/HowItWorksSection";
import RolesSection from "./childComponent/RolesSection";
import ChallengeSection from "./childComponent/ChallengeSection";
import StatsSection from "./childComponent/StatsSection";
import Reveal from "./childComponent/Reveal";
import StartSection from "./childComponent/StartSection";

const useStyles = createUseStyles({
  page: {
    minHeight: "100vh",
    overflowX: "hidden",
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "60vh",
    fontSize: "18px",
    color: "#4b5563",
  },
});

export default function HomePage() {
  const { isAuthenticated: isAuth0Authenticated, user: auth0User, isLoading } = useAuth0();
  const { isAuth, userStorage } = useSelector((state: RootState) => state.authSlice);
  const classes = useStyles();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleGroupChange = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const loggedIn = Boolean((isAuth0Authenticated && auth0User) || (isAuth && userStorage));
  const currentUser = auth0User || userStorage;

  if (isLoading && !isAuth) {
    return (
      <main className={classes.page}>
        <div className={classes.loadingContainer}>
          <p>Laddar inloggningsstatus...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={classes.page}>
      {loggedIn && currentUser ? (
        <div style={{ padding: "2rem", fontFamily: "sans-serif", textAlign: "center" }}>
          <div style={{ backgroundColor: "#f3f4f6", padding: "1.5rem", borderRadius: "8px", maxWidth: "600px", margin: "0 auto 2rem" }}>
            <h2>Hej, {currentUser.name || currentUser.nickname || currentUser.email || "Användare"}! 👋</h2>
            <p style={{ color: "#4b5563", marginTop: "0.25rem" }}>Inloggad som: {currentUser.email}</p>
            <p style={{ color: "#10b981", fontWeight: "bold", marginTop: "0.5rem" }}>
              ✓ Säkert autentiserad via Auth0 (OAuth 2.0 / OIDC)
            </p>
          </div>

          <GroupDashboard onGroupChange={handleGroupChange} />
          <QuizManager refreshKey={refreshKey} />
        </div>
      ) : (
        <>
          <Reveal direction="top">
            <HeroSection />
          </Reveal>

          <Reveal direction="top">
            <StartSection />
          </Reveal>

          <Reveal direction="left">
            <FeaturesSection />
          </Reveal>

          <Reveal direction="top">
            <RolesSection />
          </Reveal>

          <Reveal direction="right">
            <HowItWorksSection />
          </Reveal>

          <Reveal direction="left">
            <ChallengeSection />
          </Reveal>

          <Reveal direction="right">
            <StatsSection />
          </Reveal>
        </>
      )}
    </main>
  );
}


