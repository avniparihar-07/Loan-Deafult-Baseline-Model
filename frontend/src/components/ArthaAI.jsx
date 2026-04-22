import React, { useState, useEffect, useRef } from 'react';

export default function ArthaAI({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! I am Artha, your GroundZero AI assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let reply = "I can analyze your credit score and suggest ways to improve your loan eligibility. Would you like to see a breakdown of your risk factors?";
      if (input.toLowerCase().includes('invest')) {
        reply = "Based on your current profile, I recommend diversifying into low-risk SGBs and index funds to hedge against market volatility.";
      }
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    }, 1500);
  };

  return (
    <div className={`ai-panel ${isOpen ? 'open' : ''}`}>
      <div className="ai-header">
        <div className="ai-avatar">
          <div className="ai-avatar-ring" />
          <span>🤖</span>
        </div>
        <div className="ai-head-info">
          <div className="ai-name">Artha AI</div>
          <div className="ai-status"><div className="ai-status-dot" />Online & Analyzing</div>
        </div>
        <button className="ai-close" onClick={onClose}>✕</button>
      </div>

      <div className="ai-messages">
        {messages.map((m, i) => (
          <div key={i} className={`ai-msg ${m.role}`}>
            <div className="ai-msg-av">{m.role === 'bot' ? '🤖' : 'UM'}</div>
            <div className="ai-msg-bubble">{m.text}</div>
          </div>
        ))}
        {isTyping && (
          <div className="ai-msg bot">
            <div className="ai-msg-av">🤖</div>
            <div className="ai-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="ai-suggestions">
        <button className="ai-sug-btn" onClick={() => setInput("How to improve my score?")}>Improve Score</button>
        <button className="ai-sug-btn" onClick={() => setInput("Best investment for me?")}>Investment Tips</button>
      </div>

      <div className="ai-input-row">
        <input 
          className="ai-input" 
          placeholder="Ask Artha..." 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button className="ai-send" onClick={send}>➤</button>
      </div>
    </div>
  );
}
