import { useState, useEffect } from 'react';
import './Chat.css';

const Chat = () => {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const TypewriterText = ({ text, speed = 50 }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(true);

    useEffect(() => {
      if (!text) return;
      
      // Reset state when text changes
      setDisplayedText('');
      setIsTyping(true);
      
      // Convert text to array once to avoid any potential issues
      const characters = Array.from(text);
      let index = 0;
      
      const timer = setInterval(() => {
        if (index < characters.length) {
          setDisplayedText(prev => prev + characters[index]);
          index++;
        } else {
          setIsTyping(false);
          clearInterval(timer);
        }
      }, speed);

      return () => clearInterval(timer);
    }, [text, speed]);

    return (
      <span>
        {displayedText}
        {isTyping && <span className="cursor">|</span>}
      </span>
    );
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const userMessage = { type: 'user', text: userInput };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    const currentInput = userInput;
    setUserInput('');

    try {
      console.log('Making API call with user input:', currentInput);
      
      // Use the proxy route instead of direct URL (similar to HelpInputBox)
      const response = await fetch(`/GetChatbotResponse?user_input_question=${encodeURIComponent(currentInput)}`, {
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
      
      const botMessage = { type: 'bot', text: responseData || 'No response received' };
      setMessages(prev => [...prev, botMessage]);
      
    } catch (error) {
      console.error('API Error Details:', error);
      
      let errorMessage = 'Something went wrong. Please try again later.';
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection and ensure the development server is running.';
      } else if (error.message.includes('HTTP error')) {
        errorMessage = `Server error: ${error.message}`;
      }
      
      const botErrorMessage = { 
        type: 'bot', 
        text: errorMessage
      };
      setMessages(prev => [...prev, botErrorMessage]);
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
      <div className="chat-header">
        <img src="/assets/images/logo.png" alt="EQx Logo" className="logo" />
        <h1>EQx AI Assistant</h1>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <p>Welcome! Ask me anything about Elite Quality Index.</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.type}`}>
            <div className="message-bubble">
              {message.type === 'bot' ? (
                <TypewriterText text={message.text} speed={30} />
              ) : (
                message.text
              )}
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
      </div>

      <div className="chat-input">
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
    </div>
  );
};

export default Chat;
