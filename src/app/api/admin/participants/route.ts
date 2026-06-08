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

  const body = await req.json()

  // Regenerar token de participante existente
  if (body.regenerate && body.id) {
    const { raw, hash } = generateToken()
    const supabase = createAdminClient()
    const { error: dbError } = await supabase
      .from("participants")
      .update({ token_hash: hash, is_active: true })
      .eq("id", body.id)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
    return NextResponse.json({ link: `${baseUrl}/p/${raw}`, token: raw })
  }

  // Criar novo participante
  const { name } = body
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

  const { id, hard } = await req.json()
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })

  const supabase = createAdminClient()

  if (hard) {
    // Exclusão definitiva — apaga participante e todos os seus dados (cascade)
    const { error: dbError } = await supabase
      .from("participants")
      .delete()
      .eq("id", id)
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  } else {
    // Desativar apenas (mantém dados)
    const { error: dbError } = await supabase
      .from("participants")
      .update({ is_active: false })
      .eq("id", id)
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
