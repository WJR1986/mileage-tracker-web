// netlify/functions/hello.js

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client using environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use the service_role key here!
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async function(event, context) {
    // We only want to handle POST requests for adding addresses
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }

    try {
        // Parse the request body (which should be JSON)
        const data = JSON.parse(event.body);
        const address = data.address;

        if (!address) {
            return {
                statusCode: 400, // Bad Request
                body: JSON.stringify({ message: 'Address is required' })
            };
        }

        // Insert the address into the 'addresses' table
        const { data: insertedData, error } = await supabase
            .from('addresses')
            .insert([{ address_text: address }]); // Match the column name in your Supabase table

        if (error) {
            console.error('Supabase insert error:', error);
            return {
                statusCode: 500, // Internal Server Error
                body: JSON.stringify({ message: 'Failed to save address', error: error.message })
            };
        }

        // Return success response
        return {
            statusCode: 200,
            body: JSON.stringify({ status: 'success', message: 'Address saved successfully', data: insertedData })
        };

    } catch (parseError) {
        console.error('Failed to parse request body:', parseError);
        return {
            statusCode: 400, // Bad Request
            body: JSON.stringify({ message: 'Invalid JSON body' })
        };
    }
};