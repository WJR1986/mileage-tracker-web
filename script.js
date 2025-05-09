// --- Global Variables and Element References ---

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

// --- New Element Reference for Trip History ---
const tripHistoryList = document.getElementById('trip-history-list'); // List for saved trips
// ---------------------------------------------

// Reimbursement rate (initially £0.45 per mile)
const REIMBURSEMENT_RATE_PER_MILE = 0.45; // Stored as a number for calculation

// Array to hold the addresses currently in the trip sequence (stores full address objects from DB)
let tripSequence = [];


// --- Address Management Functions ---

// Function to add an address to the trip sequence
function addAddressToTripSequence(address) {
    tripSequence.push(address); // Add the selected address object to the array
    renderTripSequence(); // Update the UI list for the trip sequence
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
    tripSequenceList.innerHTML = ''; // Clear the current trip sequence list in the UI

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
        // Hide placeholder if there are items (list is cleared anyway)

        // Loop through the tripSequence array and add items to the UI list
        tripSequence.forEach((address, index) => {
            const listItem = document.createElement('li');
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
    calculateMileageButton.disabled = tripSequence.length < 2;
}


// Function to fetch and display addresses from the backend (Initial load and after save)
async function fetchAndDisplayAddresses() {
    try {
        const response = await fetch('/.netlify/functions/hello', { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }

        const addresses = await response.json();
        addressList.innerHTML = ''; // Clear the current list in the UI

        addresses.forEach(address => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'list-group-item-action');
            listItem.style.cursor = 'pointer';
            listItem.textContent = address.address_text;

            // Store data attributes
            listItem.dataset.addressId = address.id;
            listItem.dataset.addressText = address.address_text;

            listItem.addEventListener('click', () => {
                addAddressToTripSequence(address);
            });

            addressList.appendChild(listItem);
        });

    } catch (error) {
        console.error('Error fetching and displaying addresses:', error);
        // Optional: Display an error message in the UI
        // addressList.innerHTML = '<li class="list-group-item text-danger">Failed to load addresses.</li>';
    }
}

// --- NEW: Trip History Functions ---

// Function to fetch trip history from the backend
async function fetchAndDisplayTripHistory() {
    console.log('Fetching trip history...');
    // Show loading state
     tripHistoryList.innerHTML = '<li class="list-group-item text-muted">Loading trip history...</li>';

    try {
        // Fetch trips from the Netlify Function (using GET method)
        const response = await fetch('/.netlify/functions/save-trip', { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }

        const trips = await response.json(); // Parse the JSON array of trips

        console.log('Fetched trip history:', trips);

        // Render the fetched trip history in the UI
        renderTripHistory(trips);

    } catch (error) {
        console.error('Error fetching and displaying trip history:', error);
        // Display an error message in the UI
        tripHistoryList.innerHTML = '<li class="list-group-item text-danger">Failed to load trip history.</li>';
    }
}

// Function to render the trip history in the UI
function renderTripHistory(trips) {
    tripHistoryList.innerHTML = ''; // Clear the current trip history list in the UI

    if (!trips || trips.length === 0) {
        const placeholderItem = document.createElement('li');
        placeholderItem.classList.add('list-group-item', 'text-muted');
        placeholderItem.textContent = 'No trip history available yet.';
        tripHistoryList.appendChild(placeholderItem);
    } else {
        trips.forEach(trip => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item');

            // --- CHANGE: Use toLocaleDateString with 'en-GB' locale and specify format options ---
            const tripDate = new Date(trip.created_at);

            // Options for UK date format (DD/MM/YYYY)
            const dateOptions = {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            };
             // Options for UK time format (HH:MM) - optional
            const timeOptions = {
                 hour: '2-digit',
                 minute: '2-digit',
                 hour12: false // Use 24-hour format
            };


            const formattedDate = tripDate.toLocaleDateString('en-GB', dateOptions);
            const formattedTime = tripDate.toLocaleTimeString('en-GB', timeOptions); // Optional time formatting

            // Combine date and time
            const formattedDateTime = `${formattedDate} ${formattedTime}`;
            // ------------------------------------------------------------------------------------


            // Display key trip information
            listItem.innerHTML = `
                <strong>Trip on ${formattedDateTime}</strong><br>
                Distance: ${trip.total_distance_miles.toFixed(2)} miles<br>
                Reimbursement: £${trip.reimbursement_amount.toFixed(2)}
                <br>
                 `;

            tripHistoryList.appendChild(listItem);
        });
    }
}

// --- End NEW: Trip History Functions ---


// --- Event Listeners ---

// Add event listener to the "Add Address" button
addAddressButton.addEventListener('click', async () => { // Made async to use await if needed later, though not strictly necessary for this fetch
    const address = addressInput.value.trim();

    if (address) {
        try {
            const response = await fetch('/.netlify/functions/hello', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: address })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
            }

            const data = await response.json();

            console.log('Function POST response:', data);

            if (data.status === 'success') {
                alert(data.message);
                addressInput.value = '';
                fetchAndDisplayAddresses(); // Refresh address list
            } else {
                alert('Error saving address: ' + (data.message || 'An unknown error occurred'));
            }
        } catch (error) {
            console.error('Fetch POST error:', error);
            alert('An error occurred while saving the address.');
        }
    }
});


