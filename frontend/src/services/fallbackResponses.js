const TEMPLATES = [
  'Here are a few quick steps to try: 1) Refresh the page, 2) Re-run the last action, 3) Check your internet connection. If this persists, open Technical Support from the quick actions.',
  'I could not reach the assistant temporarily. Please try again in a moment. Meanwhile, you can find help in Business Settings → AI & Messaging.',
  'The system is busy. I saved your question; re-ask in a few seconds and I will answer with more detail.',
];

export function getFallbackResponse(_message) {
  return TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
}


