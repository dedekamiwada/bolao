import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, GitFork, Info, Trophy } from "lucide-react"
import { hashToken } from "@/lib/tokens"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TeamFlag } from "@/components/shared/TeamFlag"
import { GroupStandingsTable } from "@/components/shared/GroupStandingsTable"
import { TabSwitcher } from "@/components/shared/TabSwitcher"
import { PanelCarousel } from "@/components/shared/PanelCarousel"
import { STAGE_LABELS } from "@/types/domain"
import {
  simulateGroupStandings,
  OFFICIAL_R32_BRACKET,
} from "@/lib/scoring/groupSimulation"
import {
  KNOCKOUT_PROGRESSION,
  THIRD_PLACE_MATCH,
  THIRD_PLACE_SOURCES,
  sourceLabel,
} from "@/lib/scoring/bracketPreview"
import type { TeamStanding } from "@/types/domain"

export const dynamic = "force-dynamic"

interface TeamRow {
  id: number
  fifa_code: string
  name: string
  flag_url: string | null
}

interface BracketSlot {
  team: TeamRow | null
  placeholder: string // shown when team is unknown, e.g. "1º Grupo A" / "Vencedor J89"
}

interface BracketMatch {
  matchNumber: number
  stage: string
  home: BracketSlot
  away: BracketSlot
  predHome: number | null
  predAway: number | null
  winnerTeamId: number | null
}

const STAGE_ORDER = ["R32", "R16", "QF", "SF", "3RD", "FINAL"] as const

// Rótulos curtos para os chips do carrossel de fases
const STAGE_SHORT: Record<(typeof STAGE_ORDER)[number], string> = {
  R32: "16 avos",
  R16: "Oitavas",
  QF: "Quartas",
  SF: "Semis",
  "3RD": "3º",
  FINAL: "Final",
}

