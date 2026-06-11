// ============================================================
// Progressão oficial do mata-mata FIFA 2026 (match numbers)
// Cada jogo das fases seguintes recebe os vencedores dos
// jogos indicados (na ordem home, away).
// Fonte: mesmo seeding da migration 006_seed_knockout_matches.sql
// ============================================================

export const KNOCKOUT_PROGRESSION: Record<number, { home: number; away: number }> = {
  // R16 — Oitavas (89–96)
  89: { home: 73, away: 74 },
  90: { home: 75, away: 76 },
  91: { home: 77, away: 78 },
  92: { home: 79, away: 80 },
  93: { home: 81, away: 82 },
  94: { home: 83, away: 84 },
  95: { home: 85, away: 86 },
  96: { home: 87, away: 88 },
  // QF — Quartas (97–100)
  97: { home: 89, away: 90 },
  98: { home: 91, away: 92 },
  99: { home: 93, away: 94 },
  100: { home: 95, away: 96 },
  // SF — Semifinais (101–102)
  101: { home: 97, away: 98 },
  102: { home: 99, away: 100 },
  // FINAL (104) — vencedores das semis
  104: { home: 101, away: 102 },
}

// 3º lugar (103) recebe os PERDEDORES das semifinais
export const THIRD_PLACE_MATCH = 103
export const THIRD_PLACE_SOURCES = { home: 101, away: 102 }

// Converte um código de origem do R32 em rótulo legível
// "1A" → "1º Grupo A" · "2B" → "2º Grupo B" · "3ABCDF" → "3º (A/B/C/D/F)"
export function sourceLabel(source: string): string {
  const direct = source.match(/^([12])([A-L])$/)
  if (direct) return `${direct[1]}º Grupo ${direct[2]}`
  const third = source.match(/^3([A-L]+)$/)
  if (third) return `3º (${third[1].split("").join("/")})`
  return source
}
