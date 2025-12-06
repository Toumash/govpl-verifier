import { verifyWebsite } from './utils.js';
import './style.css';

const app = document.getElementById('app');

async function init() {
  // Always show verification popup
  // Welcome page is only opened programmatically on install via background.js
  const result = await verifyWebsite();
  
  app.innerHTML = `
    <div class="popup">
      <div class="header ${result.status}">
        <div class="icon">${result.status === 'safe' ? '✓' : result.status === 'warning' ? '⚠' : '✗'}</div>
        <h1>Weryfikacja GOV.PL</h1>
      </div>
      
      <div class="content">
        <div class="status-box ${result.status}">
          <h2>${result.title}</h2>
          <p>${result.message}</p>
        </div>
        
        <div class="details">
          <div class="detail-item">
            <span class="label">Domena:</span>
            <span class="value ${result.isGovPl ? 'good' : 'bad'}">${result.hostname}</span>
          </div>
          <div class="detail-item">
            <span class="label">Protokół:</span>
            <span class="value ${result.hasHttps ? 'good' : 'bad'}">${result.hasHttps ? 'HTTPS ✓' : 'HTTP ✗'}</span>
          </div>
          ${result.isOfficial !== null ? `
            <div class="detail-item">
              <span class="label">Lista oficjalna:</span>
              <span class="value ${result.isOfficial ? 'good' : 'bad'}">${result.isOfficial ? 'Potwierdzona ✓' : 'Nie znaleziono ✗'}</span>
            </div>
          ` : ''}
        </div>
        
        ${result.details && result.details.length > 0 ? `
          <div class="verification-details">
            ${result.details.map(detail => `<div class="detail-line">${detail}</div>`).join('')}
          </div>
        ` : ''}
        
        ${result.canVerify ? `
          <button id="verify-btn" class="btn-primary">
            Zweryfikuj w mObywatel
          </button>
        ` : ''}
        
        ${result.status === 'danger' ? `
          <button id="report-btn" class="btn-secondary">
            Zgłoś podejrzaną stronę
          </button>
        ` : ''}
        
        <a href="https://www.dns.pl/lista_gov_pl_z_www.csv" target="_blank" class="link">
          Zobacz listę oficjalnych stron GOV.PL →
        </a>
      </div>
    </div>
  `;
  
  // Event listeners
  const verifyBtn = document.getElementById('verify-btn');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', async () => {
      await chrome.tabs.sendMessage(result.tabId, { action: 'showQR', url: result.url });
      window.close();
    });
  }
  
  const reportBtn = document.getElementById('report-btn');
  if (reportBtn) {
    reportBtn.addEventListener('click', async () => {
      console.log('Report button clicked, sending message to tab:', result.tabId);
      try {
        await chrome.tabs.sendMessage(result.tabId, { 
          action: 'showReportModal', 
          url: result.url,
          hostname: result.hostname
        });
        console.log('Message sent successfully');
        window.close();
      } catch (error) {
        console.error('Error sending message:', error);
        // Fallback - open CERT.PL directly if content script not loaded
        chrome.tabs.create({ url: 'https://incydent.cert.pl/domena#!/lang=pl' });
        window.close();
      }
    });
  }
  
  // Update icon
  updateIcon(result.status, result.tabId);
}

function updateIcon(status, tabId) {
  // Always use default grey icon - badge will show status
  const icons = {
    16: 'public/icons/icon-16.png',
    48: 'public/icons/icon-48.png',
    128: 'public/icons/icon-128.png'
  };
  
  chrome.action.setIcon({ tabId, path: icons }).catch(() => {});
}

init();
