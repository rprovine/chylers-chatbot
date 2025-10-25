const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ConversationChain } = require('langchain/chains');
const { BufferMemory } = require('langchain/memory');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');

dotenv.config();

// Load Chylers® knowledge base
const KNOWLEDGE_BASE = fs.readFileSync(
  path.join(__dirname, 'chylers-knowledge-base.md'),
  'utf-8'
);

// Initialize Supabase client if configured
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️  Supabase not configured - conversation tracking disabled');
}

// Set LangChain tracing if API key is provided
if (process.env.LANGCHAIN_API_KEY) {
  process.env.LANGCHAIN_TRACING_V2 = 'true';
  process.env.LANGCHAIN_PROJECT = 'chylers-chatbot';
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Add helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Security: Configure CORS for Chylers® domain
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://www.chylers.com',
      'https://chylers.com',
      'https://chylers.myshopify.com',
      'https://chat.chylers.com'
    ]
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    // Allow Vercel deployment URLs
    if (origin && origin.includes('vercel.app')) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy: Origin not allowed'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security: Rate limiting to prevent abuse
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Limit reset requests
  message: 'Too many reset requests, please try again later.',
});

// Security: Limit request body size to prevent DoS
app.use(express.json({ limit: '10kb' }));

// Initialize chain lazily to ensure env vars are loaded
let chain = null;
let memory = null;

function initializeChain() {
  if (chain) return chain;

  const model = new ChatAnthropic({
    modelName: 'claude-sonnet-4-5-20250929',
    temperature: 0.7,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    maxTokens: 500,
  });

  memory = new BufferMemory({
    returnMessages: true,
    memoryKey: 'history',
  });

  const CHYLERS_SYSTEM_PROMPT = `You are Chylers®' AI shopping assistant - your mission is to help customers discover Hawaiian Beef Chips® and make it EASY for them to purchase.

## 🎯 YOUR PRIMARY GOALS

1. **Guide customers to purchase** at www.chylers.com
2. **Answer questions comprehensively** using the knowledge base below
3. **Recommend the right products** based on customer preferences
4. **Highlight value propositions**: unique texture, pricing, bulk savings, free shipping
5. **Make buying easy**: provide clear paths to purchase

**Communication Style:**
- Keep responses SHORT and conversational (2-4 sentences max)
- Be enthusiastic but helpful, not pushy
- Focus on making it easy to buy
- Always direct to www.chylers.com when customers show purchase intent

## 📚 COMPLETE KNOWLEDGE BASE

You have comprehensive, verified information from www.chylers.com:

---
${KNOWLEDGE_BASE}
---

## 🥩 KEY PRODUCT INFO (Use This!)

**4 Flavors Available:**
1. **Original** - Classic Hawaiian flavor ($14.99/pack)
2. **Spicy** - With added heat ($14.99/pack)
3. **Cracked Pepper** - Bold peppery notes ($14.99/pack)
4. **Roasted Garlic** - Savory and aromatic ($14.99/pack)

**Bulk Savings (Mention These!):**
- 3-pack: $38 (save $7!)
- 5-pack: $55 (save $20!)
- 10-pack: $105 (save $45!)
- 15-pack: $150 (save $75!)

**Free Shipping Threshold:** $49+ orders get FREE shipping!

## 🛒 MAKE IT EASY TO BUY

**When customers show interest:**
1. Ask about flavor preferences (heat level, favorite flavors)
2. Suggest appropriate pack size based on their needs
3. Mention free shipping if they're close to $49
4. Direct to www.chylers.com to complete purchase

**Value Propositions to Emphasize:**
- Unique chip-like crunch vs. chewy jerky
- Made in Hawaii, MIHA certified
- Premium US beef only
- Great bulk discounts
- Free shipping over $49
- Easy subscription option

## 📦 SHIPPING THAT SELLS

- **FREE shipping** on orders $49+
- Only $10 flat rate under $49
- USPS Priority: 1-3 business days
- Ships US-wide (including AK & HI)

**Pro tip:** If someone orders 4+ packs, they hit free shipping!

## 💬 CONVERSATION TACTICS

**Discovery Questions (Ask These):**
- "Do you prefer mild or spicy flavors?"
- "Have you tried beef chips before, or just traditional jerky?"
- "Are you buying for yourself or as a gift?"
- "How many packs are you thinking - want to hit that free shipping threshold?"

**Closing Statements (Guide to Purchase):**
- "Ready to try them? Head to www.chylers.com to order!"
- "A 5-pack gets you free shipping - want to grab a mix of flavors at www.chylers.com?"
- "You can set up a subscription at www.chylers.com if you love them!"

## 🎯 SAMPLE RESPONSES (Sales-Oriented)

**Opening:**
"Aloha! Welcome to Chylers®! We make Hawaiian Beef Chips® - thin, crispy beef with a chip-like crunch (nothing like chewy jerky!). We have 4 flavors at $14.99/pack with great bulk discounts. What sounds good to you?"

**Flavor Question:**
"We have 4 flavors: Original (classic), Spicy (heat!), Cracked Pepper (bold), and Roasted Garlic (savory). Do you like spicy or mild? I can help you pick the perfect one!"

**Pricing Question:**
"Packs are $14.99 each, but check out our bulk savings: 5-pack is $55 (save $20!) and gets you FREE SHIPPING. Visit www.chylers.com to order!"

**Story Request:**
"Love the story! In 2004, Cal and Autumn were making jerky for their daughter Chyler, but accidentally created something way better - crispy beef chips! They named it after her. You can taste that family love in every batch at www.chylers.com!"

**Ready to Buy:**
"Perfect! Head to www.chylers.com - pick your flavors, grab a multi-pack for savings, and orders over $49 ship FREE. You're going to love them!"

Remember: Your job is to help customers BUY. Provide comprehensive information, make smart recommendations, highlight value, and guide them to www.chylers.com!`;

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', CHYLERS_SYSTEM_PROMPT],
    new MessagesPlaceholder('history'),
    ['human', '{input}'],
  ]);

  chain = new ConversationChain({
    llm: model,
    memory,
    prompt,
  });

  console.log('✅ Chylers® chatbot chain initialized');
  return chain;
}

