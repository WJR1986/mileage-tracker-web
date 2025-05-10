// js/state.js

export const REIMBURSEMENT_RATE_PER_MILE = 0.45;

export let savedTripHistory = [];

// Utility to reset global tripSequence and clear calculated data
export function clearTripState() {
  tripSequence = [];
  delete tripSequence.calculatedTotalDistanceMiles;
  delete tripSequence.calculatedTotalReimbursement;
  delete tripSequence.calculatedLegDistances;
}

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