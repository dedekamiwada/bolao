export function getGroupRound(matchNumber: number): 1 | 2 | 3 {
  if (matchNumber <= 2) return 1
  if (matchNumber <= 4) return 2
  return 3
}

export interface RoundBoundaryMatch {
  match_number: number
  scheduled_at: string
}

export function getRoundFirstMatchAt(groupMatches: RoundBoundaryMatch[], round: 1 | 2 | 3): string {
  const roundMatches = groupMatches.filter(m => getGroupRound(m.match_number) === round)
  return roundMatches.reduce(
    (min, m) => (new Date(m.scheduled_at) < new Date(min) ? m.scheduled_at : min),
    roundMatches[0].scheduled_at
  )
}

export function getRoundLastMatchAt(groupMatches: RoundBoundaryMatch[], round: 1 | 2 | 3): string {
  const roundMatches = groupMatches.filter(m => getGroupRound(m.match_number) === round)
  return roundMatches.reduce(
    (max, m) => (new Date(m.scheduled_at) > new Date(max) ? m.scheduled_at : max),
    roundMatches[0].scheduled_at
  )
}

// Server-side and client-side check: can this match be bet on right now?
// Rule: rounds 2 and 3 BOTH close 15 min before round 2's first match,
// and round 3 opens (becomes bettable) as soon as round 1 is done — same window as round 2.
export function isGroupMatchBettable(
  match: RoundBoundaryMatch,
  groupMatches: RoundBoundaryMatch[],
  cutoffMinutes = 15
): boolean {
  const round = getGroupRound(match.match_number)
  const now = Date.now()

  // Rounds 2 and 3 lock together — both lock 15 min before round 2's first match
  const lockRound: 1 | 2 | 3 = round >= 2 ? 2 : 1
  const lockRoundFirstMatchAt = getRoundFirstMatchAt(groupMatches, lockRound)
  const lockTime = new Date(lockRoundFirstMatchAt).getTime() - cutoffMinutes * 60 * 1000
  if (now >= lockTime) return false // round is locked

  // Round 3 opens together with round 2 (when round 1 is done), not waiting for round 2 to finish
  const openAfterRound: 1 | 2 | 3 = round === 3 ? 1 : round === 2 ? 1 : 0 as never
  if (round > 1) {
    const prevRoundLastMatchAt = getRoundLastMatchAt(groupMatches, openAfterRound)
    if (now < new Date(prevRoundLastMatchAt).getTime()) return false // prior round not started yet
  }

  return true
}
