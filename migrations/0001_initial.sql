PRAGMA foreign_keys=ON;
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS departments(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,active INTEGER NOT NULL DEFAULT 1);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,full_name TEXT NOT NULL,role TEXT NOT NULL,department_id TEXT REFERENCES departments(id),job_title TEXT NOT NULL,phone TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS notices(id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,category TEXT NOT NULL,priority TEXT NOT NULL,publish_at TEXT NOT NULL,expires_at TEXT,event_at TEXT,acknowledgement_required INTEGER NOT NULL DEFAULT 0,author_id TEXT NOT NULL REFERENCES users(id),status TEXT NOT NULL DEFAULT 'published',attachments TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS staff_posts(id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,post_type TEXT NOT NULL,tags TEXT NOT NULL DEFAULT '',author_id TEXT NOT NULL REFERENCES users(id),resolved INTEGER NOT NULL DEFAULT 0,resolved_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS staff_replies(id TEXT PRIMARY KEY,post_id TEXT NOT NULL REFERENCES staff_posts(id) ON DELETE CASCADE,author_id TEXT NOT NULL REFERENCES users(id),body TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,edited_at TEXT);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',start_at TEXT NOT NULL,end_at TEXT NOT NULL,all_day INTEGER NOT NULL DEFAULT 0,location TEXT,category TEXT NOT NULL,organizer_id TEXT REFERENCES users(id),related_notice_id TEXT REFERENCES notices(id),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',category TEXT NOT NULL,department_id TEXT REFERENCES departments(id),file_url TEXT,external_url TEXT,version TEXT,effective_date TEXT,pinned INTEGER NOT NULL DEFAULT 0,acknowledgement_required INTEGER NOT NULL DEFAULT 0,updated_by TEXT REFERENCES users(id),updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS quick_links(id TEXT PRIMARY KEY,label TEXT NOT NULL,url TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',category TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS audiences(id TEXT PRIMARY KEY,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,audience_type TEXT NOT NULL,audience_value TEXT);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS acknowledgements(id TEXT PRIMARY KEY,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),acknowledged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(entity_type,entity_id,user_id));
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),type TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,title TEXT NOT NULL,read_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS dismissals(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,entity_type,entity_id));
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS audit_logs(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,metadata TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_notices_active ON notices(status,publish_at,expires_at);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_audiences_entity ON audiences(entity_type,entity_id);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_posts_open ON staff_posts(resolved,created_at);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_at);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_ack_entity ON acknowledgements(entity_type,entity_id);
