'use client';

// SyncWise AI Chat Widget — Comic-inspired design
// Floating chat bubble with speech-bubble styled messages
// Auto-scrolls to bottom on open, strips markdown from AI responses

import { useState, useRef, useEffect, useCallback } from 'react';

// Strip markdown formatting from AI responses as a safety net
function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')     // **bold**
    .replace(/\*(.*?)\*/g, '$1')          // *italic*
    .replace(/__(.*?)__/g, '$1')          // __bold__
    .replace(/_(.*?)_/g, '$1')            // _italic_
    .replace(/#{1,6}\s+/g, '')            // ### headers
    .replace(/^---+$/gm, '')              // --- horizontal rules
    .replace(/^[\*\-]\s+/gm, '• ')       // bullet points → simple dots (if they sneak through)
    .replace(/^\d+\.\s+/gm, '')           // numbered lists
    .replace(/`([^`]+)`/g, '$1')          // `inline code`
    .replace(/```[\s\S]*?```/g, '')       // code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [links](url)
    .replace(/\n{3,}/g, '\n\n')           // excess newlines
    .trim();
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [bubblePulse, setBubblePulse] = useState(true);
  const messagesEndRef = useRef(null);
  const messageAreaRef = useRef(null);
  const inputRef = useRef(null);

  // Casual rotating greetings
  const greetings = [
    "What's up? I'm your SyncWise assistant — ask me about your workload, help drafting emails, or anything about the platform.",
    "Hey! Need help with assignments, emails, or figuring something out? I'm here.",
    "What are we working on? I can check your schedule, draft emails, or help you plan your week.",
  ];
  const defaultGreeting = { role: 'assistant', content: greetings[Math.floor(Math.random() * greetings.length)] };

  // Scroll to bottom helper
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load saved chat history when widget first opens + scroll to bottom
  useEffect(() => {
    if (isOpen && !historyLoaded) {
      setHistoryLoaded(true);
      fetch('/api/chat')
        .then(r => r.json())
        .then(data => {
          if (data.success && data.history && data.history.length > 0) {
            const recent = data.history.slice(-20).map(m => ({
              role: m.role,
              content: m.role === 'assistant' ? stripMarkdown(m.content) : m.content,
            }));
            setMessages(recent);
          } else {
            setMessages([defaultGreeting]);
          }
          // Force scroll to bottom after history loads
          setTimeout(() => scrollToBottom('instant'), 50);
        })
        .catch(() => {
          setMessages([defaultGreeting]);
        });
    }
    // Always scroll to bottom when opening
    if (isOpen) {
      setTimeout(() => scrollToBottom('instant'), 100);
    }
  }, [isOpen, historyLoaded]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setBubblePulse(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Task context from localStorage
  const getTaskContext = () => {
    try {
      const cached = localStorage.getItem('syncwise_dashboard_data');
      if (cached) {
        const data = JSON.parse(cached);
        if (data.tasks && Array.isArray(data.tasks)) {
          return { tasks: data.tasks.slice(0, 20) };
        }
      }
      const assignments = localStorage.getItem('syncwise_assignments');
      if (assignments) {
        const parsed = JSON.parse(assignments);
        if (Array.isArray(parsed)) return { tasks: parsed.slice(0, 20) };
      }
    } catch { /* ignore */ }
    return {};
  };

  const sendMessage = async (messageText) => {
    const trimmed = (messageText || input).trim();
    if (!trimmed || isLoading) return;

    const userMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const context = getTaskContext();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-10),
          context,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: stripMarkdown(data.response),
          model: data.model,
          isLiteMode: data.isLiteMode,
        }]);
      } else if (res.status === 401) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'You need to complete setup first. Head to /setup to connect your D2L calendar!',
        }]);
      } else if (res.status === 429) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'You\'ve hit the chat limit. Give it a minute and try again.',
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Something went wrong. Try again in a sec?',
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Network error — check your connection and try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { label: "How's my week?", message: "How's my week looking?" },
    { label: 'Draft an email', message: 'Help me draft an email to a professor' },
    { label: 'Report a bug', message: 'I want to report an issue' },
  ];

  return (
    <>
      {/* Chat Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`chat-bubble-btn ${bubblePulse ? 'chat-bubble-pulse' : ''}`}
        aria-label={isOpen ? 'Close chat' : 'Open SyncWise chat'}
        title="Chat with SyncWise AI"
      >
        {isOpen ? (
          <span className="chat-bubble-icon">✕</span>
        ) : (
          <span className="chat-bubble-icon">💬</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <span className="chat-header-avatar">⚡</span>
              <div>
                <strong className="chat-header-title">SyncWise AI</strong>
                <span className="chat-header-status">
                  <span className="chat-status-dot" />
                  Online
                </span>
              </div>
            </div>
            <div className="chat-header-actions">
              {messages.length > 1 && (
                <button
                  onClick={() => { setMessages([defaultGreeting]); setHistoryLoaded(true); }}
                  className="chat-header-btn"
                  title="Clear chat"
                >
                  ↺
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="chat-header-btn">✕</button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages" ref={messageAreaRef}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-msg ${msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}`}
              >
                {msg.role === 'assistant' && (
                  <span className="chat-msg-avatar">⚡</span>
                )}
                <div className={`chat-msg-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                  {msg.content.split('\n').map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < msg.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-msg chat-msg-ai">
                <span className="chat-msg-avatar">⚡</span>
                <div className="chat-bubble-ai chat-msg-bubble">
                  <div className="chat-typing">
                    <span className="chat-typing-dot" />
                    <span className="chat-typing-dot" />
                    <span className="chat-typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 2 && (
            <div className="chat-quick-actions">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(action.message)}
                  className="chat-quick-btn"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="chat-input-area">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="chat-input"
              disabled={isLoading}
              maxLength={2000}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="chat-send-btn"
              style={{ opacity: (!input.trim() || isLoading) ? 0.4 : 1 }}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* All chat styles */}
      <style>{`
        /* ── Chat Bubble Button ── */
        .chat-bubble-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #5D0022 0%, #8B0033 100%);
          border: 3px solid #FBCE04;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(93, 0, 34, 0.5), 0 0 0 0 rgba(251, 206, 4, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .chat-bubble-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 28px rgba(93, 0, 34, 0.6), 0 0 0 4px rgba(251, 206, 4, 0.2);
        }
        .chat-bubble-pulse {
          animation: chatBubblePulse 2s ease-in-out infinite;
        }
        @keyframes chatBubblePulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(93, 0, 34, 0.5), 0 0 0 0 rgba(251, 206, 4, 0.4); }
          50% { box-shadow: 0 4px 20px rgba(93, 0, 34, 0.5), 0 0 0 8px rgba(251, 206, 4, 0); }
        }
        .chat-bubble-icon {
          font-size: 26px;
          color: #fff;
          line-height: 1;
        }

        /* ── Chat Window ── */
        .chat-window {
          position: fixed;
          bottom: 96px;
          right: 24px;
          width: 390px;
          max-width: calc(100vw - 48px);
          height: 540px;
          max-height: calc(100vh - 120px);
          background: #1a1a2e;
          border-radius: 20px;
          border: 2px solid #2d2d44;
          box-shadow: 0 12px 48px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          z-index: 9998;
          overflow: hidden;
          animation: chatSlideIn 0.25s ease-out;
        }
        @keyframes chatSlideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ── Header ── */
        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          background: linear-gradient(135deg, #5D0022 0%, #7A0030 100%);
          color: #fff;
          border-bottom: 3px solid #FBCE04;
        }
        .chat-header-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .chat-header-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(251, 206, 4, 0.2);
          border: 2px solid #FBCE04;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .chat-header-title {
          display: block;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.3px;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }
        .chat-header-status {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          opacity: 0.85;
        }
        .chat-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #34D399;
          display: inline-block;
          animation: chatStatusPulse 2s ease-in-out infinite;
        }
        @keyframes chatStatusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .chat-header-actions {
          display: flex;
          gap: 2px;
          align-items: center;
        }
        .chat-header-btn {
          background: rgba(255,255,255,0.15);
          border: none;
          color: #fff;
          font-size: 15px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.15s;
        }
        .chat-header-btn:hover {
          background: rgba(255,255,255,0.25);
        }

        /* ── Messages ── */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          scroll-behavior: smooth;
          background: #1a1a2e;
        }
        .chat-msg {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          max-width: 88%;
          animation: chatMsgIn 0.2s ease-out;
        }
        @keyframes chatMsgIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chat-msg-user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .chat-msg-ai {
          align-self: flex-start;
        }
        .chat-msg-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #5D0022, #8B0033);
          border: 2px solid #FBCE04;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          flex-shrink: 0;
        }
        .chat-msg-bubble {
          padding: 10px 14px;
          font-size: 13.5px;
          line-height: 1.55;
          word-break: break-word;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        /* Comic-inspired speech bubble for AI */
        .chat-bubble-ai {
          background: #2d2d44;
          color: #E5E7EB;
          border: 2px solid #3d3d55;
          border-radius: 18px 18px 18px 4px;
          box-shadow: 2px 2px 0px #13132a;
          position: relative;
        }

        /* User bubble */
        .chat-bubble-user {
          background: linear-gradient(135deg, #5D0022 0%, #7A0030 100%);
          color: #fff;
          border: 2px solid #5D0022;
          border-radius: 18px 18px 4px 18px;
          box-shadow: 2px 2px 0px rgba(93, 0, 34, 0.3);
        }

        /* ── Typing Indicator ── */
        .chat-typing {
          display: flex;
          gap: 5px;
          padding: 4px 2px;
        }
        .chat-typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #FBCE04;
          display: inline-block;
          animation: chatTypingBounce 1.4s infinite ease-in-out;
        }
        .chat-typing-dot:nth-child(2) { animation-delay: 0.16s; }
        .chat-typing-dot:nth-child(3) { animation-delay: 0.32s; }
        @keyframes chatTypingBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* ── Quick Actions ── */
        .chat-quick-actions {
          display: flex;
          gap: 6px;
          padding: 10px 14px;
          border-top: 1px solid #2d2d44;
          background: #1a1a2e;
        }
        .chat-quick-btn {
          flex: 1;
          padding: 7px 8px;
          font-size: 12px;
          background: #2d2d44;
          color: #FBCE04;
          border: 2px solid #3d3d55;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          transition: all 0.15s;
          box-shadow: 1px 1px 0px #13132a;
        }
        .chat-quick-btn:hover {
          background: #FBCE04;
          color: #1a1a2e;
          border-color: #FBCE04;
          transform: translateY(-1px);
          box-shadow: 2px 2px 0px rgba(251, 206, 4, 0.3);
        }

        /* ── Input Area ── */
        .chat-input-area {
          display: flex;
          gap: 8px;
          padding: 12px 14px;
          border-top: 2px solid #2d2d44;
          background: #1a1a2e;
        }
        .chat-input {
          flex: 1;
          padding: 10px 14px;
          border: 2px solid #3d3d55;
          border-radius: 12px;
          font-size: 13.5px;
          outline: none;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          transition: border-color 0.15s;
          background: #2d2d44;
          color: #E5E7EB;
        }
        .chat-input::placeholder {
          color: #94A3B8;
        }
        .chat-input:focus {
          border-color: #FBCE04;
          background: #2d2d44;
        }
        .chat-send-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #5D0022 0%, #8B0033 100%);
          color: #fff;
          border: 2px solid #5D0022;
          cursor: pointer;
          font-size: 17px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s;
          box-shadow: 2px 2px 0px rgba(93, 0, 34, 0.3);
        }
        .chat-send-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 3px 3px 0px rgba(93, 0, 34, 0.3);
        }

        /* Chat is always dark themed — no separate dark mode needed */

        /* ── Mobile ── */
        @media (max-width: 480px) {
          .chat-window {
            right: 8px;
            bottom: 80px;
            width: calc(100vw - 16px);
            height: calc(100vh - 100px);
          }
          .chat-bubble-btn {
            bottom: 16px;
            right: 16px;
            width: 52px;
            height: 52px;
          }
        }
      `}</style>
    </>
  );
}
