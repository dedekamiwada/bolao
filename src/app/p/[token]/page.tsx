import { notFound } from "next/navigation"
import { hashToken } from "@/lib/tokens"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, ClipboardList, TrendingUp, Clock, BookOpen } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { TeamFlag } from "@/components/shared/TeamFlag"
import { getGroupRound, getRoundFirstMatchAt } from "@/lib/group-rounds"
import { DeadlineBanner } from "@/components/shared/DeadlineBanner"

const CUTOFF_MINUTES = 15

interface GroupMatchRow { match_number: number; scheduled_at: string; group_letter: string | null; status: string }
interface KnockoutMatchRow { stage: string; scheduled_at: string; status: string }

function computeNextDeadline(
  groupMatches: GroupMatchRow[],
  upcomingKnockout: KnockoutMatchRow[]
): { deadlineAt: string; label: string } | null {
  const now = Date.now()

  // --- Group stage ---
  // Work per group to determine which rounds are still open
  const groups = [...new Set(groupMatches.map(m => m.group_letter).filter(Boolean))] as string[]
  let earliestGroupDeadline: number | null = null
  let groupDeadlineLabel = ""

  for (const g of groups) {
    const gMatches = groupMatches.filter(m => m.group_letter === g)
    if (gMatches.length === 0) continue

    for (const round of [1, 2, 3] as const) {
      // Lock rule: rounds 2 and 3 lock together (before round 2's first match).
      // All rounds are open from day 1 — no "wait for previous round" gate.
      const lockRound: 1 | 2 | 3 = round >= 2 ? 2 : 1
      const lockRoundMatches = gMatches.filter(m => getGroupRound(m.match_number) === lockRound)
      if (lockRoundMatches.length === 0) continue
      const firstLockMatchAt = getRoundFirstMatchAt(lockRoundMatches, lockRound)
      const lockTime = new Date(firstLockMatchAt).getTime() - CUTOFF_MINUTES * 60 * 1000

      if (now < lockTime) {
        if (earliestGroupDeadline === null || lockTime < earliestGroupDeadline) {
          earliestGroupDeadline = lockTime
          groupDeadlineLabel = round === 1 ? "Rodada 1 da Fase de Grupos" : "Rodadas 2 e 3 da Fase de Grupos"
        }
        break // Only care about the earliest open round per group
      }
    }
  }

  if (earliestGroupDeadline !== null && earliestGroupDeadline > now) {
    return { deadlineAt: new Date(earliestGroupDeadline).toISOString(), label: groupDeadlineLabel }
  }

  // --- Knockout stage ---
  if (upcomingKnockout.length > 0) {
    const next = upcomingKnockout[0]
    const lockTime = new Date(next.scheduled_at).getTime() - CUTOFF_MINUTES * 60 * 1000
    if (lockTime > now) {
      const stageLabels: Record<string, string> = {
        R32: "16 avos de Final", R16: "Oitavas de Final",
        QF: "Quartas de Final", SF: "Semifinais", "3RD": "3º Lugar", FINAL: "Final"
      }
      return { deadlineAt: new Date(lockTime).toISOString(), label: stageLabels[next.stage] ?? next.stage }
    }
  }

  return null
}

async function getParticipantData(token: string) {
  const supabase = createAdminClient()
  const tokenHash = hashToken(token)

  const { data: participant } = await supabase
    .from("participants")
    .select("id, name, is_active")
    .eq("token_hash", tokenHash)
    .single()

  if (!participant || !participant.is_active) return null

  const [
    { count: groupCount },
    { count: knockoutCount },
    { data: snapshot },
    { data: nextMatches },
    { data: myScores },
    { data: allGroupMatches },
    { data: upcomingKnockout },
  ] = await Promise.all([
    supabase.from("group_predictions").select("id", { count: "exact", head: true }).eq("participant_id", participant.id),
    supabase.from("knockout_predictions").select("id", { count: "exact", head: true }).eq("participant_id", participant.id),
    supabase.from("ranking_snapshots").select("total_points, rank_position, exact_scores, correct_results").eq("participant_id", participant.id).order("snapshot_date", { ascending: false }).limit(1).single(),
    supabase.from("matches").select("id, stage, group_letter, scheduled_at, home_score, away_score, status, home_team:teams!matches_home_team_id_fkey(fifa_code, name, flag_url), away_team:teams!matches_away_team_id_fkey(fifa_code, name, flag_url)").in("status", ["SCHEDULED", "LIVE"]).order("scheduled_at", { ascending: true }).limit(3),
    supabase.from("match_scores").select("total_points, match_id, matches(stage, home_team:teams!matches_home_team_id_fkey(fifa_code), away_team:teams!matches_away_team_id_fkey(fifa_code), home_score, away_score)").eq("participant_id", participant.id).order("calculated_at", { ascending: false }).limit(5),
    supabase.from("matches").select("match_number, scheduled_at, group_letter, status").eq("stage", "GROUP").order("scheduled_at", { ascending: true }),
    supabase.from("matches").select("stage, scheduled_at, status").not("stage", "eq", "GROUP").in("status", ["SCHEDULED"]).order("scheduled_at", { ascending: true }).limit(1),
  ])

  // Compute next betting deadline
  const nextDeadline = computeNextDeadline(allGroupMatches ?? [], upcomingKnockout ?? [])

  return { participant, groupCount, knockoutCount, snapshot, nextMatches, myScores, nextDeadline }
}

