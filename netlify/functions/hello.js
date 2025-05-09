// netlify/functions/hello.js

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (using the service_role key)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async function(event, context) {
    // *** OUTER TRY...CATCH BLOCK ***
     try {
        // --- DEBUG LOGS ---
        console.log('Netlify function context:', JSON.stringify(context, null, 2));
        console.log('Netlify Identity user:', context.clientContext && context.clientContext.user);
        // ------------------

        // Ensure Supabase keys are available
         if (!supabaseUrl || !supabaseKey) {
            console.error("Supabase URL or Service Key is not set in environment variables.");
             return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Server configuration error: Supabase keys missing.' })
            };
        }

        // *** AUTHENTICATION CHECK AND GET USER ID ***
         const user = context.clientContext && context.clientContext.user;

         if (!user) {
             console.warn('Access denied: No authenticated user found in context.');
             return {
                 statusCode: 401, // Unauthorized
                 body: JSON.stringify({ message: 'Authentication required.' })
             };
         }

         const userId = user.sub; // 'sub' is the user ID (UUID)

         console.log(`Request received for authenticated user ID: ${userId}`);
         // *******************************************


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