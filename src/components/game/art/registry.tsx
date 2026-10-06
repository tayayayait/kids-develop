import React from "react";
import { PieceArt, PatternArt } from "../Visuals";
import type { Problem } from "@/domain/types";

export type PieceArtRenderer = (props: {
  rotation: number;
  className?: string | undefined;
}) => React.JSX.Element;

const pieceAssetRegistry: Record<string, PieceArtRenderer> = {
  "assets/pieces/straight-blue.svg": ({ rotation, className }) => (
    <PieceArt
      shape="straight"
      rotation={rotation}
      {...(className !== undefined ? { className } : {})}
    />
  ),
  "assets/pieces/corner-blue.svg": ({ rotation, className }) => (
    <PieceArt
      shape="corner"
      rotation={rotation}
      {...(className !== undefined ? { className } : {})}
    />
  ),
};

export interface RenderPieceProps {
  asset: string;
  rotation: number;
  className?: string | undefined;
}

export function PieceImage({ asset, rotation, className }: RenderPieceProps) {
  const Renderer = pieceAssetRegistry[asset];
  if (Renderer) {
    return <Renderer rotation={rotation} {...(className !== undefined ? { className } : {})} />;
  }
  return (
    <img
      src={`/${asset}`}
      alt=""
      className={className}
      style={{ transform: `rotate(${rotation}deg)` }}
      draggable={false}
    />
  );
}

export interface RenderPatternProps {
  problem: Problem;
  className?: string | undefined;
}

export function PatternImage({ problem, className }: RenderPatternProps) {
  if (problem.pattern.asset) {
    return (
      <img
        src={`/${problem.pattern.asset}`}
        alt={problem.pattern.alt}
        className={className}
        draggable={false}
      />
    );
  }
  return <PatternArt problem={problem} {...(className !== undefined ? { className } : {})} />;
}
