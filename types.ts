export type Difficulty = 'facil' | 'medio' | 'dificil';

export type PlayMode = 'competicion' | 'practica' | 'contrarreloj';

export type TurnStyle = 'simultaneo' | 'turnos';

export type PlayerId = 'razmik' | 'gayane';

export type GameId =
  | 'traduccion_supersonica'
  | 'traduccion_reves'
  | 'construye_frase'
  | 'palabra_misteriosa'
  | 'compra_10s'
  | 'tres_pistas'
  | 'dilo_otra_manera'
  | 'elige_tiempo'
  | 'continua_historia'
  | 'duelo_preguntas'
  | 'categorias_explosivas'
  | 'mision_espana';

export type SelectedModeId = GameId | 'torneo_mixto';

export type TimeLimitOption = 10 | 20 | 30 | 60 | 0; // 0 = sin límite
export type RoundsOption = 5 | 10 | 15 | 20;

export interface GameMeta {
  id: GameId;
  number: number;
  emoji: string;
  title: string;
  shortDescEs: string;
  shortDescHy: string;
  instructionEs: string;
  instructionHy: string;
  accentBg: string;
  accentText: string;
  isTranslationGame?: boolean;
  isCreativeGame?: boolean;
}

export interface QuestionItem {
  id: string;
  gameId: GameId;
  level: Difficulty;
  prompt: string;
  promptHy?: string;
  answer: string;
  answerDetail?: string;
  altAnswers?: string[];
  // Games 1 & 2: Multiple words per round
  batchItems?: {
    id: string;
    prompt: string;
    answer: string;
    note?: string;
  }[];
  // Game 3: Construye la frase
  words?: string[];
  // Game 6: Tres pistas
  clues?: [string, string, string];
  cluesHy?: [string, string, string];
  // Game 8: Elige el tiempo
  options?: { label: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctOption?: 'A' | 'B' | 'C' | 'D';
  tenseName?: string;
  // Game 9: Continúa la historia
  rubricHint?: string;
  // Game 11: Categorías explosivas
  category?: string;
  categoryHy?: string;
  letter?: string;
  // Game 12: Misión España
  location?: string;
  locationHy?: string;
}

export interface PlayerRoundState {
  responded: boolean;
  timeMs: number | null;
  verdict: 'correct' | 'incorrect' | null;
  pointsAwarded: number;
  bonusPoints: number;
  cluesAtResponse?: 1 | 2 | 3;
  pointsBreakdown?: string;
  // Creative rubric points (Game 9)
  creativePoints?: {
    gramatica: number;
    logica: number;
    vocabulario: number;
  };
}

export interface RoundRecord {
  id: string;
  timestamp: number;
  roundNumber: number;
  gameId: GameId;
  gameTitle: string;
  level: Difficulty;
  prompt: string;
  answer: string;
  razmik: PlayerRoundState;
  gayane: PlayerRoundState;
  winner: PlayerId | 'empate' | 'ninguno';
  fastest: PlayerId | 'empate' | null;
}

export interface TournamentRecord {
  id: string;
  date: number;
  modeId: SelectedModeId;
  level: Difficulty;
  playMode: PlayMode;
  roundsPlayed: number;
  razmikPoints: number;
  gayanePoints: number;
  winner: PlayerId | 'empate';
}

export interface PersistedState {
  razmikPoints: number;
  gayanePoints: number;
  razmikWins: number;
  gayaneWins: number;
  difficulty: Difficulty;
  playMode: PlayMode;
  turnStyle: TurnStyle;
  roundsCount: RoundsOption;
  timeLimit: TimeLimitOption;
  soundEnabled: boolean;
  roundHistory: RoundRecord[];
  tournamentHistory: TournamentRecord[];
  seenQuestionIds: string[];
}
