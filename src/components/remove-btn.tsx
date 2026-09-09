"use client";

import { useState, useRef } from "react";
import { X, Check } from "lucide-react";

// Two-click delete: first click arms it (shows a check + "confirm?" tooltip),
// second click within 3s actually removes. Prevents one-tap accidents.
//
// Lives in its own module rather than in lesson-content, so components that
// lesson-content itself renders can use it without an import cycle.
export function RemoveBtn({
  onClick, title = "Remove", size = "w-5 h-5", vis = "opacity-100 md:opacity-0 md:group-hover:opacity-100",
}: {
  onClick: () => void;
  title?: string;
  size?: string;
  vis?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disarm = () => { if (timer.current) clearTimeout(timer.current); setArmed(false); };
  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (armed) { disarm(); onClick(); return; }
    setArmed(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setArmed(false), 3000);
  };
  return (
    <button
      onClick={handle}
      onMouseLeave={disarm}
      title={armed ? "Click again to confirm removal" : title}
      className={`shrink-0 ${size} ${vis} rounded-full flex items-center justify-center cursor-pointer transition-opacity hover:brightness-110`}
      style={{ background: "#ed4245", border: "1px solid #ed4245", color: "#fff" }}
    >
      {armed ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={2.5} />}
    </button>
  );
}
