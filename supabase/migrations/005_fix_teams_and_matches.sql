-- ============================================================
-- CORREÇÃO COMPLETA: Times e Jogos da Copa 2026
-- Fonte: ESPN + NBC Sports (dados oficiais)
-- Apaga dados anteriores e reinsere corretamente
-- ATENÇÃO: Isso apaga todos os palpites existentes!
-- ============================================================

-- Limpar tudo (cascade apaga predictions, match_scores etc.)
TRUNCATE matches CASCADE;
TRUNCATE teams CASCADE;

-- ============================================================
-- 48 TIMES CORRETOS
-- ============================================================
INSERT INTO teams (fifa_code, name, group_letter, flag_url) VALUES
-- Grupo A: México, Coreia do Sul, África do Sul, Tchéquia
('MEX', 'México',          'A', 'https://flagcdn.com/w40/mx.png'),
('KOR', 'Coreia do Sul',   'A', 'https://flagcdn.com/w40/kr.png'),
('RSA', 'África do Sul',   'A', 'https://flagcdn.com/w40/za.png'),
('CZE', 'Tchéquia',        'A', 'https://flagcdn.com/w40/cz.png'),

-- Grupo B: Canadá, Bósnia, Qatar, Suíça
('CAN', 'Canadá',          'B', 'https://flagcdn.com/w40/ca.png'),
('BIH', 'Bósnia-Herz.',    'B', 'https://flagcdn.com/w40/ba.png'),
('QAT', 'Qatar',           'B', 'https://flagcdn.com/w40/qa.png'),
('SUI', 'Suíça',           'B', 'https://flagcdn.com/w40/ch.png'),

-- Grupo C: Brasil, Marrocos, Haiti, Escócia
('BRA', 'Brasil',          'C', 'https://flagcdn.com/w40/br.png'),
('MAR', 'Marrocos',        'C', 'https://flagcdn.com/w40/ma.png'),
('HAI', 'Haiti',           'C', 'https://flagcdn.com/w40/ht.png'),
('SCO', 'Escócia',         'C', 'https://flagcdn.com/w40/gb-sct.png'),

-- Grupo D: EUA, Paraguai, Austrália, Turquia
('USA', 'Estados Unidos',  'D', 'https://flagcdn.com/w40/us.png'),
('PAR', 'Paraguai',        'D', 'https://flagcdn.com/w40/py.png'),
('AUS', 'Austrália',       'D', 'https://flagcdn.com/w40/au.png'),
('TUR', 'Turquia',         'D', 'https://flagcdn.com/w40/tr.png'),

-- Grupo E: Alemanha, Curaçao, Costa do Marfim, Equador
('GER', 'Alemanha',        'E', 'https://flagcdn.com/w40/de.png'),
('CUW', 'Curaçao',         'E', 'https://flagcdn.com/w40/cw.png'),
('CIV', 'Costa do Marfim', 'E', 'https://flagcdn.com/w40/ci.png'),
('ECU', 'Equador',         'E', 'https://flagcdn.com/w40/ec.png'),

-- Grupo F: Holanda, Japão, Suécia, Tunísia
('NED', 'Holanda',         'F', 'https://flagcdn.com/w40/nl.png'),
('JPN', 'Japão',           'F', 'https://flagcdn.com/w40/jp.png'),
('SWE', 'Suécia',          'F', 'https://flagcdn.com/w40/se.png'),
('TUN', 'Tunísia',         'F', 'https://flagcdn.com/w40/tn.png'),

-- Grupo G: Bélgica, Egito, Irã, Nova Zelândia
('BEL', 'Bélgica',         'G', 'https://flagcdn.com/w40/be.png'),
('EGY', 'Egito',           'G', 'https://flagcdn.com/w40/eg.png'),
('IRN', 'Irã',             'G', 'https://flagcdn.com/w40/ir.png'),
('NZL', 'Nova Zelândia',   'G', 'https://flagcdn.com/w40/nz.png'),

