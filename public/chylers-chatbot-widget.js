/**
 * Chylers AI Chatbot Widget
 * Embeddable chatbot for websites
 *
 * Usage: Add this script tag to your website:
 * <script src="https://chylers.com/chylers-chatbot-widget.js"></script>
 */

(function() {
    // Configuration
    const API_BASE_URL = 'https://chylers.com'; // TODO: Update with actual Chylers API endpoint

    // Prevent multiple initializations
    if (window.ChylersChatbotInitialized) {
        console.warn('Chylers Chatbot already initialized');
        return;
    }
    window.ChylersChatbotInitialized = true;

    // Session management
    let sessionId = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let currentLanguageMode = 'english';
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
            background: linear-gradient(135deg, #0d7377 0%, #14919d 100%);
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(13, 115, 119, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            transition: all 0.3s;
            position: relative;
        }

        #chylers-chat-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(13, 115, 119, 0.5);
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
            #chylers-chat-window {
                bottom: 0;
                right: 0;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                border-radius: 0;
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
        }

        .chylers-chat-header {
            background: linear-gradient(135deg, #0d7377 0%, #14919d 100%);
            color: white;
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
        }

        .chylers-chat-header h3 {
            margin: 0;
            font-size: 16px;
            margin-bottom: 3px;
        }

        .chylers-chat-header p {
            margin: 0;
            font-size: 10px;
            opacity: 0.9;
        }

        .chylers-close-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
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
            background: rgba(255, 255, 255, 0.3);
        }

        .chylers-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            background: #f8f9fa;
        }

        .chylers-message {
            max-width: 80%;
            padding: 12px 16px;
            border-radius: 18px;
            word-wrap: break-word;
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
        }

        .chylers-chat-input input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e9ecef;
            border-radius: 20px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.3s;
        }

        .chylers-chat-input input:focus {
            border-color: #0d7377;
        }

        .chylers-chat-input button {
            padding: 10px 18px;
            background: linear-gradient(135deg, #0d7377 0%, #14919d 100%);
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
            border: 2px solid #0d7377;
            color: #0d7377;
            border-radius: 20px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            text-decoration: none;
            display: inline-block;
        }

        .chylers-suggestion-btn:hover {
            background: #0d7377;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(13, 115, 119, 0.3);
        }

        .chylers-quickstart {
            padding: 16px;
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
            padding: 12px;
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
        }

        .chylers-quickstart-btn:hover {
            border-color: #0d7377;
            background: #e6f7f7;
            transform: translateY(-2px);
        }

        .chylers-quickstart-icon {
            font-size: 20px;
            margin-bottom: 4px;
        }

        .chylers-quickstart-label {
            font-size: 10px;
            color: #333;
            font-weight: 500;
        }

        /* Social proof banner */
        .chylers-social-proof {
            background: linear-gradient(135deg, #e6f7f7 0%, #d1f0f0 100%);
            border-bottom: 1px solid #a8dede;
            padding: 8px 12px;
            font-size: 11px;
            color: #0d7377;
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

        /* Language selector */
        .chylers-language-selector {
            display: flex;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
        }

        .chylers-language-label {
            font-size: 10px;
            font-weight: 600;
            opacity: 0.9;
            white-space: nowrap;
        }

        .chylers-language-select {
            padding: 4px 8px;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            color: white;
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
            outline: none;
        }

        .chylers-language-select option {
            background: #0ea5e9;
            color: white;
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
                        <h3>Chylers</h3>
                        <p>Premium Hawaiian Beef Chips®</p>
                    </div>
                    <div class="chylers-language-selector">
                        <span class="chylers-language-label">Language:</span>
                        <select class="chylers-language-select" id="chylers-language">
                            <option value="english">English</option>
                            <option value="pidgin">Pidgin</option>
                            <option value="olelo">ʻŌlelo Hawaiʻi</option>
                        </select>
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
                    <div class="chylers-quickstart-btn" data-message="How does shipping work?">
                        <div class="chylers-quickstart-icon">🚚</div>
                        <div class="chylers-quickstart-label">Shipping</div>
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
    const languageSelect = document.getElementById('chylers-language');
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

    // Add message
    function addMessage(text, sender, suggestions = null) {
        // Remove existing suggestions
        const existingSuggestions = messagesContainer.querySelector('.chylers-suggestions');
        if (existingSuggestions) {
            existingSuggestions.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chylers-message', `chylers-${sender}-message`);
        messageDiv.textContent = text;
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
                    sessionId: sessionId,
                    languageMode: currentLanguageMode
                }),
            });

            const data = await response.json();
            typingIndicator.classList.remove('active');

            if (response.ok) {
                addMessage(data.response, 'bot', data.suggestions);
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

    // Language selector
    languageSelect.addEventListener('change', (e) => {
        currentLanguageMode = e.target.value;
        console.log(`Language changed to: ${currentLanguageMode}`);

        // Add a system message to indicate language change
        const languageNames = {
            'english': 'English',
            'pidgin': 'Hawaiian Pidgin',
            'olelo': 'ʻŌlelo Hawaiʻi'
        };

        const systemMessage = document.createElement('div');
        systemMessage.style.textAlign = 'center';
        systemMessage.style.padding = '10px';
        systemMessage.style.color = '#6c757d';
        systemMessage.style.fontSize = '12px';
        systemMessage.style.fontStyle = 'italic';
        systemMessage.textContent = `Language changed to ${languageNames[currentLanguageMode]}`;
        messagesContainer.appendChild(systemMessage);

        // Scroll to show the message
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
