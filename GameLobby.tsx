import { ALL_QUESTIONS, GAMES_CATALOG } from './gameCatalog';
import {
  Difficulty,
  GameId,
  PlayMode,
  RoundsOption,
  SelectedModeId,
  TimeLimitOption,
  TurnStyle,
} from './types';

interface GameLobbyProps {
  difficulty: Difficulty;
  playMode: PlayMode;
  turnStyle: TurnStyle;
  roundsCount: RoundsOption;
  timeLimit: TimeLimitOption;
  showArmenianLobby: boolean;
  onToggleArmenianLobby: () => void;
  onChangeDifficulty: (d: Difficulty) => void;
  onChangePlayMode: (m: PlayMode) => void;
  onChangeTurnStyle: (t: TurnStyle) => void;
  onChangeRounds: (r: RoundsOption) => void;
  onChangeTimeLimit: (t: TimeLimitOption) => void;
  onSelectGame: (id: SelectedModeId) => void;
  onNewMatch: () => void;
  onRequestResetAll: () => void;
}

export function GameLobby({
  difficulty,
  playMode,
  turnStyle,
  roundsCount,
  timeLimit,
  showArmenianLobby,
  onToggleArmenianLobby,
  onChangeDifficulty,
  onChangePlayMode,
  onChangeTurnStyle,
  onChangeRounds,
  onChangeTimeLimit,
  onSelectGame,
  onNewMatch,
  onRequestResetAll,
}: GameLobbyProps) {
  const countQuestions = (gameId: GameId) =>
    ALL_QUESTIONS.filter((q) => q.gameId === gameId && q.level === difficulty).length;

  return (
    <main className="w-full max-w-6xl mx-auto px-3 sm:px-5 pb-12 pt-2 space-y-5">
      {/* Controls Card: Difficulty, Play Mode, and Match Settings */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-sky-100 space-y-4">
        {/* Row 1: Difficulty & Mode */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Difficulty Selector */}
          <div>
            <div className="text-xs font-bold text-slate-500 mb-2">
              Nivel de dificultad {showArmenianLobby && '· Բարդության մակարդակ'}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['facil', '🟢', 'Fácil', 'A1–A2', 'bg-emerald-500 text-white border-emerald-500 shadow-sm'],
                  ['medio', '🔵', 'Medio', 'A2–B1', 'bg-sky-500 text-white border-sky-500 shadow-sm'],
                  ['dificil', '🔴', 'Difícil', 'B1–B2', 'bg-rose-500 text-white border-rose-500 shadow-sm'],
                ] as const
              ).map(([val, emoji, label, cefr, activeStyle]) => {
                const isActive = difficulty === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onChangeDifficulty(val)}
                    className={`min-h-[48px] px-3 py-2.5 rounded-2xl border-2 font-display font-bold text-sm sm:text-base transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                      isActive
                        ? activeStyle
                        : 'bg-sky-50/50 border-sky-100 text-slate-700 hover:bg-sky-50'
                    }`}
                  >
                    <span className="whitespace-nowrap">
                      {emoji} {label}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        isActive ? 'text-white/90' : 'text-slate-400'
                      }`}
                    >
                      {cefr}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Play Mode Selector */}
          <div>
            <div className="text-xs font-bold text-slate-500 mb-2">
              Modo de juego {showArmenianLobby && '· Խաղի ռեժիմ'}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['competicion', '🏆', 'Competición'],
                  ['practica', '🎯', 'Práctica libre'],
                  ['contrarreloj', '⏱️', 'Contrarreloj'],
                ] as const
              ).map(([val, emoji, label]) => {
                const isActive = playMode === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onChangePlayMode(val)}
                    className={`min-h-[48px] px-2.5 py-2.5 rounded-2xl border-2 font-display font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                      isActive
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                        : 'bg-sky-50/50 border-sky-100 text-slate-700 hover:bg-sky-50'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="leading-tight">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: Compact Match Settings */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Turn style */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Turnos:</span>
              <div className="inline-flex p-1 bg-sky-50 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => onChangeTurnStyle('simultaneo')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    turnStyle === 'simultaneo'
                      ? 'bg-white text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚡ A la vez
                </button>
                <button
                  type="button"
                  onClick={() => onChangeTurnStyle('turnos')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    turnStyle === 'turnos'
                      ? 'bg-white text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔁 Por turnos
                </button>
              </div>
            </div>

            {/* Rounds */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Rondas:</span>
              <div className="inline-flex p-1 bg-sky-50 rounded-xl gap-0.5">
                {([5, 10, 15, 20] as RoundsOption[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onChangeRounds(r)}
                    className={`min-w-[34px] px-2 py-1.5 rounded-lg text-xs font-bold tabular-nums transition-colors cursor-pointer ${
                      roundsCount === r
                        ? 'bg-white text-sky-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Time limit */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Tiempo:</span>
              <div className="inline-flex p-1 bg-sky-50 rounded-xl gap-0.5 flex-wrap">
                {([10, 20, 30, 60, 0] as TimeLimitOption[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onChangeTimeLimit(t)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold tabular-nums transition-colors cursor-pointer whitespace-nowrap ${
                      timeLimit === t
                        ? 'bg-white text-sky-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t === 0 ? '∞ Sin límite' : `${t}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Utility Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleArmenianLobby}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                showArmenianLobby
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              🇦🇲 Հայերեն
            </button>

            <button
              type="button"
              onClick={onNewMatch}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer whitespace-nowrap"
              title="Empieza con 0 puntos guardando el historial y victorias"
            >
              🆕 Nueva partida
            </button>

            <button
              type="button"
              onClick={onRequestResetAll}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              🔁 Reiniciar todo
            </button>
          </div>
        </div>
      </section>

      {/* Featured Mixed Tournament Banner */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border-2 border-sky-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-sky-600">
            🎲 Modo Especial · 12 juegos combinados automáticamente
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-black text-slate-900">
            🏆 ¡Gran Torneo Mixto — Razmik vs Gayane!
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            Cada ronda cambia de juego automáticamente para entrenar traducción, vocabulario, tiempos verbales, rapidez y creatividad.
          </p>
          {showArmenianLobby && (
            <p className="text-sm font-semibold text-amber-800 pt-0.5">
              🇦🇲 Ամեն փուլում խաղն ավտոմատ փոխվում է՝ ստուգելով թարգմանությունը, բառապաշարը, արագությունը և ստեղծագործականությունը։
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSelectGame('torneo_mixto')}
          className="w-full md:w-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-[#FF6500] via-sky-500 to-[#F50089] hover:opacity-95 text-white font-display font-extrabold text-base sm:text-lg shadow-md transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
        >
          🎲 ¡Empezar Torneo Mixto!
        </button>
      </section>

      {/* 12 Games Grid */}
      <section aria-label="Lista de 12 juegos">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-display text-lg sm:text-xl font-extrabold text-slate-800">
            🎮 Elige uno de los 12 juegos
          </h2>
          <span className="text-xs sm:text-sm font-semibold text-slate-500">
            12 juegos · 3 niveles
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {GAMES_CATALOG.map((game) => {
            const qCount = countQuestions(game.id);
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => onSelectGame(game.id)}
                className="group text-left bg-white rounded-3xl p-5 shadow-sm border border-sky-100 hover:border-sky-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 cursor-pointer active:scale-[0.99]"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`w-12 h-12 rounded-2xl ${game.accentBg} flex items-center justify-center text-2xl shrink-0`}
                      aria-hidden="true"
                    >
                      {game.emoji}
                    </span>
                    <span className="text-xs font-bold text-slate-400 tabular-nums">
                      Juego {game.number} · {qCount} retos
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-xl font-extrabold text-slate-900 group-hover:text-sky-700 transition-colors">
                      {game.title}
                    </h3>
                    <p className="text-[15px] text-slate-600 mt-1 leading-snug">
                      {game.shortDescEs}
                    </p>
                    {showArmenianLobby && (
                      <p className="text-sm font-semibold text-amber-800 mt-1.5 leading-snug">
                        🇦🇲 {game.shortDescHy}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">
                    {game.isCreativeGame
                      ? 'Evaluación creativa'
                      : game.isTranslationGame
                      ? 'Traducción rápida'
                      : 'Con cronómetro'}
                  </span>
                  <span className="font-display font-bold text-sm text-sky-600 group-hover:translate-x-0.5 transition-transform">
                    Jugar →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
