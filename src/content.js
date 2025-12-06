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
    window.history.back();
  });
  
  document.getElementById('govpl-proceed').addEventListener('click', () => {
    sessionStorage.setItem(dismissKey, 'true');
    warning.remove();
  });
}

// Show report modal with QR code and link to CERT.PL
async function showReportModal(url, hostname) {
  console.log('[Content Script] showReportModal called with:', { url, hostname });
  
  // Remove existing modal if any
  const existing = document.getElementById('govpl-report-modal');
  if (existing) {
    console.log('[Content Script] Removing existing modal');
    existing.remove();
  }
  
  // Prepare report URL for CERT.PL
  const certReportUrl = `https://incydent.cert.pl/domena#!/lang=pl`;
  const reportData = {
    url: url,
    hostname: hostname,
    timestamp: Date.now(),
    reportTo: 'CERT Polska'
  };
  
  const modal = document.createElement('div');
  modal.id = 'govpl-report-modal';
  modal.innerHTML = `
    <div class="govpl-overlay"></div>
    <div class="govpl-modal">
      <div class="govpl-modal-header" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
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
        
        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #856404;">
          <strong>💡 Jak zgłosić?</strong>
          <ol style="margin: 10px 0 0 20px; line-height: 1.8;">
            <li>Zeskanuj kod QR telefonem</li>
            <li>Lub kliknij przycisk poniżej</li>
            <li>Wypełnij formularz na stronie CERT Polska</li>
            <li>Opisz dlaczego strona wydaje się podejrzana</li>
          </ol>
        </div>
        
        <a href="${certReportUrl}" target="_blank" class="govpl-report-btn">
          Otwórz formularz zgłoszeniowy CERT.PL
        </a>
        
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 13px; color: #666;">
          <strong style="display: block; margin-bottom: 8px; color: #333;">Kiedy zgłaszać?</strong>
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
  `;
  
  document.documentElement.appendChild(modal);
  
  // Generate QR code for CERT report URL
  try {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, certReportUrl, {
      width: 256,
      margin: 2,
      color: { dark: '#dc3545', light: '#fff' }
    });
    document.getElementById('govpl-report-qr').appendChild(canvas);
  } catch (err) {
    document.getElementById('govpl-report-qr').innerHTML = '<p style="color:red;">Błąd generowania kodu QR</p>';
  }
  
  // Close handlers
  modal.querySelector('.govpl-close').addEventListener('click', () => modal.remove());
  modal.querySelector('.govpl-overlay').addEventListener('click', () => modal.remove());
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectFloatingButton);
} else {
  injectFloatingButton();
}
