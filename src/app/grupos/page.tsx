import Link from "next/link"
import { ArrowLeft, Table2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { simulateGroupStandings } from "@/lib/scoring/groupSimulation"
import { GroupStandingsTable, type StandingRow } from "@/components/shared/GroupStandingsTable"

export const revalidate = 60

interface TeamRow {
  id: number
  fifa_code: string
  name: string
  flag_url: string | null
}

async function getRealStandings() {
  const supabase = await createClient()

  const [{ data: matches }, { data: teams }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, group_letter, home_team_id, away_team_id, home_score, away_score, status")
      .eq("stage", "GROUP"),
    supabase.from("teams").select("id, fifa_code, name, flag_url"),
  ])

  if (!matches || !teams) return null

  const teamById = new Map<number, TeamRow>((teams as TeamRow[]).map(t => [t.id, t]))

  // Apenas jogos encerrados entram na tabela (placar ao vivo oscila demais)
  const resultMap = new Map<number, { matchId: number; home: number; away: number }>()
  let finishedCount = 0
  for (const m of matches) {
    if (m.status === "FINISHED" && m.home_score !== null && m.away_score !== null) {
      resultMap.set(m.id, { matchId: m.id, home: m.home_score, away: m.away_score })
      finishedCount++
    }
  }

  const letters = [...new Set(matches.map(m => m.group_letter).filter(Boolean))].sort() as string[]
  const groups: { letter: string; standings: StandingRow[] }[] = []

  for (const letter of letters) {
    const gm = matches.filter(m => m.group_letter === letter)
    const raw = simulateGroupStandings(
      gm.map(m => ({ id: m.id, homeTeamId: m.home_team_id!, awayTeamId: m.away_team_id!, groupLetter: letter })),
      resultMap
    )
    groups.push({
      letter,
      standings: raw.map(s => {
        const t = teamById.get(s.teamId)
        return { ...s, fifaCode: t?.fifa_code ?? "", teamName: t?.name ?? "", flagUrl: t?.flag_url ?? null }
      }),
    })
  }

  return { groups, finishedCount }
}

export default async function GroupsPage() {
  const data = await getRealStandings()

  return (
    <main className="min-h-screen bg-background">
      <div className="bg-green-900 text-white px-4 py-4 flex items-center gap-3">
        <Link href="/"><ArrowLeft className="w-5 h-5 text-green-300" /></Link>
        <div>
          <h1 className="font-bold flex items-center gap-2">
            <Table2 className="w-4 h-4" /> Tabela dos Grupos
          </h1>
          <p className="text-green-300 text-xs">Classificação oficial — apenas jogos encerrados</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {!data ? (
          <p className="text-sm text-muted-foreground text-center py-8">Erro ao carregar os grupos.</p>
        ) : (
          <>
            {data.finishedCount === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Nenhum jogo encerrado ainda — as tabelas atualizam automaticamente conforme os resultados saem.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.groups.map(g => (
                <GroupStandingsTable key={g.letter} letter={g.letter} standings={g.standings} />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Critérios: pontos, saldo de gols e gols marcados.
              Os 2 primeiros se classificam; os 8 melhores 3ºs também avançam.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
