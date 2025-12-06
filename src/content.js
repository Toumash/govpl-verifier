import QRCode from 'qrcode';
import { generateNonce } from './utils.js';
import './content.css';

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showQR') {
    showQRModal(message.url);
  }
});

// Inject floating button on every site for easier testing
function injectFloatingButton() {
  console.log('[GOV.PL Verifier] Injecting button on hostname:', window.location.hostname);
  
  const btn = document.createElement('div');
  btn.id = 'govpl-float-btn';
  btn.innerHTML = `
    <button title="Zweryfikuj stronę w mObywatel">
      🛡️ Weryfikuj
    </button>
  `;
  document.body.appendChild(btn);
  console.log('[GOV.PL Verifier] Button injected successfully');
  
  btn.querySelector('button').addEventListener('click', () => {
    showQRModal(window.location.href);
  });
}

async function showQRModal(url) {
  // Remove existing modal if any
  const existing = document.getElementById('govpl-qr-modal');
  if (existing) existing.remove();
  
  const nonce = generateNonce();
  const verificationData = {
    version: '1.0',
    type: 'gov_pl_verification',
    url: url,
    hostname: new URL(url).hostname,
    nonce: nonce,
    timestamp: Date.now()
  };
  
  const modal = document.createElement('div');
  modal.id = 'govpl-qr-modal';
  modal.innerHTML = `
    <div class="govpl-overlay"></div>
    <div class="govpl-modal">
      <div class="govpl-modal-header">
        <h2>Weryfikacja GOV.PL</h2>
        <button class="govpl-close">✕</button>
      </div>
      <div class="govpl-modal-body">
        <p>Zeskanuj kod QR aplikacją <strong>mObywatel</strong> aby zweryfikować autentyczność strony.</p>
        <div class="govpl-qr" id="govpl-qr"></div>
        <div class="govpl-url-box">
          <strong>Weryfikowana strona:</strong>
          <div>${url}</div>
        </div>
        <div class="govpl-warning-box">
          ⚠ Kod jest jednorazowy i wygasa po 5 minutach
        </div>
      </div>
      <div class="govpl-modal-footer">
        <a href="https://www.gov.pl/mobywatel" target="_blank">Pobierz mObywatel</a>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Generate QR code
  try {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, JSON.stringify(verificationData), {
      width: 256,
      margin: 2,
      color: { dark: '#000', light: '#fff' }
    });
    document.getElementById('govpl-qr').appendChild(canvas);
  } catch (err) {
    document.getElementById('govpl-qr').innerHTML = '<p style="color:red;">Błąd generowania kodu QR</p>';
  }
  
  // Close handlers
  modal.querySelector('.govpl-close').addEventListener('click', () => modal.remove());
  modal.querySelector('.govpl-overlay').addEventListener('click', () => modal.remove());
  
  // Auto-expire after 5 minutes
  setTimeout(() => {
    if (document.getElementById('govpl-qr-modal')) {
      modal.remove();
    }
  }, 300000);
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectFloatingButton);
} else {
  injectFloatingButton();
}
