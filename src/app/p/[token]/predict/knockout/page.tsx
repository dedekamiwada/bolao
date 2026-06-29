"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, Trophy, Lock, ChevronRight, Info, Eye, CalendarDays } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { STAGE_LABELS, KNOCKOUT_POINTS } from "@/types/domain"
import type { Stage } from "@/types/domain"
import { KNOCKOUT_PROGRESSION, THIRD_PLACE_MATCH, THIRD_PLACE_SOURCES } from "@/lib/scoring/bracketPreview"
import { MatchPredictionsModal } from "@/components/predict/MatchPredictionsModal"

interface Team {
  id: number
  fifa_code: string
  name: string
  flag_url: string | null
}

interface KnockoutMatch {
  id: number
  stage: string
  match_number: number
  scheduled_at: string
  status: string
  home_team_id: number | null
  away_team_id: number | null
  home_score: number | null
  away_score: number | null
  winner_team_id: number | null
  home_team: Team | null
  away_team: Team | null
}

interface KnockoutPrediction {
  match_id: number
  home_team_id: number | null
  away_team_id: number | null
  home_score: number | null
  away_score: number | null
  winner_team_id: number | null
  is_locked: boolean
}

const STAGE_ORDER = ["R32", "R16", "QF", "SF", "3RD", "FINAL"]
const STAGE_SHORT: Record<string, string> = {
  R32: "16 avos", R16: "Oitavas", QF: "Quartas", SF: "Semis", "3RD": "3º Lugar", FINAL: "Final",
}

// feedsInto[matchNum] = nextMatchNum que recebe o vencedor desse jogo
const feedsInto: Record<number, number> = {}
for (const [next, sources] of Object.entries(KNOCKOUT_PROGRESSION)) {
  feedsInto[sources.home] = Number(next)
  feedsInto[sources.away] = Number(next)
}

