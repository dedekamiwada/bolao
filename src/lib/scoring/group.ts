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

export function scoreGroupClassification(
  predicted: number[], // [1st, 2nd, 3rd, 4th] team IDs
  actual: number[]     // [1st, 2nd, 3rd, 4th] team IDs
): number {
  let points = 0
  for (let pos = 0; pos < 4; pos++) {
    const predictedTeam = predicted[pos]
    if (!predictedTeam) continue
    const actualPos = actual.indexOf(predictedTeam)
    if (actualPos === pos) {
      points += 4 // exact position
    } else if (actualPos !== -1 && actualPos <= 1 && pos <= 1) {
      // Team is in top-2 but wrong position
      points += 2
    }
  }
  return points
}
