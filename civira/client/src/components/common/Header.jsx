import '../../styles/header.css';

// Shared authenticated header with account action and logout button.

function AccountIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 22C20 18.6863 16.4183 16 12 16C7.58172 16 4 18.6863 4 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Header({ userName, onProfileClick, onLogout }) {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1>CIVIRA</h1>
        <div className="header-user">
          <button type="button" className="header-account-btn" onClick={onProfileClick}>
            <span className="header-account"><AccountIcon /> {userName}</span>
          </button>
          <button className="btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}
