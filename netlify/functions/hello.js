// netlify/functions/hello.js

const { createClient } = require('@supabase/supabase-js');
// const { jwtVerify } = require('jose'); // REMOVE THIS LINE

// Initialize Supabase client (using the service_role key)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get the JWT secret and expected audience from environment variables
// JWT Secret must be Uint8Array for jose
const supabaseJwtSecret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
// We identified the Supabase Project ID as the likely audience
const supabaseAudience = 'authenticated'; // Replace with your actual Supabase Project ID if different


exports.handler = async function (event, context) {
    // *** IMPORT jose DYNAMICALLY INSIDE the async handler function ***
    const { jwtVerify } = await import('jose');
    // **************************************************************

    // *** OUTER TRY...CATCH BLOCK ***
    try {

        // *** NEW DEBUG LOGS FOR SECRET AND TOKEN ***
        console.log('--- Debugging JWT Secret and Token ---');
        console.log(`SUPABASE_JWT_SECRET env variable is set: ${!!process.env.SUPABASE_JWT_SECRET}`);
        if (process.env.SUPABASE_JWT_SECRET) {
            console.log(`Encoded JWT Secret length: ${supabaseJwtSecret.length}`);
            // Log first/last few bytes (convert to hex for easier comparison)
            const encoder = new TextEncoder();
            const secretBytes = encoder.encode(process.env.SUPABASE_JWT_SECRET);
            const secretHexStart = Array.from(secretBytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
            const secretHexEnd = Array.from(secretBytes.slice(-8)).map(b => b.toString(16).padStart(2, '0')).join('');
            console.log(`Encoded JWT Secret start (hex): ${secretHexStart}... end (hex): ...${secretHexEnd}`);
        }

        const authHeader = event.headers.authorization;
        console.log(`Authorization header received: ${!!authHeader}`);

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            console.log(`Received JWT Token length: ${token.length}`);
            // Log first/last few characters of the token
            console.log(`Received JWT Token start: ${token.substring(0, 8)}... end: ...${token.substring(token.length - 8)}`);
        }
        console.log('--- End Debugging Logs ---');
        // *******************************************


        // Ensure Supabase keys and JWT secret are available
        if (!supabaseUrl || !supabaseKey) {
            console.error("Supabase URL or Service Key is not set in environment variables.");
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Server configuration error: Supabase keys missing.' })
            };
        }
        // Check for the secret env variable *after* attempting to log its parts
        if (!process.env.SUPABASE_JWT_SECRET) {
            console.error("Supabase JWT Secret is not set in environment variables.");
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Server configuration error: JWT secret missing.' })
            };
        }


        // *** MANUAL AUTHENTICATION CHECK AND GET USER ID ***
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
            console.log('Attempting JWT verification...'); // Log before verification
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

            console.log(`JWT verified successfully. Authenticated user ID: ${userId}`); // Log successful verification

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
            console.error('JWT verified, but user ID (sub claim) not found in payload.');
            return {
                statusCode: 500, // Internal Server Error, as token was valid but missing expected claim
                body: JSON.stringify({ message: 'Internal server error: User ID not found in token payload.' })
            };
        }
        // ******************************************************


        // --- Rest of your function logic remains the same, using userId ---
        // ... (Handle GET and POST requests for addresses) ...
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

        // --- Handle PUT requests (Update Address) ---
        if (event.httpMethod === 'PUT') {
            console.log('Received PUT request to update address.');
            try {
                const { id } = event.queryStringParameters; // Get address ID from query params
                const data = JSON.parse(event.body);
                const newAddressText = data.address;

                if (!id || !newAddressText?.trim()) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: 'Address ID and text are required.' })
                    };
                }

                // Update address only if it belongs to the current user
                const { data: updatedAddress, error } = await supabase
                    .from('addresses')
                    .update({ address_text: newAddressText.trim() })
                    .eq('id', id)
                    .eq('user_id', userId) // Ensure user owns the address
                    .select();

                if (error) throw error;

                return {
                    statusCode: 200,
                    body: JSON.stringify(updatedAddress)
                };

            } catch (error) {
                console.error('Update address error:', error);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Failed to update address.' })
                };
            }
        }

        // --- Handle DELETE requests (Delete Address) ---
        if (event.httpMethod === 'DELETE') {
            console.log('Received DELETE request to delete address.');
            try {
                const { id } = event.queryStringParameters; // Get address ID from query params

                if (!id) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: 'Address ID is required.' })
                    };
                }

                // Delete address only if it belongs to the current user
                const { error } = await supabase
                    .from('addresses')
                    .delete()
                    .eq('id', id)
                    .eq('user_id', userId); // Ensure user owns the address

                if (error) throw error;

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Address deleted.' })
                };

            } catch (error) {
                console.error('Delete address error:', error);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Failed to delete address.' })
                };
            }
        }

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