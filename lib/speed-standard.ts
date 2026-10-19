export interface SpeedStandard {
  minimum: number;
  average: number;
  excellent: number;
}

export function getSpeedStandard(grade: number): SpeedStandard {
  const normalizedGrade = Math.max(1, Math.round(grade));
  const average = normalizedGrade * 5;
  return {
    minimum: Math.round(average * 0.8),
    average,
    excellent: Math.round(average * 1.4),
  };
}
