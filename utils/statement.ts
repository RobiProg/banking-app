import {
  parseAmount,
  txnDirection,
  type Account,
  type Profile,
  type Transaction,
  type TxnDirection,
} from '../types/db';
import { formatBDT, formatDateTime } from './format';

export type StatementPresetKey = '1m' | '2m' | '3m' | '6m' | '1y' | 'custom';

export type StatementPreset = {
  key: Exclude<StatementPresetKey, 'custom'>;
  label: string;
  shortLabel: string;
  months: number;
};

export const STATEMENT_PRESETS: StatementPreset[] = [
  { key: '1m', label: 'Last 1 Month', shortLabel: '1 Month', months: 1 },
  { key: '2m', label: 'Last 2 Months', shortLabel: '2 Months', months: 2 },
  { key: '3m', label: 'Last 3 Months', shortLabel: '3 Months', months: 3 },
  { key: '6m', label: 'Last 6 Months', shortLabel: '6 Months', months: 6 },
  { key: '1y', label: 'Last 1 Year', shortLabel: '1 Year', months: 12 },
];

export type StatementLedgerRow = {
  id: string;
  reference: string;
  createdAt: string;
  typeLabel: string;
  description: string;
  direction: TxnDirection;
  amount: number;
  debitAmount: number | null;
  creditAmount: number | null;
  runningBalance: number;
  status: Transaction['status'];
};

export type StatementSummary = {
  account: Account;
  profile: Profile | null;
  fromDate: Date;
  toDate: Date;
  generatedAt: Date;
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  completedCount: number;
  rows: StatementLedgerRow[];
};

/** Normalize a Date to local midnight (00:00:00.000). */
export function normalizeLocalDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Subtract `months` calendar months from `anchorDate`, clamping day-of-month
 * so e.g. March 31 minus 1 month lands on Feb 28/29 rather than rolling into March.
 */
export function subtractMonths(anchorDate: Date, months: number): Date {
  const base = normalizeLocalDate(anchorDate);
  const targetYear = base.getFullYear();
  const targetMonth = base.getMonth() - months;
  const firstOfTarget = new Date(targetYear, targetMonth, 1);
  const lastDayOfTargetMonth = new Date(
    firstOfTarget.getFullYear(),
    firstOfTarget.getMonth() + 1,
    0,
  ).getDate();
  const clampedDay = Math.min(base.getDate(), lastDayOfTargetMonth);
  return new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth(), clampedDay);
}

/** Build a normalized [fromDate, toDate] range for a preset month lookback. */
export function getPresetRange(
  months: number,
  anchor: Date = new Date(),
): { fromDate: Date; toDate: Date } {
  const toDate = normalizeLocalDate(anchor);
  const fromDate = subtractMonths(toDate, months);
  return { fromDate, toDate };
}

/** ISO timestamp for the start of the selected local calendar day (00:00:00.000). */
export function startOfLocalDayIso(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  return d.toISOString();
}

/** ISO timestamp for the end of the selected local calendar day (23:59:59.999). */
export function endOfLocalDayIso(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return d.toISOString();
}

