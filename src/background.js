// Background service worker
import { getOfficialDomainsList, isOfficialGovPlDomain, getCacheInfo } from './domainsList.js';
import { getMaliciousDomainsList, isMaliciousDomain, getMaliciousCacheInfo } from './maliciousDomains.js';

console.log('GOV.PL Verifier Extension loaded');

// Pre-fetch domains lists on startup
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

async function initializeMaliciousList() {
  try {
    console.log('Fetching malicious domains list from CERT.PL...');
    const malicious = await getMaliciousDomainsList();
    if (malicious) {
      console.log(`Loaded ${malicious.length} malicious domains from CERT.PL`);
    } else {
      console.warn('Failed to load malicious domains list');
    }
    
    const cacheInfo = await getMaliciousCacheInfo();
    console.log('Malicious domains cache info:', cacheInfo);
  } catch (error) {
    console.error('Error initializing malicious domains list:', error);
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
    
    // Show loading spinner while checking
    chrome.action.setBadgeText({ tabId, text: '...' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#6c757d' });
    
    let status = 'danger';
    let badge = '✗';
    let badgeColor = '#dc3545';
    
    // First check if domain is malicious (highest priority)
    const malicious = await isMaliciousDomain(hostname);
    if (malicious) {
      badge = '✗';
      badgeColor = '#dc3545';
    } else if (isGovPl && isHttps) {
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
    } else {
      // Not a gov.pl domain and not malicious - clear badge
      badge = '';
    }
    
    chrome.action.setBadgeText({ tabId, text: badge });
    chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor });
    
  } catch (error) {
    console.error('Error updating icon:', error);
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkPageSecurity') {
    checkPageSecurity(message).then(sendResponse);
    return true; // Will respond asynchronously
  } else if (message.action === 'openPopup') {
    // Open popup when requested from welcome page
    chrome.action.openPopup().then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('Failed to open popup:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

// Check if page should show security warning
async function checkPageSecurity({ url, hostname, protocol }) {
  try {
    // Check if domain is malicious
    const isMalicious = await isMaliciousDomain(hostname);
    if (isMalicious) {
      return {
        showWarning: true,
        warningType: 'malicious',
        details: { url, hostname }
      };
    }
    
    // Check if it's a gov.pl site without HTTPS
    const isGovPl = hostname.endsWith('.gov.pl') || hostname === 'gov.pl';
    if (isGovPl && protocol !== 'https:') {
      return {
        showWarning: true,
        warningType: 'no-https',
        details: { url, hostname }
      };
    }
    
    return { showWarning: false };
  } catch (error) {
    console.error('Error checking page security:', error);
    return { showWarning: false };
  }
}

// On install
chrome.runtime.onInstalled.addListener(async (details) => {
  // Initialize both lists on install or update
  await Promise.all([
    initializeDomainsList(),
    initializeMaliciousList()
  ]);
  
  if (details.reason === 'install') {
    // Mark welcome as seen immediately so popup won't show it again
    await chrome.storage.local.set({ welcomeSeen: true });
    
    // Open welcome page on first install
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});

// Refresh domains lists periodically
chrome.alarms.create('refreshDomainsList', { periodInMinutes: 1440 }); // 24 hours
chrome.alarms.create('refreshMaliciousList', { periodInMinutes: 360 }); // 6 hours

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshDomainsList') {
    console.log('Refreshing official domains list...');
    initializeDomainsList();
  } else if (alarm.name === 'refreshMaliciousList') {
    console.log('Refreshing malicious domains list...');
    initializeMaliciousList();
  }
});

// Initialize on startup
initializeDomainsList();
initializeMaliciousList();
