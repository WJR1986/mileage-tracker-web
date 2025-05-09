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
        displayError(fetchAddressesErrorDiv, 'Failed to load addresses. Please try again.');
        throw error;
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
        if (data.status !== 'success') {
             throw new Error(data.message || 'Unknown error saving address');
        }
        return data;
    } catch (error) {
        console.error('Error posting address:', error);
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
    saveTripButton.style.display = 'none';
    mileageResultsDiv.style.display = 'none';

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
        displayError(calculateMileageErrorDiv, `Mileage calculation failed: ${error.message}`);
         delete tripSequence.calculatedLegDistances;
         delete tripSequence.calculatedTotalDistanceMiles;
         delete tripSequence.calculatedTotalReimbursement;
        throw error;
    } finally {
        hideLoading(calculateMileageButton, 'Calculate Mileage');
    }
}

// Post a completed trip to be saved
async function postSaveTrip(tripData) {
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
         if (saveResult.status !== 'success') {
             throw new Error(saveResult.message || 'Unknown error saving trip');
         }
        return saveResult;
    } catch (error) {
        console.error('Error saving trip:', error);
        displayError(saveTripErrorDiv, `Error saving trip: ${error.message}`);
        throw error;
    } finally {
        hideLoading(saveTripButton, 'Save Trip');
    }
}

// Send a DELETE request to delete a trip by ID
async function deleteTrip(tripId) {
     console.log('Attempting to delete trip with ID:', tripId);
     hideError(fetchHistoryErrorDiv); // Clear history errors before attempting delete

     // We can't disable a specific history item button easily with delegation
     // Consider adding a modal or disabling the whole history list during delete if needed later.
     // For now, rely on the fetchAndDisplayTripHistoryWrapper refresh.

    try {
        const response = await fetch('/.netlify/functions/save-trip', { // Use the same save-trip function
            method: 'DELETE', // Use DELETE method
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tripId }) // Send the ID in the body
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }
        const deleteResult = await response.json();
        console.log('Delete trip response:', deleteResult);

        if (deleteResult.status !== 'success') {
             throw new Error(deleteResult.message || 'Unknown error deleting trip');
         }

        return deleteResult; // Return the result (status, message)
    } catch (error) {
        console.error('Error deleting trip:', error);
         displayError(fetchHistoryErrorDiv, `Error deleting trip: ${error.message}`);
        throw error;
    }
}


// Fetch trip history from the backend
async function fetchTripHistory() {
    console.log('Fetching trip history...');
    hideError(fetchHistoryErrorDiv);
    tripHistoryList.innerHTML = '<li class="list-group-item text-muted">Loading trip history...</li>';
    try {
        const response = await fetch('/.netlify/functions/save-trip', { method: 'GET' });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }
        const trips = await response.json();
        console.log('Fetched trip history (raw):', trips);
        return trips;
    } catch (error) {
        console.error('Error fetching trip history:', error);
        displayError(fetchHistoryErrorDiv, 'Failed to load trip history. Please try again.');
        tripHistoryList.innerHTML = ''; // Clear loading text on error
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
        clearTripSequenceButton.style.display = 'none';

    } else {
        tripSequence.forEach((address, index) => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');

            const addressTextSpan = document.createElement('span');
            addressTextSpan.textContent = `${index + 1}. ${address.address_text}`;
            listItem.appendChild(addressTextSpan);

            const removeButton = document.createElement('button');
            removeButton.classList.add('btn', 'btn-outline-danger', 'btn-sm', 'ms-2');
            removeButton.innerHTML = '<i class="bi bi-x-circle"></i>';
            removeButton.title = 'Remove address from sequence';
            removeButton.addEventListener('click', (event) => {
                event.stopPropagation();
                removeAddressFromTripSequence(index);
            });
            listItem.appendChild(removeButton);

            tripSequenceList.appendChild(listItem);
        });

        calculateMileageButton.style.display = 'block';
        clearTripSequenceButton.style.display = 'block';

        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none';
        hideError(calculateMileageErrorDiv);
         delete tripSequence.calculatedLegDistances;
         delete tripSequence.calculatedTotalDistanceMiles;
         delete tripSequence.calculatedTotalReimbursement;
    }

    calculateMileageButton.disabled = tripSequence.length < 2;
}

