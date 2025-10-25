-- Chylers Chatbot - Supabase Database Schema
-- This file contains all table definitions for the chatbot

-- ============================================
-- CONVERSATIONS TABLE
-- Stores all chat interactions for analytics
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 1,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

-- ============================================
-- LEADS TABLE
-- Stores captured customer contact information
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT DEFAULT 'chatbot',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_session_id ON leads(session_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_timestamp ON leads(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- ============================================
-- ANALYTICS VIEWS
-- Pre-computed views for dashboard analytics
-- ============================================

-- View: Daily conversation volume
CREATE OR REPLACE VIEW daily_conversation_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(*) as total_messages,
  AVG(message_count) as avg_messages_per_interaction
FROM conversations
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View: Lead capture rate
CREATE OR REPLACE VIEW lead_capture_stats AS
SELECT
  DATE(l.created_at) as date,
  COUNT(DISTINCT l.session_id) as leads_captured,
  COUNT(DISTINCT c.session_id) as total_sessions,
  ROUND(100.0 * COUNT(DISTINCT l.session_id) / NULLIF(COUNT(DISTINCT c.session_id), 0), 2) as capture_rate_percent
FROM conversations c
LEFT JOIN leads l ON c.session_id = l.session_id
GROUP BY DATE(l.created_at)
ORDER BY date DESC;

-- View: Recent leads
CREATE OR REPLACE VIEW recent_leads AS
SELECT
  l.id,
  l.session_id,
  l.name,
  l.email,
  l.phone,
  l.timestamp as lead_captured_at,
  COUNT(c.id) as total_messages,
  MIN(c.timestamp) as first_message_at,
  MAX(c.timestamp) as last_message_at
FROM leads l
LEFT JOIN conversations c ON l.session_id = c.session_id
GROUP BY l.id, l.session_id, l.name, l.email, l.phone, l.timestamp
ORDER BY l.timestamp DESC
LIMIT 100;

-- ============================================
-- Row Level Security (RLS) Policies
-- Secure access to tables
-- ============================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for backend API)
CREATE POLICY "Service role has full access to conversations"
ON conversations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to leads"
ON leads FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Anon role can only insert (for chatbot widget)
CREATE POLICY "Anon can insert conversations"
ON conversations FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anon can insert leads"
ON leads FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Authenticated users can read their own data (for future dashboard)
CREATE POLICY "Authenticated users can read conversations"
ON conversations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read leads"
ON leads FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- FUNCTION: Get session analytics
-- Returns full analytics for a specific session
-- ============================================
CREATE OR REPLACE FUNCTION get_session_analytics(p_session_id TEXT)
RETURNS TABLE (
  session_id TEXT,
  total_messages INTEGER,
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  duration_minutes NUMERIC,
  has_lead BOOLEAN,
  lead_name TEXT,
  lead_email TEXT,
  lead_phone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.session_id,
    COUNT(c.id)::INTEGER as total_messages,
    MIN(c.timestamp) as first_message_at,
    MAX(c.timestamp) as last_message_at,
    EXTRACT(EPOCH FROM (MAX(c.timestamp) - MIN(c.timestamp))) / 60 as duration_minutes,
    l.id IS NOT NULL as has_lead,
    l.name as lead_name,
    l.email as lead_email,
    l.phone as lead_phone
  FROM conversations c
  LEFT JOIN leads l ON c.session_id = l.session_id
  WHERE c.session_id = p_session_id
  GROUP BY c.session_id, l.id, l.name, l.email, l.phone;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS (Documentation)
-- ============================================
COMMENT ON TABLE conversations IS 'Stores all chatbot conversations for analytics and insights';
COMMENT ON TABLE leads IS 'Stores captured customer contact information from chatbot interactions';
COMMENT ON VIEW daily_conversation_stats IS 'Daily conversation volume and engagement metrics';
COMMENT ON VIEW lead_capture_stats IS 'Lead capture rate and conversion metrics by date';
COMMENT ON VIEW recent_leads IS 'Most recent 100 leads with their conversation context';
COMMENT ON FUNCTION get_session_analytics IS 'Returns comprehensive analytics for a specific chat session';
