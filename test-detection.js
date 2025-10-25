// Test the order tracking detection
function detectOrderTracking(message) {
  const lowerMessage = message.toLowerCase();

  // Simple keyword matching - much more reliable than complex regex
  const hasOrderKeyword = lowerMessage.includes('order') ||
                          lowerMessage.includes('package') ||
                          lowerMessage.includes('shipment') ||
                          lowerMessage.includes('delivery');

  const hasTrackingKeyword = lowerMessage.includes('track') ||
                             lowerMessage.includes('status') ||
                             lowerMessage.includes('where') ||
                             lowerMessage.includes('check') ||
                             lowerMessage.includes('find') ||
                             lowerMessage.includes('locate');

  return hasOrderKeyword && hasTrackingKeyword;
}

// Test cases
const testMessages = [
  "I need to check my order status",
  "track my order",
  "where is my package",
  "what are your flavors",
  "hello",
  "order status"
];

console.log("Testing order tracking detection:\n");
testMessages.forEach(msg => {
  const result = detectOrderTracking(msg);
  console.log(`"${msg}" -> ${result}`);
});
