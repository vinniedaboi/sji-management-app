CREATE TABLE IF NOT EXISTS absences(
  id text PRIMARY KEY,
  staff_id text NOT NULL REFERENCES users(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  absence_type text NOT NULL,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),
  reported_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS cover_slots(
  id text PRIMARY KEY,
  absence_id text NOT NULL REFERENCES absences(id) ON DELETE CASCADE,
  cover_date date NOT NULL,
  period integer NOT NULL CHECK(period BETWEEN 1 AND 8),
  class_name text NOT NULL,
  subject text NOT NULL,
  room text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','assigned','cancelled','completed')),
  assigned_user_id text REFERENCES users(id),
  assigned_by text REFERENCES users(id),
  assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(absence_id,cover_date,period)
);

CREATE TABLE IF NOT EXISTS cover_applications(
  id text PRIMARY KEY,
  cover_slot_id text NOT NULL REFERENCES cover_slots(id) ON DELETE CASCADE,
  applicant_id text NOT NULL REFERENCES users(id),
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','declined','withdrawn')),
  decided_by text REFERENCES users(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cover_slot_id,applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(start_date,end_date,status);
CREATE INDEX IF NOT EXISTS idx_absences_staff ON absences(staff_id,start_date,end_date);
CREATE INDEX IF NOT EXISTS idx_cover_slots_day ON cover_slots(cover_date,period,status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cover_unique_assignment ON cover_slots(cover_date,period,assigned_user_id) WHERE assigned_user_id IS NOT NULL AND status='assigned';
CREATE INDEX IF NOT EXISTS idx_cover_applications_slot ON cover_applications(cover_slot_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_cover_applications_staff ON cover_applications(applicant_id,status);
