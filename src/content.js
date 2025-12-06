import QRCode from 'qrcode';
import { generateNonce } from './utils.js';
import './content.css';

// Check for security threats immediately
checkPageSecurity();

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Content Script] Received message:', message);
  
  if (message.action === 'showQR') {
    showQRModal(message.url);
  } else if (message.action === 'showSecurityWarning') {
    showSecurityWarning(message.warningType, message.details);
  } else if (message.action === 'showReportModal') {
    console.log('[Content Script] Showing report modal for:', message.hostname);
    showReportModal(message.url, message.hostname);
  }
  
  sendResponse({ success: true });
  return true;
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
  const existing = document.getElementById('govpl-qr-modal-host');
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
  
  // Create host element
  const host = document.createElement('div');
  host.id = 'govpl-qr-modal-host';
  
  // Attach Shadow DOM
  const shadowRoot = host.attachShadow({ mode: 'open' });
  
  // Disable page scrolling
  document.body.style.overflow = 'hidden';
  
  // Add warning box styles to modal styles
  const qrModalHTML = `
    ${getModalStyles()}
    <style>
      .govpl-warning-box {
        background: #fff3cd;
        border: 1px solid #ffc107;
        padding: 12px;
        border-radius: 8px;
        font-size: 13px;
        color: #856404;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      #govpl-qr-modal {
        z-index: 2147483647 !important;
      }
    </style>
    <div id="govpl-qr-modal">
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
    </div>
  `;
  
  shadowRoot.innerHTML = qrModalHTML;
  document.body.appendChild(host);
  
  // Generate QR code
  try {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, JSON.stringify(verificationData), {
      width: 256,
      margin: 2,
      color: { dark: '#000', light: '#fff' }
    });
    shadowRoot.getElementById('govpl-qr').appendChild(canvas);
  } catch (err) {
    shadowRoot.getElementById('govpl-qr').innerHTML = '<p style="color:red;">Błąd generowania kodu QR</p>';
  }
  
  // Close handlers
  shadowRoot.querySelector('.govpl-close').addEventListener('click', () => {
    document.body.style.overflow = '';
    host.remove();
  });
  shadowRoot.querySelector('.govpl-overlay').addEventListener('click', () => {
    document.body.style.overflow = '';
    host.remove();
  });
  
  // Handle footer link click
  const footerLink = shadowRoot.querySelector('.govpl-modal-footer a');
  if (footerLink) {
    footerLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(footerLink.href, '_blank');
    });
  }
  
  // Auto-expire after 5 minutes
  setTimeout(() => {
    if (document.getElementById('govpl-qr-modal-host')) {
      document.body.style.overflow = '';
      host.remove();
    }
  }, 300000);
}

// Check page security for threats
async function checkPageSecurity() {
  try {
    const response = await chrome.runtime.sendMessage({ 
      action: 'checkPageSecurity',
      url: window.location.href,
      hostname: window.location.hostname,
      protocol: window.location.protocol
    });
    
    if (response && response.showWarning) {
      showSecurityWarning(response.warningType, response.details);
    }
  } catch (error) {
    console.error('[GOV.PL Verifier] Error checking page security:', error);
  }
}

