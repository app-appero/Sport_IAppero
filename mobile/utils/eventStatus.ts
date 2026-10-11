import type { Event } from '@/types/api';
import { todayKey } from '@/utils/dates';

function norm(status: string | null | undefined): string {
  return (status ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function hasScore(event: Event): boolean {
  const score = event.score;
  if (!score) return false;
  if (score.display && score.display.trim() && score.display.trim() !== '-') return true;
  return score.home != null && score.away != null;
}

/** Cancelled / postponed / abandoned / walkover — closed, not settleable. */
export function isVoidClosedStatus(status: string | null | undefined): boolean {
  const s = norm(status);
  if (!s) return false;
  return (
    s === 'pst' ||
    s.includes('postpon') ||
    s === 'canc' ||
    s.includes('cancel') ||
    s === 'abd' ||
    s.includes('abandon') ||
    s === 'awd' ||
    s === 'wo' ||
    s.includes('walk over') ||
    s.includes('walkover') ||
    s.includes('void') ||
    s.includes('deleted')
  );
}

export function isPreMatchStatus(status: string | null | undefined): boolean {
  const s = norm(status);
  return (
    !s ||
    s === 'ns' ||
    s === 'scheduled' ||
    s === 'upcoming' ||
    s === 'not started' ||
    s === 'tbd' ||
    s === 'time to be defined'
  );
}

/**
 * True when the event will not get a settleable FT result (void status, or
 * past calendar day still stuck in pre-match with no score — common when the
 * provider never flips NS → abandoned/postponed).
 */
export function isClosedWithoutResult(
  event: Event,
  selectedDate?: string | null,
): boolean {
  if (hasScore(event)) return false;
  if (isVoidClosedStatus(event.status)) return true;
  const day = selectedDate || event.calendar_date;
  if (day && day < todayKey() && isPreMatchStatus(event.status)) return true;
  return false;
}

/** Italian label for UI; null when the score line should be preferred instead. */
export function eventStatusLabel(
  event: Event,
  opts?: { selectedDate?: string | null },
): string | null {
  if (hasScore(event)) return null;

  const s = norm(event.status);

  if (s.includes('postpon') || s === 'pst') return 'Rinviata';
  if (s.includes('abandon') || s === 'abd') return 'Abbandonata';
  if (s.includes('cancel') || s === 'canc') return 'Cancellata';
  if (s.includes('walk over') || s.includes('walkover') || s === 'wo') return 'Walkover';
  if (s === 'awd') return 'Assegnata a tavolino';
  if (s.includes('void')) return 'Annullata';
  if (s.includes('retir')) return 'Ritiro';
  if (s.includes('suspend')) return 'Sospesa';

  if (
    s === 'ft' ||
    s === 'finished' ||
    s.includes('finish') ||
    s === 'played' ||
    s === 'completed' ||
    s === 'ended'
  ) {
    return 'Terminata';
  }

  if (
    s === 'live' ||
    s === '1h' ||
    s === '2h' ||
    s === 'ht' ||
    s.includes('in play') ||
    s.includes('inprogress')
  ) {
    return 'In corso';
  }

  if (isClosedWithoutResult(event, opts?.selectedDate)) {
    // Provider still says NS (or empty) on a past day — no FT result incoming.
    return 'Senza risultato';
  }

  if (isPreMatchStatus(event.status)) return 'Pre-match';

  // Unknown code from provider: show as-is rather than hide it.
  return event.status?.trim() || 'Pre-match';
}
