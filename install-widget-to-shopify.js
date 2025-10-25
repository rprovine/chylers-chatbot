const axios = require('axios');
require('dotenv').config();

// Clean environment variables (remove quotes, newlines, etc.)
const cleanEnvVar = (value) => {
  if (!value) return value;
  return value.replace(/\\n/g, '').replace(/^["']|["']$/g, '').trim();
};

const SHOPIFY_STORE_URL = cleanEnvVar(process.env.SHOPIFY_STORE_URL);
const SHOPIFY_ACCESS_TOKEN = cleanEnvVar(process.env.SHOPIFY_ACCESS_TOKEN);
const WIDGET_URL = 'https://chylers-chatbot-qfe23gvds-rprovines-projects.vercel.app/chylers-chatbot-widget.js';

if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
  console.error('❌ Missing Shopify credentials in .env file');
  console.error('Need: SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN');
  process.exit(1);
}

const shopify = axios.create({
  baseURL: `https://${SHOPIFY_STORE_URL}/admin/api/2024-01`,
  headers: {
    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json'
  }
});

async function installChatbotWidget() {
  console.log('🚀 Starting Chylers Chatbot Widget Installation...\n');

  try {
    // Step 1: Get all themes
    console.log('📋 Step 1: Fetching themes...');
    const themesResponse = await shopify.get('/themes.json');
    const themes = themesResponse.data.themes;

    const activeTheme = themes.find(theme => theme.role === 'main');

    if (!activeTheme) {
      console.error('❌ Could not find active theme');
      return;
    }

    console.log(`✅ Found active theme: ${activeTheme.name} (ID: ${activeTheme.id})\n`);

    // Step 2: Get theme assets (specifically theme.liquid)
    console.log('📋 Step 2: Fetching theme.liquid...');
    const assetResponse = await shopify.get(`/themes/${activeTheme.id}/assets.json`, {
      params: { 'asset[key]': 'layout/theme.liquid' }
    });

    let themeContent = assetResponse.data.asset.value;
    console.log(`✅ Retrieved theme.liquid (${themeContent.length} characters)\n`);

    // Step 3: Backup original content
    console.log('💾 Step 3: Creating backup...');
    const fs = require('fs');
    const backupFilename = `theme-liquid-backup-${Date.now()}.txt`;
    fs.writeFileSync(backupFilename, themeContent);
    console.log(`✅ Backup saved to: ${backupFilename}\n`);

    // Step 4: Check if our widget is already installed
    if (themeContent.includes('chylers-chatbot-widget.js')) {
      console.log('⚠️  Chatbot widget is already installed!');
      console.log('Skipping installation to avoid duplicates.\n');
      return;
    }

    // Step 5: Remove Shopify Chat code
    console.log('🗑️  Step 4: Removing old Shopify Chat code...');
    let modified = false;
    const oldContent = themeContent;

    // Remove Shopify Inbox/Chat snippets
    const chatPatterns = [
      /<!--\s*Shopify\s+Chat\s*-->[\s\S]*?<\/script>/gi,
      /{{[\s'"]*shopify-chat['"][\s|]*shopify_asset_url[\s|]*script_tag\s*}}/gi,
      /<script[^>]*shopify.*?chat.*?<\/script>/gi,
      /window\.ShopifyChat[\s\S]*?<\/script>/gi,
      /{%\s*render\s+['"]shopify-chat['"].*?%}/gi,
      /{%\s*include\s+['"]shopify-chat['"].*?%}/gi
    ];

    chatPatterns.forEach(pattern => {
      const before = themeContent.length;
      themeContent = themeContent.replace(pattern, '');
      if (themeContent.length !== before) {
        modified = true;
        console.log(`   ✓ Removed chat code matching pattern`);
      }
    });

    if (!modified) {
      console.log('   ℹ️  No Shopify Chat code found (that\'s okay!)\n');
    } else {
      console.log(`   ✅ Removed ${oldContent.length - themeContent.length} characters of chat code\n`);
    }

    // Step 6: Add our chatbot widget
    console.log('➕ Step 5: Adding Chylers AI Chatbot widget...');

    const widgetScript = `
<!-- Chylers AI Chatbot -->
<script src="${WIDGET_URL}"></script>`;

    // Find the closing </body> tag and add our script before it
    if (themeContent.includes('</body>')) {
      themeContent = themeContent.replace('</body>', `${widgetScript}\n  </body>`);
      console.log('   ✅ Widget script added before </body> tag\n');
    } else {
      console.error('   ❌ Could not find </body> tag in theme.liquid');
      return;
    }

    // Step 7: Upload modified theme.liquid
    console.log('📤 Step 6: Uploading modified theme.liquid...');

    await shopify.put(`/themes/${activeTheme.id}/assets.json`, {
      asset: {
        key: 'layout/theme.liquid',
        value: themeContent
      }
    });

    console.log('   ✅ Theme updated successfully!\n');

    // Step 8: Verify installation
    console.log('🔍 Step 7: Verifying installation...');
    const verifyResponse = await shopify.get(`/themes/${activeTheme.id}/assets.json`, {
      params: { 'asset[key]': 'layout/theme.liquid' }
    });

    const verifyContent = verifyResponse.data.asset.value;

    if (verifyContent.includes('chylers-chatbot-widget.js')) {
      console.log('   ✅ Widget installation verified!\n');
    } else {
      console.log('   ⚠️  Could not verify widget installation\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ INSTALLATION COMPLETE!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Visit www.chylers.com');
    console.log('2. Look for the chat widget in the bottom-right corner');
    console.log('3. Test the chatbot with a few questions');
    console.log('4. Check the analytics dashboard for data');
    console.log('');
    console.log('Backup file:', backupFilename);
    console.log('Analytics:', 'https://chylers-chatbot-qfe23gvds-rprovines-projects.vercel.app/analytics');
    console.log('');
    console.log('If you need to revert:');
    console.log(`node revert-theme.js ${backupFilename}`);
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 401) {
        console.error('\n⚠️  Authentication failed. Please check:');
        console.error('1. SHOPIFY_ACCESS_TOKEN is correct');
        console.error('2. Token has "write_themes" permission');
        console.error('3. Token is not expired');
      }
    } else {
      console.error('Full error:', error);
    }
  }
}

// Create revert script
const revertScript = `const axios = require('axios');
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
  baseURL: \`https://\${SHOPIFY_STORE_URL}/admin/api/2024-01\`,
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

  await shopify.put(\`/themes/\${activeTheme.id}/assets.json\`, {
    asset: {
      key: 'layout/theme.liquid',
      value: backupContent
    }
  });

  console.log('✅ Reverted successfully!');
}

revert().catch(console.error);
`;

require('fs').writeFileSync('revert-theme.js', revertScript);

// Run the installation
installChatbotWidget();
