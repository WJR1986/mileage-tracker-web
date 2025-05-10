// js/state.js

export const REIMBURSEMENT_RATE_PER_MILE = 0.45;

export let tripSequence = {
  addresses: [],
  calculatedTotalDistanceMiles: null,
  calculatedTotalReimbursement: null,
  calculatedLegDistances: []
};

export function clearTripState() {
  tripSequence = {
    addresses: [],
    calculatedTotalDistanceMiles: null,
    calculatedTotalReimbursement: null,
    calculatedLegDistances: []
  };
}