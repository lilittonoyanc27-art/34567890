import { ConfettiCanvas } from './ConfettiCanvas';
import { formatTimeMs } from './storage';
import { PlayerId, RoundRecord } from './types';

interface VictoryScreenProps {
  razmikMatchPoints: number;
  gayaneMatchPoints: number;
  razmikTotalWins: number;
  gayaneTotalWins: number;
  matchRounds: RoundRecord[];
  onTieBreaker: () => void;
  onPlayAgain: () => void;
  onNewMatch: () => void;
  onBackToMenu: () => void;
}

export function VictoryScreen({
  razmikMatchPoints,
  gayaneMatchPoints,
  razmikTotalWins,
  gayaneTotalWins,
  matchRounds,
  onTieBreaker,
  onPlayAgain,
  onNewMatch,
  onBackToMenu,
}: VictoryScreenProps) {
  const winner: PlayerId | 'empate' =
    razmikMatchPoints > gayaneMatchPoints
      ? 'razmik'
      : gayaneMatchPoints > razmikMatchPoints
      ? 'gayane'
      : 'empate';

  const razmikFastestCount = matchRounds.filter((r) => r.fastest === 'razmik').length;
  const gayaneFastestCount = matchRounds.filter((r) => r.fastest === 'gayane').length;

  const razmikTimes = matchRounds
    .map((r) => r.razmik.timeMs)
    .filter((t): t is number => t !== null);
  const gayaneTimes = matchRounds
    .map((r) => r.gayane.timeMs)
    .filter((t): t is number => t !== null);

  const avgRazmik =
    razmikTimes.length > 0
      ? razmikTimes.reduce((a, b) => a + b, 0) / razmikTimes.length
      : null;
  const avgGayane =
    gayaneTimes.length > 0
      ? gayaneTimes.reduce((a, b) => a + b, 0) / gayaneTimes.length
      : null;

  const themeBg =
    winner === 'razmik'
      ? 'from-[#FF6500] to-amber-500'
      : winner === 'gayane'
      ? 'from-[#F50089] to-rose-500'
      : 'from-sky-500 to-indigo-500';

  const borderStyle =
    winner === 'razmik'
      ? 'border-[#FF6500]'
      : winner === 'gayane'
      ? 'border-[#F50089]'
      : 'border-sky-400';

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-5 py-4 sm:py-8 animate-card-enter">
      <ConfettiCanvas active={true} theme={winner} />

      <div className={`bg-white rounded-3xl shadow-xl border-2 ${borderStyle} overflow-hidden`}>
        {/* Hero Banner */}
        <div className={`bg-gradient-to-r ${themeBg} text-white px-6 py-8 sm:py-10 text-center`}>
          <div className="text-5xl sm:text-6xl mb-3" aria-hidden="true">
            {winner === 'razmik' ? '🏆⚽🎉' : winner === 'gayane' ? '🏆🌸🎉' : '🤝🎉✨'}
          </div>

          {winner === 'empate' ? (
            <>
              <h2 className="font-display text-2xl sm:text-4xl font-black tracking-tight text-balance">
                🤝 ¡Empate! ¡Los dos sois increíbles!
              </h2>
              <p className="mt-2 text-white/90 text-sm sm:text-base font-medium">
                ¡Qué duelo tan igualado! ¿Jugamos una ronda decisiva?
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl sm:text-4xl font-black tracking-tight text-balance">
                🏆 ¡Tenemos un campeón!
              </h2>
              <p className="mt-2 text-lg sm:text-2xl font-extrabold">
                {winner === 'razmik'
                  ? '⚽ ¡Razmik — Equipo Naranja gana el torneo!'
                  : '🌸 ¡Gayane — Equipo Rosa gana el torneo!'}
              </p>
            </>
          )}
        </div>

        {/* Scores & Stats */}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Razmik Summary */}
            <div
              className={`rounded-2xl p-4 sm:p-5 border-2 ${
                winner === 'razmik'
                  ? 'bg-orange-50/80 border-[#FF6500]'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display font-extrabold text-lg text-[#FF6500]">
                    ⚽ Razmik
                  </div>
                  <div className="text-xs font-semibold text-slate-500">Equipo Naranja</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-black text-3xl text-slate-900 tabular-nums">
                    {razmikMatchPoints} pts
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    Victorias totales: {razmikTotalWins}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-orange-200/70 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-600 tabular-nums">
                <span>⚡ Más rápido: {razmikFastestCount} veces</span>
                <span>⏱️ Media: {avgRazmik !== null ? formatTimeMs(avgRazmik) : '—'}</span>
              </div>
            </div>

            {/* Gayane Summary */}
            <div
              className={`rounded-2xl p-4 sm:p-5 border-2 ${
                winner === 'gayane'
                  ? 'bg-pink-50/80 border-[#F50089]'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display font-extrabold text-lg text-[#F50089]">
                    🌸 Gayane
                  </div>
                  <div className="text-xs font-semibold text-slate-500">Equipo Rosa</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-black text-3xl text-slate-900 tabular-nums">
                    {gayaneMatchPoints} pts
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    Victorias totales: {gayaneTotalWins}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-pink-200/70 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-600 tabular-nums">
                <span>⚡ Más rápida: {gayaneFastestCount} veces</span>
                <span>⏱️ Media: {avgGayane !== null ? formatTimeMs(avgGayane) : '—'}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-slate-600 font-medium">
            Rondas jugadas en esta partida: <strong className="tabular-nums">{matchRounds.length}</strong>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {winner === 'empate' && (
              <button
                type="button"
                onClick={onTieBreaker}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6500] to-[#F50089] hover:opacity-95 text-white font-display font-extrabold text-base shadow-md transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                ⚡ ¡Jugar ronda decisiva!
              </button>
            )}

            <button
              type="button"
              onClick={onPlayAgain}
              className="px-5 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-display font-bold text-base shadow-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              🎲 Volver a jugar
            </button>

            <button
              type="button"
              onClick={onNewMatch}
              className="px-5 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-display font-bold text-base shadow-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              🆕 Nueva partida
            </button>

            <button
              type="button"
              onClick={onBackToMenu}
              className="px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-display font-bold text-base transition-colors cursor-pointer whitespace-nowrap"
            >
              🏠 Elegir otro juego
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
