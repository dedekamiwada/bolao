import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TabSwitcher } from "@/components/shared/TabSwitcher"
import { Trophy, Target, Zap, BookOpen, Table2, BarChart2, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { TokenAccess } from "@/components/shared/TokenAccess"
import { TeamFlag } from "@/components/shared/TeamFlag"

export const revalidate = 30

async function getRanking() {
  const supabase = createAdminClient()
  const { data: snapshots } = await supabase
    .from("ranking_snapshots")
    .select("participant_id, total_points, exact_scores, correct_results, rank_position, snapshot_date, participants(name)")
    .order("snapshot_date", { ascending: false })
    .limit(300)

  if (!snapshots) return []

  const latest = new Map<string, (typeof snapshots)[0]>()
  const prev = new Map<string, (typeof snapshots)[0]>()

  for (const s of snapshots) {
    if (!latest.has(s.participant_id)) {
      latest.set(s.participant_id, s)
    } else if (!prev.has(s.participant_id)) {
      prev.set(s.participant_id, s)
    }
  }

  return [...latest.values()]
    .sort((a, b) => b.total_points - a.total_points || b.exact_scores - a.exact_scores)
    .map((entry, idx) => {
      const prevEntry = prev.get(entry.participant_id)
      const currentRank = idx + 1
      const rankChange = prevEntry?.rank_position != null ? prevEntry.rank_position - currentRank : null
      return { ...entry, currentRank, rankChange }
    })
}

async function getNextMatches() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("matches")
    .select(`id, stage, group_letter, scheduled_at, status, home_score, away_score,
      home_team:teams!matches_home_team_id_fkey(fifa_code, name, flag_url),
      away_team:teams!matches_away_team_id_fkey(fifa_code, name, flag_url)`)
    .in("status", ["SCHEDULED", "LIVE"])
    .order("scheduled_at", { ascending: true })
    .limit(5)
  return data ?? []
}

const STAGE_ORDER = ["GROUP", "R32", "R16", "QF", "SF", "3RD", "FINAL"]
const STAGE_LABELS: Record<string, string> = {
  GROUP: "Fase de Grupos", R32: "16 avos", R16: "Oitavas", QF: "Quartas", SF: "Semis", "3RD": "3º Lugar", FINAL: "Final",
}

async function getRankingByStage() {
  const supabase = createAdminClient()

  const scores: { participant_id: string; total_points: number; matches: { stage: string } | { stage: string }[] | null }[] = []
  const PAGE_SIZE = 1000
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page } = await supabase
      .from("match_scores")
      .select("participant_id, total_points, matches!inner(stage)")
      .order("id")
      .range(from, from + PAGE_SIZE - 1)
    if (!page?.length) break
    scores.push(...(page as typeof scores))
    if (page.length < PAGE_SIZE) break
  }

  const { data: nameSnaps } = await supabase
    .from("ranking_snapshots")
    .select("participant_id, participants(name)")
    .order("snapshot_date", { ascending: false })
    .limit(300)

  const nameMap = new Map<string, string>()
  for (const s of nameSnaps ?? []) {
    if (!nameMap.has(s.participant_id)) {
      const name = Array.isArray(s.participants)
        ? (s.participants[0] as { name: string })?.name
        : (s.participants as { name: string } | null)?.name
      if (name) nameMap.set(s.participant_id, name)
    }
  }

  if (!scores.length) return []

  const byStage: Record<string, Record<string, number>> = {}
  for (const score of scores) {
    const match = Array.isArray(score.matches) ? score.matches[0] : score.matches as { stage: string } | null
    const stage = match?.stage
    if (!stage) continue
    if (!byStage[stage]) byStage[stage] = {}
    byStage[stage][score.participant_id] = (byStage[stage][score.participant_id] ?? 0) + score.total_points
  }

  return STAGE_ORDER
    .filter(s => byStage[s] && Object.values(byStage[s]).some(v => v > 0))
    .map(s => ({
      key: s,
      label: STAGE_LABELS[s] ?? s,
      entries: Object.entries(byStage[s])
        .sort((a, b) => b[1] - a[1])
        .map(([pid, pts]) => ({ name: nameMap.get(pid) ?? "—", pts })),
    }))
}

