// state.js
export const REIMBURSEMENT_RATE_PER_MILE = 0.45;

export const tripState = {
  sequence: [],
  calculatedTotalDistanceMiles: null,
  calculatedTotalReimbursement: null,
  calculatedLegDistances: []
};

export let savedTripHistory = [];

export function clearTripState() {
  tripState.sequence = [];
  tripState.calculatedTotalDistanceMiles = null;
  tripState.calculatedTotalReimbursement = null;
  tripState.calculatedLegDistances = [];
  // Clear localStorage if used
  localStorage.removeItem('tripState');
}