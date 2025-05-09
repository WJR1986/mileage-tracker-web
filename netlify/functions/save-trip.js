// netlify/functions/save-trip.js

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (using the service_role key for server-side access)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Using service_role key to bypass RLS server-side
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async function(event, context) {
    // *** OUTER TRY...CATCH BLOCK ***
    try {
        // Ensure Supabase keys are available
         if (!supabaseUrl || !supabaseKey) {
            console.error("Supabase URL or Service Key is not set in environment variables.");
             return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Server configuration error: Supabase keys missing.' })
            };
        }

        // --- Handle GET requests (Fetch Trip History) ---
        if (event.httpMethod === 'GET') {
            console.log('Received GET request for trip history.');
            try {
                // Fetch all trips from the 'trips' table
                // Select specific columns including the new 'trip_datetime'
                const { data: trips, error } = await supabase
                    .from('trips')
                    .select('id, created_at, trip_data, total_distance_miles, reimbursement_amount, leg_distances, trip_datetime')
                    .order('created_at', { ascending: false }); // Get newest trips first

                if (error) {
                    console.error('Supabase trip fetch failed. Raw error object:', error);
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ message: 'Failed to fetch trip history from database', error: error.message })
                    };
                }

                console.log(`Workspaceed ${trips.length} trips.`);

                // Return the fetched trips
                return {
                    statusCode: 200,
                    body: JSON.stringify(trips) // Return the array of trip objects
                };

            } catch (fetchError) {
                console.error('An error occurred while fetching trips:', fetchError);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ message: 'An unexpected error occurred while fetching trip history', error: fetchError.message || 'Unknown error' })
                };
            }
        }

        // --- Handle POST requests (Save Trip) ---
        if (event.httpMethod === 'POST') {
            console.log('Received POST request to save trip.');
            // *** INNER TRY...CATCH (Existing Logic) ***
            try {
                const data = JSON.parse(event.body);

                const tripSequence = data.tripSequence;
                const totalDistanceMiles = data.totalDistanceMiles;
                const reimbursementAmount = data.reimbursementAmount;
                const legDistances = data.legDistances;
                const tripDatetime = data.tripDatetime;

                // Basic validation (Update to include legDistances, tripDatetime validation is minimal here)
                if (!tripSequence || !Array.isArray(tripSequence) || tripSequence.length < 2 ||
                    typeof totalDistanceMiles !== 'number' || isNaN(totalDistanceMiles) ||
                    typeof reimbursementAmount !== 'number' || isNaN(reimbursementAmount) ||
                    !legDistances || !Array.isArray(legDistances)
                   ) {
                    console.error("Invalid trip data received for saving:", data);
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: 'Invalid trip data provided. Missing sequence, distance, reimbursement, or leg distances.' })
                    };
                }

                 if (tripDatetime !== null && tripDatetime !== undefined && typeof tripDatetime !== 'string') {
                      console.warn("Received tripDatetime is not a string or null/undefined for saving:", tripDatetime);
                 }

                // Prepare data for insertion into the 'trips' table
                const tripDataToSave = {
                    trip_data: tripSequence,
                    total_distance_miles: totalDistanceMiles,
                    reimbursement_amount: reimbursementAmount,
                    leg_distances: legDistances,
                    trip_datetime: tripDatetime
                };

                // Insert the trip data into the 'trips' table
                const { data: insertedTrip, error } = await supabase
                    .from('trips')
                    .insert([tripDataToSave])
                    .select(); // Use .select() to return the inserted row data

                if (error) {
                    console.error('Supabase trip save failed. Raw error object:', error);
                    // Improved error logging for debugging Supabase issues
                     try { console.error('Supabase error (JSON string):', JSON.stringify(error)); } catch (e) { console.error('Could not JSON stringify error:', e); }
                     if (error.message) console.error('Supabase error message:', error.message); else console.error('Supabase error message property is missing.');
                     if (error.details) console.error('Supabase error details:', error.details);
                     if (error.hint) console.error('Supabase error hint:', error.hint);
                     if (error.code) console.error('Supabase error code:', error.code);


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

            } catch (innerError) {
                console.error('An error occurred in the inner POST try block (save trip):', innerError);
                 throw innerError; // Re-throw to be caught by the outer catch
            }
        }

        // --- Handle DELETE requests (Delete Trip) ---
         if (event.httpMethod === 'DELETE') {
             console.log('Received DELETE request for trip.');
             try {
                 const data = JSON.parse(event.body);
                 const tripId = data.id; // Expect the trip ID in the body

                 // Basic validation
                 if (!tripId) {
                     console.error("No trip ID provided for deletion.");
                     return {
                         statusCode: 400,
                         body: JSON.stringify({ message: 'No trip ID provided for deletion.' })
                     };
                 }

                 console.log(`Attempting to delete trip with ID: ${tripId}`);

                 // Delete the row from the 'trips' table
                 const { error } = await supabase
                     .from('trips')
                     .delete()
                     .eq('id', tripId); // Filter by the provided trip ID

                 if (error) {
                     console.error(`Supabase trip deletion failed for ID ${tripId}. Raw error object:`, error);
                     // Improved error logging
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

                 console.log(`Trip with ID ${tripId} deleted successfully.`);

                 // Return success response
                 return {
                     statusCode: 200,
                     body: JSON.stringify({ status: 'success', message: `Trip with ID ${tripId} deleted successfully` })
                 };

             } catch (innerError) {
                 console.error('An error occurred in the inner DELETE try block (delete trip):', innerError);
                 throw innerError; // Re-throw to be caught by the outer catch
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
    // *************************************
};