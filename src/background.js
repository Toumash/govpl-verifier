// Background service worker
console.log('GOV.PL Verifier Extension loaded');

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

function updateIconForTab(tabId, url) {
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
      status = 'safe';
      badge = '✓';
      badgeColor = '#28a745';
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
