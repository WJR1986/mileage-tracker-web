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

        // *** NEW LOGGING START ***
        console.log('calculate-mileage function received addresses:', tripAddressTexts);
        console.log('Number of addresses received:', tripAddressTexts ? tripAddressTexts.length : 0);
        // *** NEW LOGGING END ***


        if (!tripAddressTexts || !Array.isArray(tripAddressTexts) || tripAddressTexts.length < 2) {
            console.warn('calculate-mileage received invalid sequence:', tripAddressTexts);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid trip sequence provided. Need at least two addresses.' })
            };
        }

        // Prepare origins and destinations for the Google API call
        // For a trip A -> B -> C (N=3 addresses), origins should be [A, B], destinations should be [B, C].
        // origins: addresses from index 0 up to but not including the last one (length - 1)
        const origins = tripAddressTexts.slice(0, tripAddressTexts.length - 1);
        // destinations: addresses from index 1 to the end (length)
        const destinations = tripAddressTexts.slice(1, tripAddressTexts.length);

        // *** NEW LOGGING START ***
        console.log('Origins prepared for Google API:', origins);
        console.log('Destinations prepared for Google API:', destinations);
        console.log('Number of origins:', origins.length);
        console.log('Number of destinations:', destinations.length);
        // *** NEW LOGGING END ***


        // Format addresses for the API call (join with |)
        const originsString = origins.join('|');
        const destinationsString = destinations.join('|');

        // Construct the Google API URL
        const apiUrl = `${googleApiBaseUrl}?origins=${encodeURIComponent(originsString)}&destinations=${encodeURIComponent(destinationsString)}&key=${googleMapsApiKey}`;

        // *** NEW LOGGING START ***
        // Log URL without key for security in logs
        console.log('Calling Google Distance Matrix API URL (without key):', apiUrl.replace(`&key=${googleMapsApiKey}`, ''));
        // *** NEW LOGGING END ***


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

        // *** NEW LOGGING START ***
        console.log('Google API Raw Response:', JSON.stringify(apiResults, null, 2)); // Log raw response, formatted
        // *** NEW LOGGING END ***


        // Process the Google API results
        let totalDistanceInMeters = 0;
        const legDistancesMilesFormatted = []; // Store leg distances as formatted miles strings


        if (apiResults.status === 'OK' && apiResults.rows && apiResults.rows.length > 0) {

            // *** NEW LOGGING START ***
            console.log(`Processing Google API results. Number of rows: ${apiResults.rows.length}`);
            // Expected number of rows is equal to the number of origins.
            // For sequential trip A->B->C, origins=[A, B], so expected rows=2.
            // Each row corresponds to an origin. Inside each row are elements corresponding to destinations.
            // For sequential A->B->C, row 0 (origin A) should have elements for destinations [B, C].
            // row 1 (origin B) should have elements for destinations [B, C].
            // We want A->B (row 0, element for B) and B->C (row 1, element for C).
            // The API result structure can be complex, but for a simple list of origins to a simple list of destinations,
            // the distance from origins[i] to destinations[j] is typically in apiResults.rows[i].elements[j].
            // For sequential legs (A->B, B->C), we want origins[0] to destinations[0], origins[1] to destinations[1], etc.
            // So we need rows[i].elements[i].
            // *** NEW LOGGING END ***


            for (let i = 0; i < origins.length; i++) { // Loop through the number of origins (which is N-1 legs)

                // *** NEW LOGGING START ***
                console.log(`Attempting to process leg ${i + 1} (from origin ${i} to destination ${i}).`);
                 if (apiResults.rows[i] && apiResults.rows[i].elements && apiResults.rows[i].elements[i]) {
                     console.log(`Found element for origins[${i}] to destinations[${i}]. Status: ${apiResults.rows[i].elements[i].status}`);
                 } else {
                      console.warn(`Element for origins[${i}] to destinations[${i}] not found in API response structure.`);
                 }
                // *** NEW LOGGING END ***


                // Check if the element for the sequential leg exists and its status is OK
                if (apiResults.rows[i] && apiResults.rows[i].elements && apiResults.rows[i].elements[i] && apiResults.rows[i].elements[i].status === 'OK') {
                     const element = apiResults.rows[i].elements[i];
                     const distance = element.distance; // Distance object { text: "...", value: ... }
                     // const duration = element.duration; // Duration object { text: "...", value: ... } // Not used currently

                     totalDistanceInMeters += distance.value; // Sum up distance in meters

                     const legDistanceInMiles = distance.value * METERS_TO_MILES;
                     legDistancesMilesFormatted.push(`${legDistanceInMiles.toFixed(2)} miles`); // Format to 2 decimal places and add unit

                     // *** NEW LOGGING START ***
                     console.log(`Successfully processed leg ${i + 1}. Distance: ${legDistanceInMiles.toFixed(2)} miles.`);
                     // *** NEW LOGGING END ***

                } else {
                    // Handle case where a specific sequential leg failed or wasn't found
                    const legStatus = (apiResults.rows[i] && apiResults.rows[i].elements && apiResults.rows[i].elements[i]) ? apiResults.rows[i].elements[i].status : 'Element missing or Unknown Status';
                    console.warn(`Status not OK or element missing for trip leg ${i + 1}: ${legStatus}`);
                    legDistancesMilesFormatted.push(`Error: ${legStatus}`); // Add an error message for this leg

                     // *** NEW LOGGING START ***
                    console.log(`Added error for leg ${i + 1}: ${legStatus}`);
                     // *** NEW LOGGING END ***
                }
            }

        } else {
            // Handle case where the overall API status is not OK or no rows returned
            console.error('Google API overall status not OK or no rows returned:', apiResults.status, apiResults.error_message);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Google Maps API error or no results returned', error: apiResults.error_message || 'Unknown API error' })
            };
        }

        // Convert total distance from meters to miles (using the constant)
        const totalDistanceInMiles = totalDistanceInMeters * METERS_TO_MILES;

        // Format the total distance for display (e.g., to 2 decimal places)
        const formattedTotalDistance = `${totalDistanceInMiles.toFixed(2)} miles`;


        // *** NEW LOGGING START ***
        console.log('Final calculated total distance (miles):', totalDistanceInMiles);
        console.log('Final formatted total distance:', formattedTotalDistance);
        console.log('Final leg distances array:', legDistancesMilesFormatted);
        console.log('Number of leg distances returned:', legDistancesMilesFormatted.length);
        // *** NEW LOGGING END ***


        // Return the calculated results to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'success',
                message: 'Mileage calculated successfully',
                totalDistance: formattedTotalDistance,
                legDistances: legDistancesMilesFormatted // This should contain N-1 elements
            })
        };

    } catch (error) {
        console.error('An error occurred in calculate-mileage function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'An error occurred during mileage calculation', error: error.message })
        };
    }
};