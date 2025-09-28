import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import apiService from '../services/apiService';
import { v4 as uuidv4 } from 'uuid';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(`session-${Date.now()}`);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: uuidv4(),
        role: 'assistant',
        content: 'Hello! I\'m your wildfire risk assistant. I can help you understand current fire conditions, analyze weather impacts, and provide safety recommendations. How can I assist you?',
        timestamp: new Date().toISOString()
      }]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await apiService.sendChatMessage(
        userMessage.content,
        sessionId.current
      );

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        fire_risk_data: response.fire_risk_data
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed right-0 top-0 h-full bg-white shadow-2xl transition-all duration-300 z-50 ${
      isMinimized ? 'w-16' : 'w-96'
    }`}>
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 flex justify-between items-center">
        {!isMinimized && (
          <h3 className="font-semibold text-lg">AI Fire Assistant</h3>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-white/20 p-1 rounded"
          >
            {isMinimized ? '◀' : '▶'}
          </button>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded">
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 h-[calc(100vh-140px)]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
              >
                <div
                  className={`inline-block max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* --- THIS BLOCK WAS REMOVED ---
                  {message.fire_risk_data && (
                    <div className="mt-2 p-2 bg-white/20 rounded text-xs">
                      <p>Risk: {message.fire_risk_data.risk_level}</p>
                    </div>
                  )}
                  */}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-left">
                <div className="inline-block bg-gray-100 p-3 rounded-lg">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about fire risks..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatPanel;
