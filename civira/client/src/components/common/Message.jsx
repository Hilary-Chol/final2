import '../../styles/message.css';

// Shared feedback banner for success and error messages.

export default function Message({ message, success }) {
  if (!message) return null;
  
  return (
    <div className={`message ${success ? 'success' : 'error'}`}>
      {success && <span>✓ </span>}
      {!success && <span>✕ </span>}
      {message}
    </div>
  );
}
