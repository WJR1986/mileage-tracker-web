// --- Element References ---
const addressInput = document.getElementById('address-input');
const addAddressButton = document.getElementById('add-address-button');
const addressList = document.getElementById('address-list');
const tripSequenceList = document.getElementById('trip-sequence-list');
const calculateMileageButton = document.getElementById('calculate-mileage-button');
const mileageResultsDiv = document.getElementById('mileage-results');
const totalDistancePara = document.getElementById('total-distance');
const potentialReimbursementPara = document.getElementById('potential-reimbursement');
const tripLegsList = document.getElementById('trip-legs-list');
const saveTripButton = document.getElementById('save-trip-button');
const tripHistoryList = document.getElementById('trip-history-list');

// --- State Variables ---
const REIMBURSEMENT_RATE_PER_MILE = 0.45;
let tripSequence = []; // Stores full address objects from DB

// --- API Interaction Functions ---

// Fetch all addresses from the backend
async function fetchAddresses() {
    console.log('Fetching addresses...');
    try {
        const response = await fetch('/.netlify/functions/hello', { method: 'GET' });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }
        const addresses = await response.json();
        console.log('Fetched addresses:', addresses);
        return addresses; // Return the data
    } catch (error) {
        console.error('Error fetching addresses:', error);
        // Re-throw or return null/empty array based on how calling code handles it
        throw error; // Let calling code handle UI error display
    }
}

// Post a new address to the backend
async function postAddress(addressText) {
     console.log('Posting address:', addressText);
    try {
        const response = await fetch('/.netlify/functions/hello', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: addressText })
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }
        const data = await response.json();
        console.log('Post address response:', data);
        return data; // Return the response data (status, message)
    } catch (error) {
        console.error('Error posting address:', error);
        throw error;
    }
}

// Post a trip sequence for mileage calculation
async function postCalculateMileage(addressesArray) {
     console.log('Posting trip sequence for calculation:', addressesArray);
    try {
        const response = await fetch('/.netlify/functions/calculate-mileage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses: addressesArray })
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }
        const results = await response.json();
        console.log('Calculation response:', results);
        return results; // Return calculation results
    } catch (error) {
        console.error('Error calculating mileage:', error);
        throw error;
    }
}

// Post a completed trip to be saved
async function postSaveTrip(tripData) {
     console.log('Posting trip to save:', tripData);
     saveTripButton.disabled = true; // Disable button immediately on click
     saveTripButton.textContent = 'Saving...';
    try {
        const response = await fetch('/.netlify/functions/save-trip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tripData)
        });
        if (!response.ok) {
             const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }
        const saveResult = await response.json();
        console.log('Save trip response:', saveResult);
        return saveResult; // Return save result (status, message)
    } catch (error) {
        console.error('Error saving trip:', error);
        throw error;
    } finally {
        saveTripButton.disabled = false; // Re-enable button
        saveTripButton.textContent = 'Save Trip';
    }
}

// Fetch trip history from the backend
async function fetchTripHistory() {
    console.log('Fetching trip history...');
    try {
        const response = await fetch('/.netlify/functions/save-trip', { method: 'GET' });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }
        const trips = await response.json();
        console.log('Fetched trip history:', trips);
        return trips; // Return array of trip objects
    } catch (error) {
        console.error('Error fetching trip history:', error);
        throw error;
    }
}


// --- Rendering Functions ---

// Render the list of available addresses
function renderAddresses(addresses) {
    addressList.innerHTML = ''; // Clear current list
    if (!addresses || addresses.length === 0) {
         // Optional: add a message if no addresses saved
         const placeholderItem = document.createElement('li');
         placeholderItem.classList.add('list-group-item', 'text-muted');
         placeholderItem.textContent = 'No saved addresses yet. Add one above!';
         addressList.appendChild(placeholderItem);
         return; // Stop if no addresses
    }

    addresses.forEach(address => {
        const listItem = document.createElement('li');
        listItem.classList.add('list-group-item', 'list-group-item-action');
        listItem.style.cursor = 'pointer';
        listItem.textContent = address.address_text;
        listItem.dataset.addressId = address.id;
        listItem.dataset.addressText = address.address_text; // Store text for convenience

        // Add click listener to add to trip sequence
        listItem.addEventListener('click', () => {
             // Pass the address object directly
             addAddressToTripSequence(address);
        });

        addressList.appendChild(listItem);
    });
}