// Show full-screen security warning
function showSecurityWarning(warningType, details) {
  // Don't show warning if user has already dismissed it for this session
  const dismissKey = `govpl-dismissed-${window.location.hostname}`;
  if (sessionStorage.getItem(dismissKey)) {
    return;
  }
  
  // Remove existing warning if any
  const existing = document.getElementById('govpl-security-warning');
  if (existing) existing.remove();
  
  let title, subtitle, icon, level, reasons, actionText;
  
  if (warningType === 'malicious') {
    title = 'NIEBEZPIECZNA STRONA';
    subtitle = 'Ta strona została zgłoszona jako złośliwa przez CERT Polska';
    icon = '⛔';
    level = 'critical';
    reasons = [
      'Strona znajduje się na liście ostrzeżeń CERT Polska',
      'Może próbować wykraść Twoje dane osobowe lub finansowe',
      'Może zawierać złośliwe oprogramowanie',
      'Zalecamy natychmiastowe opuszczenie tej strony'
    ];
    actionText = 'Wróć do bezpiecznej strony';
  } else if (warningType === 'no-https') {
    title = 'NIEZABEZPIECZONE POŁĄCZENIE';
    subtitle = 'Ta strona gov.pl nie używa bezpiecznego protokołu HTTPS';
    icon = '⚠️';
    level = 'medium';
    reasons = [
      'Połączenie nie jest szyfrowane',
      'Twoje dane mogą być przechwycone przez osoby trzecie',
      'Nie możemy zweryfikować autentyczności strony',
      'Oficjalne strony gov.pl powinny używać HTTPS'
    ];
    actionText = 'Opuść tę stronę';
  }
  
  // Disable page scrolling
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  
  const warning = document.createElement('div');
  warning.id = 'govpl-security-warning';
  warning.className = `warning-level-${level}`;
  warning.innerHTML = `
    <div class="govpl-warning-container">
      <div class="govpl-warning-icon">${icon}</div>
      <h1>${title}</h1>
      <h2>${subtitle}</h2>
      
      <div class="govpl-warning-details">
        <strong>Powody ostrzeżenia:</strong>
        ${reasons.map(reason => `<p>• ${reason}</p>`).join('')}
        ${details ? `
          <p style="margin-top: 20px;">
            <strong>Adres strony:</strong><br>
            <code>${details.url || window.location.href}</code>
          </p>
        ` : ''}
      </div>
      
      <div class="govpl-warning-actions">
        <button class="govpl-warning-btn govpl-warning-btn-primary" id="govpl-go-back">
          ${actionText}
        </button>
        <button class="govpl-warning-btn govpl-warning-btn-secondary" id="govpl-proceed">
          Rozumiem ryzyko i chcę kontynuować
        </button>
      </div>
      
      <div class="govpl-warning-info">
        <p>
          To ostrzeżenie pochodzi z rozszerzenia "Weryfikacja GOV.PL"<br>
          Źródło danych: <a href="https://cert.pl/lista-ostrzezen/" target="_blank">CERT Polska</a>
        </p>
      </div>
    </div>
  `;
  
  document.documentElement.appendChild(warning);
  
  // Event listeners
  document.getElementById('govpl-go-back').addEventListener('click', () => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    window.history.back();
  });
  
  document.getElementById('govpl-proceed').addEventListener('click', () => {
    sessionStorage.setItem(dismissKey, 'true');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    warning.remove();
  });
}

// Get modal CSS styles
function getModalStyles() {
  return `
    <style>
      :host {
        all: initial;
      }
      #govpl-report-modal, #govpl-qr-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2147483647 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .govpl-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
      }
      .govpl-modal {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .govpl-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px;
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
        color: white;
        border-radius: 16px 16px 0 0;
        flex-shrink: 0;
      }
      .govpl-modal-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
      }
      .govpl-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 24px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      .govpl-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      .govpl-modal-body {
        padding: 24px 24px 32px 24px;
        text-align: center;
        overflow-y: auto;
        overflow-x: hidden;
        flex: 1;
        min-width: 0;
      }
      .govpl-modal-body p {
        margin: 0 0 20px 0;
        font-size: 15px;
        line-height: 1.6;
        color: #333;
      }
      .govpl-qr {
        display: flex;
        justify-content: center;
        margin: 20px 0;
        width: 100%;
      }
      .govpl-qr canvas {
        border: 8px solid white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 100%;
        height: auto;
      }
      .govpl-url-box {
        background: #f8f9fa;
        padding: 16px;
        border-radius: 8px;
        margin: 20px 0;
        border-left: 4px solid #dc143c;
        text-align: left;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .govpl-url-box strong {
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        color: #333;
      }
      .govpl-url-box div {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        color: #666;
        word-break: break-all;
      }
      .govpl-info-box {
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
        font-size: 13px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        text-align: left;
      }
      .govpl-info-yellow {
        background: #fff3cd;
        border: 1px solid #ffc107;
        color: #856404;
      }
      .govpl-info-grey {
        background: #f8f9fa;
        color: #666;
      }
      .govpl-info-grey strong {
        color: #333;
      }
      .govpl-info-box ol {
        margin: 10px 0 0 20px;
        line-height: 1.8;
      }
      .govpl-report-btn {
        display: inline-block;
        width: auto;
        max-width: 100%;
        padding: 15px 20px;
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 15px;
        text-align: center;
        transition: all 0.3s;
        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
        line-height: 1.4;
      }
      .govpl-report-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
        background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
      }
      .govpl-modal-footer {
        padding: 16px 24px;
        background: #f8f9fa;
        border-radius: 0 0 16px 16px;
        text-align: center;
        flex-shrink: 0;
      }
      .govpl-modal-footer a {
        color: #dc143c;
        text-decoration: none;
        font-size: 14px;
        font-weight: 600;
      }
      .govpl-modal-footer a:hover {
        text-decoration: underline;
      }
    </style>
  `;
}

