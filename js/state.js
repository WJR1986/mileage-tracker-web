// state.js
export const REIMBURSEMENT_RATE_PER_MILE = 0.45;

const initialState = {
  sequence: [],
  calculatedTotalDistanceMiles: null,
  calculatedTotalReimbursement: null,
  calculatedLegDistances: []
};

const stateValidator = {
  sequence: (value) => Array.isArray(value),
  calculatedTotalDistanceMiles: (value) => typeof value === 'number' && value >= 0,
  calculatedTotalReimbursement: (value) => typeof value === 'number' && value >= 0,
  calculatedLegDistances: (value) => Array.isArray(value) && value.every(leg => typeof leg === 'string')
};

export const tripState = new Proxy(initialState, {
  set(target, property, value) {
    if (!(property in target)) {
      throw new Error(`Invalid state property: ${property}`);
    }
    
    if (!stateValidator[property](value)) {
      throw new Error(`Invalid value for ${property}: ${value}`);
    }

    target[property] = value;
    return true;
  }
});

const tripHistory = [];

export const tripHistoryAPI = {
  getTrips: () => [...tripHistory],
  addTrip: (trip) => {
    if (!trip?.id || typeof trip !== 'object') {
      throw new Error('Invalid trip object');
    }
    tripHistory.push(trip);
  },
  removeTrip: (tripId) => {
    const index = tripHistory.findIndex(t => t.id === tripId);
    if (index === -1) {
      throw new Error(`Trip with ID ${tripId} not found`);
    }
    return tripHistory.splice(index, 1)[0];
  },
  clearHistory: () => {
    tripHistory.length = 0;
  }
};

export function clearTripState() {
  Object.assign(tripState, {
    sequence: [],
    calculatedTotalDistanceMiles: null,
    calculatedTotalReimbursement: null,
    calculatedLegDistances: []
  });
}

// Utility functions
export function getCurrentTripState() {
  return { ...tripState };
}

export function calculateAutoReimbursement() {
  if (tripState.calculatedTotalDistanceMiles === null) return 0;
  return parseFloat((tripState.calculatedTotalDistanceMiles * REIMBURSEMENT_RATE_PER_MILE).toFixed(2));
}

// Debugging utilities
let debugMode = false;

export function enableStateDebugging(enable = true) {
  debugMode = enable;
  if (debugMode) {
    console.log('State debugging enabled');
  }
}

// Proxy handler for debugging
if (process.env.NODE_ENV === 'development') {
  new Proxy(tripState, {
    set(target, property, value) {
      if (debugMode) {
        console.log(`State change: ${property}`, {
          oldValue: target[property],
          newValue: value
        });
      }
      target[property] = value;
      return true;
    }
  });
}