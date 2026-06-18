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
// Rules:
//   • All rounds are open for betting from day one (no waiting for previous rounds).
//   • Round 1 locks 15 min before round 1's first match.
//   • Rounds 2 and 3 lock together: 10 min before round 2's first match.
export function isGroupMatchBettable(
  match: RoundBoundaryMatch,
  groupMatches: RoundBoundaryMatch[],
  cutoffMinutesR1 = 15,
  cutoffMinutesR23 = 10
): boolean {
  const round = getGroupRound(match.match_number)
  const now = Date.now()

  // Determine which round's first-match time controls the lock for this round
  const lockRound: 1 | 2 | 3 = round >= 2 ? 2 : 1
  const lockRoundFirstMatchAt = getRoundFirstMatchAt(groupMatches, lockRound)
  const cutoff = lockRound === 1 ? cutoffMinutesR1 : cutoffMinutesR23
  const lockTime = new Date(lockRoundFirstMatchAt).getTime() - cutoff * 60 * 1000

  return now < lockTime
}
