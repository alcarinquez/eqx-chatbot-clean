import { useState, useEffect, useRef } from 'react';
import './Chat.css';

// Logo image import (public folder, so use relative path in <img>)

const Chat = () => {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto-scroll to bottom when messages change, but only if user hasn't scrolled
  useEffect(() => {
    if (!userHasScrolled && isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, userHasScrolled, isLoading]);

  // Handle scroll events to detect user scrolling
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;

    let isUserScrolling = false;

    const handleScroll = () => {
      if (isUserScrolling) return; // Ignore programmatic scrolls
      
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
      
      // If user scrolls up from bottom during any time, disable auto-scroll
      if (!isAtBottom) {
        setUserHasScrolled(true);
      }
    };

    // Track when we're programmatically scrolling
    const originalScrollIntoView = messagesEndRef.current?.scrollIntoView;
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView = function(...args) {
        isUserScrolling = true;
        originalScrollIntoView?.apply(this, args);
        setTimeout(() => { isUserScrolling = false; }, 100);
      };
    }

    messagesContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      messagesContainer.removeEventListener('scroll', handleScroll);
      if (messagesEndRef.current && originalScrollIntoView) {
        messagesEndRef.current.scrollIntoView = originalScrollIntoView;
      }
    };
  }, [userHasScrolled]);

  // Reset scroll behavior when starting a new query
  useEffect(() => {
    if (isLoading) {
      setUserHasScrolled(false);
    }
  }, [isLoading]);

  const animateSystemResponse = (fullText) => {
    let index = 0;

    const interval = setInterval(() => {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.type !== 'bot') return prev;

        const updatedLastMessage = {
          ...lastMessage,
          text: fullText.slice(0, index + 1),
        };

        return [...prev.slice(0, -1), updatedLastMessage];
      });

      index++;

      if (index >= fullText.length) {
        clearInterval(interval);
      }
    }, 30);
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const userMessage = { type: 'user', text: userInput, id: Date.now() };
    const loadingMessage = { type: 'bot', text: 'Thinking...', id: Date.now() + 1 };
    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);
    
    const currentInput = userInput;
    setUserInput('');

    try {
      console.log('Making API call with user input:', currentInput);
      
      // Use Vite proxy for local development, Azure Function for production
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const apiUrl = isProduction 
        ? `/api/proxy?user_input_question=${encodeURIComponent(currentInput)}`
        : `/GetChatbotResponse?user_input_question=${encodeURIComponent(currentInput)}`;
      
      console.log('API URL:', apiUrl); // For debugging
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      // Try to get response as text first
      const responseText = await response.text();
      console.log('Raw response length:', responseText.length);
      console.log('Raw response preview:', responseText.substring(0, 200));
      
      // Check if response is empty
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response received from server');
      }
      
      // Handle different possible response structures (similar to HelpInputBox)
      let responseData = '';
      try {
        const parsedData = JSON.parse(responseText);
        console.log('Parsed as JSON:', parsedData);
        
        // Check for common response field names
        if (parsedData && parsedData.message) {
          responseData = parsedData.message;
        } else if (parsedData && parsedData.response) {
          responseData = parsedData.response;
        } else if (parsedData && parsedData.answer) {
          responseData = parsedData.answer;
        } else if (typeof parsedData === 'string') {
          responseData = parsedData;
        } else if (parsedData) {
          responseData = JSON.stringify(parsedData);
        } else {
          responseData = 'No response data received';
        }
      } catch (jsonError) {
        console.log('Not JSON, using as text');
        // If JSON parsing fails, use the text as is
        responseData = responseText;
      }
      
      console.log('Processed Response Data:', responseData);
      
      // Ensure responseData is a valid string
      const finalResponseData = typeof responseData === 'string' ? responseData : String(responseData || 'No response received');
      
      // Use the animation function instead of adding a new message
      animateSystemResponse(finalResponseData);
      
    } catch (error) {
      console.error('API Error Details:', error);
      
      let errorMessage = 'Something went wrong. Please try again later.';
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection and ensure the development server is running.';
      } else if (error.message.includes('HTTP error')) {
        errorMessage = `Server error: ${error.message}`;
      }
      
      // Use the animation function for error messages too
      animateSystemResponse(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      {/* Logo at top left */}
      <img src="/assets/images/logo.png" alt="Logo" className="chat-logo" />
      
      {/* About EQx textbox - positioned under the logo */}
      <div className="about-eqx-container">
        <h3 className="about-eqx-title">About EQx</h3>
        <div className="about-eqx-content">
          The Elite Quality Index (EQx) is a political economy index that measures and ranks countries on the basis of their elite quality. Elite quality is understood as the aggregate impact of elite business models as they lead to value creation (positive) or rent seeking (negative). High quality elites maximize a country’s inclusive economic and human development in the long run.
        </div>
      </div>
      
      {/* Title - positioned based on whether there are messages */}
      <div className={`chat-title ${messages.length > 0 ? 'has-messages' : 'no-messages'}`}>
        <h1>
          The Elite Quality Index<sup>®</sup><br />
          Chatbot
          <span className="beta-label">BETA</span>
        </h1>
      </div>
      
      {/* Messages area - only visible when there are messages */}
      {messages.length > 0 && (
        <div className="chat-messages" ref={messagesContainerRef}>
          {messages.map((message, index) => (
            <div key={message.id || index} className={`message ${message.type}`}>
              <div className="message-bubble">
                {message.text}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message bot">
              <div className="message-bubble loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input area - positioned based on whether there are messages */}
      <div className={`chat-input ${messages.length > 0 ? 'has-messages' : 'no-messages'}`}>
        <div className="input-container">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about Elite Quality Index..."
            className="input-field"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!userInput.trim() || isLoading}
            className="send-button"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 12L22 2L13 21L11 13L2 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Learn more link - only visible when no messages */}
      <div className={`learn-more-link ${messages.length === 0 ? 'no-messages' : ''}`}>
        <a href="https://elitequality.org/" target="_blank" rel="noopener noreferrer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            style={{ verticalAlign: 'middle', marginRight: '0.5em' }}
            aria-hidden="true"
          >
            <path d="M14 3h7v7" stroke="#049cfc" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 14L21 3" stroke="#049cfc" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="3" y="7" width="14" height="14" rx="2.5" stroke="#049cfc" strokeWidth="1.7"/>
          </svg>
          Learn more at elitequality.org
        </a>
      </div>
    </div>
  );
};

export default Chat;
