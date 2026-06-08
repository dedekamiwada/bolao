-- ============================================================
-- FIFA World Cup 2026 — Group Stage Matches (72 jogos)
-- Cada grupo tem 6 jogos (3 rodadas)
-- Horários em UTC — Copa inicia 11/06/2026
-- ============================================================

-- Grupo A: USA, PAN, SRB, TZA
INSERT INTO matches (stage, group_letter, match_number, home_team_id, away_team_id, scheduled_at, status) VALUES
('GROUP','A',1, (SELECT id FROM teams WHERE fifa_code='USA'), (SELECT id FROM teams WHERE fifa_code='PAN'), '2026-06-11 23:00:00+00', 'SCHEDULED'),
('GROUP','A',2, (SELECT id FROM teams WHERE fifa_code='SRB'), (SELECT id FROM teams WHERE fifa_code='TZA'), '2026-06-12 02:00:00+00', 'SCHEDULED'),
('GROUP','A',3, (SELECT id FROM teams WHERE fifa_code='USA'), (SELECT id FROM teams WHERE fifa_code='SRB'), '2026-06-15 19:00:00+00', 'SCHEDULED'),
('GROUP','A',4, (SELECT id FROM teams WHERE fifa_code='PAN'), (SELECT id FROM teams WHERE fifa_code='TZA'), '2026-06-15 23:00:00+00', 'SCHEDULED'),
('GROUP','A',5, (SELECT id FROM teams WHERE fifa_code='USA'), (SELECT id FROM teams WHERE fifa_code='TZA'), '2026-06-19 23:00:00+00', 'SCHEDULED'),
('GROUP','A',6, (SELECT id FROM teams WHERE fifa_code='PAN'), (SELECT id FROM teams WHERE fifa_code='SRB'), '2026-06-19 23:00:00+00', 'SCHEDULED'),

-- Grupo B: MEX, ECU, NED, SEN
('GROUP','B',1, (SELECT id FROM teams WHERE fifa_code='MEX'), (SELECT id FROM teams WHERE fifa_code='ECU'), '2026-06-12 19:00:00+00', 'SCHEDULED'),
('GROUP','B',2, (SELECT id FROM teams WHERE fifa_code='NED'), (SELECT id FROM teams WHERE fifa_code='SEN'), '2026-06-12 23:00:00+00', 'SCHEDULED'),
('GROUP','B',3, (SELECT id FROM teams WHERE fifa_code='MEX'), (SELECT id FROM teams WHERE fifa_code='NED'), '2026-06-16 19:00:00+00', 'SCHEDULED'),
('GROUP','B',4, (SELECT id FROM teams WHERE fifa_code='ECU'), (SELECT id FROM teams WHERE fifa_code='SEN'), '2026-06-16 23:00:00+00', 'SCHEDULED'),
('GROUP','B',5, (SELECT id FROM teams WHERE fifa_code='MEX'), (SELECT id FROM teams WHERE fifa_code='SEN'), '2026-06-20 23:00:00+00', 'SCHEDULED'),
('GROUP','B',6, (SELECT id FROM teams WHERE fifa_code='ECU'), (SELECT id FROM teams WHERE fifa_code='NED'), '2026-06-20 23:00:00+00', 'SCHEDULED'),

-- Grupo C: ARG, CHI, AUS, ALG
('GROUP','C',1, (SELECT id FROM teams WHERE fifa_code='ARG'), (SELECT id FROM teams WHERE fifa_code='CHI'), '2026-06-13 02:00:00+00', 'SCHEDULED'),
('GROUP','C',2, (SELECT id FROM teams WHERE fifa_code='AUS'), (SELECT id FROM teams WHERE fifa_code='ALG'), '2026-06-13 19:00:00+00', 'SCHEDULED'),
('GROUP','C',3, (SELECT id FROM teams WHERE fifa_code='ARG'), (SELECT id FROM teams WHERE fifa_code='AUS'), '2026-06-17 02:00:00+00', 'SCHEDULED'),
('GROUP','C',4, (SELECT id FROM teams WHERE fifa_code='CHI'), (SELECT id FROM teams WHERE fifa_code='ALG'), '2026-06-17 19:00:00+00', 'SCHEDULED'),
('GROUP','C',5, (SELECT id FROM teams WHERE fifa_code='ARG'), (SELECT id FROM teams WHERE fifa_code='ALG'), '2026-06-21 23:00:00+00', 'SCHEDULED'),
('GROUP','C',6, (SELECT id FROM teams WHERE fifa_code='CHI'), (SELECT id FROM teams WHERE fifa_code='AUS'), '2026-06-21 23:00:00+00', 'SCHEDULED'),

