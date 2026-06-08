export interface ScoreBreakdown {
  exactScore: number
  result: number
  goalDiff: number
  total: number
}

export function scoreGroupMatch(
  prediction: { home: number; away: number },
  result: { home: number; away: number }
): ScoreBreakdown {
  const predResult = Math.sign(prediction.home - prediction.away)
  const realResult = Math.sign(result.home - result.away)

  const isExact = prediction.home === result.home && prediction.away === result.away
  const isResult = predResult === realResult
  const predDiff = prediction.home - prediction.away
  const realDiff = result.home - result.away
  const isDiffMatch = predDiff === realDiff

  if (isExact) {
    return { exactScore: 5, result: 0, goalDiff: 0, total: 5 }
  }
  if (isResult) {
    const goalDiff = isDiffMatch ? 1 : 0
    return { exactScore: 0, result: 3, goalDiff, total: 3 + goalDiff }
  }
  return { exactScore: 0, result: 0, goalDiff: 0, total: 0 }
}