// Add event listener to the "Calculate Mileage" button
calculateMileageButton.addEventListener('click', async () => {
    if (tripSequence.length < 2) {
        alert('Please add at least two addresses to calculate mileage.');
        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none';
        return;
    }

    console.log('Calculating mileage for trip:', tripSequence);
    const tripAddressTexts = tripSequence.map(address => address.address_text);

    try {
        const response = await fetch('/.netlify/functions/calculate-mileage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses: tripAddressTexts })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }

        const results = await response.json();
        console.log('Calculation function response:', results);

        if (results.status === 'success' && results.totalDistance && results.legDistances) {
            totalDistancePara.textContent = `Total Distance: ${results.totalDistance}`;

            // Calculate and display Potential Reimbursement (Existing Logic)
            const totalDistanceMilesMatch = results.totalDistance.match(/([\d.]+)\s*miles/);
            let totalDistanceInMiles = 0;
            if (totalDistanceMilesMatch && totalDistanceMilesMatch[1]) {
                totalDistanceInMiles = parseFloat(totalDistanceMilesMatch[1]);
            }
            const potentialReimbursement = totalDistanceInMiles * REIMBURSEMENT_RATE_PER_MILE;
            const formattedReimbursement = `£${potentialReimbursement.toFixed(2)}`;
            potentialReimbursementPara.textContent = `Potential Reimbursement: ${formattedReimbursement}`;

            // Clear previous leg distances
            tripLegsList.innerHTML = '';

            // Display individual trip leg distances (now they will be in miles as formatted by the function)
            results.legDistances.forEach((leg, index) => {
                const legItem = document.createElement('li');
                legItem.classList.add('list-group-item');
                const startAddressText = tripSequence[index] ? tripSequence[index].address_text : 'Start';
                const endAddressText = tripSequence[index + 1] ? tripSequence[index + 1].address_text : 'End';
                legItem.textContent = `Leg ${index + 1}: ${startAddressText} to ${endAddressText} - ${leg}`; // 'leg' now contains "X.XX miles"
                tripLegsList.appendChild(legItem);
            });

            mileageResultsDiv.style.display = 'block';
            saveTripButton.style.display = 'block';

        } else {
             alert('Received unexpected calculation results or status not success.');
             console.error('Unexpected calculation response:', results);
             mileageResultsDiv.style.display = 'none';
             saveTripButton.style.display = 'none';
        }

    } catch (error) {
        console.error('Fetch Calculate Mileage error:', error);
        let errorMessage = 'An unknown error occurred during mileage calculation.';
        if (error instanceof Error) { errorMessage = 'Error: ' + error.message; }
        else if (typeof error === 'string') { errorMessage = 'Error: ' + error; }
        else if (error && typeof error === 'object' && error.message) { errorMessage = 'Error: ' + error.message; }
        alert(errorMessage);
        mileageResultsDiv.style.display = 'none';
        saveTripButton.style.display = 'none';
    }
});

console.log('Attaching Save Trip button event listener');
// Add event listener to the "Save Trip" button
saveTripButton.addEventListener('click', async () => {
    if (mileageResultsDiv.style.display === 'none' || tripSequence.length < 2) {
        alert('No trip calculated or trip sequence is too short to save.');
        return;
    }

    saveTripButton.disabled = true;
    saveTripButton.textContent = 'Saving...';

    const rawTotalDistanceText = totalDistancePara.textContent.replace('Total Distance: ', '').trim();
    const totalDistanceMiles = parseFloat(rawTotalDistanceText.replace(' miles', ''));

    const rawReimbursementText = potentialReimbursementPara.textContent.replace('Potential Reimbursement: £', '').trim();
    const reimbursementAmount = parseFloat(rawReimbursementText);

    const tripToSave = {
        tripSequence: tripSequence,
        totalDistanceMiles: totalDistanceMiles,
        reimbursementAmount: reimbursementAmount
    };

    console.log('Attempting to save trip:', tripToSave);
    console.log('Parsed totalDistanceMiles type:', typeof totalDistanceMiles, 'value:', totalDistanceMiles);
    console.log('Parsed reimbursementAmount type:', typeof reimbursementAmount, 'value:', reimbursementAmount);

    try {
         const response = await fetch('/.netlify/functions/save-trip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tripToSave)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
        }

        const saveResult = await response.json();
        console.log('Save trip function response:', saveResult);

        if (saveResult.status === 'success') {
            alert('Trip saved successfully!');
            tripSequence = [];
            renderTripSequence();
            fetchAndDisplayTripHistory(); // Refresh history list
        } else {
            alert('Error saving trip: ' + (saveResult.message || 'An unknown error occurred'));
        }

    } catch (error) {
        console.error('Fetch Save Trip error:', error);
        alert('An error occurred while saving the trip: ' + error.message);
    } finally {
        saveTripButton.disabled = false;
        saveTripButton.textContent = 'Save Trip';
    }
});


// --- Initial Load ---

document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayAddresses(); // Load initial list of addresses
    renderTripSequence(); // Render the empty trip sequence placeholder initially
    fetchAndDisplayTripHistory(); // Load and display trip history on load
});