import type { PieceType, Rotation, Side } from "../types";

export const ROTATION_ORDER: Side[] = ["N", "E", "S", "W"];

export const rotateSide = (s: Side, rot: number): Side => {
  const steps = Math.floor((((rot % 360) + 360) % 360) / 90);
  return ROTATION_ORDER[(ROTATION_ORDER.indexOf(s) + steps) % 4]!;
};

export const OPPOSITE_SIDE: Record<Side, Side> = {
  N: "S",
  S: "N",
  E: "W",
  W: "E",
};

export const DELTA: Record<Side, [number, number]> = {
  N: [-1, 0],
  S: [1, 0],
  E: [0, 1],
  W: [0, -1],
};

/**
 * 조각 타입의 등가 회전군(equivalentRotations)에 기반하여 회전각을 대표 최솟값으로 정규화한다.
 * 등가 회전 정보가 없거나 그룹에 속하지 않는 경우 예외를 발생시킨다.
 */
export function normalizeRotation(type: PieceType, rotation: Rotation): Rotation {
  if (!type.equivalentRotations || type.equivalentRotations.length === 0) {
    return rotation;
  }
  for (const group of type.equivalentRotations) {
    if (group.includes(rotation)) {
      return Math.min(...group) as Rotation;
    }
  }
  throw new Error(`회전 각도 ${rotation}도가 타입 ${type.id}의 등가 회전군에 속하지 않습니다.`);
}
