// js/trip.js

import { REIMBURSEMENT_RATE_PER_MILE } from './state.js';

export function parseDistanceTextToMiles(text) {
  const match = text.match(/([\d.]+)\s*miles/);
  return match ? parseFloat(match[1]) : 0;
}

export function calculateReimbursement(distanceInMiles) {
  return parseFloat((distanceInMiles * REIMBURSEMENT_RATE_PER_MILE).toFixed(2));
}

export function formatTripDatetime(dateStr, timeStr) {
  if (dateStr && timeStr) return `${dateStr}T${timeStr}:00`;
  if (dateStr) return `${dateStr}T00:00:00`;
  return null;
}

export function buildTripPayload(sequence, totalMiles, reimbursement, legDistances, datetimeStr) {
  return {
    tripSequence: sequence.map(addr => ({ id: addr.id, address_text: addr.address_text })),
    totalDistanceMiles: totalMiles,
    reimbursementAmount: reimbursement,
    legDistances: legDistances,
    tripDatetime: datetimeStr
  };
}
