// netlify/functions/save-trip.js

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (using the service_role key for server-side writing)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async function (event, context) {
    // Only allow POST requests for saving trips
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }

    // Ensure Supabase keys are available
    if (!supabaseUrl || !supabaseKey) {
        console.error("Supabase URL or Service Key is not set in environment variables.");
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error: Supabase keys missing.' })
        };
    }


    try {
        const data = JSON.parse(event.body);

        // *** ADD THESE CONSOLE LOGS ***
        console.log('Save trip function received data:', data);
        console.log('Received tripSequence type:', typeof data.tripSequence, 'Is Array:', Array.isArray(data.tripSequence), 'Length:', data.tripSequence ? data.tripSequence.length : 'N/A');
        console.log('Received totalDistanceMiles type:', typeof data.totalDistanceMiles, 'value:', data.totalDistanceMiles);
        console.log('Received reimbursementAmount type:', typeof data.reimbursementAmount, 'value:', data.reimbursementAmount);
        // ******************************


        // Expected data from the frontend: { tripSequence: [...address objects], totalDistanceMiles: ..., reimbursementAmount: ... }
        const tripSequence = data.tripSequence;
        const totalDistanceMiles = data.totalDistanceMiles;
        const reimbursementAmount = data.reimbursementAmount; // Corrected property name


        // Basic validation
        if (!tripSequence || !Array.isArray(tripSequence) || tripSequence.length < 2 || typeof totalDistanceMiles !== 'number' || isNaN(totalDistanceMiles) || typeof reimbursementAmount !== 'number' || isNaN(reimbursementAmount)) {
            console.error("Invalid trip data received:", data);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid trip data provided. Missing sequence, distance, or reimbursement.' })
            };
        }

        // ... rest of the function (Supabase insert logic)
        // ... (Supabase insert logic is below)
        // Prepare data for insertion into the 'trips' table
        const tripDataToSave = {
            trip_data: tripSequence, // Store the array of address objects in the jsonb column
            total_distance_miles: totalDistanceMiles, // Store the numerical distance
            reimbursement_amount: reimbursementAmount // Store the numerical reimbursement
            // created_at will be set automatically by the database default
        };

        // Insert the trip data into the 'trips' table
        const { data: insertedTrip, error } = await supabase
            .from('trips')
            .insert([tripDataToSave]);

        if (error) {
            // *** ATTEMPT MORE COMPREHENSIVE ERROR LOGGING ***
            console.error('Supabase trip save failed. Raw error object:', error);

            // Try logging as JSON string (might show more properties)
            try {
                console.error('Supabase error (JSON string):', JSON.stringify(error));
            } catch (e) {
                console.error('Could not JSON stringify error:', e);
            }

            // Try logging error message if it exists
            if (error.message) {
                console.error('Supabase error message:', error.message);
            } else {
                console.error('Supabase error message property is missing.');
            }

            // Log specific known properties if they exist
            if (error.details) console.error('Supabase error details:', error.details);
            if (error.hint) console.error('Supabase error hint:', error.hint);
            if (error.code) console.error('Supabase error code:', error.code);

            // Log the type of the error object
            console.error('Type of error object:', typeof error);
            if (error && typeof error === 'object') {
                console.error('Error object constructor name:', error.constructor ? error.constructor.name : 'N/A');
            }

            // *************************************

            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Failed to save trip to database', error: error.message }) // Still include error.message in the response if available
            };
        }


    } catch (error) {
        console.error('Error in save-trip function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'An error occurred while processing save trip request', error: error.message })
        };
    }
};