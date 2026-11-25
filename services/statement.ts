import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Account, Profile } from '../types/db';
import {
  buildStatementHtml,
  buildStatementSummary,
  endOfLocalDayIso,
  formatIsoDateKey,
  startOfLocalDayIso,
  type StatementSummary,
} from '../utils/statement';
import { listTransactionsInRange } from './transactions';

export type FetchStatementResult = {
  summary: StatementSummary | null;
  errorMessage: string | null;
};

export type ExportStatementResult = {
  uri: string | null;
  shared: boolean;
  printedOnWeb: boolean;
  errorMessage: string | null;
};

/**
 * Load transactions for `[fromDate, toDate]` plus any completed post-period
 * transactions so opening, closing, and running balances are exact.
 */
export async function fetchStatementSummary(params: {
  account: Account;
  profile: Profile | null;
  fromDate: Date;
  toDate: Date;
}): Promise<FetchStatementResult> {
  const fromIso = startOfLocalDayIso(params.fromDate);
  const toIso = endOfLocalDayIso(params.toDate);
  const needsPostRange = new Date(toIso).getTime() < Date.now();

  const [rangeRes, postRes] = await Promise.all([
    listTransactionsInRange({
      fromIso,
      toIso,
      ascending: true,
    }),
    needsPostRange
      ? listTransactionsInRange({
          afterIso: toIso,
          ascending: true,
          status: 'completed',
        })
      : Promise.resolve({ transactions: [], errorMessage: null }),
  ]);

  if (rangeRes.errorMessage) {
    return { summary: null, errorMessage: rangeRes.errorMessage };
  }
  if (postRes.errorMessage) {
    return { summary: null, errorMessage: postRes.errorMessage };
  }

  const summary = buildStatementSummary({
    account: params.account,
    profile: params.profile,
    fromDate: params.fromDate,
    toDate: params.toDate,
    rangeTransactions: rangeRes.transactions,
    postRangeTransactions: postRes.transactions,
  });

  return { summary, errorMessage: null };
}

/**
 * Render the statement as a PDF document and present the native save/share
 * sheet on iOS/Android or the browser Save-as-PDF print dialog on Web.
 */
export async function exportStatementPdf(
  summary: StatementSummary,
): Promise<ExportStatementResult> {
  try {
    const html = buildStatementHtml(summary);

    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return {
        uri: null,
        shared: false,
        printedOnWeb: true,
        errorMessage: null,
      };
    }

    const { uri } = await Print.printToFileAsync({
      html,
      width: 595,
      height: 842,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      const fromKey = formatIsoDateKey(summary.fromDate);
      const toKey = formatIsoDateKey(summary.toDate);
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `SmartBank Statement (${fromKey} to ${toKey})`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ uri });
    }

    return {
      uri,
      shared: canShare,
      printedOnWeb: false,
      errorMessage: null,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[statement] exportStatementPdf failed:', err);
    return {
      uri: null,
      shared: false,
      printedOnWeb: false,
      errorMessage: 'Could not generate the PDF statement. Please try again.',
    };
  }
}

/** Re-open the native share sheet for a previously generated PDF URI. */
export async function shareExistingStatementPdf(
  uri: string,
  fromDate: Date,
  toDate: Date,
): Promise<{ ok: boolean; errorMessage: string | null }> {
  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      await Print.printAsync({ uri });
      return { ok: true, errorMessage: null };
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `SmartBank Statement (${formatIsoDateKey(fromDate)} to ${formatIsoDateKey(toDate)})`,
      UTI: 'com.adobe.pdf',
    });
    return { ok: true, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[statement] shareExistingStatementPdf failed:', err);
    return { ok: false, errorMessage: 'Could not open share dialog. Please try again.' };
  }
}

/** Open the native print / Save-as-PDF preview directly from HTML. */
export async function printStatementSummary(
  summary: StatementSummary,
): Promise<{ ok: boolean; errorMessage: string | null }> {
  try {
    const html = buildStatementHtml(summary);
    await Print.printAsync({ html });
    return { ok: true, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[statement] printStatementSummary failed:', err);
    return { ok: false, errorMessage: 'Could not open print preview. Please try again.' };
  }
}
