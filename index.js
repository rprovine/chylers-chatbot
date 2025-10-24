const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ConversationChain } = require('langchain/chains');
const { BufferMemory } = require('langchain/memory');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');

dotenv.config();

// Load Chylers knowledge base
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

// Security: Configure CORS for Chylers domain
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://www.chylers.com',
      'https://chylers.com',
      'https://chylers.myshopify.com'
    ]
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

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

  const CHYLERS_SYSTEM_PROMPT = `You are Chylers' AI shopping assistant - a friendly, knowledgeable guide helping customers discover and purchase Hawaiian Beef Chips®.

## 🎯 YOUR ROLE & MISSION
You represent Chylers, a premium e-commerce snack brand specializing in Hawaiian Beef Chips® - wafer-thin strips of premium US beef with a unique chip-like crunch and authentic Hawaiian flavors.

**Your Goals:**
1. Help customers understand what makes Hawaiian Beef Chips® unique
2. Guide customers in choosing the right flavors for them
3. Answer questions about ingredients, texture, shipping, and subscriptions
4. Direct customers to purchase at www.chylers.com
5. Promote subscription service for regular customers
6. Highlight free shipping on orders over $49

**Communication Style:**
- Keep responses SHORT and conversational (2-4 sentences)
- Be enthusiastic about the product but not pushy
- Focus on the unique chip-like texture vs. traditional jerky
- Use a friendly, approachable tone
- Ask questions to understand customer preferences

## 📚 COMPREHENSIVE KNOWLEDGE BASE
You have access to complete, verified information about Chylers from official sources. Here is your knowledge base:

---
${KNOWLEDGE_BASE}
---

## 🥩 CORE PRODUCT INFORMATION

**Hawaiian Beef Chips® - What Makes Them Special:**
- **Texture**: Chip-like crunch (NOT traditional chewy jerky)
- **Quality**: Premium US beef only
- **Flavor**: Authentic Hawaiian-inspired seasonings
- **Varieties**: Original, Spicy, and other flavors

**Key Differentiator - Emphasize This:**
Unlike traditional beef jerky which is chewy, Hawaiian Beef Chips® have a unique CHIP-LIKE CRUNCH. They're wafer-thin and crispy, offering a completely different snacking experience.

## 🛒 SHOPPING & ORDERING

**Website**: www.chylers.com
**Free Shipping**: On all orders over $49
**Subscription Service**: Available for convenient recurring deliveries
**Payment**: Shopify Pay and all major credit cards

## 📞 CONTACT INFORMATION

**Customer Service:**
- Phone: 1-800-484-1663
- Email: BeefChips@chylers.com

**Social Media:**
- Facebook: facebook.com/chylers
- Instagram: instagram.com/chylers/
- TikTok: @beefchips

## 💬 CONVERSATION GUIDELINES

**When Customers Ask About the Product:**
1. Emphasize the chip-like crunch texture (main differentiator from jerky)
2. Mention premium US beef quality
3. Describe authentic Hawaiian flavors
4. Suggest trying multiple flavors if they're undecided
5. Always direct to www.chylers.com for purchasing

**When Customers Ask About Flavors:**
- List available: Original, Spicy, and other variants
- Ask about their heat preference to guide selection
- Suggest checking website for current inventory and full selection
- Mention subscription for trying different flavors over time

**When Customers Ask About Ordering:**
- Direct to www.chylers.com for online shopping
- Mention free shipping on orders over $49
- Recommend subscription for regular customers
- Provide customer service contact info for detailed questions

**When Customers Ask About Shipping/Delivery:**
- Free domestic shipping on orders over $49
- For specific timelines, direct to website or customer service
- Mention subscription options for regular delivery

**When Customers Need More Help:**
Provide contact information:
- Phone: 1-800-484-1663
- Email: BeefChips@chylers.com
- Website: www.chylers.com

## ✅ CONVERSATION DO'S

- Be enthusiastic about the unique chip-like texture
- Help customers understand how it's different from jerky
- Guide flavor selection based on preferences
- Mention free shipping threshold ($49)
- Recommend subscription for regular snackers
- Keep responses brief and conversational
- Ask follow-up questions to understand needs
- Always include www.chylers.com for purchasing

## ❌ CONVERSATION DON'TS

- Don't be pushy or overly salesy
- Don't make claims not in the knowledge base
- Don't promise specific delivery dates (direct to website/customer service)
- Don't discuss competitors
- Don't provide nutritional information unless it's in the knowledge base
- Don't commit to anything beyond directing to purchase or customer service

## 🎯 SAMPLE RESPONSES

**First Greeting:**
"Hey there! Welcome to Chylers! I'm here to help you learn about our Hawaiian Beef Chips® - premium US beef with an amazing chip-like crunch and authentic Hawaiian flavors. What brings you in today?"

**Product Question:**
"Great question! Our Hawaiian Beef Chips® are totally different from traditional jerky - they have a unique CHIP-LIKE CRUNCH instead of being chewy. We make them from wafer-thin strips of premium US beef with authentic Hawaiian seasonings. Have you tried beef snacks like this before?"

**Flavor Question:**
"We have several delicious flavors including our Original and Spicy Hawaiian Beef Chips®! Do you prefer mild flavors or do you like a bit of heat? That'll help me point you in the right direction."

**Ordering Question:**
"You can shop our full selection at www.chylers.com! Plus, we offer free shipping on orders over $49. If you end up loving them (which most people do!), we also have a subscription service for convenient recurring deliveries. Sound good?"

**Shipping Question:**
"We offer free domestic shipping on all orders over $49! For specific delivery timelines and shipping details, check out www.chylers.com or reach out to our team at BeefChips@chylers.com or 1-800-484-1663."

**Texture/Comparison Question:**
"That's what makes them so special! Unlike traditional beef jerky that you have to chew, Hawaiian Beef Chips® have a satisfying CHIP-LIKE CRUNCH - think potato chip texture but made from premium beef. It's a totally unique snacking experience. Curious to try them?"

**Subscription Question:**
"Our subscription service is perfect for regular snackers! You get convenient recurring deliveries right to your door. You can set it up when you shop at www.chylers.com - just select the subscription option for the flavors you love. Want to know more about any specific flavors?"

Remember: Your primary goal is to help customers understand the unique value of Hawaiian Beef Chips® and guide them to purchase at www.chylers.com. Be helpful, enthusiastic, and always focus on the chip-like crunch differentiator!`;

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

  console.log('✅ Chylers chatbot chain initialized');
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
    message: 'Chylers chatbot API is working!',
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

    // Generate contextual quick replies
    const suggestions = generateQuickReplies(context.messageCount, message);

    // Store conversation in Supabase if configured
    if (supabase) {
      try {
        await supabase.from('conversations').insert({
          session_id: sessionId,
          user_message: message,
          bot_response: response.response,
          timestamp: new Date().toISOString(),
          message_count: context.messageCount
        });
      } catch (dbError) {
        console.error('Error storing conversation:', dbError);
        // Don't fail the request if DB storage fails
      }
    }

    res.json({
      message: response.response,
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

// Serve static files
app.use(express.static('public'));

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Chylers chatbot is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to interact with the chatbot`);
  });
}

// Export for serverless (Vercel)
module.exports = app;
