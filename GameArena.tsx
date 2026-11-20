import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDifficultyLabel, getGameMeta, shuffleArray } from './gameCatalog';
import { soundFX } from './sound';
import { formatTimeMs } from './storage';
import {
  Difficulty,
  PlayMode,
  PlayerId,
  PlayerRoundState,
  QuestionItem,
  RoundRecord,
  SelectedModeId,
  TimeLimitOption,
  TurnStyle,
} from './types';

interface GameArenaProps {
  modeId: SelectedModeId;
  difficulty: Difficulty;
  playMode: PlayMode;
  turnStyle: TurnStyle;
  timeLimit: TimeLimitOption;
  deck: QuestionItem[];
  isTieBreaker?: boolean;
  razmikTotalWins: number;
  gayaneTotalWins: number;
  matchRazmikPoints: number;
  matchGayanePoints: number;
  matchRounds: RoundRecord[];
  onChangeTurnStyle: (t: TurnStyle) => void;
  onApplyScoreDelta: (deltaRazmik: number, deltaGayane: number) => void;
  onRecordRound: (record: RoundRecord) => void;
  onRestartGame: () => void;
  onFinishMatch: () => void;
  onRequestResetAll: () => void;
  onBackToMenu: () => void;
  onMarkQuestionSeen: (questionId: string) => void;
}

type TimerPhase = 'idle' | 'running' | 'paused' | 'ended';

const EMPTY_PLAYER_STATE = (): PlayerRoundState => ({
  responded: false,
  timeMs: null,
  verdict: null,
  pointsAwarded: 0,
  bonusPoints: 0,
});

