import Dexie from 'dexie';

export const db = new Dexie('MileageTrackerDB');
db.version(1).stores({
  addresses: '++id, address_text, created_at, synced',
  trips: '++id, trip_datetime, total_distance_miles, reimbursement_amount, trip_data, leg_distances, synced'
});
