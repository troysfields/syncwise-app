'use client';

// SyncWise AI Chat Widget — Tier 1
// Floating chat bubble in bottom-right corner
// Provides platform guidance, D2L setup help, and feature navigation

import { useState, useRef, useEffect } from 'react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hey! I\'m the SyncWise AI assistant. I can help you set up your D2L calendar, navigate the dashboard, or explain any feature. What do you need?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-10), // Send recent context
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          model: data.model,
          isLiteMode: data.isLiteMode,
        }]);
      } else if (res.status === 401) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'You need to complete setup first before using the chat. Head to /setup to connect your D2L calendar!',
        }]);
      } else if (res.status === 429) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'You\'ve hit the chat limit for now. Give it a few minutes and try again!',
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Hmm, something went wrong. Try again in a sec?',
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

  // Quick action buttons for common tasks
  const quickActions = [
    { label: 'Setup D2L', message: 'How do I connect my D2L calendar?' },
    { label: 'Features', message: 'What features does SyncWise have?' },
    { label: 'Privacy', message: 'Is my data safe?' },
  ];

  return (
    <>
      {/* Chat Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.bubble}
        aria-label={isOpen ? 'Close chat' : 'Open SyncWise AI chat'}
        title="Chat with SyncWise AI"
      >
        {isOpen ? (
          <span style={styles.bubbleIcon}>✕</span>
        ) : (
          <span style={styles.bubbleIcon}>💬</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={styles.window}>
          {/* Header */}
          <div style={styles.header}>
            <div>
              <strong style={styles.headerTitle}>SyncWise AI</strong>
              <span style={styles.headerSubtitle}>Platform Guide</span>
            </div>
            <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>✕</button>
          </div>

          {/* Messages */}
          <div style={styles.messageArea}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  ...styles.messageBubble,
                  ...(msg.role === 'user' ? styles.userBubble : styles.assistantBubble),
                }}
              >
                <div style={styles.messageText}>
                  {msg.content.split('\n').map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < msg.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
                {msg.isLiteMode && (
                  <span style={styles.liteBadge}>lite mode</span>
                )}
              </div>
            ))}
            {isLoading && (
              <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
                <div style={styles.typing}>
                  <span style={styles.dot}>●</span>
                  <span style={{ ...styles.dot, animationDelay: '0.2s' }}>●</span>
                  <span style={{ ...styles.dot, animationDelay: '0.4s' }}>●</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions (shown when few messages) */}
          {messages.length <= 2 && (
            <div style={styles.quickActions}>
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(action.message);
                    setTimeout(() => sendMessage(), 0);
                    setInput('');
                    // Directly send
                    const userMsg = { role: 'user', content: action.message };
                    setMessages(prev => [...prev, userMsg]);
                    setIsLoading(true);
                    fetch('/api/chat', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ message: action.message, history: messages }),
                    })
                      .then(r => r.json())
                      .then(data => {
                        if (data.success) {
                          setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
                        }
                      })
                      .catch(() => {})
                      .finally(() => setIsLoading(false));
                  }}
                  style={styles.quickBtn}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div style={styles.inputArea}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about SyncWise..."
              style={styles.input}
              disabled={isLoading}
              maxLength={2000}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              style={{
                ...styles.sendBtn,
                opacity: (!input.trim() || isLoading) ? 0.4 : 1,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Typing animation CSS */}
      <style>{`
        @keyframes chatDotPulse {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
      `}</style>
    </>
  );
}

const styles = {
  bubble: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#5D0022',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(79, 70, 229, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  bubbleIcon: {
    fontSize: '24px',
    color: '#fff',
    lineHeight: 1,
  },
  window: {
    position: 'fixed',
    bottom: '92px',
    right: '24px',
    width: '380px',
    maxWidth: 'calc(100vw - 48px)',
    height: '520px',
    maxHeight: 'calc(100vh - 120px)',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 9998,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#5D0022',
    color: '#fff',
  },
  headerTitle: {
    fontSize: '1rem',
    display: 'block',
  },
  headerSubtitle: {
    fontSize: '0.75rem',
    opacity: 0.8,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  messageArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '0.875rem',
    lineHeight: '1.5',
    wordBreak: 'break-word',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#5D0022',
    color: '#fff',
    borderBottomRightRadius: '4px',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    color: '#1F2937',
    borderBottomLeftRadius: '4px',
  },
  messageText: {
    margin: 0,
  },
  liteBadge: {
    display: 'inline-block',
    fontSize: '0.65rem',
    color: '#9CA3AF',
    marginTop: '4px',
  },
  typing: {
    display: 'flex',
    gap: '4px',
    padding: '4px 0',
  },
  dot: {
    fontSize: '12px',
    color: '#9CA3AF',
    animation: 'chatDotPulse 1.4s infinite',
  },
  quickActions: {
    display: 'flex',
    gap: '8px',
    padding: '8px 16px',
    borderTop: '1px solid #F3F4F6',
  },
  quickBtn: {
    flex: 1,
    padding: '6px 10px',
    fontSize: '0.75rem',
    backgroundColor: '#FDF2F4',
    color: '#5D0022',
    border: '1px solid #E8B4BF',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  inputArea: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid #E5E7EB',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #D1D5DB',
    borderRadius: '10px',
    fontSize: '0.875rem',
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: '#5D0022',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
