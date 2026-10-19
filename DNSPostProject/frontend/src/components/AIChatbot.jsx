import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Send, X, RotateCcw, Sparkles, AlertCircle, LoaderCircle } from 'lucide-react';
import { apiFetch } from '../services/api';

const STARTER_MESSAGES = [
    {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I am your AI Study Assistant. Ask me to explain a concept, review an algorithm, or help you prepare for an exam. I cannot help solve an active examination question.'
    }
];

const QUICK_PROMPTS = [
    'Explain DBMS normalization',
    'Help me understand binary search',
    'Explain SQL joins',
    'Explain operating system scheduling'
];

function renderInlineMarkdown(text) {
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return escaped
        .replace(/(`)([^`]+)\1/g, '<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">$2</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-blue-600 hover:underline">$1</a>');
}

function MarkdownContent({ content }) {
    const lines = content.split(/\r?\n/);
    const blocks = [];
    let paragraph = [];
    let listType = null;
    let listItems = [];

    const flushParagraph = () => {
        if (paragraph.length > 0) {
            blocks.push(<p key={`p-${blocks.length}`} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(paragraph.join(' ')) }} />);
            paragraph = [];
        }
    };

    const flushList = () => {
        if (listType) {
            const Tag = listType === 'ordered' ? 'ol' : 'ul';
            blocks.push(
                <Tag key={`list-${blocks.length}`} className={`mb-2 ${listType === 'ordered' ? 'list-decimal' : 'list-disc'} space-y-1 pl-5`}>
                    {listItems.map((item, index) => (
                        <li key={`${item}-${index}`} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(item) }} />
                    ))}
                </Tag>
            );
            listType = null;
            listItems = [];
        }
    };

    for (let index = 0; index < lines.length; index++) {
        const trimmed = lines[index].trim();
        if (!trimmed) {
            flushParagraph();
            flushList();
            continue;
        }

        if (trimmed.startsWith('```')) {
            flushParagraph();
            flushList();
            const codeLines = [];
            let cursor = index + 1;
            while (cursor < lines.length && !lines[cursor].trim().startsWith('```')) {
                codeLines.push(lines[cursor]);
                cursor++;
            }
            blocks.push(
                <pre key={`code-${blocks.length}`} className="mb-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
                    <code>{codeLines.join('\n')}</code>
                </pre>
            );
            index = cursor;
            continue;
        }

        if (/^#{1,6}\s/.test(trimmed)) {
            flushParagraph();
            flushList();
            const level = trimmed.match(/^#+/)[0].length;
            const heading = trimmed.replace(/^#{1,6}\s/, '');
            const HeadingTag = `h${Math.min(level, 6)}`;
            blocks.push(<HeadingTag key={`h-${blocks.length}`} className="mb-1 mt-2 font-semibold text-slate-800">{heading}</HeadingTag>);
            return;
        }

        if (/^[-*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
            flushParagraph();
            if (listType !== (trimmed.match(/^\d+\./) ? 'ordered' : 'unordered')) {
                flushList();
                listType = trimmed.match(/^\d+\./) ? 'ordered' : 'unordered';
            }
            listItems.push(trimmed.replace(/^([-*]\s|\d+\.\s)/, ''));
            continue;
        }

        paragraph.push(trimmed);
    }

    flushParagraph();
    flushList();
    return <div className="space-y-1">{blocks}</div>;
}

export function AIChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState(STARTER_MESSAGES);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [lastFailedPrompt, setLastFailedPrompt] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (isOpen && inputRef.current) inputRef.current.focus();
    }, [messages, isOpen, isLoading]);

    const sendMessage = useCallback(async (overrideText) => {
        const text = (typeof overrideText === 'string' ? overrideText : input).trim();
        if (!text || isLoading) return;

        const userMessage = { id: `user-${Date.now()}`, role: 'user', content: text };
        setMessages((current) => [...current, userMessage]);
        setInput('');
        setError('');
        setIsLoading(true);

        try {
            const history = messages
                .filter((message) => message.role !== 'system')
                .slice(-6)
                .map(({ role, content }) => ({ role, content }));

            const data = await apiFetch('/api/ai/chat', {
                method: 'POST',
                body: JSON.stringify({ message: text, history })
            });

            if (!data.success || !data.reply) {
                throw new Error('The AI assistant returned no response.');
            }

            setMessages((current) => [
                ...current,
                { id: `assistant-${Date.now()}`, role: 'assistant', content: data.reply }
            ]);
            setLastFailedPrompt('');
        } catch (err) {
            setLastFailedPrompt(text);
            setError(err.message || 'AI assistant is temporarily unavailable. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages]);

    useEffect(() => {
        const handleCustomPrompt = (event) => {
            const prompt = event.detail?.prompt;
            if (prompt) {
                setIsOpen(true);
                sendMessage(prompt);
            }
        };
        window.addEventListener('ai-ask-prompt', handleCustomPrompt);
        return () => window.removeEventListener('ai-ask-prompt', handleCustomPrompt);
    }, [sendMessage]);

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages(STARTER_MESSAGES);
        setError('');
        setInput('');
    };

    return (
        <>
            <button
                id="ai-chatbot-toggle"
                onClick={() => setIsOpen((current) => !current)}
                aria-label="Open AI Study Assistant"
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
            >
                {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
                {!isOpen && <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />}
            </button>

            {isOpen && (
                <div id="ai-chatbot-window" className="fixed bottom-24 right-6 z-50 flex h-[520px] max-h-[80vh] w-[32rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                    <div className="flex shrink-0 items-center justify-between bg-blue-600 px-4 py-3.5 text-white">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10"><Sparkles className="h-4 w-4 text-blue-100" /></div>
                            <div>
                                <h3 className="text-sm font-semibold">AI Study Assistant</h3>
                                <p className="text-[11px] text-blue-100">Academic Clarification & Guidance</p>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={clearChat} title="Reset conversation" aria-label="Reset conversation" className="rounded-md p-1.5 text-blue-100 hover:bg-white/10 hover:text-white"><RotateCcw className="h-4 w-4" /></button>
                            <button onClick={() => setIsOpen(false)} title="Close" aria-label="Close chat" className="rounded-md p-1.5 text-blue-100 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
                        {messages.map((message) => (
                            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'items-start gap-2'}`}>
                                {message.role === 'assistant' && (
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Bot className="h-3.5 w-3.5" /></div>
                                )}
                                <div className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed break-words ${message.role === 'user' ? 'rounded-br-xs bg-blue-600 text-white' : 'rounded-bl-xs border border-slate-200 bg-white text-slate-800 shadow-sm'}`}>
                                    {message.role === 'assistant' && message.content ? (
                                        <MarkdownContent content={message.content} />
                                    ) : message.content}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-start gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Bot className="h-3.5 w-3.5" /></div>
                                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                    <LoaderCircle className="h-4 w-4 animate-spin text-blue-600" />
                                    <span className="text-xs font-medium text-slate-600">AI is thinking...</span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="m-1 flex items-start justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                                    <div>
                                        <p className="font-semibold">
                                            {error.includes("active examination") ? "Academic Integrity Policy" : "AI Assistant Notice"}
                                        </p>
                                        <p className="mt-0.5 text-red-600 leading-relaxed">{error}</p>
                                    </div>
                                </div>
                                {lastFailedPrompt && !error.includes("active examination") && (
                                    <button
                                        type="button"
                                        onClick={() => sendMessage(lastFailedPrompt)}
                                        className="shrink-0 px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-red-200 text-[11px] font-medium transition-colors"
                                    >
                                        Retry
                                    </button>
                                )}
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {messages.length === 1 && !isLoading && (
                        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-4 py-2">
                            {QUICK_PROMPTS.map((prompt) => (
                                <button key={prompt} onClick={() => sendMessage(prompt)} className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-left text-[11px] font-medium text-blue-700 hover:bg-blue-100">{prompt}</button>
                            ))}
                        </div>
                    )}

                    <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white p-3">
                        <textarea
                            ref={inputRef}
                            id="ai-chatbot-input"
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask an academic question..."
                            rows={1}
                            disabled={isLoading}
                            className="min-h-10 flex-1 resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                        />
                        <button id="ai-chatbot-send" onClick={() => sendMessage()} disabled={!input.trim() || isLoading} aria-label="Send message" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /></button>
                    </div>
                </div>
            )}
        </>
    );
}

export default AIChatbot;
