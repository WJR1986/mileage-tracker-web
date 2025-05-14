// netlify/functions/calculate-mileage.js

// node-fetch will be imported *inside* the handler function
// const fetch = await import('node-fetch').then(module => module.default); // REMOVE this line from the top level

// We will need the Google Maps API key here from Netlify Environment Variables
const googleMapsApiKey = process.env.Maps_API_KEY;

// Base URL for the Google Distance Matrix API
const googleApiBaseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';

// Conversion factor from meters to miles
const METERS_TO_MILES = 0.000621371; // Define this constant

exports.handler = async function (event, context) {

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

        console.log('calculate-mileage function received addresses:', tripAddressTexts);
        console.log('Number of addresses received:', tripAddressTexts ? tripAddressTexts.length : 0);


        if (!tripAddressTexts || !Array.isArray(tripAddressTexts) || tripAddressTexts.length < 2) {
            console.warn('calculate-mileage received invalid sequence:', tripAddressTexts);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid trip sequence provided. Need at least two addresses.' })
            };
        }

        // Prepare origins and destinations for the Google API call
        const origins = tripAddressTexts.slice(0, tripAddressTexts.length - 1);
        const destinations = tripAddressTexts.slice(1, tripAddressTexts.length);

        console.log('Origins prepared for Google API:', origins);
        console.log('Destinations prepared for Google API:', destinations);
        console.log('Number of origins:', origins.length);
        console.log('Number of destinations:', destinations.length);


        // Format addresses for the API call (join with |)
        const originsString = origins.join('|');
        const destinationsString = destinations.join('|');

        const apiUrl = `${googleApiBaseUrl}?origins=${encodeURIComponent(originsString)}&destinations=${encodeURIComponent(destinationsString)}&key=${googleMapsApiKey}`;

        console.log('Calling Google Distance Matrix API URL (without key):', apiUrl.replace(`&key=${googleMapsApiKey}`, ''));


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

        console.log('Google API Raw Response:', JSON.stringify(apiResults, null, 2));


        // Process the Google API results
        let totalDistanceInMeters = 0;
        const legDistancesMilesFormatted = []; // Store leg distances as formatted miles strings


        if (apiResults.status === 'OK' && apiResults.rows && apiResults.rows.length > 0) {

            console.log(`Processing Google API results. Number of rows: ${apiResults.rows.length}`);

            for (let i = 0; i < origins.length; i++) { // Loop through the number of origins (which is N-1 legs)

                console.log(`Attempting to process leg ${i + 1} (from origin ${i} to destination ${i}).`);
                if (apiResults.rows[i] && apiResults.rows[i].elements && apiResults.rows[i].elements[i]) {
                    console.log(`Found element for origins[${i}] to destinations[${i}]. Status: ${apiResults.rows[i].elements[i].status}`);
                } else {
                    console.warn(`Element for origins[${i}] to destinations[${i}] not found in API response structure.`);
                }


                // Check if the element for the sequential leg exists and its status is OK
                if (apiResults.rows[i] && apiResults.rows[i].elements && apiResults.rows[i].elements[i] && apiResults.rows[i].elements[i].status === 'OK') {
                    const element = apiResults.rows[i].elements[i];
                    const distance = element.distance;

                    totalDistanceInMeters += distance.value;
                    const legDistanceInMiles = distance.value * METERS_TO_MILES;
                    legDistancesMilesFormatted.push(`${legDistanceInMiles.toFixed(2)} miles`); // This adds to the array

                    console.log(`Successfully processed leg ${i + 1}. Distance: ${legDistanceInMiles.toFixed(2)} miles.`);

                } else {
                    // Handle case where a specific sequential leg failed or wasn't found
                    const legStatus = (apiResults.rows[i] && apiResults.rows[i].elements && apiResults.rows[i].elements[i]) ? apiResults.rows[i].elements[i].status : 'Element missing or Unknown Status';
                    console.warn(`Status not OK or element missing for trip leg ${i + 1}: ${legStatus}`);
                    legDistancesMilesFormatted.push(`Error: ${legStatus}`); // This also adds to the array

                    console.log(`Added error for leg ${i + 1}: ${legStatus}`);
                }
            }

        } else {
            console.error('Google API overall status not OK or no rows returned:', apiResults.status, apiResults.error_message);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Google Maps API error or no results returned', error: apiResults.error_message || 'Unknown API error' })
            };
        }

        const totalDistanceInMiles = totalDistanceInMeters * METERS_TO_MILES;
        const formattedTotalDistance = `${totalDistanceInMiles.toFixed(2)} miles`;


        // *** NEW LOGGING: Final check before returning ***
        console.log('calculate-mileage returning legDistances:', legDistancesMilesFormatted);
        console.log('Number of legs in returned array:', legDistancesMilesFormatted.length);
        // ************************************************


        // Return the calculated results to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify({
                totalDistance: "X miles",
                legDistances: []
            })
        };
    } catch (error) {
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({
                error: true,
                message: error.message || "Failed to calculate mileage"
            })
        };
    }
    
};
// if (Math.random() < 0.3) { 
//   throw new Error("Simulated API failure");
// }