-- Grupo H: Espanha, Cabo Verde, Arábia Saudita, Uruguai
('ESP', 'Espanha',         'H', 'https://flagcdn.com/w40/es.png'),
('CPV', 'Cabo Verde',      'H', 'https://flagcdn.com/w40/cv.png'),
('KSA', 'Arábia Saudita',  'H', 'https://flagcdn.com/w40/sa.png'),
('URU', 'Uruguai',         'H', 'https://flagcdn.com/w40/uy.png'),

-- Grupo I: França, Senegal, Iraque, Noruega
('FRA', 'França',          'I', 'https://flagcdn.com/w40/fr.png'),
('SEN', 'Senegal',         'I', 'https://flagcdn.com/w40/sn.png'),
('IRQ', 'Iraque',          'I', 'https://flagcdn.com/w40/iq.png'),
('NOR', 'Noruega',         'I', 'https://flagcdn.com/w40/no.png'),

-- Grupo J: Argentina, Argélia, Áustria, Jordânia
('ARG', 'Argentina',       'J', 'https://flagcdn.com/w40/ar.png'),
('ALG', 'Argélia',         'J', 'https://flagcdn.com/w40/dz.png'),
('AUT', 'Áustria',         'J', 'https://flagcdn.com/w40/at.png'),
('JOR', 'Jordânia',        'J', 'https://flagcdn.com/w40/jo.png'),

-- Grupo K: Portugal, Congo DR, Uzbequistão, Colômbia
('POR', 'Portugal',        'K', 'https://flagcdn.com/w40/pt.png'),
('COD', 'Congo DR',        'K', 'https://flagcdn.com/w40/cd.png'),
('UZB', 'Uzbequistão',     'K', 'https://flagcdn.com/w40/uz.png'),
('COL', 'Colômbia',        'K', 'https://flagcdn.com/w40/co.png'),

-- Grupo L: Inglaterra, Croácia, Gana, Panamá
('ENG', 'Inglaterra',      'L', 'https://flagcdn.com/w40/gb-eng.png'),
('CRO', 'Croácia',         'L', 'https://flagcdn.com/w40/hr.png'),
('GHA', 'Gana',            'L', 'https://flagcdn.com/w40/gh.png'),
('PAN', 'Panamá',          'L', 'https://flagcdn.com/w40/pa.png');

-- ============================================================
-- 72 JOGOS DA FASE DE GRUPOS (horários em UTC)
-- Fonte: ESPN schedule (ET = UTC-4 em junho)
-- ============================================================

-- GRUPO A: México, Coreia do Sul, África do Sul, Tchéquia
INSERT INTO matches (stage, group_letter, match_number, home_team_id, away_team_id, scheduled_at, status) VALUES
('GROUP','A',1,  (SELECT id FROM teams WHERE fifa_code='MEX'), (SELECT id FROM teams WHERE fifa_code='RSA'), '2026-06-11 19:00:00+00', 'SCHEDULED'),
('GROUP','A',2,  (SELECT id FROM teams WHERE fifa_code='KOR'), (SELECT id FROM teams WHERE fifa_code='CZE'), '2026-06-12 02:00:00+00', 'SCHEDULED'),
('GROUP','A',3,  (SELECT id FROM teams WHERE fifa_code='CZE'), (SELECT id FROM teams WHERE fifa_code='RSA'), '2026-06-18 16:00:00+00', 'SCHEDULED'),
('GROUP','A',4,  (SELECT id FROM teams WHERE fifa_code='MEX'), (SELECT id FROM teams WHERE fifa_code='KOR'), '2026-06-19 03:00:00+00', 'SCHEDULED'),
('GROUP','A',5,  (SELECT id FROM teams WHERE fifa_code='CZE'), (SELECT id FROM teams WHERE fifa_code='MEX'), '2026-06-25 01:00:00+00', 'SCHEDULED'),
('GROUP','A',6,  (SELECT id FROM teams WHERE fifa_code='RSA'), (SELECT id FROM teams WHERE fifa_code='KOR'), '2026-06-25 01:00:00+00', 'SCHEDULED'),

