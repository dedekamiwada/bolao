import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { sessionOptions, type SessionData } from "@/lib/session"
import { NextResponse } from "next/server"

export async function requireAdmin() {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  if (!session.isAdmin) {
    return { session: null, error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) }
  }

  return { session, error: null }
}
