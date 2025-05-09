// netlify/functions/calculate-mileage.js

const { createClient } = require('@supabase/supabase-js'); // This line seems out of place in calculate-mileage.js, but keeping it as per provided code. It's not used here.

// node-fetch will be imported *inside* the handler function
// const fetch = await import('node-fetch').then(module => module.default); // REMOVE this line from the top level

// We will need the Google Maps API key here from Netlify Environment Variables
const googleMapsApiKey = process.env.Maps_API_KEY;

// Base URL for the Google Distance Matrix API
const googleApiBaseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';

// Conversion factor from meters to miles
const METERS_TO_MILES = 0.000621371; // Define this constant

exports.handler = async function(event, context) {

    // *** IMPORT node-fetch INSIDE the async handler function ***
    const fetch = await import('node-fetch').then(module => module.default);
    // ***********************************************************

    // Ensure the API key is available
    if (!googleMapsApiKey) {
         console.error("Google Maps API Key is not set in environment variables.");
         return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error: API key missing.' })
        };
    }


    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }


    try {
        const data = JSON.parse(event.body);
        // Expected data: an array of address strings representing the trip sequence
        const tripAddressTexts = data.addresses; // Received array of address strings

        if (!tripAddressTexts || !Array.isArray(tripAddressTexts) || tripAddressTexts.length < 2) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid trip sequence provided. Need at least two addresses.' })
            };
        }

        // Prepare origins and destinations for the Google API call
        const origins = tripAddressTexts.slice(0, tripAddressTexts.length - 1);
        const destinations = tripAddressTexts.slice(1, tripAddressTexts.length);

        // Format addresses for the API call (join with |)
        const originsString = origins.join('|');
        const destinationsString = destinations.join('|');

        // Construct the Google API URL
        const apiUrl = `${googleApiBaseUrl}?origins=${encodeURIComponent(originsString)}&destinations=${encodeURIComponent(destinationsString)}&key=${googleMapsApiKey}`;

        console.log('Calling Google Distance Matrix API:', apiUrl);

        // Make the HTTP request to the Google Distance Matrix API
        const googleApiResponse = await fetch(apiUrl);

        // Check if the Google API request was successful
        if (!googleApiResponse.ok) {
             const errorBody = await googleApiResponse.text();
             console.error('Google API HTTP error:', googleApiResponse.status, errorBody);
             return {
                statusCode: googleApiResponse.status,
                body: JSON.stringify({ message: 'Error calling Google Maps API', error: errorBody })
            };
        }

        const apiResults = await googleApiResponse.json(); // Parse the JSON response from Google

        console.log('Google API Raw Response:', apiResults);

        // Process the Google API results
        let totalDistanceInMeters = 0;
        // *** CHANGE: Store leg distances as formatted miles strings ***
        const legDistancesMilesFormatted = [];
        // ************************************************************


        if (apiResults.status === 'OK' && apiResults.rows && apiResults.rows.length > 0) {
            for (let i = 0; i < apiResults.rows.length; i++) {
                if (apiResults.rows[i].elements && apiResults.rows[i].elements[i] && apiResults.rows[i].elements[i].status === 'OK') {
                     const element = apiResults.rows[i].elements[i];
                     const distance = element.distance; // Distance object { text: "...", value: ... }
                     // const duration = element.duration; // Duration object { text: "...", value: ... } // Not used currently

                     totalDistanceInMeters += distance.value; // Sum up distance in meters

                     // *** CHANGE: Convert leg distance to miles and format ***
                     const legDistanceInMiles = distance.value * METERS_TO_MILES;
                     legDistancesMilesFormatted.push(`${legDistanceInMiles.toFixed(2)} miles`); // Format to 2 decimal places and add unit
                     // ********************************************************

                } else {
                    // Handle case where a specific leg failed
                    const legStatus = apiResults.rows[i].elements && apiResults.rows[i].elements[i] ? apiResults.rows[i].elements[i].status : 'Unknown';
                    console.warn(`Status not OK for trip leg ${i}: ${legStatus}`);
                    legDistancesMilesFormatted.push(`Error: ${legStatus}`); // Add an error message for this leg
                }
            }

        } else {
            // Handle case where the overall API status is not OK
            console.error('Google API overall status not OK:', apiResults.status, apiResults.error_message);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Google Maps API error', error: apiResults.error_message || 'Unknown API error' })
            };
        }

        // Convert total distance from meters to miles (using the constant)
        const totalDistanceInMiles = totalDistanceInMeters * METERS_TO_MILES;

        // Format the total distance for display (e.g., to 2 decimal places)
        const formattedTotalDistance = `${totalDistanceInMiles.toFixed(2)} miles`;


        // Return the calculated results to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'success',
                message: 'Mileage calculated successfully',
                totalDistance: formattedTotalDistance, // This is already in miles and formatted
                legDistances: legDistancesMilesFormatted // *** CHANGE: Return the miles formatted array ***
            })
        };

    } catch (error) {
        console.error('Error in calculate-mileage function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'An error occurred during mileage calculation', error: error.message })
        };
    }
};