"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp, Loader2 } from "lucide-react"
import Link from "next/link"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

// Cores distintas para qualquer nº de participantes: ângulo áureo no matiz
function colorOf(i: number) {
  return `hsl(${Math.round((i * 137.508) % 360)} 62% 42%)`
}

interface Snapshot {
  participant_id: string
  snapshot_date: string
  total_points: number
  rank_position: number | null
}

interface TooltipEntry {
  dataKey?: string | number
  value?: number | string
  color?: string
  stroke?: string
}

function ChartTooltip({ active, payload, label, view, names }: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
  view: "points" | "rank"
  names: Record<string, string>
}) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].sort((a, b) =>
    view === "rank" ? Number(a.value) - Number(b.value) : Number(b.value) - Number(a.value)
  )
  const shown = sorted.slice(0, 10)
  return (
    <div className="rounded-md border bg-background/95 px-2.5 py-2 shadow-md text-[11px] leading-5 min-w-[10rem]">
      <p className="font-semibold mb-1">{label}</p>
      {shown.map(p => (
        <p key={String(p.dataKey)} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color ?? p.stroke }} />
          <span className="text-muted-foreground truncate">{names[String(p.dataKey)] ?? String(p.dataKey).slice(0, 8)}</span>
          <span className="ml-auto font-semibold tabular-nums pl-2">
            {view === "rank" ? `${p.value}º` : `${p.value} pts`}
          </span>
        </p>
      ))}
      {sorted.length > shown.length && (
        <p className="text-muted-foreground mt-1">+{sorted.length - shown.length} participantes</p>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const { token } = useParams<{ token: string }>()
  const [history, setHistory] = useState<Snapshot[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"points" | "rank">("points")

  useEffect(() => {
    Promise.all([
      fetch("/api/ranking/history").then(r => r.json()),
      fetch(`/api/ranking`).then(r => r.json()),
    ]).then(([{ history: h }, { ranking: r }]) => {
      setHistory(h ?? [])
      const nameMap: Record<string, string> = {}
      ;(r ?? []).forEach((entry: { participant_id: string; name?: string }) => {
        nameMap[entry.participant_id] = entry.name ?? entry.participant_id.slice(0, 8)
      })
      setNames(nameMap)
    }).finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  // Build chart data
  const dates = [...new Set(history.map(h => h.snapshot_date))].sort()

  // Participantes ordenados pela pontuação mais recente — a legenda vira um
  // mini-ranking e as cores ficam fáceis de localizar
  const latestByPid = new Map<string, Snapshot>()
  for (const snap of history) {
    const cur = latestByPid.get(snap.participant_id)
    if (!cur || snap.snapshot_date > cur.snapshot_date) latestByPid.set(snap.participant_id, snap)
  }
  const participants = [...latestByPid.keys()].sort(
    (a, b) => (latestByPid.get(b)!.total_points - latestByPid.get(a)!.total_points)
  )

  const chartData = dates.map(date => {
    const point: Record<string, string | number | null> = {
      date: `${date.slice(8, 10)}/${date.slice(5, 7)}`, // DD/MM
    }
    for (const snap of history) {
      if (snap.snapshot_date !== date) continue
      point[snap.participant_id] = view === "points" ? snap.total_points : snap.rank_position
    }
    return point
  })

  return (
    <main className="min-h-screen bg-background pb-8">
      <div className="bg-green-900 text-white px-4 py-4 flex items-center gap-3">
        <Link href={`/p/${token}`}><ArrowLeft className="w-5 h-5 text-green-300" /></Link>
        <div>
          <h1 className="font-bold">Evolução do Ranking</h1>
          <p className="text-green-300 text-xs">Histórico da Copa</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 py-6 space-y-4">
        <div className="flex gap-2 px-1">
          <Button size="sm" variant={view === "points" ? "default" : "outline"} onClick={() => setView("points")}>
            Pontuação
          </Button>
          <Button size="sm" variant={view === "rank" ? "default" : "outline"} onClick={() => setView("rank")}>
            Posição
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {view === "points" ? "Pontuação ao longo da Copa" : "Posição no ranking"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-4">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum dado ainda — o gráfico aparece após os primeiros jogos.
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis
                      reversed={view === "rank"}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip view={view} names={names} />} />
                    {participants.map((pid, i) => (
                      <Line
                        key={pid}
                        type="monotone"
                        dataKey={pid}
                        stroke={colorOf(i)}
                        strokeWidth={1.5}
                        // Com 1 só dia de dados não há linha — mostra o ponto
                        dot={chartData.length < 2 ? { r: 3, strokeWidth: 0, fill: colorOf(i) } : false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>

                {/* Legenda minimalista, ordenada pelo ranking atual */}
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center pt-3 px-2">
                  {participants.map((pid, i) => (
                    <span key={pid} className="flex items-center gap-1 text-[10px] leading-none text-muted-foreground">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colorOf(i) }} />
                      {names[pid] ?? pid.slice(0, 8)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
