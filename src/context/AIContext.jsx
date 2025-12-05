// src/context/AIContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const AIContext = createContext();

export function AIProvider({ children }) {
  const { user } = useAuth();
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessages, setAIMessages] = useState([]);
  const [isAIThinking, setIsAIThinking] = useState(false);

  useEffect(() => {
    if (user) {
      initializeAI();
    }
  }, [user]);

  function initializeAI() {
    setAIMessages([{
      role: 'assistant',
      content: '👋 Hi! I\'m your Universal Sleep & Routine Assistant. I can help you:\n\n• Log sleep: "I\'m going to sleep" or "I woke up"\n• Manage routines: "Add meditation tomorrow at 7 AM"\n• Track progress: "Show my sleep stats"\n• Get insights: "Analyze my sleep patterns"\n\nWhat would you like to do?'
    }]);
  }

  const value = {
    showAIChat,
    setShowAIChat,
    aiMessages,
    setAIMessages,
    isAIThinking,
    setIsAIThinking
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within AIProvider');
  }
  return context;
}
