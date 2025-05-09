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
const tripHistoryList = document.getElementById('trip-history-list'); // The list for history items

// --- New Element References for Modal ---
const tripDetailsModalElement = document.getElementById('tripDetailsModal'); // The modal div
const detailTripDateSpan = document.getElementById('detail-trip-date');
const detailTotalDistanceSpan = document.getElementById('detail-total-distance');
const detailReimbursementSpan = document.getElementById('detail-reimbursement');
const detailTripSequenceList = document.getElementById('detail-trip-sequence'); // List inside modal for sequence
const detailTripLegsList = document.getElementById('detail-trip-legs'); // List inside modal for legs
// ----------------------------------------


// --- State Variables ---
const REIMBURSEMENT_RATE_PER_MILE = 0.45;
let tripSequence = []; // Stores full address objects from DB for the CURRENT trip being planned
let savedTripHistory = []; // *** NEW: Store the array of fetched saved trip objects ***


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
        return addresses;
    } catch (error) {
        console.error('Error fetching addresses:', error);
        throw error;
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
        return data;
    } catch (error) {
        console.error('Error posting address:', error);
        throw error;
    }
}

// Post a trip sequence for mileage calculation
// *** UPDATE: Function now returns totalDistance and legDistances from the backend ***
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
        // *** Ensure the response includes legDistances as formatted strings (e.g., "X.XX miles") ***
        if (results.status === 'success' && results.totalDistance && Array.isArray(results.legDistances)) {
             return results; // Return calculation results including totalDistance and legDistances
        } else {
             // Handle unexpected successful response format
             console.error('Received unexpected calculation results format:', results);
             throw new Error('Unexpected calculation results format from server.');
        }

    } catch (error) {
        console.error('Error calculating mileage:', error);
        throw error;
    }
}

// Post a completed trip to be saved
// *** UPDATE: Function now accepts and sends legDistances to the backend ***
async function postSaveTrip(tripData) { // tripData now includes legDistances
     console.log('Posting trip to save:', tripData);
     saveTripButton.disabled = true;
     saveTripButton.textContent = 'Saving...';
    try {
        const response = await fetch('/.netlify/functions/save-trip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tripData) // tripData now includes legDistances
        });
        if (!response.ok) {
             const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }
        const saveResult = await response.json();
        console.log('Save trip response:', saveResult);
        return saveResult;
    } catch (error) {
        console.error('Error saving trip:', error);
        throw error;
    } finally {
        saveTripButton.disabled = false;
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
        return trips; // Return array of trip objects (now includes leg_distances)
    } catch (error) {
        console.error('Error fetching trip history:', error);
        throw error;
    }
}


// --- Rendering Functions ---

// Render the list of available addresses
function renderAddresses(addresses) {
    addressList.innerHTML = '';
    if (!addresses || addresses.length === 0) {
         const placeholderItem = document.createElement('li');
         placeholderItem.classList.add('list-group-item', 'text-muted');
         placeholderItem.textContent = 'No saved addresses yet. Add one above!';
         addressList.appendChild(placeholderItem);
         return;
    }

    addresses.forEach(address => {
        const listItem = document.createElement('li');
        listItem.classList.add('list-group-item', 'list-group-item-action');
        listItem.style.cursor = 'pointer';
        listItem.textContent = address.address_text;
        listItem.dataset.addressId = address.id;
        listItem.dataset.addressText = address.address_text;

        listItem.addEventListener('click', () => {
             addAddressToTripSequence(address);
        });

        addressList.appendChild(listItem);
    });
}

// Render the current trip sequence
function renderTripSequence() {
    tripSequenceList.innerHTML = '';

    if (tripSequence.length === 0) {
        const placeholderItem = document.createElement('li');
        placeholderItem.classList.add('list-group-item', 'text-muted');
        placeholderItem.textContent = 'Select addresses above to build your trip...';
        tripSequenceList.appendChild(placeholderItem);
        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none';
    } else {
        tripSequence.forEach((address, index) => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item');
            listItem.textContent = `${index + 1}. ${address.address_text}`;
            tripSequenceList.appendChild(listItem);
        });

        calculateMileageButton.style.display = 'block';
        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none';
    }

    calculateMileageButton.disabled = tripSequence.length < 2;
}

