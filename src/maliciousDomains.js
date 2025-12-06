// Module for checking malicious domains from CERT.PL
const CERT_WARNINGS_URL = 'https://cert.pl/lista-ostrzezen/';
const CERT_DOMAINS_URL = 'https://hole.cert.pl/domains/v2/domains.txt';
const MALICIOUS_CACHE_KEY = 'malicious_domains_cache';
const MALICIOUS_TIMESTAMP_KEY = 'malicious_domains_timestamp';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours - more frequent updates for security

/**
 * Fetch and parse the CERT.PL malicious domains list
 */
async function fetchMaliciousDomains() {
  try {
    console.log('Fetching malicious domains from CERT.PL:', CERT_DOMAINS_URL);
    const response = await fetch(CERT_DOMAINS_URL, {
      method: 'GET',
      cache: 'no-cache'
    });
    
    console.log('CERT.PL Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log('Fetched malicious domains text length:', text.length);
    
    // Parse text file - one domain per line
    const lines = text.split('\n');
    const domains = new Set();
    
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith(';')) {
        // Remove protocol if present
        const domain = trimmed.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (domain) {
          domains.add(domain);
          // Also add with www variant
          if (!domain.startsWith('www.')) {
            domains.add('www.' + domain);
          } else {
            domains.add(domain.substring(4));
          }
        }
      }
    }
    
    const domainArray = Array.from(domains);
    console.log('Parsed malicious domains count:', domainArray.length);
    
    return domainArray;
  } catch (error) {
    console.error('Error fetching malicious domains:', error, error.message);
    return null;
  }
}

/**
 * Get cached malicious domains list or fetch new one if cache is expired
 */
export async function getMaliciousDomainsList() {
  try {
    const cached = await chrome.storage.local.get([MALICIOUS_CACHE_KEY, MALICIOUS_TIMESTAMP_KEY]);
    const timestamp = cached[MALICIOUS_TIMESTAMP_KEY];
    const domains = cached[MALICIOUS_CACHE_KEY];
    
    console.log('Malicious domains cache check:', { 
      hasDomains: !!domains, 
      domainsCount: domains?.length,
      age: timestamp ? Date.now() - timestamp : null,
      isExpired: timestamp ? (Date.now() - timestamp > CACHE_DURATION) : true
    });
    
    // Check if cache is valid
    if (domains && timestamp && (Date.now() - timestamp < CACHE_DURATION)) {
      console.log('Using cached malicious domains list');
      return domains;
    }
    
    // Cache expired or doesn't exist, fetch new list
    console.log('Fetching fresh malicious domains list...');
    const freshDomains = await fetchMaliciousDomains();
    
    if (freshDomains && freshDomains.length > 0) {
      console.log('Saving fresh malicious domains to cache');
      await chrome.storage.local.set({
        [MALICIOUS_CACHE_KEY]: freshDomains,
        [MALICIOUS_TIMESTAMP_KEY]: Date.now()
      });
      return freshDomains;
    }
    
    // If fetch failed but we have old cache, return it
    if (domains) {
      console.warn('Using expired malicious domains cache due to fetch failure');
      return domains;
    }
    
    console.error('No malicious domains list available');
    return null;
  } catch (error) {
    console.error('Error getting malicious domains list:', error);
    return null;
  }
}

/**
 * Check if a domain is on the malicious list
 */
export async function isMaliciousDomain(hostname) {
  const maliciousList = await getMaliciousDomainsList();
  
  if (!maliciousList) {
    return false; // If we can't fetch the list, don't block
  }
  
  const normalizedHostname = hostname.toLowerCase();
  
  // Check exact match
  if (maliciousList.includes(normalizedHostname)) {
    return true;
  }
  
  // Check if any parent domain is malicious
  const parts = normalizedHostname.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const parentDomain = parts.slice(i).join('.');
    if (maliciousList.includes(parentDomain)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get malicious domains cache info
 */
export async function getMaliciousCacheInfo() {
  const cached = await chrome.storage.local.get([MALICIOUS_CACHE_KEY, MALICIOUS_TIMESTAMP_KEY]);
  return {
    domainsCount: cached[MALICIOUS_CACHE_KEY]?.length || 0,
    timestamp: cached[MALICIOUS_TIMESTAMP_KEY],
    age: cached[MALICIOUS_TIMESTAMP_KEY] ? Date.now() - cached[MALICIOUS_TIMESTAMP_KEY] : null,
    isExpired: cached[MALICIOUS_TIMESTAMP_KEY] ? (Date.now() - cached[MALICIOUS_TIMESTAMP_KEY] > CACHE_DURATION) : true,
    certWarningsUrl: CERT_WARNINGS_URL
  };
}
