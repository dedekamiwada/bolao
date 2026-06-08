-- ============================================================
-- FIFA World Cup 2026 — Knockout Stage Matches (32 matches)
-- Fonte: ESPN + Wikipedia oficial
-- Times são NULL até o encerramento da fase de grupos
-- O sync da API preencherá home_team_id/away_team_id automaticamente
-- ============================================================

-- ============================================================
-- R32 — 16 AVOS DE FINAL (Matches 73–88)
-- Seeding oficial: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage
-- ============================================================
INSERT INTO matches (stage, match_number, scheduled_at, status) VALUES
-- 28 jun
('R32', 73, '2026-06-28 19:00:00+00', 'SCHEDULED'),  -- 2A vs 2B
-- 29 jun
('R32', 74, '2026-06-29 17:00:00+00', 'SCHEDULED'),  -- 1C vs 2F
('R32', 75, '2026-06-29 20:30:00+00', 'SCHEDULED'),  -- 1E vs 3°(A/B/C/D/F)
('R32', 76, '2026-06-30 01:00:00+00', 'SCHEDULED'),  -- 1F vs 2C
-- 30 jun
('R32', 77, '2026-06-30 17:00:00+00', 'SCHEDULED'),  -- 2E vs 2I
('R32', 78, '2026-06-30 21:00:00+00', 'SCHEDULED'),  -- 1I vs 3°(C/D/F/G/H)
('R32', 79, '2026-07-01 01:00:00+00', 'SCHEDULED'),  -- 1A vs 3°(C/E/F/H/I)
-- 1 jul
('R32', 80, '2026-07-01 16:00:00+00', 'SCHEDULED'),  -- 1L vs 3°(E/H/I/J/K)
('R32', 81, '2026-07-01 20:00:00+00', 'SCHEDULED'),  -- 1G vs 3°(A/E/H/I/J)
('R32', 82, '2026-07-02 00:00:00+00', 'SCHEDULED'),  -- 1D vs 3°(B/E/F/I/J)
-- 2 jul
('R32', 83, '2026-07-02 19:00:00+00', 'SCHEDULED'),  -- 1H vs 2J
('R32', 84, '2026-07-02 23:00:00+00', 'SCHEDULED'),  -- 2K vs 2L
('R32', 85, '2026-07-03 03:00:00+00', 'SCHEDULED'),  -- 1B vs 3°(E/F/G/I/J)
-- 3 jul
('R32', 86, '2026-07-03 18:00:00+00', 'SCHEDULED'),  -- 2D vs 2G
('R32', 87, '2026-07-03 22:00:00+00', 'SCHEDULED'),  -- 1J vs 2H
('R32', 88, '2026-07-04 01:30:00+00', 'SCHEDULED');  -- 1K vs 3°(D/E/I/J/L)

-- ============================================================
-- R16 — OITAVAS DE FINAL (Matches 89–96)
-- Datas aproximadas: 4–7 julho
-- ============================================================
INSERT INTO matches (stage, match_number, scheduled_at, status) VALUES
('R16', 89, '2026-07-04 19:00:00+00', 'SCHEDULED'),  -- W73 vs W74
('R16', 90, '2026-07-04 23:00:00+00', 'SCHEDULED'),  -- W75 vs W76
('R16', 91, '2026-07-05 19:00:00+00', 'SCHEDULED'),  -- W77 vs W78
('R16', 92, '2026-07-05 23:00:00+00', 'SCHEDULED'),  -- W79 vs W80
('R16', 93, '2026-07-06 19:00:00+00', 'SCHEDULED'),  -- W81 vs W82
('R16', 94, '2026-07-06 23:00:00+00', 'SCHEDULED'),  -- W83 vs W84
('R16', 95, '2026-07-07 19:00:00+00', 'SCHEDULED'),  -- W85 vs W86
('R16', 96, '2026-07-07 23:00:00+00', 'SCHEDULED');  -- W87 vs W88

-- ============================================================
-- QF — QUARTAS DE FINAL (Matches 97–100)
-- Datas: 9–11 julho
-- ============================================================
INSERT INTO matches (stage, match_number, scheduled_at, status) VALUES
('QF', 97, '2026-07-09 23:00:00+00', 'SCHEDULED'),
('QF', 98, '2026-07-10 23:00:00+00', 'SCHEDULED'),
('QF', 99, '2026-07-11 19:00:00+00', 'SCHEDULED'),
('QF', 100,'2026-07-11 23:00:00+00', 'SCHEDULED');

-- ============================================================
-- SF — SEMIFINAIS (Matches 101–102)
-- Datas: 14–15 julho
-- ============================================================
INSERT INTO matches (stage, match_number, scheduled_at, status) VALUES
('SF', 101, '2026-07-14 23:00:00+00', 'SCHEDULED'),
('SF', 102, '2026-07-15 23:00:00+00', 'SCHEDULED');

-- ============================================================
-- 3RD PLACE — DISPUTA DE 3° LUGAR (Match 103)
-- Data: 18 julho
-- ============================================================
INSERT INTO matches (stage, match_number, scheduled_at, status) VALUES
('3RD', 103, '2026-07-18 21:00:00+00', 'SCHEDULED');

-- ============================================================
-- FINAL (Match 104) — MetLife Stadium, East Rutherford, NJ
-- Data: 19 julho, 15:00 ET = 19:00 UTC
-- ============================================================
INSERT INTO matches (stage, match_number, scheduled_at, status) VALUES
('FINAL', 104, '2026-07-19 19:00:00+00', 'SCHEDULED');

-- Atualizar pool_config com seeding oficial do R32
UPDATE pool_config SET value = '[
  {"slot":73,"homeSource":"2A","awaySource":"2B"},
  {"slot":74,"homeSource":"1C","awaySource":"2F"},
  {"slot":75,"homeSource":"1E","awaySource":"3ABCDF"},
  {"slot":76,"homeSource":"1F","awaySource":"2C"},
  {"slot":77,"homeSource":"2E","awaySource":"2I"},
  {"slot":78,"homeSource":"1I","awaySource":"3CDFGH"},
  {"slot":79,"homeSource":"1A","awaySource":"3CEFHI"},
  {"slot":80,"homeSource":"1L","awaySource":"3EHIJK"},
  {"slot":81,"homeSource":"1G","awaySource":"3AEHIJ"},
  {"slot":82,"homeSource":"1D","awaySource":"3BEFIJ"},
  {"slot":83,"homeSource":"1H","awaySource":"2J"},
  {"slot":84,"homeSource":"2K","awaySource":"2L"},
  {"slot":85,"homeSource":"1B","awaySource":"3EFGIJ"},
  {"slot":86,"homeSource":"2D","awaySource":"2G"},
  {"slot":87,"homeSource":"1J","awaySource":"2H"},
  {"slot":88,"homeSource":"1K","awaySource":"3DEIJL"}
]'::jsonb WHERE key = 'r16_bracket';

-- Verificar total de partidas
SELECT stage, count(*) FROM matches GROUP BY stage ORDER BY
  CASE stage WHEN ''GROUP'' THEN 1 WHEN ''R32'' THEN 2 WHEN ''R16'' THEN 3
    WHEN ''QF'' THEN 4 WHEN ''SF'' THEN 5 WHEN ''3RD'' THEN 6 WHEN ''FINAL'' THEN 7 END;
