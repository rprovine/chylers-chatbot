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

async function removeShopifyChat() {
  console.log('🔍 Searching for Shopify chat installations...\n');

  try {
    // Check for script tags
    console.log('1. Checking Script Tags...');
    const scriptTagsResponse = await shopify.get('/script_tags.json');
    const scriptTags = scriptTagsResponse.data.script_tags;

    if (scriptTags && scriptTags.length > 0) {
      console.log(`Found ${scriptTags.length} script tags:\n`);

      for (const tag of scriptTags) {
        console.log(`- ID: ${tag.id}`);
        console.log(`  Src: ${tag.src}`);
        console.log(`  Event: ${tag.event}`);

        // Check if it's a chat-related script
        if (tag.src.toLowerCase().includes('chat') ||
            tag.src.toLowerCase().includes('inbox') ||
            tag.src.toLowerCase().includes('messenger')) {
          console.log(`  🗑️  REMOVING chat script...`);
          await shopify.delete(`/script_tags/${tag.id}.json`);
          console.log(`  ✅ Removed!`);
        }
        console.log('');
      }
    } else {
      console.log('No script tags found.\n');
    }

    // Check theme JSON for embedded apps
    console.log('2. Checking Theme Settings...');
    const themesResponse = await shopify.get('/themes.json');
    const activeTheme = themesResponse.data.themes.find(t => t.role === 'main');

    // Get config/settings_data.json
    try {
      const settingsResponse = await shopify.get(`/themes/${activeTheme.id}/assets.json`, {
        params: { 'asset[key]': 'config/settings_data.json' }
      });

      const settings = JSON.parse(settingsResponse.data.asset.value);

      console.log('Current sections:', Object.keys(settings.current || {}).join(', '));

      // Look for chat/inbox blocks
      if (settings.current) {
        Object.keys(settings.current).forEach(key => {
          const section = settings.current[key];
          if (section.type && (
            section.type.includes('chat') ||
            section.type.includes('inbox') ||
            section.type.includes('messenger')
          )) {
            console.log(`\nFound chat section: ${key} (${section.type})`);
            console.log('  To remove, you need to disable it in the Shopify admin:');
            console.log(`  Online Store > Themes > Customize > ${section.type}`);
          }
        });
      }
    } catch (e) {
      console.log('Could not read settings_data.json');
    }

    console.log('\n3. Checking App Embeds...');
    // Get theme app extensions
    try {
      const appEmbedsResponse = await shopify.get(`/themes/${activeTheme.id}/assets.json`, {
        params: { 'asset[key]': 'config/settings_data.json' }
      });

      const appSettings = JSON.parse(appEmbedsResponse.data.asset.value);

      if (appSettings.current && appSettings.current.blocks) {
        const blocks = appSettings.current.blocks;
        Object.keys(blocks).forEach(blockId => {
          const block = blocks[blockId];
          if (block.type && (
            block.type.includes('chat') ||
            block.type.includes('inbox') ||
            block.type.toLowerCase().includes('shopify-chat')
          )) {
            console.log(`\n🗑️  Found chat block: ${block.type}`);
            console.log(`Block ID: ${blockId}`);

            // Disable the block
            if (block.disabled !== true) {
              block.disabled = true;
              console.log('  Setting disabled = true');
            }
          }
        });

        // Save updated settings
        console.log('\n💾 Updating theme settings to disable chat blocks...');
        await shopify.put(`/themes/${activeTheme.id}/assets.json`, {
          asset: {
            key: 'config/settings_data.json',
            value: JSON.stringify(appSettings, null, 2)
          }
        });
        console.log('✅ Theme settings updated!\n');
      }
    } catch (e) {
      console.log('No app embeds to disable');
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ Shopify Chat Removal Complete!');
    console.log('═══════════════════════════════════════════');
    console.log('\nPlease check www.chylers.com to confirm.');
    console.log('If chat still appears, it may be configured in:');
    console.log('Shopify Admin > Sales Channels > Shopify Inbox');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

removeShopifyChat();
