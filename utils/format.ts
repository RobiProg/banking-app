/**
 * Pure formatting helpers. No React, no Supabase.
 *
 * - Currency: ৳ (Taka), used in plan.md examples. Switch to '$' or
 *   '€' here if your project needs a different currency.
 * - Dates use `en-GB` short month names for compact UI rows.
 */

const CURRENCY_SYMBOL = '৳';

const numberFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Format a decimal string/number as ৳1,234.50. Always 2 dp. */
export function formatBDT(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return `${CURRENCY_SYMBOL}0.00`;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return `${CURRENCY_SYMBOL}0.00`;
  return `${CURRENCY_SYMBOL}${numberFmt.format(n)}`;
}

/**
 * Format a positive number with a +/- sign (used in transaction rows).
 * Positive amounts are coloured "credit" (green) on screen; this
 * just adds the sign glyph.
 */
export function formatSignedBDT(value: string | number | null | undefined, sign: 'positive' | 'negative'): string {
  const abs = formatBDT(Math.abs(typeof value === 'number' ? value : Number(value ?? 0)));
  return sign === 'positive' ? `+${abs}` : `-${abs}`;
}

/** Returns the last 4 chars of an account number, prefixed with bullets. */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber) return '•••• ••••';
  const last4 = accountNumber.slice(-4);
  return `•••• ${last4}`;
}

/** "8 Oct 2026, 14:32" — used in transaction rows. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${dateFmt.format(d)}, ${timeFmt.format(d)}`;
}

/** "8 Oct" — compact date for grouped headers. */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return dateFmt.format(d);
}

/** "2 min ago" / "Yesterday" / "8 Oct" — for notification lists. */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDateShort(iso);
}

/** Map a date string to a stable date key (YYYY-MM-DD) for grouping. */
export function dateKey(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Friendly date-group label: Today / Yesterday / "Mon, 8 Oct". */
export function dateGroupLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return 'Yesterday';

  // Day-name + date for this week, otherwise just date.
  const dayDiff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (dayDiff < 7) {
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Initials for avatars. "Maria Rossi" -> "MR". */
export function initialsFromName(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Validate that a free-text amount is a positive number with at most 2 dp. */
export function isValidAmountInput(raw: string): { ok: boolean; value?: number; message?: string } {
  const t = raw.trim();
  if (!t) return { ok: false, message: 'Please enter an amount.' };
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return { ok: false, message: 'Enter a valid amount (e.g. 100 or 100.50).' };
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, message: 'Amount must be greater than zero.' };
  return { ok: true, value: n };
}