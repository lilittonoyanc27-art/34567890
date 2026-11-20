import { Component, ErrorInfo, ReactNode, useCallback, useEffect, useState } from 'react';
import { GameArena } from './GameArena';
import { buildSessionDeck } from './gameCatalog';
import { GameLobby } from './GameLobby';
import { ConfirmResetModal, HistoryModal } from './HistoryModal';
import { ScoreHeader } from './ScoreHeader';
import { soundFX } from './sound';
import {
  clearPersistedState,
  DEFAULT_PERSISTED_STATE,
  loadPersistedState,
  savePersistedState,
} from './storage';
import {
  Difficulty,
  PersistedState,
  PlayMode,
  QuestionItem,
  RoundRecord,
  RoundsOption,
  SelectedModeId,
  TimeLimitOption,
  TournamentRecord,
  TurnStyle,
} from './types';
import { VictoryScreen } from './VictoryScreen';

type ScreenView = 'lobby' | 'playing' | 'victory';

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AppErrorBoundary:', error, info);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#E4F5FF] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg border border-sky-100 space-y-4">
            <div className="text-4xl">😅</div>
            <h1 className="font-display text-2xl font-black text-slate-900">
              ¡Ups! Algo salió mal
            </h1>
            <p className="text-sm text-slate-600">
              No te preocupes, tus puntos están guardados. Pulsa el botón para volver al menú.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-display font-bold cursor-pointer"
            >
              Volver al juego
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function BatallaApp() {
  const [persisted, setPersisted] = useState<PersistedState>(() => loadPersistedState());
  const [view, setView] = useState<ScreenView>('lobby');
  const [selectedMode, setSelectedMode] = useState<SelectedModeId>('traduccion_supersonica');
  const [deck, setDeck] = useState<QuestionItem[]>([]);
  const [sessionId, setSessionId] = useState(1);
  const [isTieBreaker, setIsTieBreaker] = useState(false);

  // Per-match score tracking for the Victory screen
  const [matchRazmikPoints, setMatchRazmikPoints] = useState(0);
  const [matchGayanePoints, setMatchGayanePoints] = useState(0);
  const [matchRounds, setMatchRounds] = useState<RoundRecord[]>([]);

  // Modals & lobby toggles
  const [showArmenianLobby, setShowArmenianLobby] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Keep sound engine synced
  useEffect(() => {
    soundFX.setEnabled(persisted.soundEnabled);
  }, [persisted.soundEnabled]);

  // Persist to localStorage automatically whenever state changes
  useEffect(() => {
    savePersistedState(persisted);
  }, [persisted]);

  const handleToggleSound = () => {
    setPersisted((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const handleChangeDifficulty = (difficulty: Difficulty) => {
    soundFX.playClick();
    setPersisted((prev) => ({ ...prev, difficulty }));
  };

  const handleChangePlayMode = (playMode: PlayMode) => {
    soundFX.playClick();
    setPersisted((prev) => ({ ...prev, playMode }));
  };

  const handleChangeTurnStyle = (turnStyle: TurnStyle) => {
    soundFX.playClick();
    setPersisted((prev) => ({ ...prev, turnStyle }));
  };

  const handleChangeRounds = (roundsCount: RoundsOption) => {
    soundFX.playClick();
    setPersisted((prev) => ({ ...prev, roundsCount }));
  };

  const handleChangeTimeLimit = (timeLimit: TimeLimitOption) => {
    soundFX.playClick();
    setPersisted((prev) => ({ ...prev, timeLimit }));
  };

  const launchGame = useCallback(
    (modeId: SelectedModeId, countOverride?: number, tieBreaker = false) => {
      soundFX.playClick();
      const count = countOverride ?? persisted.roundsCount;
      const newDeck = buildSessionDeck(
        modeId,
        persisted.difficulty,
        count,
        persisted.seenQuestionIds
      );
      setSelectedMode(modeId);
      setDeck(newDeck);
      setIsTieBreaker(tieBreaker);
      if (!tieBreaker) {
        setMatchRazmikPoints(0);
        setMatchGayanePoints(0);
        setMatchRounds([]);
      }
      setSessionId((s) => s + 1);
      setView('playing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [persisted.difficulty, persisted.roundsCount, persisted.seenQuestionIds]
  );

  const handleApplyScoreDelta = useCallback((deltaRazmik: number, deltaGayane: number) => {
    setMatchRazmikPoints((prev) => Math.max(0, prev + deltaRazmik));
    setMatchGayanePoints((prev) => Math.max(0, prev + deltaGayane));
    setPersisted((prev) => ({
      ...prev,
      razmikPoints: Math.max(0, prev.razmikPoints + deltaRazmik),
      gayanePoints: Math.max(0, prev.gayanePoints + deltaGayane),
    }));
  }, []);

  const handleMarkQuestionSeen = useCallback((questionId: string) => {
    setPersisted((prev) => {
      if (prev.seenQuestionIds.includes(questionId)) return prev;
      return {
        ...prev,
        seenQuestionIds: [...prev.seenQuestionIds.slice(-599), questionId],
      };
    });
  }, []);

  const handleRecordRound = useCallback((record: RoundRecord) => {
    setMatchRounds((prev) => [...prev, record]);
    setPersisted((prev) => ({
      ...prev,
      roundHistory: [record, ...prev.roundHistory].slice(0, 120),
    }));
  }, []);

  const handleFinishMatch = useCallback(() => {
    soundFX.playVictory();

    const winner =
      matchRazmikPoints > matchGayanePoints
        ? 'razmik'
        : matchGayanePoints > matchRazmikPoints
        ? 'gayane'
        : 'empate';

    if (persisted.playMode !== 'practica' && (matchRazmikPoints > 0 || matchGayanePoints > 0 || matchRounds.length > 0)) {
      const tournamentRec: TournamentRecord = {
        id: `trn_${Date.now()}`,
        date: Date.now(),
        modeId: selectedMode,
        level: persisted.difficulty,
        playMode: persisted.playMode,
        roundsPlayed: Math.max(matchRounds.length, 1),
        razmikPoints: matchRazmikPoints,
        gayanePoints: matchGayanePoints,
        winner,
      };

      setPersisted((prev) => ({
        ...prev,
        razmikWins: winner === 'razmik' ? prev.razmikWins + 1 : prev.razmikWins,
        gayaneWins: winner === 'gayane' ? prev.gayaneWins + 1 : prev.gayaneWins,
        tournamentHistory: [tournamentRec, ...prev.tournamentHistory].slice(0, 50),
      }));
    }

    setView('victory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    matchGayanePoints,
    matchRazmikPoints,
    matchRounds.length,
    persisted.difficulty,
    persisted.playMode,
    selectedMode,
  ]);

  // Empezar de nuevo: restarts current game from Round 1, reverting only this match's points while keeping lifetime wins & history
  const handleRestartCurrentGame = useCallback(() => {
    soundFX.playClick();
    setPersisted((prev) => ({
      ...prev,
      razmikPoints: Math.max(0, prev.razmikPoints - matchRazmikPoints),
      gayanePoints: Math.max(0, prev.gayanePoints - matchGayanePoints),
    }));
    launchGame(selectedMode, undefined, false);
  }, [launchGame, matchGayanePoints, matchRazmikPoints, selectedMode]);

  // Nueva partida: starts fresh match points at 0 while preserving total wins & history!
  const handleNewMatch = () => {
    soundFX.playClick();
    setMatchRazmikPoints(0);
    setMatchGayanePoints(0);
    setMatchRounds([]);
    setPersisted((prev) => ({
      ...prev,
      razmikPoints: 0,
      gayanePoints: 0,
    }));
    setView('lobby');
  };

  // Reiniciar todo: confirmed full reset of tournament, points, wins, and history
  const handleConfirmResetAll = () => {
    clearPersistedState();
    setPersisted({ ...DEFAULT_PERSISTED_STATE });
    setMatchRazmikPoints(0);
    setMatchGayanePoints(0);
    setMatchRounds([]);
    setConfirmResetOpen(false);
    setHistoryOpen(false);
    setView('lobby');
    soundFX.playClick();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <ScoreHeader
        razmikPoints={persisted.razmikPoints}
        gayanePoints={persisted.gayanePoints}
        razmikWins={persisted.razmikWins}
        gayaneWins={persisted.gayaneWins}
        soundEnabled={persisted.soundEnabled}
        inGame={view !== 'lobby'}
        onToggleSound={handleToggleSound}
        onOpenHistory={() => setHistoryOpen(true)}
        onGoHome={() => {
          soundFX.playClick();
          setView('lobby');
        }}
      />

      <div className="flex-1">
        {view === 'lobby' && (
          <GameLobby
            difficulty={persisted.difficulty}
            playMode={persisted.playMode}
            turnStyle={persisted.turnStyle}
            roundsCount={persisted.roundsCount}
            timeLimit={persisted.timeLimit}
            showArmenianLobby={showArmenianLobby}
            onToggleArmenianLobby={() => {
              soundFX.playClick();
              setShowArmenianLobby((v) => !v);
            }}
            onChangeDifficulty={handleChangeDifficulty}
            onChangePlayMode={handleChangePlayMode}
            onChangeTurnStyle={handleChangeTurnStyle}
            onChangeRounds={handleChangeRounds}
            onChangeTimeLimit={handleChangeTimeLimit}
            onSelectGame={(id) => launchGame(id)}
            onNewMatch={handleNewMatch}
            onRequestResetAll={() => setConfirmResetOpen(true)}
          />
        )}

        {view === 'playing' && deck.length > 0 && (
          <GameArena
            key={sessionId}
            modeId={selectedMode}
            difficulty={persisted.difficulty}
            playMode={persisted.playMode}
            turnStyle={persisted.turnStyle}
            timeLimit={persisted.timeLimit}
            deck={deck}
            isTieBreaker={isTieBreaker}
            razmikTotalWins={persisted.razmikWins}
            gayaneTotalWins={persisted.gayaneWins}
            matchRazmikPoints={matchRazmikPoints}
            matchGayanePoints={matchGayanePoints}
            matchRounds={matchRounds}
            onChangeTurnStyle={handleChangeTurnStyle}
            onApplyScoreDelta={handleApplyScoreDelta}
            onRecordRound={handleRecordRound}
            onRestartGame={handleRestartCurrentGame}
            onFinishMatch={handleFinishMatch}
            onRequestResetAll={() => setConfirmResetOpen(true)}
            onBackToMenu={() => {
              soundFX.playClick();
              setView('lobby');
            }}
            onMarkQuestionSeen={handleMarkQuestionSeen}
          />
        )}

        {view === 'victory' && (
          <VictoryScreen
            razmikMatchPoints={matchRazmikPoints}
            gayaneMatchPoints={matchGayanePoints}
            razmikTotalWins={persisted.razmikWins}
            gayaneTotalWins={persisted.gayaneWins}
            matchRounds={matchRounds}
            onTieBreaker={() => launchGame(selectedMode, 1, true)}
            onPlayAgain={() => launchGame(selectedMode)}
            onNewMatch={handleNewMatch}
            onBackToMenu={() => {
              soundFX.playClick();
              setView('lobby');
            }}
          />
        )}
      </div>

      <HistoryModal
        open={historyOpen}
        state={persisted}
        onClose={() => setHistoryOpen(false)}
        onRequestResetAll={() => setConfirmResetOpen(true)}
      />

      <ConfirmResetModal
        open={confirmResetOpen}
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={handleConfirmResetAll}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BatallaApp />
    </AppErrorBoundary>
  );
}
