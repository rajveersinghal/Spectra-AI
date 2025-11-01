import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  useParams,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import "./chatPage.css";

// ✅ Set the correct backend API base URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

// ✅ Regex to detect YouTube URLs
const YOUTUBE_URL_REGEX =
  /(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\/(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%\?]{11})/;
const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

// ✅ SVG Icon component
const ModernInputIcon = ({ type }) => {
  const paths = {
    upload: "M12 5v14m-7-7h14",
    submit: "M5 12h14M12 5l7 7-7 7",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className={`input-icon icon-${type}`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[type]} />
    </svg>
  );
};

// ✅ Loading Animation Component
const TypingIndicator = () => (
  <div className="typing-indicator">
    <span className="typing-dot"></span>
    <span className="typing-dot"></span>
    <span className="typing-dot"></span>
  </div>
);

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null);
  
  const messagesEndRef = useRef(null);
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { handleCreateChat } = useOutletContext() || {};

  // ✅ Update last AI message
  const updateLastMessage = (text) => {
    setMessages((prev) =>
      prev.map((msg, i) =>
        i === prev.length - 1 ? { ...msg, text, isLoading: false } : msg
      )
    );
  };

  // ✅ Fetch AI response
  const fetchResponse = useCallback(async (prompt, mode, file = null) => {
    const userMessage = { 
      id: crypto.randomUUID(), 
      role: "user", 
      text: file ? `📄 ${file.name}` : prompt 
    };
    const aiMessage = { 
      id: crypto.randomUUID(), 
      role: "ai", 
      text: "",
      isLoading: true
    };
    
    setMessages((prev) => [...prev, userMessage, aiMessage]);
    setIsLoading(true);

    try {
      let response;

      // 📄 Document summarization
      if (mode === "document" && file) {
        const formData = new FormData();
        formData.append("file", file);
        
        if (prompt && prompt !== file.name) {
          formData.append("prompt", prompt);
        }
        
        response = await fetch(`${API_BASE_URL}/api/summarize-document`, {
          method: "POST",
          body: formData,
        });
      }

      // ▶️ YouTube summarization
      else if (mode === "youtube") {
        let youtubeUrl = null;
        const urlMatch = prompt.match(YOUTUBE_URL_REGEX);
        
        if (urlMatch) {
          youtubeUrl = urlMatch[0];
        } else if (YOUTUBE_ID_REGEX.test(prompt.trim())) {
          youtubeUrl = `https://youtu.be/${prompt.trim()}`;
        } else {
          throw new Error("Please provide a valid YouTube URL or video ID.");
        }

        const userPrompt = prompt.replace(youtubeUrl, "").trim() || "Summarize this video:";
        
        response = await fetch(`${API_BASE_URL}/api/summarize-youtube`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            youtube_url: youtubeUrl,
            prompt: userPrompt,
          }),
        });
      }

      // 💬 General chat
      else {
        response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
      }

      if (!response.ok) {
        let errText = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          errText = errData.error || errText;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(errText);
      }

      const data = await response.json();
      
      if (data.summary) {
        updateLastMessage(data.summary);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error("Invalid response from server");
      }
      
    } catch (error) {
      console.error("API call failed:", error);
      updateLastMessage(`⚠️ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
      setUploadingFile(null);
    }
  }, []);

  // ✅ Scroll down when new messages come
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ✅ Auto-focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // ✅ Handle first prompt if coming from another page
  useEffect(() => {
    const { firstPrompt, mode, file } = location.state || {};
    if (firstPrompt) {
      setMessages([]);
      fetchResponse(firstPrompt, mode, file);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (messages.length === 0) {
      setMessages([]);
    }
  }, [id, location.state, navigate, location.pathname, fetchResponse]);

  // ✅ Handle sending messages
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    const formData = new FormData(e.currentTarget);
    const prompt = (formData.get("prompt") || "").trim();
    
    if (!prompt) return;

    const hasYouTubeLink = YOUTUBE_URL_REGEX.test(prompt) || YOUTUBE_ID_REGEX.test(prompt);
    const mode = hasYouTubeLink ? "youtube" : "chat";
    
    fetchResponse(prompt, mode);

    formRef.current.reset();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  // ✅ Handle textarea auto resize
  const handleInputResize = (e) => {
    e.target.style.height = "auto";
    const newHeight = Math.min(e.target.scrollHeight, 200);
    e.target.style.height = `${newHeight}px`;
  };

  // ✅ Handle enter key to submit
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) {
        formRef.current.requestSubmit();
      }
    }
  };

  // ✅ Handle file upload
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    const validTypes = ['.pdf', '.docx'];
    const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(fileExt)) {
      alert("Please upload only PDF or DOCX files");
      event.target.value = "";
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      event.target.value = "";
      return;
    }
    
    setUploadingFile(file.name);
    fetchResponse(file.name, "document", file);
    
    event.target.value = "";
  };

  const handleUploadClick = () => {
    if (!isLoading) {
      fileInputRef.current?.click();
    }
  };

  // ✅ Format message text (preserve line breaks)
  const formatMessage = (text) => {
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // ✅ UI
  return (
    <div className="chat-view">
      <div className="messages-area">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="welcome-emoji"></div>
            <h2>👋 Welcome!</h2>
            <p>Ask me anything, upload a document, or paste a YouTube link to get started.</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === "user" ? "👤" : "🤖"}
            </div>
            <div className="message-content">
              {msg.isLoading ? (
                <TypingIndicator />
              ) : (
                formatMessage(msg.text)
              )}
            </div>
          </div>
        ))}
        
        {uploadingFile && (
          <div className="upload-status">
            <div className="upload-spinner"></div>
            Uploading {uploadingFile}...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-wrapper">
        <form ref={formRef} className="modern-input-wrapper" onSubmit={handleSendMessage}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
            accept=".pdf,.docx"
          />

          <div className="input-container">
            <button
              type="button"
              className={`input-button upload-btn ${isLoading ? 'disabled' : ''}`}
              onClick={handleUploadClick}
              disabled={isLoading}
              title="Upload PDF or DOCX"
            >
              <ModernInputIcon type="upload" />
            </button>

            <div className="input-fields-container">
              <textarea
                ref={textareaRef}
                className="modern-input"
                name="prompt"
                placeholder="Ask anything, or paste a YouTube link..."
                rows="1"
                autoComplete="off"
                onInput={handleInputResize}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                maxLength={5000}
              />
            </div>

            <button 
              type="submit" 
              className={`input-button modern-submit-btn ${isLoading ? 'disabled' : ''}`}
              disabled={isLoading}
            >
              <ModernInputIcon type="submit" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;