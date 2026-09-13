import type { DatabaseSync } from "node:sqlite";

export function migrateSqlite(sqlite: DatabaseSync) {
  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL UNIQUE,
      candidate_origin TEXT NOT NULL,
      name TEXT NOT NULL,
      brand_or_handle TEXT NOT NULL,
      segment TEXT NOT NULL,
      segment_group TEXT NOT NULL,
      primary_platform_or_asset TEXT NOT NULL,
      public_profile_url TEXT NOT NULL,
      canonical_profile_url TEXT NOT NULL UNIQUE,
      contact_type TEXT NOT NULL,
      contact_source_url TEXT NOT NULL,
      contact_value_public TEXT NOT NULL,
      match_reason TEXT NOT NULL,
      owned_audience_signal TEXT NOT NULL,
      monetization_signal TEXT NOT NULL,
      ai_affinity TEXT NOT NULL,
      network_value_signal TEXT NOT NULL,
      verification_level TEXT NOT NULL,
      verified_at TEXT NOT NULL,
      funnel_status TEXT NOT NULL,
      raw_funnel_status TEXT NOT NULL,
      outreach_status TEXT NOT NULL,
      fit_score INTEGER NOT NULL,
      activation_score INTEGER NOT NULL,
      network_score INTEGER NOT NULL,
      priority_score REAL NOT NULL,
      priority TEXT NOT NULL,
      previous_fit_score REAL,
      previous_activation_score REAL,
      previous_network_score REAL,
      previous_priority_score REAL,
      discovery_source TEXT,
      risk_or_caveat TEXT,
      scoring_version TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS score_components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      score_key TEXT NOT NULL,
      score INTEGER NOT NULL,
      max_score INTEGER NOT NULL,
      initial_score INTEGER NOT NULL,
      source TEXT NOT NULL,
      evidence_scope TEXT NOT NULL,
      overridden_at TEXT,
      UNIQUE(candidate_id, score_key)
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      scope TEXT NOT NULL,
      score_key TEXT,
      url TEXT NOT NULL,
      summary TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      field TEXT,
      previous_value TEXT,
      new_value TEXT,
      reason TEXT,
      actor TEXT NOT NULL,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS discovery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      canonical_url TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      query TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      promoted_candidate_id INTEGER REFERENCES candidates(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS demo_funnel_states (
      candidate_id INTEGER PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
      simulated_status TEXT NOT NULL,
      loaded_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS candidates_priority_idx ON candidates(priority_score);
    CREATE INDEX IF NOT EXISTS candidates_segment_group_idx ON candidates(segment_group);
    CREATE INDEX IF NOT EXISTS candidates_funnel_status_idx ON candidates(funnel_status);
    CREATE INDEX IF NOT EXISTS evidence_candidate_idx ON evidence(candidate_id);
    CREATE INDEX IF NOT EXISTS audit_logs_candidate_idx ON audit_logs(candidate_id);
    CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);
  `);
}
