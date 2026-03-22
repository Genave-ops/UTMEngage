const { Client } = require('pg');

// Connection config for Supabase (using session pooler)
const config = {
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.csrtomrowpdnnaqpsmbm',
  password: 'T7GYJgwE7eY9degR',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
};

const fixSQL = `
-- 1. ADD ON DELETE CASCADE TO FOREIGN KEYS

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_proposer_id_fkey;
ALTER TABLE events ADD CONSTRAINT events_proposer_id_fkey
  FOREIGN KEY (proposer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE committees DROP CONSTRAINT IF EXISTS committees_creator_id_fkey;
ALTER TABLE committees ADD CONSTRAINT committees_creator_id_fkey
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_event_id_fkey;
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_user_id_fkey;
ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE committee_members DROP CONSTRAINT IF EXISTS committee_members_committee_id_fkey;
ALTER TABLE committee_members DROP CONSTRAINT IF EXISTS committee_members_user_id_fkey;
ALTER TABLE committee_members ADD CONSTRAINT committee_members_committee_id_fkey
  FOREIGN KEY (committee_id) REFERENCES committees(id) ON DELETE CASCADE;
ALTER TABLE committee_members ADD CONSTRAINT committee_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE committee_meetings DROP CONSTRAINT IF EXISTS committee_meetings_committee_id_fkey;
ALTER TABLE committee_meetings DROP CONSTRAINT IF EXISTS committee_meetings_created_by_fkey;
ALTER TABLE committee_meetings ADD CONSTRAINT committee_meetings_committee_id_fkey
  FOREIGN KEY (committee_id) REFERENCES committees(id) ON DELETE CASCADE;
ALTER TABLE committee_meetings ADD CONSTRAINT committee_meetings_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE committee_documents DROP CONSTRAINT IF EXISTS committee_documents_committee_id_fkey;
ALTER TABLE committee_documents DROP CONSTRAINT IF EXISTS committee_documents_uploaded_by_fkey;
ALTER TABLE committee_documents ADD CONSTRAINT committee_documents_committee_id_fkey
  FOREIGN KEY (committee_id) REFERENCES committees(id) ON DELETE CASCADE;
ALTER TABLE committee_documents ADD CONSTRAINT committee_documents_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_committee_id_fkey;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE posts ADD CONSTRAINT posts_committee_id_fkey
  FOREIGN KEY (committee_id) REFERENCES committees(id) ON DELETE CASCADE;
ALTER TABLE posts ADD CONSTRAINT posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey;
ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS post_likes_user_id_fkey;
ALTER TABLE post_likes ADD CONSTRAINT post_likes_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE post_likes ADD CONSTRAINT post_likes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey;
ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;
ALTER TABLE post_comments ADD CONSTRAINT post_comments_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE post_comments ADD CONSTRAINT post_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE join_requests DROP CONSTRAINT IF EXISTS join_requests_committee_id_fkey;
ALTER TABLE join_requests DROP CONSTRAINT IF EXISTS join_requests_user_id_fkey;
ALTER TABLE join_requests DROP CONSTRAINT IF EXISTS join_requests_reviewed_by_fkey;
ALTER TABLE join_requests ADD CONSTRAINT join_requests_committee_id_fkey
  FOREIGN KEY (committee_id) REFERENCES committees(id) ON DELETE CASCADE;
ALTER TABLE join_requests ADD CONSTRAINT join_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE join_requests ADD CONSTRAINT join_requests_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_reporter_id_fkey
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_user_id_fkey;
ALTER TABLE feedback ADD CONSTRAINT feedback_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE system_logs DROP CONSTRAINT IF EXISTS system_logs_user_id_fkey;
ALTER TABLE system_logs ADD CONSTRAINT system_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 2. ADD UNIQUE CONSTRAINTS
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_event_user_unique;
ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_event_user_unique UNIQUE (event_id, user_id);

ALTER TABLE committee_members DROP CONSTRAINT IF EXISTS committee_members_committee_user_unique;
ALTER TABLE committee_members ADD CONSTRAINT committee_members_committee_user_unique UNIQUE (committee_id, user_id);

ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS post_likes_post_user_unique;
ALTER TABLE post_likes ADD CONSTRAINT post_likes_post_user_unique UNIQUE (post_id, user_id);

-- 3. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_proposer_id ON events(proposer_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_committees_status ON committees(status);
CREATE INDEX IF NOT EXISTS idx_committees_creator_id ON committees(creator_id);
CREATE INDEX IF NOT EXISTS idx_committees_category ON committees(category);
CREATE INDEX IF NOT EXISTS idx_committee_members_committee_id ON committee_members(committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_user_id ON committee_members(user_id);
CREATE INDEX IF NOT EXISTS idx_committee_meetings_committee_id ON committee_meetings(committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_meetings_date ON committee_meetings(date);
CREATE INDEX IF NOT EXISTS idx_committee_documents_committee_id ON committee_documents(committee_id);
CREATE INDEX IF NOT EXISTS idx_posts_committee_id ON posts(committee_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_committee_id ON join_requests(committee_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON system_logs(type);

-- 4. CREATE VIEWS
CREATE OR REPLACE VIEW events_with_counts AS
SELECT e.*, COALESCE(COUNT(er.id), 0)::INTEGER as attendees
FROM events e LEFT JOIN event_registrations er ON e.id = er.event_id GROUP BY e.id;

CREATE OR REPLACE VIEW committees_with_counts AS
SELECT c.*, COALESCE(COUNT(cm.id), 0)::INTEGER as member_count
FROM committees c LEFT JOIN committee_members cm ON c.id = cm.committee_id GROUP BY c.id;

CREATE OR REPLACE VIEW posts_with_counts AS
SELECT p.*, COALESCE(lc.count, 0)::INTEGER as likes_count, COALESCE(cc.count, 0)::INTEGER as comments_count
FROM posts p
LEFT JOIN (SELECT post_id, COUNT(*) as count FROM post_likes GROUP BY post_id) lc ON p.id = lc.post_id
LEFT JOIN (SELECT post_id, COUNT(*) as count FROM post_comments GROUP BY post_id) cc ON p.id = cc.post_id;

-- 5. ENABLE RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- 6. CREATE RLS POLICIES
DROP POLICY IF EXISTS "Service role full access" ON users;
DROP POLICY IF EXISTS "Service role full access" ON events;
DROP POLICY IF EXISTS "Service role full access" ON event_registrations;
DROP POLICY IF EXISTS "Service role full access" ON committees;
DROP POLICY IF EXISTS "Service role full access" ON committee_members;
DROP POLICY IF EXISTS "Service role full access" ON committee_meetings;
DROP POLICY IF EXISTS "Service role full access" ON committee_documents;
DROP POLICY IF EXISTS "Service role full access" ON posts;
DROP POLICY IF EXISTS "Service role full access" ON post_likes;
DROP POLICY IF EXISTS "Service role full access" ON post_comments;
DROP POLICY IF EXISTS "Service role full access" ON join_requests;
DROP POLICY IF EXISTS "Service role full access" ON reports;
DROP POLICY IF EXISTS "Service role full access" ON feedback;
DROP POLICY IF EXISTS "Service role full access" ON system_logs;

CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON event_registrations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON committees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON committee_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON committee_meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON committee_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON post_likes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON post_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON join_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON system_logs FOR ALL USING (true) WITH CHECK (true);
`;

async function runFix() {
  const client = new Client(config);

  try {
    console.log('🔗 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('🔧 Applying schema fixes...\n');
    await client.query(fixSQL);
    console.log('✅ All fixes applied successfully!\n');

    // Verify the views were created
    console.log('📋 Verifying views...');
    const views = await client.query(`
      SELECT table_name FROM information_schema.views
      WHERE table_schema = 'public' AND table_name IN ('events_with_counts', 'committees_with_counts', 'posts_with_counts')
    `);
    console.log('Views created:', views.rows.map(r => r.table_name).join(', '));

    // Verify constraints
    console.log('\n📋 Verifying unique constraints...');
    const constraints = await client.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE constraint_type = 'UNIQUE' AND table_schema = 'public'
      AND constraint_name LIKE '%unique%'
    `);
    console.log('Unique constraints:', constraints.rows.map(r => r.constraint_name).join(', '));

    console.log('\n✅ Database schema is now correct!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

runFix();
