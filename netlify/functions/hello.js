// netlify/functions/hello.js

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client using environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use the service_role key here!
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async function(event, context) {

    // Handle GET requests to fetch addresses
    if (event.httpMethod === 'GET') {
        try {
            const { data: addresses, error } = await supabase
                .from('addresses')
                .select('id, address_text, created_at') // Select the columns you want
                .order('created_at', { ascending: true }); // Order by creation date, oldest first

            if (error) {
                console.error('Supabase fetch error:', error);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Failed to fetch addresses', error: error.message })
                };
            }

            // Return the list of addresses
            return {
                statusCode: 200,
                body: JSON.stringify(addresses) // Return the array of addresses directly
            };

        } catch (fetchError) {
            console.error('Error fetching addresses:', fetchError);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'An error occurred while fetching addresses' })
            };
        }
    }

    // Handle POST requests to save addresses (existing logic)
    if (event.httpMethod === 'POST') {
        try {
            const data = JSON.parse(event.body);
            const address = data.address;

            if (!address) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Address is required' })
                };
            }

            const { data: insertedData, error } = await supabase
                .from('addresses')
                .insert([{ address_text: address }]);

            if (error) {
                console.error('Supabase insert error:', error);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Failed to save address', error: error.message })
                };
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ status: 'success', message: 'Address saved successfully', data: insertedData })
            };

        } catch (parseError) {
            console.error('Failed to parse request body:', parseError);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid JSON body' })
            };
        }
    }

    // Return Method Not Allowed for other HTTP methods
    return {
        statusCode: 405,
        body: JSON.stringify({ message: 'Method Not Allowed' })
    };
};