// Store conversation contexts (simple in-memory for session management)
const conversationContexts = new Map();

// Analytics tracking
const analyticsData = {
  totalConversations: 0,
  totalMessages: 0,
  conversationsByDay: {},
  productInquiries: {
    texture: 0,
    flavors: 0,
    shipping: 0,
    subscription: 0,
    general: 0
  }
};

// Server start time for uptime tracking
const serverStartTime = Date.now();

// Helper function to get or create conversation context
function getConversationContext(sessionId) {
  if (!conversationContexts.has(sessionId)) {
    conversationContexts.set(sessionId, {
      messageCount: 0,
      startTime: Date.now(),
      productInterests: []
    });
    analyticsData.totalConversations++;
  }
  return conversationContexts.get(sessionId);
}

// Helper function to track product inquiries
function trackProductInquiry(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('texture') || lowerMessage.includes('crunch') ||
      lowerMessage.includes('crispy') || lowerMessage.includes('jerky')) {
    analyticsData.productInquiries.texture++;
  }
  if (lowerMessage.includes('flavor') || lowerMessage.includes('spicy') ||
      lowerMessage.includes('original') || lowerMessage.includes('taste')) {
    analyticsData.productInquiries.flavors++;
  }
  if (lowerMessage.includes('shipping') || lowerMessage.includes('deliver') ||
      lowerMessage.includes('ship')) {
    analyticsData.productInquiries.shipping++;
  }
  if (lowerMessage.includes('subscription') || lowerMessage.includes('subscribe') ||
      lowerMessage.includes('recurring')) {
    analyticsData.productInquiries.subscription++;
  }
}

