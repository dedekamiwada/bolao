import type { FDMatchesResponse, FDTeamsResponse } from "./types"

const BASE_URL = "https://api.football-data.org/v4"
const COMPETITION_CODE = "WC" // FIFA World Cup

async function fdFetch<T>(path: string, retried = false): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY!,
    },
    next: { revalidate: 0 }, // Never cache — always fresh
  })

  // Rate limit do plano gratuito: 10 req/min. Espera o tempo indicado pela
  // API (capped em 30s para caber no maxDuration da rota) e tenta 1 vez mais.
  if (res.status === 429 && !retried) {
    const waitSec = Math.min(parseInt(res.headers.get("Retry-After") ?? "10", 10) || 10, 30)
    await new Promise(resolve => setTimeout(resolve, waitSec * 1000))
    return fdFetch<T>(path, true)
  }

  if (res.status === 429) {
    throw new Error("Limite de requisições da football-data.org atingido (10/min). Aguarde 1 minuto e tente novamente.")
  }

  if (!res.ok) {
    throw new Error(`football-data.org error: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<T>
}

export async function fetchAllMatches(): Promise<FDMatchesResponse> {
  return fdFetch<FDMatchesResponse>(`/competitions/${COMPETITION_CODE}/matches`)
}

export async function fetchLiveAndFinishedMatches(): Promise<FDMatchesResponse> {
  return fdFetch<FDMatchesResponse>(
    `/competitions/${COMPETITION_CODE}/matches?status=IN_PLAY,PAUSED,FINISHED`
  )
}

export async function fetchMatch(externalId: number): Promise<{ match: import("./types").FDMatch }> {
  return fdFetch(`/matches/${externalId}`)
}

export async function fetchTeams(): Promise<FDTeamsResponse> {
  return fdFetch<FDTeamsResponse>(`/competitions/${COMPETITION_CODE}/teams`)
}