-- GRUPO B: Canadá, Bósnia, Qatar, Suíça
('GROUP','B',1,  (SELECT id FROM teams WHERE fifa_code='CAN'), (SELECT id FROM teams WHERE fifa_code='BIH'), '2026-06-12 19:00:00+00', 'SCHEDULED'),
('GROUP','B',2,  (SELECT id FROM teams WHERE fifa_code='QAT'), (SELECT id FROM teams WHERE fifa_code='SUI'), '2026-06-13 19:00:00+00', 'SCHEDULED'),
('GROUP','B',3,  (SELECT id FROM teams WHERE fifa_code='SUI'), (SELECT id FROM teams WHERE fifa_code='BIH'), '2026-06-18 19:00:00+00', 'SCHEDULED'),
('GROUP','B',4,  (SELECT id FROM teams WHERE fifa_code='CAN'), (SELECT id FROM teams WHERE fifa_code='QAT'), '2026-06-18 22:00:00+00', 'SCHEDULED'),
('GROUP','B',5,  (SELECT id FROM teams WHERE fifa_code='SUI'), (SELECT id FROM teams WHERE fifa_code='CAN'), '2026-06-24 19:00:00+00', 'SCHEDULED'),
('GROUP','B',6,  (SELECT id FROM teams WHERE fifa_code='BIH'), (SELECT id FROM teams WHERE fifa_code='QAT'), '2026-06-24 19:00:00+00', 'SCHEDULED'),

-- GRUPO C: Brasil, Marrocos, Haiti, Escócia
('GROUP','C',1,  (SELECT id FROM teams WHERE fifa_code='BRA'), (SELECT id FROM teams WHERE fifa_code='MAR'), '2026-06-13 22:00:00+00', 'SCHEDULED'),
('GROUP','C',2,  (SELECT id FROM teams WHERE fifa_code='HAI'), (SELECT id FROM teams WHERE fifa_code='SCO'), '2026-06-14 01:00:00+00', 'SCHEDULED'),
('GROUP','C',3,  (SELECT id FROM teams WHERE fifa_code='SCO'), (SELECT id FROM teams WHERE fifa_code='MAR'), '2026-06-19 22:00:00+00', 'SCHEDULED'),
('GROUP','C',4,  (SELECT id FROM teams WHERE fifa_code='BRA'), (SELECT id FROM teams WHERE fifa_code='HAI'), '2026-06-20 01:00:00+00', 'SCHEDULED'),
('GROUP','C',5,  (SELECT id FROM teams WHERE fifa_code='SCO'), (SELECT id FROM teams WHERE fifa_code='BRA'), '2026-06-24 22:00:00+00', 'SCHEDULED'),
('GROUP','C',6,  (SELECT id FROM teams WHERE fifa_code='MAR'), (SELECT id FROM teams WHERE fifa_code='HAI'), '2026-06-24 22:00:00+00', 'SCHEDULED'),

-- GRUPO D: EUA, Paraguai, Austrália, Turquia
('GROUP','D',1,  (SELECT id FROM teams WHERE fifa_code='USA'), (SELECT id FROM teams WHERE fifa_code='PAR'), '2026-06-13 01:00:00+00', 'SCHEDULED'),
('GROUP','D',2,  (SELECT id FROM teams WHERE fifa_code='AUS'), (SELECT id FROM teams WHERE fifa_code='TUR'), '2026-06-14 04:00:00+00', 'SCHEDULED'),
('GROUP','D',3,  (SELECT id FROM teams WHERE fifa_code='USA'), (SELECT id FROM teams WHERE fifa_code='AUS'), '2026-06-19 19:00:00+00', 'SCHEDULED'),
('GROUP','D',4,  (SELECT id FROM teams WHERE fifa_code='TUR'), (SELECT id FROM teams WHERE fifa_code='PAR'), '2026-06-20 04:00:00+00', 'SCHEDULED'),
('GROUP','D',5,  (SELECT id FROM teams WHERE fifa_code='TUR'), (SELECT id FROM teams WHERE fifa_code='USA'), '2026-06-26 02:00:00+00', 'SCHEDULED'),
('GROUP','D',6,  (SELECT id FROM teams WHERE fifa_code='PAR'), (SELECT id FROM teams WHERE fifa_code='AUS'), '2026-06-26 02:00:00+00', 'SCHEDULED'),

