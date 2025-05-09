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

// --- New Element References for Edit Modal ---
const tripEditModalElement = document.getElementById('tripEditModal');
const editTripIdInput = document.getElementById('edit-trip-id');
const editTripDateInput = document.getElementById('edit-trip-date-input');
const editTripTimeInput = document.getElementById('edit-trip-time-input');
const saveEditTripButton = document.getElementById('save-edit-trip-button');
const editTripErrorDiv = document.getElementById('edit-trip-error');
// ---------------------------------------------

// --- New Element References for Filter/Sort Controls ---
const filterStartDateInput = document.getElementById('filter-start-date');
const filterEndDateInput = document.getElementById('filter-end-date');
const sortBySelect = document.getElementById('sort-by');
const sortOrderSelect = document.getElementById('sort-order');
// -----------------------------------------------------


// --- State Variables ---
const REIMBURSEMENT_RATE_PER_MILE = 0.45;
let tripSequence = []; // Stores full address objects from DB for the CURRENT trip being planned
let savedTripHistory = []; // Store the array of fetched saved trip objects


// --- Utility Functions for UI Feedback ---
function showLoading(buttonElement, originalText = 'Submit') {
    buttonElement.disabled = true;
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

// Post a completed trip to be saved (or update)
async function postSaveTrip(tripData, method = 'POST', tripId = null) {
    console.log(`${method}ing trip:`, tripData, tripId ? `(ID: ${tripId})` : '');
    const buttonElement = method === 'PUT' ? saveEditTripButton : saveTripButton;
    const errorElement = method === 'PUT' ? editTripErrorDiv : saveTripErrorDiv;

    showLoading(buttonElement, method === 'PUT' ? 'Save Changes' : 'Save Trip');
    hideError(errorElement);

    const url = '/.netlify/functions/save-trip';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(method === 'PUT' ? { id: tripId, ...tripData } : tripData)
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }
        const result = await response.json();
        console.log(`${method} trip response:`, result);
         if (result.status !== 'success') {
             throw new Error(result.message || `Unknown error ${method.toLowerCase()}ing trip`);
         }
        return result;
    } catch (error) {
        console.error(`Error ${method.toLowerCase()}ing trip:`, error);
        displayError(errorElement, `Error ${method.toLowerCase()}ing trip: ${error.message}`);
        throw error;
    } finally {
        hideLoading(buttonElement, method === 'PUT' ? 'Save Changes' : 'Save Trip');
    }
}

// Send a DELETE request to delete a trip by ID
async function deleteTrip(tripId) {
     console.log('Attempting to delete trip with ID:', tripId);
     hideError(fetchHistoryErrorDiv);

    try {
        const response = await fetch('/.netlify/functions/save-trip', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tripId })
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

        return deleteResult;
    } catch (error) {
        console.error('Error deleting trip:', error);
         displayError(fetchHistoryErrorDiv, `Error deleting trip: ${error.message}`);
        throw error;
    }
}


// Fetch trip history from the backend with optional filters and sorting
async function fetchTripHistory(filtersAndSorting = {}) { // Accept an object of parameters
    console.log('Fetching trip history with parameters:', filtersAndSorting);
    hideError(fetchHistoryErrorDiv);
    tripHistoryList.innerHTML = '<li class="list-group-item text-muted">Loading trip history...</li>';

    const url = new URL('/.netlify/functions/save-trip', window.location.origin);

    // Append parameters to the URL as query strings
    Object.keys(filtersAndSorting).forEach(key => {
        if (filtersAndSorting[key]) { // Only append if the value is not null/empty
            url.searchParams.append(key, filtersAndSorting[key]);
        }
    });

    console.log('Fetching history from URL:', url.toString());

    try {
        const response = await fetch(url, { method: 'GET' });
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
        tripHistoryList.innerHTML = '';
        throw error;
    }
}


// --- Rendering Functions ---

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
            listItem.classList.add('list-group-item', 'list-group-item-action', 'd-flex', 'justify-content-between', 'align-items-center');
            listItem.style.cursor = 'pointer';

            const tripDetailsContent = document.createElement('div');
            tripDetailsContent.dataset.tripId = trip.id;

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
            listItem.appendChild(tripDetailsContent);

            const actionButtons = document.createElement('div');
             actionButtons.addEventListener('click', (event) => {
                 event.stopPropagation();
             });


            const editButton = document.createElement('button');
            editButton.classList.add('btn', 'btn-outline-secondary', 'btn-sm', 'ms-2');
            editButton.innerHTML = '<i class="bi bi-pencil"></i>';
            editButton.title = 'Edit trip';
            editButton.dataset.tripId = trip.id;
            editButton.addEventListener('click', (event) => {
                 const tripIdToEdit = parseInt(event.currentTarget.dataset.tripId, 10);
                 handleEditTripClick(tripIdToEdit);
            });
            actionButtons.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('btn', 'btn-outline-danger', 'btn-sm', 'ms-2');
            deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
            deleteButton.title = 'Delete trip';
            deleteButton.dataset.tripId = trip.id;
            deleteButton.addEventListener('click', (event) => {
                 const tripIdToDelete = parseInt(event.currentTarget.dataset.tripId, 10);
                 if (confirm('Are you sure you want to delete this trip?')) {
                     handleDeleteTrip(tripIdToDelete);
                 }
            });
            actionButtons.appendChild(deleteButton);

            listItem.appendChild(actionButtons);

            tripHistoryList.appendChild(listItem);
        });
    }
}

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

