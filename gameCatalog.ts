import { DATA_GAMES_1_TO_4 } from './dataGames1to4';
import { DATA_GAMES_5_TO_8 } from './dataGames5to8';
import { DATA_GAMES_9_TO_12 } from './dataGames9to12';
import { Difficulty, GameId, GameMeta, QuestionItem, SelectedModeId } from './types';

export const GAMES_CATALOG: GameMeta[] = [
  {
    id: 'traduccion_supersonica',
    number: 1,
    emoji: '🚀',
    title: '¡Traducción supersónica!',
    shortDescEs: '🇦🇲 Հայերեն → 🇪🇸 Español · 5 palabras por ronda',
    shortDescHy: 'Արագ թարգմանություն հայերենից իսպաներեն (5 բառ)',
    instructionEs: 'Lee las 5 palabras en armenio y di rápidamente su traducción al español.',
    instructionHy: 'Կարդա 5 հայերեն բառերը և արագ ասա իսպաներեն թարգմանությունները։',
    accentBg: 'bg-sky-50',
    accentText: 'text-sky-700',
    isTranslationGame: true,
  },
  {
    id: 'traduccion_reves',
    number: 2,
    emoji: '🔄',
    title: '¡Traducción al revés!',
    shortDescEs: '🇪🇸 Español → 🇦🇲 Հայերեն · 5 palabras por ronda',
    shortDescHy: 'Թարգմանություն իսպաներենից հայերեն (5 բառ)',
    instructionEs: 'Lee las 5 palabras en español y di su traducción exacta al armenio.',
    instructionHy: 'Կարդա 5 իսպաներեն բառերը և ասա հայերեն ճիշտ թարգմանությունները։',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-700',
    isTranslationGame: true,
  },
  {
    id: 'construye_frase',
    number: 3,
    emoji: '🧩',
    title: '¡Construye la frase!',
    shortDescEs: 'Ordena las palabras en español (clic o voz)',
    shortDescHy: 'Խառնված բառերից կազմիր ճիշտ նախադասություն',
    instructionEs: 'Ordena las palabras mezcladas haciendo clic o dilo directamente en voz alta.',
    instructionHy: 'Դասավորիր խառնված բառերը սեղմելով կամ արագ ասա բանավոր։',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-700',
  },
  {
    id: 'palabra_misteriosa',
    number: 4,
    emoji: '🎭',
    title: '¡La palabra misteriosa!',
    shortDescEs: 'Adivina la palabra a partir de su descripción',
    shortDescHy: 'Գուշակիր բառը իսպաներեն նկարագրությունից',
    instructionEs: 'Escucha o lee la pista en español y adivina la palabra secreta.',
    instructionHy: 'Կարդա իսպաներեն նկարագրությունը և գուշակիր գաղտնի բառը։',
    accentBg: 'bg-violet-50',
    accentText: 'text-violet-700',
  },
  {
    id: 'compra_10s',
    number: 5,
    emoji: '🛒',
    title: '¡Compra en 10 segundos!',
    shortDescEs: 'Situaciones cotidianas rápidas y naturales',
    shortDescHy: 'Առօրյա իրավիճակներ՝ բնական իսպաներենով',
    instructionEs: 'Di una frase natural y correcta en español para resolver esta situación.',
    instructionHy: 'Ասա բնական և քաղաքավարի նախադասություն իսպաներենով այս իրավիճակի համար։',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-700',
  },
  {
    id: 'tres_pistas',
    number: 6,
    emoji: '🧠',
    title: '¡Tres pistas, una palabra!',
    shortDescEs: 'Adivina más rápido con menos pistas',
    shortDescHy: 'Գուշակիր ավելի արագ՝ քիչ հուշումներով',
    instructionEs: 'Abre las pistas una a una. Quien acierte más rápido gana 1 punto.',
    instructionHy: 'Բացիր հուշումները մեկ առ մեկ։ Ով ճիշտ և արագ գուշակի, ստանում է 1 միավոր։',
    accentBg: 'bg-cyan-50',
    accentText: 'text-cyan-700',
  },
  {
    id: 'dilo_otra_manera',
    number: 7,
    emoji: '🗣️',
    title: '¡Dilo de otra manera!',
    shortDescEs: 'Sinónimos y paráfrasis en español',
    shortDescHy: 'Արտահայտիր նույն միտքը այլ բառերով',
    instructionEs: 'Expresa la misma idea usando otros sinónimos o palabras diferentes en español.',
    instructionHy: 'Ասա նույն միտքը այլ բառերով կամ հոմանիշներով իսպաներենում։',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-700',
  },
  {
    id: 'elige_tiempo',
    number: 8,
    emoji: '🎯',
    title: '¡Elige el tiempo!',
    shortDescEs: 'Presente, pasado, futuro y condicional',
    shortDescHy: 'Ընտրիր բայի ճիշտ ժամանակաձևը',
    instructionEs: 'Elige la opción correcta (A, B, C o D) para completar la frase.',
    instructionHy: 'Ընտրիր ճիշտ տարբերակը (A, B, C կամ D) նախադասությունը լրացնելու համար։',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-700',
  },
  {
    id: 'continua_historia',
    number: 9,
    emoji: '🎬',
    title: '¡Continúa la historia!',
    shortDescEs: 'Creatividad, lógica y vocabulario en español',
    shortDescHy: 'Հորինիր պատմության հետաքրքիր շարունակություն',
    instructionEs: 'Continúa la historia con imaginación. El profesor valora gramática, lógica y vocabulario.',
    instructionHy: 'Շարունակիր պատմությունը իսպաներենով։ Ուսուցիչը գնահատում է քերականությունը, տրամաբանությունը և բառապաշարը։',
    accentBg: 'bg-rose-50',
    accentText: 'text-rose-700',
    isCreativeGame: true,
  },
  {
    id: 'duelo_preguntas',
    number: 10,
    emoji: '💬',
    title: '¡Duelo de preguntas!',
    shortDescEs: 'Responde rápido con una frase completa',
    shortDescHy: 'Պատասխանիր հարցին ամբողջական նախադասությամբ',
    instructionEs: 'Responde a la pregunta en voz alta usando una frase completa y natural.',
    instructionHy: 'Պատասխանիր հարցին ամբողջական և բնական իսպաներեն նախադասությամբ։',
    accentBg: 'bg-orange-50',
    accentText: 'text-orange-700',
  },
  {
    id: 'categorias_explosivas',
    number: 11,
    emoji: '🔤',
    title: '¡Categorías explosivas!',
    shortDescEs: 'Categoría + letra = ¡palabra relámpago!',
    shortDescHy: 'Կատեգորիա և տառ՝ արագ ասա բառը',
    instructionEs: 'Di lo más rápido posible una palabra en español de esa categoría que empiece por esa letra.',
    instructionHy: 'Արագ ասա այս կատեգորիային պատկանող և այդ տառով սկսվող իսպաներեն բառ։',
    accentBg: 'bg-fuchsia-50',
    accentText: 'text-fuchsia-700',
  },
  {
    id: 'mision_espana',
    number: 12,
    emoji: '🌍',
    title: '¡Misión España!',
    shortDescEs: 'Mini-escenarios reales de viaje y vida diaria',
    shortDescHy: 'Իրական ճամփորդական իրավիճակներ Իսպանիայում',
    instructionEs: 'Imagina que estás en España. Di la frase adecuada para superar esta misión.',
    instructionHy: 'Պատկերացրու՝ Իսպանիայում ես։ Ասա համապատասխան արտահայտությունը այս իրավիճակի համար։',
    accentBg: 'bg-sky-50',
    accentText: 'text-sky-700',
  },
];

