const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const backupFile = process.argv[2];

if (!backupFile) {
  console.error('Usage: node revert-theme.js <backup-file>');
  process.exit(1);
}

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

const shopify = axios.create({
  baseURL: `https://${SHOPIFY_STORE_URL}/admin/api/2024-01`,
  headers: {
    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json'
  }
});

async function revert() {
  console.log('🔄 Reverting to backup...');

  const themesResponse = await shopify.get('/themes.json');
  const activeTheme = themesResponse.data.themes.find(t => t.role === 'main');

  const backupContent = fs.readFileSync(backupFile, 'utf8');

  await shopify.put(`/themes/${activeTheme.id}/assets.json`, {
    asset: {
      key: 'layout/theme.liquid',
      value: backupContent
    }
  });

  console.log('✅ Reverted successfully!');
}

revert().catch(console.error);