-- GRUPO E: Alemanha, Curaçao, Costa do Marfim, Equador
('GROUP','E',1,  (SELECT id FROM teams WHERE fifa_code='GER'), (SELECT id FROM teams WHERE fifa_code='CUW'), '2026-06-14 17:00:00+00', 'SCHEDULED'),
('GROUP','E',2,  (SELECT id FROM teams WHERE fifa_code='CIV'), (SELECT id FROM teams WHERE fifa_code='ECU'), '2026-06-14 23:00:00+00', 'SCHEDULED'),
('GROUP','E',3,  (SELECT id FROM teams WHERE fifa_code='GER'), (SELECT id FROM teams WHERE fifa_code='CIV'), '2026-06-20 20:00:00+00', 'SCHEDULED'),
('GROUP','E',4,  (SELECT id FROM teams WHERE fifa_code='ECU'), (SELECT id FROM teams WHERE fifa_code='CUW'), '2026-06-21 00:00:00+00', 'SCHEDULED'),
('GROUP','E',5,  (SELECT id FROM teams WHERE fifa_code='ECU'), (SELECT id FROM teams WHERE fifa_code='GER'), '2026-06-25 20:00:00+00', 'SCHEDULED'),
('GROUP','E',6,  (SELECT id FROM teams WHERE fifa_code='CUW'), (SELECT id FROM teams WHERE fifa_code='CIV'), '2026-06-25 20:00:00+00', 'SCHEDULED'),

-- GRUPO F: Holanda, Japão, Suécia, Tunísia
('GROUP','F',1,  (SELECT id FROM teams WHERE fifa_code='NED'), (SELECT id FROM teams WHERE fifa_code='JPN'), '2026-06-14 20:00:00+00', 'SCHEDULED'),
('GROUP','F',2,  (SELECT id FROM teams WHERE fifa_code='SWE'), (SELECT id FROM teams WHERE fifa_code='TUN'), '2026-06-15 02:00:00+00', 'SCHEDULED'),
('GROUP','F',3,  (SELECT id FROM teams WHERE fifa_code='NED'), (SELECT id FROM teams WHERE fifa_code='SWE'), '2026-06-20 17:00:00+00', 'SCHEDULED'),
('GROUP','F',4,  (SELECT id FROM teams WHERE fifa_code='TUN'), (SELECT id FROM teams WHERE fifa_code='JPN'), '2026-06-21 04:00:00+00', 'SCHEDULED'),
('GROUP','F',5,  (SELECT id FROM teams WHERE fifa_code='JPN'), (SELECT id FROM teams WHERE fifa_code='SWE'), '2026-06-25 23:00:00+00', 'SCHEDULED'),
('GROUP','F',6,  (SELECT id FROM teams WHERE fifa_code='TUN'), (SELECT id FROM teams WHERE fifa_code='NED'), '2026-06-25 23:00:00+00', 'SCHEDULED'),

-- GRUPO G: Bélgica, Egito, Irã, Nova Zelândia
('GROUP','G',1,  (SELECT id FROM teams WHERE fifa_code='BEL'), (SELECT id FROM teams WHERE fifa_code='EGY'), '2026-06-15 22:00:00+00', 'SCHEDULED'),
('GROUP','G',2,  (SELECT id FROM teams WHERE fifa_code='IRN'), (SELECT id FROM teams WHERE fifa_code='NZL'), '2026-06-16 04:00:00+00', 'SCHEDULED'),
('GROUP','G',3,  (SELECT id FROM teams WHERE fifa_code='BEL'), (SELECT id FROM teams WHERE fifa_code='IRN'), '2026-06-21 19:00:00+00', 'SCHEDULED'),
('GROUP','G',4,  (SELECT id FROM teams WHERE fifa_code='NZL'), (SELECT id FROM teams WHERE fifa_code='EGY'), '2026-06-22 01:00:00+00', 'SCHEDULED'),
('GROUP','G',5,  (SELECT id FROM teams WHERE fifa_code='EGY'), (SELECT id FROM teams WHERE fifa_code='IRN'), '2026-06-27 03:00:00+00', 'SCHEDULED'),
('GROUP','G',6,  (SELECT id FROM teams WHERE fifa_code='NZL'), (SELECT id FROM teams WHERE fifa_code='BEL'), '2026-06-27 03:00:00+00', 'SCHEDULED'),

