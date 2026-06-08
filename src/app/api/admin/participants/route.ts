import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateToken } from "@/lib/tokens"

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = createAdminClient()
  const { data, error: dbError } = await supabase
    .from("participants")
    .select("id, name, created_at, is_active")
    .order("created_at", { ascending: true })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ participants: data })
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 })
  }

  const { raw, hash } = generateToken()
  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from("participants")
    .insert({ name: name.trim(), token_hash: hash })
    .select("id, name")
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  const link = `${baseUrl}/p/${raw}`

  return NextResponse.json({ participant: data, link, token: raw }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })

  const supabase = createAdminClient()

  // Soft delete — desativa o participante sem apagar dados
  const { error: dbError } = await supabase
    .from("participants")
    .update({ is_active: false })
    .eq("id", id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
