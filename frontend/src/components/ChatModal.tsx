'use client';

import { useState, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface FireRiskData {
  risk_level?: string;
  risk_score?: number;
  station?: {
    station_name?: string;
    distance_miles?: number;
  };
  weather?: {
    temperature?: number;
    relative_humidity?: number;
    wind_speed?: number;
  };
  warnings?: string[];
}

interface ChatResponse {
  response: string;
  session_id: string;
  location_used: {
    latitude: number;
    longitude: number;
    name: string;
  };
  fire_risk_data?: FireRiskData;
  sources: string[];
}

export default function ChatPanel({ isOpen, onToggle }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`chat-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message when chat opens
      setMessages([
        {
          role: 'assistant',
          content: "Hello! I'm your wildfire risk assessment assistant. I can help you understand current fire danger conditions, weather impacts on fire risk, and provide safety recommendations. What would you like to know about fire safety in your area?",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiClient.chat({
        message: userMessage.content,
        session_id: sessionId,
      });

      if (response.data) {
        const chatData = response.data as ChatResponse;
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: chatData.response,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Show fire risk summary if available
        if (chatData.fire_risk_data) {
          const riskData = chatData.fire_risk_data;
          let riskSummary = '';
          
          if (riskData.risk_level) {
            riskSummary += `🔥 **Current Risk Level: ${riskData.risk_level}**`;
            if (riskData.risk_score !== undefined) {
              riskSummary += ` (Score: ${riskData.risk_score}/100)`;
            }
            riskSummary += '\n';
          }

          if (riskData.station) {
            riskSummary += `📍 Data from ${riskData.station.station_name}`;
            if (riskData.station.distance_miles) {
              riskSummary += ` (~${riskData.station.distance_miles} miles away)`;
            }
            riskSummary += '\n';
          }

          if (riskData.weather) {
            const weather = riskData.weather;
            const weatherParts = [];
            if (weather.temperature) weatherParts.push(`${weather.temperature}°F`);
            if (weather.relative_humidity) weatherParts.push(`${weather.relative_humidity}% humidity`);
            if (weather.wind_speed) weatherParts.push(`${weather.wind_speed} mph wind`);
            
            if (weatherParts.length > 0) {
              riskSummary += `🌡️ Current conditions: ${weatherParts.join(', ')}\n`;
            }
          }

          if (riskData.warnings && riskData.warnings.length > 0) {
            riskSummary += `⚠️ Warnings:\n${riskData.warnings.map(w => `• ${w}`).join('\n')}\n`;
          }

          if (riskSummary.trim()) {
            const riskMessage: ChatMessage = {
              role: 'assistant',
              content: `**Fire Risk Summary:**\n${riskSummary.trim()}`,
              timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, riskMessage]);
          }
        }
      } else {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${response.error || 'Unknown error'}. Please try again.`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I had trouble connecting to the server. Please check your connection and try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    try {
      await apiClient.clearChatSession(sessionId);
      setMessages([
        {
          role: 'assistant',
          content: "Chat cleared! How can I help you with wildfire risk assessment today?",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Error clearing chat:', error);
      // Clear locally even if server request fails
      setMessages([
        {
          role: 'assistant',
          content: "Chat cleared! How can I help you with wildfire risk assessment today?",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <div className={`fixed top-1/2 transform -translate-y-1/2 z-50 transition-all duration-300 ${
        isOpen ? 'right-96' : 'right-0'
      }`}>
        <button
          onClick={onToggle}
          className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-l-lg shadow-lg transition-colors duration-200"
          aria-label={isOpen ? "Close chat" : "Open chat"}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Chat Panel */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-orange-50">
            <h2 className="text-lg font-semibold text-gray-900">
              🔥 Wildfire Risk Assistant
            </h2>
            <button
              onClick={clearChat}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
            >
              Clear Chat
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  {message.timestamp && (
                    <div className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-orange-200' : 'text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about fire risk, safety recommendations..."
                className="flex-1 p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-orange-500 text-sm"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? '...' : 'Send'}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Enter to send • Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </>
  );
}