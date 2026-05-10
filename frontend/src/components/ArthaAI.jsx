import React, { useState, useEffect, useRef } from 'react';

export default function ArthaAI({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Good day. I am Artha, your institutional financial assistant. How may I assist you with your risk profile or investment strategy today?' }
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
      let reply = "Based on our institutional risk models, I can provide a detailed breakdown of your credit factors. Would you like to proceed with a risk-weighted analysis?";
      if (input.toLowerCase().includes('invest')) {
        reply = "Current market conditions suggest a diversified allocation. Our models currently favor high-yield sovereign instruments and diversified index portfolios for your specific profile.";
      }
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    }, 1500);
  };

  return (
    <div className={`bank-ai-panel ${isOpen ? 'open' : ''}`}>
      <div className="ai-h">
        <div className="ai-h-brand">
          <div className="ai-h-logo">A</div>
          <div className="ai-h-info">
            <div className="ai-h-name">Artha Assistant</div>
            <div className="ai-h-status">Institutional Support • Active</div>
          </div>
        </div>
        <button className="ai-h-close" onClick={onClose}>✕</button>
      </div>

      <div className="ai-body">
        {messages.map((m, i) => (
          <div key={i} className={`ai-b-msg ${m.role}`}>
            <div className="ai-b-bubble">{m.text}</div>
          </div>
        ))}
        {isTyping && (
          <div className="ai-b-msg bot">
            <div className="ai-b-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="ai-footer">
        <div className="ai-f-suggestions">
          <button className="ai-f-sug" onClick={() => setInput("Evaluate my risk factors")}>Evaluate Risk</button>
          <button className="ai-f-sug" onClick={() => setInput("Portfolio recommendations")}>Portfolio Insights</button>
        </div>
        <div className="ai-f-input-row">
          <input
            className="ai-f-input"
            placeholder="Type your inquiry..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
          />
          <button className="ai-f-send" onClick={send}>Send</button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .bank-ai-panel {
          position: fixed; bottom: 100px; right: 40px; width: 400px; height: 550px;
          background: #fff; border-radius: 20px; box-shadow: 0 30px 90px rgba(10, 25, 49, 0.2);
          border: 1px solid rgba(10, 25, 49, 0.1); display: flex; flex-direction: column;
          z-index: 5000; transform: translateY(40px) scale(0.95); opacity: 0; pointer-events: none;
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1); overflow: hidden;
        }
        .bank-ai-panel.open { transform: translateY(0) scale(1); opacity: 1; pointer-events: all; }
        
        .ai-h { padding: 20px 24px; background: var(--navy); color: #fff; display: flex; align-items: center; justify-content: space-between; }
        .ai-h-brand { display: flex; align-items: center; gap: 12px; }
        .ai-h-logo { width: 32px; height: 32px; background: var(--gold); color: #fff; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-family: var(--font-serif); }
        .ai-h-name { font-size: 15px; font-weight: 700; }
        .ai-h-status { font-size: 10px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
        .ai-h-close { background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; opacity: 0.6; transition: 0.2s; }
        .ai-h-close:hover { opacity: 1; }

        .ai-body { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; background: #f8fafc; }
        .ai-b-msg { display: flex; width: 100%; }
        .ai-b-msg.user { justify-content: flex-end; }
        .ai-b-bubble { max-width: 85%; padding: 12px 16px; font-size: 14px; line-height: 1.5; border-radius: 12px; }
        .ai-b-msg.bot .ai-b-bubble { background: #fff; color: var(--navy); border: 1px solid rgba(10, 25, 49, 0.08); border-bottom-left-radius: 2px; }
        .ai-b-msg.user .ai-b-bubble { background: var(--navy); color: #fff; border-bottom-right-radius: 2px; }
        
        .ai-b-typing { display: flex; gap: 4px; padding: 12px 16px; background: #fff; border-radius: 12px; border: 1px solid rgba(10, 25, 49, 0.08); width: fit-content; }
        .ai-b-typing span { width: 6px; height: 6px; background: var(--gold); border-radius: 50%; animation: aiTyping 1.4s infinite; opacity: 0.4; }
        .ai-b-typing span:nth-child(2) { animation-delay: 0.2s; }
        .ai-b-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes aiTyping { 0%, 100% { opacity: 0.4; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } }

        .ai-footer { padding: 20px; background: #fff; border-top: 1px solid rgba(10, 25, 49, 0.06); }
        .ai-f-suggestions { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .ai-f-sug { padding: 6px 12px; background: var(--ice); border: 1px solid rgba(10, 25, 49, 0.06); border-radius: 6px; font-size: 11px; font-weight: 600; color: var(--navy); cursor: pointer; transition: 0.2s; }
        .ai-f-sug:hover { background: #fff; border-color: var(--gold); color: var(--gold); }
        
        .ai-f-input-row { display: flex; gap: 10px; }
        .ai-f-input { flex: 1; padding: 12px 16px; border: 1.5px solid rgba(10, 25, 49, 0.08); border-radius: 8px; font-size: 14px; outline: none; transition: 0.2s; }
        .ai-f-input:focus { border-color: var(--navy); }
        .ai-f-send { padding: 0 20px; background: var(--navy); color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .ai-f-send:hover { background: var(--navy-deep); }
      `}} />
    </div>
  );
}
