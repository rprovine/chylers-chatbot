/**
 * Chylers AI Chatbot Widget
 * Embeddable chatbot for websites
 *
 * Usage: Add this script tag to your website:
 * <script src="https://chylers.com/chylers-chatbot-widget.js"></script>
 */

(function() {
    // Configuration - dynamically detect the API base URL from script source
    // This ensures the widget always uses the correct deployment URL
    const currentScript = document.currentScript || document.querySelector('script[src*="chylers-chatbot-widget.js"]');
    const scriptSrc = currentScript ? currentScript.src : '';

    // Extract the base URL from the script source
    // Example: https://chylers-chatbot-xyz.vercel.app/chylers-chatbot-widget.js -> https://chylers-chatbot-xyz.vercel.app
    let API_BASE_URL;
    if (scriptSrc && scriptSrc.includes('vercel.app')) {
        const url = new URL(scriptSrc);
        API_BASE_URL = url.origin;
    } else {
        // Fallback for local development or custom domains
        API_BASE_URL = 'https://chylers-chatbot-aphahph7z-rprovines-projects.vercel.app';
    }

    // Prevent multiple initializations
    if (window.ChylersChatbotInitialized) {
        console.warn('Chylers Chatbot already initialized');
        return;
    }
    window.ChylersChatbotInitialized = true;

    // Session management
    let sessionId = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let isOpen = false;

    // Create styles
    const styles = `
        #chylers-chatbot-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            z-index: 999999;
        }

        #chylers-chat-button {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #E22120 0%, #c41d1c 100%);
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(226, 33, 32, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            transition: all 0.3s;
            position: relative;
        }

        #chylers-chat-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(226, 33, 32, 0.5);
        }

        #chylers-chat-button.open {
            background: #e74c3c;
        }

        #chylers-chat-window {
            display: none;
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 400px;
            height: 650px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            flex-direction: column;
            overflow: hidden;
        }

        #chylers-chat-window.open {
            display: flex;
        }

        @media (max-width: 768px) {
            /* Ensure widget fills viewport - use percentage units that work on both Android and iOS */
            #chylers-chat-window {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                max-width: 100% !important;
                max-height: 100% !important;
                border-radius: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
            }

            #chylers-chatbot-container {
                bottom: 10px;
                right: 10px;
            }

            #chylers-chat-button {
                width: 56px;
                height: 56px;
                font-size: 24px;
            }

            /* Ensure all child elements use border-box */
            #chylers-chat-window * {
                box-sizing: border-box;
            }
        }

        .chylers-chat-header {
            background: transparent;
            color: #333;
            padding: 16px 20px;
            border-radius: 20px 20px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        }

        .chylers-chat-header-content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }

        .chylers-header-text {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .chylers-header-logo {
            max-height: 32px;
            max-width: 150px;
            height: auto;
            width: auto;
            object-fit: contain;
            display: block;
        }

        .chylers-chat-header p {
            margin: 0;
            font-size: 10px;
            opacity: 0.9;
        }

        .chylers-close-btn {
            background: rgba(0, 0, 0, 0.05);
            border: none;
            color: #666;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
            margin-left: 10px;
        }

        .chylers-close-btn:hover {
            background: rgba(0, 0, 0, 0.1);
            color: #333;
        }

        .chylers-chat-messages {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            background: #f8f9fa;
            max-width: 100%;
        }

        .chylers-message {
            max-width: 80%;
            padding: 12px 16px;
            border-radius: 18px;
            word-wrap: break-word;
            word-break: break-word;
            overflow-wrap: break-word;
            box-sizing: border-box;
            animation: chylersMessageFadeIn 0.3s ease-in;
        }

        @keyframes chylersMessageFadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .chylers-user-message {
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            color: white;
            align-self: flex-end;
        }

        .chylers-bot-message {
            background: white;
            color: #333;
            align-self: flex-start;
            white-space: pre-wrap;
            line-height: 1.6;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .chylers-typing {
            display: none;
            align-self: flex-start;
            padding: 12px 16px;
            background: white;
            border-radius: 18px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .chylers-typing.active {
            display: block;
        }

        .chylers-typing span {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #999;
            margin: 0 2px;
            animation: chylersTyping 1.4s infinite;
        }

        .chylers-typing span:nth-child(2) {
            animation-delay: 0.2s;
        }

        .chylers-typing span:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes chylersTyping {
            0%, 60%, 100% {
                transform: translateY(0);
            }
            30% {
                transform: translateY(-10px);
            }
        }

        .chylers-chat-input {
            padding: 16px 20px;
            border-top: 1px solid #e9ecef;
            display: flex;
            gap: 10px;
            background: white;
            max-width: 100%;
            box-sizing: border-box;
        }

        .chylers-chat-input input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e9ecef;
            border-radius: 20px;
            font-size: 16px;
            outline: none;
            transition: border-color 0.3s;
            box-sizing: border-box;
            min-width: 0;
        }

        .chylers-chat-input input:focus {
            border-color: #E22120;
        }

        .chylers-chat-input button {
            padding: 10px 18px;
            background: linear-gradient(135deg, #E22120 0%, #c41d1c 100%);
            color: white;
            border: none;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .chylers-chat-input button:hover {
            transform: scale(1.05);
        }

        .chylers-suggestions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
            align-self: flex-start;
            max-width: 80%;
        }

        .chylers-suggestion-btn {
            padding: 8px 14px;
            background: white;
            border: 2px solid #E22120;
            color: #E22120;
            border-radius: 20px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            text-decoration: none;
            display: inline-block;
        }

        .chylers-suggestion-btn:hover {
            background: #E22120;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(226, 33, 32, 0.3);
        }

        .chylers-quickstart {
            padding: 10px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }

        .chylers-quickstart-title {
            font-size: 9px;
            color: #6c757d;
            margin-bottom: 8px;
            text-align: center;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .chylers-quickstart-buttons {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
        }

        .chylers-quickstart-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 10px;
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
        }

        .chylers-quickstart-btn:hover {
            border-color: #E22120;
            background: #ffe6e6;
            transform: translateY(-2px);
        }

        .chylers-quickstart-icon {
            font-size: 18px;
            margin-bottom: 4px;
        }

        .chylers-quickstart-label {
            font-size: 9px;
            color: #333;
            font-weight: 500;
        }

        /* Social proof banner */
        .chylers-social-proof {
            background: linear-gradient(135deg, #ffe6e6 0%, #ffd1d1 100%);
            border-bottom: 1px solid #ffa8a8;
            padding: 8px 12px;
            font-size: 11px;
            color: #E22120;
            text-align: center;
            font-weight: 500;
        }

        .chylers-social-stats {
            display: flex;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .chylers-stat-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .chylers-stat-item strong {
            color: #075985;
        }

        /* Actions footer */
        .chylers-actions {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            padding: 14px 16px;
            border-top: 1px solid #e9ecef;
            flex-wrap: wrap;
            background: white;
        }

        .chylers-action-btn {
            padding: 8px 14px;
            border-radius: 18px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
            border: none;
        }

        .chylers-clear-btn {
            background: #e74c3c;
            color: white;
        }

        .chylers-clear-btn:hover {
            background: #c0392b;
            transform: scale(1.05);
        }

        /* Notification badge */
        .chylers-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #e74c3c;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            animation: chylersPulse 2s infinite;
        }

        @keyframes chylersPulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.1);
            }
        }
    `;

    // Inject styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Create HTML structure
    const container = document.createElement('div');
    container.id = 'chylers-chatbot-container';
    container.innerHTML = `
        <button id="chylers-chat-button" aria-label="Open chat">
            💬
        </button>
        <div id="chylers-chat-window">
            <div class="chylers-chat-header">
                <div class="chylers-chat-header-content">
                    <div class="chylers-header-text">
                        <img src="https://chylers.com/cdn/shop/files/logo_R.jpg?v=1715295319&width=500" alt="Chylers" class="chylers-header-logo">
                        <p>Premium Hawaiian Beef Chips®</p>
                    </div>
                </div>
                <button class="chylers-close-btn" aria-label="Close chat">×</button>
            </div>
            <div class="chylers-quickstart" id="chylers-quickstart">
                <div class="chylers-quickstart-title">Quick Start</div>
                <div class="chylers-quickstart-buttons">
                    <div class="chylers-quickstart-btn" data-message="Tell me about your Hawaiian Beef Chips">
                        <div class="chylers-quickstart-icon">🥩</div>
                        <div class="chylers-quickstart-label">Our Products</div>
                    </div>
                    <div class="chylers-quickstart-btn" data-message="What flavors do you have?">
                        <div class="chylers-quickstart-icon">🌶️</div>
                        <div class="chylers-quickstart-label">Flavors</div>
                    </div>
                    <div class="chylers-quickstart-btn" data-message="Tell me the Chylers story">
                        <div class="chylers-quickstart-icon">❤️</div>
                        <div class="chylers-quickstart-label">Our Story</div>
                    </div>
                    <div class="chylers-quickstart-btn" data-message="How does shipping work?">
                        <div class="chylers-quickstart-icon">🚚</div>
                        <div class="chylers-quickstart-label">Shipping</div>
                    </div>
                    <div class="chylers-quickstart-btn" data-message="I need to check my order status">
                        <div class="chylers-quickstart-icon">📦</div>
                        <div class="chylers-quickstart-label">Order Status</div>
                    </div>
                    <div class="chylers-quickstart-btn" data-message="I want to order">
                        <div class="chylers-quickstart-icon">🛒</div>
                        <div class="chylers-quickstart-label">Order Now</div>
                    </div>
                </div>
            </div>
            <div class="chylers-chat-messages" id="chylers-messages">
                <div class="chylers-message chylers-bot-message">
                    Aloha! 👋 Welcome to Chylers! Looking for premium Hawaiian Beef Chips®? How can I help you today?
                </div>
            </div>
            <div class="chylers-typing" id="chylers-typing">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div class="chylers-actions">
                <button class="chylers-action-btn chylers-clear-btn" id="chylers-clear">Clear Chat</button>
            </div>
            <div class="chylers-chat-input">
                <input
                    type="text"
                    id="chylers-input"
                    placeholder="Type your message..."
                />
                <button id="chylers-send">Send</button>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    // Get elements
    const chatButton = document.getElementById('chylers-chat-button');
    const chatWindow = document.getElementById('chylers-chat-window');
    const closeBtn = container.querySelector('.chylers-close-btn');
    const messagesContainer = document.getElementById('chylers-messages');
    const input = document.getElementById('chylers-input');
    const sendButton = document.getElementById('chylers-send');
    const typingIndicator = document.getElementById('chylers-typing');
    const quickstart = document.getElementById('chylers-quickstart');
    const clearButton = document.getElementById('chylers-clear');

    // Toggle chat
    function toggleChat() {
        isOpen = !isOpen;
        chatWindow.classList.toggle('open');
        chatButton.classList.toggle('open');
        chatButton.textContent = isOpen ? '×' : '💬';

        if (isOpen) {
            input.focus();
        }
    }

    chatButton.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    // Smart scroll
    function smartScroll(force = false) {
        if (force) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            return;
        }

        const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 150;
        if (isNearBottom) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // Convert markdown to HTML
    function formatMessageText(text) {
        // Convert headings (must come before other formatting)
        text = text.replace(/^### (.+)$/gm, '<strong style="font-size: 1.1em; display: block; margin-top: 0.5em;">$1</strong>');
        text = text.replace(/^## (.+)$/gm, '<strong style="font-size: 1.15em; display: block; margin-top: 0.5em;">$1</strong>');
        text = text.replace(/^# (.+)$/gm, '<strong style="font-size: 1.2em; display: block; margin-top: 0.5em;">$1</strong>');

        // Convert [text](url) links
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        // Convert **bold** to <strong>
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Convert *italic* to <em> (but not if it's part of a bullet point)
        text = text.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>');

        // Convert `code` to <code>
        text = text.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 0.9em;">$1</code>');

        // Convert blockquotes (> text)
        text = text.replace(/^&gt; (.+)$/gm, '<div style="border-left: 3px solid #d97706; padding-left: 10px; margin: 8px 0; color: #666;">$1</div>');
        text = text.replace(/^> (.+)$/gm, '<div style="border-left: 3px solid #d97706; padding-left: 10px; margin: 8px 0; color: #666;">$1</div>');

        // Convert bullet lists (- item or * item)
        text = text.replace(/^[*-] (.+)$/gm, '<div style="margin-left: 1em;">• $1</div>');

        // Convert numbered lists (1. item, 2. item, etc)
        text = text.replace(/^\d+\. (.+)$/gm, '<div style="margin-left: 1em;">$1</div>');

        // Convert horizontal rules (--- or ***)
        text = text.replace(/^(-{3,}|\*{3,})$/gm, '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 10px 0;">');

        // Convert URLs to clickable links (detect www.chylers.com or https://...)
        text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        text = text.replace(/\b(www\.[^\s<]+)/g, '<a href="https://$1" target="_blank" rel="noopener noreferrer">$1</a>');

        // Convert line breaks
        text = text.replace(/\n/g, '<br>');

        return text;
    }

    // Add message
    function addMessage(text, sender, suggestions = null) {
        // Remove existing suggestions
        const existingSuggestions = messagesContainer.querySelector('.chylers-suggestions');
        if (existingSuggestions) {
            existingSuggestions.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chylers-message', `chylers-${sender}-message`);
        messageDiv.innerHTML = formatMessageText(text);
        messagesContainer.appendChild(messageDiv);

        // Add suggestions
        if (sender === 'bot' && suggestions && suggestions.length > 0) {
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.classList.add('chylers-suggestions');

            suggestions.forEach(suggestion => {
                if (suggestion.startsWith('Email:')) {
                    const email = suggestion.split('Email:')[1].trim();
                    const link = document.createElement('a');
                    link.classList.add('chylers-suggestion-btn');
                    link.href = `mailto:${email}`;
                    link.textContent = `📧 ${email}`;
                    suggestionsContainer.appendChild(link);
                } else if (suggestion.startsWith('Call:')) {
                    const phone = suggestion.split('Call:')[1].trim();
                    const link = document.createElement('a');
                    link.classList.add('chylers-suggestion-btn');
                    link.href = `tel:${phone.replace(/[^0-9]/g, '')}`;
                    link.textContent = `📞 ${phone}`;
                    suggestionsContainer.appendChild(link);
                } else {
                    const button = document.createElement('button');
                    button.classList.add('chylers-suggestion-btn');
                    button.textContent = suggestion;
                    button.onclick = () => {
                        suggestionsContainer.remove();
                        sendMessage(suggestion);
                    };
                    suggestionsContainer.appendChild(button);
                }
            });

            messagesContainer.appendChild(suggestionsContainer);
        }

        smartScroll(sender === 'user');
    }

    // Send message
    async function sendMessage(message = null) {
        const text = message || input.value.trim();
        if (!text) return;

        if (!message) {
            input.value = '';
        }

        // Hide quickstart
        if (quickstart.style.display !== 'none') {
            quickstart.style.display = 'none';
        }

        addMessage(text, 'user');

        // Show typing
        typingIndicator.classList.add('active');
        smartScroll(false);

        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: text,
                    sessionId: sessionId
                }),
            });

            const data = await response.json();
            typingIndicator.classList.remove('active');

            if (response.ok) {
                addMessage(data.message, 'bot', data.suggestions);
            } else {
                addMessage('Sorry, I encountered an error. Please try again.', 'bot');
            }
        } catch (error) {
            typingIndicator.classList.remove('active');
            addMessage('Sorry, I could not connect. Please try again.', 'bot');
            console.error('Error:', error);
        }
    }

    // Event listeners
    sendButton.addEventListener('click', () => sendMessage());
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Quickstart buttons
    const quickstartButtons = container.querySelectorAll('.chylers-quickstart-btn');
    quickstartButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const message = btn.dataset.message;
            sendMessage(message);
        });
    });

    // Clear chat
    async function clearChat() {
        try {
            await fetch(`${API_BASE_URL}/reset`, {
                method: 'POST',
            });

            messagesContainer.innerHTML = `
                <div class="chylers-message chylers-bot-message">
                    Aloha! 👋 Welcome to Chylers! Looking for premium Hawaiian Beef Chips®? How can I help you today?
                </div>
            `;

            // Show quickstart buttons again
            quickstart.style.display = 'block';
        } catch (error) {
            console.error('Error clearing chat:', error);
        }
    }

    // Event listeners for action buttons
    clearButton.addEventListener('click', clearChat);

    console.log('🤖 Chylers AI Chatbot Widget loaded successfully');
})();
