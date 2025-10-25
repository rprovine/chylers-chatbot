const axios = require('axios');
require('dotenv').config();

const cleanEnvVar = (value) => {
  if (!value) return value;
  return value.replace(/\\n/g, '').replace(/^["']|["']$/g, '').trim();
};

const SHOPIFY_STORE_URL = cleanEnvVar(process.env.SHOPIFY_STORE_URL);
const SHOPIFY_ACCESS_TOKEN = cleanEnvVar(process.env.SHOPIFY_ACCESS_TOKEN);

const shopify = axios.create({
  baseURL: `https://${SHOPIFY_STORE_URL}/admin/api/2024-01`,
  headers: {
    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json'
  }
});

async function findShopifyChat() {
  console.log('🔍 Searching for Shopify chat code in theme.liquid...\n');

  const themesResponse = await shopify.get('/themes.json');
  const activeTheme = themesResponse.data.themes.find(t => t.role === 'main');

  const assetResponse = await shopify.get(`/themes/${activeTheme.id}/assets.json`, {
    params: { 'asset[key]': 'layout/theme.liquid' }
  });

  const themeContent = assetResponse.data.asset.value;
  const lines = themeContent.split('\n');

  // Search for common Shopify chat patterns
  const chatKeywords = ['shopify-chat', 'shop-chat', 'inbox', 'messenger', 'chat-bubble'];

  console.log('Lines containing potential chat code:\n');

  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    if (chatKeywords.some(keyword => lowerLine.includes(keyword))) {
      console.log(`Line ${index + 1}:`);
      console.log(line.trim());
      console.log('');
    }
  });

  // Also look for any {% section %} or {% render %} tags
  console.log('\n\nAll section/render tags:\n');
  lines.forEach((line, index) => {
    if (line.includes('{% section') || line.includes('{% render')) {
      console.log(`Line ${index + 1}: ${line.trim()}`);
    }
  });
}

findShopifyChat().catch(console.error);