export function GameArena({
  modeId,
  difficulty,
  playMode,
  turnStyle,
  timeLimit,
  deck,
  isTieBreaker = false,
  razmikTotalWins,
  gayaneTotalWins,
  matchRazmikPoints,
  matchGayanePoints,
  matchRounds,
  onChangeTurnStyle,
  onApplyScoreDelta,
  onRecordRound,
  onRestartGame,
  onFinishMatch,
  onRequestResetAll,
  onBackToMenu,
  onMarkQuestionSeen,
}: GameArenaProps) {
  const [roundIdx, setRoundIdx] = useState(0);
  const question = deck[roundIdx] ?? deck[0];
  const gameMeta = getGameMeta(question.gameId);
  const diffMeta = getDifficultyLabel(difficulty);

  // Effective time limit: Contrarreloj defaults to 15s if "Sin límite" was selected
  const effectiveLimitSec =
    playMode === 'contrarreloj' && timeLimit === 0 ? 15 : timeLimit;
  const effectiveLimitMs = effectiveLimitSec > 0 ? effectiveLimitSec * 1000 : 0;

  // ===== SHARED TIMER STATE (for "A la vez" mode) =====
  const [sharedStatus, setSharedStatus] = useState<TimerPhase>('idle');
  const [sharedElapsedMs, setSharedElapsedMs] = useState(0);
  const [sharedPopKey, setSharedPopKey] = useState(0);

  // ===== INDEPENDENT PER-PLAYER TIMERS (for "Por turnos" mode) =====
  const [activeTurnPlayer, setActiveTurnPlayer] = useState<PlayerId>('razmik');
  const [razmikTimerStatus, setRazmikTimerStatus] = useState<TimerPhase>('idle');
  const [gayaneTimerStatus, setGayaneTimerStatus] = useState<TimerPhase>('idle');
  const [razmikElapsedMs, setRazmikElapsedMs] = useState(0);
  const [gayaneElapsedMs, setGayaneElapsedMs] = useState(0);
  const [razmikPopKey, setRazmikPopKey] = useState(0);
  const [gayanePopKey, setGayanePopKey] = useState(0);

  // Single authoritative clock refs — guarantees NEVER two timers running at once
  const runningChannelRef = useRef<'none' | 'shared' | 'razmik' | 'gayane'>('none');
  const runStartEpochRef = useRef<number>(0);
  const runBaseMsRef = useRef<number>(0);
  const lastWarningSecRef = useRef<number>(-1);

  // Separate per-element Armenian translation states so opening ONE never opens all!
  const [showInstructionHy, setShowInstructionHy] = useState(false);
  const [showPromptHy, setShowPromptHy] = useState(false);
  const [revealedClueHy, setRevealedClueHy] = useState<Record<number, boolean>>({});

  // Answer reveal states
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [revealedBatchIds, setRevealedBatchIds] = useState<Record<string, boolean>>({});
  const [cluesOpened, setCluesOpened] = useState<1 | 2 | 3>(1);

  // Game 3 interactive word builder
  const [shuffledWordPool, setShuffledWordPool] = useState<{ id: number; word: string }[]>([]);
  const [builtSentence, setBuiltSentence] = useState<{ id: number; word: string }[]>([]);

  // Game 8 interactive option selection
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);

  // Player states for current round
  const [razmikState, setRazmikState] = useState<PlayerRoundState>(EMPTY_PLAYER_STATE);
  const [gayaneState, setGayaneState] = useState<PlayerRoundState>(EMPTY_PLAYER_STATE);

  // Game 9 creative rubric scores
  const [creativeRazmik, setCreativeRazmik] = useState({ gramatica: 0, logica: 0, vocabulario: 0 });
  const [creativeGayane, setCreativeGayane] = useState({ gramatica: 0, logica: 0, vocabulario: 0 });
  const [creativeSubmitted, setCreativeSubmitted] = useState(false);

  // Track already-applied points for THIS round so edits never double-count or drift
  const appliedPointsRef = useRef<{ razmik: number; gayane: number }>({ razmik: 0, gayane: 0 });
  const roundCommittedRef = useRef<boolean>(false);

  // Which channel is currently actively ticking?
  const activeChannel: 'none' | 'shared' | 'razmik' | 'gayane' =
    turnStyle === 'simultaneo'
      ? sharedStatus === 'running'
        ? 'shared'
        : 'none'
      : razmikTimerStatus === 'running'
      ? 'razmik'
      : gayaneTimerStatus === 'running'
      ? 'gayane'
      : 'none';

  runningChannelRef.current = activeChannel;

  // Read live accurate ms for any channel even between interval ticks
  const getLiveMsFor = useCallback(
    (channel: 'shared' | 'razmik' | 'gayane') => {
      if (runningChannelRef.current === channel) {
        const live = Math.max(0, runBaseMsRef.current + (Date.now() - runStartEpochRef.current));
        return effectiveLimitMs > 0 ? Math.min(live, effectiveLimitMs) : live;
      }
      if (channel === 'shared') return sharedElapsedMs;
      if (channel === 'razmik') return razmikElapsedMs;
      return gayaneElapsedMs;
    },
    [effectiveLimitMs, gayaneElapsedMs, razmikElapsedMs, sharedElapsedMs]
  );

  // Single deterministic interval controlled by activeChannel
  useEffect(() => {
    if (activeChannel === 'none') return;

    const intervalId = window.setInterval(() => {
      const nextMs = Math.max(0, runBaseMsRef.current + (Date.now() - runStartEpochRef.current));

      if (effectiveLimitMs > 0) {
        const remainingSec = Math.ceil((effectiveLimitMs - nextMs) / 1000);
        if (remainingSec <= 3 && remainingSec >= 1 && remainingSec !== lastWarningSecRef.current) {
          lastWarningSecRef.current = remainingSec;
          soundFX.playTick();
        }
        if (nextMs >= effectiveLimitMs) {
          if (activeChannel === 'shared') {
            setSharedElapsedMs(effectiveLimitMs);
            setSharedStatus('ended');
          } else if (activeChannel === 'razmik') {
            setRazmikElapsedMs(effectiveLimitMs);
            setRazmikTimerStatus('ended');
            setRazmikState((prev) =>
              prev.responded
                ? prev
                : { ...prev, responded: true, timeMs: effectiveLimitMs, cluesAtResponse: cluesOpened }
            );
            setActiveTurnPlayer('gayane');
          } else {
            setGayaneElapsedMs(effectiveLimitMs);
            setGayaneTimerStatus('ended');
            setGayaneState((prev) =>
              prev.responded
                ? prev
                : { ...prev, responded: true, timeMs: effectiveLimitMs, cluesAtResponse: cluesOpened }
            );
          }
          soundFX.playTimeUp();
          return;
        }
      }

      if (activeChannel === 'shared') {
        setSharedElapsedMs(nextMs);
      } else if (activeChannel === 'razmik') {
        setRazmikElapsedMs(nextMs);
      } else {
        setGayaneElapsedMs(nextMs);
      }
    }, 25);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeChannel, cluesOpened, effectiveLimitMs]);

  const pauseAllTimers = useCallback(() => {
    if (runningChannelRef.current === 'shared') {
      setSharedElapsedMs(getLiveMsFor('shared'));
      setSharedStatus('paused');
    } else if (runningChannelRef.current === 'razmik') {
      setRazmikElapsedMs(getLiveMsFor('razmik'));
      setRazmikTimerStatus('paused');
    } else if (runningChannelRef.current === 'gayane') {
      setGayaneElapsedMs(getLiveMsFor('gayane'));
      setGayaneTimerStatus('paused');
    }
  }, [getLiveMsFor]);

  // Recompute exact scores: +1 punto for whoever answers CORRECTLY and FASTEST in the round!
  const recomputeAndApplyScores = useCallback(
    (nextRazmik: PlayerRoundState, nextGayane: PlayerRoundState) => {
      if (playMode === 'practica') {
        setRazmikState({ ...nextRazmik, pointsAwarded: 0, bonusPoints: 0, pointsBreakdown: '' });
        setGayaneState({ ...nextGayane, pointsAwarded: 0, bonusPoints: 0, pointsBreakdown: '' });
        return;
      }

      const rCorrect = nextRazmik.verdict === 'correct';
      const gCorrect = nextGayane.verdict === 'correct';

      const rHasTime = nextRazmik.timeMs !== null && nextRazmik.timeMs > 0;
      const gHasTime = nextGayane.timeMs !== null && nextGayane.timeMs > 0;

      let rPts = 0;
      let gPts = 0;
      let rText = '';
      let gText = '';

      if (rCorrect && gCorrect) {
        if (rHasTime && gHasTime) {
          if (nextRazmik.timeMs! < nextGayane.timeMs!) {
            rPts = 1;
            gPts = 0;
            rText = '⚡ Correcto y más rápido (+1 punto)';
            gText = '✅ Correcto, pero más lenta (0)';
          } else if (nextGayane.timeMs! < nextRazmik.timeMs!) {
            rPts = 0;
            gPts = 1;
            rText = '✅ Correcto, pero más lento (0)';
            gText = '⚡ Correcto y más rápida (+1 punto)';
          } else if (question.gameId === 'tres_pistas') {
            const rClues = nextRazmik.cluesAtResponse ?? cluesOpened;
            const gClues = nextGayane.cluesAtResponse ?? cluesOpened;
            if (rClues < gClues) {
              rPts = 1;
              rText = '🧠 Menos pistas (+1 punto)';
              gText = '✅ Correcto (0)';
            } else if (gClues < rClues) {
              gPts = 1;
              rText = '✅ Correcto (0)';
              gText = '🧠 Menos pistas (+1 punto)';
            } else {
              rPts = 1;
              gPts = 1;
              rText = '🤝 Empate exacto (+1 punto)';
              gText = '🤝 Empate exacto (+1 punto)';
            }
          } else {
            rPts = 1;
            gPts = 1;
            rText = '🤝 Empate exacto (+1 punto)';
            gText = '🤝 Empate exacto (+1 punto)';
          }
        } else if (rHasTime && !gHasTime) {
          rPts = 1;
          gPts = 0;
          rText = '⚡ Correcto con tiempo (+1 punto)';
          gText = '✅ Correcto (0)';
        } else if (gHasTime && !rHasTime) {
          rPts = 0;
          gPts = 1;
          rText = '✅ Correcto (0)';
          gText = '⚡ Correcto con tiempo (+1 punto)';
        } else {
          rPts = 1;
          gPts = 1;
          rText = '🤝 Empate (+1 punto)';
          gText = '🤝 Empate (+1 punto)';
        }
      } else if (rCorrect && !gCorrect) {
        rPts = 1;
        gPts = 0;
        rText = '✅ Correcto (+1 punto)';
        gText = nextGayane.verdict === 'incorrect' ? '❌ Incorrecto (0)' : '';
      } else if (gCorrect && !rCorrect) {
        rPts = 0;
        gPts = 1;
        rText = nextRazmik.verdict === 'incorrect' ? '❌ Incorrecto (0)' : '';
        gText = '✅ Correcto (+1 punto)';
      } else {
        rPts = 0;
        gPts = 0;
        rText = nextRazmik.verdict === 'incorrect' ? '❌ Incorrecto (0)' : '';
        gText = nextGayane.verdict === 'incorrect' ? '❌ Incorrecto (0)' : '';
      }

      const finalRazmik: PlayerRoundState = {
        ...nextRazmik,
        pointsAwarded: rPts,
        bonusPoints: 0,
        pointsBreakdown: rText,
      };
      const finalGayane: PlayerRoundState = {
        ...nextGayane,
        pointsAwarded: gPts,
        bonusPoints: 0,
        pointsBreakdown: gText,
      };

      setRazmikState(finalRazmik);
      setGayaneState(finalGayane);

      const deltaR = rPts - appliedPointsRef.current.razmik;
      const deltaG = gPts - appliedPointsRef.current.gayane;
      if (deltaR !== 0 || deltaG !== 0) {
        onApplyScoreDelta(deltaR, deltaG);
        appliedPointsRef.current = { razmik: rPts, gayane: gPts };
      }
    },
    [cluesOpened, onApplyScoreDelta, playMode, question.gameId]
  );

  // Reset round state cleanly
  const resetCurrentRoundState = useCallback(
    (revertScore: boolean) => {
      if (revertScore) {
        const prev = appliedPointsRef.current;
        if (prev.razmik !== 0 || prev.gayane !== 0) {
          onApplyScoreDelta(-prev.razmik, -prev.gayane);
          appliedPointsRef.current = { razmik: 0, gayane: 0 };
        }
      } else {
        appliedPointsRef.current = { razmik: 0, gayane: 0 };
      }

      roundCommittedRef.current = false;
      setSharedStatus('idle');
      setSharedElapsedMs(0);
      setRazmikTimerStatus('idle');
      setGayaneTimerStatus('idle');
      setRazmikElapsedMs(0);
      setGayaneElapsedMs(0);
      setActiveTurnPlayer(roundIdx % 2 === 0 ? 'razmik' : 'gayane');
      runBaseMsRef.current = 0;
      runStartEpochRef.current = 0;
      lastWarningSecRef.current = -1;

      setShowInstructionHy(false);
      setShowPromptHy(false);
      setRevealedClueHy({});
      setAnswerRevealed(false);
      setRevealedBatchIds({});
      setCluesOpened(1);
      setSelectedOption(null);
      setRazmikState(EMPTY_PLAYER_STATE());
      setGayaneState(EMPTY_PLAYER_STATE());
      setCreativeRazmik({ gramatica: 0, logica: 0, vocabulario: 0 });
      setCreativeGayane({ gramatica: 0, logica: 0, vocabulario: 0 });
      setCreativeSubmitted(false);

      if (question?.words && question.words.length > 0) {
        const items = shuffleArray(question.words).map((word, idx) => ({ id: idx, word }));
        setShuffledWordPool(items);
        setBuiltSentence([]);
      } else {
        setShuffledWordPool([]);
        setBuiltSentence([]);
      }
    },
    [onApplyScoreDelta, question, roundIdx]
  );

  // Initialize when question changes
  useEffect(() => {
    resetCurrentRoundState(false);
    if (question?.batchItems && question.batchItems.length > 0) {
      question.batchItems.forEach((b) => onMarkQuestionSeen(b.id));
    } else if (question?.id) {
      onMarkQuestionSeen(question.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, question?.id]);

  const handleSwitchTurnStyle = (next: TurnStyle) => {
    pauseAllTimers();
    onChangeTurnStyle(next);
  };

  // ===== START / PAUSE / RESET INDEPENDENT PLAYER TIMER (POR TURNOS) =====
  const handleStartPlayerTimer = (player: PlayerId) => {
    soundFX.playStart();
    if (player === 'razmik' && gayaneTimerStatus === 'running') {
      setGayaneElapsedMs(getLiveMsFor('gayane'));
      setGayaneTimerStatus('paused');
    } else if (player === 'gayane' && razmikTimerStatus === 'running') {
      setRazmikElapsedMs(getLiveMsFor('razmik'));
      setRazmikTimerStatus('paused');
    }

    setActiveTurnPlayer(player);

    const currentStatus = player === 'razmik' ? razmikTimerStatus : gayaneTimerStatus;
    const currentMs = player === 'razmik' ? razmikElapsedMs : gayaneElapsedMs;
    const safeBase =
      currentStatus === 'ended' || (effectiveLimitMs > 0 && currentMs >= effectiveLimitMs)
        ? 0
        : currentMs;

    if (player === 'razmik') {
      if (safeBase === 0) setRazmikElapsedMs(0);
      setRazmikPopKey((k) => k + 1);
      if (razmikState.responded) {
        const cleared: PlayerRoundState = { ...razmikState, responded: false, timeMs: null };
        if (cleared.verdict !== null || gayaneState.verdict !== null) {
          recomputeAndApplyScores(cleared, gayaneState);
        } else {
          setRazmikState(cleared);
        }
      }
      runBaseMsRef.current = safeBase;
      runStartEpochRef.current = Date.now();
      lastWarningSecRef.current = -1;
      setRazmikTimerStatus('running');
    } else {
      if (safeBase === 0) setGayaneElapsedMs(0);
      setGayanePopKey((k) => k + 1);
      if (gayaneState.responded) {
        const cleared: PlayerRoundState = { ...gayaneState, responded: false, timeMs: null };
        if (razmikState.verdict !== null || cleared.verdict !== null) {
          recomputeAndApplyScores(razmikState, cleared);
        } else {
          setGayaneState(cleared);
        }
      }
      runBaseMsRef.current = safeBase;
      runStartEpochRef.current = Date.now();
      lastWarningSecRef.current = -1;
      setGayaneTimerStatus('running');
    }
  };

  const handlePausePlayerTimer = (player: PlayerId) => {
    soundFX.playClick();
    if (player === 'razmik' && razmikTimerStatus === 'running') {
      setRazmikElapsedMs(getLiveMsFor('razmik'));
      setRazmikTimerStatus('paused');
    } else if (player === 'gayane' && gayaneTimerStatus === 'running') {
      setGayaneElapsedMs(getLiveMsFor('gayane'));
      setGayaneTimerStatus('paused');
    }
  };

  // Resetting a single player's timer also cleanly recalculates scores if they had a verdict!
  const handleResetSinglePlayerTimer = (player: PlayerId) => {
    soundFX.playClick();
    if (player === 'razmik') {
      setRazmikTimerStatus('idle');
      setRazmikElapsedMs(0);
      const clearedR = EMPTY_PLAYER_STATE();
      recomputeAndApplyScores(clearedR, gayaneState);
    } else {
      setGayaneTimerStatus('idle');
      setGayaneElapsedMs(0);
      const clearedG = EMPTY_PLAYER_STATE();
      recomputeAndApplyScores(razmikState, clearedG);
    }
  };

  // ===== START / PAUSE SHARED TIMER (A LA VEZ) =====
  const handleStartSharedTimer = () => {
    if (sharedStatus === 'running') return;
    soundFX.playStart();
    setSharedPopKey((k) => k + 1);
    const safeBase =
      sharedStatus === 'ended' || (effectiveLimitMs > 0 && sharedElapsedMs >= effectiveLimitMs)
        ? 0
        : sharedElapsedMs;
    if (safeBase === 0) setSharedElapsedMs(0);
    runBaseMsRef.current = safeBase;
    runStartEpochRef.current = Date.now();
    lastWarningSecRef.current = -1;
    setSharedStatus('running');
  };

  const handlePauseSharedTimer = () => {
    if (sharedStatus !== 'running') return;
    setSharedElapsedMs(getLiveMsFor('shared'));
    setSharedStatus('paused');
    soundFX.playClick();
  };

  const handleResetRound = () => {
    soundFX.playClick();
    resetCurrentRoundState(true);
  };

  // Player finished answering orally
  const handlePlayerResponded = (player: PlayerId) => {
    if (turnStyle === 'turnos') {
      const capturedMs = getLiveMsFor(player);
      if (player === 'razmik') {
        soundFX.playBuzzRazmik();
        setRazmikElapsedMs(capturedMs);
        setRazmikTimerStatus('paused');
        const nextR: PlayerRoundState = {
          ...razmikState,
          responded: true,
          timeMs: capturedMs,
          cluesAtResponse: razmikState.cluesAtResponse ?? cluesOpened,
        };
        if (nextR.verdict !== null || gayaneState.verdict !== null) {
          recomputeAndApplyScores(nextR, gayaneState);
        } else {
          setRazmikState(nextR);
        }
        if (!gayaneState.responded) {
          setActiveTurnPlayer('gayane');
        }
      } else {
        soundFX.playBuzzGayane();
        setGayaneElapsedMs(capturedMs);
        setGayaneTimerStatus('paused');
        const nextG: PlayerRoundState = {
          ...gayaneState,
          responded: true,
          timeMs: capturedMs,
          cluesAtResponse: gayaneState.cluesAtResponse ?? cluesOpened,
        };
        if (razmikState.verdict !== null || nextG.verdict !== null) {
          recomputeAndApplyScores(razmikState, nextG);
        } else {
          setGayaneState(nextG);
        }
        if (!razmikState.responded) {
          setActiveTurnPlayer('razmik');
        }
      }
      return;
    }

    // Simultaneous mode
    const capturedMs = getLiveMsFor('shared');
    if (player === 'razmik') {
      if (razmikState.responded) return;
      soundFX.playBuzzRazmik();
      const nextR: PlayerRoundState = {
        ...razmikState,
        responded: true,
        timeMs: capturedMs,
        cluesAtResponse: razmikState.cluesAtResponse ?? cluesOpened,
      };
      if (nextR.verdict !== null || gayaneState.verdict !== null) {
        recomputeAndApplyScores(nextR, gayaneState);
      } else {
        setRazmikState(nextR);
      }
      if (gayaneState.responded) {
        setSharedElapsedMs(capturedMs);
        setSharedStatus('paused');
      }
    } else {
      if (gayaneState.responded) return;
      soundFX.playBuzzGayane();
      const nextG: PlayerRoundState = {
        ...gayaneState,
        responded: true,
        timeMs: capturedMs,
        cluesAtResponse: gayaneState.cluesAtResponse ?? cluesOpened,
      };
      if (razmikState.verdict !== null || nextG.verdict !== null) {
        recomputeAndApplyScores(razmikState, nextG);
      } else {
        setGayaneState(nextG);
      }
      if (razmikState.responded) {
        setSharedElapsedMs(capturedMs);
        setSharedStatus('paused');
      }
    }
  };

  // Teacher marks Correct / Incorrect (editable anytime, accurately recalculates both players!)
  const handleSetVerdict = (player: PlayerId, verdict: 'correct' | 'incorrect') => {
    if (verdict === 'correct') {
      soundFX.playCorrect();
    } else {
      soundFX.playIncorrect();
    }

    const liveMs =
      turnStyle === 'simultaneo' ? getLiveMsFor('shared') : getLiveMsFor(player);

    if (turnStyle === 'turnos') {
      if (player === 'razmik' && razmikTimerStatus === 'running') {
        setRazmikElapsedMs(liveMs);
        setRazmikTimerStatus('paused');
      } else if (player === 'gayane' && gayaneTimerStatus === 'running') {
        setGayaneElapsedMs(liveMs);
        setGayaneTimerStatus('paused');
      }
    } else if (sharedStatus === 'running') {
      setSharedElapsedMs(liveMs);
      setSharedStatus('paused');
    }

    const nextR: PlayerRoundState =
      player === 'razmik'
        ? {
            ...razmikState,
            responded: true,
            timeMs: razmikState.timeMs ?? (liveMs > 0 ? liveMs : null),
            cluesAtResponse: razmikState.cluesAtResponse ?? cluesOpened,
            verdict,
          }
        : razmikState;

    const nextG: PlayerRoundState =
      player === 'gayane'
        ? {
            ...gayaneState,
            responded: true,
            timeMs: gayaneState.timeMs ?? (liveMs > 0 ? liveMs : null),
            cluesAtResponse: gayaneState.cluesAtResponse ?? cluesOpened,
            verdict,
          }
        : gayaneState;

    recomputeAndApplyScores(nextR, nextG);
  };

  // Game 9 creative rubric evaluation handler: winner of the creative round earns +1 punto!
  const handleApplyCreativeRubric = () => {
    pauseAllTimers();
    const rTotal = creativeRazmik.gramatica + creativeRazmik.logica + creativeRazmik.vocabulario;
    const gTotal = creativeGayane.gramatica + creativeGayane.logica + creativeGayane.vocabulario;
    soundFX.playCorrect();

    let rPts = 0;
    let gPts = 0;
    if (playMode !== 'practica') {
      if (rTotal > gTotal) {
        rPts = 1;
      } else if (gTotal > rTotal) {
        gPts = 1;
      } else if (rTotal > 0 && rTotal === gTotal) {
        rPts = 1;
        gPts = 1;
      }
    }

    const nextR: PlayerRoundState = {
      ...razmikState,
      responded: true,
      timeMs:
        razmikState.timeMs ??
        (turnStyle === 'simultaneo'
          ? sharedElapsedMs > 0
            ? sharedElapsedMs
            : null
          : razmikElapsedMs > 0
          ? razmikElapsedMs
          : null),
      verdict: rTotal > 0 ? 'correct' : 'incorrect',
      pointsAwarded: rPts,
      bonusPoints: 0,
      pointsBreakdown:
        rPts > 0
          ? `🏆 Ganador (${rTotal}/15) · +1 punto`
          : `Valoración ${rTotal}/15 (0)`,
      creativePoints: { ...creativeRazmik },
    };

    const nextG: PlayerRoundState = {
      ...gayaneState,
      responded: true,
      timeMs:
        gayaneState.timeMs ??
        (turnStyle === 'simultaneo'
          ? sharedElapsedMs > 0
            ? sharedElapsedMs
            : null
          : gayaneElapsedMs > 0
          ? gayaneElapsedMs
          : null),
      verdict: gTotal > 0 ? 'correct' : 'incorrect',
      pointsAwarded: gPts,
      bonusPoints: 0,
      pointsBreakdown:
        gPts > 0
          ? `🏆 Ganadora (${gTotal}/15) · +1 punto`
          : `Valoración ${gTotal}/15 (0)`,
      creativePoints: { ...creativeGayane },
    };

    setRazmikState(nextR);
    setGayaneState(nextG);
    setCreativeSubmitted(true);

    if (playMode !== 'practica') {
      const deltaR = rPts - appliedPointsRef.current.razmik;
      const deltaG = gPts - appliedPointsRef.current.gayane;
      if (deltaR !== 0 || deltaG !== 0) {
        onApplyScoreDelta(deltaR, deltaG);
        appliedPointsRef.current = { razmik: rPts, gayane: gPts };
      }
    }
  };

  const handleQuickCreativeWinner = (winner: PlayerId | 'empate') => {
    if (winner === 'razmik') {
      setCreativeRazmik({ gramatica: 5, logica: 5, vocabulario: 5 });
      setCreativeGayane({ gramatica: 3, logica: 3, vocabulario: 3 });
    } else if (winner === 'gayane') {
      setCreativeRazmik({ gramatica: 3, logica: 3, vocabulario: 3 });
      setCreativeGayane({ gramatica: 5, logica: 5, vocabulario: 5 });
    } else {
      setCreativeRazmik({ gramatica: 4, logica: 4, vocabulario: 4 });
      setCreativeGayane({ gramatica: 4, logica: 4, vocabulario: 4 });
    }
  };

  // Dedicated standalone Toggle / Reveal Answer button for ALL 12 games
  const handleToggleAnswer = () => {
    if (!answerRevealed) {
      pauseAllTimers();
      setAnswerRevealed(true);
      if (question.batchItems) {
        const allOpen: Record<string, boolean> = {};
        question.batchItems.forEach((b) => {
          allOpen[b.id] = true;
        });
        setRevealedBatchIds(allOpen);
      }
    } else {
      setAnswerRevealed(false);
      setRevealedBatchIds({});
    }
    soundFX.playClick();
  };

  const handleToggleSingleBatchWord = (id: string) => {
    soundFX.playClick();
    setRevealedBatchIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Per-clue independent Armenian toggle (Game 6: opening Pista 1's Armenian NEVER opens Pista 2 or 3!)
  const handleToggleClueHy = (clueIndex: number) => {
    soundFX.playClick();
    setRevealedClueHy((prev) => ({ ...prev, [clueIndex]: !prev[clueIndex] }));
  };

  // Compute round winner & fastest player
  const roundSummary = useMemo(() => {
    const rPts = razmikState.pointsAwarded;
    const gPts = gayaneState.pointsAwarded;
    const hasAnyVerdict = razmikState.verdict !== null || gayaneState.verdict !== null;

    let winner: PlayerId | 'empate' | 'ninguno' = 'ninguno';
    if (hasAnyVerdict) {
      if (rPts > gPts) winner = 'razmik';
      else if (gPts > rPts) winner = 'gayane';
      else if (rPts > 0 && rPts === gPts) winner = 'empate';
      else winner = 'ninguno';
    }

    const rHasTime = razmikState.timeMs !== null && razmikState.timeMs > 0;
    const gHasTime = gayaneState.timeMs !== null && gayaneState.timeMs > 0;

    let fastest: PlayerId | 'empate' | null = null;
    if (rHasTime && gHasTime) {
      if (razmikState.timeMs! < gayaneState.timeMs!) fastest = 'razmik';
      else if (gayaneState.timeMs! < razmikState.timeMs!) fastest = 'gayane';
      else fastest = 'empate';
    } else if (rHasTime) {
      fastest = 'razmik';
    } else if (gHasTime) {
      fastest = 'gayane';
    }

    const diffMs =
      rHasTime && gHasTime ? Math.abs(razmikState.timeMs! - gayaneState.timeMs!) : null;

    return { winner, fastest, hasAnyVerdict, diffMs };
  }, [gayaneState, razmikState]);

  const commitRoundIfNeeded = () => {
    if (roundCommittedRef.current) return;
    if (!roundSummary.hasAnyVerdict && !razmikState.responded && !gayaneState.responded) return;
    roundCommittedRef.current = true;
    const record: RoundRecord = {
      id: `rnd_${Date.now()}_${roundIdx}`,
      timestamp: Date.now(),
      roundNumber: roundIdx + 1,
      gameId: question.gameId,
      gameTitle: `${gameMeta.emoji} ${gameMeta.title}`,
      level: difficulty,
      prompt: question.prompt,
      answer: question.answer,
      razmik: razmikState,
      gayane: gayaneState,
      winner: roundSummary.winner,
      fastest: roundSummary.fastest,
    };
    onRecordRound(record);
  };

  const handleNextQuestion = () => {
    pauseAllTimers();
    commitRoundIfNeeded();
    soundFX.playClick();
    if (roundIdx + 1 >= deck.length) {
      onFinishMatch();
    } else {
      setRoundIdx((i) => i + 1);
    }
  };

  const handleSkipQuestion = () => {
    pauseAllTimers();
    const prev = appliedPointsRef.current;
    if (prev.razmik !== 0 || prev.gayane !== 0) {
      onApplyScoreDelta(-prev.razmik, -prev.gayane);
      appliedPointsRef.current = { razmik: 0, gayane: 0 };
    }
    soundFX.playClick();
    if (roundIdx + 1 >= deck.length) {
      onFinishMatch();
    } else {
      setRoundIdx((i) => i + 1);
    }
  };

  const handleTerminateMatch = () => {
    pauseAllTimers();
    commitRoundIfNeeded();
    onFinishMatch();
  };

  // Game 3 word click helpers
  const handlePickWord = (item: { id: number; word: string }) => {
    soundFX.playClick();
    setShuffledWordPool((prev) => prev.filter((w) => w.id !== item.id));
    setBuiltSentence((prev) => [...prev, item]);
  };

  const handleRemoveBuiltWord = (item: { id: number; word: string }) => {
    soundFX.playClick();
    setBuiltSentence((prev) => prev.filter((w) => w.id !== item.id));
    setShuffledWordPool((prev) => [...prev, item]);
  };

  const handleClearBuiltSentence = () => {
    if (!question.words) return;
    soundFX.playClick();
    setShuffledWordPool((prev) => [...prev, ...builtSentence]);
    setBuiltSentence([]);
  };

  const progressPercent = Math.round(((roundIdx + 1) / deck.length) * 100);

  const handlePromptClick = () => {
    if (gameMeta.isTranslationGame) return;
    setShowPromptHy((v) => !v);
    soundFX.playClick();
  };

  const isBatchTranslation =
    (question.gameId === 'traduccion_supersonica' || question.gameId === 'traduccion_reves') &&
    question.batchItems &&
    question.batchItems.length > 0;

  const calcPercent = (ms: number) =>
    effectiveLimitMs > 0 ? Math.min(100, (ms / effectiveLimitMs) * 100) : 0;
  const calcRemainingSec = (ms: number) =>
    effectiveLimitMs > 0 ? Math.max(0, Math.ceil((effectiveLimitMs - ms) / 1000)) : null;

  // Compute exact head-to-head bar share for the Progress panel
  const totalMatchPoints = matchRazmikPoints + matchGayanePoints;
  const razmikShare =
    totalMatchPoints > 0 ? Math.round((matchRazmikPoints / totalMatchPoints) * 100) : 50;
  const gayaneShare = totalMatchPoints > 0 ? 100 - razmikShare : 50;

  // Render an independent player turn card (used side-by-side in "Por turnos" mode)
  const renderIndependentPlayerCard = (player: PlayerId) => {
    const isRazmik = player === 'razmik';
    const status = isRazmik ? razmikTimerStatus : gayaneTimerStatus;
    const ms = isRazmik ? razmikElapsedMs : gayaneElapsedMs;
    const popKey = isRazmik ? razmikPopKey : gayanePopKey;
    const pState = isRazmik ? razmikState : gayaneState;
    const isMyTurn = activeTurnPlayer === player && !pState.responded;
    const remSec = calcRemainingSec(ms);
    const pct = calcPercent(ms);

    const cardBorder =
      status === 'running'
        ? isRazmik
          ? 'border-[#FF6500] ring-4 ring-orange-200/70 bg-orange-50/40'
          : 'border-[#F50089] ring-4 ring-pink-200/70 bg-pink-50/40'
        : isMyTurn
        ? isRazmik
          ? 'border-[#FF6500] bg-orange-50/30'
          : 'border-[#F50089] bg-pink-50/30'
        : isRazmik
        ? 'border-orange-200 bg-white'
        : 'border-pink-200 bg-white';

    const clockColor =
      status === 'ended' || (remSec !== null && remSec <= 3 && status === 'running')
        ? 'text-rose-600'
        : isRazmik
        ? 'text-[#FF6500]'
        : 'text-[#F50089]';

    const startBtnColor = isRazmik
      ? 'bg-[#FF6500] hover:bg-orange-600 text-white'
      : 'bg-[#F50089] hover:bg-pink-600 text-white';

    return (
      <div
        className={`rounded-3xl border-2 p-4 sm:p-5 transition-all space-y-3.5 ${cardBorder}`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              {isRazmik ? '⚽' : '🌸'}
            </span>
            <div>
              <div
                className={`font-display font-black text-lg sm:text-xl leading-none ${
                  isRazmik ? 'text-[#FF6500]' : 'text-[#F50089]'
                }`}
              >
                {isRazmik ? 'Razmik' : 'Gayane'}
              </div>
              <div className="text-xs font-bold text-slate-500 mt-0.5">
                {status === 'running'
                  ? '⏱️ ¡Tiempo en marcha!'
                  : pState.responded
                  ? '✅ Turno completado'
                  : isMyTurn
                  ? '👉 Su turno ahora'
                  : 'Esperando su turno'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {pState.verdict !== null && playMode !== 'practica' && (
              <span
                className={`px-2.5 py-1 rounded-xl text-xs sm:text-sm font-black tabular-nums ${
                  pState.pointsAwarded > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {pState.pointsAwarded === 1 ? '+1 pto' : `${pState.pointsAwarded} pts`}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleResetSinglePlayerTimer(player)}
              title={`Reiniciar solo el tiempo de ${isRazmik ? 'Razmik' : 'Gayane'}`}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
            >
              🔄 00:00
            </button>
          </div>
        </div>

        {/* Independent Digital Clock */}
        <div className="text-center py-1">
          <div
            key={popKey}
            className={`animate-timer-pop font-timer text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums ${clockColor}`}
          >
            {formatTimeMs(ms)}
          </div>
          {effectiveLimitMs > 0 && (
            <div className="mt-2 space-y-1">
              <div className="w-full h-2 rounded-full bg-white overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all duration-100 ${
                    pct > 80
                      ? 'bg-rose-500'
                      : isRazmik
                      ? 'bg-[#FF6500]'
                      : 'bg-[#F50089]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-xs font-semibold text-slate-500 tabular-nums">
                {status === 'ended'
                  ? '⏰ ¡Tiempo terminado!'
                  : status === 'running'
                  ? `Quedan ${remSec}s de ${effectiveLimitSec}s`
                  : `Límite: ${effectiveLimitSec}s`}
              </div>
            </div>
          )}
        </div>

        {/* Independent Start / Pause / Done buttons */}
        <div className="grid grid-cols-2 gap-2">
          {status !== 'running' ? (
            <button
              type="button"
              onClick={() => handleStartPlayerTimer(player)}
              className={`min-h-[48px] px-3 py-2.5 rounded-2xl font-display font-extrabold text-sm sm:text-base shadow-sm transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap ${startBtnColor}`}
            >
              ▶️ {status === 'paused' && !pState.responded ? 'Continuar' : 'Empezar'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handlePausePlayerTimer(player)}
              className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-display font-extrabold text-sm sm:text-base shadow-sm transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              ⏸️ Pausa
            </button>
          )}

          <button
            type="button"
            onClick={() => handlePlayerResponded(player)}
            disabled={pState.responded && status !== 'running'}
            className={`min-h-[48px] px-3 py-2.5 rounded-2xl font-display font-extrabold text-sm sm:text-base transition-all cursor-pointer whitespace-nowrap ${
              pState.responded && status !== 'running'
                ? 'bg-emerald-100 text-emerald-800 cursor-default'
                : 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm active:scale-[0.98]'
            }`}
          >
            {pState.responded && status !== 'running' ? '✅ ¡Respondió!' : '⏹️ ¡Respondió!'}
          </button>
        </div>

        {/* Teacher Verdict Buttons (Standard games, Competición/Contrarreloj) */}
        {playMode !== 'practica' && !gameMeta.isCreativeGame && (
          <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetVerdict(player, 'correct')}
                className={`flex-1 min-h-[46px] py-2 px-3 rounded-xl font-display font-bold text-sm sm:text-base transition-all cursor-pointer border-2 ${
                  pState.verdict === 'correct'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                ✅ Correcto
              </button>
              <button
                type="button"
                onClick={() => handleSetVerdict(player, 'incorrect')}
                className={`flex-1 min-h-[46px] py-2 px-3 rounded-xl font-display font-bold text-sm sm:text-base transition-all cursor-pointer border-2 ${
                  pState.verdict === 'incorrect'
                    ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                }`}
              >
                ❌ Incorrecto
              </button>
            </div>
            {pState.verdict !== null && pState.pointsBreakdown && (
              <div className="text-center text-xs font-bold text-slate-600">
                {pState.pointsBreakdown}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="w-full max-w-5xl mx-auto px-3 sm:px-5 pb-12 pt-1 space-y-4">
      {/* Top Progress & Context Strip */}
      <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-sky-100 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm sm:text-base font-bold text-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-slate-900">
              {gameMeta.emoji} {gameMeta.title}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600">
              {diffMeta.emoji} {diffMeta.es} ({diffMeta.cefr})
            </span>
            {modeId === 'torneo_mixto' && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-sky-700">🎲 Torneo Mixto</span>
              </>
            )}
            {isTieBreaker && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-rose-600 font-extrabold">⚡ Ronda decisiva</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <div className="inline-flex p-0.5 bg-sky-50 rounded-xl border border-sky-100 text-xs">
              <button
                type="button"
                onClick={() => handleSwitchTurnStyle('turnos')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  turnStyle === 'turnos'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🔁 Por turnos
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTurnStyle('simultaneo')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  turnStyle === 'simultaneo'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ⚡ A la vez
              </button>
            </div>

            <span className="text-sky-700 font-extrabold">
              Ronda {roundIdx + 1} / {deck.length}
            </span>

            <button
              type="button"
              onClick={() => {
                setShowInstructionHy((v) => !v);
                soundFX.playClick();
              }}
              title="Mostrar u ocultar la traducción de la instrucción"
              className={`px-3.5 py-1.5 rounded-xl text-sm font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                showInstructionHy
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              🇦🇲 Հայերեն
            </button>
          </div>
        </div>

        {/* Round Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-sky-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FF6500] via-sky-500 to-[#F50089] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Battle Stage */}
      <section className="bg-white rounded-3xl p-4 sm:p-7 shadow-sm border border-sky-100 space-y-5 animate-card-enter">
        {/* Instruction Bar + General Restart & Round Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <button
            type="button"
            onClick={() => {
              setShowInstructionHy((v) => !v);
              soundFX.playClick();
            }}
            className="text-left space-y-1 cursor-pointer group"
            title="Haz clic para ver la traducción de la instrucción"
          >
            <p className="text-base sm:text-lg font-semibold text-slate-700 group-hover:text-sky-800 transition-colors">
              {gameMeta.instructionEs}
            </p>
            {showInstructionHy && (
              <p className="text-base font-bold text-amber-800 animate-card-enter">
                🇦🇲 {gameMeta.instructionHy}
              </p>
            )}
          </button>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetRound}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-display font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              🔄 Reiniciar ronda
            </button>

            <button
              type="button"
              onClick={onRestartGame}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-display font-extrabold text-sm shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              title="Empieza este juego desde la Ronda 1 con preguntas nuevas"
            >
              🔁 Empezar de nuevo
            </button>

            <button
              type="button"
              onClick={handleSkipQuestion}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-display font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              ⏭️ Saltar
            </button>
          </div>
        </div>

        {/* ==================== QUESTION DISPLAY AREA ==================== */}
        <div className="py-1 sm:py-2">
          {/* GAMES 1 & 2: Multi-Word Translation Grid (each word reveals ONLY itself on click!) */}
          {isBatchTranslation && question.batchItems && (
            <div className="space-y-4">
              <div className="text-center text-sm sm:text-base font-extrabold text-sky-700">
                {question.gameId === 'traduccion_supersonica'
                  ? '🇦🇲 Հայերեն → 🇪🇸 Español · Toca una palabra para ver solo su traducción'
                  : '🇪🇸 Español → 🇦🇲 Հայերեն · Toca una palabra para ver solo su traducción'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {question.batchItems.map((item, idx) => {
                  const isItemOpen = Boolean(revealedBatchIds[item.id]);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleSingleBatchWord(item.id)}
                      className={`text-left rounded-2xl p-4 sm:p-5 border-2 transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        isItemOpen
                          ? 'bg-emerald-50/90 border-emerald-300 shadow-xs'
                          : 'bg-sky-50/50 border-sky-200 hover:border-sky-400 hover:bg-sky-50'
                      } ${
                        idx === question.batchItems!.length - 1 &&
                        question.batchItems!.length % 2 === 1
                          ? 'sm:col-span-2 sm:max-w-md sm:mx-auto sm:w-full'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-8 h-8 rounded-xl bg-sky-600 text-white font-display font-black text-sm flex items-center justify-center shrink-0 tabular-nums">
                            {idx + 1}
                          </span>
                          <span className="font-display text-2xl sm:text-3xl font-black text-slate-900 break-words leading-tight">
                            {item.prompt}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-400 shrink-0 pt-1">
                          {isItemOpen ? '✅' : '👀'}
                        </span>
                      </div>

                      {isItemOpen && (
                        <div className="pt-2 border-t border-emerald-200/80 font-display text-lg sm:text-xl font-extrabold text-emerald-900 break-words animate-card-enter">
                          → {item.answer}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fallback single-word translation card */}
          {(question.gameId === 'traduccion_supersonica' ||
            question.gameId === 'traduccion_reves') &&
            !isBatchTranslation && (
              <div className="text-center space-y-3 py-4">
                <div className="text-sm sm:text-base font-bold text-sky-600">
                  {question.gameId === 'traduccion_supersonica'
                    ? '🇦🇲 Հայերեն → 🇪🇸 Español'
                    : '🇪🇸 Español → 🇦🇲 Հայերեն'}
                </div>
                <div className="font-display text-4xl sm:text-5xl font-black text-slate-900 break-words px-2">
                  {question.prompt}
                </div>
              </div>
            )}

          {/* GAME 3: Construye la frase */}
          {question.gameId === 'construye_frase' && (
            <div className="space-y-4">
              <div className="text-center text-sm sm:text-base font-semibold text-slate-600">
                Toca las palabras en orden o di la frase completa en voz alta:
              </div>

              <div className="min-h-[76px] rounded-2xl bg-sky-50/70 border-2 border-dashed border-sky-200 p-3.5 flex flex-wrap items-center justify-center gap-2.5">
                {builtSentence.length === 0 ? (
                  <span className="text-base text-slate-400 font-medium">
                    Tu frase aparecerá aquí...
                  </span>
                ) : (
                  builtSentence.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleRemoveBuiltWord(item)}
                      className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-display font-bold text-lg sm:text-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                    >
                      {item.word}
                    </button>
                  ))
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {shuffledWordPool.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePickWord(item)}
                    className="min-h-[50px] px-4 py-2.5 rounded-xl bg-white hover:bg-sky-50 text-slate-800 border-2 border-sky-200 hover:border-sky-400 font-display font-bold text-lg sm:text-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                  >
                    {item.word}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {builtSentence.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearBuiltSentence}
                    className="text-sm font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Limpiar palabras
                  </button>
                )}
                {question.promptHy && (
                  <button
                    type="button"
                    onClick={handlePromptClick}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs sm:text-sm font-bold cursor-pointer"
                  >
                    {showPromptHy ? 'Ocultar 🇦🇲' : '🇦🇲 Ver traducción de la frase'}
                  </button>
                )}
              </div>

              {showPromptHy && question.promptHy && (
                <div className="text-center text-base sm:text-lg font-bold text-amber-800 bg-amber-50 rounded-2xl p-3.5 animate-card-enter">
                  🇦🇲 {question.promptHy}
                </div>
              )}
            </div>
          )}

          {/* GAME 6: Tres pistas, una palabra — EACH CLUE OPENS ONLY ITS OWN ARMENIAN TRANSLATION! */}
          {question.gameId === 'tres_pistas' && question.clues && (
            <div className="space-y-3 max-w-2xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm sm:text-base font-bold text-cyan-800">
                <span>Pistas abiertas: {cluesOpened} / 3</span>
                <span>⚡ Quien acierte más rápido gana +1 punto</span>
              </div>

              <div className="space-y-2.5">
                {question.clues.slice(0, cluesOpened).map((clue, i) => {
                  const isThisClueHyOpen = Boolean(revealedClueHy[i]);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleToggleClueHy(i)}
                      className="w-full text-left rounded-2xl bg-cyan-50/75 border-2 border-cyan-200 p-4 sm:p-5 transition-colors hover:bg-cyan-50 hover:border-cyan-300 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs sm:text-sm font-extrabold text-cyan-700">
                          Pista {i + 1}
                        </span>
                        <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                          {isThisClueHyOpen ? '🇦🇲 Ocultar' : '🇦🇲 Traducir esta pista'}
                        </span>
                      </div>
                      <div className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                        {clue}
                      </div>
                      {isThisClueHyOpen && question.cluesHy?.[i] && (
                        <div className="text-base font-bold text-amber-800 mt-1.5 pt-1.5 border-t border-cyan-200/70 animate-card-enter">
                          🇦🇲 {question.cluesHy[i]}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {cluesOpened < 3 && !answerRevealed && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setCluesOpened((c) => (c === 1 ? 2 : 3));
                    }}
                    className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-display font-bold text-base shadow-sm cursor-pointer"
                  >
                    ➕ Abrir Pista {cluesOpened + 1}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* GAME 8: Elige el tiempo */}
          {question.gameId === 'elige_tiempo' && question.options && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <button
                type="button"
                onClick={handlePromptClick}
                className="w-full text-center rounded-2xl bg-blue-50/60 border border-blue-100 p-5 sm:p-6 cursor-pointer hover:bg-blue-50 transition-colors"
                title="Haz clic para ver la traducción al armenio"
              >
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug break-words">
                  {question.prompt}
                </div>
                {showPromptHy && question.promptHy ? (
                  <div className="mt-2 text-base sm:text-lg font-bold text-amber-800 animate-card-enter">
                    🇦🇲 {question.promptHy}
                  </div>
                ) : (
                  <div className="mt-1.5 text-xs font-semibold text-slate-400">
                    Toca la frase para ver su traducción 🇦🇲
                  </div>
                )}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {question.options.map((opt) => {
                  const isSelected = selectedOption === opt.label;
                  const isCorrect = answerRevealed && question.correctOption === opt.label;
                  const isWrongSelected =
                    answerRevealed && isSelected && question.correctOption !== opt.label;

                  let btnStyle =
                    'bg-white border-sky-200 text-slate-800 hover:border-sky-400 hover:bg-sky-50/60';
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-500 border-emerald-600 text-white shadow-sm';
                  } else if (isWrongSelected) {
                    btnStyle = 'bg-rose-500 border-rose-600 text-white';
                  } else if (isSelected) {
                    btnStyle = 'bg-sky-600 border-sky-600 text-white shadow-sm';
                  }

                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        soundFX.playClick();
                        setSelectedOption(opt.label);
                      }}
                      className={`min-h-[58px] px-4 py-3.5 rounded-2xl border-2 font-display font-bold text-lg sm:text-xl text-left flex items-center gap-3 transition-all cursor-pointer ${btnStyle}`}
                    >
                      <span className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center font-black shrink-0">
                        {opt.label}
                      </span>
                      <span className="break-words">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* GAME 11: Categorías explosivas */}
          {question.gameId === 'categorias_explosivas' && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 py-4">
              <button
                type="button"
                onClick={handlePromptClick}
                className="rounded-3xl bg-fuchsia-50 border-2 border-fuchsia-200 px-7 py-6 text-center min-w-[240px] cursor-pointer hover:bg-fuchsia-100/70 transition-colors"
              >
                <div className="text-sm font-bold text-fuchsia-700">Categoría</div>
                <div className="font-display text-3xl sm:text-4xl font-black text-slate-900 mt-1">
                  {question.category}
                </div>
                {showPromptHy && question.categoryHy ? (
                  <div className="text-base font-bold text-amber-800 mt-1.5 animate-card-enter">
                    🇦🇲 {question.categoryHy}
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-fuchsia-500/80 mt-1">
                    Toca para 🇦🇲
                  </div>
                )}
              </button>

              <div className="rounded-3xl bg-gradient-to-br from-[#FF6500] to-[#F50089] text-white w-32 h-32 sm:w-36 sm:h-36 flex flex-col items-center justify-center shadow-md shrink-0">
                <span className="text-sm font-bold text-white/90">Letra</span>
                <span className="font-display text-6xl sm:text-7xl font-black leading-none mt-0.5">
                  {question.letter}
                </span>
              </div>
            </div>
          )}

          {/* GAMES 4, 5, 7, 9, 10, 12: Rich Spanish Prompt Card */}
          {(question.gameId === 'palabra_misteriosa' ||
            question.gameId === 'compra_10s' ||
            question.gameId === 'dilo_otra_manera' ||
            question.gameId === 'continua_historia' ||
            question.gameId === 'duelo_preguntas' ||
            question.gameId === 'mision_espana') && (
            <button
              type="button"
              onClick={handlePromptClick}
              className="w-full text-center rounded-3xl bg-sky-50/50 border border-sky-100 px-5 py-6 sm:px-8 sm:py-8 hover:bg-sky-50 transition-colors cursor-pointer space-y-3"
              title="Haz clic para mostrar u ocultar la traducción de esta pregunta"
            >
              {question.location && (
                <div className="text-sm sm:text-base font-extrabold text-sky-700">
                  📍 Escenario: {question.location}
                  {showPromptHy && question.locationHy ? ` · 🇦🇲 ${question.locationHy}` : ''}
                </div>
              )}

              <div className="font-display text-2xl sm:text-4xl font-extrabold text-slate-900 leading-snug break-words text-balance">
                {question.prompt}
              </div>

              {question.rubricHint && (
                <div className="text-sm sm:text-base font-semibold text-rose-600">
                  💡 {question.rubricHint}
                </div>
              )}

              {showPromptHy && question.promptHy ? (
                <div className="pt-2 text-base sm:text-lg font-bold text-amber-800 animate-card-enter">
                  🇦🇲 {question.promptHy}
                </div>
              ) : (
                <div className="text-xs sm:text-sm font-medium text-slate-400">
                  Toca esta tarjeta para ver la traducción 🇦🇲
                </div>
              )}
            </button>
          )}
        </div>

        {/* ==================== DEDICATED STANDALONE "VER RESPUESTA" BUTTON FOR ALL 12 GAMES ==================== */}
        <div className="flex flex-col items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleToggleAnswer}
            className={`min-h-[54px] px-8 py-3 rounded-2xl font-display font-extrabold text-base sm:text-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap ${
              answerRevealed
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {answerRevealed
              ? isBatchTranslation
                ? '🙈 Ocultar todas las respuestas'
                : '🙈 Ocultar respuesta'
              : isBatchTranslation
              ? '👀 Ver todas las respuestas'
              : '👀 Ver respuesta'}
          </button>
        </div>

        {/* ==================== REVEALED ANSWER PANEL (FOR NON-BATCH GAMES) ==================== */}
        {answerRevealed && !isBatchTranslation && (
          <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-5 sm:p-6 space-y-2 animate-card-enter">
            <div className="text-sm font-extrabold text-emerald-700">
              {gameMeta.isCreativeGame ? '✨ Ejemplo de continuación' : '✅ Respuesta correcta'}
            </div>
            <div className="font-display text-2xl sm:text-3xl font-black text-emerald-950 break-words">
              {question.answer}
            </div>
            {question.altAnswers && question.altAnswers.length > 0 && (
              <div className="text-base text-emerald-900 pt-1">
                <span className="font-bold">También se acepta: </span>
                {question.altAnswers.join('  ·  ')}
              </div>
            )}
            {question.answerDetail && (
              <div className="text-sm sm:text-base font-semibold text-emerald-800/90">
                {question.answerDetail}
              </div>
            )}
          </div>
        )}

        {/* ==================== TIMERS & PLAYER CONTROLS SECTION ==================== */}
        {turnStyle === 'turnos' ? (
          <div className="space-y-3.5 pt-3 border-t border-slate-100">
            <div className="rounded-2xl bg-sky-50 border border-sky-100 px-4 py-3 text-center text-sm sm:text-base font-bold text-slate-700">
              {!razmikState.responded && !gayaneState.responded && (
                <span>
                  🔁 Cada jugador responde por turno con su propio tiempo. Empieza{' '}
                  <strong className={activeTurnPlayer === 'razmik' ? 'text-[#FF6500]' : 'text-[#F50089]'}>
                    {activeTurnPlayer === 'razmik' ? '⚽ Razmik' : '🌸 Gayane'}
                  </strong>{' '}
                  pulsando «▶️ Empezar».
                </span>
              )}
              {razmikState.responded && !gayaneState.responded && (
                <span>
                  ✅ Razmik terminó en{' '}
                  <strong className="font-timer text-[#FF6500]">
                    {formatTimeMs(razmikState.timeMs)}
                  </strong>{' '}
                  · 👉 Ahora toca a <strong className="text-[#F50089]">🌸 Gayane</strong> (pulsa
                  «▶️ Empezar» en su tarjeta).
                </span>
              )}
              {!razmikState.responded && gayaneState.responded && (
                <span>
                  ✅ Gayane terminó en{' '}
                  <strong className="font-timer text-[#F50089]">
                    {formatTimeMs(gayaneState.timeMs)}
                  </strong>{' '}
                  · 👉 Ahora toca a <strong className="text-[#FF6500]">⚽ Razmik</strong> (pulsa
                  «▶️ Empezar» en su tarjeta).
                </span>
              )}
              {razmikState.responded && gayaneState.responded && (
                <span>
                  🏁 ¡Ambos han respondido!{' '}
                  {roundSummary.fastest === 'razmik' && (
                    <strong className="text-[#FF6500]">
                      ⚡ Razmik fue más rápido
                      {roundSummary.diffMs !== null
                        ? ` por ${(roundSummary.diffMs / 1000).toFixed(2)}s`
                        : ''}
                    </strong>
                  )}
                  {roundSummary.fastest === 'gayane' && (
                    <strong className="text-[#F50089]">
                      ⚡ Gayane fue más rápida
                      {roundSummary.diffMs !== null
                        ? ` por ${(roundSummary.diffMs / 1000).toFixed(2)}s`
                        : ''}
                    </strong>
                  )}
                  {roundSummary.fastest === 'empate' && (
                    <strong className="text-sky-700">⚡ ¡Empate exacto en tiempo!</strong>
                  )}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderIndependentPlayerCard('razmik')}
              {renderIndependentPlayerCard('gayane')}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <div className="rounded-2xl bg-sky-50/80 border border-sky-100 p-4 sm:p-5 space-y-3.5 text-center">
              <div
                key={sharedPopKey}
                className={`animate-timer-pop font-timer text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums ${
                  sharedStatus === 'ended' ||
                  (calcRemainingSec(sharedElapsedMs) !== null &&
                    calcRemainingSec(sharedElapsedMs)! <= 3 &&
                    sharedStatus === 'running')
                    ? 'text-rose-600'
                    : 'text-slate-900'
                }`}
              >
                {formatTimeMs(sharedElapsedMs)}
              </div>

              <div className="text-sm sm:text-base font-semibold text-slate-600">
                {sharedStatus === 'idle' && 'Pulsa «▶️ Empezar» cuando ambos estén listos.'}
                {sharedStatus === 'running' &&
                  (effectiveLimitSec > 0
                    ? `⏱️ Quedan ${calcRemainingSec(sharedElapsedMs)}s de ${effectiveLimitSec}s`
                    : '⏱️ Cronómetro en marcha')}
                {sharedStatus === 'paused' && '⏸️ En pausa'}
                {sharedStatus === 'ended' && '⏰ ¡Tiempo terminado!'}
              </div>

              {effectiveLimitMs > 0 && (
                <div className="w-full max-w-md mx-auto h-2.5 rounded-full bg-white overflow-hidden border border-sky-200">
                  <div
                    className={`h-full transition-all duration-100 ${
                      calcPercent(sharedElapsedMs) > 80 ? 'bg-rose-500' : 'bg-sky-500'
                    }`}
                    style={{ width: `${calcPercent(sharedElapsedMs)}%` }}
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                {sharedStatus !== 'running' ? (
                  <button
                    type="button"
                    onClick={handleStartSharedTimer}
                    className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-display font-extrabold text-base sm:text-lg shadow-sm transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap"
                  >
                    ▶️ {sharedStatus === 'paused' ? 'Continuar' : 'Empezar'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePauseSharedTimer}
                    className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-display font-extrabold text-base sm:text-lg shadow-sm transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap"
                  >
                    ⏸️ Pausa
                  </button>
                )}
              </div>
            </div>

            {playMode !== 'practica' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Razmik simultaneous card */}
                <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/40 p-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => handlePlayerResponded('razmik')}
                    disabled={razmikState.responded}
                    className={`w-full min-h-[54px] px-4 py-3 rounded-2xl font-display font-extrabold text-base sm:text-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      razmikState.responded
                        ? 'bg-orange-100 text-[#FF6500] cursor-default'
                        : 'bg-[#FF6500] hover:bg-orange-600 text-white shadow-sm active:scale-[0.98]'
                    }`}
                  >
                    <span>⚽</span>
                    <span>
                      {razmikState.responded
                        ? `Razmik (${formatTimeMs(razmikState.timeMs)})`
                        : '¡Razmik respondió!'}
                    </span>
                  </button>
                  {!gameMeta.isCreativeGame && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetVerdict('razmik', 'correct')}
                          className={`flex-1 min-h-[46px] py-2 px-3 rounded-xl font-display font-bold text-base transition-all cursor-pointer border-2 ${
                            razmikState.verdict === 'correct'
                              ? 'bg-emerald-500 text-white border-emerald-600'
                              : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          ✅ Correcto
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetVerdict('razmik', 'incorrect')}
                          className={`flex-1 min-h-[46px] py-2 px-3 rounded-xl font-display font-bold text-base transition-all cursor-pointer border-2 ${
                            razmikState.verdict === 'incorrect'
                              ? 'bg-rose-500 text-white border-rose-600'
                              : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                          }`}
                        >
                          ❌ Incorrecto
                        </button>
                      </div>
                      {razmikState.verdict !== null && razmikState.pointsBreakdown && (
                        <div className="text-center text-xs font-bold text-slate-600">
                          {razmikState.pointsBreakdown}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Gayane simultaneous card */}
                <div className="rounded-2xl border-2 border-pink-200 bg-pink-50/40 p-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => handlePlayerResponded('gayane')}
                    disabled={gayaneState.responded}
                    className={`w-full min-h-[54px] px-4 py-3 rounded-2xl font-display font-extrabold text-base sm:text-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      gayaneState.responded
                        ? 'bg-pink-100 text-[#F50089] cursor-default'
                        : 'bg-[#F50089] hover:bg-pink-600 text-white shadow-sm active:scale-[0.98]'
                    }`}
                  >
                    <span>🌸</span>
                    <span>
                      {gayaneState.responded
                        ? `Gayane (${formatTimeMs(gayaneState.timeMs)})`
                        : '¡Gayane respondió!'}
                    </span>
                  </button>
                  {!gameMeta.isCreativeGame && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetVerdict('gayane', 'correct')}
                          className={`flex-1 min-h-[46px] py-2 px-3 rounded-xl font-display font-bold text-base transition-all cursor-pointer border-2 ${
                            gayaneState.verdict === 'correct'
                              ? 'bg-emerald-500 text-white border-emerald-600'
                              : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          ✅ Correcto
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetVerdict('gayane', 'incorrect')}
                          className={`flex-1 min-h-[46px] py-2 px-3 rounded-xl font-display font-bold text-base transition-all cursor-pointer border-2 ${
                            gayaneState.verdict === 'incorrect'
                              ? 'bg-rose-500 text-white border-rose-600'
                              : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                          }`}
                        >
                          ❌ Incorrecto
                        </button>
                      </div>
                      {gayaneState.verdict !== null && gayaneState.pointsBreakdown && (
                        <div className="text-center text-xs font-bold text-slate-600">
                          {gayaneState.pointsBreakdown}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* GAME 9 Creative Teacher Rubric */}
        {playMode !== 'practica' && gameMeta.isCreativeGame && (
          <div className="rounded-2xl bg-rose-50/60 border border-rose-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display font-extrabold text-lg text-slate-900">
                  🎬 Evaluación creativa del profesor
                </h3>
                <p className="text-sm text-slate-600">
                  Valora de 0 a 5 en cada criterio (Gramática, Lógica, Vocabulario) o elige un ganador rápido.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickCreativeWinner('razmik')}
                  className="px-3.5 py-2 rounded-xl bg-[#FF6500] text-white text-sm font-bold cursor-pointer"
                >
                  ⚽ Gana Razmik
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCreativeWinner('gayane')}
                  className="px-3.5 py-2 rounded-xl bg-[#F50089] text-white text-sm font-bold cursor-pointer"
                >
                  🌸 Gana Gayane
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCreativeWinner('empate')}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 text-white text-sm font-bold cursor-pointer"
                >
                  🤝 Empate
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-orange-200 space-y-2.5">
                <div className="font-display font-extrabold text-base text-[#FF6500] flex justify-between">
                  <span>⚽ Razmik</span>
                  <span className="tabular-nums">
                    {creativeRazmik.gramatica +
                      creativeRazmik.logica +
                      creativeRazmik.vocabulario}{' '}
                    pts
                  </span>
                </div>
                {(['gramatica', 'logica', 'vocabulario'] as const).map((crit) => (
                  <div key={crit} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-slate-700 capitalize">
                      {crit === 'gramatica'
                        ? 'Gramática'
                        : crit === 'logica'
                        ? 'Lógica'
                        : 'Vocabulario'}
                    </span>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setCreativeRazmik((prev) => ({ ...prev, [crit]: n }))
                          }
                          className={`w-8 h-8 rounded-lg font-bold tabular-nums cursor-pointer ${
                            creativeRazmik[crit] === n
                              ? 'bg-[#FF6500] text-white'
                              : 'bg-orange-50 text-slate-700 hover:bg-orange-100'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl p-4 border border-pink-200 space-y-2.5">
                <div className="font-display font-extrabold text-base text-[#F50089] flex justify-between">
                  <span>🌸 Gayane</span>
                  <span className="tabular-nums">
                    {creativeGayane.gramatica +
                      creativeGayane.logica +
                      creativeGayane.vocabulario}{' '}
                    pts
                  </span>
                </div>
                {(['gramatica', 'logica', 'vocabulario'] as const).map((crit) => (
                  <div key={crit} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-slate-700 capitalize">
                      {crit === 'gramatica'
                        ? 'Gramática'
                        : crit === 'logica'
                        ? 'Lógica'
                        : 'Vocabulario'}
                    </span>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setCreativeGayane((prev) => ({ ...prev, [crit]: n }))
                          }
                          className={`w-8 h-8 rounded-lg font-bold tabular-nums cursor-pointer ${
                            creativeGayane[crit] === n
                              ? 'bg-[#F50089] text-white'
                              : 'bg-pink-50 text-slate-700 hover:bg-pink-100'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleApplyCreativeRubric}
                className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-display font-extrabold text-base shadow-sm cursor-pointer"
              >
                {creativeSubmitted ? '🔄 Actualizar puntos de la ronda' : '✅ Asignar puntos de la ronda'}
              </button>
            </div>
          </div>
        )}

        {/* Round Result Summary Banner */}
        {playMode !== 'practica' && roundSummary.hasAnyVerdict && (
          <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 sm:p-5 space-y-2 animate-card-enter">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-display font-extrabold text-lg sm:text-xl text-slate-900">
                {roundSummary.winner === 'razmik' && '🏆 ¡Razmik gana esta ronda!'}
                {roundSummary.winner === 'gayane' && '🏆 ¡Gayane gana esta ronda!'}
                {roundSummary.winner === 'empate' && '🤝 ¡Empate en esta ronda!'}
                {roundSummary.winner === 'ninguno' && '💪 ¡A por la siguiente pregunta!'}
              </div>

              {roundSummary.fastest && (
                <div className="text-sm sm:text-base font-bold text-sky-800">
                  {roundSummary.fastest === 'razmik' && '⚡ Más rápido: Razmik'}
                  {roundSummary.fastest === 'gayane' && '⚡ Más rápida: Gayane'}
                  {roundSummary.fastest === 'empate' && '⚡ Mismo tiempo exacto'}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm sm:text-base font-semibold tabular-nums">
              <div className="text-[#FF6500]">
                ⚽ Razmik:{' '}
                <strong>
                  {razmikState.pointsAwarded === 1 ? '+1 punto' : '0 puntos'}
                </strong>
                {razmikState.pointsBreakdown && ` · ${razmikState.pointsBreakdown}`} · ⏱️{' '}
                {formatTimeMs(razmikState.timeMs)}
              </div>
              <div className="text-[#F50089]">
                🌸 Gayane:{' '}
                <strong>
                  {gayaneState.pointsAwarded === 1 ? '+1 punto' : '0 puntos'}
                </strong>
                {gayaneState.pointsBreakdown && ` · ${gayaneState.pointsBreakdown}`} · ⏱️{' '}
                {formatTimeMs(gayaneState.timeMs)}
              </div>
            </div>
            <div className="text-xs sm:text-sm text-slate-500">
              Puedes corregir ✅ / ❌ arriba en cualquier momento antes de pasar a la siguiente pregunta.
            </div>
          </div>
        )}

        {/* Bottom Navigation Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBackToMenu}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-display font-bold text-sm sm:text-base transition-colors cursor-pointer whitespace-nowrap"
            >
              ← Juegos
            </button>
            <button
              type="button"
              onClick={onRestartGame}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-display font-bold text-sm sm:text-base transition-colors cursor-pointer whitespace-nowrap"
            >
              🔁 Empezar de nuevo
            </button>
            <button
              type="button"
              onClick={onRequestResetAll}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-display font-bold text-sm sm:text-base transition-colors cursor-pointer whitespace-nowrap"
            >
              🗑️ Reiniciar todo
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTerminateMatch}
              className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-display font-bold text-sm sm:text-base transition-colors cursor-pointer whitespace-nowrap"
            >
              🏁 Terminar
            </button>
            <button
              type="button"
              onClick={handleNextQuestion}
              className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-display font-extrabold text-base sm:text-lg shadow-sm transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              {roundIdx + 1 >= deck.length ? '🏆 Ver resultados finales' : '➡️ Siguiente pregunta'}
            </button>
          </div>
        </div>
      </section>

      {/* ==================== SEPARATE DEDICATED POINTS PROGRESS PANEL ==================== */}
      {playMode !== 'practica' && (
        <section
          aria-label="Progreso de puntos de la partida"
          className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-sky-100 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-slate-900">
              📊 Progreso de puntos — Esta partida
            </h2>
            <span className="text-sm font-bold text-slate-600 tabular-nums">
              {matchRazmikPoints > matchGayanePoints &&
                `⚽ Razmik gana por +${matchRazmikPoints - matchGayanePoints} ${
                  matchRazmikPoints - matchGayanePoints === 1 ? 'punto' : 'puntos'
                }`}
              {matchGayanePoints > matchRazmikPoints &&
                `🌸 Gayane gana por +${matchGayanePoints - matchRazmikPoints} ${
                  matchGayanePoints - matchRazmikPoints === 1 ? 'punto' : 'puntos'
                }`}
              {matchRazmikPoints === matchGayanePoints && '🤝 Empate por ahora'}
            </span>
          </div>

          {/* Visual Head-to-Head Score Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-base sm:text-lg font-display font-black tabular-nums">
              <span className="text-[#FF6500]">
                ⚽ Razmik: {matchRazmikPoints} {matchRazmikPoints === 1 ? 'punto' : 'puntos'}
              </span>
              <span className="text-[#F50089]">
                🌸 Gayane: {matchGayanePoints} {matchGayanePoints === 1 ? 'punto' : 'puntos'}
              </span>
            </div>
            <div className="w-full h-5 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200">
              <div
                className="h-full bg-[#FF6500] transition-all duration-300 flex items-center justify-start pl-2 text-[11px] font-black text-white"
                style={{ width: `${razmikShare}%` }}
              >
                {totalMatchPoints > 0 && razmikShare >= 18 ? `${razmikShare}%` : ''}
              </div>
              <div
                className="h-full bg-[#F50089] transition-all duration-300 flex items-center justify-end pr-2 text-[11px] font-black text-white"
                style={{ width: `${gayaneShare}%` }}
              >
                {totalMatchPoints > 0 && gayaneShare >= 18 ? `${gayaneShare}%` : ''}
              </div>
            </div>
          </div>

          {/* Round-by-Round Points Breakdown */}
          <div className="space-y-2">
            <div className="text-xs sm:text-sm font-bold text-slate-500">
              Puntos por ronda (R1 – R{deck.length}):
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {deck.map((_, idx) => {
                const committed = matchRounds.find((r) => r.roundNumber === idx + 1);
                const isCurrent = idx === roundIdx;
                const rPts = isCurrent
                  ? razmikState.pointsAwarded
                  : committed?.razmik.pointsAwarded ?? null;
                const gPts = isCurrent
                  ? gayaneState.pointsAwarded
                  : committed?.gayane.pointsAwarded ?? null;
                const hasData = isCurrent
                  ? razmikState.verdict !== null || gayaneState.verdict !== null
                  : Boolean(committed);

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl p-2.5 border text-xs sm:text-sm tabular-nums transition-colors ${
                      isCurrent
                        ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-100'
                        : hasData
                        ? 'bg-slate-50/80 border-slate-200'
                        : 'bg-white border-dashed border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between font-extrabold text-slate-700 mb-1">
                      <span>R{idx + 1}</span>
                      <span>
                        {isCurrent
                          ? '●'
                          : committed?.winner === 'razmik'
                          ? '⚽'
                          : committed?.winner === 'gayane'
                          ? '🌸'
                          : committed?.winner === 'empate'
                          ? '🤝'
                          : '·'}
                      </span>
                    </div>
                    {hasData ? (
                      <div className="space-y-0.5 font-bold">
                        <div className="text-[#FF6500] flex justify-between">
                          <span>⚽ R:</span>
                          <span>+{rPts ?? 0}</span>
                        </div>
                        <div className="text-[#F50089] flex justify-between">
                          <span>🌸 G:</span>
                          <span>+{gPts ?? 0}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 font-medium py-1">
                        {isCurrent ? 'En curso' : 'Pendiente'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
