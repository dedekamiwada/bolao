-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_classification_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knockout_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_config ENABLE ROW LEVEL SECURITY;

-- Public read access (anon key)
CREATE POLICY "public read teams" ON teams FOR SELECT TO anon USING (true);
CREATE POLICY "public read matches" ON matches FOR SELECT TO anon USING (true);
CREATE POLICY "public read match_scores" ON match_scores FOR SELECT TO anon USING (true);
CREATE POLICY "public read ranking_snapshots" ON ranking_snapshots FOR SELECT TO anon USING (true);

-- Public read for non-sensitive config keys only
CREATE POLICY "public read pool_config" ON pool_config
  FOR SELECT TO anon
  USING (key IN ('pool_name', 'betting_cutoff_minutes', 'r16_bracket', 'last_sync'));

-- ALL other tables: no public access
-- They are only accessible via service-role key from Next.js API routes

-- Service role bypasses RLS entirely — no policies needed for service_role
