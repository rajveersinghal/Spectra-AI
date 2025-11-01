// src/components/Sidebar.jsx
import { useState } from 'react';
import { 
    MessageSquare, 
    Search, 
    Plus,
    Trash2,
    Share2,
    MoreVertical,
    ChevronLeft, 
    ChevronRight,
    Settings,
    Clock,
    X
} from 'lucide-react';
import PropTypes from 'prop-types';
import './sidebar.css';

// Chat Item Component with Actions
const ChatItem = ({ chat, isExpanded, active, onDelete, onShare }) => {
    const [showActions, setShowActions] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (e) => {
        e.stopPropagation();
        setIsDeleting(true);
        try {
            await onDelete(chat.id);
        } catch (error) {
            console.error('Delete failed:', error);
            setIsDeleting(false);
        }
    };

    const handleShare = (e) => {
        e.stopPropagation();
        onShare(chat);
        setShowActions(false);
    };

    return (
        <li 
            className={`chat-item ${active ? 'active' : ''} ${isDeleting ? 'deleting' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className="chat-item-content">
                <div className="chat-icon">
                    <MessageSquare size={18} />
                </div>
                <span className={`chat-title ${isExpanded ? '' : 'hidden'}`}>
                    {chat.title}
                </span>
                
                {/* Action Buttons */}
                {isExpanded && showActions && (
                    <div className="chat-actions">
                        <button
                            onClick={handleShare}
                            className="action-btn share-btn"
                            title="Share chat"
                        >
                            <Share2 size={14} />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="action-btn delete-btn"
                            title="Delete chat"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <div className="action-spinner"></div>
                            ) : (
                                <Trash2 size={14} />
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Tooltip for collapsed state */}
            {!isExpanded && (
                <div className="chat-tooltip">
                    {chat.title}
                </div>
            )}
        </li>
    );
};

ChatItem.propTypes = {
    chat: PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
    }).isRequired,
    isExpanded: PropTypes.bool.isRequired,
    active: PropTypes.bool,
    onDelete: PropTypes.func.isRequired,
    onShare: PropTypes.func.isRequired,
};

// Share Modal Component
const ShareModal = ({ chat, onClose }) => {
    const [copied, setCopied] = useState(false);
    const shareUrl = `${window.location.origin}/chat/${chat.id}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="share-modal-overlay" onClick={onClose}>
            <div className="share-modal" onClick={(e) => e.stopPropagation()}>
                <div className="share-modal-header">
                    <h3>Share Chat</h3>
                    <button onClick={onClose} className="close-btn">
                        <X size={20} />
                    </button>
                </div>
                <div className="share-modal-body">
                    <p className="share-modal-title">{chat.title}</p>
                    <div className="share-url-container">
                        <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="share-url-input"
                        />
                        <button onClick={handleCopy} className="copy-btn">
                            {copied ? '✓ Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

ShareModal.propTypes = {
    chat: PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
    }).isRequired,
    onClose: PropTypes.func.isRequired,
};

// Main Sidebar Component
export default function Sidebar({ 
    isExpanded, 
    onToggle, 
    recentChats, 
    onNewChat,
    onDeleteChat,
    currentChatId 
}) {
    const [search, setSearch] = useState("");
    const [shareChat, setShareChat] = useState(null);

    const filteredChats = recentChats.filter(chat =>
        chat.title.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = async (chatId) => {
        if (window.confirm('Are you sure you want to delete this chat?')) {
            await onDeleteChat(chatId);
        }
    };

    const handleShare = (chat) => {
        setShareChat(chat);
    };

    return (
        <>
            <aside className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
                <div className="sidebar-content">
                    {/* Header */}
                    <div className="sidebar-header">
                        <div className="logo-container">
                            <div className="logo">🤖</div>
                            <span className={`logo-text ${isExpanded ? '' : 'hidden'}`}>
                                ChatAI
                            </span>
                        </div>
                        <button
                            onClick={onToggle}
                            className="sidebar-toggle-button"
                            aria-label="Toggle sidebar"
                        >
                            {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </button>
                    </div>

                    {/* New Chat Button */}
                    <button 
                        className="sidebar-new-chat-button"
                        onClick={onNewChat}
                    >
                        <Plus className="sidebar-icon" size={20} />
                        <span className={`sidebar-text ${isExpanded ? '' : 'hidden'}`}>
                            New Chat
                        </span>
                    </button>

                    {/* Search */}
                    <div className="sidebar-search-chat">
                        <Search className="sidebar-icon" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search chats..."
                            className={`search-input ${isExpanded ? '' : 'hidden'}`}
                        />
                    </div>

                    {/* Recent Chats */}
                    <div className="sidebar-nav">
                        {isExpanded && (
                            <div className="nav-title">
                                <Clock size={12} />
                                <span>Recent Chats</span>
                            </div>
                        )}
                        <ul className="recent-chats-list">
                            {filteredChats.length > 0 ? (
                                filteredChats.map(chat => (
                                    <ChatItem
                                        key={chat.id}
                                        chat={chat}
                                        isExpanded={isExpanded}
                                        active={chat.id === currentChatId}
                                        onDelete={handleDelete}
                                        onShare={handleShare}
                                    />
                                ))
                            ) : (
                                isExpanded && (
                                    <div className="sidebar-empty">
                                        <MessageSquare size={32} opacity={0.3} />
                                        <p>No chats yet</p>
                                    </div>
                                )
                            )}
                        </ul>
                    </div>

                    {/* Footer / User Profile */}
                    <div className="sidebar-footer">
                        <div className="user-profile-container">
                            <img
                                src="https://ui-avatars.com/api/?background=667eea&color=fff&bold=true&name=SA"
                                className="user-avatar"
                                alt="User avatar"
                            />
                            <div className={`user-info ${isExpanded ? '' : 'hidden'}`}>
                                <div className="user-details">
                                    <h4 className="user-name">Sandeep</h4>
                                    <span className="user-email">sandeep@google.com</span>
                                </div>
                                <button className="settings-btn" title="Settings">
                                    <Settings size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Share Modal */}
            {shareChat && (
                <ShareModal
                    chat={shareChat}
                    onClose={() => setShareChat(null)}
                />
            )}
        </>
    );
}

Sidebar.propTypes = {
    isExpanded: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    recentChats: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            title: PropTypes.string.isRequired,
        })
    ).isRequired,
    onNewChat: PropTypes.func,
    onDeleteChat: PropTypes.func.isRequired,
    currentChatId: PropTypes.string,
};