function formatDate(scheduled_at: string) {
  return new Date(scheduled_at).toLocaleString("pt-BR", {
    weekday: "short", day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
}

function Flag({ team }: { team: Team | null }) {
  if (!team) return <div className="w-7 h-5 rounded bg-muted shrink-0" />
  if (!team.flag_url) return (
    <div className="w-7 h-5 rounded bg-muted flex items-center justify-center shrink-0">
      <span className="text-[8px] font-bold text-muted-foreground">{team.fifa_code}</span>
    </div>
  )
  return <Image src={team.flag_url} alt={team.name} width={28} height={20} className="rounded-sm object-cover shrink-0" unoptimized />
}

// ── Modal de palpite ──────────────────────────────────────────────────────────
function PredictionModal({
  match,
  prediction,
  onSave,
  onClose,
}: {
  match: KnockoutMatch
  prediction: KnockoutPrediction | null
  onSave: (matchId: number, home: number, away: number) => void
  onClose: () => void
}) {
  const [home, setHome] = useState(prediction?.home_score?.toString() ?? "")
  const [away, setAway] = useState(prediction?.away_score?.toString() ?? "")
  const homeNum = parseInt(home)
  const awayNum = parseInt(away)
  const valid = !isNaN(homeNum) && !isNaN(awayNum) && homeNum >= 0 && awayNum >= 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-t-2xl sm:rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Cabeçalho */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{formatDate(match.scheduled_at)}</p>
            <p className="text-xs font-medium text-muted-foreground">
              {STAGE_LABELS[match.stage as Stage] ?? match.stage}
            </p>
          </div>

          {/* Times + inputs */}
          <div className="flex items-center gap-4">
            {/* Mandante */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <Flag team={match.home_team} />
              <span className="text-xs font-semibold text-center leading-tight">
                {match.home_team?.name ?? "A definir"}
              </span>
              <input
                type="number" min={0} max={99} inputMode="numeric"
                value={home}
                onChange={e => setHome(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-16 h-14 text-center text-2xl font-bold rounded-xl border-2 focus:outline-none focus:border-green-500 bg-background"
                placeholder="0"
                autoFocus
              />
            </div>

            <span className="text-2xl font-bold text-muted-foreground">×</span>

            {/* Visitante */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <Flag team={match.away_team} />
              <span className="text-xs font-semibold text-center leading-tight">
                {match.away_team?.name ?? "A definir"}
              </span>
              <input
                type="number" min={0} max={99} inputMode="numeric"
                value={away}
                onChange={e => setAway(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-16 h-14 text-center text-2xl font-bold rounded-xl border-2 focus:outline-none focus:border-green-500 bg-background"
                placeholder="0"
              />
            </div>
          </div>

          {/* Pontuação */}
          {match.stage in KNOCKOUT_POINTS && (
            <p className="text-center text-[11px] text-muted-foreground">
              Placar exato:{" "}
              <span className="text-green-700 dark:text-green-400 font-semibold">
                {KNOCKOUT_POINTS[match.stage as Stage].exact} pts
              </span>
              {" · "}Resultado:{" "}
              <span className="font-semibold">{KNOCKOUT_POINTS[match.stage as Stage].result} pts</span>
            </p>
          )}

          <Button
            className="w-full bg-green-700 hover:bg-green-800 text-white h-12 text-base"
            disabled={!valid}
            onClick={() => { if (valid) onSave(match.id, homeNum, awayNum) }}
          >
            Confirmar palpite
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Card de jogo ──────────────────────────────────────────────────────────────
function MatchCard({
  match,
  prediction,
  isLocked,
  sourceLine,
  onTap,
  onViewPredictions,
}: {
  match: KnockoutMatch
  prediction: KnockoutPrediction | null
  isLocked: boolean
  sourceLine?: string
  onTap: () => void
  onViewPredictions?: () => void
}) {
  const teamsKnown = !!(match.home_team && match.away_team)
  const hasPred = prediction !== null && prediction.home_score !== null && prediction.away_score !== null
  const canPredict = !isLocked && teamsKnown
  const isFinished = match.status === "FINISHED"
  const canViewPredictions = teamsKnown && (isLocked || isFinished)

  return (
    <div
      className={[
        "rounded-xl border bg-card transition-all",
        canPredict ? "cursor-pointer active:scale-[0.98] hover:border-green-400" : "",
        hasPred && !isLocked && !isFinished ? "border-green-500/60" : "",
      ].join(" ")}
      onClick={canPredict ? onTap : undefined}
    >
      {/* Fonte (de onde vêm os times) */}
      {sourceLine && (
        <div className="px-3 pt-2 pb-0">
          <p className="text-[10px] text-muted-foreground truncate">{sourceLine}</p>
        </div>
      )}

      <div className="px-3 py-2">
        {/* Data + badges */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-muted-foreground">{formatDate(match.scheduled_at)}</span>
          <div className="flex items-center gap-1.5">
            {isFinished && (
              <span className="text-[9px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">Encerrado</span>
            )}
            {hasPred && !isFinished && (
              <span className="text-[9px] bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 rounded px-1.5 py-0.5 font-medium">
                ✓ Palpitado
              </span>
            )}
            {isLocked && !isFinished && <Lock className="w-3 h-3 text-muted-foreground" />}
            {canViewPredictions && onViewPredictions && (
              <button
                onClick={e => { e.stopPropagation(); onViewPredictions() }}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                title="Ver palpites dos participantes"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
            {canPredict && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        </div>

        {/* Mandante */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Flag team={match.home_team} />
            {match.home_team ? (
              <span className={`text-sm font-semibold truncate ${isFinished && match.winner_team_id === match.home_team.id ? "text-green-700 dark:text-green-400" : ""}`}>
                {match.home_team.name}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground italic truncate">A definir</span>
            )}
          </div>

          {/* Placar */}
          <div className="shrink-0 w-16 text-center flex flex-col items-center gap-0.5">
            {isFinished ? (
              <>
                <span className="text-base font-bold text-green-600 dark:text-green-400">
                  {match.home_score} × {match.away_score}
                </span>
                {hasPred && (
                  <span className="text-[11px] text-muted-foreground leading-none">
                    {prediction!.home_score} × {prediction!.away_score}
                  </span>
                )}
              </>
            ) : hasPred ? (
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                {prediction!.home_score} × {prediction!.away_score}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">– × –</span>
            )}
          </div>

          {/* Visitante */}
          <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
            {match.away_team ? (
              <span className={`text-sm font-semibold truncate text-right ${isFinished && match.winner_team_id === match.away_team.id ? "text-green-700 dark:text-green-400" : ""}`}>
                {match.away_team.name}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground italic truncate text-right">A definir</span>
            )}
            <Flag team={match.away_team} />
          </div>
        </div>

        {/* Visitante — resultado oficial se encerrado */}
        {isFinished && match.winner_team_id && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Classificado:{" "}
            <span className="font-semibold text-foreground">
              {match.winner_team_id === match.home_team?.id
                ? match.home_team?.name
                : match.away_team?.name}
            </span>
          </p>
        )}

        {!teamsKnown && (
          <p className="text-[10px] text-muted-foreground mt-1 italic">
            Times definidos após a rodada anterior
          </p>
        )}
      </div>
    </div>
  )
}

// ── Separador de chave ────────────────────────────────────────────────────────
function BranchDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function KnockoutPredictPage() {
  const { token } = useParams<{ token: string }>()

  const [matches, setMatches] = useState<KnockoutMatch[]>([])
  const [predictions, setPredictions] = useState<Map<number, KnockoutPrediction>>(new Map())
  const [lockedMatchIds, setLockedMatchIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")
  const [activeStageIdx, setActiveStageIdx] = useState(0)
  const [modalMatch, setModalMatch] = useState<KnockoutMatch | null>(null)
  const [viewMatch, setViewMatch] = useState<KnockoutMatch | null>(null)
  const [pendingPreds, setPendingPreds] = useState<Map<number, { home: number; away: number }>>(new Map())
  const [sortByDate, setSortByDate] = useState(false)

  useEffect(() => {
    fetch(`/api/p/${token}/knockout`)
      .then(r => r.json())
      .then(({ matches: m, predictions: p, lockedMatchIds: locked }) => {
        const sorted = (m ?? []).sort((a: KnockoutMatch, b: KnockoutMatch) => a.match_number - b.match_number)
        setMatches(sorted)
        setLockedMatchIds(new Set(locked ?? []))
        const predMap = new Map<number, KnockoutPrediction>()
        ;(p ?? []).forEach((pred: KnockoutPrediction) => predMap.set(pred.match_id, pred))
        setPredictions(predMap)
      })
      .finally(() => setLoading(false))
  }, [token])

  const byMatchNumber = useMemo(() => {
    const map = new Map<number, KnockoutMatch>()
    for (const m of matches) map.set(m.match_number, m)
    return map
  }, [matches])

  const stagesPresent = useMemo(
    () => STAGE_ORDER.filter(s => matches.some(m => m.stage === s)),
    [matches]
  )

  // Garante que o activeStageIdx aponte para o stage com mais jogos pendentes (ou 0)
  useEffect(() => {
    if (stagesPresent.length === 0) return
    const idx = stagesPresent.findIndex(s =>
      matches.filter(m => m.stage === s).some(m => !lockedMatchIds.has(m.id))
    )
    setActiveStageIdx(idx >= 0 ? idx : 0)
  }, [stagesPresent.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rótulo da linha-fonte de cada jogo (de qual match ele vem)
  const sourceLineFor = useCallback((matchNum: number): string | undefined => {
    const prog = KNOCKOUT_PROGRESSION[matchNum]
    if (!prog) return undefined
    const hm = byMatchNumber.get(prog.home)
    const am = byMatchNumber.get(prog.away)
    const hLabel = hm?.home_team && hm?.away_team
      ? `${hm.home_team.fifa_code} × ${hm.away_team.fifa_code}`
      : `Jogo ${prog.home}`
    const aLabel = am?.home_team && am?.away_team
      ? `${am.home_team.fifa_code} × ${am.away_team.fifa_code}`
      : `Jogo ${prog.away}`
    return `W(${hLabel})  ×  W(${aLabel})`
  }, [byMatchNumber])

  function handlePredSave(matchId: number, home: number, away: number) {
    const match = matches.find(m => m.id === matchId)
    if (!match) return
    const homeTeamId = match.home_team_id
    const awayTeamId = match.away_team_id
    const winnerTeamId = home > away ? homeTeamId : away > home ? awayTeamId : null

    setPendingPreds(prev => new Map(prev).set(matchId, { home, away }))
    setPredictions(prev => {
      const next = new Map(prev)
      next.set(matchId, {
        match_id: matchId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_score: home,
        away_score: away,
        winner_team_id: winnerTeamId,
        is_locked: prev.get(matchId)?.is_locked ?? false,
      })
      return next
    })
    setModalMatch(null)
    setSaveMsg("")
  }

  async function handleSave() {
    if (pendingPreds.size === 0) return
    setSaving(true)
    setSaveMsg("")

    const body = [...pendingPreds.entries()].map(([matchId, { home, away }]) => {
      const match = matches.find(m => m.id === matchId)
      const pred = predictions.get(matchId)
      return {
        matchId,
        homeTeamId: match?.home_team_id ?? null,
        awayTeamId: match?.away_team_id ?? null,
        homeScore: home,
        awayScore: away,
        winnerId: pred?.winner_team_id ?? null,
      }
    })

    const res = await fetch(`/api/p/${token}/knockout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictions: body }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setSaveMsg(`✓ ${data.saved} palpites salvos!`)
      setPendingPreds(new Map())
      setTimeout(() => setSaveMsg(""), 3000)
    } else {
      setSaveMsg("Erro ao salvar.")
    }
  }

  // ── Renderização por data (flat, sem agrupamento por chave) ──────────────
  function renderSortedByDate(stage: string) {
    const sorted = matches
      .filter(m => m.stage === stage)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    return (
      <div className="space-y-3">
        {sorted.map(m => (
          <MatchCard
            key={m.id}
            match={m}
            prediction={predictions.get(m.id) ?? null}
            isLocked={lockedMatchIds.has(m.id)}
            sourceLine={sourceLineFor(m.match_number)}
            onTap={() => setModalMatch(m)}
            onViewPredictions={() => setViewMatch(m)}
          />
        ))}
      </div>
    )
  }

  // ── Renderização por fase ──────────────────────────────────────────────────
  function renderStage(stage: string) {
    const stageMatches = matches.filter(m => m.stage === stage)

    // R32: agrupar em pares que vão para a mesma oitava
    if (stage === "R32") {
      // Para cada R16 (89-96), mostrar o par de R32 que alimenta
      const r16Entries = Object.entries(KNOCKOUT_PROGRESSION)
        .filter(([n]) => { const v = Number(n); return v >= 89 && v <= 96 })
        .sort(([a], [b]) => Number(a) - Number(b))

      return (
        <div className="space-y-5">
          {r16Entries.map(([r16Num, sources]) => {
            const m1 = byMatchNumber.get(sources.home)
            const m2 = byMatchNumber.get(sources.away)
            const r16Match = byMatchNumber.get(Number(r16Num))
            const r16Label = r16Match
              ? `→ Oitavas · ${formatDate(r16Match.scheduled_at)}`
              : `→ Oitavas Jogo ${r16Num}`
            return (
              <div key={r16Num} className="space-y-2">
                <BranchDivider label={r16Label} />
                {[m1, m2].filter(Boolean).map(m => (
                  <MatchCard
                    key={m!.id}
                    match={m!}
                    prediction={predictions.get(m!.id) ?? null}
                    isLocked={lockedMatchIds.has(m!.id)}
                    onTap={() => setModalMatch(m!)}
                    onViewPredictions={() => setViewMatch(m!)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )
    }

    // R16: agrupar em pares que vão para a mesma quarta
    if (stage === "R16") {
      const qfEntries = Object.entries(KNOCKOUT_PROGRESSION)
        .filter(([n]) => { const v = Number(n); return v >= 97 && v <= 100 })
        .sort(([a], [b]) => Number(a) - Number(b))

      return (
        <div className="space-y-5">
          {qfEntries.map(([qfNum, sources]) => {
            const m1 = byMatchNumber.get(sources.home)
            const m2 = byMatchNumber.get(sources.away)
            const qfMatch = byMatchNumber.get(Number(qfNum))
            const qfLabel = qfMatch
              ? `→ Quartas · ${formatDate(qfMatch.scheduled_at)}`
              : `→ Quartas Jogo ${qfNum}`
            return (
              <div key={qfNum} className="space-y-2">
                <BranchDivider label={qfLabel} />
                {[m1, m2].filter(Boolean).map(m => (
                  <MatchCard
                    key={m!.id}
                    match={m!}
                    prediction={predictions.get(m!.id) ?? null}
                    isLocked={lockedMatchIds.has(m!.id)}
                    sourceLine={sourceLineFor(m!.match_number)}
                    onTap={() => setModalMatch(m!)}
                    onViewPredictions={() => setViewMatch(m!)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )
    }

    // QF: agrupar em pares que vão para a mesma semi
    if (stage === "QF") {
      const sfEntries = Object.entries(KNOCKOUT_PROGRESSION)
        .filter(([n]) => { const v = Number(n); return v === 101 || v === 102 })
        .sort(([a], [b]) => Number(a) - Number(b))

      return (
        <div className="space-y-5">
          {sfEntries.map(([sfNum, sources]) => {
            const m1 = byMatchNumber.get(sources.home)
            const m2 = byMatchNumber.get(sources.away)
            const sfMatch = byMatchNumber.get(Number(sfNum))
            const sfLabel = sfMatch
              ? `→ Semifinal · ${formatDate(sfMatch.scheduled_at)}`
              : `→ Semifinal ${sfNum}`
            return (
              <div key={sfNum} className="space-y-2">
                <BranchDivider label={sfLabel} />
                {[m1, m2].filter(Boolean).map(m => (
                  <MatchCard
                    key={m!.id}
                    match={m!}
                    prediction={predictions.get(m!.id) ?? null}
                    isLocked={lockedMatchIds.has(m!.id)}
                    sourceLine={sourceLineFor(m!.match_number)}
                    onTap={() => setModalMatch(m!)}
                    onViewPredictions={() => setViewMatch(m!)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )
    }

    // SF: mostra as semis + aponta para a final
    if (stage === "SF") {
      const finalMatch = byMatchNumber.get(104)
      const thirdMatch = byMatchNumber.get(THIRD_PLACE_MATCH)
      return (
        <div className="space-y-5">
          {finalMatch && (
            <div className="space-y-2">
              <BranchDivider label={`→ Final · ${formatDate(finalMatch.scheduled_at)}`} />
              {stageMatches.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  prediction={predictions.get(m.id) ?? null}
                  isLocked={lockedMatchIds.has(m.id)}
                  sourceLine={sourceLineFor(m.match_number)}
                  onTap={() => setModalMatch(m)}
                  onViewPredictions={() => setViewMatch(m)}
                />
              ))}
            </div>
          )}
          {thirdMatch && (
            <div className="space-y-2">
              <BranchDivider label={`→ 3º Lugar · ${formatDate(thirdMatch.scheduled_at)}`} />
              <p className="text-xs text-muted-foreground px-1">Perdedores das semifinais</p>
            </div>
          )}
        </div>
      )
    }

    // 3RD e FINAL: lista simples
    return (
      <div className="space-y-3">
        {stageMatches.map(m => (
          <MatchCard
            key={m.id}
            match={m}
            prediction={predictions.get(m.id) ?? null}
            isLocked={lockedMatchIds.has(m.id)}
            sourceLine={sourceLineFor(m.match_number)}
            onTap={() => setModalMatch(m)}
            onViewPredictions={() => setViewMatch(m)}
          />
        ))}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (matches.length === 0) return (
    <main className="min-h-screen bg-background">
      <div className="bg-green-900 text-white px-4 py-4 flex items-center gap-3">
        <Link href={`/p/${token}`}><ArrowLeft className="w-5 h-5 text-green-300" /></Link>
        <h1 className="font-bold">Mata-Mata</h1>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Os palpites do mata-mata abrem após o encerramento da fase de grupos.</p>
      </div>
    </main>
  )

  const activeStage = stagesPresent[activeStageIdx] ?? stagesPresent[0]
  const pendingCount = pendingPreds.size

  return (
    <main className="min-h-screen bg-background pb-24">

      {/* Header sticky */}
      <div className="bg-green-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href={`/p/${token}`}><ArrowLeft className="w-5 h-5 text-green-300" /></Link>
          <h1 className="font-bold text-base">Mata-Mata · Palpites</h1>
        </div>
        <Link href={`/p/${token}`}>
          <Button size="sm" variant="ghost" className="text-green-300 hover:text-white hover:bg-white/10 gap-1">
            <Trophy className="w-4 h-4" />
            <span className="text-xs">Ranking</span>
          </Button>
        </Link>
      </div>

      {/* Tabs das fases — sticky abaixo do header */}
      <div className="bg-background border-b sticky top-12 z-10">
        <div className="flex items-center">
        <div className="flex overflow-x-auto flex-1">
          {stagesPresent.map((stage, i) => {
            const hasPending = matches
              .filter(m => m.stage === stage)
              .some(m => pendingPreds.has(m.id))
            return (
              <button
                key={stage}
                onClick={() => setActiveStageIdx(i)}
                className={[
                  "relative px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
                  activeStageIdx === i
                    ? "border-green-600 text-green-700 dark:text-green-400 dark:border-green-500"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {STAGE_SHORT[stage] ?? stage}
                {hasPending && (
                  <span className="absolute top-2 right-1.5 w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setSortByDate(v => !v)}
          className={[
            "px-3 flex items-center gap-1 shrink-0 border-l py-3 text-xs transition-colors",
            sortByDate ? "text-green-600 dark:text-green-400" : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
          title={sortByDate ? "Ver por chaveamento" : "Ver por data"}
        >
          <CalendarDays className="w-4 h-4" />
          <span className="hidden sm:inline text-[11px]">{sortByDate ? "Chave" : "Data"}</span>
        </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto px-3 py-4">

        {/* Pontuação da fase */}
        {activeStage && activeStage in KNOCKOUT_POINTS && (
          <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            <span className="font-medium">{STAGE_LABELS[activeStage as Stage]}:</span>
            <span className="text-green-700 dark:text-green-400 font-semibold">
              {KNOCKOUT_POINTS[activeStage as Stage].exact} pts
            </span>
            <span>placar exato ·</span>
            <span className="font-semibold">{KNOCKOUT_POINTS[activeStage as Stage].result} pts</span>
            <span>resultado</span>
          </div>
        )}

        {sortByDate ? renderSortedByDate(activeStage) : renderStage(activeStage)}
      </div>

      {/* Botão salvar — sticky no fundo */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-3 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {saveMsg && (
            <span className={`text-sm flex-1 ${saveMsg.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>
              {saveMsg}
            </span>
          )}
          {pendingCount > 0 && !saveMsg && (
            <span className="text-sm text-muted-foreground flex-1">
              {pendingCount} palpite{pendingCount > 1 ? "s" : ""} não salvo{pendingCount > 1 ? "s" : ""}
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || pendingCount === 0}
            className="flex-1 bg-green-700 hover:bg-green-800 text-white disabled:opacity-50 h-11"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
              : pendingCount > 0
                ? `Salvar ${pendingCount} palpite${pendingCount > 1 ? "s" : ""}`
                : "Sem alterações pendentes"
            }
          </Button>
        </div>
      </div>

      {/* Modal de palpite */}
      {modalMatch && (
        <PredictionModal
          match={modalMatch}
          prediction={predictions.get(modalMatch.id) ?? null}
          onSave={handlePredSave}
          onClose={() => setModalMatch(null)}
        />
      )}

      {/* Modal de palpites dos participantes */}
      {viewMatch && (
        <MatchPredictionsModal
          match={{
            id: viewMatch.id,
            stage: viewMatch.stage,
            status: viewMatch.status,
            home_score: viewMatch.home_score,
            away_score: viewMatch.away_score,
            home_team: viewMatch.home_team,
            away_team: viewMatch.away_team,
            scheduled_at: viewMatch.scheduled_at,
          }}
          isLocked={viewMatch.status !== "SCHEDULED"}
          isFinished={viewMatch.status === "FINISHED"}
          onClose={() => setViewMatch(null)}
        />
      )}
    </main>
  )
}
