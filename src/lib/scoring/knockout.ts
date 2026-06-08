import type { Stage } from "@/types/domain"
import { KNOCKOUT_POINTS } from "@/types/domain"

export interface KnockoutScoreBreakdown {
  exactScore: number
  correctWinner: number
  total: number
}

export function scoreKnockoutMatch(
  stage: Stage,
  prediction: { home: number; away: number; winnerId: number },
  result: { home: number; away: number; winnerId: number }
): KnockoutScoreBreakdown {
  const pts = KNOCKOUT_POINTS[stage]
  const isExact = prediction.home === result.home && prediction.away === result.away
  const isCorrectWinner = prediction.winnerId === result.winnerId

  if (isExact) {
    return { exactScore: pts.exact, correctWinner: 0, total: pts.exact }
  }
  if (isCorrectWinner) {
    return { exactScore: 0, correctWinner: pts.result, total: pts.result }
  }
  return { exactScore: 0, correctWinner: 0, total: 0 }
}
