import '../../styles/navigation.css';

// Shared tab-style navigation for authenticated portal sections.

export default function Navigation({ currentPage, navItems, onNavClick }) {
  return (
    <nav className="app-nav">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`nav-btn ${currentPage === item.id ? 'active' : ''}`}
          onClick={() => onNavClick(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