// Render the mileage calculation results for the CURRENT trip
// *** UPDATE: Function now accepts legDistances array directly ***
function renderMileageResults(totalDistanceText, reimbursementAmount, legDistancesArray, sequenceAddresses) {
    // totalDistanceText is like "X.XX miles"
    // reimbursementAmount is the calculated number
    // legDistancesArray is like ["Y.YY miles", "Z.ZZ miles"]
    // sequenceAddresses is the original tripSequence array of address objects

    totalDistancePara.textContent = `Total Distance: ${totalDistanceText}`;

    const formattedReimbursement = `£${reimbursementAmount.toFixed(2)}`;
    potentialReimbursementPara.textContent = `Potential Reimbursement: ${formattedReimbursement}`;

    tripLegsList.innerHTML = ''; // Clear previous legs
     if (!legDistancesArray || legDistancesArray.length === 0) {
         const listItem = document.createElement('li');
         listItem.classList.add('list-group-item', 'text-muted');
         listItem.textContent = 'No leg details available.';
         tripLegsList.appendChild(listItem);
     } else {
         legDistancesArray.forEach((legDistanceText, index) => {
             const legItem = document.createElement('li');
             legItem.classList.add('list-group-item');
             const startAddressText = sequenceAddresses[index] ? sequenceAddresses[index].address_text : 'Start';
             const endAddressText = sequenceAddresses[index + 1] ? sequenceAddresses[index + 1].address_text : 'End';
             legItem.textContent = `Leg ${index + 1}: ${startAddressText} to ${endAddressText} - ${legDistanceText}`;
             tripLegsList.appendChild(legItem);
         });
     }


    mileageResultsDiv.style.display = 'block';
    saveTripButton.style.display = 'block';
}


// Render the trip history list items
// *** UPDATE: Add clickability and store trip ID on list item ***
function renderTripHistory(trips) {
    tripHistoryList.innerHTML = '';

    if (!trips || trips.length === 0) {
        const placeholderItem = document.createElement('li');
        placeholderItem.classList.add('list-group-item', 'text-muted');
        placeholderItem.textContent = 'No trip history available yet.';
        tripHistoryList.appendChild(placeholderItem);
    } else {
        trips.forEach(trip => {
            const listItem = document.createElement('li');
            // Make history items clickable and add pointer cursor
            listItem.classList.add('list-group-item', 'list-group-item-action');
            listItem.style.cursor = 'pointer';

            // Store the trip ID on the list item for easy lookup later
            listItem.dataset.tripId = trip.id; // Assuming trip.id is unique

            // Format date and time (UK format)
            const tripDate = new Date(trip.created_at);
            const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
            const formattedDate = tripDate.toLocaleDateString('en-GB', dateOptions);
            const formattedTime = tripDate.toLocaleTimeString('en-GB', timeOptions);
            const formattedDateTime = `${formattedDate} ${formattedTime}`;

            // Display key trip information
            listItem.innerHTML = `
                <strong>Trip on ${formattedDateTime}</strong><br>
                Distance: ${trip.total_distance_miles.toFixed(2)} miles<br>
                Reimbursement: £${trip.reimbursement_amount.toFixed(2)}
            `;
             // Note: Full trip_data and leg_distances are NOT displayed here,
             // they will be shown in the modal when clicked.

            tripHistoryList.appendChild(listItem);
        });
    }
}

// *** NEW: Render detailed trip information in the modal ***
function renderTripDetailsModal(trip) {
     if (!trip) {
         console.error('No trip data provided to render modal.');
         return;
     }

     // Populate basic details
     const tripDate = new Date(trip.created_at);
     const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
     const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
     const formattedDate = tripDate.toLocaleDateString('en-GB', dateOptions);
     const formattedTime = tripDate.toLocaleTimeString('en-GB', timeOptions);
     detailTripDateSpan.textContent = `${formattedDate} ${formattedTime}`;

     detailTotalDistanceSpan.textContent = `${trip.total_distance_miles.toFixed(2)} miles`;
     detailReimbursementSpan.textContent = `£${trip.reimbursement_amount.toFixed(2)}`;

     // Populate Trip Sequence
     detailTripSequenceList.innerHTML = ''; // Clear previous sequence
     if (!trip.trip_data || trip.trip_data.length === 0) {
         const listItem = document.createElement('li');
         listItem.classList.add('list-group-item', 'text-muted');
         listItem.textContent = 'Sequence data not available.';
         detailTripSequenceList.appendChild(listItem);
     } else {
         trip.trip_data.forEach((address, index) => {
             const listItem = document.createElement('li');
             listItem.classList.add('list-group-item'); // Keep list-group-flush from parent
             listItem.textContent = `${index + 1}. ${address.address_text}`;
             detailTripSequenceList.appendChild(listItem);
         });
     }

     // Populate Trip Legs with distances
     detailTripLegsList.innerHTML = ''; // Clear previous legs
     if (!trip.leg_distances || trip.leg_distances.length === 0) {
          const listItem = document.createElement('li');
          listItem.classList.add('list-group-item', 'text-muted');
          listItem.textContent = 'Leg distance data not available.';
          detailTripLegsList.appendChild(listItem);
     } else {
          trip.leg_distances.forEach((legDistanceText, index) => {
              const listItem = document.createElement('li');
              listItem.classList.add('list-group-item'); // Keep list-group-flush from parent
              // Use address text from the sequence for better context in legs
              const startAddressText = trip.trip_data && trip.trip_data[index] ? trip.trip_data[index].address_text : 'Start';
              const endAddressText = trip.trip_data && trip.trip_data[index + 1] ? trip.trip_data[index + 1].address_text : 'End';
              listItem.textContent = `Leg ${index + 1}: ${startAddressText} to ${endAddressText} - ${legDistanceText}`;
              detailTripLegsList.appendChild(listItem);
          });
     }
}


