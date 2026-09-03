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
  const classes = useStyles();

  return (
    <main className={classes.page}>
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
    </main>
  );
}
