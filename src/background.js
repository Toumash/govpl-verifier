// Background service worker
import { getOfficialDomainsList, isOfficialGovPlDomain, getCacheInfo } from './domainsList.js';

console.log('GOV.PL Verifier Extension loaded');

// Pre-fetch domains list on startup
async function initializeDomainsList() {
  try {
    console.log('Fetching official gov.pl domains list...');
    const domains = await getOfficialDomainsList();
    if (domains) {
      console.log(`Loaded ${domains.length} official gov.pl domains`);
    } else {
      console.warn('Failed to load domains list');
    }
    
    // Log cache info
    const cacheInfo = await getCacheInfo();
    console.log('Cache info:', cacheInfo);
  } catch (error) {
    console.error('Error initializing domains list:', error);
  }
}

// Update icon when tab changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    updateIconForTab(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    updateIconForTab(activeInfo.tabId, tab.url);
  }
});

async function updateIconForTab(tabId, url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const protocol = urlObj.protocol;
    
    const isGovPl = hostname.endsWith('.gov.pl') || hostname === 'gov.pl';
    const isHttps = protocol === 'https:';
    
    let status = 'danger';
    let badge = '✗';
    let badgeColor = '#dc3545';
    
    if (isGovPl && isHttps) {
      // Check against official list
      const isOfficial = await isOfficialGovPlDomain(hostname);
      
      if (isOfficial === true) {
        status = 'safe';
        badge = '✓';
        badgeColor = '#28a745';
      } else if (isOfficial === false) {
        // Domain has .gov.pl but not on official list
        status = 'warning';
        badge = '⚠';
        badgeColor = '#ffc107';
      } else {
        // Couldn't verify (list unavailable)
        status = 'safe';
        badge = '✓';
        badgeColor = '#28a745';
      }
    } else if (isGovPl && !isHttps) {
      status = 'warning';
      badge = '!';
      badgeColor = '#ffc107';
    }
    
    chrome.action.setBadgeText({ tabId, text: badge });
    chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor });
    
  } catch (error) {
    console.error('Error updating icon:', error);
  }
}

// On install
chrome.runtime.onInstalled.addListener(async (details) => {
  // Initialize domains list on install or update
  await initializeDomainsList();
  
  if (details.reason === 'install') {
    // Pin the extension icon to toolbar
    try {
      await chrome.action.setUserSettings({
        isOnToolbar: true
      });
      console.log('Extension icon pinned to toolbar');
    } catch (error) {
      console.log('Could not pin extension icon (may require Chrome 121+):', error);
    }
    
    // Open welcome page
    chrome.tabs.create({ url: 'https://www.gov.pl/mobywatel' });
  }
});

// Refresh domains list daily
chrome.alarms.create('refreshDomainsList', { periodInMinutes: 1440 }); // 24 hours

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshDomainsList') {
    console.log('Refreshing domains list...');
    initializeDomainsList();
  }
});

// Initialize on startup
initializeDomainsList();
