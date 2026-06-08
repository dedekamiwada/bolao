import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("ranking_snapshots")
    .select("participant_id, snapshot_date, total_points, rank_position")
    .order("snapshot_date", { ascending: true })
    .limit(2000)

  if (!data) return NextResponse.json({ history: [] })

  return NextResponse.json({ history: data }, {
    headers: { "Cache-Control": "public, s-maxage=60" },
  })
}
