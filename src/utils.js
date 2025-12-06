import { isOfficialGovPlDomain } from './domainsList.js';

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
  
  // Check against official list
  const isOfficial = await isOfficialGovPlDomain(hostname);
  
  let status, title, message, details = [];
  
  if (isGovPl && hasHttps && isOfficial === true) {
    status = 'safe';
    title = 'Strona zweryfikowana ✓';
    message = 'To jest oficjalna strona GOV.PL potwierdzona na liście rządowych domen.';
    details.push('✓ Domena potwierdzona na liście dns.pl');
    details.push('✓ Bezpieczne połączenie HTTPS');
  } else if (isGovPl && hasHttps && isOfficial === false) {
    status = 'warning';
    title = 'Ostrzeżenie ⚠';
    message = 'Domena gov.pl, ale NIE znajduje się na oficjalnej liście rządowej!';
    details.push('✗ Domena NIE jest na liście dns.pl');
    details.push('✓ Bezpieczne połączenie HTTPS');
    details.push('⚠ Sprawdź czy to oficjalna strona');
  } else if (isGovPl && hasHttps && isOfficial === null) {
    status = 'safe';
    title = 'Strona zweryfikowana ✓';
    message = 'To jest strona GOV.PL z bezpiecznym połączeniem HTTPS.';
    details.push('⚠ Nie można zweryfikować z listą dns.pl');
    details.push('✓ Bezpieczne połączenie HTTPS');
  } else if (isGovPl && !hasHttps) {
    status = 'warning';
    title = 'Ostrzeżenie ⚠';
    message = 'Strona GOV.PL, ale połączenie nie jest zabezpieczone (brak HTTPS).';
    details.push('✗ Brak bezpiecznego połączenia HTTPS');
  } else {
    status = 'danger';
    title = 'OSTRZEŻENIE ✗';
    message = 'To NIE jest strona GOV.PL! Nie wprowadzaj żadnych danych osobowych.';
    details.push('✗ Nie jest domeną gov.pl');
  }
  
  return {
    status,
    title,
    message,
    details,
    url: tab.url,
    hostname,
    hasHttps,
    isGovPl,
    isOfficial,
    canVerify: isGovPl && hasHttps,
    tabId: tab.id
  };
}