function openEditTripModal(trip) {
     if (!trip) {
         console.error('No trip data provided to open edit modal.');
         return;
     }

    hideError(editTripErrorDiv);

    editTripIdInput.value = trip.id;

    let tripDateValue = '';
    let tripTimeValue = '';

    if (trip.trip_datetime) {
         const tripDate = new Date(trip.trip_datetime);
         tripDateValue = tripDate.toISOString().substring(0, 10);
         tripTimeValue = tripDate.toTimeString().substring(0, 5);
    } else if (trip.created_at) {
          const createdAtDate = new Date(trip.created_at);
           tripDateValue = createdAtDate.toISOString().substring(0, 10);
            tripTimeValue = '';
    }

    editTripDateInput.value = tripDateValue;
    editTripTimeInput.value = tripTimeValue;

     if (tripEditModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
         const tripEditModal = new bootstrap.Modal(tripEditModalElement);
         tripEditModal.show();
     } else {
         console.error('Edit modal element or Bootstrap JS not found.');
         alert('Error opening edit modal.');
     }
}


// --- State Management Functions ---

function addAddressToTripSequence(address) {
    tripSequence.push(address);
    console.log('Trip sequence updated:', tripSequence);
    renderTripSequence();
}

function removeAddressFromTripSequence(index) {
    if (index >= 0 && index < tripSequence.length) {
        tripSequence.splice(index, 1);
        console.log('Address removed from sequence. Updated sequence:', tripSequence);
        renderTripSequence();
    }
}

function clearTripSequence() {
    if (tripSequence.length > 0) {
        tripSequence = [];
        console.log('Trip sequence cleared.');
        tripDateInput.value = '';
        tripTimeInput.value = '';
        renderTripSequence();
    }
}

// Function to get current filter and sort values from the UI
function getCurrentFilterAndSortValues() {
     const startDate = filterStartDateInput.value;
     const endDate = filterEndDateInput.value;
     const sortBy = sortBySelect.value;
     const sortOrder = sortOrderSelect.value;

     return {
         startDate: startDate,
         endDate: endDate,
         sortBy: sortBy,
         sortOrder: sortOrder
     };
}


// --- Event Handlers (Orchestrators) ---

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
        alert('Address saved successfully!');
        addressInput.value = '';
        fetchAndDisplayAddressesWrapper();

    } catch (error) {
        console.error('Handler caught error from postAddress:', error);
    }
}

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

    console.log('Attempting to save new trip:', tripDataToSave);

    try {
        await postSaveTrip(tripDataToSave, 'POST');

        alert('Trip saved successfully!');
        tripSequence = [];
        delete tripSequence.calculatedLegDistances;
        delete tripSequence.calculatedTotalDistanceMiles;
        delete tripSequence.calculatedTotalReimbursement;

        tripDateInput.value = '';
        tripTimeInput.value = '';

        renderTripSequence();
        // After saving, refresh history with current filters/sorting
        fetchAndDisplayTripHistoryWrapper();

    } catch (error) {
        console.error('Handler caught error from postSaveTrip (POST):', error);
    }
}

function handleEditTripClick(tripId) {
    console.log('Edit button clicked for trip ID:', tripId);
    hideError(fetchHistoryErrorDiv);

    const tripToEdit = savedTripHistory.find(trip => trip.id === tripId);

    if (tripToEdit) {
        console.log('Found trip to edit:', tripToEdit);
        openEditTripModal(tripToEdit);
    } else {
        console.error('Could not find trip with ID:', tripId, 'in savedTripHistory for editing.');
        displayError(fetchHistoryErrorDiv, 'Could not find trip details for editing.');
    }
}

