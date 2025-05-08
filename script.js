// Get references to the HTML elements we need
const addressInput = document.getElementById('address-input');
const addAddressButton = document.getElementById('add-address-button');
const addressList = document.getElementById('address-list'); // Main list of saved addresses

// Get references to the new HTML elements for trip planning
const tripSequenceList = document.getElementById('trip-sequence-list'); // List for the current trip sequence
const calculateMileageButton = document.getElementById('calculate-mileage-button');
const mileageResultsDiv = document.getElementById('mileage-results'); // Div to show results
const totalDistancePara = document.getElementById('total-distance'); // Paragraph for total distance
const potentialReimbursementPara = document.getElementById('potential-reimbursement'); // Paragraph for potential reimbursement
const tripLegsList = document.getElementById('trip-legs-list'); // List for individual leg distances
const saveTripButton = document.getElementById('save-trip-button'); // Save Trip button

// Reimbursement rate (initially £0.45 per mile)
const REIMBURSEMENT_RATE_PER_MILE = 0.45; // Stored as a number for calculation

// Array to hold the addresses currently in the trip sequence (stores full address objects from DB)
let tripSequence = [];

// Function to add an address to the trip sequence
function addAddressToTripSequence(address) {
    // Optional: Prevent adding the same address consecutively if needed
    // if (tripSequence.length === 0 || tripSequence[tripSequence.length - 1].id !== address.id) {

    tripSequence.push(address); // Add the selected address object to the array

    // Update the UI list for the trip sequence
    renderTripSequence();

    // } else {
    //     alert('Cannot add the same address twice in a row.');
    // }
}

// Function to remove an address from the trip sequence (Optional for later)
/*
function removeAddressFromTripSequence(index) {
    tripSequence.splice(index, 1); // Remove item from array

    renderTripSequence(); // Re-render the list
}
*/

// Function to render the trip sequence in the UI
function renderTripSequence() {
    // Clear the current trip sequence list in the UI
    tripSequenceList.innerHTML = '';

    if (tripSequence.length === 0) {
        // Show placeholder if the list is empty
        const placeholderItem = document.createElement('li');
        placeholderItem.classList.add('list-group-item', 'text-muted');
        placeholderItem.textContent = 'Select addresses above to build your trip...';
        tripSequenceList.appendChild(placeholderItem);
        // Hide mileage results if the trip sequence is empty or has only one address
        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none'; // Hide save button too

    } else {
        // Hide placeholder if there are items
        // (The list is cleared anyway, so no need to explicitly hide the placeholder item)

        // Loop through the tripSequence array and add items to the UI list
        tripSequence.forEach((address, index) => {
            const listItem = document.createElement('li');
            // Add Bootstrap class. Show order number and address text.
            listItem.classList.add('list-group-item');
            listItem.textContent = `${index + 1}. ${address.address_text}`; // Show order number

            // Optional: Add a remove button later
            /*
            const removeButton = document.createElement('button');
            removeButton.classList.add('btn', 'btn-sm', 'btn-danger', 'float-end');
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent click on li from also triggering this
                removeAddressFromTripSequence(index);
            });
            listItem.appendChild(removeButton);
            */

            tripSequenceList.appendChild(listItem);
        });

        // Ensure the Calculate Mileage button is visible and enable/disable based on count
        calculateMileageButton.style.display = 'block';
        mileageResultsDiv.style.display = 'none'; // Hide results until calculated
        saveTripButton.style.display = 'none'; // Hide save button until calculation is done

    }

    // Enable/disable the calculate button based on number of addresses (need at least 2)
    if (tripSequence.length >= 2) {
        calculateMileageButton.disabled = false;
     } else {
        calculateMileageButton.disabled = true;
     }
}


// Function to fetch and display addresses from the backend (Initial load and after save)
async function fetchAndDisplayAddresses() {
    try {
        // Fetch addresses from the Netlify Function (using GET method)
        const response = await fetch('/.netlify/functions/hello', {
            method: 'GET' // We are requesting data
        });

        if (!response.ok) {
            // If the response is not OK (e.g., 500 error), throw an error
            const errorBody = await response.text(); // Get the response body for more info
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }

        const addresses = await response.json(); // Parse the JSON array of addresses

        // Clear the current list in the UI
        addressList.innerHTML = '';

        // Loop through the fetched addresses and add them to the list
        addresses.forEach(address => {
            const listItem = document.createElement('li');
            // Add Bootstrap list item class and action class for hover effect, pointer cursor
            listItem.classList.add('list-group-item', 'list-group-item-action');
            listItem.style.cursor = 'pointer';

            listItem.textContent = address.address_text; // Use the 'address_text' from the database

            // Store the full address object on the list item for easy access
            listItem.dataset.addressId = address.id; // Store the Supabase ID
            listItem.dataset.addressText = address.address_text; // Store the address text
            // Store the whole address object if needed, though dataset is simpler for id/text
            // listItem.dataset.address = JSON.stringify(address);


            // Add click event listener to add this address to the trip sequence
            listItem.addEventListener('click', () => {
                // Pass the address object directly to the add function
                addAddressToTripSequence(address);
            });

            // Optional: Add date/time or ID for debugging
            // listItem.textContent = `${address.address_text} (ID: ${address.id})`;

            addressList.appendChild(listItem);
        });

    } catch (error) {
        console.error('Error fetching and displaying addresses:', error);
        // Optional: Display an error message in the UI
        // addressList.innerHTML = '<li class="list-group-item text-danger">Failed to load addresses.</li>';
    }
}


