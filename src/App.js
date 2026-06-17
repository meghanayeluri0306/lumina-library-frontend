import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [books, setBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('library');
  
  // Auth states
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('luminaUser') || '');
  const [showAuthModal, setShowAuthModal] = useState(!localStorage.getItem('luminaUser'));
  const [authMode, setAuthMode] = useState('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // ⏱️ 1-Hour Timers & History Tracking
  const [activeLoans, setActiveLoans] = useState([]);
  const [activityHistory, setActivityHistory] = useState([]);

  // Help Desk Fields
  const [helpType, setHelpType] = useState('Query');
  const [helpMessage, setHelpMessage] = useState('');

  const fetchBooks = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/books');
      setBooks(response.data);
    } catch (error) {
      console.error("Error reading book list:", error);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Countdown timer clock cycle thread
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setActiveLoans((prevLoans) => {
        return prevLoans
          .map((loan) => {
            if (loan.timeLeft <= 1) {
              handleReturn(loan.bookId, true);
              alert(`⏰ Loan Expired: Book handle released automatically.`);
              return null;
            }
            return { ...loan, timeLeft: loan.timeLeft - 1 };
          })
          .filter((loan) => loan !== null);
      });
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [activeLoans]);

  const logActivity = (actionText) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActivityHistory(prev => [{ id: Date.now(), text: actionText, time: timestamp }, ...prev]);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs} left`;
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim()) return;
    const existingUsers = JSON.parse(localStorage.getItem('libraryUsersList') || '[]');

    if (authMode === 'register') {
      const userExists = existingUsers.find(u => u.username.toLowerCase() === usernameInput.toLowerCase());
      if (userExists) { alert("❌ Username taken."); return; }
      existingUsers.push({ username: usernameInput, password: passwordInput });
      localStorage.setItem('libraryUsersList', JSON.stringify(existingUsers));
    } else {
      const validUser = existingUsers.find(u => u.username.toLowerCase() === usernameInput.toLowerCase() && u.password === passwordInput);
      if (!validUser) { alert("❌ Invalid credentials."); return; }
    }
    localStorage.setItem('luminaUser', usernameInput);
    setCurrentUser(usernameInput);
    setShowAuthModal(false);
    logActivity(`Sign-in identity authorized context.`);
    setUsernameInput('');
    setPasswordInput('');
  };

  const handleLogout = () => {
    localStorage.removeItem('luminaUser');
    setCurrentUser('');
    setActiveLoans([]);
    setShowAuthModal(true);
  };

  const handleBorrow = async (bookId) => {
    const selectedBook = books.find(b => b.id === bookId);
    try {
      const response = await axios.post('http://localhost:5000/api/borrow', { bookId, username: currentUser });
      alert(response.data.message);
      if (response.data.status === "SUCCESS") {
        setActiveLoans([...activeLoans, { bookId, timeLeft: 3600 }]);
        logActivity(`Borrowed: "${selectedBook?.title}"`);
      }
      fetchBooks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleReturn = async (bookId, isAutoExpired = false) => {
    const selectedBook = books.find(b => b.id === bookId);
    try {
      await axios.post('http://localhost:5000/api/return', { bookId });
      setActiveLoans(prev => prev.filter(l => l.bookId !== bookId));
      logActivity(isAutoExpired ? `⏰ Timer timeout automatic drop: "${selectedBook?.title}"` : `Returned copy item: "${selectedBook?.title}"`);
      fetchBooks();
    } catch (error) {
      console.error(error);
    }
  };

  // 🔍 SMART SHORTCUT DICTIONARY MAPS
  const checkShortcutMatch = (bookTitle, bookSubject, currentQuery) => {
    const queryLower = currentQuery.toLowerCase().trim();
    if (!queryLower) return true;

    // Expand short keycodes to complete string search queries dynamically
    let expandedQueries = [queryLower];
    if (queryLower === 'cc') expandedQueries.push('cloud computing');
    if (queryLower === 'nlp') expandedQueries.push('natural language processing');
    if (queryLower === 'ar') expandedQueries.push('augmented reality');
    if (queryLower === 'mern') expandedQueries.push('full-stack');

    // Return true if any of our strings find a matching field position
    return expandedQueries.some(q => 
      bookTitle.toLowerCase().includes(q) || 
      bookSubject.toLowerCase().includes(q)
    );
  };

  const filteredBooks = books.filter(book => 
    checkShortcutMatch(book.title, book.subject, searchQuery)
  );

  return (
    <div className="app-container">
      
      {/* AUTHENTICATION FORM MODAL */}
      {showAuthModal && (
        <div className="auth-overlay">
          <div className="auth-box">
            <div className="auth-tabs">
              <button className={`auth-tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => setAuthMode('login')}>Sign In</button>
              <button className={`auth-tab ${authMode === 'register' ? 'active' : ''}`} onClick={() => setAuthMode('register')}>Register</button>
            </div>
            <form onSubmit={handleAuthSubmit} className="auth-form">
              <input type="text" placeholder="Username" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} required />
              <input type="password" placeholder="Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} required />
              <button type="submit" className="prime-btn btn-instant">{authMode === 'login' ? 'Login' : 'Create Profile'}</button>
            </form>
          </div>
        </div>
      )}

      {/* 🧭 SIDE NAVIGATION WITH ALL TABS ATTACHED CLEANLY */}
      <aside className="sidebar">
        <div>
          <div className="brand-title">🏛️ Lumina Library</div>
          <div className="brand-subtitle">Knowledge Allocation Network</div>
        </div>
        
        <nav className="nav-menu">
          <button className={`nav-item ${activeTab === 'library' ? 'active' : ''}`} onClick={() => setActiveTab('library')}>📚 Book Catalog</button>
          <button className={`nav-item ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>ℹ️ How it Works</button>
          <button className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>📜 Session History</button>
          <button className={`nav-item ${activeTab === 'help' ? 'active' : ''}`} onClick={() => setActiveTab('help')}>📧 Help Desk</button>
        </nav>
        
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>Exit Session</button>
        </div>
      </aside>

      {/* 🖥️ VIEW HUD DISPLAY */}
      <div className="main-wrapper">
        <header className="top-navbar">
          <h2>{activeTab === 'library' ? 'Explore Resources' : activeTab === 'about' ? 'System Overview' : activeTab === 'history' ? 'Activity Log' : 'Help Desk'}</h2>
          <div className="user-badge">👤 Reader: {currentUser}</div>
        </header>

        <main className="page-content">
          
          {/* TAB 1: CORE CATALOG */}
          {activeTab === 'library' && (
            <div>
              {/* 💬 Student Quote Banner */}
              <div className="quote-banner">
                "The beautiful thing about learning is that no one can take it away from you."
                <span className="quote-author">— B.B. King (Curated for Lumina Students)</span>
              </div>

              <input 
                type="text" 
                className="search-input" 
                placeholder="🔍 Search titles, subjects, or try shortcuts like 'cc', 'nlp', 'ar'..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />

              <div className="books-grid">
                {filteredBooks.map((book) => {
                  const isWaitlisted = book.availableTokens === 0;
                  const currentLoanRecord = activeLoans.find(l => l.bookId === book.id);
                  const hasAccess = !!currentLoanRecord;

                  return (
                    <div key={book.id} className="book-card">
                      <div className="subject-tag">{book.subject}</div>
                      <h3>{book.title}</h3>
                      
                      <div className="token-status">
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Available Copies: <strong>{book.availableTokens} / {book.totalTokens}</strong></span>
                        <div className="progress-container"><div className="progress-bar" style={{ width: `${(book.availableTokens / book.totalTokens) * 100}%` }}></div></div>
                      </div>

                      {isWaitlisted && !hasAccess && <div className="waitlist-alert">All copies are in use. {book.waitingList.length} user(s) waiting.</div>}

                      {hasAccess ? (
                        <div className="unlocked-banner">
                          <div className="timer-badge">⏳ {formatTime(currentLoanRecord.timeLeft)}</div>
                          <p>🔓 Material Access Unlocked!</p>
                          <a href={book.contentUrl} target="_blank" rel="noopener noreferrer" className="btn-read-online">📖 Read Online Content</a>
                          <br /><button className="btn-release-text" onClick={() => handleReturn(book.id)}>Return Copy Now</button>
                        </div>
                      ) : (
                        <button className={`prime-btn ${isWaitlisted ? 'btn-queue' : 'btn-instant'}`} onClick={() => handleBorrow(book.id)} style={{ width: '100%' }}>
                          {isWaitlisted ? '🎟️ Join Waiting List' : '⚡ Borrow Book Copy'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ABOUT VIEW RESTORED */}
          {activeTab === 'about' && (
            <div className="info-card">
              <h2>Fair-Share Allocation Ecosystem</h2>
              <p>Welcome to **Lumina Library**! To guarantee flat resource distribution streams, our system utilizes dynamic license allocation:</p>
              <ul>
                <li><strong>1-Hour Loan Windows:</strong> Access is limited to 1 hour to prevent hoarding.</li>
                <li><strong>Queue Management:</strong> When copies hit zero, request handles map sequentially into a waiting pool cache.</li>
              </ul>
            </div>
          )}

          {/* TAB 3: ACTIVITY HISTORY */}
          {activeTab === 'history' && (
            <div className="info-card">
              <h2>Recent Session Tracking</h2>
              <div className="history-container">
                {activityHistory.length === 0 ? <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No session steps recorded yet.</p> : 
                  activityHistory.map(item => <div key={item.id} className="history-item"><span>⚡ {item.text}</span><span className="history-time">{item.time}</span></div>)
                }
              </div>
            </div>
          )}

          {/* TAB 4: EMAIL ROUTING SUPPORT */}
          {activeTab === 'help' && (
            <div className="info-card">
              <h2>Help Desk & Suggestion Center</h2>
              <form onSubmit={(e) => { e.preventDefault(); window.location.href = `mailto:meghanayeluri0306@gmail.com?subject=Lumina%20Support&body=${encodeURIComponent(helpMessage)}`; logActivity(`Fired mail ticket link`); setHelpMessage(''); }} className="help-grid">
                <div className="form-group">
                  <label>Classification Selection</label>
                  <select value={helpType} onChange={(e) => setHelpType(e.target.value)}>
                    <option value="Query">❓ Ask a Question</option>
                    <option value="Suggestion">💡 Suggest a Material</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Message Input Body</label>
                  <textarea rows="5" placeholder="Type details here..." value={helpMessage} onChange={(e) => setHelpMessage(e.target.value)} required></textarea>
                </div>
                <button type="submit" className="prime-btn btn-instant" style={{ width: '250px' }}>📧 Send Ticket To Admin Mailbox</button>
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default App;