export default async function ParticipantPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getParticipantData(token)
  if (!data) notFound()

  const { participant, groupCount, knockoutCount, snapshot, nextMatches, myScores, nextDeadline } = data
  const totalPoints = snapshot?.total_points ?? 0
  const rankPosition = snapshot?.rank_position ?? null
  const exactScores = snapshot?.exact_scores ?? 0
  const groupPredsDone = (groupCount ?? 0) >= 6

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-green-900 text-white px-4 pt-6 pb-8">
        <p className="text-green-300 text-xs mb-1">Bolão Copa 2026</p>
        <h1 className="text-xl font-bold">{participant.name}</h1>
        <div className="flex items-center gap-4 mt-3">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalPoints}</div>
            <div className="text-green-300 text-xs">pontos</div>
          </div>
          {rankPosition && (
            <div className="text-center">
              <div className="text-2xl font-bold">#{rankPosition}</div>
              <div className="text-green-300 text-xs">posição</div>
            </div>
          )}
          <div className="text-center">
            <div className="text-2xl font-bold">{exactScores}</div>
            <div className="text-green-300 text-xs">placares exatos</div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4 pb-8">
        {/* Aviso de prazo */}
        {nextDeadline && (
          <DeadlineBanner deadlineAt={nextDeadline.deadlineAt} label={nextDeadline.label} />
        )}

        {/* Ações principais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Meus Palpites
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Link href={`/p/${token}/predict`} className="block">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <div>
                  <div className="font-medium text-sm">Fase de Grupos</div>
                  <div className="text-xs text-muted-foreground">{groupCount ?? 0} palpites registrados</div>
                </div>
                <Badge variant={groupPredsDone ? "success" : "warning"}>
                  {groupPredsDone ? "✓ Completo" : "Palpitar"}
                </Badge>
              </div>
            </Link>
            <Link href={`/p/${token}/predict/knockout`} className="block">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <div>
                  <div className="font-medium text-sm">Mata-Mata</div>
                  <div className="text-xs text-muted-foreground">{knockoutCount ?? 0} palpites registrados</div>
                </div>
                <Badge variant={(knockoutCount ?? 0) > 0 ? "success" : "secondary"}>
                  {(knockoutCount ?? 0) > 0 ? "✓ Salvo" : "Palpitar"}
                </Badge>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Próximos jogos */}
        {(nextMatches?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" /> Próximos Jogos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 divide-y">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {nextMatches?.map((m: any) => {
                const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }).format(new Date(m.scheduled_at))
                const datetime = formatDate(m.scheduled_at)
                return (
                  <div key={m.id} className="py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground capitalize">{weekday} · {datetime}</span>
                      {m.status === "LIVE" && <Badge variant="live">AO VIVO</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-1 items-center gap-1.5 min-w-0">
                        <TeamFlag flagUrl={m.home_team?.flag_url} name={m.home_team?.name ?? "?"} size="sm" />
                        <span className="text-sm font-medium truncate">{m.home_team?.name ?? m.home_team?.fifa_code ?? "?"}</span>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground shrink-0 px-1">
                        {m.status === "LIVE" ? `${m.home_score} × ${m.away_score}` : "×"}
                      </span>
                      <div className="flex flex-1 items-center justify-end gap-1.5 min-w-0">
                        <span className="text-sm font-medium truncate text-right">{m.away_team?.name ?? m.away_team?.fifa_code ?? "?"}</span>
                        <TeamFlag flagUrl={m.away_team?.flag_url} name={m.away_team?.name ?? "?"} size="sm" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Últimos pontos */}
        {(myScores?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Últimas Pontuações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {myScores?.map((s: any) => (
                <div key={s.match_id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <span className="text-muted-foreground">
                    {s.matches?.home_team?.fifa_code} {s.matches?.home_score}×{s.matches?.away_score} {s.matches?.away_team?.fifa_code}
                  </span>
                  <span className={`font-bold ${s.total_points > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                    +{s.total_points} pts
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Links de navegação */}
        <div className="grid grid-cols-3 gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href="/">
              <Trophy className="w-4 h-4 mr-1" />
              Ranking
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/p/${token}/history`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              Evolução
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/p/${token}/rules`}>
              <BookOpen className="w-4 h-4 mr-1" />
              Regras
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