// Generate contextual quick reply suggestions
function generateQuickReplies(messageHistory, currentMessage) {
  const lowerMessage = currentMessage.toLowerCase();

  // Flavor-related conversation
  if (lowerMessage.includes('flavor') || lowerMessage.includes('taste')) {
    return [
      "What's the difference between Original and Spicy?",
      "How spicy is the Spicy flavor?",
      "Do you have a variety pack?"
    ];
  }

  // Texture/jerky comparison
  if (lowerMessage.includes('jerky') || lowerMessage.includes('texture') || lowerMessage.includes('crunch')) {
    return [
      "Tell me more about the chip-like texture",
      "What makes it different from jerky?",
      "Are they crunchy like chips?"
    ];
  }

  // Ordering/shipping
  if (lowerMessage.includes('buy') || lowerMessage.includes('order') || lowerMessage.includes('ship')) {
    return [
      "How does the free shipping work?",
      "Tell me about the subscription service",
      "What payment methods do you accept?"
    ];
  }

  // Subscription interest
  if (lowerMessage.includes('subscription') || lowerMessage.includes('subscribe')) {
    return [
      "Can I change my subscription flavors?",
      "How often would deliveries come?",
      "Can I pause my subscription?"
    ];
  }

  // Default suggestions for general conversation
  return [
    "Tell me about the flavors",
    "What makes these different from jerky?",
    "How does subscription work?",
    "Do you have free shipping?"
  ];
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'chylers-chatbot',
    uptime: Math.floor((Date.now() - serverStartTime) / 1000)
  });
});

// Test endpoint for deployment verification
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Chylers® chatbot API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Main chat endpoint
app.post('/chat', chatLimiter, async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Initialize the chain if needed
    const conversationChain = initializeChain();

    // Get or create conversation context
    const context = getConversationContext(sessionId);
    context.messageCount++;
    analyticsData.totalMessages++;

    // Track product inquiries for analytics
    trackProductInquiry(message);

    // Track by day
    const today = new Date().toISOString().split('T')[0];
    analyticsData.conversationsByDay[today] = (analyticsData.conversationsByDay[today] || 0) + 1;

    // Get AI response
    const response = await conversationChain.invoke({
      input: message,
    });

    // Check for order tracking tag and replace with actual data
    let finalResponse = response.response;
    const trackOrderPattern = /\[TRACK_ORDER:([^\]]+)\]/;
    const trackOrderMatch = finalResponse.match(trackOrderPattern);

    if (trackOrderMatch) {
      const orderNumber = trackOrderMatch[1].trim();

      console.log(`🔍 Order tracking requested: #${orderNumber}`);

      try {
        // Call the track order function directly
        const orderResult = await trackOrder(orderNumber);

        // Replace the tag with the actual order status
        finalResponse = finalResponse.replace(trackOrderPattern, orderResult.message);
        console.log(`✅ Order tracking result injected into response`);
      } catch (trackError) {
        console.error('Error tracking order:', trackError);
        // Replace with error message
        finalResponse = finalResponse.replace(
          trackOrderPattern,
          `I'm having trouble looking up that order right now. Please contact customer service at 1-800-484-1663 or BeefChips@chylers.com with your order number for assistance.`
        );
      }
    }

    // Generate contextual quick replies
    const suggestions = generateQuickReplies(context.messageCount, message);

    // Store conversation in Supabase if configured
    if (supabase) {
      try {
        await supabase.from('conversations').insert({
          session_id: sessionId,
          user_message: message,
          bot_response: finalResponse,
          timestamp: new Date().toISOString(),
          message_count: context.messageCount
        });
      } catch (dbError) {
        console.error('Error storing conversation:', dbError);
        // Don't fail the request if DB storage fails
      }
    }

    res.json({
      message: finalResponse,
      suggestions,
      sessionId
    });
  } catch (error) {
    console.error('Error processing chat:', error);
    console.error('Stack trace:', error.stack);

    res.status(500).json({
      error: 'Sorry, I encountered an error. Please try again or contact support at BeefChips@chylers.com.'
    });
  }
});

// Reset conversation endpoint
app.post('/reset', resetLimiter, (req, res) => {
  const { sessionId } = req.body;
  const contextId = sessionId || 'default';

  // Clear conversation memory
  if (memory) {
    memory.clear();
  }

  // Clear session context
  if (conversationContexts.has(contextId)) {
    conversationContexts.delete(contextId);
    console.log(`🧹 Cleared session context for: ${contextId}`);
  }

  res.json({ message: 'Conversation history cleared' });
});