-- Grupo D: BRA, PER, GER, TUN
('GROUP','D',1, (SELECT id FROM teams WHERE fifa_code='BRA'), (SELECT id FROM teams WHERE fifa_code='PER'), '2026-06-13 23:00:00+00', 'SCHEDULED'),
('GROUP','D',2, (SELECT id FROM teams WHERE fifa_code='GER'), (SELECT id FROM teams WHERE fifa_code='TUN'), '2026-06-14 02:00:00+00', 'SCHEDULED'),
('GROUP','D',3, (SELECT id FROM teams WHERE fifa_code='BRA'), (SELECT id FROM teams WHERE fifa_code='GER'), '2026-06-18 02:00:00+00', 'SCHEDULED'),
('GROUP','D',4, (SELECT id FROM teams WHERE fifa_code='PER'), (SELECT id FROM teams WHERE fifa_code='TUN'), '2026-06-18 19:00:00+00', 'SCHEDULED'),
('GROUP','D',5, (SELECT id FROM teams WHERE fifa_code='BRA'), (SELECT id FROM teams WHERE fifa_code='TUN'), '2026-06-22 23:00:00+00', 'SCHEDULED'),
('GROUP','D',6, (SELECT id FROM teams WHERE fifa_code='PER'), (SELECT id FROM teams WHERE fifa_code='GER'), '2026-06-22 23:00:00+00', 'SCHEDULED'),

-- Grupo E: CAN, HON, BEL, ROU
('GROUP','E',1, (SELECT id FROM teams WHERE fifa_code='CAN'), (SELECT id FROM teams WHERE fifa_code='HON'), '2026-06-14 19:00:00+00', 'SCHEDULED'),
('GROUP','E',2, (SELECT id FROM teams WHERE fifa_code='BEL'), (SELECT id FROM teams WHERE fifa_code='ROU'), '2026-06-14 23:00:00+00', 'SCHEDULED'),
('GROUP','E',3, (SELECT id FROM teams WHERE fifa_code='CAN'), (SELECT id FROM teams WHERE fifa_code='BEL'), '2026-06-18 23:00:00+00', 'SCHEDULED'),
('GROUP','E',4, (SELECT id FROM teams WHERE fifa_code='HON'), (SELECT id FROM teams WHERE fifa_code='ROU'), '2026-06-19 02:00:00+00', 'SCHEDULED'),
('GROUP','E',5, (SELECT id FROM teams WHERE fifa_code='CAN'), (SELECT id FROM teams WHERE fifa_code='ROU'), '2026-06-23 23:00:00+00', 'SCHEDULED'),
('GROUP','E',6, (SELECT id FROM teams WHERE fifa_code='HON'), (SELECT id FROM teams WHERE fifa_code='BEL'), '2026-06-23 23:00:00+00', 'SCHEDULED'),

-- Grupo F: ESP, URU, JPN, TOG
('GROUP','F',1, (SELECT id FROM teams WHERE fifa_code='ESP'), (SELECT id FROM teams WHERE fifa_code='URU'), '2026-06-15 02:00:00+00', 'SCHEDULED'),
('GROUP','F',2, (SELECT id FROM teams WHERE fifa_code='JPN'), (SELECT id FROM teams WHERE fifa_code='TOG'), '2026-06-15 19:00:00+00', 'SCHEDULED'),
('GROUP','F',3, (SELECT id FROM teams WHERE fifa_code='ESP'), (SELECT id FROM teams WHERE fifa_code='JPN'), '2026-06-19 19:00:00+00', 'SCHEDULED'),
('GROUP','F',4, (SELECT id FROM teams WHERE fifa_code='URU'), (SELECT id FROM teams WHERE fifa_code='TOG'), '2026-06-20 02:00:00+00', 'SCHEDULED'),
('GROUP','F',5, (SELECT id FROM teams WHERE fifa_code='ESP'), (SELECT id FROM teams WHERE fifa_code='TOG'), '2026-06-24 23:00:00+00', 'SCHEDULED'),
('GROUP','F',6, (SELECT id FROM teams WHERE fifa_code='URU'), (SELECT id FROM teams WHERE fifa_code='JPN'), '2026-06-24 23:00:00+00', 'SCHEDULED'),