async function buildBracket(token: string) {
  const supabase = createAdminClient()
  const tokenHash = hashToken(token)

  const { data: participant } = await supabase
    .from("participants")
    .select("id, name, is_active")
    .eq("token_hash", tokenHash)
    .single()

  if (!participant || !participant.is_active) return null

  const [
    { data: groupMatches },
    { data: groupPreds },
    { data: teams },
    { data: knockoutMatches },
    { data: knockoutPreds },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("id, group_letter, match_number, home_team_id, away_team_id")
      .eq("stage", "GROUP"),
    supabase
      .from("group_predictions")
      .select("match_id, home_score, away_score")
      .eq("participant_id", participant.id),
    supabase.from("teams").select("id, fifa_code, name, flag_url"),
    supabase
      .from("matches")
      .select("id, stage, match_number")
      .neq("stage", "GROUP"),
    supabase
      .from("knockout_predictions")
      .select("match_id, home_score, away_score, winner_team_id")
      .eq("participant_id", participant.id),
  ])

  if (!groupMatches || !teams) return null

  const teamById = new Map<number, TeamRow>((teams as TeamRow[]).map(t => [t.id, t]))

  // ── 1. Simular classificação dos grupos com os palpites do participante ──
  const predMap = new Map(
    (groupPreds ?? []).map(p => [p.match_id, { matchId: p.match_id, home: p.home_score, away: p.away_score }])
  )
  const totalGroupPreds = groupPreds?.length ?? 0

  const groupLetters = [...new Set(groupMatches.map(m => m.group_letter).filter(Boolean))].sort() as string[]
  const standingsByGroup: Record<string, TeamStanding[]> = {}
  const groupsFullyPredicted = new Set<string>()
  const predictedCountByGroup: Record<string, number> = {}

  for (const letter of groupLetters) {
    const gm = groupMatches.filter(m => m.group_letter === letter)
    standingsByGroup[letter] = simulateGroupStandings(
      gm.map(m => ({ id: m.id, homeTeamId: m.home_team_id!, awayTeamId: m.away_team_id!, groupLetter: letter })),
      predMap
    )
    predictedCountByGroup[letter] = gm.filter(m => predMap.has(m.id)).length
    if (gm.every(m => predMap.has(m.id))) groupsFullyPredicted.add(letter)
  }

  // Melhores 3ºs ordenados (apenas de grupos totalmente palpitados, para não
  // classificar um 3º "por acaso" de um grupo sem palpites)
  const thirds = groupLetters
    .filter(l => groupsFullyPredicted.has(l))
    .map(l => ({ ...standingsByGroup[l][2], groupLetter: l }))
    .filter(Boolean)
    .sort((a, b) =>
      b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor
    )
  const best8Thirds = thirds.slice(0, 8)

  // ── 2. Resolver os 16 jogos do R32 ──
  // Os slots de 3º colocado têm grupos elegíveis distintos; uma escolha gulosa
  // pode esgotar candidatos e deixar um slot vazio mesmo havendo combinação
  // válida. Backtracking simples (8 slots × 8 times) garante alocação completa.
  const thirdSlots = OFFICIAL_R32_BRACKET
    .filter(s => s.awaySource.startsWith("3"))
    .map(s => ({ matchNumber: s.matchNumber, eligible: s.awaySource.slice(1).split("") }))

  const thirdAssignment = new Map<number, number>() // matchNumber → teamId
  function assignThirds(slotIdx: number, used: Set<number>): boolean {
    if (slotIdx >= thirdSlots.length) return true
    const slot = thirdSlots[slotIdx]
    for (const t of best8Thirds) {
      if (used.has(t.teamId) || !slot.eligible.includes(t.groupLetter)) continue
      used.add(t.teamId)
      thirdAssignment.set(slot.matchNumber, t.teamId)
      if (assignThirds(slotIdx + 1, used)) return true
      used.delete(t.teamId)
      thirdAssignment.delete(slot.matchNumber)
    }
    // Sem candidato para este slot (palpites incompletos): deixa vazio e segue
    return best8Thirds.length < 8 ? assignThirds(slotIdx + 1, used) : false
  }
  if (!assignThirds(0, new Set())) {
    // Fallback defensivo: se não houver emparelhamento perfeito, aloca
    // gulosamente o que for possível (melhor mostrar parcial do que nada)
    thirdAssignment.clear()
    const used = new Set<number>()
    for (const slot of thirdSlots) {
      const pick = best8Thirds.find(t => !used.has(t.teamId) && slot.eligible.includes(t.groupLetter))
      if (pick) {
        used.add(pick.teamId)
        thirdAssignment.set(slot.matchNumber, pick.teamId)
      }
    }
  }

  const slotTeams = new Map<number, { home: number | null; away: number | null }>()
  const slotPlaceholders = new Map<number, { home: string; away: string }>()

  function resolveSource(source: string, matchNumber: number): number | null {
    const direct = source.match(/^([12])([A-L])$/)
    if (direct) {
      const letter = direct[2]
      if (!groupsFullyPredicted.has(letter)) return null
      return standingsByGroup[letter]?.[parseInt(direct[1]) - 1]?.teamId ?? null
    }
    if (source.startsWith("3")) return thirdAssignment.get(matchNumber) ?? null
    return null
  }

  for (const slot of OFFICIAL_R32_BRACKET) {
    slotTeams.set(slot.matchNumber, {
      home: resolveSource(slot.homeSource, slot.matchNumber),
      away: resolveSource(slot.awaySource, slot.matchNumber),
    })
    slotPlaceholders.set(slot.matchNumber, {
      home: sourceLabel(slot.homeSource),
      away: sourceLabel(slot.awaySource),
    })
  }

  // ── 3. Avançar vencedores pelos palpites do mata-mata (se existirem) ──
  const koByNumber = new Map((knockoutMatches ?? []).map(m => [m.match_number, m]))
  const koPredByMatchId = new Map((knockoutPreds ?? []).map(p => [p.match_id, p]))

  function predFor(matchNumber: number) {
    const dbMatch = koByNumber.get(matchNumber)
    return dbMatch ? koPredByMatchId.get(dbMatch.id) ?? null : null
  }
  function winnerOf(matchNumber: number): number | null {
    return predFor(matchNumber)?.winner_team_id ?? null
  }
  function loserOf(matchNumber: number): number | null {
    const winner = winnerOf(matchNumber)
    const slot = slotTeams.get(matchNumber)
    if (!winner || !slot?.home || !slot?.away) return null
    if (winner === slot.home) return slot.away
    if (winner === slot.away) return slot.home
    return null
  }

  // R16 → FINAL na ordem dos match numbers (progressão depende dos anteriores)
  const laterNumbers = Object.keys(KNOCKOUT_PROGRESSION).map(Number).sort((a, b) => a - b)
  for (const num of laterNumbers) {
    const feed = KNOCKOUT_PROGRESSION[num]
    slotTeams.set(num, { home: winnerOf(feed.home), away: winnerOf(feed.away) })
    slotPlaceholders.set(num, { home: `Vencedor J${feed.home}`, away: `Vencedor J${feed.away}` })
  }
  // 3º lugar: perdedores das semis
  slotTeams.set(THIRD_PLACE_MATCH, {
    home: loserOf(THIRD_PLACE_SOURCES.home),
    away: loserOf(THIRD_PLACE_SOURCES.away),
  })
  slotPlaceholders.set(THIRD_PLACE_MATCH, {
    home: `Perdedor J${THIRD_PLACE_SOURCES.home}`,
    away: `Perdedor J${THIRD_PLACE_SOURCES.away}`,
  })

  // ── 4. Montar estrutura final para renderização ──
  const bracket: BracketMatch[] = []
  for (const ko of (knockoutMatches ?? []).sort((a, b) => a.match_number - b.match_number)) {
    const slot = slotTeams.get(ko.match_number)
    const ph = slotPlaceholders.get(ko.match_number)
    const pred = koPredByMatchId.get(ko.id)
    bracket.push({
      matchNumber: ko.match_number,
      stage: ko.stage,
      home: { team: slot?.home ? teamById.get(slot.home) ?? null : null, placeholder: ph?.home ?? "?" },
      away: { team: slot?.away ? teamById.get(slot.away) ?? null : null, placeholder: ph?.away ?? "?" },
      predHome: pred?.home_score ?? null,
      predAway: pred?.away_score ?? null,
      winnerTeamId: pred?.winner_team_id ?? null,
    })
  }

  const champion = winnerOf(104) ? teamById.get(winnerOf(104)!) ?? null : null

  // Classificação simulada por grupo (inclui grupos com palpites parciais)
  const groups = groupLetters.map(letter => ({
    letter,
    predicted: predictedCountByGroup[letter],
    total: groupMatches.filter(m => m.group_letter === letter).length,
    standings: standingsByGroup[letter].map(s => {
      const t = teamById.get(s.teamId)
      return {
        ...s,
        fifaCode: t?.fifa_code ?? "",
        teamName: t?.name ?? "",
        flagUrl: t?.flag_url ?? null,
      }
    }),
  }))

  return {
    participant,
    bracket,
    champion,
    groups,
    totalGroupPreds,
    groupsComplete: groupsFullyPredicted.size,
    totalGroups: groupLetters.length,
  }
}

