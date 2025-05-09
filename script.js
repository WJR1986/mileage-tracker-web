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

// --- New Element References for Date/Time Inputs ---
const tripDateInput = document.getElementById('trip-date-input');
const tripTimeInput = document.getElementById('trip-time-input');
// -------------------------------------------------

// --- Element References for Modal ---
const tripDetailsModalElement = document.getElementById('tripDetailsModal');
const detailTripDateSpan = document.getElementById('detail-trip-date');
const detailTotalDistanceSpan = document.getElementById('detail-total-distance');
const detailReimbursementSpan = document.getElementById('detail-reimbursement');
const detailTripSequenceList = document.getElementById('detail-trip-sequence');
const detailTripLegsList = document.getElementById('detail-trip-legs');
// ----------------------------------------


// --- State Variables ---
const REIMBURSEMENT_RATE_PER_MILE = 0.45;
let tripSequence = []; // Stores full address objects from DB for the CURRENT trip being planned
let savedTripHistory = []; // Store the array of fetched saved trip objects


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
        if (results.status === 'success' && results.totalDistance && Array.isArray(results.legDistances)) {
            return results;
        } else {
            console.error('Received unexpected calculation results format:', results);
            throw new Error('Unexpected calculation results format from server.');
        }

    } catch (error) {
        console.error('Error calculating mileage:', error);
        throw error;
    }
}

// Post a completed trip to be saved
async function postSaveTrip(tripData) { // tripData includes tripSequence, totalDistanceMiles, reimbursementAmount, legDistances, tripDatetime
    console.log('Posting trip to save:', tripData);
    saveTripButton.disabled = true;
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
        console.log('Fetched trip history (raw):', trips);
        return trips; // Return array of trip objects (should now include leg_distances and trip_datetime)
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
function renderMileageResults(totalDistanceText, reimbursementAmount, legDistancesArray, sequenceAddresses) {
    // *** Add number of stops clarification ***
    const numberOfStops = sequenceAddresses.length;
    totalDistancePara.textContent = `Total Distance (${numberOfStops} Stops): ${totalDistanceText}`;
    // *****************************************

    const formattedReimbursement = `£${reimbursementAmount.toFixed(2)}`;
    potentialReimbursementPara.textContent = `Potential Reimbursement: ${formattedReimbursement}`;

    const tripLegsHeading = mileageResultsDiv.querySelector('h4');
    if (tripLegsHeading) {
        tripLegsHeading.textContent = 'Mileage Between Stops:';
    }

    tripLegsList.innerHTML = '';
    if (!legDistancesArray || legDistancesArray.length === 0) {
        const listItem = document.createElement('li');
        listItem.classList.add('list-group-item', 'text-muted');
        listItem.textContent = 'No mileage between stops available.';
        tripLegsList.appendChild(listItem);
    } else {
        // Loop through the received leg distances array (should have N-1 elements for N addresses)
        for (let i = 0; i < legDistancesArray.length; i++) {
            const legItem = document.createElement('li');
            legItem.classList.add('list-group-item');

            // *** Refine leg display text for clarity ***
            // Use Stop X to Stop Y numbering corresponding to the sequence list
            const startStopNumber = i + 1;
            const endStopNumber = i + 2;
            const startAddressText = sequenceAddresses[i] ? sequenceAddresses[i].address_text : `Stop ${startStopNumber}`;
            const endAddressText = sequenceAddresses[i + 1] ? sequenceAddresses[i + 1].address_text : `Stop ${endStopNumber}`;

            legItem.textContent = `Stop ${startStopNumber} to Stop ${endStopNumber}: ${legDistancesArray[i]}`;
            // Optionally include addresses: `Stop ${startStopNumber} (${startAddressText}) to Stop ${endStopNumber} (${endAddressText}): ${legDistancesArray[i]}`
            // Let's keep it concise with just stop numbers unless needed
            // For now, the addresses are already in the sequence list above. Let's just use stop numbers in the leg item text.
            // If the user clicks the list item for the leg, they see the modal with full sequence.
            // Let's revert to including addresses for clarity, as the previous image showed this and it seemed helpful.
            legItem.textContent = `Leg ${i + 1}: ${startAddressText} to ${endAddressText} - ${legDistancesArray[i]}`;
            // *******************************************

            tripLegsList.appendChild(legItem);
        }
    }

    mileageResultsDiv.style.display = 'block';
    saveTripButton.style.display = 'block';
}


// Render the trip history list items
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
            listItem.classList.add('list-group-item', 'list-group-item-action');
            listItem.style.cursor = 'pointer';

            listItem.dataset.tripId = trip.id;

            // --- UPDATE: Use trip.trip_datetime if available, otherwise use trip.created_at ---
            const tripTimestamp = trip.trip_datetime ? new Date(trip.trip_datetime) : new Date(trip.created_at);
            const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
            const formattedDate = tripTimestamp.toLocaleDateString('en-GB', dateOptions);
            const formattedTime = tripTimestamp.toLocaleTimeString('en-GB', timeOptions);
            const formattedDateTime = `${formattedDate} ${formattedTime}`;
            // -----------------------------------------------------------------------------------

            listItem.innerHTML = `
                <strong>Trip on ${formattedDateTime}</strong><br>
                Distance: ${trip.total_distance_miles.toFixed(2)} miles<br>
                Reimbursement: £${trip.reimbursement_amount.toFixed(2)}
            `;

            tripHistoryList.appendChild(listItem);
        });
    }
}

