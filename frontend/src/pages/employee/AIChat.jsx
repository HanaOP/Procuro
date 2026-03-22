import { useMemo, useRef, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import api from '../../api/axiosInstance';

const QUICK_PROMPTS = [
  'I need one Dell laptop with i7, 16GB RAM, 512GB SSD by next monday',
  'Need 3 ergonomic office chairs with mesh back by 2026-04-10',
  'Buy 2 printers, delivery to Block A',
];

const WELCOME_MESSAGE =
  'Hello! I can help you create a purchase request quickly. Tell me the item, quantity, specifications, and deadline. I will estimate pricing automatically.';

function createMessage(role, text) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    createdAt: new Date(),
  };
}

export default function AIChat() {
  const [messages, setMessages] = useState([
    createMessage('bot', WELCOME_MESSAGE),
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatListRef = useRef(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  const scrollToBottom = () => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  };

  const pushMessage = (message) => {
    setMessages((prev) => {
      const next = [...prev, message];
      setTimeout(scrollToBottom, 0);
      return next;
    });
  };

  const sendMessage = async (presetText) => {
    const text = (presetText ?? input).trim();
    if (!text || isSending) return;

    pushMessage(createMessage('user', text));
    setInput('');
    setIsSending(true);

    try {
      // axiosInstance already injects Authorization from procuro_auth.
      // Use /api/chat path through the shared client to align with existing API flows.
      const { data } = await api.post('/api/chat', { message: text });
      const reply = data?.reply || 'I could not understand that. Please try again.';
      pushMessage(createMessage('bot', reply));
    } catch (err) {
      const backendMessage = err?.response?.data?.reply || err?.response?.data?.error;
      pushMessage(
        createMessage(
          'bot',
          backendMessage || 'I am having trouble connecting right now. Please try again.'
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const startNewRequest = async () => {
    if (isSending) return;

    setInput('');
    setMessages([createMessage('bot', WELCOME_MESSAGE)]);
    setIsSending(true);

    try {
      const { data } = await api.post('/api/chat', { message: 'new request' });
      const reply = data?.reply || 'Started a new request. What item do you need now?';
      pushMessage(createMessage('bot', reply));
    } catch {
      pushMessage(
        createMessage('bot', 'Started a new request locally. Tell me what item you need.')
      );
    } finally {
      setIsSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <header>
          <p className="section-title mb-1">AI Assistant</p>
          <h1 className="page-title">Smart Procurement Assistant</h1>
          <p className="text-sm text-slate-400 mt-2">
            Describe your request naturally. I will collect missing details and submit it for you.
          </p>
        </header>

        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="section-title mb-0">Quick Prompts</p>
            <button
              type="button"
              className="btn-secondary text-xs px-3 py-1.5"
              onClick={startNewRequest}
              disabled={isSending}
            >
              Start New Request
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="btn-secondary"
                onClick={() => sendMessage(prompt)}
                disabled={isSending}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div
            ref={chatListRef}
            className="h-[58vh] overflow-y-auto bg-surface-900 px-4 py-4 space-y-3"
            aria-live="polite"
          >
            {messages.map((msg) => (
              <article key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] border px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-100'
                      : 'bg-surface-800 border-surface-600 text-slate-200'
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-widest font-mono mb-1 text-slate-500">
                    {msg.role === 'user' ? 'You' : 'Assistant'}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </article>
            ))}

            {isSending && (
              <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">Assistant is thinking...</div>
            )}
          </div>

          <div className="border-t border-surface-700 bg-surface-900 p-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Example: Need 2 laptops, Dell i7 16GB RAM 512GB SSD, by next friday, deliver to IT lab"
                className="input-field min-h-[84px]"
                rows={2}
              />
              <button type="button" className="btn-primary h-[44px]" disabled={!canSend} onClick={() => sendMessage()}>
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}