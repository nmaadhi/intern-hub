// server/utils/validateEmail.js
// Validates emails with format check + DNS MX record check.

const dns = require('dns');
const dnsPromises = dns.promises;

// IMPORTANT: Node's dns.resolveMx() bypasses your OS's normal DNS settings
// and queries nameservers directly. On some networks (certain ISPs, VPNs,
// or router setups), Node can't auto-detect the right DNS server to ask,
// causing it to fail even for real domains like gmail.com. Pointing it at
// a known public resolver (Google's) fixes this reliably.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email is required' };
  }

  const normalized = email.toLowerCase().trim();

  if (!EMAIL_REGEX.test(normalized)) {
    return { valid: false, reason: 'Invalid email format' };
  }

  const domain = normalized.split('@')[1];

  try {
    const mxRecords = await dnsPromises.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { valid: false, reason: `Email domain "${domain}" cannot receive emails` };
    }
  } catch (err) {
    return { valid: false, reason: `Email domain "${domain}" does not exist` };
  }

  return { valid: true, normalized };
}

module.exports = { validateEmail };