// Render detailed trip information in the modal
function renderTripDetailsModal(trip) {
    if (!trip) {
        console.error('No trip data provided to render modal.');
        return;
    }

    // --- UPDATE: Use trip.trip_datetime if available, otherwise use trip.created_at ---
    const tripTimestamp = trip.trip_datetime ? new Date(trip.trip_datetime) : new Date(trip.created_at);
    const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    const formattedDate = tripTimestamp.toLocaleDateString('en-GB', dateOptions);
    const formattedTime = tripTimestamp.toLocaleTimeString('en-GB', timeOptions);
    detailTripDateSpan.textContent = `${formattedDate} ${formattedTime}`;
    // -----------------------------------------------------------------------------------

    detailTotalDistanceSpan.textContent = `${trip.total_distance_miles.toFixed(2)} miles`;
    detailReimbursementSpan.textContent = `£${trip.reimbursement_amount.toFixed(2)}`;

    // Populate Trip Legs with distances
    const modalTripLegsHeading = tripDetailsModalElement.querySelector('#tripDetailsModal .modal-body h6:last-of-type');
    if (modalTripLegsHeading) {
        modalTripLegsHeading.textContent = 'Mileage Between Stops:';
    }

     // Populate Trip Sequence
     detailTripSequenceList.innerHTML = ''; // Clear previous sequence items

     // *** NEW LOGGING: Inspect trip.trip_data before attempting to render sequence ***
     console.log('Rendering modal trip sequence. Trip data:', trip.trip_data);
     console.log('Type of trip.trip_data:', typeof trip.trip_data);
     console.log('Is trip.trip_data an Array:', Array.isArray(trip.trip_data));
     console.log('Number of elements in trip.trip_data:', trip.trip_data ? trip.trip_data.length : 'N/A');
     // ******************************************************************************


     if (!trip.trip_data || !Array.isArray(trip.trip_data) || trip.trip_data.length === 0) {
         // If trip_data is missing, not an array, or empty, display a placeholder
         console.log('Trip data for sequence is empty or invalid. Displaying placeholder.');
         const listItem = document.createElement('li');
         listItem.classList.add('list-group-item', 'text-muted');
         listItem.textContent = 'Sequence data not available.';
         detailTripSequenceList.appendChild(listItem);
     } else {
         // If trip_data exists and is a non-empty array, loop through it
         console.log(`Attempting to render ${trip.trip_data.length} addresses for modal sequence.`);
         trip.trip_data.forEach((address, index) => {
             // *** NEW LOGGING: Log each address being processed within the loop ***
             console.log(`Processing address ${index} for modal sequence:`, address);
             // ********************************************************************

             const listItem = document.createElement('li');
             listItem.classList.add('list-group-item'); // Add Bootstrap list item class
             // Display the address number and the address text
             const addressText = address && address.address_text ? address.address_text : 'Unknown Address'; // Safe access
             listItem.textContent = `${index + 1}. ${addressText}`;
             detailTripSequenceList.appendChild(listItem); // Append the list item to the modal's sequence list

             console.log(`Appended list item for address ${index} to modal sequence list.`);
         });
         console.log('Finished processing addresses for modal sequence.');
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
        const results = await postCalculateMileage(tripAddressTexts);

        // *** NEW LOGGING: Inspect the results received from the backend ***
        console.log('Results received from postCalculateMileage:', results);
        console.log('Type of results.legDistances:', typeof results.legDistances);
        console.log('Is results.legDistances an Array:', Array.isArray(results.legDistances));
        console.log('Contents of results.legDistances:', results.legDistances);
        console.log('Number of elements in results.legDistances:', results.legDistances ? results.legDistances.length : 'N/A');
        // ************************************************************


        // Store the legDistances from the calculation results
        tripSequence.calculatedLegDistances = results.legDistances;

        // *** FIX: Calculate and store reimbursement BEFORE rendering ***
         const totalDistanceMilesMatch = results.totalDistance.match(/([\d.]+)\s*miles/);
         let totalDistanceInMiles = 0;
         if (totalDistanceMilesMatch && totalDistanceMilesMatch[1]) {
             totalDistanceInMiles = parseFloat(totalDistanceMilesMatch[1]);
         }
         const potentialReimbursement = totalDistanceInMiles * REIMBURSEMENT_RATE_PER_MILE;
         tripSequence.calculatedTotalDistanceMiles = totalDistanceInMiles; // Store numerical total distance
         tripSequence.calculatedTotalReimbursement = potentialReimbursement; // Store calculated reimbursement
        // *************************************************************


        // renderMileageResults is called HERE, NOW with the correct calculated value
        // Pass the totalDistance (text), calculated reimbursement (number), legDistances (array), and tripSequence (array)
        renderMileageResults(results.totalDistance, tripSequence.calculatedTotalReimbursement, results.legDistances, tripSequence);


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
        !tripSequence.hasOwnProperty('calculatedTotalDistanceMiles') ||
        !tripSequence.hasOwnProperty('calculatedTotalReimbursement') ||
        !tripSequence.hasOwnProperty('calculatedLegDistances')
    ) {
        alert('No valid trip calculation available to save.');
        return;
    }

    // Get date and time values from inputs
    const tripDateValue = tripDateInput.value; // YYYY-MM-DD string or empty string
    const tripTimeValue = tripTimeInput.value; // HH:mm string or empty string

    let tripDatetimeString = null;

    // Combine date and time if both are provided
    if (tripDateValue && tripTimeValue) {
        // Format as ISO 8601: YYYY-MM-DDTHH:mm:ss (add :00 for seconds)
        tripDatetimeString = `${tripDateValue}T${tripTimeValue}:00`;
    } else if (tripDateValue) {
        // If only date is provided, use start of day
        tripDatetimeString = `${tripDateValue}T00:00:00`;
    }
    // If only time or neither is provided, tripDatetimeString remains null

    console.log('User specified date:', tripDateValue, 'time:', tripTimeValue, 'Combined datetime string:', tripDatetimeString);


    const tripDataToSave = {
        tripSequence: tripSequence.map(addr => ({ // Send only necessary address properties
            id: addr.id,
            address_text: addr.address_text,
        })),
        totalDistanceMiles: tripSequence.calculatedTotalDistanceMiles,
        reimbursementAmount: tripSequence.calculatedTotalReimbursement,
        legDistances: tripSequence.calculatedLegDistances,
        tripDatetime: tripDatetimeString // *** ADD the combined datetime string here ***
    };

    console.log('Attempting to save trip:', tripDataToSave);

    try {
        const saveResult = await postSaveTrip(tripDataToSave);

        if (saveResult.status === 'success') {
            alert('Trip saved successfully!');
            // Clear the current trip state and UI after saving
            tripSequence = [];
            delete tripSequence.calculatedLegDistances;
            delete tripSequence.calculatedTotalDistanceMiles;
            delete tripSequence.calculatedTotalReimbursement;

            // Clear date and time inputs after saving
            tripDateInput.value = '';
            tripTimeInput.value = '';

            renderTripSequence();
            // Refresh the history list after saving a new trip
            fetchAndDisplayTripHistoryWrapper();

        } else {
            alert('Error saving trip: ' + (saveResult.message || 'An unknown error occurred'));
        }

    } catch (error) {
        alert('An error occurred while saving the trip: ' + error.message);
    }
}

