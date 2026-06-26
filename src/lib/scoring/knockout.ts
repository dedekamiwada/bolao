import type { Stage } from "@/types/domain"
import { KNOCKOUT_POINTS } from "@/types/domain"

export interface KnockoutScoreBreakdown {
  exactScore: number
  correctResult: number
  total: number
}

// Mata-mata pontua igual à fase de grupos (sem bônus de saldo): placar exato
// vale os pontos cheios; acertar o resultado pelo sinal (vitória mandante /
// vitória visitante / EMPATE) vale os pontos do resultado. Não há mais palpite
// de "quem passa" — um empate no tempo normal/prorrogação pontua como empate.
export function scoreKnockoutMatch(
  stage: Stage,
  prediction: { home: number; away: number },
  result: { home: number; away: number }
): KnockoutScoreBreakdown {
  const pts = KNOCKOUT_POINTS[stage]
  const isExact = prediction.home === result.home && prediction.away === result.away
  const isResult = Math.sign(prediction.home - prediction.away) === Math.sign(result.home - result.away)

  if (isExact) {
    return { exactScore: pts.exact, correctResult: 0, total: pts.exact }
  }
  if (isResult) {
    return { exactScore: 0, correctResult: pts.result, total: pts.result }
  }
  return { exactScore: 0, correctResult: 0, total: 0 }
}
