import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = createAdminClient()
  const { data, error: dbError } = await supabase
    .from("teams")
    .select("id, fifa_code, name, flag_url, group_letter")
    .order("name", { ascending: true })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ teams: data })
}
