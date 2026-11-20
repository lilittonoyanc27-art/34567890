import { PersistedState } from './types';

const STORAGE_KEY = 'gran_batalla_espanol_razmik_gayane_v1';
const TURN_MIGRATION_KEY = 'gran_batalla_turnos_default_v2';
const SCORE_1PT_MIGRATION_KEY = 'gran_batalla_1pt_scoring_v3';

export const DEFAULT_PERSISTED_STATE: PersistedState = {
  razmikPoints: 0,
  gayanePoints: 0,
  razmikWins: 0,
  gayaneWins: 0,
  difficulty: 'facil',
  playMode: 'competicion',
  turnStyle: 'turnos',
  roundsCount: 10,
  timeLimit: 20,
  soundEnabled: true,
  roundHistory: [],
  tournamentHistory: [],
  seenQuestionIds: [],
};

export function loadPersistedState(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PERSISTED_STATE };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;

    // One-time migration so existing sessions switch to turn-by-turn separate timers by default
    let resolvedTurnStyle: PersistedState['turnStyle'] =
      parsed.turnStyle === 'simultaneo' || parsed.turnStyle === 'turnos'
        ? parsed.turnStyle
        : 'turnos';
    if (!window.localStorage.getItem(TURN_MIGRATION_KEY)) {
      resolvedTurnStyle = 'turnos';
      window.localStorage.setItem(TURN_MIGRATION_KEY, '1');
    }

    // One-time migration to clean 1-point-per-round scoring (clears old 10/15-point totals once)
    let resolvedRazmikPoints = typeof parsed.razmikPoints === 'number' ? parsed.razmikPoints : 0;
    let resolvedGayanePoints = typeof parsed.gayanePoints === 'number' ? parsed.gayanePoints : 0;
    if (!window.localStorage.getItem(SCORE_1PT_MIGRATION_KEY)) {
      resolvedRazmikPoints = 0;
      resolvedGayanePoints = 0;
      window.localStorage.setItem(SCORE_1PT_MIGRATION_KEY, '1');
    }

    return {
      razmikPoints: resolvedRazmikPoints,
      gayanePoints: resolvedGayanePoints,
      razmikWins: typeof parsed.razmikWins === 'number' ? parsed.razmikWins : 0,
      gayaneWins: typeof parsed.gayaneWins === 'number' ? parsed.gayaneWins : 0,
      difficulty:
        parsed.difficulty === 'facil' ||
        parsed.difficulty === 'medio' ||
        parsed.difficulty === 'dificil'
          ? parsed.difficulty
          : 'facil',
      playMode:
        parsed.playMode === 'competicion' ||
        parsed.playMode === 'practica' ||
        parsed.playMode === 'contrarreloj'
          ? parsed.playMode
          : 'competicion',
      turnStyle: resolvedTurnStyle,
      roundsCount:
        parsed.roundsCount === 5 ||
        parsed.roundsCount === 10 ||
        parsed.roundsCount === 15 ||
        parsed.roundsCount === 20
          ? parsed.roundsCount
          : 10,
      timeLimit:
        parsed.timeLimit === 10 ||
        parsed.timeLimit === 20 ||
        parsed.timeLimit === 30 ||
        parsed.timeLimit === 60 ||
        parsed.timeLimit === 0
          ? parsed.timeLimit
          : 20,
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
      roundHistory: Array.isArray(parsed.roundHistory) ? parsed.roundHistory.slice(0, 120) : [],
      tournamentHistory: Array.isArray(parsed.tournamentHistory)
        ? parsed.tournamentHistory.slice(0, 50)
        : [],
      seenQuestionIds: Array.isArray(parsed.seenQuestionIds)
        ? parsed.seenQuestionIds.slice(-600)
        : [],
    };
  } catch {
    return { ...DEFAULT_PERSISTED_STATE };
  }
}

export function savePersistedState(state: PersistedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage might be full or unavailable in private browsing
  }
}

export function clearPersistedState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function formatTimeMs(ms: number | null): string {
  if (ms === null || Number.isNaN(ms) || ms < 0) return '00:00.00';
  const totalCentiseconds = Math.floor(ms / 10);
  const cs = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const secs = totalSeconds % 60;
  const mins = Math.floor(totalSeconds / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}.${pad(cs)}`;
}
