import { X } from 'lucide-react';
import { useState } from 'react';
import { formatTimeMs } from './storage';
import { PersistedState } from './types';

interface HistoryModalProps {
  open: boolean;
  state: PersistedState;
  onClose: () => void;
  onRequestResetAll: () => void;
}

export function HistoryModal({
  open,
  state,
  onClose,
  onRequestResetAll,
}: HistoryModalProps) {
  const [tab, setTab] = useState<'resumen' | 'rondas' | 'torneos'>('resumen');

  if (!open) return null;

  const razmikRoundWins = state.roundHistory.filter((r) => r.winner === 'razmik').length;
  const gayaneRoundWins = state.roundHistory.filter((r) => r.winner === 'gayane').length;
  const tiesCount = state.roundHistory.filter((r) => r.winner === 'empate').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Estadísticas e historial"
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl border border-sky-100 overflow-hidden animate-card-enter">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-display text-xl font-extrabold text-slate-800">
            🏆 Estadísticas e Historial
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented tabs */}
        <div className="px-5 pt-3 pb-2">
          <div className="inline-flex p-1 bg-sky-50 rounded-xl gap-1">
            {(
              [
                ['resumen', 'Resumen'],
                ['rondas', `Rondas (${state.roundHistory.length})`],
                ['torneos', `Torneos (${state.tournamentHistory.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  tab === key
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === 'resumen' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="rounded-2xl p-4 bg-orange-50/70 border border-orange-200">
                  <div className="font-display font-extrabold text-lg text-[#FF6500]">
                    ⚽ Razmik — Equipo Naranja
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm font-semibold text-slate-700 tabular-nums">
                    <div>Puntos actuales: {state.razmikPoints}</div>
                    <div>Torneos ganados: {state.razmikWins}</div>
                    <div>Rondas ganadas: {razmikRoundWins}</div>
                  </div>
                </div>

                <div className="rounded-2xl p-4 bg-pink-50/70 border border-pink-200">
                  <div className="font-display font-extrabold text-lg text-[#F50089]">
                    🌸 Gayane — Equipo Rosa
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm font-semibold text-slate-700 tabular-nums">
                    <div>Puntos actuales: {state.gayanePoints}</div>
                    <div>Torneos ganados: {state.gayaneWins}</div>
                    <div>Rondas ganadas: {gayaneRoundWins}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-4 bg-sky-50/70 border border-sky-100 text-sm text-slate-700 flex flex-wrap gap-x-6 gap-y-2 tabular-nums">
                <span>🎯 Total de rondas registradas: <strong>{state.roundHistory.length}</strong></span>
                <span>🤝 Empates en rondas: <strong>{tiesCount}</strong></span>
                <span>📚 Preguntas practicadas: <strong>{state.seenQuestionIds.length}</strong></span>
              </div>
            </div>
          )}

          {tab === 'rondas' && (
            <div className="space-y-2.5">
              {state.roundHistory.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">
                  Todavía no hay rondas guardadas. ¡Empieza a jugar!
                </p>
              ) : (
                state.roundHistory.slice(0, 40).map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-slate-200 p-3.5 bg-slate-50/60 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500">
                      <span>{r.gameTitle}</span>
                      <span>
                        {r.winner === 'razmik'
                          ? '⚽ Ganó Razmik'
                          : r.winner === 'gayane'
                          ? '🌸 Ganó Gayane'
                          : r.winner === 'empate'
                          ? '🤝 Empate'
                          : '— Sin ganador'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-800 break-words">
                      {r.prompt}
                    </div>
                    <div className="text-xs text-slate-600">
                      Respuesta: <span className="font-semibold text-slate-800">{r.answer}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold tabular-nums pt-1">
                      <span className="text-[#FF6500]">
                        ⚽ Razmik: +{r.razmik.pointsAwarded} pts ({formatTimeMs(r.razmik.timeMs)})
                      </span>
                      <span className="text-[#F50089]">
                        🌸 Gayane: +{r.gayane.pointsAwarded} pts ({formatTimeMs(r.gayane.timeMs)})
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'torneos' && (
            <div className="space-y-2.5">
              {state.tournamentHistory.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">
                  Aún no habéis completado ningún torneo.
                </p>
              ) : (
                state.tournamentHistory.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-800">
                        {t.winner === 'razmik'
                          ? '🏆⚽ Campeón: Razmik'
                          : t.winner === 'gayane'
                          ? '🏆🌸 Campeona: Gayane'
                          : '🤝 Empate'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(t.date).toLocaleDateString('es-ES')} · {t.roundsPlayed} rondas · Nivel {t.level}
                      </div>
                    </div>
                    <div className="text-sm font-extrabold tabular-nums flex items-center gap-3">
                      <span className="text-[#FF6500]">⚽ {t.razmikPoints}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-[#F50089]">🌸 {t.gayanePoints}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onRequestResetAll}
            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap"
          >
            🔁 Reiniciar todo
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmResetModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmResetModal({ open, onCancel, onConfirm }: ConfirmResetModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar reinicio"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 animate-card-enter">
        <div className="text-3xl mb-2" aria-hidden="true">
          🔁
        </div>
        <h3 className="font-display text-xl font-extrabold text-slate-900">
          ¿Reiniciar todo el torneo?
        </h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Esto pondrá a cero los puntos de Razmik y Gayane, las victorias acumuladas y el historial guardado en este dispositivo.
        </p>
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-colors cursor-pointer"
          >
            Sí, reiniciar todo
          </button>
        </div>
      </div>
    </div>
  );
}
