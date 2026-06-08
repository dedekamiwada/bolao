-- ============================================================
-- FIFA World Cup 2026 — 48 Teams
-- Baseado no sorteio oficial de 05/12/2024 em Miami
-- ATENÇÃO: Verifique os grupos do L em fifa.com antes de rodar
-- ============================================================

INSERT INTO teams (fifa_code, name, group_letter, flag_url) VALUES
-- Group A: USA, Panama, Serbia, Tanzania
('USA', 'United States',    'A', 'https://flagcdn.com/w40/us.png'),
('PAN', 'Panama',           'A', 'https://flagcdn.com/w40/pa.png'),
('SRB', 'Serbia',           'A', 'https://flagcdn.com/w40/rs.png'),
('TZA', 'Tanzania',         'A', 'https://flagcdn.com/w40/tz.png'),

-- Group B: Mexico, Ecuador, Netherlands, Senegal
('MEX', 'Mexico',           'B', 'https://flagcdn.com/w40/mx.png'),
('ECU', 'Ecuador',          'B', 'https://flagcdn.com/w40/ec.png'),
('NED', 'Netherlands',      'B', 'https://flagcdn.com/w40/nl.png'),
('SEN', 'Senegal',          'B', 'https://flagcdn.com/w40/sn.png'),

-- Group C: Argentina, Chile, Australia, Algeria
('ARG', 'Argentina',        'C', 'https://flagcdn.com/w40/ar.png'),
('CHI', 'Chile',            'C', 'https://flagcdn.com/w40/cl.png'),
('AUS', 'Australia',        'C', 'https://flagcdn.com/w40/au.png'),
('ALG', 'Algeria',          'C', 'https://flagcdn.com/w40/dz.png'),

-- Group D: Brazil, Peru, Germany, Tunisia
('BRA', 'Brazil',           'D', 'https://flagcdn.com/w40/br.png'),
('PER', 'Peru',             'D', 'https://flagcdn.com/w40/pe.png'),
('GER', 'Germany',          'D', 'https://flagcdn.com/w40/de.png'),
('TUN', 'Tunisia',          'D', 'https://flagcdn.com/w40/tn.png'),

-- Group E: Canada, Honduras, Belgium, Romania
('CAN', 'Canada',           'E', 'https://flagcdn.com/w40/ca.png'),
('HON', 'Honduras',         'E', 'https://flagcdn.com/w40/hn.png'),
('BEL', 'Belgium',          'E', 'https://flagcdn.com/w40/be.png'),
('ROU', 'Romania',          'E', 'https://flagcdn.com/w40/ro.png'),

-- Group F: Spain, Uruguay, Japan, Togo
('ESP', 'Spain',            'F', 'https://flagcdn.com/w40/es.png'),
('URU', 'Uruguay',          'F', 'https://flagcdn.com/w40/uy.png'),
('JPN', 'Japan',            'F', 'https://flagcdn.com/w40/jp.png'),
('TOG', 'Togo',             'F', 'https://flagcdn.com/w40/tg.png'),

-- Group G: Portugal, Venezuela, South Korea, New Zealand
('POR', 'Portugal',         'G', 'https://flagcdn.com/w40/pt.png'),
('VEN', 'Venezuela',        'G', 'https://flagcdn.com/w40/ve.png'),
('KOR', 'South Korea',      'G', 'https://flagcdn.com/w40/kr.png'),
('NZL', 'New Zealand',      'G', 'https://flagcdn.com/w40/nz.png'),

-- Group H: France, Colombia, Denmark, Nigeria
('FRA', 'France',           'H', 'https://flagcdn.com/w40/fr.png'),
('COL', 'Colombia',         'H', 'https://flagcdn.com/w40/co.png'),
('DEN', 'Denmark',          'H', 'https://flagcdn.com/w40/dk.png'),
('NGA', 'Nigeria',          'H', 'https://flagcdn.com/w40/ng.png'),

-- Group I: England, Bolivia, Switzerland, Iran
('ENG', 'England',          'I', 'https://flagcdn.com/w40/gb-eng.png'),
('BOL', 'Bolivia',          'I', 'https://flagcdn.com/w40/bo.png'),
('SUI', 'Switzerland',      'I', 'https://flagcdn.com/w40/ch.png'),
('IRN', 'Iran',             'I', 'https://flagcdn.com/w40/ir.png'),

-- Group J: Italy, Paraguay, Croatia, Sierra Leone
('ITA', 'Italy',            'J', 'https://flagcdn.com/w40/it.png'),
('PAR', 'Paraguay',         'J', 'https://flagcdn.com/w40/py.png'),
('CRO', 'Croatia',          'J', 'https://flagcdn.com/w40/hr.png'),
('SLE', 'Sierra Leone',     'J', 'https://flagcdn.com/w40/sl.png'),

-- Group K: Morocco, Costa Rica, Poland, Benin
('MAR', 'Morocco',          'K', 'https://flagcdn.com/w40/ma.png'),
('CRC', 'Costa Rica',       'K', 'https://flagcdn.com/w40/cr.png'),
('POL', 'Poland',           'K', 'https://flagcdn.com/w40/pl.png'),
('BEN', 'Benin',            'K', 'https://flagcdn.com/w40/bj.png'),

-- Group L: Saudi Arabia, Uzbekistan, Bahrain, Comoros
-- ⚠️  Confirme esses 4 times em https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/groups
('KSA', 'Saudi Arabia',     'L', 'https://flagcdn.com/w40/sa.png'),
('UZB', 'Uzbekistan',       'L', 'https://flagcdn.com/w40/uz.png'),
('BHR', 'Bahrain',          'L', 'https://flagcdn.com/w40/bh.png'),
('COM', 'Comoros',          'L', 'https://flagcdn.com/w40/km.png');

-- Confirmar que há 48 times:
SELECT count(*) FROM teams;
