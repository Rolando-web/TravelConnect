export const PH_PREFIX = "+63";
export const PH_MOBILE_LENGTH = 10;

export function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function sanitizePhMobile(value) {
  let digits = onlyDigits(value);
  if (digits.startsWith("639")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, PH_MOBILE_LENGTH);
}

export function formatPhMobile(localDigits) {
  const d = onlyDigits(localDigits).slice(0, PH_MOBILE_LENGTH);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

export function formatPhMobileFull(localDigits) {
  const local = onlyDigits(localDigits).slice(0, PH_MOBILE_LENGTH);
  if (!local) return "";
  return `${PH_PREFIX} ${formatPhMobile(local)}`;
}

export const PH_MOBILE_RE = /^9\d{9}$/;

export function isValidPhMobile(value) {
  return PH_MOBILE_RE.test(onlyDigits(value));
}