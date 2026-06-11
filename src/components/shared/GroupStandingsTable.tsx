import { TeamFlag } from "@/components/shared/TeamFlag"

export interface StandingRow {
  teamId: number
  fifaCode: string
  teamName: string
  flagUrl: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goalDiff: number
  points: number
}

// Tabela de classificação de um grupo — sem hooks, renderiza em server e client.
// 1º e 2º destacados (classificados diretos); 3º em tom intermediário (pode
// avançar entre os 8 melhores terceiros).
export function GroupStandingsTable({ letter, standings }: { letter: string; standings: StandingRow[] }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/60 px-3 py-1.5 font-semibold text-sm">Grupo {letter}</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b">
            <th className="text-left py-1 pl-3 w-5">#</th>
            <th className="text-left py-1">Seleção</th>
            <th className="text-center py-1 w-6">J</th>
            <th className="text-center py-1 w-6">V</th>
            <th className="text-center py-1 w-6">E</th>
            <th className="text-center py-1 w-6">D</th>
            <th className="text-center py-1 w-8">SG</th>
            <th className="text-center py-1 w-8 pr-2 font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, idx) => (
            <tr
              key={s.teamId}
              className={`border-b last:border-0 ${
                idx < 2 ? "font-semibold" : idx === 2 ? "" : "text-muted-foreground"
              }`}
            >
              <td className="py-1 pl-3">
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                    idx < 2
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : idx === 2
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                        : ""
                  }`}
                >
                  {idx + 1}
                </span>
              </td>
              <td className="py-1">
                <span className="flex items-center gap-1.5">
                  <TeamFlag flagUrl={s.flagUrl} name={s.teamName} size="sm" />
                  <span className="truncate max-w-[90px]">{s.teamName || s.fifaCode}</span>
                </span>
              </td>
              <td className="text-center py-1">{s.played}</td>
              <td className="text-center py-1">{s.won}</td>
              <td className="text-center py-1">{s.drawn}</td>
              <td className="text-center py-1">{s.lost}</td>
              <td className="text-center py-1">{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</td>
              <td className="text-center py-1 pr-2 font-bold">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
