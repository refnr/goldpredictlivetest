import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState<"enter" | "exit">("enter");
  const previousLocation = useRef(location);

  useEffect(() => {
    if (location !== previousLocation.current) {
      setTransitionStage("exit");
      const timeout = setTimeout(() => {
        previousLocation.current = location;
        setDisplayChildren(children);
        setTransitionStage("enter");
      }, 200);
      return () => clearTimeout(timeout);
    } else {
      setDisplayChildren(children);
    }
  }, [location, children]);

  return (
    <div
      className={`page-transition ${transitionStage === "enter" ? "page-enter" : "page-exit"}`}
      data-testid="page-transition-wrapper"
    >
      {displayChildren}
    </div>
  );
}