-- Grupo G: POR, VEN, KOR, NZL
('GROUP','G',1, (SELECT id FROM teams WHERE fifa_code='POR'), (SELECT id FROM teams WHERE fifa_code='VEN'), '2026-06-15 23:00:00+00', 'SCHEDULED'),
('GROUP','G',2, (SELECT id FROM teams WHERE fifa_code='KOR'), (SELECT id FROM teams WHERE fifa_code='NZL'), '2026-06-16 02:00:00+00', 'SCHEDULED'),
('GROUP','G',3, (SELECT id FROM teams WHERE fifa_code='POR'), (SELECT id FROM teams WHERE fifa_code='KOR'), '2026-06-20 19:00:00+00', 'SCHEDULED'),
('GROUP','G',4, (SELECT id FROM teams WHERE fifa_code='VEN'), (SELECT id FROM teams WHERE fifa_code='NZL'), '2026-06-20 23:00:00+00', 'SCHEDULED'),
('GROUP','G',5, (SELECT id FROM teams WHERE fifa_code='POR'), (SELECT id FROM teams WHERE fifa_code='NZL'), '2026-06-25 23:00:00+00', 'SCHEDULED'),
('GROUP','G',6, (SELECT id FROM teams WHERE fifa_code='VEN'), (SELECT id FROM teams WHERE fifa_code='KOR'), '2026-06-25 23:00:00+00', 'SCHEDULED'),

-- Grupo H: FRA, COL, DEN, NGA
('GROUP','H',1, (SELECT id FROM teams WHERE fifa_code='FRA'), (SELECT id FROM teams WHERE fifa_code='COL'), '2026-06-16 19:00:00+00', 'SCHEDULED'),
('GROUP','H',2, (SELECT id FROM teams WHERE fifa_code='DEN'), (SELECT id FROM teams WHERE fifa_code='NGA'), '2026-06-16 23:00:00+00', 'SCHEDULED'),
('GROUP','H',3, (SELECT id FROM teams WHERE fifa_code='FRA'), (SELECT id FROM teams WHERE fifa_code='DEN'), '2026-06-21 02:00:00+00', 'SCHEDULED'),
('GROUP','H',4, (SELECT id FROM teams WHERE fifa_code='COL'), (SELECT id FROM teams WHERE fifa_code='NGA'), '2026-06-21 19:00:00+00', 'SCHEDULED'),
('GROUP','H',5, (SELECT id FROM teams WHERE fifa_code='FRA'), (SELECT id FROM teams WHERE fifa_code='NGA'), '2026-06-26 23:00:00+00', 'SCHEDULED'),
('GROUP','H',6, (SELECT id FROM teams WHERE fifa_code='COL'), (SELECT id FROM teams WHERE fifa_code='DEN'), '2026-06-26 23:00:00+00', 'SCHEDULED'),

-- Grupo I: ENG, BOL, SUI, IRN
('GROUP','I',1, (SELECT id FROM teams WHERE fifa_code='ENG'), (SELECT id FROM teams WHERE fifa_code='BOL'), '2026-06-17 02:00:00+00', 'SCHEDULED'),
('GROUP','I',2, (SELECT id FROM teams WHERE fifa_code='SUI'), (SELECT id FROM teams WHERE fifa_code='IRN'), '2026-06-17 19:00:00+00', 'SCHEDULED'),
('GROUP','I',3, (SELECT id FROM teams WHERE fifa_code='ENG'), (SELECT id FROM teams WHERE fifa_code='SUI'), '2026-06-21 23:00:00+00', 'SCHEDULED'),
('GROUP','I',4, (SELECT id FROM teams WHERE fifa_code='BOL'), (SELECT id FROM teams WHERE fifa_code='IRN'), '2026-06-22 02:00:00+00', 'SCHEDULED'),
('GROUP','I',5, (SELECT id FROM teams WHERE fifa_code='ENG'), (SELECT id FROM teams WHERE fifa_code='IRN'), '2026-06-27 23:00:00+00', 'SCHEDULED'),
('GROUP','I',6, (SELECT id FROM teams WHERE fifa_code='BOL'), (SELECT id FROM teams WHERE fifa_code='SUI'), '2026-06-27 23:00:00+00', 'SCHEDULED'),