// Analytics endpoint (basic stats)
app.get('/api/analytics', (req, res) => {
  const totalConversations = analyticsData.totalConversations;
  const totalMessages = analyticsData.totalMessages;
  const averageMessages = totalConversations > 0
    ? (totalMessages / totalConversations).toFixed(1)
    : 0;

  const uptimeMs = Date.now() - serverStartTime;
  const uptimeHours = (uptimeMs / (1000 * 60 * 60)).toFixed(1);

  res.json({
    summary: {
      totalConversations,
      totalMessages,
      averageMessagesPerConversation: averageMessages,
      activeConversations: conversationContexts.size,
      serverUptimeHours: uptimeHours
    },
    productInquiries: analyticsData.productInquiries,
    conversationsByDay: analyticsData.conversationsByDay
  });
});

// Helper function to track orders (shared logic)
async function trackOrder(orderNumber) {
  try {
    if (!orderNumber) {
      return { message: 'Order number is required.' };
    }

    // Check if Shopify credentials are configured
    if (!process.env.SHOPIFY_STORE_URL || !process.env.SHOPIFY_ACCESS_TOKEN) {
      console.warn('Shopify credentials not configured');
      return {
        message: `I don't have access to order tracking right now. Please contact customer service at 1-800-484-1663 or BeefChips@chylers.com with your order number ${orderNumber} for assistance.`
      };
    }

    // Call Shopify API to get order details
    const shopifyUrl = `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/orders.json?name=${orderNumber}`;

    const response = await axios.get(shopifyUrl, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN
      }
    });

    if (response.data.orders && response.data.orders.length > 0) {
      const order = response.data.orders[0];

      const fulfillmentStatus = order.fulfillment_status || 'unfulfilled';
      const financialStatus = order.financial_status || 'pending';

      let statusMessage = `Order #${orderNumber}:\n`;
      statusMessage += `Status: ${fulfillmentStatus === 'fulfilled' ? 'Shipped' : 'Processing'}\n`;
      statusMessage += `Payment: ${financialStatus}\n`;

      if (order.tracking_url) {
        statusMessage += `\nTrack your shipment: ${order.tracking_url}`;
      }

      return { message: statusMessage };
    } else {
      return {
        message: `I couldn't find order #${orderNumber}. Please double-check the order number or contact customer service at 1-800-484-1663 or BeefChips@chylers.com for help.`
      };
    }
  } catch (error) {
    console.error('Order tracking error:', error);
    return {
      message: `I'm having trouble looking up that order. Please contact customer service at 1-800-484-1663 or BeefChips@chylers.com with your order number for assistance.`
    };
  }
}

// Order tracking endpoint
app.post('/api/track-order', async (req, res) => {
  try {
    const { orderNumber } = req.body;
    const result = await trackOrder(orderNumber);
    res.json(result);
  } catch (error) {
    console.error('Order tracking error:', error);
    res.status(500).json({
      message: `I'm having trouble looking up that order. Please contact customer service at 1-800-484-1663 or BeefChips@chylers.com with your order number for assistance.`
    });
  }
});

// Lead capture endpoint
app.post('/api/capture-lead', async (req, res) => {
  try {
    const { name, email, phone, sessionId } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Store in Supabase if configured
    if (supabase) {
      try {
        await supabase.from('leads').insert({
          session_id: sessionId || 'unknown',
          name: name || null,
          email,
          phone: phone || null,
          source: 'chatbot',
          timestamp: new Date().toISOString()
        });

        console.log(`✅ Lead captured: ${email}`);
      } catch (dbError) {
        console.error('Error storing lead:', dbError);
      }
    }

    res.json({
      success: true,
      message: 'Thanks for your interest! We\'ll be in touch soon.'
    });
  } catch (error) {
    console.error('Lead capture error:', error);
    res.status(500).json({ error: 'Failed to capture lead' });
  }
});

// Get leads from Supabase
app.get('/api/leads', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get conversations from Supabase
app.get('/api/conversations', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Analytics dashboard route
app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});

app.get('/analytics.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});

// Root route - serve demo page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files
app.use(express.static('public'));

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Chylers® chatbot is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to interact with the chatbot`);
  });
}

// Export for serverless (Vercel)
module.exports = app;
