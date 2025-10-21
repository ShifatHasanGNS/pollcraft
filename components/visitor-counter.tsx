"use client";

import { useEffect, useState } from "react";

type VisitorCounterProps = {
  initialLabel: string;
  needsRegistration: boolean;
};

export default function VisitorCounter({ initialLabel, needsRegistration }: VisitorCounterProps) {
  const [label, setLabel] = useState(initialLabel);

  useEffect(() => {
    if (!needsRegistration) {
      return;
    }

    let cancelled = false;

    async function registerVisitor() {
      try {
        const response = await fetch("/api/metrics/visitor", {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to register visitor: ${response.status}`);
        }

        const data: { visitorCount?: number } = await response.json();

        if (!cancelled && typeof data.visitorCount === "number") {
          setLabel(new Intl.NumberFormat().format(data.visitorCount));
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[visitor-counter] failed to register visitor", error);
        }
      }
    }

    registerVisitor();

    return () => {
      cancelled = true;
    };
  }, [needsRegistration]);

  return <>{label}</>;
}
