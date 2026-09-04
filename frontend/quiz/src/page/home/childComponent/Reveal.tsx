import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  revealContainer: {
    width: "100%",
    overflow: "hidden",
  },

  reveal: {
    opacity: 0,
    transition: "opacity 700ms ease, transform 700ms ease",
  },

  fromTop: {
    transform: "translateY(-100px)",
  },

  fromLeft: {
    transform: "translateX(-100px)",
  },

  fromRight: {
    transform: "translateX(100px)",
  },

  visible: {
    opacity: 1,
    transform: "translate(0, 0)",
  },
});

type RevealProps = {
  children: ReactNode;
  direction?: "top" | "left" | "right";
};

export default function Reveal({ children, direction = "left" }: RevealProps) {
  const classes = useStyles();

  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      {
        threshold: 0.15,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const directionClass =
    direction === "top"
      ? classes.fromTop
      : direction === "left"
        ? classes.fromLeft
        : classes.fromRight;

  return (
    <div ref={ref} className={classes.revealContainer}>
      <div
        className={`${classes.reveal} ${directionClass} ${
          visible ? classes.visible : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
