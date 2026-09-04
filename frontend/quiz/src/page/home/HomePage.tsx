import { useAuth0 } from "@auth0/auth0-react";
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
});

export default function HomePage() {
  const { isAuthenticated, user } = useAuth0();
  const classes = useStyles();

  return (
    <main className={classes.page}>
      {isAuthenticated && user ? (
        <div style={{ padding: "2rem", fontFamily: "sans-serif", textAlign: "center" }}>
          <div style={{ backgroundColor: "#f3f4f6", padding: "1.5rem", borderRadius: "8px", maxWidth: "600px", margin: "0 auto 2rem" }}>
            <h2>Hello, {user.name || user.nickname || "User"}! 👋</h2>
            <p style={{ color: "#4b5563", marginTop: "0.25rem" }}>Logged in as: {user.email}</p>
            <p style={{ color: "#10b981", fontWeight: "bold", marginTop: "0.5rem" }}>
              ✓ Authenticated securely via Auth0 (OAuth 2.0 / OIDC)
            </p>
          </div>

          <GroupDashboard />
          <QuizManager />
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

