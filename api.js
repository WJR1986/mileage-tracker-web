import { utils } from './utils.js';
import { REIMBURSEMENT_RATE_PER_MILE } from './config.js';

export const api = {
    fetchAddresses: async () => {
        try {
            const authHeaders = await utils.getAuthHeader();
            const response = await fetch('/.netlify/functions/hello', {
                method: 'GET',
                headers: authHeaders
            });
            
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
            }
            
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    postCalculateMileage: async (addressesArray) => {
        try {
            const response = await fetch('/.netlify/functions/calculate-mileage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addresses: addressesArray })
            });
            
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
            }
            
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    saveTrip: async (tripData, method = 'POST', tripId = null) => {
        try {
            const authHeaders = await utils.getAuthHeader();
            const url = '/.netlify/functions/save-trip';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify(method === 'PUT' ? { id: tripId, ...tripData } : tripData)
            });
            
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
            }
            
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    deleteTrip: async (tripId) => {
        try {
            const authHeaders = await utils.getAuthHeader();
            const response = await fetch('/.netlify/functions/save-trip', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify({ id: tripId })
            });
            
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
            }
            
            return await response.json();
        } catch (error) {
            throw error;
        }
    }
};