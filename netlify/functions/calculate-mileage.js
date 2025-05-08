// netlify/functions/calculate-mileage.js

// node-fetch will be imported *inside* the handler function
// const fetch = await import('node-fetch').then(module => module.default); // REMOVE this line from the top level

// We will need the Google Maps API key here from Netlify Environment Variables
const googleMapsApiKey = process.env.Maps_API_KEY;

// Base URL for the Google Distance Matrix API
const googleApiBaseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';

exports.handler = async function(event, context) {

    // *** IMPORT node-fetch INSIDE the async handler function ***
    const fetch = await import('node-fetch').then(module => module.default);
    // ***********************************************************


    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }

    // Ensure the API key is available
    if (!googleMapsApiKey) {
         console.error("Google Maps API Key is not set in environment variables.");
         return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error: API key missing.' })
        };
    }


    try {
        const data = JSON.parse(event.body);
        // Expected data: an array of address strings representing the trip sequence
        const tripAddressTexts = data.addresses; // Received array of address strings

        if (!tripAddressTexts || !Arrayavis.isArray(tripAddressTexts) || tripAddressTexts.length < 2) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid trip sequence provided. Need at least two addresses.' })
            };
        }

        // Prepare origins and destinations for the Google API call
        // The API calculates distance from each origin to each destination.
        // For a trip sequence A -> B -> C, we need distances A->B and B->C.
        // Origins will be addresses from index 0 to length-2
        const origins = tripAddressTexts.slice(0, tripAddressTexts.length - 1);
        // Destinations will be addresses from index 1 to length-1
        const destinations = tripAddressTexts.slice(1, tripAddressTexts.length);

        // Format addresses for the API call (join with |)
        const originsString = origins.join('|');
        const destinationsString = destinations.join('|');

        // Construct the Google API URL
        const apiUrl = `${googleApiBaseUrl}?origins=${encodeURIComponent(originsString)}&destinations=${encodeURIComponent(destinationsString)}&key=${googleMapsApiKey}`;

        console.log('Calling Google Distance Matrix API:', apiUrl); // Log the API call URL (without key ideally in production logs)

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

        console.log('Google API Raw Response:', apiResults); // Log the raw API response

        // Process the Google API results
        let totalDistanceInMeters = 0;
        const legDistancesText = []; // Store distances for each leg as text (e.g., "10.5 km")

        // Google API response structure has rows (for origins) and elements (for destinations)
        // Since we have N origins and N destinations, and want N distances (A->B, B->C, etc.)
        // The response.rows[i].elements[i] corresponds to the distance from origins[i] to destinations[i]
        if (apiResults.status === 'OK' && apiResults.rows && apiResults.rows.length > 0) {
            for (let i = 0; i < apiResults.rows.length; i++) {
                // Check the status for each element (each leg)
                if (apiResults.rows[i].elements && apiResults.rows[i].elements[i] && apiResults.rows[i].elements[i].status === 'OK') {
                     const element = apiResults.rows[i].elements[i];
                     const distance = element.distance; // Distance object { text: "...", value: ... }
                     const duration = element.duration; // Duration object { text: "...", value: ... }

                     totalDistanceInMeters += distance.value; // Sum up distance in meters
                     legDistancesText.push(distance.text); // Store the text representation for the UI

                } else {
                    // Handle case where a specific leg failed
                    const legStatus = apiResults.rows[i].elements && apiResults.rows[i].elements[i] ? apiResults.rows[i].elements[i].status : 'Unknown';
                    console.warn(`Status not OK for trip leg ${i}: ${legStatus}`);
                    // Decide how to handle this: skip leg, return error, etc.
                    // For now, we'll just note it and the total might be off.
                    legDistancesText.push(`Error: ${legStatus}`); // Add an error message for this leg
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

        // Convert total distance from meters to miles (1 meter = 0.000621371 miles)
        const totalDistanceInMiles = totalDistanceInMeters * 0.000621371;

        // Format the total distance for display (e.g., to 2 decimal places)
        const formattedTotalDistance = `${totalDistanceInMiles.toFixed(2)} miles`;


        // Return the calculated results to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'success', // Add a status field for clarity
                message: 'Mileage calculated successfully',
                totalDistance: formattedTotalDistance,
                legDistances: legDistancesText // Array of text distances for each leg
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