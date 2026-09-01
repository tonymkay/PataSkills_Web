/**
 * Sanitizes and validates an email string with RFC compliance.
 */
export function sanitizeAndValidateEmail(raw: string): { valid: boolean; email: string; error?: string } {
  const sanitized = raw.trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (!sanitized) {
    return { valid: false, email: sanitized, error: 'Email address is required' };
  }

  // RFC-compliant email format checking user, domain, and TLD
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(sanitized)) {
    return { valid: false, email: sanitized, error: 'Please enter a valid email address' };
  }

  const parts = sanitized.split('@');
  if (parts.length !== 2) {
    return { valid: false, email: sanitized, error: 'Please enter a valid email address' };
  }

  const [userPart, domainPart] = parts;
  if (userPart.length > 64) {
    return { valid: false, email: sanitized, error: 'Email username is too long' };
  }

  const domainSubparts = domainPart.split('.');
  const tld = domainSubparts[domainSubparts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-z]{2,24}$/.test(tld)) {
    return { valid: false, email: sanitized, error: 'Please enter a valid domain (e.g. .com, .org)' };
  }

  return { valid: true, email: sanitized };
}

/**
 * Shortens an email for display: keeps a short prefix of the local part and
 * the full domain, with an ellipsis in between (e.g. "tonymk...@gmail.com").
 * Leaves short emails untouched.
 */
export function truncateEmailMiddle(email: string, prefixLength: number = 6): string {
  const at = email.indexOf('@');
  if (at === -1) return email;

  const local = email.slice(0, at);
  const domain = email.slice(at); // includes leading '@'

  if (local.length <= prefixLength) return email;

  return `${local.slice(0, prefixLength)}...${domain}`;
}
