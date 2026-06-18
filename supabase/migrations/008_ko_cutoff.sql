-- Add per-stage knockout cutoffs to pool_config
INSERT INTO pool_config (key, value) VALUES
  ('ko_r32_cutoff_minutes',   '15'),
  ('ko_r16_cutoff_minutes',   '15'),
  ('ko_qf_cutoff_minutes',    '15'),
  ('ko_sf_cutoff_minutes',    '15'),
  ('ko_3rd_cutoff_minutes',   '15'),
  ('ko_final_cutoff_minutes', '15')
ON CONFLICT (key) DO NOTHING;
