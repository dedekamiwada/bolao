import { createAdminClient } from "@/lib/supabase/admin"
import { hashToken } from "@/lib/tokens"
import { NextResponse } from "next/server"

export async function validateParticipant(token: string) {
  const tokenHash = hashToken(token)
  const supabase = createAdminClient()

  const { data: participant, error } = await supabase
    .from("participants")
    .select("id, name, is_active")
    .eq("token_hash", tokenHash)
    .single()

  if (error || !participant) {
    return { participant: null, error: NextResponse.json({ error: "Link inválido" }, { status: 401 }) }
  }

  if (!participant.is_active) {
    return { participant: null, error: NextResponse.json({ error: "Participante inativo" }, { status: 403 }) }
  }

  return { participant, error: null }
}

export function isPredictionLocked(scheduledAt: string, cutoffMinutes = 15): boolean {
  const lockTime = new Date(scheduledAt).getTime() - cutoffMinutes * 60 * 1000
  return Date.now() >= lockTime
}