// --- State Management Functions ---

// Function to add an address object to the trip sequence state
function addAddressToTripSequence(address) {
    tripSequence.push(address);
    console.log('Trip sequence updated:', tripSequence);
    renderTripSequence();
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
        console.log('Address input is empty.');
        return;
    }

    try {
        const result = await postAddress(address);
        if (result.status === 'success') {
            alert(result.message);
            addressInput.value = '';
            fetchAndDisplayAddressesWrapper();
        } else {
            alert('Error saving address: ' + (result.message || 'An unknown error occurred'));
        }
    } catch (error) {
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

    const tripAddressTexts = tripSequence.map(address => address.address_text);

    try {
        // Call the API interaction function which now returns legDistances
        const results = await postCalculateMileage(tripAddressTexts);

        // Store the legDistances from the calculation results
        // We need these to send to the saveTrip function later
        tripSequence.calculatedLegDistances = results.legDistances; // *** STORE legDistances on the sequence object temporarily ***

        // Render the results using the rendering function
        // *** Pass the totalDistance and legDistances explicitly ***
        renderMileageResults(results.totalDistance, tripSequence.calculatedTotalReimbursement, results.legDistances, tripSequence);

         // Calculate and store reimbursement on the tripSequence object for saving
         const totalDistanceMilesMatch = results.totalDistance.match(/([\d.]+)\s*miles/);
         let totalDistanceInMiles = 0;
         if (totalDistanceMilesMatch && totalDistanceMilesMatch[1]) {
             totalDistanceInMiles = parseFloat(totalDistanceMilesMatch[1]);
         }
         const potentialReimbursement = totalDistanceInMiles * REIMBURSEMENT_RATE_PER_MILE;
         tripSequence.calculatedTotalDistanceMiles = totalDistanceInMiles; // Store numerical total distance
         tripSequence.calculatedTotalReimbursement = potentialReimbursement; // *** Store calculated reimbursement ***


    } catch (error) {
        console.error('Mileage calculation failed:', error);
        let errorMessage = 'An unknown error occurred during mileage calculation.';
        if (error instanceof Error) { errorMessage = 'Error: ' + error.message; }
        else if (typeof error === 'string') { errorMessage = 'Error: ' + error; }
        else if (error && typeof error === 'object' && error.message) { errorMessage = 'Error: ' + error.message; }
        alert(errorMessage);
        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none';
         // Clear temporary calculation results from state on error
         delete tripSequence.calculatedLegDistances;
         delete tripSequence.calculatedTotalDistanceMiles;
         delete tripSequence.calculatedTotalReimbursement;
    }
}

