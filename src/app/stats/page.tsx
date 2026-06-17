import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Target, Trophy, Flame, Users } from "lucide-react"
import Link from "next/link"
import { TeamFlag } from "@/components/shared/TeamFlag"

export const revalidate = 60

async function getStats() {
  const supabase = createAdminClient()

  const [
    { data: exactMatchScores },
    { data: allPredictions },
    { data: finishedMatches },
    { data: participants },
  ] = await Promise.all([
    supabase
      .from("match_scores")
      .select("participant_id, match_id, points_exact_score")
      .gt("points_exact_score", 0),
    supabase
      .from("group_predictions")
      .select("participant_id, match_id, home_score, away_score"),
    supabase
      .from("matches")
      .select(`id, stage, home_score, away_score,
        home_team:teams!matches_home_team_id_fkey(fifa_code, name, flag_url),
        away_team:teams!matches_away_team_id_fkey(fifa_code, name, flag_url)`)
      .eq("status", "FINISHED")
      .not("result_confirmed_at", "is", null),
    supabase
      .from("participants")
      .select("id, name")
      .eq("is_active", true),
  ])

  const nameMap = new Map((participants ?? []).map(p => [p.id, p.name]))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchMap = new Map((finishedMatches ?? []).map((m: any) => [m.id, m]))
  const totalParticipants = (participants ?? []).length

  // Participante com mais placares exatos
  const exactByPid: Record<string, number> = {}
  for (const row of exactMatchScores ?? []) {
    exactByPid[row.participant_id] = (exactByPid[row.participant_id] ?? 0) + 1
  }
  const topExact = Object.entries(exactByPid)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pid, count]) => ({ name: nameMap.get(pid) ?? "—", count }))

  // Jogo com mais acertos de placar exato
  const exactByMatch: Record<string, number> = {}
  for (const row of exactMatchScores ?? []) {
    const k = String(row.match_id)
    exactByMatch[k] = (exactByMatch[k] ?? 0) + 1
  }
  const topMatches = Object.entries(exactByMatch)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mid, count]) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      match: matchMap.get(parseInt(mid)) as any,
      count,
      pct: totalParticipants > 0 ? Math.round((count / totalParticipants) * 100) : 0,
    }))
    .filter(x => x.match)

  // Palpite mais popular por jogo terminado (fase de grupos)
  const predsByMatch: Record<string, Record<string, number>> = {}
  for (const pred of allPredictions ?? []) {
    const mid = String(pred.match_id)
    const key = `${pred.home_score}x${pred.away_score}`
    if (!predsByMatch[mid]) predsByMatch[mid] = {}
    predsByMatch[mid][key] = (predsByMatch[mid][key] ?? 0) + 1
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const popularPredictions = (finishedMatches ?? [] as any[])
    .filter((m: { id: number }) => predsByMatch[String(m.id)])
    .map((match: { id: number; home_score: number; away_score: number }) => {
      const preds = predsByMatch[String(match.id)]
      const sorted = Object.entries(preds).sort((a, b) => b[1] - a[1])
      const [topPred, topCount] = sorted[0]
      const total = Object.values(preds).reduce((a, b) => a + b, 0)
      const [hs, as_] = topPred.split("x").map(Number)
      return {
        match,
        topPred,
        topCount,
        total,
        pct: Math.round((topCount / total) * 100),
        isCorrect: match.home_score === hs && match.away_score === as_,
      }
    })
    .sort((a: { pct: number }, b: { pct: number }) => b.pct - a.pct)
    .slice(0, 5)

  const totalExact = (exactMatchScores ?? []).length
  const totalPredictions = (allPredictions ?? []).length
  const finishedCount = (finishedMatches ?? []).length

  return { topExact, topMatches, popularPredictions, totalExact, totalPredictions, totalParticipants, finishedCount }
}

export default async function StatsPage() {
  const stats = await getStats()

  return (
    <main className="min-h-screen bg-background pb-8">
      <div className="bg-green-900 text-white px-4 py-4 flex items-center gap-3">
        <Link href="/" aria-label="Voltar"><ArrowLeft className="w-5 h-5 text-green-300" /></Link>
        <div>
          <h1 className="font-bold">Estatísticas do Bolão</h1>
          <p className="text-green-300 text-xs">Copa 2026</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold">{stats.totalParticipants}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <Users className="w-3 h-3" />Participantes
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold">{stats.finishedCount}</div>
              <div className="text-xs text-muted-foreground mt-1">Jogos encerrados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold">{stats.totalExact}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <Target className="w-3 h-3" />Acertos exatos
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rei dos placares exatos */}
        {stats.topExact.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-yellow-500" />
                Rei dos Placares Exatos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              {stats.topExact.map((entry, idx) => (
                <div key={entry.name} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${idx === 0 ? "bg-yellow-50 dark:bg-yellow-950/40" : ""}`}>
                  <span className="w-6 text-center font-bold text-sm">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium">{entry.name}</span>
                  <span className="font-bold text-sm">{entry.count} <span className="text-muted-foreground font-normal">exatos</span></span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Jogos mais acertados */}
        {stats.topMatches.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Jogos Mais Acertados
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 divide-y">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {stats.topMatches.map(({ match, count, pct }: any) => (
                <div key={match.id} className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center gap-1.5 min-w-0">
                      <TeamFlag flagUrl={match.home_team?.flag_url} name={match.home_team?.name ?? "?"} size="sm" />
                      <span className="text-sm truncate">{match.home_team?.name ?? match.home_team?.fifa_code ?? "?"}</span>
                    </div>
                    <span className="text-xs font-bold shrink-0 px-1">
                      {match.home_score} × {match.away_score}
                    </span>
                    <div className="flex flex-1 items-center justify-end gap-1.5 min-w-0">
                      <span className="text-sm truncate text-right">{match.away_team?.name ?? match.away_team?.fifa_code ?? "?"}</span>
                      <TeamFlag flagUrl={match.away_team?.flag_url} name={match.away_team?.name ?? "?"} size="sm" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {count} acerto{count !== 1 ? "s" : ""} de placar exato ({pct}% dos participantes)
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Palpites mais populares */}
        {stats.popularPredictions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Palpites com Maior Consenso
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 divide-y">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {stats.popularPredictions.map(({ match, topPred, topCount, total, pct, isCorrect }: any) => (
                <div key={match.id} className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center gap-1.5 min-w-0">
                      <TeamFlag flagUrl={match.home_team?.flag_url} name={match.home_team?.name ?? "?"} size="sm" />
                      <span className="text-sm truncate">{match.home_team?.name ?? match.home_team?.fifa_code ?? "?"}</span>
                    </div>
                    <span className="text-xs font-bold shrink-0 px-1 text-muted-foreground">vs</span>
                    <div className="flex flex-1 items-center justify-end gap-1.5 min-w-0">
                      <span className="text-sm truncate text-right">{match.away_team?.name ?? match.away_team?.fifa_code ?? "?"}</span>
                      <TeamFlag flagUrl={match.away_team?.flag_url} name={match.away_team?.name ?? "?"} size="sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {topCount}/{total} apostaram {topPred} ({pct}%)
                    </span>
                    {isCorrect && <span className="text-xs text-green-600 font-semibold">✓ acertou</span>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {stats.topExact.length === 0 && stats.topMatches.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-12">
            As estatísticas aparecem após os primeiros jogos encerrados.
          </p>
        )}
      </div>
    </main>
  )
}