-- Grupo J: ITA, PAR, CRO, SLE
('GROUP','J',1, (SELECT id FROM teams WHERE fifa_code='ITA'), (SELECT id FROM teams WHERE fifa_code='PAR'), '2026-06-17 23:00:00+00', 'SCHEDULED'),
('GROUP','J',2, (SELECT id FROM teams WHERE fifa_code='CRO'), (SELECT id FROM teams WHERE fifa_code='SLE'), '2026-06-18 02:00:00+00', 'SCHEDULED'),
('GROUP','J',3, (SELECT id FROM teams WHERE fifa_code='ITA'), (SELECT id FROM teams WHERE fifa_code='CRO'), '2026-06-22 19:00:00+00', 'SCHEDULED'),
('GROUP','J',4, (SELECT id FROM teams WHERE fifa_code='PAR'), (SELECT id FROM teams WHERE fifa_code='SLE'), '2026-06-22 23:00:00+00', 'SCHEDULED'),
('GROUP','J',5, (SELECT id FROM teams WHERE fifa_code='ITA'), (SELECT id FROM teams WHERE fifa_code='SLE'), '2026-06-28 23:00:00+00', 'SCHEDULED'),
('GROUP','J',6, (SELECT id FROM teams WHERE fifa_code='PAR'), (SELECT id FROM teams WHERE fifa_code='CRO'), '2026-06-28 23:00:00+00', 'SCHEDULED'),

-- Grupo K: MAR, CRC, POL, BEN
('GROUP','K',1, (SELECT id FROM teams WHERE fifa_code='MAR'), (SELECT id FROM teams WHERE fifa_code='CRC'), '2026-06-18 19:00:00+00', 'SCHEDULED'),
('GROUP','K',2, (SELECT id FROM teams WHERE fifa_code='POL'), (SELECT id FROM teams WHERE fifa_code='BEN'), '2026-06-18 23:00:00+00', 'SCHEDULED'),
('GROUP','K',3, (SELECT id FROM teams WHERE fifa_code='MAR'), (SELECT id FROM teams WHERE fifa_code='POL'), '2026-06-23 02:00:00+00', 'SCHEDULED'),
('GROUP','K',4, (SELECT id FROM teams WHERE fifa_code='CRC'), (SELECT id FROM teams WHERE fifa_code='BEN'), '2026-06-23 19:00:00+00', 'SCHEDULED'),
('GROUP','K',5, (SELECT id FROM teams WHERE fifa_code='MAR'), (SELECT id FROM teams WHERE fifa_code='BEN'), '2026-06-29 23:00:00+00', 'SCHEDULED'),
('GROUP','K',6, (SELECT id FROM teams WHERE fifa_code='CRC'), (SELECT id FROM teams WHERE fifa_code='POL'), '2026-06-29 23:00:00+00', 'SCHEDULED'),

-- Grupo L: KSA, UZB, BHR, COM
('GROUP','L',1, (SELECT id FROM teams WHERE fifa_code='KSA'), (SELECT id FROM teams WHERE fifa_code='UZB'), '2026-06-19 02:00:00+00', 'SCHEDULED'),
('GROUP','L',2, (SELECT id FROM teams WHERE fifa_code='BHR'), (SELECT id FROM teams WHERE fifa_code='COM'), '2026-06-19 19:00:00+00', 'SCHEDULED'),
('GROUP','L',3, (SELECT id FROM teams WHERE fifa_code='KSA'), (SELECT id FROM teams WHERE fifa_code='BHR'), '2026-06-23 23:00:00+00', 'SCHEDULED'),
('GROUP','L',4, (SELECT id FROM teams WHERE fifa_code='UZB'), (SELECT id FROM teams WHERE fifa_code='COM'), '2026-06-24 02:00:00+00', 'SCHEDULED'),
('GROUP','L',5, (SELECT id FROM teams WHERE fifa_code='KSA'), (SELECT id FROM teams WHERE fifa_code='COM'), '2026-06-30 23:00:00+00', 'SCHEDULED'),
('GROUP','L',6, (SELECT id FROM teams WHERE fifa_code='UZB'), (SELECT id FROM teams WHERE fifa_code='BHR'), '2026-06-30 23:00:00+00', 'SCHEDULED');

-- Confirmar total (deve retornar 72 jogos GROUP):
SELECT stage, group_letter, count(*) as total FROM matches GROUP BY stage, group_letter ORDER BY group_letter;