// --- Event Listeners ---

// Add event listener to the "Add Address" button
addAddressButton.addEventListener('click', () => {
    const address = addressInput.value.trim(); // Use trim() to remove leading/trailing whitespace

    if (address) {
        // Send the address to the backend (Netlify Function)
        fetch('/.netlify/functions/hello', { // Calls the function that handles POST (saving)
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ address: address }) // Send address as JSON
        })
        .then(response => {
             if (!response.ok) {
                // If the response is not OK, read the error body and throw
                return response.text().then(text => {
                    throw new Error(`HTTP error! status: ${response.status}, Body: ${text}`);
                });
            }
            return response.json(); // Parse the JSON response on success
        })
        .then(data => {
            // Handle the response from the Netlify Function (POST request)
            console.log('Function POST response:', data); // Log the response to the console

            if (data.status === 'success') {
                alert(data.message); // Show success message (e.g., "Address saved successfully")
                addressInput.value = ''; // Clear input field

                // Fetch and display the updated list of addresses AFTER successful save
                fetchAndDisplayAddresses();

            } else {
                // Handle error response from the function
                alert('Error saving address: ' + (data.message || 'An unknown error occurred'));
            }
        })
        .catch(error => {
            // Handle network errors or errors before the function runs
            console.error('Fetch POST error:', error);
            alert('An error occurred while saving the address.');
        });
    } else {
        // Optional: Alert if the input is empty
        // alert('Please enter an address.');
    }
});


// Add event listener to the "Calculate Mileage" button
calculateMileageButton.addEventListener('click', async () => {
    // Ensure there are at least two addresses in the trip sequence
    if (tripSequence.length < 2) {
        alert('Please add at least two addresses to calculate mileage.');
        // Hide results section if it was somehow visible
        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none'; // Hide save button too
        return; // Don't proceed if less than 2 addresses
    }

    // --- Mileage calculation logic ---
    console.log('Calculating mileage for trip:', tripSequence);

    // Prepare addresses for the backend function (send just the address text)
    const tripAddressTexts = tripSequence.map(address => address.address_text);

    // Show a loading indicator or disable button during calculation (Optional)
    // calculateMileageButton.disabled = true;
    // calculateMileageButton.textContent = 'Calculating...';
    // mileageResultsDiv.style.display = 'none'; // Hide previous results
    // saveTripButton.style.display = 'none'; // Hide save button during calculation


    try {
        // Call the calculate-mileage Netlify Function
        const response = await fetch('/.netlify/functions/calculate-mileage', {
            method: 'POST', // Use POST to send the trip sequence data
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ addresses: tripAddressTexts }) // Send the array of address texts as JSON
        });

        // Check if the function response was successful (status 2xx)
        if (!response.ok) {
            // If the response is not OK, read the error body and throw
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }

        const results = await response.json(); // Parse the JSON results from the function

        console.log('Calculation function response:', results);

        // --- Display results in the UI ---
        // Check if the response has the expected success status and data structure
        if (results.status === 'success' && results.totalDistance && results.legDistances) {
            totalDistancePara.textContent = `Total Distance: ${results.totalDistance}`;

            // --- Calculate and display Potential Reimbursement ---
            // We need the total distance as a number to calculate
            // The API result is formatted text (e.g., "10.5 miles"), so we need to parse it
            const totalDistanceMilesMatch = results.totalDistance.match(/([\d.]+)\s*miles/);
            let totalDistanceInMiles = 0;
            if (totalDistanceMilesMatch && totalDistanceMilesMatch[1]) {
                totalDistanceInMiles = parseFloat(totalDistanceMilesMatch[1]);
            }

            // Use the defined reimbursement rate
            const potentialReimbursement = totalDistanceInMiles * REIMBURSEMENT_RATE_PER_MILE;

            // Format reimbursement as currency (e.g., £0.00)
            const formattedReimbursement = `£${potentialReimbursement.toFixed(2)}`;

            potentialReimbursementPara.textContent = `Potential Reimbursement: ${formattedReimbursement}`;
            // ----------------------------------------------------

            // Clear previous leg distances
            tripLegsList.innerHTML = '';

            // Display individual trip leg distances
            results.legDistances.forEach((leg, index) => {
                console.log(`--- Creating Leg Item for index ${index} ---`); // Log before creation
                const legItem = document.createElement('li'); // Create the list item
                console.log('legItem created:', legItem); // Log the created element

                legItem.classList.add('list-group-item');

                // Get the start and end address texts safely
                const startAddress = tripSequence[index];
                const endAddress = tripSequence[index + 1];

                const startAddressText = startAddress ? startAddress.address_text : 'Start';
                const endAddressText = endAddress ? endAddress.address_text : 'End';

                 // Set the text content for the leg item
                const legText = `Leg ${index + 1}: ${startAddressText} to ${endAddressText} - ${leg}`;
                console.log('Setting textContent:', legText); // Log the text content
                legItem.textContent = legText; // Set text content

                console.log('Appending legItem to tripLegsList:', tripLegsList); // Log the parent element
                 tripLegsList.appendChild(legItem); // Append the list item

                 console.log(`--- Finished Leg Item for index ${index} ---`); // Log after appending
            });

            mileageResultsDiv.style.display = 'block'; // Show the results section
            saveTripButton.style.display = 'block'; // Make the Save Trip button visible


        } else {
             // Handle case where function didn't return expected format or status wasn't 'success'
             alert('Received unexpected calculation results or status not success.');
             console.error('Unexpected calculation response:', results);
             mileageResultsDiv.style.display = 'none'; // Hide results if format is wrong
             saveTripButton.style.display = 'none'; // Hide save button
        }


    } catch (error) {
        console.error('Fetch Calculate Mileage error:', error);

        // Construct a more informative error message
        let errorMessage = 'An unknown error occurred during mileage calculation.';
        if (error instanceof Error) {
            errorMessage = 'Error: ' + error.message;
        } else if (typeof error === 'string') {
            errorMessage = 'Error: ' + error;
        } else if (error && typeof error === 'object' && error.message) {
            errorMessage = 'Error: ' + error.message;
        }


        alert(errorMessage); // Show the improved error message

        mileageResultsDiv.style.display = 'none'; // Hide results on error
        saveTripButton.style.display = 'none'; // Hide save button


    } finally {
        // Re-enable button or hide loading indicator (Optional)
        // calculateMileageButton.disabled = false;
        // calculateMileageButton.textContent = 'Calculate Mileage';
    }
});

