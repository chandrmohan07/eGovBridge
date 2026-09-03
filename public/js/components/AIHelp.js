/**
 * Component: AIHelp
 * Renders the AI Government Help Chatbot interface with grounded guidance disclaimers,
 * interactive suggestion pills, actionable service shortcuts, and source attribution.
 */

export function renderAIHelp(store) {
  const conversation = store.aiHelpConversation || [];

  const quickPrompts = [
    'How do I apply for the Post-Matric Scholarship?',
    'What documents are needed for an Income Certificate?',
    'What is the turnaround time for Driving License Renewal?',
    'How does the smart orchestration engine verify documents?'
  ];

  return `
    <div class="ai-help-view" style="max-width: 900px; margin: 0 auto; padding-bottom: 40px;">
      <!-- Section Header -->
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 20px;">
        <div>
          <h2 class="section-title" style="margin: 0 0 6px 0;">AI Government Citizen Assistant</h2>
          <p class="section-subtitle" style="margin: 0;">
            Grounded conversational assistant for finding schemes, eligibility criteria, and application navigation.
          </p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="badge badge-mock">Backend Gateway: Mock LLM Ready</span>
          <button class="btn btn-outline btn-sm" onclick="window.app.clearAIChat ? window.app.clearAIChat() : null" title="Clear Conversation">
            🗑️ Clear Chat
          </button>
        </div>
      </div>

      <div class="chatbot-container" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden;">
        <!-- Grounded Disclaimer Bar -->
        <div class="chat-disclaimer" style="background: #eff6ff; border-bottom: 1px solid #bfdbfe; padding: 12px 16px; font-size: 12px; color: #1e40af; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">ℹ️</span>
          <span>
            <strong>Official AI Disclaimer:</strong> This assistant provides grounded guidance based on cataloged government rules. It does not make official government approval or rejection decisions.
          </span>
        </div>

        <!-- Chat History Area -->
        <div class="chat-history" id="chatHistoryBox" style="min-height: 360px; max-height: 500px; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px;">
          ${conversation.length === 0 ? `
            <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
              <div style="font-size: 32px; margin-bottom: 8px;">🤖</div>
              <h4 style="margin: 0 0 4px 0; font-size: 15px; color: var(--text-main);">Welcome to the Citizen Assistant</h4>
              <p style="font-size: 13px; margin: 0;">Ask any question about government services, scholarships, document requirements, or your application status.</p>
            </div>
          ` : conversation.map(msg => `
            <div class="chat-message ${msg.sender}" style="display: flex; flex-direction: column; align-items: ${msg.sender === 'user' ? 'flex-end' : 'flex-start'};">
              <div class="chat-bubble" style="max-width: 80%; padding: 12px 16px; border-radius: ${msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px'}; background: ${msg.sender === 'user' ? 'var(--color-primary)' : '#f3f4f6'}; color: ${msg.sender === 'user' ? '#ffffff' : 'var(--text-main)'}; font-size: 13px; line-height: 1.5; box-shadow: var(--shadow-xs);">
                ${(msg.text || '').replace(/\n/g, '<br/>')}
                
                ${msg.sources && msg.sources.length > 0 ? `
                  <div style="margin-top: 8px; pt-2; border-top: 1px dashed ${msg.sender === 'user' ? 'rgba(255,255,255,0.3)' : 'var(--border-color)'}; font-size: 11px; color: ${msg.sender === 'user' ? '#e0e7ff' : 'var(--text-muted)'};">
                    📚 <em>Source: ${msg.sources.join(', ')}</em>
                  </div>
                ` : ''}

                ${msg.actions && msg.actions.length > 0 ? `
                  <div style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
                    ${msg.actions.map(act => `
                      <button class="btn btn-outline btn-sm" style="font-size: 11px; padding: 3px 8px; background: #ffffff; color: var(--color-primary);" onclick="window.app.handleChatAction ? window.app.handleChatAction('${act.type}', '${act.serviceId || act.applicationId || act.target}') : null">
                        ${act.label || 'View'} →
                      </button>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Quick Prompt Suggestions -->
        <div class="chat-suggestions" style="padding: 10px 16px; background: #f9fafb; border-top: 1px solid var(--border-color); display: flex; gap: 8px; flex-wrap: wrap;">
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); align-self: center;">Suggested:</span>
          ${quickPrompts.map(prompt => `
            <button class="suggestion-pill" onclick="window.app.sendAIChatPrompt ? window.app.sendAIChatPrompt('${prompt.replace(/'/g, "\\'")}') : null" style="font-size: 11px; padding: 4px 10px; border-radius: 12px; border: 1px solid var(--border-color); background: #ffffff; cursor: pointer;">
              ${prompt}
            </button>
          `).join('')}
        </div>

        <!-- Input Area -->
        <div class="chat-input-area" style="padding: 14px 16px; border-top: 1px solid var(--border-color); display: flex; gap: 10px; background: #ffffff;">
          <input 
            type="text" 
            id="chatUserPromptInput" 
            class="chat-input-box" 
            placeholder="Ask anything about government services, scholarships, or required documents..."
            style="flex: 1; padding: 10px 14px; font-size: 13px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);"
            onkeyup="if(event.key === 'Enter') (window.app.handleChatSubmit ? window.app.handleChatSubmit() : null)"
          />
          <button class="btn btn-primary" onclick="window.app.handleChatSubmit ? window.app.handleChatSubmit() : null">
            Send
          </button>
        </div>
      </div>
    </div>
  `;
}
