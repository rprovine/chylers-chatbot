const axios = require('axios');
require('dotenv').config();

const cleanEnvVar = (value) => {
  if (!value) return value;
  return value.replace(/\\n/g, '').replace(/^["']|["']$/g, '').trim();
};

const SHOPIFY_STORE_URL = cleanEnvVar(process.env.SHOPIFY_STORE_URL);
const SHOPIFY_ACCESS_TOKEN = cleanEnvVar(process.env.SHOPIFY_ACCESS_TOKEN);
const NEW_WIDGET_URL = 'https://chylers-chatbot-mjsslr95r-rprovines-projects.vercel.app/chylers-chatbot-widget.js';

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

  // Replace the old widget URL with the new one
  const oldUrl = 'https://chylers-chatbot-qfe23gvds-rprovines-projects.vercel.app/chylers-chatbot-widget.js';

  if (themeContent.includes(oldUrl)) {
    console.log('✅ Found old widget URL, replacing...\n');
    themeContent = themeContent.replace(oldUrl, NEW_WIDGET_URL);

    await shopify.put(`/themes/${activeTheme.id}/assets.json`, {
      asset: {
        key: 'layout/theme.liquid',
        value: themeContent
      }
    });

    console.log('✅ Widget URL updated successfully!\n');
    console.log(`Old: ${oldUrl}`);
    console.log(`New: ${NEW_WIDGET_URL}\n`);
    console.log('The chatbot should now work on www.chylers.com');
    console.log('You may need to hard refresh (Ctrl+F5 / Cmd+Shift+R)');
  } else {
    console.log('❌ Old widget URL not found in theme');
  }
}

updateWidgetUrl().catch(console.error);
