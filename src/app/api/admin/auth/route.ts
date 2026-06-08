import { NextRequest, NextResponse } from "next/server"
import { getIronSession } from "iron-session"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { sessionOptions, type SessionData } from "@/lib/session"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password) {
    return NextResponse.json({ error: "Senha obrigatória" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("pool_config")
    .select("value")
    .eq("key", "admin_password_hash")
    .single()

  if (!data) {
    return NextResponse.json({ error: "Admin não configurado" }, { status: 500 })
  }

  const hash = data.value as string
  const valid = await bcrypt.compare(password, hash)

  if (!valid) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })
  }

  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  session.isAdmin = true
  await session.save()

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  session.destroy()
  return NextResponse.json({ ok: true })
}
