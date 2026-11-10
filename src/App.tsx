import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowDown,
  ArrowUpRight,
  Compass,
  Globe2,
  MapPin,
  Send,
  Sparkles,
  WandSparkles,
} from 'lucide-react'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const openingMessage: ChatMessage = {
  role: 'assistant',
  content:
    "Hi, I'm your travel companion. Tell me what kind of trip you're dreaming about, and we'll shape it into something that feels like yours.",
}

const starterIdeas = [
  'A long weekend by the sea',
  'Find me a quiet food city',
  'Plan a first trip to Japan',
]

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([openingMessage])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const endOfMessages = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isSending])

  async function requestReply(conversation: ChatMessage[]) {
    if (isSending) return
    setError('')
    setIsSending(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation }),
      })
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('The chat service returned an unexpected response. Check the Vercel deployment and API function logs.')
      }
      const result = (await response.json()) as { reply?: string; error?: string }
      if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.')
      if (!result.reply) throw new Error('The travel guide returned an empty reply. Try again.')
      setMessages([...conversation, { role: 'assistant', content: result.reply }])
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to reach the travel guide.')
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  async function sendMessage(text: string) {
    const content = text.trim()
    if (!content || isSending) return
    const nextMessages = [...messages, { role: 'user' as const, content }]
    setMessages(nextMessages)
    setDraft('')
    await requestReply(nextMessages)
  }

  function retryLastMessage() {
    if (messages.at(-1)?.role === 'user') void requestReply(messages)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(draft)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage(draft)
    }
  }

  function startFreshChat() {
    setMessages([openingMessage])
    setError('')
    setDraft('')
    inputRef.current?.focus()
  }

  const hasUserMessage = messages.some((message) => message.role === 'user')

  return (
    <main className="app-shell">
      <aside className="guide-panel" aria-label="Travel inspiration">
        <div className="guide-topline">
          <a className="brand" href="#home" aria-label="Wayfarer home">
            <span className="brand-mark"><Compass size={21} strokeWidth={1.8} /></span>
            <span>wayfarer<span className="brand-period">.</span></span>
          </a>
          <span className="edition-label">YOUR TRAVEL DESK</span>
        </div>

        <div className="guide-copy">
          <span className="eyebrow"><Sparkles size={13} /> A LITTLE MORE WONDER</span>
          <h1>Go somewhere<br />that stays with you.</h1>
          <p>Good trips start with a good question. Let’s find yours.</p>
        </div>

        <div className="destination-photo" role="img" aria-label="A coastal village overlooking the Mediterranean Sea">
          <div className="photo-caption">
            <span>THE MEDITERRANEAN, SLOWLY</span>
            <span className="photo-arrow"><ArrowUpRight size={17} /></span>
          </div>
        </div>

        <div className="guide-bottom">
          <div className="today-note">
            <div className="note-icon"><MapPin size={17} /></div>
            <div>
              <span className="note-label">A good place to begin</span>
              <p>Tell me what matters most on this trip.</p>
            </div>
          </div>
          <div className="panel-footer">
            <Globe2 size={14} /> Thoughtful travel, wherever you’re headed
          </div>
        </div>
      </aside>

      <section className="chat-panel" aria-label="Travel planning chat">
        <header className="chat-header">
          <div className="guide-identity">
            <span className="guide-avatar"><WandSparkles size={18} /></span>
            <div className="guide-name-wrap">
              <strong>Your travel guide</strong>
              <span><i className="online-dot" /> Here to help you explore</span>
            </div>
          </div>
          <div className="header-actions">
            <span className="privacy-note"><span className="privacy-dot" /> NOT SAVED</span>
            <button className="new-chat-button" type="button" onClick={startFreshChat} title="Start a new chat" disabled={isSending}>
              <span className="plus-icon">+</span><span className="new-chat-label">New chat</span>
            </button>
          </div>
        </header>

        <div className="conversation" aria-live="polite" aria-busy={isSending}>
          <div className="conversation-inner">
            <div className="date-divider"><span>YOUR NEXT CHAPTER</span></div>
            <div className="message-row assistant-row">
              <span className="message-avatar"><WandSparkles size={16} /></span>
              <div className="message-content">
                <span className="message-author">WAYFARER <span>·</span> TRAVEL GUIDE</span>
                <div className="assistant-bubble">{openingMessage.content}</div>
              </div>
            </div>

            {!hasUserMessage && (
              <div className="starter-block">
                <span className="starter-label">A few places to start</span>
                <div className="starter-list">
                  {starterIdeas.map((idea, index) => (
                    <button className="starter-prompt" type="button" key={idea} onClick={() => void sendMessage(idea)}>
                      <span className={`starter-number starter-number-${index + 1}`}>0{index + 1}</span>
                      <span>{idea}</span>
                      <ArrowUpRight className="starter-arrow" size={15} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.slice(1).map((message, index) => (
              <div className={`message-row ${message.role === 'user' ? 'user-row' : 'assistant-row'}`} key={`${index}-${message.role}`}>
                {message.role === 'assistant' && <span className="message-avatar"><WandSparkles size={16} /></span>}
                <div className="message-content">
                  {message.role === 'assistant' && <span className="message-author">WAYFARER <span>·</span> TRAVEL GUIDE</span>}
                  <div className={message.role === 'user' ? 'user-bubble' : 'assistant-bubble'}>{message.content}</div>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="message-row assistant-row">
                <span className="message-avatar"><WandSparkles size={16} /></span>
                <div className="message-content">
                  <span className="message-author">WAYFARER <span>·</span> TRAVEL GUIDE</span>
                  <div className="typing-bubble"><i /><i /><i /><span>Finding your bearings</span></div>
                </div>
              </div>
            )}

            {error && (
              <div className="error-message" role="alert">
                <span>{error}</span>
                <button type="button" onClick={retryLastMessage}>Try again</button>
              </div>
            )}
            <div ref={endOfMessages} />
          </div>
        </div>

        <div className="composer-wrap">
          <div className="conversation-hint"><ArrowDown size={13} /> Your itinerary takes shape as we chat</div>
          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Where would you love to go?"
              aria-label="Write a message to your travel guide"
              rows={1}
              maxLength={4000}
              disabled={isSending}
            />
            <button className="send-button" type="submit" disabled={!draft.trim() || isSending} aria-label="Send message" title="Send message">
              <Send size={17} />
            </button>
          </form>
          <div className="composer-footnote"><span>Thoughtful ideas, tailored to you.</span><span>ENTER TO SEND <kbd>↵</kbd></span></div>
        </div>
      </section>
    </main>
  )
}
