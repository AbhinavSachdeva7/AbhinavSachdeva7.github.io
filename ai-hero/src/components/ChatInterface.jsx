import { useState, useRef, useEffect, useCallback } from 'react';
import { sendMessage } from '../api/chat.js';
import { useRateLimit } from '../hooks/useRateLimit.js';

const SUGGESTION_CHIPS = [
  "What's your tech stack?",
  "Tell me about your AI research",
  "Are you open to work?",
  "What's your best project?",
];

export default function ChatInterface({ orbRef }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [greetingVisible, setGreetingVisible] = useState(true);
  const [streamingText, setStreamingText] = useState('');

  const threadRef = useRef(null);
  const inputRef = useRef(null);
  const { remaining, increment, isExhausted } = useRateLimit();

  // Auto-scroll thread to bottom when new content arrives
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  const handleSend = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;
    if (isExhausted) return;

    setInput('');
    setGreetingVisible(false);
    setIsLoading(true);
    setStreamingText('');

    // Snapshot prior conversation before adding the new user message.
    // This becomes the history for Call 1 in the worker.
    const history = messages;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: msg }]);

    // Signal orb to start responding state
    orbRef?.current?.respondStart();

    let accumulated = '';

    await sendMessage(
      msg,
      (token) => {
        accumulated += token;
        setStreamingText(accumulated);
      },
      () => {
        // Stream done — move accumulated text into messages
        setMessages(prev => [...prev, { role: 'assistant', text: accumulated }]);
        setStreamingText('');
        setIsLoading(false);
        orbRef?.current?.respondEnd();
        increment();
        inputRef.current?.focus();
      },
      (_err) => {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', text: "Sorry, I couldn't connect. Please try again in a moment!" },
        ]);
        setStreamingText('');
        setIsLoading(false);
        orbRef?.current?.respondEnd();
        inputRef.current?.focus();
      },
      history,
    );
  }, [input, messages, isLoading, isExhausted, orbRef, increment]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChip = (chip) => {
    if (!isLoading && !isExhausted) handleSend(chip);
  };

  return (
    <div className="chat-interface">
      {/* Greeting — visible until first message sent */}
      <div className={`chat-greeting ${greetingVisible ? 'visible' : 'hidden'}`}>
        <h1 className="greeting-name">
          Hi, I'm <span className="accent">Abhinav.</span>
        </h1>
        <p className="greeting-sub">AI &amp; Software Engineer.</p>
        <p className="greeting-cta">What do you want to know?</p>
      </div>

      {/* Message thread — visible after first send */}
      {messages.length > 0 && (
        <div className="chat-thread" ref={threadRef}>
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble chat-bubble--${m.role}`}>
              {m.text}
            </div>
          ))}

          {/* Streaming bubble */}
          {streamingText && (
            <div className="chat-bubble chat-bubble--assistant chat-bubble--streaming">
              {streamingText}
              <span className="cursor-blink">|</span>
            </div>
          )}

          {/* Typing indicator (shown while loading but before first token) */}
          {isLoading && !streamingText && (
            <div className="chat-bubble chat-bubble--assistant">
              <span className="typing-dots">
                <span /><span /><span />
              </span>
            </div>
          )}
        </div>
      )}

      {/* Input row */}
      <div className="chat-input-wrap">
        <div className={`chat-input-box ${isLoading ? 'loading' : ''}`}>
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder={isExhausted ? 'Daily limit reached — come back tomorrow!' : 'Ask me anything...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || isExhausted}
            maxLength={500}
            autoComplete="off"
          />
          <button
            className="chat-send-btn"
            onClick={() => handleSend()}
            disabled={isLoading || isExhausted || !input.trim()}
            aria-label="Send message"
          >
            {isLoading ? (
              <span className="send-spinner" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            )}
          </button>
        </div>

        {/* Messages remaining counter */}
        {remaining <= 5 && !isExhausted && (
          <p className="rate-hint">{remaining} message{remaining !== 1 ? 's' : ''} left today</p>
        )}
      </div>

      {/* Suggestion chips — shown while greeting is visible */}
      {greetingVisible && (
        <div className="chips-row">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              className="chip"
              onClick={() => handleChip(chip)}
              disabled={isLoading || isExhausted}
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