console.log('Attaching Save Trip button event listener');
// Add event listener to the "Save Trip" button
saveTripButton.addEventListener('click', async () => {
    // Ensure there's a calculated trip to save (optional check, button is hidden otherwise)
    if (mileageResultsDiv.style.display === 'none' || tripSequence.length < 2) {
        alert('No trip calculated or trip sequence is too short to save.');
        return;
    }

    // Gather the data to save
    // Refine parsing to be more robust
    const rawTotalDistanceText = totalDistancePara.textContent.replace('Total Distance: ', '').trim();
    const totalDistanceMiles = parseFloat(rawTotalDistanceText.replace(' miles', '')); // Remove " miles" then parse

    const rawReimbursementText = potentialReimbursementPara.textContent.replace('Potential Reimbursement: £', '').trim();
    const reimbursementAmount = parseFloat(rawReimbursementText); // Parse the number after removing '£'


    const tripToSave = {
        tripSequence: tripSequence, // The array of address objects
        totalDistanceMiles: totalDistanceMiles, // The numerical distance value
        reimbursementAmount: reimbursementAmount // The numerical reimbursement value
    };

    console.log('Attempting to save trip:', tripToSave);
    console.log('Parsed totalDistanceMiles type:', typeof totalDistanceMiles, 'value:', totalDistanceMiles);
    console.log('Parsed reimbursementAmount type:', typeof reimbursementAmount, 'value:', reimbursementAmount);


    // Call the save-trip Netlify Function
    try {
         const response = await fetch('/.netlify/functions/save-trip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tripToSave) // Send the trip data as JSON
        });

        // Check if the function response was successful (status 2xx)
        if (!response.ok) {
            // If the response is not OK, read the error body and throw
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }

        const saveResult = await response.json(); // Expecting JSON results from the function

        console.log('Save trip function response:', saveResult);

        if (saveResult.status === 'success') {
            alert('Trip saved successfully!');
            // Optional: Clear the trip sequence and results after saving?
            // tripSequence = [];
            // renderTripSequence(); // This will also hide results and save button
        } else {
            alert('Error saving trip: ' + (saveResult.message || 'An unknown error occurred'));
        }

    } catch (error) {
        console.error('Fetch Save Trip error:', error);
        alert('An error occurred while saving the trip: ' + error.message); // Show the error message from the catch block
    }
});


// --- Initial Load ---

// Fetch and display addresses when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayAddresses(); // Load initial list of addresses
    renderTripSequence(); // Render the empty trip sequence placeholder initially
});