export const ALL_QUESTIONS: QuestionItem[] = [
  ...DATA_GAMES_1_TO_4,
  ...DATA_GAMES_5_TO_8,
  ...DATA_GAMES_9_TO_12,
];

export function getGameMeta(gameId: GameId): GameMeta {
  return GAMES_CATALOG.find((g) => g.id === gameId) ?? GAMES_CATALOG[0];
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const TRANSLATION_BATCH_SIZE = 5;

function makeTranslationBatchQuestion(
  gameId: 'traduccion_supersonica' | 'traduccion_reves',
  level: Difficulty,
  slice: QuestionItem[],
  batchIndex: number
): QuestionItem {
  const first = slice[0];
  return {
    id: `${gameId}_batch_${level}_${batchIndex}_${slice.map((s) => s.id).join('_')}`,
    gameId,
    level,
    prompt: slice.map((s) => s.prompt).join(' · '),
    answer: slice.map((s) => s.answer).join(' · '),
    answerDetail: first?.answerDetail,
    batchItems: slice.map((s) => ({
      id: s.id,
      prompt: s.prompt,
      answer: s.answer,
      note: s.answerDetail,
    })),
  };
}

/**
 * Selects non-repeating questions for a session, prioritizing unseen question IDs.
 * Games 1 & 2 automatically group 5 unique words per round.
 * Supports both single-game sessions and mixed tournament ("torneo_mixto") across all 12 games.
 */
export function buildSessionDeck(
  modeId: SelectedModeId,
  difficulty: Difficulty,
  count: number,
  seenIds: string[]
): QuestionItem[] {
  const seenSet = new Set(seenIds);

  if (modeId === 'traduccion_supersonica' || modeId === 'traduccion_reves') {
    const pool = ALL_QUESTIONS.filter((q) => q.gameId === modeId && q.level === difficulty);
    const unseen = shuffleArray(pool.filter((q) => !seenSet.has(q.id)));
    const seen = shuffleArray(pool.filter((q) => seenSet.has(q.id)));
    let queue = [...unseen, ...seen];

    const result: QuestionItem[] = [];
    for (let r = 0; r < count; r++) {
      const slice: QuestionItem[] = [];
      const usedInBatch = new Set<string>();
      while (slice.length < TRANSLATION_BATCH_SIZE && pool.length > 0) {
        if (queue.length === 0) {
          queue = shuffleArray(pool);
        }
        const candidate = queue.shift()!;
        if (!usedInBatch.has(candidate.id)) {
          usedInBatch.add(candidate.id);
          slice.push(candidate);
        }
      }
      result.push(makeTranslationBatchQuestion(modeId, difficulty, slice, r + 1));
    }
    return result;
  }

  if (modeId !== 'torneo_mixto') {
    const pool = ALL_QUESTIONS.filter((q) => q.gameId === modeId && q.level === difficulty);
    const unseen = shuffleArray(pool.filter((q) => !seenSet.has(q.id)));
    const seen = shuffleArray(pool.filter((q) => seenSet.has(q.id)));
    const combined = [...unseen, ...seen];
    const result: QuestionItem[] = [];
    while (result.length < count && combined.length > 0) {
      const next = combined[result.length % combined.length];
      result.push(next);
    }
    return result;
  }

  // Mixed tournament: rotate randomly through all 12 distinct games!
  const gameOrder = shuffleArray(GAMES_CATALOG.map((g) => g.id));
  const byGame = new Map<GameId, QuestionItem[]>();
  for (const gId of gameOrder) {
    const pool = ALL_QUESTIONS.filter((q) => q.gameId === gId && q.level === difficulty);
    const unseen = shuffleArray(pool.filter((q) => !seenSet.has(q.id)));
    const seen = shuffleArray(pool.filter((q) => seenSet.has(q.id)));
    byGame.set(gId, [...unseen, ...seen]);
  }

  const deck: QuestionItem[] = [];
  const cursors = new Map<GameId, number>();
  let idx = 0;
  while (deck.length < count) {
    const gId = gameOrder[idx % gameOrder.length];
    const list = byGame.get(gId) ?? [];
    const c = cursors.get(gId) ?? 0;
    if (list.length > 0) {
      if (gId === 'traduccion_supersonica' || gId === 'traduccion_reves') {
        const slice: QuestionItem[] = [];
        for (let k = 0; k < TRANSLATION_BATCH_SIZE; k++) {
          slice.push(list[(c + k) % list.length]);
        }
        deck.push(makeTranslationBatchQuestion(gId, difficulty, slice, idx + 1));
        cursors.set(gId, c + TRANSLATION_BATCH_SIZE);
      } else {
        deck.push(list[c % list.length]);
        cursors.set(gId, c + 1);
      }
    }
    idx++;
    if (idx > count * 4) break;
  }
  return deck;
}

export function getDifficultyLabel(level: Difficulty): { emoji: string; es: string; cefr: string } {
  switch (level) {
    case 'facil':
      return { emoji: '🟢', es: 'Fácil', cefr: 'A1–A2' };
    case 'medio':
      return { emoji: '🔵', es: 'Medio', cefr: 'A2–B1' };
    case 'dificil':
      return { emoji: '🔴', es: 'Difícil', cefr: 'B1–B2' };
  }
}