-- GRUPO H: Espanha, Cabo Verde, Arábia Saudita, Uruguai
('GROUP','H',1,  (SELECT id FROM teams WHERE fifa_code='ESP'), (SELECT id FROM teams WHERE fifa_code='CPV'), '2026-06-15 17:00:00+00', 'SCHEDULED'),
('GROUP','H',2,  (SELECT id FROM teams WHERE fifa_code='KSA'), (SELECT id FROM teams WHERE fifa_code='URU'), '2026-06-15 22:00:00+00', 'SCHEDULED'),
('GROUP','H',3,  (SELECT id FROM teams WHERE fifa_code='ESP'), (SELECT id FROM teams WHERE fifa_code='KSA'), '2026-06-21 16:00:00+00', 'SCHEDULED'),
('GROUP','H',4,  (SELECT id FROM teams WHERE fifa_code='URU'), (SELECT id FROM teams WHERE fifa_code='CPV'), '2026-06-21 22:00:00+00', 'SCHEDULED'),
('GROUP','H',5,  (SELECT id FROM teams WHERE fifa_code='CPV'), (SELECT id FROM teams WHERE fifa_code='KSA'), '2026-06-27 00:00:00+00', 'SCHEDULED'),
('GROUP','H',6,  (SELECT id FROM teams WHERE fifa_code='URU'), (SELECT id FROM teams WHERE fifa_code='ESP'), '2026-06-27 00:00:00+00', 'SCHEDULED'),

-- GRUPO I: França, Senegal, Iraque, Noruega
('GROUP','I',1,  (SELECT id FROM teams WHERE fifa_code='FRA'), (SELECT id FROM teams WHERE fifa_code='SEN'), '2026-06-16 19:00:00+00', 'SCHEDULED'),
('GROUP','I',2,  (SELECT id FROM teams WHERE fifa_code='IRQ'), (SELECT id FROM teams WHERE fifa_code='NOR'), '2026-06-16 22:00:00+00', 'SCHEDULED'),
('GROUP','I',3,  (SELECT id FROM teams WHERE fifa_code='FRA'), (SELECT id FROM teams WHERE fifa_code='IRQ'), '2026-06-22 21:00:00+00', 'SCHEDULED'),
('GROUP','I',4,  (SELECT id FROM teams WHERE fifa_code='NOR'), (SELECT id FROM teams WHERE fifa_code='SEN'), '2026-06-23 00:00:00+00', 'SCHEDULED'),
('GROUP','I',5,  (SELECT id FROM teams WHERE fifa_code='NOR'), (SELECT id FROM teams WHERE fifa_code='FRA'), '2026-06-26 19:00:00+00', 'SCHEDULED'),
('GROUP','I',6,  (SELECT id FROM teams WHERE fifa_code='SEN'), (SELECT id FROM teams WHERE fifa_code='IRQ'), '2026-06-26 19:00:00+00', 'SCHEDULED'),