// Handle click on Save Trip button
async function handleSaveTripClick() {
    // Ensure there's a calculated trip to save (optional check, button is hidden otherwise)
    // Also ensure we have the calculation results stored temporarily
    if (mileageResultsDiv.style.display === 'none' || tripSequence.length < 2 ||
        !tripSequence.calculatedTotalDistanceMiles ||
        !tripSequence.calculatedTotalReimbursement ||
        !tripSequence.calculatedLegDistances
       ) {
        alert('No valid trip calculation available to save.');
        return;
    }

    // Construct the data object to send to the backend
    const tripDataToSave = {
        tripSequence: tripSequence.map(addr => ({ // Send only necessary address properties
            id: addr.id,
            address_text: addr.address_text,
            created_at: addr.created_at // Include created_at if needed for sequence sorting/context in backend
        })),
        totalDistanceMiles: tripSequence.calculatedTotalDistanceMiles,
        reimbursementAmount: tripSequence.calculatedTotalReimbursement,
        legDistances: tripSequence.calculatedLegDistances // *** INCLUDE legDistances here ***
    };

    console.log('Attempting to save trip:', tripDataToSave);

    try {
        const saveResult = await postSaveTrip(tripDataToSave);

        if (saveResult.status === 'success') {
            alert('Trip saved successfully!');
            // Clear the current trip state and UI after saving
            tripSequence = [];
            delete tripSequence.calculatedLegDistances; // Clean up temporary data
            delete tripSequence.calculatedTotalDistanceMiles;
            delete tripSequence.calculatedTotalReimbursement;
            renderTripSequence(); // This hides the results and save button
            // Refresh the history list after saving a new trip
            fetchAndDisplayTripHistoryWrapper();

        } else {
            alert('Error saving trip: ' + (saveResult.message || 'An unknown error occurred'));
        }

    } catch (error) {
        // postSaveTrip handles button state in finally
        alert('An error occurred while saving the trip: ' + error.message);
    }
    // Note: No finally block here, postSaveTrip's internal finally handles button state
}

// *** NEW: Handle click on Trip History list items ***
function handleTripHistoryItemClick(event) {
    // Use event delegation: check if the click target or its parent is a list-group-item
    const targetItem = event.target.closest('.list-group-item');

    // Ensure a history item was clicked (not the ul itself or placeholder)
    // Also check if it has a tripId dataset attribute (only our rendered items will)
    if (targetItem && targetItem.dataset.tripId) {
        const clickedTripId = targetItem.dataset.tripId;
        console.log('History item clicked, trip ID:', clickedTripId);

        // Find the corresponding trip object in the savedTripHistory array
        const selectedTrip = savedTripHistory.find(trip => trip.id === clickedTripId);

        if (selectedTrip) {
            console.log('Found trip details:', selectedTrip);
            // Render the details in the modal
            renderTripDetailsModal(selectedTrip);

            // Show the modal using Bootstrap's JavaScript
            const tripDetailsModal = new bootstrap.Modal(tripDetailsModalElement);
            tripDetailsModal.show();
        } else {
            console.error('Could not find trip with ID:', clickedTripId, 'in savedTripHistory.');
            alert('Could not retrieve trip details.');
        }
    }
}


// --- Initialization and Wrapper Functions ---

// Wrapper function to fetch addresses and render them
async function fetchAndDisplayAddressesWrapper() {
    try {
        const addresses = await fetchAddresses();
        renderAddresses(addresses);
    } catch (error) {
        console.error("Failed to initialize addresses:", error);
         // Optionally render a failure message here
         addressList.innerHTML = '<li class="list-group-item text-danger">Failed to load addresses.</li>';
    }
}

// Wrapper function to fetch trip history and render it
async function fetchAndDisplayTripHistoryWrapper() {
     // Show loading state before fetching
    tripHistoryList.innerHTML = '<li class="list-group-item text-muted">Loading trip history...</li>';
    try {
        const trips = await fetchTripHistory();
        // *** Store the fetched trips in the global state variable ***
        savedTripHistory = trips;
        // ********************************************************
        renderTripHistory(savedTripHistory); // Render from the state variable
    } catch (error) {
         console.error("Failed to initialize trip history:", error);
         // Display a failure message in the UI
         tripHistoryList.innerHTML = '<li class="list-group-item text-danger">Failed to load trip history.</li>';
    }
}


// --- Initial Setup ---

// Set up event listeners once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners to buttons
    addAddressButton.addEventListener('click', handleAddAddressClick);
    calculateMileageButton.addEventListener('click', handleCalculateMileageClick);
    saveTripButton.addEventListener('click', handleSaveTripClick);

    // *** NEW: Attach event listener to the trip history list using delegation ***
    tripHistoryList.addEventListener('click', handleTripHistoryItemClick);
    // *************************************************************************


    // Perform initial data fetches and rendering
    fetchAndDisplayAddressesWrapper();
    renderTripSequence(); // Render the empty sequence list initially
    fetchAndDisplayTripHistoryWrapper(); // Fetch and display trip history on load
});