// Handle click on Trip History list items
function handleTripHistoryItemClick(event) {
    const targetItem = event.target.closest('.list-group-item');

    if (targetItem && targetItem.dataset.tripId) {
        const clickedTripId = targetItem.dataset.tripId;
        console.log('History item clicked, trip ID:', clickedTripId, 'Type:', typeof clickedTripId);

        console.log('Current state of savedTripHistory when item clicked:', savedTripHistory);
        if (savedTripHistory.length > 0) {
            console.log('Type of ID in first item of savedTripHistory:', typeof savedTripHistory[0].id);
        } else {
            console.log('savedTripHistory is empty when item clicked.');
        }

        const selectedTrip = savedTripHistory.find(trip => trip.id === parseInt(clickedTripId, 10));

        if (selectedTrip) {
            console.log('Found trip details:', selectedTrip);
            renderTripDetailsModal(selectedTrip);

            if (tripDetailsModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                const tripDetailsModal = new bootstrap.Modal(tripDetailsModalElement);
                tripDetailsModal.show();
            } else {
                console.error('Modal element or Bootstrap JS not found.');
                alert('Error displaying trip details modal.');
            }

        } else {
            console.error('Could not find trip with ID:', clickedTripId, 'in savedTripHistory.');
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
        addressList.innerHTML = '<li class="list-group-item text-danger">Failed to load addresses.</li>';
    }
}

// Wrapper function to fetch trip history and render it
async function fetchAndDisplayTripHistoryWrapper() {
    // Show loading state before fetching
    tripHistoryList.innerHTML = '<li class="list-group-item text-muted">Loading trip history...</li>';
    try {
        const trips = await fetchTripHistory();
        savedTripHistory = trips;

        renderTripHistory(savedTripHistory);
    } catch (error) {
        console.error("Failed to initialize trip history:", error);
        tripHistoryList.innerHTML = '<li class="list-group-item text-danger">Failed to load trip history.</li>';
    }
}


// --- Initial Setup ---

document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners to buttons
    addAddressButton.addEventListener('click', handleAddAddressClick);
    calculateMileageButton.addEventListener('click', handleCalculateMileageClick);
    saveTripButton.addEventListener('click', handleSaveTripClick);

    // Attach event listener to the trip history list using delegation
    tripHistoryList.addEventListener('click', handleTripHistoryItemClick);


    // Perform initial data fetches and rendering
    fetchAndDisplayAddressesWrapper();
    renderTripSequence();
    fetchAndDisplayTripHistoryWrapper();

    // Optional: Set default date to today in the input field
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const dd = String(today.getDate()).padStart(2, '0');
    tripDateInput.value = `${yyyy}-${mm}-${dd}`;
});