/** Format a local Date as "25 Nov 2026". */
export function formatStatementDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Format a local Date as "YYYY-MM-DD" for filenames and comparisons. */
export function formatIsoDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Validate a statement date range. */
export function validateDateRange(
  fromDate: Date,
  toDate: Date,
  today: Date = new Date(),
): { ok: boolean; message?: string } {
  const from = normalizeLocalDate(fromDate);
  const to = normalizeLocalDate(toDate);
  const maxToday = normalizeLocalDate(today);

  if (from.getTime() > to.getTime()) {
    return {
      ok: false,
      message: '"From" date cannot be after "To" date.',
    };
  }
  if (to.getTime() > maxToday.getTime()) {
    return {
      ok: false,
      message: '"To" date cannot be in the future.',
    };
  }
  return { ok: true };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function signedDelta(txn: Transaction, accountId: string): number {
  if (txn.status !== 'completed') return 0;
  const amount = parseAmount(txn.amount);
  const dir = txnDirection(txn, accountId);
  if (dir === 'credit') return amount;
  if (dir === 'debit') return -amount;
  return 0;
}

function transactionTypeLabel(txn: Transaction, direction: TxnDirection): string {
  const effType = txn.type ?? txn.transaction_type;
  if (effType === 'deposit') return 'Branch Deposit';
  if (effType === 'withdrawal') return 'Cash Withdrawal';
  if (direction === 'credit') return 'Transfer In';
  if (direction === 'debit') return 'Transfer Out';
  return 'Transfer';
}

function transactionParticulars(txn: Transaction, direction: TxnDirection): string {
  const effType = txn.type ?? txn.transaction_type;
  const branchText = txn.branches?.name ? ` (${txn.branches.name})` : '';
  if (txn.description && txn.description.trim()) {
    return `${txn.description.trim()}${branchText}`;
  }
  if (effType === 'deposit') return `Cash counter deposit${branchText}`;
  if (effType === 'withdrawal') return `Simulated cash withdrawal${branchText}`;
  if (direction === 'credit') return 'Incoming P2P account transfer';
  if (direction === 'debit') return 'Outgoing P2P account transfer';
  return 'SmartBank account transaction';
}

/**
 * Compute opening balance, closing balance, period totals, and per-row running
 * balances for the selected statement window.
 */
export function buildStatementSummary(params: {
  account: Account;
  profile: Profile | null;
  fromDate: Date;
  toDate: Date;
  rangeTransactions: Transaction[];
  postRangeTransactions?: Transaction[];
  generatedAt?: Date;
}): StatementSummary {
  const {
    account,
    profile,
    fromDate,
    toDate,
    rangeTransactions,
    postRangeTransactions = [],
    generatedAt = new Date(),
  } = params;

  const sortedRange = [...rangeTransactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const currentBalance = parseAmount(account.balance);

  // Subtract completed balance changes that occurred strictly after `toDate`
  // so the statement closing balance matches the exact end-of-period balance.
  let postRangeNet = 0;
  for (const t of postRangeTransactions) {
    postRangeNet += signedDelta(t, account.id);
  }
  const closingBalance = roundMoney(currentBalance - postRangeNet);

  let totalCredits = 0;
  let totalDebits = 0;
  let completedCount = 0;

  for (const t of sortedRange) {
    if (t.status !== 'completed') continue;
    completedCount += 1;
    const amt = parseAmount(t.amount);
    const dir = txnDirection(t, account.id);
    if (dir === 'credit') totalCredits += amt;
    else if (dir === 'debit') totalDebits += amt;
  }

  totalCredits = roundMoney(totalCredits);
  totalDebits = roundMoney(totalDebits);

  const periodNet = roundMoney(totalCredits - totalDebits);
  const openingBalance = roundMoney(closingBalance - periodNet);

  let cursorBalance = openingBalance;
  const rows: StatementLedgerRow[] = sortedRange.map((t) => {
    const dir = txnDirection(t, account.id);
    const amt = parseAmount(t.amount);
    const isCompleted = t.status === 'completed';

    if (isCompleted) {
      if (dir === 'credit') cursorBalance = roundMoney(cursorBalance + amt);
      else if (dir === 'debit') cursorBalance = roundMoney(cursorBalance - amt);
    }

    return {
      id: t.id,
      reference: t.reference,
      createdAt: t.created_at,
      typeLabel: transactionTypeLabel(t, dir),
      description: transactionParticulars(t, dir),
      direction: dir,
      amount: amt,
      debitAmount: dir === 'debit' ? amt : null,
      creditAmount: dir === 'credit' ? amt : null,
      runningBalance: cursorBalance,
      status: t.status,
    };
  });

  return {
    account,
    profile,
    fromDate: normalizeLocalDate(fromDate),
    toDate: normalizeLocalDate(toDate),
    generatedAt,
    openingBalance,
    closingBalance,
    totalCredits,
    totalDebits,
    completedCount,
    rows,
  };
}

function escapeHtml(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render an A4-ready corporate SmartBank PDF statement HTML document.
 */
export function buildStatementHtml(summary: StatementSummary): string {
  const {
    account,
    profile,
    fromDate,
    toDate,
    generatedAt,
    openingBalance,
    closingBalance,
    totalCredits,
    totalDebits,
    rows,
  } = summary;

  const periodLabel = `${formatStatementDate(fromDate)} – ${formatStatementDate(toDate)}`;
  const generatedLabel = formatDateTime(generatedAt.toISOString());
  const branchName = account.branch?.name ?? 'Dhaka Motijheel Main Branch';
  const branchDistrict = account.branch?.district ?? 'Dhaka';
  const routingCode = account.branch?.routing_code ?? 'SMART-001';

  const rowsHtml =
    rows.length === 0
      ? `
        <tr>
          <td colspan="7" class="empty-cell">
            No transactions were recorded during ${escapeHtml(periodLabel)}.
          </td>
        </tr>
      `
      : rows
          .map((row) => {
            const statusClass = row.status === 'completed' ? 'badge-ok' : 'badge-fail';
            const statusLabel = row.status === 'completed' ? 'Completed' : 'Failed';
            const debitText = row.debitAmount !== null ? escapeHtml(formatBDT(row.debitAmount)) : '—';
            const creditText = row.creditAmount !== null ? escapeHtml(formatBDT(row.creditAmount)) : '—';

            return `
              <tr>
                <td class="nowrap">${escapeHtml(formatDateTime(row.createdAt))}</td>
                <td class="mono">${escapeHtml(row.reference)}</td>
                <td>
                  <div class="txn-type">${escapeHtml(row.typeLabel)}</div>
                  <div class="txn-desc">${escapeHtml(row.description)}</div>
                </td>
                <td class="num debit">${debitText}</td>
                <td class="num credit">${creditText}</td>
                <td class="num balance">${escapeHtml(formatBDT(row.runningBalance))}</td>
                <td class="center"><span class="badge ${statusClass}">${statusLabel}</span></td>
              </tr>
            `;
          })
          .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SmartBank Statement - ${escapeHtml(account.account_number)}</title>
  <style>
    @page {
      size: A4;
      margin: 16mm 14mm 18mm 14mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0B1B2B;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.45;
      background: #FFFFFF;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0A6BD3;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #0A6BD3;
      letter-spacing: -0.4px;
      margin: 0;
    }
    .brand-sub {
      font-size: 10px;
      color: #6B7280;
      margin-top: 2px;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-title {
      font-size: 15px;
      font-weight: 700;
      color: #0B1B2B;
      margin: 0 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .doc-line {
      font-size: 10px;
      color: #4B5563;
      margin: 1px 0;
    }
    .info-grid {
      display: flex;
      gap: 14px;
      margin-bottom: 14px;
    }
    .info-box {
      flex: 1;
      background: #F5F7FA;
      border: 1px solid #E2E6EB;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .info-box-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #6B7280;
      margin-bottom: 6px;
    }
    .kv {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
      gap: 8px;
    }
    .kv-label {
      color: #6B7280;
    }
    .kv-value {
      font-weight: 600;
      color: #0B1B2B;
      text-align: right;
    }
    .summary-strip {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }
    .kpi {
      flex: 1;
      border: 1px solid #E2E6EB;
      border-radius: 8px;
      padding: 9px 10px;
      background: #FFFFFF;
    }
    .kpi-primary {
      background: #E6F0FB;
      border-color: #B3D4F9;
    }
    .kpi-label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      color: #6B7280;
      margin-bottom: 3px;
    }
    .kpi-value {
      font-size: 13px;
      font-weight: 700;
      color: #0B1B2B;
      font-variant-numeric: tabular-nums;
    }
    .kpi-credit { color: #2E7D32; }
    .kpi-debit { color: #D32F2F; }
    .kpi-primary .kpi-value { color: #0856A8; }
    .section-heading {
      font-size: 12px;
      font-weight: 700;
      color: #0B1B2B;
      margin: 0 0 8px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    thead th {
      background: #0A6BD3;
      color: #FFFFFF;
      font-weight: 600;
      text-align: left;
      padding: 7px 6px;
      border: 1px solid #0A6BD3;
    }
    thead th.num {
      text-align: right;
    }
    thead th.center {
      text-align: center;
    }
    tbody td {
      padding: 6px;
      border-bottom: 1px solid #E2E6EB;
      vertical-align: top;
    }
    tbody tr:nth-child(even) {
      background: #FAFBFC;
    }
    .nowrap {
      white-space: nowrap;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9.5px;
      white-space: nowrap;
    }
    .num {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .debit { color: #D32F2F; }
    .credit { color: #2E7D32; }
    .balance { color: #0B1B2B; }
    .center { text-align: center; }
    .txn-type {
      font-weight: 600;
      color: #0B1B2B;
    }
    .txn-desc {
      color: #6B7280;
      font-size: 9.5px;
      margin-top: 1px;
    }
    .badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 999px;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-ok {
      background: #E6F4EA;
      color: #2E7D32;
    }
    .badge-fail {
      background: #FDECEC;
      color: #D32F2F;
    }
    .empty-cell {
      text-align: center;
      padding: 22px 12px;
      color: #6B7280;
      font-style: italic;
    }
    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #E2E6EB;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">SmartBank</div>
      <div class="brand-sub">Digital Retail Banking &bull; Bangladesh</div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">Account Statement</div>
      <div class="doc-line"><strong>Period:</strong> ${escapeHtml(periodLabel)}</div>
      <div class="doc-line"><strong>Generated:</strong> ${escapeHtml(generatedLabel)}</div>
      <div class="doc-line"><strong>Currency:</strong> BDT (&#2547;)</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-box-title">Customer Information</div>
      <div class="kv">
        <span class="kv-label">Account Holder</span>
        <span class="kv-value">${escapeHtml(profile?.full_name ?? 'Valued Customer')}</span>
      </div>
      <div class="kv">
        <span class="kv-label">Email</span>
        <span class="kv-value">${escapeHtml(profile?.email ?? '—')}</span>
      </div>
      <div class="kv">
        <span class="kv-label">Phone</span>
        <span class="kv-value">${escapeHtml(profile?.phone ?? '—')}</span>
      </div>
    </div>

    <div class="info-box">
      <div class="info-box-title">Account &amp; Branch Details</div>
      <div class="kv">
        <span class="kv-label">Account Number</span>
        <span class="kv-value">${escapeHtml(account.account_number)}</span>
      </div>
      <div class="kv">
        <span class="kv-label">Account Type / Status</span>
        <span class="kv-value">Savings &bull; ${escapeHtml(account.status.toUpperCase())}</span>
      </div>
      <div class="kv">
        <span class="kv-label">Home Branch</span>
        <span class="kv-value">${escapeHtml(branchName)} (${escapeHtml(branchDistrict)} &bull; ${escapeHtml(routingCode)})</span>
      </div>
    </div>
  </div>

  <div class="summary-strip">
    <div class="kpi">
      <div class="kpi-label">Opening Balance</div>
      <div class="kpi-value">${escapeHtml(formatBDT(openingBalance))}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Credits</div>
      <div class="kpi-value kpi-credit">+${escapeHtml(formatBDT(totalCredits))}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Debits</div>
      <div class="kpi-value kpi-debit">-${escapeHtml(formatBDT(totalDebits))}</div>
    </div>
    <div class="kpi kpi-primary">
      <div class="kpi-label">Closing Balance</div>
      <div class="kpi-value">${escapeHtml(formatBDT(closingBalance))}</div>
    </div>
  </div>

  <div class="section-heading">Transaction Ledger (${rows.length} ${rows.length === 1 ? 'entry' : 'entries'})</div>
  <table>
    <thead>
      <tr>
        <th>Date &amp; Time</th>
        <th>Reference</th>
        <th>Particulars</th>
        <th class="num">Debit</th>
        <th class="num">Credit</th>
        <th class="num">Balance</th>
        <th class="center">Status</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <div>This is a system-generated SmartBank statement and does not require a physical signature.</div>
    <div>Account: ${escapeHtml(account.account_number)}</div>
  </div>
</body>
</html>`;
}
