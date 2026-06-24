// src/utils/helpers.js

// Strips fields we never want to send to the browser (the password hash).
export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}
// Very small validation helper — checks a list of required string fields
// are present and non-empty on req.body. Returns an error message string,
// or null if everything required is there.
export function missingFields(body, fields) {
  for (const field of fields) {
    if (!body[field] || (typeof body[field] === 'string' && !body[field].trim())) {
      return `"${field}" is required.`;
    }
  }
  return null;
}

export function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