async function handleSaveEditTripClick() {
    hideError(editTripErrorDiv);

    const tripIdToUpdate = parseInt(editTripIdInput.value, 10);
    const editedDateValue = editTripDateInput.value;
    const editedTimeValue = editTripTimeInput.value;

    if (isNaN(tripIdToUpdate)) {
        displayError(editTripErrorDiv, 'Invalid trip ID for update.');
        console.error('Invalid trip ID for update:', editTripIdInput.value);
        return;
    }

     let editedDatetimeString = null;

     if (editedDateValue && editedTimeValue) {
         editedDatetimeString = `${editedDateValue}T${editedTimeValue}:00`;
     } else if (editedDateValue) {
         editedDatetimeString = `${editedDateValue}T00:00:00`;
     }

    console.log('User specified edited date:', editedDateValue, 'time:', editedTimeValue, 'Combined datetime string:', editedDatetimeString);


    const updatedTripData = {
        tripDatetime: editedDatetimeString
    };

    console.log('Attempting to update trip ID', tripIdToUpdate, 'with data:', updatedTripData);


    try {
        await postSaveTrip(updatedTripData, 'PUT', tripIdToUpdate);

        alert('Trip updated successfully!');
        const modalInstance = bootstrap.Modal.getInstance(tripEditModalElement);
        if (modalInstance) {
            modalInstance.hide();
        }
         // After updating, refresh history with current filters/sorting
        fetchAndDisplayTripHistoryWrapper();

    } catch (error) {
        console.error('Handler caught error during trip update:', error);
    }
}

async function handleDeleteTrip(tripId) {
    console.log('Handling delete for trip ID:', tripId);
    hideError(fetchHistoryErrorDiv);

    try {
        await deleteTrip(tripId);
        alert('Trip deleted successfully!');
        // After deleting, refresh history with current filters/sorting
        fetchAndDisplayTripHistoryWrapper();

    } catch (error) {
        console.error('Handler caught error during trip deletion:', error);
    }
}


function handleTripHistoryItemClick(event) {
    const targetTripContent = event.target.closest('.list-group-item > div[data-trip-id]');

    if (targetTripContent && targetTripContent.dataset.tripId) {
        hideError(fetchHistoryErrorDiv);

        const clickedTripId = parseInt(targetTripContent.dataset.tripId, 10);
        console.log('Trip content clicked, trip ID:', clickedTripId);

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

// Handler for when filter or sort controls change
function handleFilterSortChange() {
     console.log('Filter or sort control changed. Refreshing history.');
     fetchAndDisplayTripHistoryWrapper(); // Re-fetch and display history with current settings
}


// --- Initialization and Wrapper Functions ---

async function fetchAndDisplayAddressesWrapper() {
    hideError(fetchAddressesErrorDiv);
    try {
        const addresses = await fetchAddresses();
        renderAddresses(addresses);
    } catch (error) {
        console.error("Failed to initialize addresses in wrapper:", error);
    }
}

// Wrapper function to fetch trip history and render it, now uses current filter/sort values
async function fetchAndDisplayTripHistoryWrapper() {
    hideError(fetchHistoryErrorDiv);
    tripHistoryList.innerHTML = '<li class="list-group-item text-muted">Loading trip history...</li>';

    // Get current filter and sort values from UI
    const currentFiltersAndSorting = getCurrentFilterAndSortValues();
    console.log('Using filters and sorting:', currentFiltersAndSorting);

    try {
        // Pass the parameters to the fetch function
        const trips = await fetchTripHistory(currentFiltersAndSorting);
        savedTripHistory = trips; // Update cached history with filtered/sorted results

        renderTripHistory(savedTripHistory);
    } catch (error) {
        console.error("Failed to initialize trip history in wrapper:", error);
        // Error displayed in fetchTripHistory
    }
}


// --- Initial Setup ---

document.addEventListener('DOMContentLoaded', () => {
    addAddressButton.addEventListener('click', handleAddAddressClick);
    calculateMileageButton.addEventListener('click', handleCalculateMileageClick);
    saveTripButton.addEventListener('click', handleSaveTripClick);
    clearTripSequenceButton.addEventListener('click', clearTripSequence);

    saveEditTripButton.addEventListener('click', handleSaveEditTripClick);

    tripHistoryList.addEventListener('click', handleTripHistoryItemClick);

    // Add event listeners to the new filter/sort controls
    filterStartDateInput.addEventListener('change', handleFilterSortChange);
    filterEndDateInput.addEventListener('change', handleFilterSortChange);
    sortBySelect.addEventListener('change', handleFilterSortChange);
    sortOrderSelect.addEventListener('change', handleFilterSortChange);


    fetchAndDisplayAddressesWrapper();
    renderTripSequence();
    // Initial fetch of history will now use the default filter/sort values
    fetchAndDisplayTripHistoryWrapper();

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    tripDateInput.value = `${yyyy}-${mm}-${dd}`;
});