// Render the current trip sequence
function renderTripSequence() {
    tripSequenceList.innerHTML = ''; // Clear current sequence list

    if (tripSequence.length === 0) {
        const placeholderItem = document.createElement('li');
        placeholderItem.classList.add('list-group-item', 'text-muted');
        placeholderItem.textContent = 'Select addresses above to build your trip...';
        tripSequenceList.appendChild(placeholderItem);
        // Hide results and save button if sequence is empty
        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none';
    } else {
        tripSequence.forEach((address, index) => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item');
            listItem.textContent = `${index + 1}. ${address.address_text}`;
            // Optional: add remove button here later
            tripSequenceList.appendChild(listItem);
        });

        // Show calculate button, hide results until calculated
        calculateMileageButton.style.display = 'block';
        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none';
    }

    // Enable/disable calculate button (need at least 2 addresses)
    calculateMileageButton.disabled = tripSequence.length < 2;
}

// Render the mileage calculation results
function renderMileageResults(results, sequenceAddresses) {
    // results contains { totalDistance: "X.XX miles", legDistances: ["Y.YY miles", ...] }
    // sequenceAddresses is the original tripSequence array of address objects

    totalDistancePara.textContent = `Total Distance: ${results.totalDistance}`;

    // Calculate and display Potential Reimbursement
    const totalDistanceMilesMatch = results.totalDistance.match(/([\d.]+)\s*miles/);
    let totalDistanceInMiles = 0;
    if (totalDistanceMilesMatch && totalDistanceMilesMatch[1]) {
        totalDistanceInMiles = parseFloat(totalDistanceMilesMatch[1]);
    }
    const potentialReimbursement = totalDistanceInMiles * REIMBURSEMENT_RATE_PER_MILE;
    const formattedReimbursement = `£${potentialReimbursement.toFixed(2)}`;
    potentialReimbursementPara.textContent = `Potential Reimbursement: ${formattedReimbursement}`;

    // Render individual trip leg distances
    tripLegsList.innerHTML = ''; // Clear previous legs
    results.legDistances.forEach((legDistanceText, index) => {
        const legItem = document.createElement('li');
        legItem.classList.add('list-group-item');
        // Use addresses from the sequence to show leg details
        const startAddressText = sequenceAddresses[index] ? sequenceAddresses[index].address_text : 'Start';
        const endAddressText = sequenceAddresses[index + 1] ? sequenceAddresses[index + 1].address_text : 'End';
        legItem.textContent = `Leg ${index + 1}: ${startAddressText} to ${endAddressText} - ${legDistanceText}`;
        tripLegsList.appendChild(legItem);
    });

    mileageResultsDiv.style.display = 'block'; // Show the results section
    saveTripButton.style.display = 'block'; // Make the Save Trip button visible
}

// Render the trip history
function renderTripHistory(trips) {
    tripHistoryList.innerHTML = ''; // Clear current list

    if (!trips || trips.length === 0) {
        const placeholderItem = document.createElement('li');
        placeholderItem.classList.add('list-group-item', 'text-muted');
        placeholderItem.textContent = 'No trip history available yet.';
        tripHistoryList.appendChild(placeholderItem);
    } else {
        trips.forEach(trip => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item');

            // Format date and time (UK format)
            const tripDate = new Date(trip.created_at);
            const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
            const formattedDate = tripDate.toLocaleDateString('en-GB', dateOptions);
            const formattedTime = tripDate.toLocaleTimeString('en-GB', timeOptions);
            const formattedDateTime = `${formattedDate} ${formattedTime}`;

            listItem.innerHTML = `
                <strong>Trip on ${formattedDateTime}</strong><br>
                Distance: ${trip.total_distance_miles.toFixed(2)} miles<br>
                Reimbursement: £${trip.reimbursement_amount.toFixed(2)}
            `;
             // Optional: Add more trip_data details here later if needed

            tripHistoryList.appendChild(listItem);
        });
    }
}


// --- State Management Functions ---

// Function to add an address object to the trip sequence state
function addAddressToTripSequence(address) {
     // We store the full address object now, including id and text
    tripSequence.push(address);
    console.log('Trip sequence updated:', tripSequence);
    renderTripSequence(); // Always re-render after state change
}

// Optional: Function to remove an address from the trip sequence state
/*
function removeAddressFromTripSequence(index) {
    if (index >= 0 && index < tripSequence.length) {
        tripSequence.splice(index, 1);
        console.log('Trip sequence updated:', tripSequence);
        renderTripSequence();
    }
}
*/

// --- Event Handlers (Orchestrators) ---

// Handle click on Add Address button
async function handleAddAddressClick() {
    const address = addressInput.value.trim();
    if (!address) {
        // Optional: Show a message to the user
        console.log('Address input is empty.');
        return; // Don't proceed if input is empty
    }

    try {
        const result = await postAddress(address);
        if (result.status === 'success') {
            alert(result.message);
            addressInput.value = ''; // Clear input
            // After successfully adding, refresh the displayed address list
            // The renderAddresses function is called inside fetchAndDisplayAddresses
            fetchAndDisplayAddressesWrapper(); // Call the wrapper function that fetches and renders
        } else {
            // Handle server-side error response
            alert('Error saving address: ' + (result.message || 'An unknown error occurred'));
        }
    } catch (error) {
        // Handle network or fetch errors
        alert('An error occurred while saving the address.');
    }
}