// Render the mileage calculation results for the CURRENT trip
function renderMileageResults(totalDistanceText, reimbursementAmount, legDistancesArray, sequenceAddresses) {
    const numberOfStops = sequenceAddresses.length;
    totalDistancePara.textContent = `Total Distance (${numberOfStops} Stops): ${totalDistanceText}`;

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
            // Use d-flex and justify-content-between for spacing between content and buttons
            listItem.classList.add('list-group-item', 'list-group-item-action', 'd-flex', 'justify-content-between', 'align-items-center');
            listItem.style.cursor = 'pointer';

            // Create a div for the trip details content (date, distance, reimbursement)
            const tripDetailsContent = document.createElement('div');
            tripDetailsContent.dataset.tripId = trip.id; // Add data-tripId to this div for delegation

            const tripTimestamp = trip.trip_datetime ? new Date(trip.trip_datetime) : new Date(trip.created_at);
            const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
            const formattedDate = tripTimestamp.toLocaleDateString('en-GB', dateOptions);
            const formattedTime = tripTimestamp.toLocaleTimeString('en-GB', timeOptions);
            const formattedDateTime = `${formattedDate} ${formattedTime}`;

            tripDetailsContent.innerHTML = `
                <strong>Trip on ${formattedDateTime}</strong><br>
                Distance: ${trip.total_distance_miles.toFixed(2)} miles<br>
                Reimbursement: £${trip.reimbursement_amount.toFixed(2)}
            `;
            listItem.appendChild(tripDetailsContent); // Append content div to list item

            // Container for action buttons (Delete)
            const actionButtons = document.createElement('div');

            // Add Delete Button
            const deleteButton = document.createElement('button');
            deleteButton.classList.add('btn', 'btn-outline-danger', 'btn-sm');
            deleteButton.innerHTML = '<i class="bi bi-trash"></i>'; // Bootstrap Icon 'trash'
            deleteButton.title = 'Delete trip';
            deleteButton.dataset.tripId = trip.id; // Store trip ID on the button
            deleteButton.addEventListener('click', (event) => {
                 event.stopPropagation(); // Prevent the list item click event
                 const tripIdToDelete = parseInt(event.currentTarget.dataset.tripId, 10);
                 if (confirm('Are you sure you want to delete this trip?')) { // Confirmation prompt
                     handleDeleteTrip(tripIdToDelete);
                 }
            });
            actionButtons.appendChild(deleteButton); // Append delete button to action button container

            // Add Edit Button (Placeholder for future)
            /*
            const editButton = document.createElement('button');
            editButton.classList.add('btn', 'btn-outline-secondary', 'btn-sm', 'ms-2');
            editButton.innerHTML = '<i class="bi bi-pencil"></i>'; // Bootstrap Icon 'pencil'
            editButton.title = 'Edit trip';
            editButton.dataset.tripId = trip.id;
            editButton.addEventListener('click', (event) => {
                 event.stopPropagation(); // Prevent the list item click event
                 // Handle edit logic here
                 const tripIdToEdit = parseInt(event.currentTarget.dataset.tripId, 10);
                 console.log('Edit button clicked for trip ID:', tripIdToEdit);
                 // TODO: Implement edit functionality
            });
            actionButtons.appendChild(editButton); // Append edit button
            */

            listItem.appendChild(actionButtons); // Append action button container to list item


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
      if (detailTripSequenceList) {
         detailTripSequenceList.innerHTML = '';

         if (!trip.trip_data || !Array.isArray(trip.trip_data) || trip.trip_data.length === 0) {
             const listItem = document.createElement('li');
             listItem.classList.add('list-group-item', 'text-muted');
             listItem.textContent = 'Sequence data not available.';
             detailTripSequenceList.appendChild(listItem);
         } else {
              trip.trip_data.forEach((address, index) => {
                 const listItem = document.createElement('li');
                 listItem.classList.add('list-group-item');
                 const addressText = address && address.address_text ? address.address_text : 'Unknown Address';
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

     if (detailTripLegsListElement) {
         detailTripLegsListElement.innerHTML = '';

         if (!trip.leg_distances || !Array.isArray(trip.leg_distances) || trip.leg_distances.length === 0) {
              const listItem = document.createElement('li');
              listItem.classList.add('list-group-item', 'text-muted');
              listItem.textContent = 'No mileage between stops available.';
              detailTripLegsListElement.appendChild(listItem);

         } else {
              trip.leg_distances.forEach((legDistanceText, index) => {
                  const listItem = document.createElement('li');
                  listItem.classList.add('list-group-item');

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
        renderTripSequence();
    }
}

// Function to clear the entire trip sequence
function clearTripSequence() {
    if (tripSequence.length > 0) {
        tripSequence = [];
        console.log('Trip sequence cleared.');
        tripDateInput.value = '';
        tripTimeInput.value = '';
        renderTripSequence();
    }
}


// --- Event Handlers (Orchestrators) ---

// Handle click on Add Address button
async function handleAddAddressClick() {
    const address = addressInput.value.trim();
    hideError(addAddressErrorDiv);

    if (!address) {
        displayError(addAddressErrorDiv, 'Address cannot be empty.');
        console.log('Address input is empty.');
        return;
    }

    try {
        await postAddress(address);
        alert('Address saved successfully!'); // Use a better UI element for success later
        addressInput.value = '';
        fetchAndDisplayAddressesWrapper();

    } catch (error) {
        console.error('Handler caught error from postAddress:', error);
    }
}

// Handle click on Calculate Mileage button
async function handleCalculateMileageClick() {
    hideError(calculateMileageErrorDiv);

    if (tripSequence.length < 2) {
        displayError(calculateMileageErrorDiv, 'Please add at least two addresses to calculate mileage.');
        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none';
        return;
    }

    const tripAddressTexts = tripSequence.map(address => address.address_text);

    try {
        const results = await postCalculateMileage(tripAddressTexts);

        const totalDistanceMilesMatch = results.totalDistance.match(/([\d.]+)\s*miles/);
        let totalDistanceInMiles = 0;
        if (totalDistanceMilesMatch && totalDistanceMilesMatch[1]) {
            totalDistanceInMiles = parseFloat(totalDistanceMilesMatch[1]);
        }
        const potentialReimbursement = totalDistanceInMiles * REIMBURSEMENT_RATE_PER_MILE;
        tripSequence.calculatedTotalDistanceMiles = totalDistanceInMiles;
        tripSequence.calculatedTotalReimbursement = potentialReimbursement;
        tripSequence.calculatedLegDistances = results.legDistances;

        renderMileageResults(results.totalDistance, tripSequence.calculatedTotalReimbursement, results.legDistances, tripSequence);


    } catch (error) {
        console.error('Handler caught error from postCalculateMileage:', error);
         mileageResultsDiv.style.display = 'none';
         saveTripButton.style.display = 'none';
    }
}


// Handle click on Save Trip button
async function handleSaveTripClick() {
    hideError(saveTripErrorDiv);

    if (tripSequence.length < 2 ||
        !tripSequence.hasOwnProperty('calculatedTotalDistanceMiles') ||
        !tripSequence.hasOwnProperty('calculatedTotalReimbursement') ||
        !tripSequence.hasOwnProperty('calculatedLegDistances')
    ) {
        displayError(saveTripErrorDiv, 'No valid trip calculation available to save.');
        return;
    }

    const tripDateValue = tripDateInput.value;
    const tripTimeValue = tripTimeInput.value;

    let tripDatetimeString = null;

    if (tripDateValue && tripTimeValue) {
        tripDatetimeString = `${tripDateValue}T${tripTimeValue}:00`;
    } else if (tripDateValue) {
        tripDatetimeString = `${tripDateValue}T00:00:00`;
    }

    console.log('User specified date:', tripDateValue, 'time:', tripTimeValue, 'Combined datetime string:', tripDatetimeString);


    const tripDataToSave = {
        tripSequence: tripSequence.map(addr => ({
            id: addr.id,
            address_text: addr.address_text,
        })),
        totalDistanceMiles: tripSequence.calculatedTotalDistanceMiles,
        reimbursementAmount: tripSequence.calculatedTotalReimbursement,
        legDistances: tripSequence.calculatedLegDistances,
        tripDatetime: tripDatetimeString
    };

    console.log('Attempting to save trip:', tripDataToSave);

    try {
        await postSaveTrip(tripDataToSave);

        alert('Trip saved successfully!'); // Use a better UI element for success later
        tripSequence = [];
        delete tripSequence.calculatedLegDistances;
        delete tripSequence.calculatedTotalDistanceMiles;
        delete tripSequence.calculatedTotalReimbursement;

        tripDateInput.value = '';
        tripTimeInput.value = '';

        renderTripSequence();
        fetchAndDisplayTripHistoryWrapper();

    } catch (error) {
        console.error('Handler caught error from postSaveTrip:', error);
    }
}

// Handle deletion of a trip
async function handleDeleteTrip(tripId) {
    console.log('Handling delete for trip ID:', tripId);
    hideError(fetchHistoryErrorDiv); // Clear history errors before deleting

    try {
         // Call the API interaction function to delete the trip
        const deleteResult = await deleteTrip(tripId);

        // If successful (deleteTrip throws on error), show success and refresh
        alert('Trip deleted successfully!'); // Use a better UI element for success later
        fetchAndDisplayTripHistoryWrapper(); // Refresh the list


    } catch (error) {
        console.error('Handler caught error during trip deletion:', error);
        // Error display is handled within deleteTrip
    }
}


// Handle click on Trip History list items (for viewing details)
function handleTripHistoryItemClick(event) {
     // We'll use event delegation, but need to make sure we only trigger the modal
     // if the click wasn't on one of the buttons inside the list item (like delete).
     // The delete button handler uses event.stopPropagation().
     // We can check if the clicked element or its parent has the data-tripId that we attached
     // to the content div in renderTripHistory.

    const targetTripContent = event.target.closest('.list-group-item > div[data-trip-id]'); // Find the content div with the ID

    if (targetTripContent && targetTripContent.dataset.tripId) {
        hideError(fetchHistoryErrorDiv); // Clear any previous history fetch error

        const clickedTripId = parseInt(targetTripContent.dataset.tripId, 10);
        console.log('Trip content clicked, trip ID:', clickedTripId, 'Type:', typeof clickedTripId);

        const selectedTrip = savedTripHistory.find(trip => trip.id === clickedTripId);

        if (selectedTrip) {
            console.log('Found trip details for modal:', selectedTrip);
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
            displayError(fetchHistoryErrorDiv, 'Could not load details for this trip.');
        }
    }
}


// --- Initialization and Wrapper Functions ---

// Wrapper function to fetch addresses and render them
async function fetchAndDisplayAddressesWrapper() {
    hideError(fetchAddressesErrorDiv);
    try {
        const addresses = await fetchAddresses();
        renderAddresses(addresses);
    } catch (error) {
        console.error("Failed to initialize addresses in wrapper:", error);
    }
}

// Wrapper function to fetch trip history and render it
async function fetchAndDisplayTripHistoryWrapper() {
    hideError(fetchHistoryErrorDiv);
    tripHistoryList.innerHTML = '<li class="list-group-item text-muted">Loading trip history...</li>';
    try {
        const trips = await fetchTripHistory();
        savedTripHistory = trips;

        renderTripHistory(savedTripHistory);
    } catch (error) {
        console.error("Failed to initialize trip history in wrapper:", error);
        // Error displayed in fetchTripHistory, nothing else needed here
    }
}


// --- Initial Setup ---

document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners to buttons
    addAddressButton.addEventListener('click', handleAddAddressClick);
    calculateMileageButton.addEventListener('click', handleCalculateMileageClick);
    saveTripButton.addEventListener('click', handleSaveTripClick);
    clearTripSequenceButton.addEventListener('click', clearTripSequence);

    // Attach event listener to the trip history list using delegation
    // The handleTripHistoryItemClick function now checks if the click was on the content div
    tripHistoryList.addEventListener('click', handleTripHistoryItemClick);


    // Perform initial data fetches and rendering
    fetchAndDisplayAddressesWrapper();
    renderTripSequence();
    fetchAndDisplayTripHistoryWrapper();

    // Optional: Set default date to today in the input field
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    tripDateInput.value = `${yyyy}-${mm}-${dd}`;
});