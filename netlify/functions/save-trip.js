// netlify/functions/save-trip.js

const { createClient } = require('@supabase/supabase-js');
// const { jwtVerify } = require('jose'); // REMOVE THIS LINE

// Initialize Supabase client (using the service_role key for server-side access)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Using service_role key to bypass RLS server-side
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
        // ... (Handle GET, POST, PUT, DELETE requests for trips) ...
        // --- Handle GET requests (Fetch Trip History) ---
        if (event.httpMethod === 'GET') {
            console.log('Received GET request for trip history.');
            const { startDate, endDate, sortBy, sortOrder } = event.queryStringParameters || {};

            console.log('Received query parameters:', { startDate, endDate, sortBy, sortOrder });

            try {
                let query = supabase
                    .from('trips')
                    .select('id, created_at, trip_data, total_distance_miles, reimbursement_amount, leg_distances, trip_datetime')
                    // *** IMPORTANT: Filter by the logged-in user's ID ***
                    .eq('user_id', userId);

                if (startDate) {
                    query = query.gte('trip_datetime', `${startDate}T00:00:00+00:00`);
                }
                if (endDate) {
                    query = query.lte('trip_datetime', `${endDate}T23:59:59+00:00`);
                }

                let orderColumn = 'created_at';
                let ascending = false;

                if (sortBy === 'date') {
                    orderColumn = 'trip_datetime';
                } else if (sortBy === 'distance') {
                    orderColumn = 'total_distance_miles';
                }

                if (sortOrder === 'asc') {
                    ascending = true;
                } else if (sortOrder === 'desc') {
                     ascending = false;
                }

                query = query.order(orderColumn, { ascending: ascending });


                const { data: trips, error } = await query;

                if (error) {
                    console.error(`Supabase trip fetch failed for user ${userId}. Raw error object:`, error);
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ message: 'Failed to fetch trip history from database', error: error.message })
                    };
                }

                console.log(`Workspaceed ${trips.length} trips for user ${userId} with filters/sorting.`);

                return {
                    statusCode: 200,
                    body: JSON.stringify(trips)
                };

            } catch (fetchError) {
                console.error(`An error occurred while fetching trips for user ${userId}:`, fetchError);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ message: 'An unexpected error occurred while fetching trip history', error: fetchError.message || 'Unknown error' })
                };
            }
        }

        // --- Handle POST requests (Save NEW Trip) ---
        if (event.httpMethod === 'POST') {
            console.log('Received POST request to save NEW trip.');
            try {
                const data = JSON.parse(event.body);

                const tripSequence = data.tripSequence;
                const totalDistanceMiles = data.totalDistanceMiles;
                const reimbursementAmount = data.reimbursementAmount;
                const legDistances = data.legDistances;
                const tripDatetime = data.tripDatetime;

                if (!tripSequence || !Array.isArray(tripSequence) || tripSequence.length < 2 ||
                    typeof totalDistanceMiles !== 'number' || isNaN(totalDistanceMiles) ||
                    typeof reimbursementAmount !== 'number' || isNaN(reimbursementAmount) ||
                    !legDistances || !Array.isArray(legDistances)
                   ) {
                    console.error(`User ${userId} provided invalid trip data for saving:`, data);
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: 'Invalid trip data provided. Missing sequence, distance, reimbursement, or leg distances.' })
                    };
                }

                 if (tripDatetime !== null && tripDatetime !== undefined && typeof tripDatetime !== 'string') {
                      console.warn(`User ${userId} received tripDatetime is not a string or null/undefined for saving:`, tripDatetime);
                 }


                const tripDataToSave = {
                    trip_data: tripSequence,
                    total_distance_miles: totalDistanceMiles,
                    reimbursement_amount: reimbursementAmount,
                    leg_distances: legDistances,
                    trip_datetime: tripDatetime,
                    // *** IMPORTANT: Include the logged-in user's ID ***
                    user_id: userId
                };

                console.log(`Attempting to save NEW trip for user ${userId}:`, tripDataToSave);

                const { data: insertedTrip, error } = await supabase
                    .from('trips')
                    .insert([tripDataToSave])
                    .select();

                if (error) {
                    console.error(`Supabase NEW trip save failed for user ${userId}. Raw error object:`, error);
                     try { console.error('Supabase error (JSON string):', JSON.stringify(error)); } catch (e) { console.error('Could not JSON stringify error:', e); }
                     if (error.message) console.error('Supabase error message:', error.message); else console.error('Supabase error message property is missing.');
                     if (error.details) console.error('Supabase error details:', error.details);
                     if (error.hint) console.error('Supabase error hint:', error.hint);
                     if (error.code) console.error('Supabase error code:', error.code);


                    return {
                        statusCode: 500,
                        body: JSON.stringify({ message: 'Failed to save NEW trip to database', error: error.message })
                    };
                }

                return {
                    statusCode: 200,
                    body: JSON.stringify({ status: 'success', message: 'NEW Trip saved successfully', data: insertedTrip })
                };

            } catch (innerError) {
                console.error(`An error occurred in the inner POST try block (save NEW trip) for user ${userId}:`, innerError);
                 throw innerError;
            }
        }

        // --- Handle PUT requests (Update Existing Trip) ---
         if (event.httpMethod === 'PUT') {
             console.log('Received PUT request to UPDATE trip.');
             try {
                 const data = JSON.parse(event.body);
                 const tripId = data.id;
                 const updatedData = {
                     trip_datetime: data.tripDatetime
                     // Add other updatable fields here if they become editable
                 };

                 if (!tripId) {
                     console.error(`User ${userId} provided no trip ID for update.`);
                     return {
                         statusCode: 400,
                         body: JSON.stringify({ message: 'No trip ID provided for update.' })
                     };
                 }

                 console.log(`Attempting to UPDATE trip with ID: ${tripId} for user ${userId} with data:`, updatedData);

                 // *** IMPORTANT: Filter by both the trip ID AND the logged-in user's ID ***
                 const { data: updatedTrip, error } = await supabase
                     .from('trips')
                     .update(updatedData)
                     .eq('id', tripId)
                     .eq('user_id', userId) // Ensure this trip belongs to the user
                     .select();


                 if (error) {
                     console.error(`Supabase trip UPDATE failed for ID ${tripId} for user ${userId}. Raw error object:`, error);
                      try { console.error('Supabase error (JSON string):', JSON.stringify(error)); } catch (e) { console.error('Could not JSON stringify error:', e); }
                      if (error.message) console.error('Supabase error message:', error.message); else console.error('Supabase error message property is missing.');
                      if (error.details) console.error('Supabase error details:', error.details);
                      if (error.hint) console.error('Supabase error hint:', error.hint);
                      if (error.code) console.error('Supabase error code:', error.code);


                     return {
                         statusCode: 500,
                         body: JSON.stringify({ message: `Failed to update trip with ID ${tripId} in database`, error: error.message })
                     };
                 }

                 // Check if any row was actually updated (it should be 1 if successful)
                 if (!updatedTrip || updatedTrip.length === 0) {
                     console.warn(`UPDATE operation for trip ID ${tripId} for user ${userId} resulted in 0 rows updated. Trip not found or does not belong to user.`);
                      return {
                         statusCode: 404, // Not Found (or 403 Forbidden if you prefer)
                         body: JSON.stringify({ status: 'error', message: `Trip with ID ${tripId} not found or does not belong to you.` })
                     };
                 }


                 console.log(`Trip with ID ${tripId} UPDATED successfully for user ${userId}.`);

                 return {
                     statusCode: 200,
                     body: JSON.stringify({ status: 'success', message: `Trip with ID ${tripId} updated successfully`, data: updatedTrip })
                 };

             } catch (innerError) {
                 console.error(`An error occurred in the inner PUT try block (update trip) for user ${userId}:`, innerError);
                 throw innerError;
             }
         }


        // --- Handle DELETE requests (Delete Trip) ---
         if (event.httpMethod === 'DELETE') {
             console.log('Received DELETE request for trip.');
             try {
                 const data = JSON.parse(event.body);
                 const tripId = data.id;

                 if (!tripId) {
                     console.error(`User ${userId} provided no trip ID for deletion.`);
                     return {
                         statusCode: 400,
                         body: JSON.stringify({ message: 'No trip ID provided for deletion.' })
                     };
                 }

                 console.log(`Attempting to delete trip with ID: ${tripId} for user ${userId}`);

                 // *** IMPORTANT: Filter by both the trip ID AND the logged-in user's ID ***
                 const { count, error } = await supabase
                     .from('trips')
                     .delete()
                     .eq('id', tripId)
                     .eq('user_id', userId);
                     // Note: The .delete() method with filters doesn't return the deleted row data by default,
                     // but we can check if any rows were affected using the `count` property (if specified in the query builder options)
                     // or simply by checking the error. If no error, and RLS and .eq filters were applied, it worked for the user's data.
                     // A more robust check would fetch the item first, but this is simpler.


                 if (error) {
                     console.error(`Supabase trip deletion failed for ID ${tripId} for user ${userId}. Raw error object:`, error);
                      try { console.error('Supabase error (JSON string):', JSON.stringify(error)); } catch (e) { console.error('Could not JSON stringify error:', e); }
                      if (error.message) console.error('Supabase error message:', error.message); else console.error('Supabase error message property is missing.');
                      if (error.details) console.error('Supabase error details:', error.details);
                      if (error.hint) console.error('Supabase error hint:', error.hint);
                      if (error.code) console.error('Supabase error code:', error.code);


                     return {
                         statusCode: 500,
                         body: JSON.stringify({ message: `Failed to delete trip with ID ${tripId} from database`, error: error.message })
                     };
                 }

                 // We don't get a count directly from delete unless specified,
                 // but a successful delete with the user_id filter means it deleted
                 // a row belonging to the user (if one existed with that ID).
                 // RLS also provides a safety net here.
                 console.log(`Delete operation for trip ID ${tripId} for user ${userId} completed.`);
                 // Optional: You could try fetching the trip *before* deleting to confirm ownership and existence if needed,
                 // but for this level of complexity, relying on the .eq filters is sufficient.


                 return {
                     statusCode: 200,
                     body: JSON.stringify({ status: 'success', message: `Trip with ID ${tripId} deleted successfully` })
                 };

             } catch (innerError) {
                 console.error(`An error occurred in the inner DELETE try block (delete trip) for user ${userId}:`, innerError);
                 throw innerError;
             }
         }


        // Handle any other HTTP methods
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };


    } catch (outerError) {
        // *** OUTER CATCH BLOCK - Catches any uncaught exception ***
        console.error('An uncaught error occurred in save-trip function:', outerError);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'An unexpected error occurred in the function', error: outerError.message || 'Unknown error' })
        };
    }
};