// Handle click on Calculate Mileage button
async function handleCalculateMileageClick() {
    if (tripSequence.length < 2) {
        alert('Please add at least two addresses to calculate mileage.');
        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none';
        return;
    }

    // Extract just the address texts for the API call
    const tripAddressTexts = tripSequence.map(address => address.address_text);

    try {
        // Call the API interaction function
        const results = await postCalculateMileage(tripAddressTexts);

        if (results.status === 'success') {
            // Render the results using the rendering function
            renderMileageResults(results, tripSequence); // Pass original sequence for leg text
        } else {
             // Handle API function's non-success status
             alert('Received unexpected calculation results or status not success.');
             console.error('Unexpected calculation response:', results);
             mileageResultsDiv.style.display = 'none';
             saveTripButton.style.display = 'none';
        }

    } catch (error) {
        // Handle network or fetch errors
        console.error('Mileage calculation failed:', error);
         // Construct a more informative error message
        let errorMessage = 'An unknown error occurred during mileage calculation.';
        if (error instanceof Error) { errorMessage = 'Error: ' + error.message; }
        else if (typeof error === 'string') { errorMessage = 'Error: ' + error; }
        else if (error && typeof error === 'object' && error.message) { errorMessage = 'Error: ' + error.message; }
        alert(errorMessage);
        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none';
    }
}

// Handle click on Save Trip button
async function handleSaveTripClick() {
    // Ensure there's a calculated trip to save (optional check, button is hidden otherwise)
    if (mileageResultsDiv.style.display === 'none' || tripSequence.length < 2) {
        alert('No trip calculated or trip sequence is too short to save.');
        return;
    }

     // Gather the data needed for saving from the UI/state
    const rawTotalDistanceText = totalDistancePara.textContent.replace('Total Distance: ', '').trim();
    const totalDistanceMiles = parseFloat(rawTotalDistanceText.replace(' miles', ''));

    const rawReimbursementText = potentialReimbursementPara.textContent.replace('Potential Reimbursement: £', '').trim();
    const reimbursementAmount = parseFloat(rawReimbursementText);

    // Construct the data object to send to the backend
    const tripDataToSave = {
        tripSequence: tripSequence, // Save the array of address objects
        totalDistanceMiles: totalDistanceMiles,
        reimbursementAmount: reimbursementAmount
    };

    try {
         // Call the API interaction function
        const saveResult = await postSaveTrip(tripDataToSave);

        if (saveResult.status === 'success') {
            alert('Trip saved successfully!');
            // Clear the current trip state and UI
            tripSequence = [];
            renderTripSequence();
            // Refresh the history list
            fetchAndDisplayTripHistoryWrapper();
        } else {
            // Handle server-side error response
            alert('Error saving trip: ' + (saveResult.message || 'An unknown error occurred'));
        }

    } catch (error) {
        // Handle network or fetch errors (postSaveTrip already handles button state in finally)
        alert('An error occurred while saving the trip: ' + error.message);
    }
}


// --- Initialization and Wrapper Functions ---

// Wrapper function to fetch addresses and render them
async function fetchAndDisplayAddressesWrapper() {
    try {
        const addresses = await fetchAddresses();
        renderAddresses(addresses);
    } catch (error) {
        // Handle errors that weren't handled in fetchAddresses if necessary,
        // e.g., display a global error message. renderAddresses already shows failure.
        console.error("Failed to initialize addresses:", error);
    }
}

// Wrapper function to fetch trip history and render it
async function fetchAndDisplayTripHistoryWrapper() {
     // Show loading state before fetching
    tripHistoryList.innerHTML = '<li class="list-group-item text-muted">Loading trip history...</li>';
    try {
        const trips = await fetchTripHistory();
        renderTripHistory(trips);
    } catch (error) {
        // Handle errors - renderTripHistory already shows failure
         console.error("Failed to initialize trip history:", error);
    }
}


// --- Initial Setup ---

// Set up event listeners once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners to buttons
    addAddressButton.addEventListener('click', handleAddAddressClick);
    calculateMileageButton.addEventListener('click', handleCalculateMileageClick);
    saveTripButton.addEventListener('click', handleSaveTripClick);

    // Perform initial data fetches and rendering
    fetchAndDisplayAddressesWrapper(); // Fetch and display addresses on load
    renderTripSequence(); // Render the empty sequence list on load
    fetchAndDisplayTripHistoryWrapper(); // Fetch and display trip history on load
});