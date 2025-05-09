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

// --- New Element References for UI Improvements ---
const clearTripSequenceButton = document.getElementById('clear-trip-sequence-button');
const addAddressErrorDiv = document.getElementById('add-address-error');
const fetchAddressesErrorDiv = document.getElementById('fetch-addresses-error');
const calculateMileageErrorDiv = document.getElementById('calculate-mileage-error');
const saveTripErrorDiv = document.getElementById('save-trip-error');
const fetchHistoryErrorDiv = document.getElementById('fetch-history-error');
// --------------------------------------------------


// --- State Variables ---
const REIMBURSEMENT_RATE_PER_MILE = 0.45;
let tripSequence = []; // Stores full address objects from DB for the CURRENT trip being planned
let savedTripHistory = []; // Store the array of fetched saved trip objects


// --- Utility Functions for UI Feedback ---
function showLoading(buttonElement, originalText = 'Submit') {
    buttonElement.disabled = true;
    // Add a simple spinner icon (requires Bootstrap Icons CSS)
    buttonElement.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ${originalText}...`;
}

function hideLoading(buttonElement, originalText) {
    buttonElement.disabled = false;
    buttonElement.textContent = originalText;
}

function displayError(errorElement, message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideError(errorElement) {
    errorElement.textContent = '';
    errorElement.style.display = 'none';
}


// --- API Interaction Functions ---

// Fetch all addresses from the backend
async function fetchAddresses() {
    console.log('Fetching addresses...');
    hideError(fetchAddressesErrorDiv);
    // No specific button to disable, maybe show a loading indicator on the list itself if needed later.
    // For now, just handle the error display.
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
        // display error using new function
        displayError(fetchAddressesErrorDiv, 'Failed to load addresses. Please try again.');
        throw error; // Let calling code handle UI error display
    }
}

// Post a new address to the backend
async function postAddress(addressText) {
    console.log('Posting address:', addressText);
    showLoading(addAddressButton, 'Add Address');
    hideError(addAddressErrorDiv);
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
        // Handle backend reported errors
        if (data.status !== 'success') {
             throw new Error(data.message || 'Unknown error saving address');
        }
        return data; // Return the response data (status, message)
    } catch (error) {
        console.error('Error posting address:', error);
        // display error using new function
        displayError(addAddressErrorDiv, `Error saving address: ${error.message}`);
        throw error;
    } finally {
        hideLoading(addAddressButton, 'Add Address');
    }
}

// Post a trip sequence for mileage calculation
async function postCalculateMileage(addressesArray) {
    console.log('Posting trip sequence for calculation:', addressesArray);
    showLoading(calculateMileageButton, 'Calculate Mileage');
    hideError(calculateMileageErrorDiv);
    saveTripButton.style.display = 'none'; // Hide save button while recalculating
    mileageResultsDiv.style.display = 'none'; // Hide results while recalculating

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

        // Handle backend reported errors (e.g., Google API failure)
         if (results.status !== 'success') {
             throw new Error(results.message || 'Mileage calculation failed');
         }

        if (results.totalDistance && Array.isArray(results.legDistances)) {
            return results;
        } else {
            console.error('Received unexpected calculation results format:', results);
            throw new Error('Unexpected calculation results format from server.');
        }

    } catch (error) {
        console.error('Error calculating mileage:', error);
         // display error using new function
        displayError(calculateMileageErrorDiv, `Mileage calculation failed: ${error.message}`);
        // Clear any old calculation results from state on error
         delete tripSequence.calculatedLegDistances;
         delete tripSequence.calculatedTotalDistanceMiles;
         delete tripSequence.calculatedTotalReimbursement;
        throw error;
    } finally {
        hideLoading(calculateMileageButton, 'Calculate Mileage');
    }
}

// Post a completed trip to be saved
async function postSaveTrip(tripData) { // tripData includes tripSequence, totalDistanceMiles, reimbursementAmount, legDistances, tripDatetime
    console.log('Posting trip to save:', tripData);
    showLoading(saveTripButton, 'Save Trip');
    hideError(saveTripErrorDiv);
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
         // Handle backend reported errors
         if (saveResult.status !== 'success') {
             throw new Error(saveResult.message || 'Unknown error saving trip');
         }
        return saveResult; // Return save result (status, message)
    } catch (error) {
        console.error('Error saving trip:', error);
        // display error using new function
        displayError(saveTripErrorDiv, `Error saving trip: ${error.message}`);
        throw error;
    } finally {
        hideLoading(saveTripButton, 'Save Trip');
    }
}

// Fetch trip history from the backend
async function fetchTripHistory() {
    console.log('Fetching trip history...');
    // Show loading state on the list itself (text "Loading trip history...") is handled in renderTripHistory
    hideError(fetchHistoryErrorDiv);
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
         // display error using new function
        displayError(fetchHistoryErrorDiv, 'Failed to load trip history. Please try again.');
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
        clearTripSequenceButton.style.display = 'none'; // Hide clear button when sequence is empty

    } else {
        tripSequence.forEach((address, index) => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center'); // Add flexbox classes for layout

            // Text content for the address
            const addressTextSpan = document.createElement('span');
            addressTextSpan.textContent = `${index + 1}. ${address.address_text}`;
            listItem.appendChild(addressTextSpan);

            // Remove button/icon
            const removeButton = document.createElement('button');
            removeButton.classList.add('btn', 'btn-outline-danger', 'btn-sm', 'ms-2'); // Bootstrap button classes
            removeButton.innerHTML = '<i class="bi bi-x-circle"></i>'; // Bootstrap Icon 'x-circle'
            removeButton.title = 'Remove address from sequence';
            removeButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent the list item click event from firing
                removeAddressFromTripSequence(index);
            });
            listItem.appendChild(removeButton);

            tripSequenceList.appendChild(listItem);
        });

        calculateMileageButton.style.display = 'block';
        // Only show clear button if there are items in the sequence
        clearTripSequenceButton.style.display = 'block';

        // Keep mileage results and save button hidden until calculation is done after sequence changes
        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none';
        hideError(calculateMileageErrorDiv); // Clear calculation errors when sequence changes
         // Clear temporary calculation results from state when sequence changes
         delete tripSequence.calculatedLegDistances;
         delete tripSequence.calculatedTotalDistanceMiles;
         delete tripSequence.calculatedTotalReimbursement;
    }

    // Disable calculate button if less than 2 addresses
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

             const startAddressText = sequenceAddresses[i] ? sequenceAddresses[i].address_text : `Stop ${i + 1}`;
             const endAddressText = sequenceAddresses[i + 1] ? sequenceAddresses[i + 1].address_text : `Stop ${i + 2}`;

            legItem.textContent = `Leg ${i + 1}: ${startAddressText} to ${endAddressText} - ${legDistancesArray[i]}`;

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

     // Populate basic details (Date, Total Distance, Reimbursement)
     if (detailTripDateSpan) {
         const tripTimestamp = trip.trip_datetime ? new Date(trip.trip_datetime) : new Date(trip.created_at);
         const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
         const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
         const formattedDate = tripTimestamp.toLocaleDateString('en-GB', dateOptions);
         const formattedTime = tripTimestamp.toLocaleTimeString('en-GB', timeOptions);
         detailTripDateSpan.textContent = `${formattedDate} ${formattedTime}`;
     } else {
          console.error('detailTripDateSpan element not found.');
     }


     if (detailTotalDistanceSpan) {
         detailTotalDistanceSpan.textContent = `${trip.total_distance_miles.toFixed(2)} miles`;
     } else {
          console.error('detailTotalDistanceSpan element not found.');
     }


     if (detailReimbursementSpan) {
         detailReimbursementSpan.textContent = `£${trip.reimbursement_amount.toFixed(2)}`;
     } else {
         console.error('detailReimbursementSpan element not found.');
     }


     // Populate Trip Sequence
     const detailTripSequenceList = document.getElementById('detail-trip-sequence');
      if (detailTripSequenceList) { // Add check for the element
         detailTripSequenceList.innerHTML = ''; // Clear previous sequence items

         if (!trip.trip_data || !Array.isArray(trip.trip_data) || trip.trip_data.length === 0) {
             const listItem = document.createElement('li');
             listItem.classList.add('list-group-item', 'text-muted');
             listItem.textContent = 'Sequence data not available.';
             detailTripSequenceList.appendChild(listItem);
         } else {
              trip.trip_data.forEach((address, index) => {
                 const listItem = document.createElement('li');
                 listItem.classList.add('list-group-item'); // Add Bootstrap list item class
                 const addressText = address && address.address_text ? address.address_text : 'Unknown Address'; // Safe access
                 listItem.textContent = `${index + 1}. ${addressText}`;
                 detailTripSequenceList.appendChild(listItem);
             });
         }
     } else {
         console.error('detailTripSequenceList element not found in modal.');
     }


     // Populate Trip Legs with distances
     const modalTripLegsHeading = tripDetailsModalElement.querySelector('#tripDetailsModal .modal-body h6:last-of-type');
     if (modalTripLegsHeading) {
         modalTripLegsHeading.textContent = 'Mileage Between Stops:';
     }

      const detailTripLegsListElement = document.getElementById('detail-trip-legs');

     if (detailTripLegsListElement) { // Add check for the element
         detailTripLegsListElement.innerHTML = ''; // Clear previous legs

         if (!trip.leg_distances || !Array.isArray(trip.leg_distances) || trip.leg_distances.length === 0) {
              const listItem = document.createElement('li');
              listItem.classList.add('list-group-item', 'text-muted');
              listItem.textContent = 'No mileage between stops available.'; // Placeholder text
              detailTripLegsListElement.appendChild(listItem);

         } else {
              trip.leg_distances.forEach((legDistanceText, index) => {
                  const listItem = document.createElement('li');
                  listItem.classList.add('list-group-item');

                  // Get start and end addresses from the saved trip.trip_data sequence
                  const startAddressText = trip.trip_data && trip.trip_data[index] ? trip.trip_data[index].address_text : 'Start';
                  const endAddressText = trip.trip_data && trip.trip_data[index + 1] ? trip.trip_data[index + 1].address_text : 'End';

                  listItem.textContent = `Leg ${index + 1}: ${startAddressText} to ${endAddressText} - ${legDistanceText}`;
                  detailTripLegsListElement.appendChild(listItem);
              });
         }
     } else {
          console.error('detailTripLegsList element not found in modal.');
     }
}




// --- State Management Functions ---

// Function to add an address object to the trip sequence state
function addAddressToTripSequence(address) {
    tripSequence.push(address);
    console.log('Trip sequence updated:', tripSequence);
    renderTripSequence();
}

// Function to remove an address from the trip sequence state
function removeAddressFromTripSequence(index) {
    if (index >= 0 && index < tripSequence.length) {
        tripSequence.splice(index, 1);
        console.log('Address removed from sequence. Updated sequence:', tripSequence);
        renderTripSequence(); // Re-render the sequence list
    }
}

// Function to clear the entire trip sequence
function clearTripSequence() {
    if (tripSequence.length > 0) {
        tripSequence = []; // Empty the array
        console.log('Trip sequence cleared.');
        // Clear date and time inputs as well
        tripDateInput.value = '';
        tripTimeInput.value = '';
        renderTripSequence(); // Re-render the now empty sequence list
    }
}


// --- Event Handlers (Orchestrators) ---

// Handle click on Add Address button
async function handleAddAddressClick() {
    const address = addressInput.value.trim();
    hideError(addAddressErrorDiv); // Clear previous errors

    if (!address) {
        displayError(addAddressErrorDiv, 'Address cannot be empty.');
        console.log('Address input is empty.');
        return;
    }

    try {
        const result = await postAddress(address);
        // postAddress function now throws on backend errors, so we only handle success here
        alert('Address saved successfully!'); // Use a better UI element for success later
        addressInput.value = '';
        fetchAndDisplayAddressesWrapper();

    } catch (error) {
        // Error handled and displayed in postAddress, just log here if needed
        console.error('Handler caught error from postAddress:', error);
    }
}

// Handle click on Calculate Mileage button
async function handleCalculateMileageClick() {
    hideError(calculateMileageErrorDiv); // Clear previous errors

    if (tripSequence.length < 2) {
        displayError(calculateMileageErrorDiv, 'Please add at least two addresses to calculate mileage.');
        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none';
        return;
    }

    const tripAddressTexts = tripSequence.map(address => address.address_text);

    try {
        const results = await postCalculateMileage(tripAddressTexts);

        // Store the calculation results on the tripSequence array temporarily
        const totalDistanceMilesMatch = results.totalDistance.match(/([\d.]+)\s*miles/);
        let totalDistanceInMiles = 0;
        if (totalDistanceMilesMatch && totalDistanceMilesMatch[1]) {
            totalDistanceInMiles = parseFloat(totalDistanceMilesMatch[1]);
        }
        const potentialReimbursement = totalDistanceInMiles * REIMBURSEMENT_RATE_PER_MILE;
        tripSequence.calculatedTotalDistanceMiles = totalDistanceInMiles; // Store numerical total distance
        tripSequence.calculatedTotalReimbursement = potentialReimbursement; // Store calculated reimbursement
        tripSequence.calculatedLegDistances = results.legDistances; // Store leg distances array

        renderMileageResults(results.totalDistance, tripSequence.calculatedTotalReimbursement, results.legDistances, tripSequence);


    } catch (error) {
        // Error handled and displayed in postCalculateMileage, just log here if needed
        console.error('Handler caught error from postCalculateMileage:', error);
         // Ensure results area is hidden on error
         mileageResultsDiv.style.display = 'none';
         saveTripButton.style.display = 'none';
    }
}


// Handle click on Save Trip button
async function handleSaveTripClick() {
    hideError(saveTripErrorDiv); // Clear previous errors

    // Ensure there's a calculated trip to save and results are present in state
    if (tripSequence.length < 2 ||
        !tripSequence.hasOwnProperty('calculatedTotalDistanceMiles') ||
        !tripSequence.hasOwnProperty('calculatedTotalReimbursement') ||
        !tripSequence.hasOwnProperty('calculatedLegDistances')
    ) {
        displayError(saveTripErrorDiv, 'No valid trip calculation available to save.');
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
        tripDatetime: tripDatetimeString // ADD the combined datetime string here
    };

    console.log('Attempting to save trip:', tripDataToSave);

    try {
        const saveResult = await postSaveTrip(tripDataToSave);

        // postSaveTrip function now throws on backend errors, so we only handle success here
        alert('Trip saved successfully!'); // Use a better UI element for success later
        // Clear the current trip state and UI after saving
        tripSequence = [];
        // Clear temporary calculation results from state
        delete tripSequence.calculatedLegDistances;
        delete tripSequence.calculatedTotalDistanceMiles;
        delete tripSequence.calculatedTotalReimbursement;

        // Clear date and time inputs after saving
        tripDateInput.value = '';
        tripTimeInput.value = '';

        renderTripSequence(); // This will also hide mileage results and save button
        // Refresh the history list after saving a new trip
        fetchAndDisplayTripHistoryWrapper();

    } catch (error) {
        // Error handled and displayed in postSaveTrip, just log here if needed
        console.error('Handler caught error from postSaveTrip:', error);
    }
}

// Handle click on Trip History list items
function handleTripHistoryItemClick(event) {
    const targetItem = event.target.closest('.list-group-item');

    if (targetItem && targetItem.dataset.tripId) {
        // Clear any previous history fetch error
         hideError(fetchHistoryErrorDiv);

        const clickedTripId = parseInt(targetItem.dataset.tripId, 10); // Ensure ID is a number for comparison
        console.log('History item clicked, trip ID:', clickedTripId, 'Type:', typeof clickedTripId);

        const selectedTrip = savedTripHistory.find(trip => trip.id === clickedTripId); // Compare numbers

        if (selectedTrip) {
            console.log('Found trip details:', selectedTrip);
            renderTripDetailsModal(selectedTrip);

            if (tripDetailsModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                const tripDetailsModal = new bootstrap.Modal(tripDetailsModalElement);
                tripDetailsModal.show();
            } else {
                console.error('Modal element or Bootstrap JS not found.');
                // Fallback to simple alert or display error differently
                alert('Error displaying trip details modal.');
            }

        } else {
            console.error('Could not find trip with ID:', clickedTripId, 'in savedTripHistory.');
            // Display error if trip data isn't found in the cached state
            displayError(fetchHistoryErrorDiv, 'Could not load details for this trip.');
        }
    }
}


// --- Initialization and Wrapper Functions ---

// Wrapper function to fetch addresses and render them
async function fetchAndDisplayAddressesWrapper() {
    hideError(fetchAddressesErrorDiv); // Clear error before fetch
    try {
        const addresses = await fetchAddresses();
        renderAddresses(addresses);
    } catch (error) {
        console.error("Failed to initialize addresses in wrapper:", error);
        // Error displayed in fetchAddresses, nothing else needed here
    }
}

// Wrapper function to fetch trip history and render it
async function fetchAndDisplayTripHistoryWrapper() {
    // Show loading state before fetching (handled in renderTripHistory initial call)
    hideError(fetchHistoryErrorDiv); // Clear error before fetch
    tripHistoryList.innerHTML = '<li class="list-group-item text-muted">Loading trip history...</li>'; // Show loading text immediately
    try {
        const trips = await fetchTripHistory();
        savedTripHistory = trips;

        renderTripHistory(savedTripHistory);
    } catch (error) {
        console.error("Failed to initialize trip history in wrapper:", error);
         // Error displayed in fetchTripHistory, nothing else needed here
         // The list will show the error message added in fetchTripHistory
    }
}


// --- Initial Setup ---

document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners to buttons
    addAddressButton.addEventListener('click', handleAddAddressClick);
    calculateMileageButton.addEventListener('click', handleCalculateMileageClick);
    saveTripButton.addEventListener('click', handleSaveTripClick);
    clearTripSequenceButton.addEventListener('click', clearTripSequence); // Attach listener for the clear button

    // Attach event listener to the trip history list using delegation
    tripHistoryList.addEventListener('click', handleTripHistoryItemClick);


    // Perform initial data fetches and rendering
    fetchAndDisplayAddressesWrapper();
    renderTripSequence(); // Initial render to show placeholder
    fetchAndDisplayTripHistoryWrapper();

    // Optional: Set default date to today in the input field
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const dd = String(today.getDate()).padStart(2, '0');
    tripDateInput.value = `${yyyy}-${mm}-${dd}`;
});