-- GRUPO J: Argentina, Argélia, Áustria, Jordânia
('GROUP','J',1,  (SELECT id FROM teams WHERE fifa_code='ARG'), (SELECT id FROM teams WHERE fifa_code='ALG'), '2026-06-17 01:00:00+00', 'SCHEDULED'),
('GROUP','J',2,  (SELECT id FROM teams WHERE fifa_code='AUT'), (SELECT id FROM teams WHERE fifa_code='JOR'), '2026-06-17 04:00:00+00', 'SCHEDULED'),
('GROUP','J',3,  (SELECT id FROM teams WHERE fifa_code='ARG'), (SELECT id FROM teams WHERE fifa_code='AUT'), '2026-06-22 17:00:00+00', 'SCHEDULED'),
('GROUP','J',4,  (SELECT id FROM teams WHERE fifa_code='JOR'), (SELECT id FROM teams WHERE fifa_code='ALG'), '2026-06-23 03:00:00+00', 'SCHEDULED'),
('GROUP','J',5,  (SELECT id FROM teams WHERE fifa_code='ALG'), (SELECT id FROM teams WHERE fifa_code='AUT'), '2026-06-28 02:00:00+00', 'SCHEDULED'),
('GROUP','J',6,  (SELECT id FROM teams WHERE fifa_code='JOR'), (SELECT id FROM teams WHERE fifa_code='ARG'), '2026-06-28 02:00:00+00', 'SCHEDULED'),

-- GRUPO K: Portugal, Congo DR, Uzbequistão, Colômbia
('GROUP','K',1,  (SELECT id FROM teams WHERE fifa_code='POR'), (SELECT id FROM teams WHERE fifa_code='COD'), '2026-06-17 17:00:00+00', 'SCHEDULED'),
('GROUP','K',2,  (SELECT id FROM teams WHERE fifa_code='UZB'), (SELECT id FROM teams WHERE fifa_code='COL'), '2026-06-18 02:00:00+00', 'SCHEDULED'),
('GROUP','K',3,  (SELECT id FROM teams WHERE fifa_code='POR'), (SELECT id FROM teams WHERE fifa_code='UZB'), '2026-06-23 17:00:00+00', 'SCHEDULED'),
('GROUP','K',4,  (SELECT id FROM teams WHERE fifa_code='COL'), (SELECT id FROM teams WHERE fifa_code='COD'), '2026-06-24 02:00:00+00', 'SCHEDULED'),
('GROUP','K',5,  (SELECT id FROM teams WHERE fifa_code='COL'), (SELECT id FROM teams WHERE fifa_code='POR'), '2026-06-27 23:30:00+00', 'SCHEDULED'),
('GROUP','K',6,  (SELECT id FROM teams WHERE fifa_code='COD'), (SELECT id FROM teams WHERE fifa_code='UZB'), '2026-06-27 23:30:00+00', 'SCHEDULED'),

-- GRUPO L: Inglaterra, Croácia, Gana, Panamá
('GROUP','L',1,  (SELECT id FROM teams WHERE fifa_code='ENG'), (SELECT id FROM teams WHERE fifa_code='CRO'), '2026-06-17 20:00:00+00', 'SCHEDULED'),
('GROUP','L',2,  (SELECT id FROM teams WHERE fifa_code='GHA'), (SELECT id FROM teams WHERE fifa_code='PAN'), '2026-06-17 23:00:00+00', 'SCHEDULED'),
('GROUP','L',3,  (SELECT id FROM teams WHERE fifa_code='ENG'), (SELECT id FROM teams WHERE fifa_code='GHA'), '2026-06-23 20:00:00+00', 'SCHEDULED'),
('GROUP','L',4,  (SELECT id FROM teams WHERE fifa_code='PAN'), (SELECT id FROM teams WHERE fifa_code='CRO'), '2026-06-23 23:00:00+00', 'SCHEDULED'),
('GROUP','L',5,  (SELECT id FROM teams WHERE fifa_code='PAN'), (SELECT id FROM teams WHERE fifa_code='ENG'), '2026-06-27 21:00:00+00', 'SCHEDULED'),
('GROUP','L',6,  (SELECT id FROM teams WHERE fifa_code='CRO'), (SELECT id FROM teams WHERE fifa_code='GHA'), '2026-06-27 21:00:00+00', 'SCHEDULED');

-- Verificar: deve retornar 48 times e 72 jogos GROUP
SELECT 'times' as tipo, count(*) FROM teams
UNION ALL
SELECT 'jogos' as tipo, count(*) FROM matches WHERE stage = 'GROUP';
