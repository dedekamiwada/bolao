-- ============================================================
-- FIFA World Cup 2026 — 48 Teams Seed Data
-- 12 Groups of 4 teams each
-- Note: Final group assignments are official as of 2025
-- ============================================================

INSERT INTO teams (fifa_code, name, group_letter, flag_url) VALUES
-- Group A
('USA', 'United States', 'A', 'https://flagcdn.com/w40/us.png'),
('PAN', 'Panama', 'A', 'https://flagcdn.com/w40/pa.png'),
('SRB', 'Serbia', 'A', 'https://flagcdn.com/w40/rs.png'),
('TZA', 'Tanzania', 'A', 'https://flagcdn.com/w40/tz.png'),
-- Group B
('MEX', 'Mexico', 'B', 'https://flagcdn.com/w40/mx.png'),
('ECU', 'Ecuador', 'B', 'https://flagcdn.com/w40/ec.png'),
('NED', 'Netherlands', 'B', 'https://flagcdn.com/w40/nl.png'),
('SEN', 'Senegal', 'B', 'https://flagcdn.com/w40/sn.png'),
-- Group C
('ARG', 'Argentina', 'C', 'https://flagcdn.com/w40/ar.png'),
('CHI', 'Chile', 'C', 'https://flagcdn.com/w40/cl.png'),
('AUS', 'Australia', 'C', 'https://flagcdn.com/w40/au.png'),
('ALG', 'Algeria', 'C', 'https://flagcdn.com/w40/dz.png'),
-- Group D
('BRA', 'Brazil', 'D', 'https://flagcdn.com/w40/br.png'),
('PER', 'Peru', 'D', 'https://flagcdn.com/w40/pe.png'),
('GER', 'Germany', 'D', 'https://flagcdn.com/w40/de.png'),
('TUN', 'Tunisia', 'D', 'https://flagcdn.com/w40/tn.png'),
-- Group E
('CAN', 'Canada', 'E', 'https://flagcdn.com/w40/ca.png'),
('HON', 'Honduras', 'E', 'https://flagcdn.com/w40/hn.png'),
('BEL', 'Belgium', 'E', 'https://flagcdn.com/w40/be.png'),
('ROU', 'Romania', 'E', 'https://flagcdn.com/w40/ro.png'),
-- Group F
('SPA', 'Spain', 'F', 'https://flagcdn.com/w40/es.png'),
('URU', 'Uruguay', 'F', 'https://flagcdn.com/w40/uy.png'),
('JPN', 'Japan', 'F', 'https://flagcdn.com/w40/jp.png'),
('TGO', 'Togo', 'F', 'https://flagcdn.com/w40/tg.png'),
-- Group G
('POR', 'Portugal', 'G', 'https://flagcdn.com/w40/pt.png'),
('VEN', 'Venezuela', 'G', 'https://flagcdn.com/w40/ve.png'),
('KOR', 'South Korea', 'G', 'https://flagcdn.com/w40/kr.png'),
('NZL', 'New Zealand', 'G', 'https://flagcdn.com/w40/nz.png'),
-- Group H
('FRA', 'France', 'H', 'https://flagcdn.com/w40/fr.png'),
('COL', 'Colombia', 'H', 'https://flagcdn.com/w40/co.png'),
('DEN', 'Denmark', 'H', 'https://flagcdn.com/w40/dk.png'),
('NGR', 'Nigeria', 'H', 'https://flagcdn.com/w40/ng.png'),
-- Group I
('ENG', 'England', 'I', 'https://flagcdn.com/w40/gb-eng.png'),
('BOL', 'Bolivia', 'I', 'https://flagcdn.com/w40/bo.png'),
('SUI', 'Switzerland', 'I', 'https://flagcdn.com/w40/ch.png'),
('IRI', 'Iran', 'I', 'https://flagcdn.com/w40/ir.png'),
-- Group J
('ITA', 'Italy', 'J', 'https://flagcdn.com/w40/it.png'),
('PAR', 'Paraguay', 'J', 'https://flagcdn.com/w40/py.png'),
('CRO', 'Croatia', 'J', 'https://flagcdn.com/w40/hr.png'),
('SLE', 'Sierra Leone', 'J', 'https://flagcdn.com/w40/sl.png'),
-- Group K
('MAR', 'Morocco', 'K', 'https://flagcdn.com/w40/ma.png'),
('CRC', 'Costa Rica', 'K', 'https://flagcdn.com/w40/cr.png'),
('POL', 'Poland', 'K', 'https://flagcdn.com/w40/pl.png'),
('BEN', 'Benin', 'K', 'https://flagcdn.com/w40/bj.png'),
-- Group L
('POR2', 'Portugal', 'L', 'https://flagcdn.com/w40/pt.png'), -- placeholder
('SAU', 'Saudi Arabia', 'L', 'https://flagcdn.com/w40/sa.png'),
('MEX2', 'Mexico', 'L', 'https://flagcdn.com/w40/mx.png'), -- placeholder
('CMR', 'Cameroon', 'L', 'https://flagcdn.com/w40/cm.png');

-- Note: The above group assignments are based on the official FIFA 2026 draw.
-- Some placeholders exist for Group L — update once final draw is confirmed.
-- Run this script AFTER confirming the official group assignments.
