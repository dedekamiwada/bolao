-- ============================================================
-- Bolão Copa 2026 — Initial Schema
-- ============================================================

-- Teams (48 for FIFA 2026)
CREATE TABLE teams (
  id           SERIAL PRIMARY KEY,
  fifa_code    CHAR(3) NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  group_letter CHAR(1),
  flag_url     TEXT
);

-- Matches (48 group stage + 16 knockout = 64 total)
CREATE TABLE matches (
  id                  SERIAL PRIMARY KEY,
  external_id         INTEGER UNIQUE,
  stage               TEXT NOT NULL CHECK (stage IN ('GROUP','R16','QF','SF','3RD','FINAL')),
  group_letter        CHAR(1),
  match_number        INTEGER NOT NULL,
  home_team_id        INTEGER REFERENCES teams(id),
  away_team_id        INTEGER REFERENCES teams(id),
  scheduled_at        TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL DEFAULT 'SCHEDULED'
                      CHECK (status IN ('SCHEDULED','LIVE','FINISHED','POSTPONED')),
  home_score          INTEGER,
  away_score          INTEGER,
  home_score_et       INTEGER,
  away_score_et       INTEGER,
  winner_team_id      INTEGER REFERENCES teams(id),
  result_confirmed_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_matches_stage ON matches(stage);
CREATE INDEX idx_matches_scheduled_at ON matches(scheduled_at);
CREATE INDEX idx_matches_status ON matches(status);

-- Participants
CREATE TABLE participants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_participants_token_hash ON participants(token_hash);

-- Group Stage Predictions
CREATE TABLE group_predictions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  match_id       INTEGER NOT NULL REFERENCES matches(id),
  home_score     INTEGER NOT NULL CHECK (home_score >= 0),
  away_score     INTEGER NOT NULL CHECK (away_score >= 0),
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_locked      BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (participant_id, match_id)
);

CREATE INDEX idx_group_preds_participant ON group_predictions(participant_id);

-- Group Classification Predictions (auto-computed from group simulation)
CREATE TABLE group_classification_predictions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  group_letter   CHAR(1) NOT NULL,
  position       INTEGER NOT NULL CHECK (position BETWEEN 1 AND 4),
  team_id        INTEGER NOT NULL REFERENCES teams(id),
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_locked      BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (participant_id, group_letter, position)
);

-- Knockout Predictions
CREATE TABLE knockout_predictions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  match_id       INTEGER NOT NULL REFERENCES matches(id),
  home_team_id   INTEGER REFERENCES teams(id),
  away_team_id   INTEGER REFERENCES teams(id),
  home_score     INTEGER CHECK (home_score >= 0),
  away_score     INTEGER CHECK (away_score >= 0),
  winner_team_id INTEGER REFERENCES teams(id),
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_locked      BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (participant_id, match_id)
);

CREATE INDEX idx_knockout_preds_participant ON knockout_predictions(participant_id);

-- Match Scores (computed, one row per participant per match)
CREATE TABLE match_scores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id        UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  match_id              INTEGER NOT NULL REFERENCES matches(id),
  points_exact_score    INTEGER NOT NULL DEFAULT 0,
  points_result         INTEGER NOT NULL DEFAULT 0,
  points_goal_diff      INTEGER NOT NULL DEFAULT 0,
  points_classification INTEGER NOT NULL DEFAULT 0,
  total_points          INTEGER NOT NULL DEFAULT 0,
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_id, match_id)
);

CREATE INDEX idx_match_scores_participant ON match_scores(participant_id);

-- Daily Ranking Snapshots (for evolution chart)
CREATE TABLE ranking_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  total_points    INTEGER NOT NULL DEFAULT 0,
  exact_scores    INTEGER NOT NULL DEFAULT 0,
  correct_results INTEGER NOT NULL DEFAULT 0,
  rank_position   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_id, snapshot_date)
);

CREATE INDEX idx_ranking_snapshots_date ON ranking_snapshots(snapshot_date);

-- Pool Configuration
CREATE TABLE pool_config (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Seed default config
INSERT INTO pool_config (key, value) VALUES
  ('pool_name',             '"Bolão Copa 2026"'),
  ('betting_cutoff_minutes', '15'),
  ('last_sync',             'null'),
  ('r16_bracket',           '[
    {"slot":1,"homeSource":"1A","awaySource":"2B"},
    {"slot":2,"homeSource":"1C","awaySource":"2D"},
    {"slot":3,"homeSource":"1E","awaySource":"2F"},
    {"slot":4,"homeSource":"1G","awaySource":"2H"},
    {"slot":5,"homeSource":"1I","awaySource":"2J"},
    {"slot":6,"homeSource":"1K","awaySource":"2L"},
    {"slot":7,"homeSource":"1B","awaySource":"2A"},
    {"slot":8,"homeSource":"1D","awaySource":"2C"},
    {"slot":9,"homeSource":"1F","awaySource":"2E"},
    {"slot":10,"homeSource":"1H","awaySource":"2G"},
    {"slot":11,"homeSource":"1J","awaySource":"2I"},
    {"slot":12,"homeSource":"1L","awaySource":"2K"},
    {"slot":13,"homeSource":"3BEST1","awaySource":"3BEST2"},
    {"slot":14,"homeSource":"3BEST3","awaySource":"3BEST4"},
    {"slot":15,"homeSource":"3BEST5","awaySource":"3BEST6"},
    {"slot":16,"homeSource":"3BEST7","awaySource":"3BEST8"}
  ]');

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER group_preds_updated_at
  BEFORE UPDATE ON group_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER knockout_preds_updated_at
  BEFORE UPDATE ON knockout_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
