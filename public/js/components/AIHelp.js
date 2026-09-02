/**
 * Component: AIHelp
 * Renders the AI Government Help Chatbot interface with grounded guidance disclaimers.
 */

export function renderAIHelp(store) {
  const conversation = store.aiHelpConversation;

  const quickPrompts = [
    'How do I apply for the Post-Matric Scholarship?',
    'What documents are needed for an Income Certificate?',
    'What is the turnaround time for Driving License Renewal?',
    'How does the smart orchestration engine verify documents?'
  ];

  return `
    <div>
      <div class="section-header">
        <div>
          <h2 class="section-title">AI Government Citizen Assistant</h2>
          <p class="section-subtitle">Grounded conversational assistant for finding schemes, eligibility criteria, and application navigation.</p>
        </div>
        <span class="badge badge-mock">Backend Gateway: Mock LLM Ready</span>
      </div>

      <div class="chatbot-container">
        <!-- Grounded Disclaimer Bar -->
        <div class="chat-disclaimer">
          <span>ℹ️</span>
          <span>
            <strong>Official AI Disclaimer:</strong> This assistant provides grounded guidance based on cataloged government rules. It does not make official government approval or rejection decisions.
          </span>
        </div>

        <!-- Chat History -->
        <div class="chat-history" id="chatHistoryBox">
          ${conversation.map(msg => `
            <div class="chat-message ${msg.sender}">
              <div class="chat-bubble">
                ${msg.text.replace(/\n/g, '<br/>')}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Quick Prompt Suggestions -->
        <div class="chat-suggestions">
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); align-self: center;">Suggested:</span>
          ${quickPrompts.map(prompt => `
            <button class="suggestion-pill" onclick="window.app.sendAIChatPrompt('${prompt.replace(/'/g, "\\'")}')">
              ${prompt}
            </button>
          `).join('')}
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
          <input 
            type="text" 
            id="chatUserPromptInput" 
            class="chat-input-box" 
            placeholder="Ask anything about government services, scholarships, or required documents..."
            onkeyup="if(event.key === 'Enter') window.app.handleChatSubmit()"
          />
          <button class="btn btn-primary" onclick="window.app.handleChatSubmit()">
            Send
          </button>
        </div>
      </div>
    </div>
  `;
}
