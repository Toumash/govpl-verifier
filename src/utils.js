// Verify if domain is official gov.pl
function isGovPlDomain(hostname) {
  return hostname.endsWith('.gov.pl') || hostname === 'gov.pl';
}

// Check if HTTPS
function isSecure(url) {
  return url.startsWith('https://');
}

// Generate crypto-secure nonce
export function generateNonce() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Verify website
export async function verifyWebsite() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url) {
    return {
      status: 'error',
      title: 'Błąd',
      message: 'Nie można odczytać adresu strony'
    };
  }

  const url = new URL(tab.url);
  const hostname = url.hostname;
  const protocol = url.protocol;
  
  const isGovPl = isGovPlDomain(hostname);
  const hasHttps = protocol === 'https:';
  
  let status, title, message;
  
  if (isGovPl && hasHttps) {
    status = 'safe';
    title = 'Strona zweryfikowana ✓';
    message = 'To jest oficjalna strona GOV.PL z bezpiecznym połączeniem HTTPS.';
  } else if (isGovPl && !hasHttps) {
    status = 'warning';
    title = 'Ostrzeżenie ⚠';
    message = 'Strona GOV.PL, ale połączenie nie jest zabezpieczone (brak HTTPS).';
  } else {
    status = 'danger';
    title = 'OSTRZEŻENIE ✗';
    message = 'To NIE jest strona GOV.PL! Nie wprowadzaj żadnych danych osobowych.';
  }
  
  return {
    status,
    title,
    message,
    url: tab.url,
    hostname,
    hasHttps,
    isGovPl,
    canVerify: isGovPl && hasHttps,
    tabId: tab.id
  };
}
