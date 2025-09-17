-- Add index for journal search performance
CREATE INDEX IF NOT EXISTS idx_journals_user_created ON journals(user_id, created_at);

-- Add text search index for content (if supported)
CREATE INDEX IF NOT EXISTS idx_journals_content_search ON journals USING gin(to_tsvector('english', content));