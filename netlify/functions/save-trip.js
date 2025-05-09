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
            const { startDate, endDate, sortBy, sortOrder } = event.queryStringParameters || {};

            console.log('Received query parameters:', { startDate, endDate, sortBy, sortOrder });

            try {
                let query = supabase
                    .from('trips')
                    .select('id, created_at, trip_data, total_distance_miles, reimbursement_amount, leg_distances, trip_datetime');

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
                    console.error('Supabase trip fetch failed with filters/sorting. Raw error object:', error);
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ message: 'Failed to fetch trip history from database', error: error.message })
                    };
                }

                console.log(`Workspaceed ${trips.length} trips with filters/sorting.`);

                return {
                    statusCode: 200,
                    body: JSON.stringify(trips)
                };

            } catch (fetchError) {
                console.error('An error occurred while fetching trips with filters/sorting:', fetchError);
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

                // Corrected typo here: Array.isArray
                if (!tripSequence || !Array.isArray(tripSequence) || tripSequence.length < 2 ||
                    typeof totalDistanceMiles !== 'number' || isNaN(totalDistanceMiles) ||
                    typeof reimbursementAmount !== 'number' || isNaN(reimbursementAmount) ||
                    !legDistances || !Array.isArray(legDistances) // Corrected Array.isArray
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

                const tripDataToSave = {
                    trip_data: tripSequence,
                    total_distance_miles: totalDistanceMiles,
                    reimbursement_amount: reimbursementAmount,
                    leg_distances: legDistances,
                    trip_datetime: tripDatetime
                };

                const { data: insertedTrip, error } = await supabase
                    .from('trips')
                    .insert([tripDataToSave])
                    .select();

                if (error) {
                    console.error('Supabase NEW trip save failed. Raw error object:', error);
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
                console.error('An error occurred in the inner POST try block (save NEW trip):', innerError);
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
                 };

                 if (!tripId) {
                     console.error("No trip ID provided for update.");
                     return {
                         statusCode: 400,
                         body: JSON.stringify({ message: 'No trip ID provided for update.' })
                     };
                 }

                 console.log(`Attempting to UPDATE trip with ID: ${tripId} with data:`, updatedData);

                 const { data: updatedTrip, error } = await supabase
                     .from('trips')
                     .update(updatedData)
                     .eq('id', tripId)
                     .select();


                 if (error) {
                     console.error(`Supabase trip UPDATE failed for ID ${tripId}. Raw error object:`, error);
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

                 console.log(`Trip with ID ${tripId} UPDATED successfully.`);

                 return {
                     statusCode: 200,
                     body: JSON.stringify({ status: 'success', message: `Trip with ID ${tripId} updated successfully`, data: updatedTrip })
                 };

             } catch (innerError) {
                 console.error('An error occurred in the inner PUT try block (update trip):', innerError);
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
                     console.error("No trip ID provided for deletion.");
                     return {
                         statusCode: 400,
                         body: JSON.stringify({ message: 'No trip ID provided for deletion.' })
                     };
                 }

                 console.log(`Attempting to delete trip with ID: ${tripId}`);

                 const { error } = await supabase
                     .from('trips')
                     .delete()
                     .eq('id', tripId);

                 if (error) {
                     console.error(`Supabase trip deletion failed for ID ${tripId}. Raw error object:`, error);
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

                 return {
                     statusCode: 200,
                     body: JSON.stringify({ status: 'success', message: `Trip with ID ${tripId} deleted successfully` })
                 };

             } catch (innerError) {
                 console.error('An error occurred in the inner DELETE try block (delete trip):', innerError);
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