# Chylers Chatbot - Supabase Setup Guide

This guide will walk you through setting up Supabase for the Chylers chatbot with lead capture and analytics.

## Step 1: Create New Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: `chylers-chatbot` (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., `US West`)
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to initialize

## Step 2: Run the Database Schema

1. In your Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste it into the SQL editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. You should see: `Success. No rows returned`

This creates:
- ✅ `conversations` table (stores all chat messages)
- ✅ `leads` table (stores captured customer info)
- ✅ Analytics views for dashboards
- ✅ Row-level security policies
- ✅ Helper functions for session analytics

## Step 3: Get Your Credentials

1. In Supabase, click **"Settings"** (⚙️ icon) in the left sidebar
2. Click **"API"** under Project Settings
3. You'll see two important values:

### Project URL
```
https://xxxxxxxxxxxxx.supabase.co
```
**Copy this entire URL**

### API Keys
Look for **"anon public"** key (NOT the service_role key):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFz...
```
**Copy this entire key**

## Step 4: What You Get

### Lead Capture
- Automatically stores customer emails, names, phone numbers
- Tracks which chat session led to each lead
- Source attribution (all marked as 'chatbot')

### Analytics
- **Daily Stats**: Track conversation volume day-by-day
- **Lead Capture Rate**: See what % of visitors become leads
- **Session Analytics**: View full conversation history per session
- **Message Count**: Track engagement levels

### Database Tables

#### conversations
```
- id: Unique identifier
- session_id: Links all messages in a conversation
- user_message: What the customer said
- bot_response: What the chatbot replied
- message_count: Which message # in the conversation
- timestamp: When it happened
```

#### leads
```
- id: Unique identifier
- session_id: Links back to conversation
- name: Customer name (optional)
- email: Customer email (required)
- phone: Customer phone (optional)
- source: Where they came from (always 'chatbot')
- timestamp: When lead was captured
```

### Pre-built Analytics Views

#### daily_conversation_stats
See daily metrics:
- Unique chat sessions
- Total messages
- Average messages per session

#### lead_capture_stats
See conversion metrics:
- Leads captured per day
- Total sessions
- Capture rate percentage

#### recent_leads
View last 100 leads with:
- Contact info
- Message count
- First and last message times

## Step 5: Verify Setup

Run this query in SQL Editor to test:

```sql
-- Should return empty but not error
SELECT * FROM conversations LIMIT 5;
SELECT * FROM leads LIMIT 5;

-- Check views exist
SELECT * FROM daily_conversation_stats LIMIT 1;
SELECT * FROM lead_capture_stats LIMIT 1;
SELECT * FROM recent_leads LIMIT 1;
```

## Next Steps

Once you have your credentials:
1. Paste them in chat (I'll add them to Vercel)
2. I'll deploy the updated chatbot
3. Lead capture and analytics will be live!

## Accessing Your Data

### Via SQL Editor
Go to **SQL Editor** and run queries:
```sql
-- See all leads
SELECT * FROM leads ORDER BY timestamp DESC;

-- See recent conversations
SELECT * FROM conversations ORDER BY timestamp DESC LIMIT 20;

-- Get session analytics
SELECT * FROM get_session_analytics('session-id-here');
```

### Via Table Editor
Go to **Table Editor** → Select `leads` or `conversations` → View/edit data in spreadsheet format

### Export Data
1. Run any query in SQL Editor
2. Click **"Download CSV"** button
3. Open in Excel/Google Sheets

---

## Ready?

Paste your credentials here:

```
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

And I'll configure everything!
