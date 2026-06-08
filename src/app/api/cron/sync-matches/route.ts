import { NextRequest, NextResponse } from "next/server"
import { syncMatches } from "@/lib/football-data/sync"

// Called by Vercel Cron every 5 minutes
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
