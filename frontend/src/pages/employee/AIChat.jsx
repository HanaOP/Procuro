import { useState } from "react";

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages(prev => [...prev, { user: input }]);

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();

      setMessages(prev => [...prev, { bot: data.reply }]);

    } catch (err) {
      setMessages(prev => [...prev, { bot: "Server error" }]);
    }

    setInput("");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>AI Purchase Assistant</h2>

      <div style={{ height: "300px", overflowY: "scroll", border: "1px solid #ccc", marginBottom: "10px" }}>
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.user && <p><b>You:</b> {msg.user}</p>}
            {msg.bot && <p><b>Bot:</b> {msg.bot}</p>}
          </div>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your request..."
      />

      <button onClick={sendMessage}>Send</button>
    </div>
  );
}