// Show report modal with QR code and link to CERT.PL
async function showReportModal(url, hostname) {
  console.log('[Content Script] showReportModal called with:', { url, hostname });
  
  // Remove existing modal if any
  const existing = document.getElementById('govpl-report-modal-host');
  if (existing) {
    console.log('[Content Script] Removing existing modal');
    existing.remove();
  }
  
  // Prepare report URL for CERT.PL
  const certReportUrl = `https://incydent.cert.pl/domena#!/lang=pl`;
  
  // Create host element
  const host = document.createElement('div');
  host.id = 'govpl-report-modal-host';
  
  // Attach Shadow DOM
  const shadowRoot = host.attachShadow({ mode: 'open' });
  
  // Disable page scrolling
  document.body.style.overflow = 'hidden';
  
  // Create modal content
  const modalHTML = `
    ${getModalStyles()}
    <style>
      #govpl-report-modal {
        z-index: 2147483647 !important;
      }
    </style>
    <div id="govpl-report-modal">
      <div class="govpl-overlay"></div>
      <div class="govpl-modal">
        <div class="govpl-modal-header">
          <h2>Zgłoś podejrzaną stronę</h2>
          <button class="govpl-close">✕</button>
        </div>
        <div class="govpl-modal-body">
          <p>Pomóż chronić innych użytkowników zgłaszając podejrzaną stronę do <strong>CERT Polska</strong>.</p>
          
          <div class="govpl-qr" id="govpl-report-qr"></div>
          
          <div class="govpl-url-box">
            <strong>Zgłaszana strona:</strong>
            <div>${hostname}</div>
          </div>
          
          <div class="govpl-info-box govpl-info-yellow">
            <strong>💡 Jak zgłosić?</strong>
            <ol>
              <li>Zeskanuj kod QR telefonem</li>
              <li>Lub kliknij przycisk poniżej</li>
              <li>Wypełnij formularz na stronie CERT Polska</li>
              <li>Opisz dlaczego strona wydaje się podejrzana</li>
            </ol>
          </div>
          
          <a href="${certReportUrl}" target="_blank" class="govpl-report-btn">
            Otwórz formularz zgłoszeniowy CERT.PL
          </a>
          
          <div class="govpl-info-box govpl-info-grey">
            <strong style="display: block; margin-bottom: 8px;">Kiedy zgłaszać?</strong>
            • Strona podszywająca się pod oficjalną gov.pl<br>
            • Prośba o dane osobowe lub hasła<br>
            • Podejrzane przekierowania lub pobieranie plików<br>
            • Strona wygląda profesjonalnie, ale coś Cię niepokoi
          </div>
        </div>
        <div class="govpl-modal-footer">
          <a href="https://cert.pl/lista-ostrzezen/" target="_blank">Zobacz listę ostrzeżeń CERT Polska</a>
        </div>
      </div>
    </div>
  `;
  
  shadowRoot.innerHTML = modalHTML;
  document.documentElement.appendChild(host);
  
  // Generate QR code for CERT report URL
  try {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, certReportUrl, {
      width: 256,
      margin: 2,
      color: { dark: '#dc3545', light: '#fff' }
    });
    shadowRoot.getElementById('govpl-report-qr').appendChild(canvas);
  } catch (err) {
    shadowRoot.getElementById('govpl-report-qr').innerHTML = '<p style="color:red;">Błąd generowania kodu QR</p>';
  }
  
  // Close handlers
  shadowRoot.querySelector('.govpl-close').addEventListener('click', () => {
    document.body.style.overflow = '';
    host.remove();
  });
  shadowRoot.querySelector('.govpl-overlay').addEventListener('click', () => {
    document.body.style.overflow = '';
    host.remove();
  });
  
  // Handle report button click
  const reportBtn = shadowRoot.querySelector('.govpl-report-btn');
  if (reportBtn) {
    reportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(certReportUrl, '_blank');
    });
  }
  
  // Handle footer link click
  const footerLink = shadowRoot.querySelector('.govpl-modal-footer a');
  if (footerLink) {
    footerLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(footerLink.href, '_blank');
    });
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectFloatingButton);
} else {
  injectFloatingButton();
}
