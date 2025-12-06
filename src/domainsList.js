// Module for fetching and caching official gov.pl domains list
const DOMAINS_LIST_URL = 'https://www.dns.pl/lista_gov_pl_z_www.csv';
const CACHE_KEY = 'govpl_domains_cache';
const CACHE_TIMESTAMP_KEY = 'govpl_domains_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch and parse the official gov.pl domains list from dns.pl
 */
async function fetchDomainsList() {
  try {
    console.log('Fetching domains list from:', DOMAINS_LIST_URL);
    const response = await fetch(DOMAINS_LIST_URL, {
      method: 'GET',
      cache: 'no-cache'
    });
    
    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log('Fetched text length:', text.length);
    
    // Parse CSV - expecting format with domains (possibly with www. prefix)
    const lines = text.split('\n');
    const domains = new Set();
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        // Remove any quotes or extra whitespace
        const domain = trimmed.replace(/["']/g, '').toLowerCase();
        
        // Add both with and without www
        domains.add(domain);
        if (domain.startsWith('www.')) {
          domains.add(domain.substring(4));
        } else {
          domains.add('www.' + domain);
        }
      }
    }
    
    const domainArray = Array.from(domains);
    console.log('Parsed domains count:', domainArray.length);
    
    return domainArray;
  } catch (error) {
    console.error('Error fetching domains list:', error, error.message, error.stack);
    return null;
  }
}

/**
 * Get cached domains list or fetch new one if cache is expired
 */
export async function getOfficialDomainsList() {
  try {
    // Try to get from cache first
    const cached = await chrome.storage.local.get([CACHE_KEY, CACHE_TIMESTAMP_KEY]);
    const timestamp = cached[CACHE_TIMESTAMP_KEY];
    const domains = cached[CACHE_KEY];
    
    console.log('Cache check:', { 
      hasDomains: !!domains, 
      domainsCount: domains?.length,
      hasTimestamp: !!timestamp,
      age: timestamp ? Date.now() - timestamp : null,
      isExpired: timestamp ? (Date.now() - timestamp > CACHE_DURATION) : true
    });
    
    // Check if cache is valid
    if (domains && timestamp && (Date.now() - timestamp < CACHE_DURATION)) {
      console.log('Using cached domains list');
      return domains;
    }
    
    // Cache expired or doesn't exist, fetch new list
    console.log('Cache expired or missing, fetching fresh list...');
    const freshDomains = await fetchDomainsList();
    
    if (freshDomains && freshDomains.length > 0) {
      // Save to cache
      console.log('Saving fresh domains to cache');
      await chrome.storage.local.set({
        [CACHE_KEY]: freshDomains,
        [CACHE_TIMESTAMP_KEY]: Date.now()
      });
      return freshDomains;
    }
    
    // If fetch failed but we have old cache, return it
    if (domains) {
      console.warn('Using expired cache due to fetch failure');
      return domains;
    }
    
    console.error('No domains list available (fetch failed and no cache)');
    return null;
  } catch (error) {
    console.error('Error getting domains list:', error, error.message);
    return null;
  }
}

/**
 * Check if a domain is in the official gov.pl list
 */
export async function isOfficialGovPlDomain(hostname) {
  const domainsList = await getOfficialDomainsList();
  
  if (!domainsList) {
    // If we can't fetch the list, fall back to basic check
    return null; // null indicates we couldn't verify
  }
  
  const normalizedHostname = hostname.toLowerCase();
  return domainsList.includes(normalizedHostname);
}

/**
 * Force refresh the domains list cache
 */
export async function refreshDomainsList() {
  const freshDomains = await fetchDomainsList();
  
  if (freshDomains && freshDomains.length > 0) {
    await chrome.storage.local.set({
      [CACHE_KEY]: freshDomains,
      [CACHE_TIMESTAMP_KEY]: Date.now()
    });
    return true;
  }
  
  return false;
}

/**
 * Get cache info for debugging
 */
export async function getCacheInfo() {
  const cached = await chrome.storage.local.get([CACHE_KEY, CACHE_TIMESTAMP_KEY]);
  return {
    domainsCount: cached[CACHE_KEY]?.length || 0,
    timestamp: cached[CACHE_TIMESTAMP_KEY],
    age: cached[CACHE_TIMESTAMP_KEY] ? Date.now() - cached[CACHE_TIMESTAMP_KEY] : null,
    isExpired: cached[CACHE_TIMESTAMP_KEY] ? (Date.now() - cached[CACHE_TIMESTAMP_KEY] > CACHE_DURATION) : true
  };
}
