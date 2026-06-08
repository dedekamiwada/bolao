"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp, Loader2 } from "lucide-react"
import Link from "next/link"
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

const COLORS = ["#16a34a","#2563eb","#dc2626","#d97706","#7c3aed","#0891b2","#be185d","#84cc16","#f97316","#06b6d4"]

interface Snapshot {
  participant_id: string
  snapshot_date: string
  total_points: number
  rank_position: number | null
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
  const participants = [...new Set(history.map(h => h.participant_id))]

  const chartData = dates.map(date => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const point: Record<string, any> = { date: date.slice(5) } // MM-DD
    for (const pid of participants) {
      const snap = history.find(h => h.snapshot_date === date && h.participant_id === pid)
      if (snap) point[pid] = view === "points" ? snap.total_points : snap.rank_position
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

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-2">
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
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum dado ainda — o gráfico aparece após os primeiros jogos.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis reversed={view === "rank"} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => [value, names[name as string] ?? name]} />
                  <Legend formatter={name => names[name as string] ?? name} />
                  {participants.map((pid, i) => (
                    <Line
                      key={pid}
                      type="monotone"
                      dataKey={pid}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