function participantName(participants: { name: string } | { name: string }[] | null | undefined): string {
  if (!participants) return "—"
  if (Array.isArray(participants)) return participants[0]?.name ?? "—"
  return (participants as { name: string }).name ?? "—"
}

export default async function HomePage() {
  const [ranking, nextMatches, stageRanking] = await Promise.all([getRanking(), getNextMatches(), getRankingByStage()])

  const rankingGeral = (
    <div className="space-y-1">
      {ranking.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          🏆 Nenhum palpite ainda — a Copa começa em breve!
        </p>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ranking.map((entry: any, idx: number) => (
          <div key={entry.participant_id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
              ${idx === 0 ? "bg-yellow-50 dark:bg-yellow-950/40" :
                idx === 1 ? "bg-slate-50 dark:bg-slate-900/40" :
                idx === 2 ? "bg-orange-50 dark:bg-orange-950/40" : ""}`}>
            <span className="w-6 text-center font-bold text-sm">
              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
            </span>
            <span className="flex-1 font-medium text-sm truncate">{participantName(entry.participants)}</span>
            <div className="flex items-center gap-2 shrink-0">
              {entry.rankChange !== null && entry.rankChange !== 0 && (
                <span className={`flex items-center text-xs font-semibold ${entry.rankChange > 0 ? "text-green-600" : "text-red-500"}`}>
                  {entry.rankChange > 0
                    ? <><ArrowUp className="w-3 h-3" />{entry.rankChange}</>
                    : <><ArrowDown className="w-3 h-3" />{Math.abs(entry.rankChange)}</>
                  }
                </span>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3" />{entry.exact_scores}
              </span>
              <span className="font-bold text-sm">{entry.total_points} <span className="text-muted-foreground font-normal">pts</span></span>
            </div>
          </div>
        ))
      )}
    </div>
  )

  const rankingPorFase = (
    <div className="space-y-5">
      {stageRanking.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Disponível após os primeiros jogos encerrados.
        </p>
      ) : (
        stageRanking.map(stage => (
          <div key={stage.key}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
              {stage.label}
            </p>
            <div className="space-y-0.5">
              {stage.entries.map((entry, idx) => (
                <div key={entry.name} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${idx === 0 ? "bg-yellow-50 dark:bg-yellow-950/40" : ""}`}>
                  <span className="w-5 text-center font-bold text-sm text-muted-foreground">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                  </span>
                  <span className="flex-1 text-sm">{entry.name}</span>
                  <span className="font-bold text-sm">{entry.pts} <span className="text-muted-foreground font-normal text-xs">pts</span></span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-950 to-background">
      {/* Header */}
      <div className="bg-green-900 text-white px-4 py-6 text-center">
        <div className="text-4xl mb-2">⚽</div>
        <h1 className="text-2xl font-bold tracking-tight">Bolão Copa 2026</h1>
        <p className="text-green-300 text-sm mt-1">FIFA World Cup • Canadá, México &amp; EUA</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="sm" className="bg-yellow-400 hover:bg-yellow-300 text-green-950 font-bold px-5">
            <Link href="/rules">
              <BookOpen className="w-4 h-4 mr-2" />
              Ver Regras &amp; Premiação
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="border-green-600 bg-transparent text-green-100 hover:bg-green-800 hover:text-white">
            <Link href="/grupos">
              <Table2 className="w-4 h-4 mr-2" />
              Grupos
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="border-green-600 bg-transparent text-green-100 hover:bg-green-800 hover:text-white">
            <Link href="/stats">
              <BarChart2 className="w-4 h-4 mr-2" />
              Estatísticas
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Próximos jogos */}
        {nextMatches.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Próximos Jogos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 divide-y">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {nextMatches.map((m: any) => {
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

        {/* Ranking com abas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Ranking
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TabSwitcher
              tabs={[
                { label: "Geral", content: rankingGeral },
                { label: "Por Fase", content: rankingPorFase },
              ]}
            />
          </CardContent>
        </Card>

        {/* Acesso por token */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <TokenAccess />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
