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

async function checkThemeStatus() {
  console.log('🔍 Checking theme status...\n');

  const themesResponse = await shopify.get('/themes.json');
  const themes = themesResponse.data.themes;

  console.log(`Found ${themes.length} themes:\n`);

  themes.forEach(theme => {
    console.log(`📋 ${theme.name}`);
    console.log(`   ID: ${theme.id}`);
    console.log(`   Role: ${theme.role}`);
    console.log(`   Processing: ${theme.processing}`);
    console.log(`   Previewable: ${theme.previewable}`);
    console.log('');
  });

  // Check the active theme's theme.liquid for the widget
  const activeTheme = themes.find(t => t.role === 'main');

  if (activeTheme) {
    console.log(`\n🔍 Checking active theme (${activeTheme.name}) for widget...\n`);

    const assetResponse = await shopify.get(`/themes/${activeTheme.id}/assets.json`, {
      params: { 'asset[key]': 'layout/theme.liquid' }
    });

    const themeContent = assetResponse.data.asset.value;
    const hasWidget = themeContent.includes('chylers-chatbot-widget.js');

    if (hasWidget) {
      console.log('✅ Widget script IS present in active theme!');

      // Extract the script tag
      const scriptMatch = themeContent.match(/<!-- Chylers AI Chatbot -->[\s\S]*?<script[^>]*chylers-chatbot-widget\.js[^>]*><\/script>/);
      if (scriptMatch) {
        console.log('\nWidget code:');
        console.log(scriptMatch[0]);
      }
    } else {
      console.log('❌ Widget script NOT found in active theme');
    }
  }
}

checkThemeStatus().catch(error => {
  console.error('Error:', error.message);
});
