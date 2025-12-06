import { verifyWebsite } from './utils.js';
import './style.css';

const app = document.getElementById('app');

async function init() {
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
          <div class="detail-item">
            <span class="label">Status:</span>
            <span class="value">${result.isGovPl ? 'Domena GOV.PL' : 'Inna domena'}</span>
          </div>
        </div>
        
        ${result.canVerify ? `
          <button id="verify-btn" class="btn-primary">
            Zweryfikuj w mObywatel
          </button>
        ` : ''}
        
        ${result.status === 'danger' || result.status === 'warning' ? `
          <button id="report-btn" class="btn-secondary">
            Zgłoś podejrzaną stronę
          </button>
        ` : ''}
        
        <a href="https://www.gov.pl/web/gov/lista-stron-govpl" target="_blank" class="link">
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
    reportBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: `https://incydent.cert.pl/report?url=${encodeURIComponent(result.url)}` });
    });
  }
  
  // Update icon
  updateIcon(result.status, result.tabId);
}

function updateIcon(status, tabId) {
  const icons = {
    safe: { 16: 'icons/safe-16.png', 48: 'icons/safe-48.png', 128: 'icons/safe-128.png' },
    warning: { 16: 'icons/warning-16.png', 48: 'icons/warning-48.png', 128: 'icons/warning-128.png' },
    danger: { 16: 'icons/danger-16.png', 48: 'icons/danger-48.png', 128: 'icons/danger-128.png' }
  };
  
  chrome.action.setIcon({ tabId, path: icons[status] || icons.danger }).catch(() => {});
}

init();
