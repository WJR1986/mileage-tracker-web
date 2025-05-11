// js/trip.js

import { REIMBURSEMENT_RATE_PER_MILE } from './state.js';

export function parseDistanceTextToMiles(text) {
  const match = text.match(/([\d.]+)\s*miles/);
  return match ? parseFloat(match[1]) : 0;
}

export function calculateReimbursement(distanceInMiles) {
  return parseFloat((distanceInMiles * REIMBURSEMENT_RATE_PER_MILE).toFixed(2));
}

export function formatTripDatetime(date, time) {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  
  if (isMobile) {
    // Handle native input values
    const [hours, minutes] = time.split(':');
    const dateObj = new Date(date);
    dateObj.setHours(hours, minutes);
    return dateObj.toISOString();
  }
  
  // Existing desktop formatting
  return `${date}T${time}:00Z`;
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
