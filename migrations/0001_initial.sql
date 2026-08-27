CREATE TABLE IF NOT EXISTS departments(id text PRIMARY KEY,name text NOT NULL UNIQUE,active integer NOT NULL DEFAULT 1);

CREATE TABLE IF NOT EXISTS users(id text PRIMARY KEY,email text NOT NULL UNIQUE,password_hash text NOT NULL,full_name text NOT NULL,role text NOT NULL,department_id text REFERENCES departments(id),job_title text NOT NULL,phone text,active integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS notices(id text PRIMARY KEY,title text NOT NULL,body text NOT NULL,category text NOT NULL,priority text NOT NULL,publish_at timestamptz NOT NULL,expires_at timestamptz,event_at timestamptz,acknowledgement_required integer NOT NULL DEFAULT 0,author_id text NOT NULL REFERENCES users(id),status text NOT NULL DEFAULT 'published',attachments text NOT NULL DEFAULT '[]',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS staff_posts(id text PRIMARY KEY,title text NOT NULL,body text NOT NULL,post_type text NOT NULL,tags text NOT NULL DEFAULT '',author_id text NOT NULL REFERENCES users(id),resolved integer NOT NULL DEFAULT 0,resolved_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS staff_replies(id text PRIMARY KEY,post_id text NOT NULL REFERENCES staff_posts(id) ON DELETE CASCADE,author_id text NOT NULL REFERENCES users(id),body text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),edited_at timestamptz);

CREATE TABLE IF NOT EXISTS events(id text PRIMARY KEY,title text NOT NULL,description text NOT NULL DEFAULT '',start_at timestamptz NOT NULL,end_at timestamptz NOT NULL,all_day integer NOT NULL DEFAULT 0,location text,category text NOT NULL,organizer_id text REFERENCES users(id),related_notice_id text REFERENCES notices(id),created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS documents(id text PRIMARY KEY,title text NOT NULL,description text NOT NULL DEFAULT '',category text NOT NULL,department_id text REFERENCES departments(id),file_url text,external_url text,version text,effective_date date,pinned integer NOT NULL DEFAULT 0,acknowledgement_required integer NOT NULL DEFAULT 0,updated_by text REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS quick_links(id text PRIMARY KEY,label text NOT NULL,url text NOT NULL,description text NOT NULL DEFAULT '',category text NOT NULL,sort_order integer NOT NULL DEFAULT 0,active integer NOT NULL DEFAULT 1);

CREATE TABLE IF NOT EXISTS audiences(id text PRIMARY KEY,entity_type text NOT NULL,entity_id text NOT NULL,audience_type text NOT NULL,audience_value text);

CREATE TABLE IF NOT EXISTS acknowledgements(id text PRIMARY KEY,entity_type text NOT NULL,entity_id text NOT NULL,user_id text NOT NULL REFERENCES users(id),acknowledged_at timestamptz NOT NULL DEFAULT now(),UNIQUE(entity_type,entity_id,user_id));

CREATE TABLE IF NOT EXISTS notifications(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),type text NOT NULL,entity_type text NOT NULL,entity_id text NOT NULL,title text NOT NULL,read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS dismissals(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),entity_type text NOT NULL,entity_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,entity_type,entity_id));

CREATE TABLE IF NOT EXISTS audit_logs(id text PRIMARY KEY,actor_id text NOT NULL REFERENCES users(id),action text NOT NULL,entity_type text NOT NULL,entity_id text NOT NULL,metadata text NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());

CREATE INDEX IF NOT EXISTS idx_notices_active ON notices(status,publish_at,expires_at);
CREATE INDEX IF NOT EXISTS idx_audiences_entity ON audiences(entity_type,entity_id);
CREATE INDEX IF NOT EXISTS idx_posts_open ON staff_posts(resolved,created_at);
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_at);
CREATE INDEX IF NOT EXISTS idx_ack_entity ON acknowledgements(entity_type,entity_id);
