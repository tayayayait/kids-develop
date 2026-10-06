import type { Problem, Side } from "@/domain/types";

export function PieceArt({
  shape,
  rotation,
  className,
}: {
  shape: "straight" | "corner";
  rotation: number;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g
        className="piece-rot"
        style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "50px 50px" }}
      >
        {shape === "straight" ? (
          <>
            <line x1="0" y1="50" x2="100" y2="50" stroke="var(--piece-blue)" strokeWidth="16" />
            <circle cx="4" cy="50" r="10" fill="var(--piece-blue)" />
            <circle cx="96" cy="50" r="10" fill="var(--piece-blue)" />
          </>
        ) : (
          <>
            <path
              d="M50 0 L50 30 Q50 50 70 50 L100 50"
              fill="none"
              stroke="var(--piece-blue)"
              strokeWidth="16"
            />
            <circle cx="50" cy="4" r="10" fill="var(--piece-blue)" />
            <circle cx="96" cy="50" r="10" fill="var(--piece-blue)" />
          </>
        )}
      </g>
    </svg>
  );
}

const termPos = (row: number, col: number, side: Side) => {
  const cx = col * 20 + 10,
    cy = row * 20 + 10;
  if (side === "W") return [col * 20 - 3, cy];
  if (side === "E") return [col * 20 + 23, cy];
  if (side === "N") return [cx, row * 20 - 3];
  return [cx, row * 20 + 23];
};

/** 도안: 문제에 제시된 정보(끝점·금지칸)만 표시하고 정답 경로는 그리지 않는다. */
export function PatternArt({ problem, className }: { problem: Problem; className?: string }) {
  return (
    <svg viewBox="-8 -8 116 116" className={className} role="img" aria-label={problem.pattern.alt}>
      <rect
        x="-6"
        y="-6"
        width="112"
        height="112"
        rx="6"
        fill="var(--card)"
        stroke="var(--control)"
        strokeWidth="1.5"
      />
      {Array.from({ length: 25 }, (_, i) => {
        const r = Math.floor(i / 5),
          c = i % 5;
        const blocked = problem.board.blockedCells.some((b) => b.row === r && b.col === c);
        return (
          <rect
            key={i}
            x={c * 20 + 1}
            y={r * 20 + 1}
            width="18"
            height="18"
            rx="3"
            fill={blocked ? "var(--disabled)" : "var(--background)"}
            stroke="var(--border)"
            strokeWidth="1"
          />
        );
      })}
      {problem.board.blockedCells.map((b, i) => (
        <path
          key={i}
          d={`M${b.col * 20 + 4} ${b.row * 20 + 16} L${b.col * 20 + 16} ${b.row * 20 + 4}`}
          stroke="var(--control)"
          strokeWidth="1.5"
        />
      ))}
      {problem.judge.mode === "connection" &&
        problem.judge.terminals.map((t) => {
          const [x, y] = termPos(t.cell.row, t.cell.col, t.side);
          return <circle key={t.id} cx={x} cy={y} r="4" fill="var(--piece-blue)" />;
        })}
    </svg>
  );
}
