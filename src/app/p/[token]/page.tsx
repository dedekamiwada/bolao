import { notFound } from "next/navigation"
import { hashToken } from "@/lib/tokens"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, ClipboardList, TrendingUp, Clock } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

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
  ] = await Promise.all([
    supabase.from("group_predictions").select("id", { count: "exact", head: true }).eq("participant_id", participant.id),
    supabase.from("knockout_predictions").select("id", { count: "exact", head: true }).eq("participant_id", participant.id),
    supabase.from("ranking_snapshots").select("total_points, rank_position, exact_scores, correct_results").eq("participant_id", participant.id).order("snapshot_date", { ascending: false }).limit(1).single(),
    supabase.from("matches").select("id, stage, group_letter, scheduled_at, home_score, away_score, status, home_team:teams!matches_home_team_id_fkey(fifa_code, name), away_team:teams!matches_away_team_id_fkey(fifa_code, name)").in("status", ["SCHEDULED", "LIVE"]).order("scheduled_at", { ascending: true }).limit(3),
    supabase.from("match_scores").select("total_points, match_id, matches(stage, home_team:teams!matches_home_team_id_fkey(fifa_code), away_team:teams!matches_away_team_id_fkey(fifa_code), home_score, away_score)").eq("participant_id", participant.id).order("calculated_at", { ascending: false }).limit(5),
  ])

  return { participant, groupCount, knockoutCount, snapshot, nextMatches, myScores }
}

export default async function ParticipantPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getParticipantData(token)
  if (!data) notFound()

  const { participant, groupCount, knockoutCount, snapshot, nextMatches, myScores } = data
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
            <CardContent className="space-y-1 pt-0">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {nextMatches?.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <span className="font-medium">{m.home_team?.fifa_code} × {m.away_team?.fifa_code}</span>
                  {m.status === "LIVE"
                    ? <Badge variant="live">AO VIVO {m.home_score}×{m.away_score}</Badge>
                    : <span className="text-xs text-muted-foreground">{formatDate(m.scheduled_at)}</span>}
                </div>
              ))}
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

        {/* Link para ranking */}
        <Button asChild variant="outline" className="w-full">
          <Link href="/">
            <Trophy className="w-4 h-4 mr-2" />
            Ver Ranking Geral
          </Link>
        </Button>
      </div>
    </main>
  )
}
