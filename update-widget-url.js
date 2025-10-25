const axios = require('axios');
require('dotenv').config();

const cleanEnvVar = (value) => {
  if (!value) return value;
  return value.replace(/\\n/g, '').replace(/^["']|["']$/g, '').trim();
};

const SHOPIFY_STORE_URL = cleanEnvVar(process.env.SHOPIFY_STORE_URL);
const SHOPIFY_ACCESS_TOKEN = cleanEnvVar(process.env.SHOPIFY_ACCESS_TOKEN);
const NEW_WIDGET_URL = 'https://chylers-chatbot-jf4tszvbc-rprovines-projects.vercel.app/chylers-chatbot-widget.js';

const shopify = axios.create({
  baseURL: `https://${SHOPIFY_STORE_URL}/admin/api/2024-01`,
  headers: {
    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json'
  }
});

async function updateWidgetUrl() {
  console.log('🔄 Updating widget URL in Shopify theme...\n');

  const themesResponse = await shopify.get('/themes.json');
  const activeTheme = themesResponse.data.themes.find(t => t.role === 'main');

  console.log(`Active theme: ${activeTheme.name}\n`);

  const assetResponse = await shopify.get(`/themes/${activeTheme.id}/assets.json`, {
    params: { 'asset[key]': 'layout/theme.liquid' }
  });

  let themeContent = assetResponse.data.asset.value;

  // Find any existing widget URL
  const oldUrls = [
    'https://chylers-chatbot-qfe23gvds-rprovines-projects.vercel.app/chylers-chatbot-widget.js',
    'https://chylers-chatbot-mjsslr95r-rprovines-projects.vercel.app/chylers-chatbot-widget.js'
  ];

  let foundUrl = null;
  for (const url of oldUrls) {
    if (themeContent.includes(url)) {
      foundUrl = url;
      break;
    }
  }

  if (foundUrl) {
    console.log('✅ Found old widget URL, replacing...\n');
    themeContent = themeContent.replace(foundUrl, NEW_WIDGET_URL);

    await shopify.put(`/themes/${activeTheme.id}/assets.json`, {
      asset: {
        key: 'layout/theme.liquid',
        value: themeContent
      }
    });

    console.log('✅ Widget URL updated successfully!\n');
    console.log(`Old: ${foundUrl}`);
    console.log(`New: ${NEW_WIDGET_URL}\n`);
    console.log('The chatbot with RED PLUMERIA branding is now live on www.chylers.com!');
    console.log('You may need to hard refresh (Ctrl+F5 / Cmd+Shift+R)');
  } else {
    console.log('❌ Old widget URL not found in theme');
    console.log('Searching for any chatbot widget script...');

    // Search for any vercel.app script
    const lines = themeContent.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('vercel.app') && line.includes('chatbot')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
      }
    });
  }
}

updateWidgetUrl().catch(console.error);
