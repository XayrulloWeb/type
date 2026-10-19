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

export function getSpeedStandardProgress(wpm: number, standard: SpeedStandard): number {
  const value = Math.max(0, wpm);
  const stage = 100 / 3;

  if (value < standard.minimum) {
    return (value / standard.minimum) * stage;
  }
  if (value < standard.average) {
    return stage + ((value - standard.minimum) / (standard.average - standard.minimum)) * stage;
  }
  if (value < standard.excellent) {
    return stage * 2 + ((value - standard.average) / (standard.excellent - standard.average)) * stage;
  }
  return 100;
}
