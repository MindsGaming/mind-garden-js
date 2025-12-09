import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Brain, User } from 'lucide-react';
import { UQRC_LLM } from '@/lib/uqrc';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  tags?: string[];
  timestamp: number;
}

interface ChatInterfaceProps {
  llm: UQRC_LLM;
}

export const ChatInterface = ({ llm }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      tags: llm.tag(input),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsProcessing(true);

    await new Promise(resolve => setTimeout(resolve, 300));

    const response = llm.respond(currentInput);
    const assistantMessage: Message = {
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsProcessing(false);
  };

  return (
    <Card className="flex flex-col h-[600px] bg-card shadow-card">
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Brain className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">UQRC Chat</h2>
        <span className="text-xs text-muted-foreground ml-auto mono">
          Phase: {llm.getStats().phase}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground p-8">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Dead state initialized. Say something to begin learning.</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary" />
              </div>
            )}
            
            <div className={`flex flex-col gap-1 max-w-[80%]`}>
              <div
                className={`px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'glass-card'
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
              
              {message.tags && message.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {message.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs bg-secondary rounded-full mono text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div className="glass-card px-4 py-2 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type something to teach or test..."
            disabled={isProcessing}
            className="bg-input"
          />
          <Button onClick={handleSend} disabled={isProcessing || !input.trim()} size="icon" className="shadow-glow">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};