function SlotRow({ slot, isWinner, score }: { slot: BracketSlot; isWinner: boolean; score: number | null }) {
  return (
    <div className={`flex items-center gap-2 py-1 ${isWinner ? "font-bold" : ""}`}>
      {slot.team ? (
        <>
          <TeamFlag flagUrl={slot.team.flag_url} name={slot.team.name} size="sm" />
          <span className="text-sm flex-1 truncate">{slot.team.name}</span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground italic flex-1 truncate pl-1">{slot.placeholder}</span>
      )}
      <span className={`text-sm w-5 text-center shrink-0 ${score === null ? "text-muted-foreground" : ""}`}>
        {score ?? "–"}
      </span>
    </div>
  )
}

export default async function BracketPreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await buildBracket(token)
  if (!data) notFound()

  const { bracket, champion, groups, totalGroupPreds, groupsComplete, totalGroups } = data

  return (
    <main className="min-h-screen bg-background pb-8">
      <div className="bg-green-900 text-white px-4 py-4 flex items-center gap-3">
        <Link href={`/p/${token}`}><ArrowLeft className="w-5 h-5 text-green-300" /></Link>
        <div>
          <h1 className="font-bold flex items-center gap-2">
            <GitFork className="w-4 h-4" /> Meu Chaveamento
          </h1>
          <p className="text-green-300 text-xs">Previsão dos grupos e do mata-mata segundo seus palpites</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {/* Aviso sobre completude dos palpites */}
        {groupsComplete < totalGroups && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 flex gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Você palpitou {totalGroupPreds} de 72 jogos da fase de grupos
              ({groupsComplete} de {totalGroups} grupos completos).
              Vagas de grupos sem todos os palpites aparecem como indefinidas.
            </p>
          </div>
        )}

        {/* Abas: Previsão dos Grupos × Chaveamento */}
        <TabSwitcher
          tabs={[
            {
              label: "Grupos",
              content: (
                <PanelCarousel
                  hint="← deslize para mudar de grupo →"
                  labels={groups.map(g => g.letter)}
                  panels={groups.map(g => (
                    <div key={g.letter} className="space-y-4">
                      <div>
                        <GroupStandingsTable letter={g.letter} standings={g.standings} />
                        {g.predicted < g.total && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 px-1">
                            {g.predicted}/{g.total} jogos palpitados — classificação parcial
                          </p>
                        )}
                      </div>
                      <div className="text-center">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/p/${token}/predict`}>Editar palpites da Fase de Grupos</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                />
              ),
            },
            {
              label: "Chaveamento",
              content: (
                <div className="space-y-4">
                  {/* Campeão previsto */}
                  {champion && (
                    <Card className="border-yellow-400 dark:border-yellow-600 bg-yellow-50/50 dark:bg-yellow-950/20">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-yellow-500 shrink-0" />
                        <div className="flex items-center gap-2">
                          <TeamFlag flagUrl={champion.flag_url} name={champion.name} size="md" />
                          <div>
                            <p className="font-bold">{champion.name}</p>
                            <p className="text-xs text-muted-foreground">Seu campeão da Copa 2026</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Fases — uma por vez, deslize para navegar */}
                  <PanelCarousel
                    hint="← deslize para mudar de fase →"
                    labels={STAGE_ORDER.filter(stage => bracket.some(m => m.stage === stage)).map(stage => STAGE_SHORT[stage])}
                    panels={STAGE_ORDER.filter(stage => bracket.some(m => m.stage === stage)).map(stage => {
                      const stageMatches = bracket.filter(m => m.stage === stage)
                      return (
                        <div key={stage} className="space-y-4">
                          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide px-1">
                            {STAGE_LABELS[stage]}
                          </h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {stageMatches.map(m => (
                              <Card key={m.matchNumber}>
                                <CardContent className="px-3 py-2">
                                  <p className="text-[10px] text-muted-foreground mb-0.5">Jogo {m.matchNumber}</p>
                                  <SlotRow
                                    slot={m.home}
                                    isWinner={m.winnerTeamId !== null && m.home.team?.id === m.winnerTeamId}
                                    score={m.predHome}
                                  />
                                  <SlotRow
                                    slot={m.away}
                                    isWinner={m.winnerTeamId !== null && m.away.team?.id === m.winnerTeamId}
                                    score={m.predAway}
                                  />
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground text-center">
                            Os jogos do 16 avos em diante avançam conforme seus palpites do mata-mata.
                            Enquanto eles não estiverem disponíveis, as vagas aparecem como &quot;Vencedor J__&quot;.
                          </p>
                        </div>
                      )
                    })}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </main>
  )
}
