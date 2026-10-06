import React from "react";
import { InlineFeedback } from "@/components/game/InlineFeedback";
import type { Feedback } from "@/state/playTypes";

interface FeedbackBoxProps {
  feedback: Feedback | null;
  persistentWarning?: Feedback | null;
  className?: string;
}

export function FeedbackBox({ feedback, persistentWarning, className = "" }: FeedbackBoxProps) {
  const active = feedback || persistentWarning;

  return (
    <div className={`min-h-[56px] ${className}`.trim()}>
      {active && <InlineFeedback tone={active.tone}>{active.text}</InlineFeedback>}
    </div>
  );
}
