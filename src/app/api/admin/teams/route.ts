import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = createAdminClient()

  const [teamsRes, configRes] = await Promise.all([
    supabase.from("teams").select("id, fifa_code, name, flag_url, group_letter").order("group_letter").order("name"),
    supabase.from("pool_config").select("value").eq("key", "r16_bracket").single(),
  ])

  if (teamsRes.error) return NextResponse.json({ error: teamsRes.error.message }, { status: 500 })

  return NextResponse.json({
    teams: teamsRes.data,
    r32Seeding: configRes.data?.value ?? [],
  })
}
