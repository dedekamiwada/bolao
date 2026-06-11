import { NextRequest, NextResponse } from "next/server"
import { syncMatches } from "@/lib/football-data/sync"

// Vários jogos podem terminar no mesmo ciclo (rodadas com horários simultâneos),
// e cada um dispara recálculo de pontos — margem acima dos 10s padrão
export const maxDuration = 60

// Called by Vercel Cron
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await syncMatches()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("Sync error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
