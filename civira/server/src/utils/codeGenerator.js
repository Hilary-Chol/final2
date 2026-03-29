// Exported to: server/src/controllers/authController.js and candidateController.js
export function generateCode(prefix) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${random}${timestamp}`;
}
