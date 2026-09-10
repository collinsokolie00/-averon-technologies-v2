import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

import { EMMY_OPEN_EVENT, type EmmyPromptDetail } from "../../lib/emmyAssistant";
import { averonApi } from "../../lib/averonApi";

const capabilities = [
  "Which service fits my project?",
  "How do I request a quote?",
  "Where can I see your products?",
  "How does the customer portal unlock?",
];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function assistantMessage(content: string): ChatMessage {
  return { role: "assistant", content };
}

export default function EmmyAssistant() {
  const panelRef = useRef<HTMLElement>(null);
  const chatEpochRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  function closeAndReset() {
    chatEpochRef.current += 1;
    setOpen(false);
    setPrompt("");
    setMessages([]);
    setLoading(false);
  }

  useEffect(() => {
    function handleOpen(event: Event) {
      const { prompt: nextPrompt, response } = (event as CustomEvent<EmmyPromptDetail>).detail;
      setPrompt(nextPrompt);
      if (response) {
        setMessages((current) => [...current, assistantMessage(response)].slice(-10));
      }
      setOpen(true);
    }

    window.addEventListener(EMMY_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(EMMY_OPEN_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (panelRef.current?.contains(event.target as Node)) return;
      closeAndReset();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  async function handleSend(nextPrompt = prompt) {
    const message = nextPrompt.trim();
    if (!message) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setPrompt("");
    setLoading(true);
    const chatEpoch = chatEpochRef.current;

    try {
      const response = await averonApi.emmy.sendMessage({ message, history: messages.slice(-8) });
      if (chatEpoch !== chatEpochRef.current) return;
      setMessages((current) => [...current, assistantMessage(response.data.reply)].slice(-10));
    } catch (caught) {
      if (chatEpoch !== chatEpochRef.current) return;
      setMessages((current) => [...current, assistantMessage(caught instanceof Error ? caught.message : "Emmy is not reachable yet.")].slice(-10));
    } finally {
      if (chatEpoch === chatEpochRef.current) setLoading(false);
    }
  }

  return (
    <aside ref={panelRef} className={open ? "emmy-panel open" : "emmy-panel"} aria-label="Emmy assistant preview">
      <button className="emmy-launcher" type="button" onClick={() => open ? closeAndReset() : setOpen(true)} aria-expanded={open} aria-label={open ? "Close Emmy" : "Open Emmy"}>
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {open && (
        <div className="emmy-window">
          <div className="emmy-panel-header">
            <div>
              <strong>Averon Assistant</strong>
              <small>Averon knowledge</small>
            </div>
          </div>

          <div className="emmy-thread" aria-live="polite">
            {messages.map((message, index) => (
              <p className={`emmy-bubble ${message.role}`} key={`${message.role}-${index}`}>
                {message.content}
              </p>
            ))}
          </div>

          {messages.length === 0 && <div className="emmy-capabilities">
            {capabilities.map((capability) => (
              <button type="button" key={capability} onClick={() => handleSend(capability)} disabled={loading}>
                {capability}
              </button>
            ))}
          </div>}

          <div className="emmy-message-box">
            <input
              aria-label="Ask Emmy"
              placeholder="Ask Emmy..."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <button type="button" title="Send" onClick={() => handleSend()} disabled={loading}>
              <Send size={15} />
            </button>
          </div>

          <button className="emmy-human-button" type="button">
            Escalate to Human Support
          </button>
        </div>
      )}
    </aside>
  );
}
