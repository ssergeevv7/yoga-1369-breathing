export enum BreathingPhase {
  IDLE = 'IDLE',
  INHALE = 'INHALE',
  HOLD_IN = 'HOLD_IN',
  EXHALE = 'EXHALE',
  HOLD_OUT = 'HOLD_OUT',
}

export interface SessionStats {
  totalCycles: number;
  totalMinutes: number;
}
