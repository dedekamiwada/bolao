import type { FDMatchesResponse, FDTeamsResponse } from "./types"

const BASE_URL = "https://api.football-data.org/v4"
const COMPETITION_CODE = "WC" // FIFA World Cup

async function fdFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY!,
    },
    next: { revalidate: 0 }, // Never cache — always fresh
  })

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
