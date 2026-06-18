-- ============================================================
-- Deadline Config — per-round cutoffs + per-match overrides
-- ============================================================

-- Store round-specific cutoffs in pool_config
INSERT INTO pool_config (key, value) VALUES
  ('r1_cutoff_minutes',  '15'),
  ('r23_cutoff_minutes', '10')
ON CONFLICT (key) DO NOTHING;

-- Per-match deadline overrides (admin can reopen a specific match)
CREATE TABLE match_deadline_overrides (
  match_id   INTEGER PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  close_at   TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE match_deadline_overrides ENABLE ROW LEVEL SECURITY;
-- Only service_role (admin API routes) can access this table
