// netlify/functions/save-trip.js

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (using the service_role key for server-side writing)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async function(event, context) {
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
        // Expected data from the frontend: { tripSequence: [...address objects], totalDistanceMiles: ..., reimbursementAmount: ... }
        const tripSequence = data.tripSequence;
        const totalDistanceMiles = data.totalDistanceMiles; // This should be the numerical value
        const reimbursementAmount = data.amount; // This should be the numerical value
        // **CORRECTION**: Ensure the frontend sends the correct property names (totalDistanceMiles, reimbursementAmount)


        // Basic validation
        // Check if tripSequence is an array with at least 2 elements
        // Check if totalDistanceMiles is a number and not NaN
        // Check if reimbursementAmount is a number and not NaN
        if (!tripSequence || !Array.isArray(tripSequence) || tripSequence.length < 2 || typeof totalDistanceMiles !== 'number' || isNaN(totalDistanceMiles) || typeof reimbursementAmount !== 'number' || isNaN(reimbursementAmount)) {
            console.error("Invalid trip data received:", data);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid trip data provided. Missing sequence, distance, or reimbursement.' })
            };
        }

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
            console.error('Supabase trip save error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Failed to save trip to database', error: error.message })
            };
        }

        // Return success response
        return {
            statusCode: 200,
            body: JSON.stringify({ status: 'success', message: 'Trip saved successfully', data: insertedTrip })
        };

    } catch (error) {
        console.error('Error in save-trip function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'An error occurred while processing save trip request', error: error.message })
        };
    }
};