PRAGMA foreign_keys=ON;
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS absences(
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES users(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  absence_type TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),
  reported_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(end_date >= start_date)
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS cover_slots(
  id TEXT PRIMARY KEY,
  absence_id TEXT NOT NULL REFERENCES absences(id) ON DELETE CASCADE,
  cover_date TEXT NOT NULL,
  period INTEGER NOT NULL CHECK(period BETWEEN 1 AND 8),
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  room TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','assigned','cancelled','completed')),
  assigned_user_id TEXT REFERENCES users(id),
  assigned_by TEXT REFERENCES users(id),
  assigned_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(absence_id,cover_date,period)
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS cover_applications(
  id TEXT PRIMARY KEY,
  cover_slot_id TEXT NOT NULL REFERENCES cover_slots(id) ON DELETE CASCADE,
  applicant_id TEXT NOT NULL REFERENCES users(id),
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','declined','withdrawn')),
  decided_by TEXT REFERENCES users(id),
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cover_slot_id,applicant_id)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(start_date,end_date,status);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_absences_staff ON absences(staff_id,start_date,end_date);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_cover_slots_day ON cover_slots(cover_date,period,status);
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_cover_unique_assignment ON cover_slots(cover_date,period,assigned_user_id) WHERE assigned_user_id IS NOT NULL AND status='assigned';
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_cover_applications_slot ON cover_applications(cover_slot_id,status,created_at);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_cover_applications_staff ON cover_applications(applicant_id,status);
-- statement-breakpoint
PRAGMA optimize;
