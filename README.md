# Chylers® Chatbot

AI-powered customer support chatbot for Hawaiian Beef Chips® built with Claude Sonnet 4.5, LangChain, and Express.

🔗 **Live at**: https://chat.chylers.com

## Features

- 🤖 **AI-Powered Responses** - Claude Sonnet 4.5 with comprehensive product knowledge
- 📦 **Shopify Order Tracking** - Real-time order status lookup
- 🎯 **Lead Capture** - Automatic email/phone collection
- 📊 **Analytics** - Conversation tracking and engagement metrics
- 🎨 **Beautiful Widget** - Embeddable chat widget with Chylers branding
- 🌐 **Full Markdown Support** - Rich text formatting in responses

## Tech Stack

- **Backend**: Node.js + Express
- **AI**: Anthropic Claude Sonnet 4.5 via LangChain
- **Database**: Supabase (PostgreSQL)
- **E-commerce**: Shopify Admin API
- **Hosting**: Vercel (Serverless)
- **Frontend**: Vanilla JavaScript widget

## Project Structure

```
chylers-chatbot/
├── index.js                          # Main Express server + API endpoints
├── chylers-knowledge-base.md         # Complete product knowledge base
├── supabase-schema.sql               # Database schema with analytics
├── public/
│   ├── chylers-chatbot-widget.js     # Embeddable chat widget
│   ├── widget-demo.html              # Demo page
│   ├── index.html                    # Landing page
│   └── favicon.svg                   # Chylers logo
├── vercel.json                       # Vercel deployment config
├── package.json                      # Dependencies
├── SUPABASE-SETUP.md                 # Supabase setup guide
└── README.md                         # This file
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file:

```bash
# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Supabase (Optional - for analytics)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Shopify (Optional - for order tracking)
SHOPIFY_STORE_URL=chylers.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
```

### 3. Run Locally

```bash
npm run dev
```

Visit http://localhost:3000

### 4. Deploy to Vercel

```bash
npm run deploy
```

## API Endpoints

### POST /api/chat
Main chat endpoint - sends message to AI and returns response

**Request:**
```json
{
  "message": "What flavors do you have?",
  "sessionId": "uuid-here"
}
```

**Response:**
```json
{
  "message": "We have 4 delicious flavors...",
  "suggestions": ["Original", "Spicy", "Cracked Pepper", "Roasted Garlic"]
}
```

### POST /api/track-order
Shopify order status lookup (also integrated into chat)

**Note:** Order tracking is now automatically detected in the chat flow. When users ask about order status, the bot prompts for order number and looks it up directly.

**Request:**
```json
{
  "orderNumber": "IG0016028"
}
```

**Response:**
```json
{
  "message": "Order #IG0016028:\nStatus: Shipped\nPayment: paid\n\nTrack: https://..."
}
```

**Features:**
- Deterministic detection (bypasses AI for instant response)
- Only requires order number (email no longer needed)
- Searches Shopify orders with and without # prefix
- Graceful fallback if Shopify not configured

### POST /api/capture-lead
Store customer contact information

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "808-555-1234",
  "sessionId": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thanks for your interest! We'll be in touch soon."
}
```

### POST /api/clear-history
Clear conversation memory for a session

**Request:**
```json
{
  "sessionId": "uuid-here"
}
```

## Widget Integration

Add to any website with one line:

```html
<script src="https://chat.chylers.com/chylers-chatbot-widget.js"></script>
```

The widget automatically:
- Appears in bottom-right corner
- Shows 6 quick-start buttons
- Captures leads during conversation
- Supports order tracking
- Fully responsive (desktop + mobile)

## Knowledge Base

The chatbot knows everything about:
- Company story (Cal & Autumn, 2004)
- All 4 flavors with detailed descriptions
- Pricing ($14.99/pack, bulk discounts)
- Shipping (free over $49, USPS Priority)
- Returns (15-day policy)
- Contact information
- FAQs

See `chylers-knowledge-base.md` for full details.

## Database Schema

### conversations
Stores all chat interactions:
- `session_id` - Links messages in a conversation
- `user_message` - Customer input
- `bot_response` - AI response
- `message_count` - Message # in conversation
- `timestamp` - When it occurred

### leads
Stores captured customer info:
- `session_id` - Links to conversation
- `name` - Customer name (optional)
- `email` - Customer email (required)
- `phone` - Customer phone (optional)
- `source` - Always 'chatbot'
- `timestamp` - When captured

### Analytics Views
- `daily_conversation_stats` - Daily volume metrics
- `lead_capture_stats` - Conversion rates
- `recent_leads` - Last 100 leads with context

See `supabase-schema.sql` for complete schema.

## Environment Setup

### Required
- `ANTHROPIC_API_KEY` - Get from https://console.anthropic.com

### Optional (Analytics)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key

Without Supabase, chatbot works but doesn't store data.

### Optional (Order Tracking)
- `SHOPIFY_STORE_URL` - Your myshopify.com domain
- `SHOPIFY_ACCESS_TOKEN` - Admin API access token

**Note:** Environment variables are automatically cleaned to remove escape sequences, quotes, and newlines. This ensures compatibility with various deployment platforms.

Without Shopify, order tracking gracefully falls back.

## Quick Replies

The widget shows 6 shortcut buttons:
1. 🥩 **Our Products** - Learn about Hawaiian Beef Chips®
2. 🌶️ **Flavors** - Explore all 4 flavors
3. ❤️ **Our Story** - The Chylers founding story
4. 🚚 **Shipping** - Shipping details
5. 📦 **Order Status** - Track your order
6. 🛒 **Order Now** - Purchase assistance

## Sales Focus

The chatbot is optimized for conversions:
- Highlights free shipping threshold ($49)
- Emphasizes bulk savings
- Provides direct purchase links
- Asks discovery questions
- Closes with clear CTAs

## Development

```bash
# Install dependencies
npm install

# Run dev server with auto-reload
npm run dev

# Deploy to production
npm run deploy
```

## Support

For issues or questions:
- **Email**: BeefChips@chylers.com
- **Phone**: 1-800-484-1663
- **Website**: www.chylers.com

---

Built with ❤️ for Chylers® Hawaiian Beef Chips®
