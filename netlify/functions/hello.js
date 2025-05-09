// netlify/functions/hello.js

const { createClient } = require('@supabase/supabase-js');
// const { jwtVerify } = require('jose'); // REMOVE THIS LINE

// Initialize Supabase client (using the service_role key)
const supabaseUrl = process.env.SUPABASE_URL;
// IMPORTANT: Use the service_role key on the backend to bypass RLS if needed,
// but for user-specific data, ensure your queries filter by user_id AND
// that you have RLS enabled and configured to protect data from other users.
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get the JWT secret and expected audience from environment variables
// JWT Secret must be Uint8Array for jose
const supabaseJwtSecret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
// We identified the Supabase Project ID as the likely audience
const supabaseAudience = 'tbtwyckbyhxujnxmrfba'; // Replace with your actual Supabase Project ID if different

exports.handler = async function(event, context) {
    // *** IMPORT jose DYNAMICALLY INSIDE the async handler function ***
    const { jwtVerify } = await import('jose');
    // **************************************************************

    // *** OUTER TRY...CATCH BLOCK ***
     try {

        // Ensure Supabase keys and JWT secret are available
         if (!supabaseUrl || !supabaseKey) {
            console.error("Supabase URL or Service Key is not set in environment variables.");
             return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Server configuration error: Supabase keys missing.' })
            };
        }
         if (!process.env.SUPABASE_JWT_SECRET) {
             console.error("Supabase JWT Secret is not set in environment variables.");
              return {
                 statusCode: 500,
                 body: JSON.stringify({ message: 'Server configuration error: JWT secret missing.' })
             };
         }


        // *** MANUAL AUTHENTICATION CHECK AND GET USER ID ***
        const authHeader = event.headers.authorization;
        let userId = null; // Initialize userId to null

        if (!authHeader) {
            console.warn('Access denied: Authorization header missing.');
             return {
                 statusCode: 401, // Unauthorized
                 body: JSON.stringify({ message: 'Authentication required: Authorization header missing.' })
             };
        }

        // Expected format: "Bearer <token>"
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
            console.warn('Access denied: Invalid Authorization header format.');
             return {
                 statusCode: 401, // Unauthorized
                 body: JSON.stringify({ message: 'Authentication required: Invalid Authorization header format.' })
             };
        }

        const token = parts[1]; // Extract the token string

        try {
            // Verify the JWT using jose library
            const { payload } = await jwtVerify(
                token,
                supabaseJwtSecret, // Your Supabase JWT Secret as Uint8Array
                {
                    audience: supabaseAudience, // The expected audience (Your Supabase Project ID)
                    // Optional: You could also verify the 'issuer' claim ('iss') if needed
                    // issuer: `https://${supabaseUrl.split('//')[1]}/auth/v1`,
                }
            );

            userId = payload.sub; // Extract the user ID (sub claim) from the verified token payload

            console.log(`JWT verified. Request received for authenticated user ID: ${userId}`);

        } catch (jwtError) {
            console.warn('Access denied: JWT verification failed.', jwtError.message);
             // Return 401 if token is invalid, expired, wrong audience, etc.
             return {
                 statusCode: 401, // Unauthorized
                 body: JSON.stringify({ message: `Authentication required: Invalid or expired token. ${jwtError.message}` })
             };
        }

        // If we reached here, userId is set from the verified token
        if (!userId) {
             // This case should ideally not be reached if jwtVerify was successful and payload has 'sub'
             console.error('JWT verified but user ID (sub claim) not found in payload.');
              return {
                 statusCode: 500, // Internal Server Error, as token was valid but missing expected claim
                 body: JSON.stringify({ message: 'Internal server error: User ID not found in token.' })
             };
        }
        // ******************************************************


        // --- Handle GET requests (Fetch Addresses) ---
        if (event.httpMethod === 'GET') {
            console.log('Received GET request for addresses.');
            try {
                // *** IMPORTANT: Filter addresses by the logged-in user's ID ***
                const { data: addresses, error } = await supabase
                    .from('addresses')
                    .select('id, created_at, address_text') // Select columns you need
                    .eq('user_id', userId) // Ensure only addresses belonging to the user are fetched
                    .order('address_text', { ascending: true }); // Order addresses alphabetically


                if (error) {
                    console.error(`Supabase address fetch failed for user ${userId}. Raw error object:`, error);
                     return {
                         statusCode: 500,
                         body: JSON.stringify({ message: 'Failed to fetch addresses from database', error: error.message })
                     };
                }

                console.log(`Workspaceed ${addresses.length} addresses for user ${userId}.`);

                return {
                    statusCode: 200,
                    body: JSON.stringify(addresses)
                };

            } catch (fetchError) {
                console.error(`An error occurred while fetching addresses for user ${userId}:`, fetchError);
                 return {
                    statusCode: 500,
                    body: JSON.stringify({ message: 'An unexpected error occurred while fetching addresses', error: fetchError.message || 'Unknown error' })
                };
            }
        }

        // --- Handle POST requests (Save New Address) ---
        if (event.httpMethod === 'POST') {
            console.log('Received POST request to save address.');
            try {
                const data = JSON.parse(event.body);
                const addressText = data.address;

                if (!addressText || addressText.trim() === '') {
                    console.warn(`User ${userId} provided empty address text.`);
                     return {
                        statusCode: 400,
                        body: JSON.stringify({ message: 'Address text cannot be empty.' })
                    };
                }

                const addressToSave = {
                    address_text: addressText.trim(),
                    // *** IMPORTANT: Include the logged-in user's ID ***
                    user_id: userId
                };

                console.log(`Attempting to save address for user ${userId}:`, addressToSave);

                const { data: insertedAddress, error } = await supabase
                    .from('addresses')
                    .insert([addressToSave])
                    .select();

                if (error) {
                    console.error(`Supabase address save failed for user ${userId}. Raw error object:`, error);
                     try { console.error('Supabase error (JSON string):', JSON.stringify(error)); } catch (e) { console.error('Could not JSON stringify error:', e); }
                     if (error.message) console.error('Supabase error message:', error.message); else console.error('Supabase error message property is missing.');
                     if (error.details) console.error('Supabase error details:', error.details);
                     if (error.hint) console.error('Supabase error hint:', error.hint);
                     if (error.code) console.error('Supabase error code:', error.code);


                    return {
                        statusCode: 500,
                        body: JSON.stringify({ status: 'error', message: 'Failed to save address to database', error: error.message })
                    };
                }

                console.log(`Address saved successfully for user ${userId}:`, insertedAddress);

                return {
                    statusCode: 200,
                    body: JSON.stringify({ status: 'success', message: 'Address saved successfully', data: insertedAddress })
                };

            } catch (innerError) {
                 console.error(`An error occurred in the inner POST try block (save address) for user ${userId}:`, innerError);
                 throw innerError;
            }
        }

         // TODO: Implement DELETE / PUT for addresses if needed later

        // Handle any other HTTP methods
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };

     } catch (outerError) {
         // *** OUTER CATCH BLOCK ***
         console.error('An uncaught error occurred in hello function:', outerError);
         return {
            statusCode: 500,
            body: JSON.stringify({ message: 'An unexpected error occurred in the function', error: outerError.message || 'Unknown error' })
        };
     }
};