export function validationError(message, code = 'BAD_INPUT') {
  const err = new Error(message);
  err.status = 400;
  err.code = code;
  return err;
}

export function sendValidationError(res, err) {
  if (err?.status !== 400) throw err;
  return res.status(400).json({
    ok: false,
    error: err.message || 'Invalid input',
    code: err.code || 'BAD_INPUT',
  });
}

export function cleanString(value, {
  max = 250,
  required = false,
  label = 'Field',
} = {}) {
  if (value === undefined || value === null) {
    if (required) throw validationError(`${label} is required`, 'REQUIRED');
    return null;
  }
  const text = String(value).trim();
  if (!text) {
    if (required) throw validationError(`${label} is required`, 'REQUIRED');
    return null;
  }
  if (text.length > max) throw validationError(`${label} is too long`, 'TOO_LONG');
  return text;
}

export function cleanEmail(value, options = {}) {
  const email = cleanString(value, { max: 254, label: options.label || 'Email', required: options.required !== false });
  if (!email) return null;
  const normalized = email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw validationError('Valid email is required', 'EMAIL_INVALID');
  }
  return normalized;
}

export function cleanPhone(value, options = {}) {
  const phone = cleanString(value, { max: 40, label: options.label || 'Phone', required: options.required === true });
  if (!phone) return null;
  if (!/^[0-9+().\-\s]{7,40}$/.test(phone)) {
    throw validationError('Valid phone number is required', 'PHONE_INVALID');
  }
  return phone;
}

export function cleanAmount(value, { max = 100_000, label = 'Amount' } = {}) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw validationError(`${label} must be greater than zero`, 'AMOUNT_INVALID');
  if (amount > max) throw validationError(`${label} is too large for this form`, 'AMOUNT_TOO_LARGE');
  return Math.round(amount * 100) / 100;
}

export function cleanCurrency(value) {
  const currency = cleanString(value || 'USD', { max: 3, label: 'Currency' }) || 'USD';
  const normalized = currency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) throw validationError('Currency must be a three-letter code', 'CURRENCY_INVALID');
  return normalized;
}

export function cleanPositiveInt(value, {
  min = 1,
  max = 100,
  required = false,
  label = 'Number',
} = {}) {
  if ((value === undefined || value === null || value === '') && !required) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw validationError(`${label} is out of range`, 'NUMBER_INVALID');
  }
  return number;
}

export function cleanList(value, {
  maxItems = 10,
  maxLength = 80,
  label = 'List',
} = {}) {
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const cleaned = cleanString(item, { max: maxLength, label, required: false });
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length > maxItems) throw validationError(`${label} has too many entries`, 'TOO_MANY_ITEMS');
  }
  return out;
}
