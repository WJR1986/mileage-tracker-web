// --- Supabase Client Initialization (remains outside DOMContentLoaded) ---
// Use your Supabase URL and *public* anon key here
const SUPABASE_URL = 'https://tbtwyckbyhxujnxmrfba.supabase.co'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidHd5Y2tieWh4dWpueG1yZmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MTQwMzcsImV4cCI6MjA2MjI5MDAzN30.VXuJteMF28aOVaz7QEWSTUWf2FHs8foRIriSHSuNkpQ'; // Replace with your Supabase Public Anon Key

// Ensure you have replaced these with your actual Supabase keys
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    showToast('WARNING: Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY in script.js with your actual Supabase project keys.');
}

// Corrected: Access createClient via the globally available supabase object
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// --------------------------------------------------

// --- State Variables (remain outside DOMContentLoaded as they are global state) ---
const REIMBURSEMENT_RATE_PER_MILE = 0.45;
let tripSequence = []; // Stores full address objects from DB for the CURRENT trip being planned
let savedTripHistory = []; // Store the array of fetched saved trip objects
// -----------------------------------------------------------------------------


document.addEventListener('DOMContentLoaded', async () => {
    // --- Element References (MOVED inside DOMContentLoaded) ---
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

    // --- New Element References for Auth UI ---
    const authSection = document.getElementById('auth-section');
    const loggedOutView = document.getElementById('logged-out-view');
    const loggedInView = document.getElementById('logged-in-view'); // Using the correct ID as per your HTML
    const userEmailSpan = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const loginForm = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');
    const loginErrorDiv = document.getElementById('login-error');
    const signupForm = document.getElementById('signup-form');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPasswordInput = document.getElementById('signup-password');
    const signupButton = document.getElementById('signup-button');
    const signupErrorDiv = document.getElementById('signup-error');
    const authInfoDiv = document.getElementById('auth-info');
    const appContentDiv = document.getElementById('app-content');
    // ------------------------------------------


    // --- Utility Functions for UI Feedback (MOVED inside DOMContentLoaded) ---
    // These functions rely on the element references defined above
    function showLoading(buttonElement, originalText = 'Submit') {
        if (buttonElement) { // Add null check
            buttonElement.disabled = true;
            buttonElement.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ${originalText}...`;
        }
    }

    function hideLoading(buttonElement, originalText) {
        if (buttonElement) { // Add null check
            buttonElement.disabled = false;
            buttonElement.textContent = originalText;
        }
    }

    function displayError(errorElement, message) {
        showToast(message, 'danger');
    }

    function hideError(errorElement) {
        if (errorElement) { // Add null check
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    function displayAuthInfo(message, type = 'info') {
        if (authInfoDiv) { // Add null check
            authInfoDiv.className = `toast toast-${type} mt-3`;
            authInfoDiv.textContent = message;
            authInfoDiv.style.display = 'block';
        }
    }

    function hideAuthInfo() {
        if (authInfoDiv) { // Add null check
            authInfoDiv.textContent = '';
            authInfoDiv.style.display = 'none';
        }
    }

    // Helper function to get the auth header (Can remain outside or inside, kept inside for simplicity with fetch calls)
    async function getAuthHeader() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('Error getting Supabase session:', error);
            return null;
        }
        if (!session) {
            console.warn('No active Supabase session found.');
            return null;
        }
        return { 'Authorization': `Bearer ${session.access_token}` };
    }


    // --- API Interaction Functions (MOVED inside DOMContentLoaded) ---
    // These functions rely on getAuthHeader and utility functions

    async function fetchAddresses() {
        console.log('Fetching addresses...');
        hideError(fetchAddressesErrorDiv);
        try {
            const authHeaders = await getAuthHeader();
            if (!authHeaders) {
                console.log('No auth session, returning empty addresses array.');
                return [];
            }

            const response = await fetch('/.netlify/functions/hello', {
                method: 'GET',
                headers: authHeaders
            });

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

    async function postAddress(addressText) {
        console.log('Posting address:', addressText);
        showLoading(addAddressButton, 'Add Address');
        hideError(addAddressErrorDiv);
        try {
            const authHeaders = await getAuthHeader();
            if (!authHeaders) {
                console.error('Cannot post address: User not authenticated.');
                displayError(addAddressErrorDiv, 'You must be logged in to add addresses.');
                throw new Error('User not authenticated.');
            }

            const response = await fetch('/.netlify/functions/hello', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
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

    // postCalculateMileage does NOT need auth headers as per our plan
    async function postCalculateMileage(addressesArray) {
        console.log('Posting trip sequence for calculation:', addressesArray);
        showLoading(calculateMileageButton, 'Calculate Mileage');
        hideError(calculateMileageErrorDiv);
        if (saveTripButton) saveTripButton.style.display = 'none'; // Add null check
        if (mileageResultsDiv) mileageResultsDiv.style.display = 'none'; // Add null check


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

    async function postSaveTrip(tripData, method = 'POST', tripId = null) {
        console.log(`${method}ing trip:`, tripData, tripId ? `(ID: ${tripId})` : '');
        const buttonElement = method === 'PUT' ? saveEditTripButton : saveTripButton;
        const errorElement = method === 'PUT' ? editTripErrorDiv : saveTripErrorDiv;

        showLoading(buttonElement, method === 'PUT' ? 'Save Changes' : 'Save Trip');
        hideError(errorElement);

        const url = '/.netlify/functions/save-trip';

        try {
            const authHeaders = await getAuthHeader();
            if (!authHeaders) {
                console.error(`Cannot ${method.toLowerCase()} trip: User not authenticated.`);
                displayError(errorElement, `You must be logged in to ${method === 'PUT' ? 'save changes to' : 'save'} trips.`);
                throw new Error('User not authenticated.');
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
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

    async function deleteTrip(tripId) {
        console.log('Attempting to delete trip with ID:', tripId);
        hideError(fetchHistoryErrorDiv);

        try {
            const authHeaders = await getAuthHeader();
            if (!authHeaders) {
                console.error('Cannot delete trip: User not authenticated.');
                displayError(fetchHistoryErrorDiv, 'You must be logged in to delete trips.');
                throw new Error('User not authenticated.');
            }

            const response = await fetch('/.netlify/functions/save-trip', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
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

    async function fetchTripHistory(filtersAndSorting = {}) {
        console.log('Fetching trip history with parameters:', filtersAndSorting);
        hideError(fetchHistoryErrorDiv);
        if (tripHistoryList) tripHistoryList.innerHTML = '<li class="list-group-item text-muted">Loading trip history...</li>'; // Add null check


        const url = new URL('/.netlify/functions/save-trip', window.location.origin);

        Object.keys(filtersAndSorting).forEach(key => {
            if (filtersAndSorting[key]) {
                url.searchParams.append(key, filtersAndSorting[key]);
            }
        });

        console.log('Fetching history from URL:', url.toString());

        try {
            const authHeaders = await getAuthHeader();
            if (!authHeaders) {
                console.log('No auth session, returning empty trip history array.');
                return [];
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: authHeaders
            });

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
            if (tripHistoryList) tripHistoryList.innerHTML = ''; // Clear loading message, Add null check
            throw error;
        }
    }

    function renderAddresses(addresses) {
        const addressList = document.getElementById('address-list');
        if (!addressList) return;

        addressList.innerHTML = ''; // Clear existing entries

        if (!addresses || addresses.length === 0) {
            const placeholder = document.createElement('li');
            placeholder.classList.add('list-group-item', 'text-muted');
            placeholder.textContent = 'No saved addresses yet. Add your first address above!';
            addressList.appendChild(placeholder);
            return;
        }

        addresses.forEach(address => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');

            const addressText = document.createElement('span');
            addressText.textContent = address.address_text;

            const addButton = document.createElement('button');
            addButton.classList.add('btn', 'btn-primary', 'btn-sm');
            addButton.textContent = 'Add to Trip';
            addButton.addEventListener('click', () => {
                addAddressToTripSequence(address);
            });

            listItem.appendChild(addressText);
            listItem.appendChild(addButton);
            addressList.appendChild(listItem);
        });
    }

    // --- Authentication Functions (MOVED inside DOMContentLoaded) ---
    // These rely on element references and utility functions

    async function handleSignup(email, password) {
        console.log('Attempting signup for:', email);
        showLoading(signupButton, 'Sign Up');
        hideError(signupErrorDiv);
        hideAuthInfo();
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                console.error('Supabase signup error:', error);
                displayError(signupErrorDiv, error.message);
                if (error.message.includes('confirmation required')) {
                    displayAuthInfo('Check your email for a confirmation link!', 'warning');
                }
                throw error;
            }

            console.log('Signup successful:', data);
            if (data && data.user) {
                displayAuthInfo('Signed up successfully! Check your email for confirmation if required.', 'success');
                if (signupEmailInput) signupEmailInput.value = ''; // Add null check
                if (signupPasswordInput) signupPasswordInput.value = ''; // Add null check
                const loginTab = new bootstrap.Tab(document.getElementById('login-tab')); // This element should exist
                loginTab.show();

            } else {
                displayAuthInfo('Sign up successful! Check your email for a confirmation link.', 'info');
                if (signupEmailInput) signupEmailInput.value = ''; // Add null check
                if (signupPasswordInput) signupPasswordInput.value = ''; // Add null check
                const loginTab = new bootstrap.Tab(document.getElementById('login-tab')); // This element should exist
                loginTab.show();
            }

        } catch (error) {
            console.error('Caught error during signup:', error);
        } finally {
            hideLoading(signupButton, 'Sign Up');
        }
    }

    async function handleLogin(email, password) {
        console.log('Attempting login for:', email);
        showLoading(loginButton, 'Log In');
        hideError(loginErrorDiv);
        hideAuthInfo();
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                console.error('Supabase login error:', error);
                displayError(loginErrorDiv, error.message);
                throw error;
            }

            console.log('Login successful:', data);
            // OnAuthStateChange will handle the UI update

        } catch (error) {
            console.error('Caught error during login:', error);
        } finally {
            hideLoading(loginButton, 'Log In');
        }
    }

    async function handleLogout() {
        console.log('Attempting logout');
        // showLoading(logoutButton, 'Log Out');
        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error('Supabase logout error:', error);
                showToast(`Logout failed: ${error.message}`);
                throw error;
            }
            console.log('Logout successful');
        } catch (error) {
            console.error('Caught error during logout:', error);
        } finally {
            // hideLoading(logoutButton, 'Log Out');
        }
    }


    // --- UI State Management (MOVED inside DOMContentLoaded) ---
    // Relies on element references

    function updateAuthUI(user) {
        // Add null checks for auth view elements
        const loggedOutViewEl = document.getElementById('logged-out-view');
        const loggedInViewEl = document.getElementById('logged-in-view'); // Corrected ID reference
        const appContentDivEl = document.getElementById('app-content');
        const userEmailSpanEl = document.getElementById('user-email');


        if (user) {
            console.log('User is logged in:', user);
            if (loggedOutViewEl) loggedOutViewEl.style.display = 'none';
            if (loggedInViewEl) loggedInViewEl.style.display = 'block';
            if (appContentDivEl) appContentDivEl.style.display = 'block';
            if (userEmailSpanEl && user.email) userEmailSpanEl.textContent = user.email;

            hideError(loginErrorDiv); // These error divs should also be referenced correctly inside or accessible
            hideError(signupErrorDiv);
            hideAuthInfo();

            fetchAndDisplayAddressesWrapper();
            fetchAndDisplayTripHistoryWrapper();

        } else {
            console.log('User is logged out');
            if (loggedOutViewEl) loggedOutViewEl.style.display = 'block';
            if (loggedInViewEl) loggedInViewEl.style.display = 'none';
            if (appContentDivEl) appContentDivEl.style.display = 'none';
            if (userEmailSpanEl) userEmailSpanEl.textContent = '';

            // Clear any data from previous user (Add null checks)
            if (addressList) addressList.innerHTML = '';
            if (tripHistoryList) tripHistoryList.innerHTML = '';
            tripSequence = [];
            renderTripSequence(); // This function needs to be defined in this scope or accessible
            if (mileageResultsDiv) mileageResultsDiv.style.display = 'none';

            // Clear date and time inputs for planned trip (Add null checks)
            if (tripDateInput) tripDateInput.value = '';
            if (tripTimeInput) tripTimeInput.value = '';

            // Clear filter/sort inputs (Add null checks)
            if (filterStartDateInput) filterStartDateInput.value = '';
            if (filterEndDateInput) filterEndDateInput.value = '';
            if (sortBySelect) sortBySelect.value = 'created_at';
            if (sortOrderSelect) sortOrderSelect.value = 'desc';
        }
    }


    // --- Rendering Functions (MOVED inside DOMContentLoaded) ---
    // These rely on element references

    function renderTripHistory(trips) {
        const tripHistoryList = document.getElementById('tripHistoryList'); // Make sure you have an element with this ID in your HTML
        if (!tripHistoryList) {
            console.error('Trip history list element not found for rendering.');
            return;
        }
        tripHistoryList.innerHTML = ''; // Clear existing list

        if (!trips || trips.length === 0) {
            // Add placeholder logic for no trips yet
            const placeholderItem = document.createElement('li');
            placeholderItem.classList.add('list-group-item', 'text-muted');
            placeholderItem.textContent = 'No saved trips yet. Calculate and save your first trip!';
            tripHistoryList.appendChild(placeholderItem);
            return;
        }

        trips.forEach(trip => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'list-group-item-action', 'd-flex', 'justify-content-between', 'align-items-center');
            listItem.style.cursor = 'pointer';

            // *** IMPORTANT FIX: Add the data-trip-id attribute to the <li> element itself ***
            // This is the same pattern as you used in renderAddresses for data-address-id
            listItem.dataset.tripId = trip.id;
            // ****************************************************************************

            const contentDiv = document.createElement('div');
            // *** IMPORTANT: Ensure data-trip-id is NOT added to this inner div here ***
            // If you previously added a line like contentDiv.dataset.tripId = trip.id;, REMOVE THAT LINE.

            // Add the trip details (Date, Distance, Reimbursement) to the contentDiv
            // This HTML structure matches the snippet you provided earlier.
            contentDiv.innerHTML = `
            <strong>Trip on ${new Date(trip.trip_datetime).toLocaleDateString()} ${new Date(trip.trip_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong><br>
            Distance: ${trip.total_distance_miles ? trip.total_distance_miles.toFixed(2) + ' miles' : 'N/A'}<br>
            Reimbursement: ${trip.reimbursement_amount ? '£' + trip.reimbursement_amount.toFixed(2) : 'N/A'}
        `;

            const buttonsDiv = document.createElement('div');
            // Add the Edit and Delete buttons to the buttonsDiv
            // Keep the data-trip-id on the buttons themselves, as your click handler logic also
            // checks the target element for the edit/delete actions using their data-trip-id.
            buttonsDiv.innerHTML = `
            <button class="btn btn-outline-secondary btn-sm ms-2 edit-trip-button" title="Edit trip" data-trip-id="${trip.id}"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger btn-sm ms-2 delete-trip-button" title="Delete trip" data-trip-id="${trip.id}"><i class="bi bi-trash"></i></button>
        `;


            // Append the inner divs to the list item
            listItem.appendChild(contentDiv);
            listItem.appendChild(buttonsDiv);

            // Append the list item to the trip history list
            tripHistoryList.appendChild(listItem);
        });
    }
    function renderTripSequence() {
        if (!tripSequenceList) { console.error('Trip sequence list element not found for rendering.'); return; } // Add null check
        if (!calculateMileageButton) { console.error('Calculate mileage button element not found for rendering.'); } // Add null check
        if (!saveTripButton) { console.error('Save trip button element not found for rendering.'); } // Add null check
        if (!mileageResultsDiv) { console.error('Mileage results div element not found for rendering.'); } // Add null check
        if (!clearTripSequenceButton) { console.error('Clear trip sequence button element not found for rendering.'); } // Add null check


        tripSequenceList.innerHTML = '';

        if (tripSequence.length === 0) {
            const placeholderItem = document.createElement('li');
            placeholderItem.classList.add('list-group-item', 'text-muted');
            placeholderItem.textContent = 'Select addresses above to build your trip...';
            tripSequenceList.appendChild(placeholderItem);

            if (calculateMileageButton) calculateMileageButton.style.display = 'block';
            if (saveTripButton) saveTripButton.style.display = 'none';
            if (mileageResultsDiv) mileageResultsDiv.style.display = 'none';
            if (clearTripSequenceButton) clearTripSequenceButton.style.display = 'none';

        } else {
            tripSequence.forEach((address, index) => {
                const listItem = document.createElement('li');
                listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');

                const addressTextSpan = document.createElement('span');
                addressTextSpan.textContent = `${index + 1}. ${address.address_text}`;
                listItem.appendChild(addressTextSpan);

                const removeButton = document.createElement('button');
                removeButton.classList.add('btn', 'btn-outline-danger', 'btn-sm', 'ms-2');
                removeButton.innerHTML = '<i class="bi bi-x-circle"></i>'; // Assumes Bootstrap Icons are linked
                removeButton.title = 'Remove address from sequence';
                removeButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    removeAddressFromTripSequence(index); // removeAddressFromTripSequence needs to be defined in this scope or accessible
                });
                listItem.appendChild(removeButton);

                tripSequenceList.appendChild(listItem);
            });

            if (calculateMileageButton) calculateMileageButton.style.display = 'block';
            if (clearTripSequenceButton) clearTripSequenceButton.style.display = 'block';

            if (mileageResultsDiv) mileageResultsDiv.style.display = 'none';
            if (saveTripButton) saveTripButton.style.display = 'none';
            hideError(calculateMileageErrorDiv);
            delete tripSequence.calculatedLegDistances;
            delete tripSequence.calculatedTotalDistanceMiles;
            delete tripSequence.calculatedTotalReimbursement;
        }

        if (calculateMileageButton) calculateMileageButton.disabled = tripSequence.length < 2;
    }

    function renderMileageResults(totalDistanceText, reimbursementAmount, legDistancesArray, sequenceAddresses) {
        if (!totalDistancePara) { console.error('Total distance element not found for rendering.'); return; } // Add null check
        if (!potentialReimbursementPara) { console.error('Potential reimbursement element not found for rendering.'); return; } // Add null check
        if (!mileageResultsDiv) { console.error('Mileage results div element not found for rendering.'); return; } // Add null check
        if (!tripLegsList) { console.error('Trip legs list element not found for rendering.'); return; } // Add null check
        if (!saveTripButton) { console.error('Save trip button element not found for rendering.'); } // Add null check


        const numberOfStops = sequenceAddresses.length;
        totalDistancePara.textContent = `Total Distance (${numberOfStops} Stops): ${totalDistanceText}`;

        const formattedReimbursement = `£${reimbursementAmount.toFixed(2)}`;
        potentialReimbursementPara.textContent = `Potential Reimbursement: ${formattedReimbursement}`;

        const tripLegsHeading = mileageResultsDiv.querySelector('h4');
        if (tripLegsHeading) {
            tripLegsHeading.textContent = 'Mileage Between Stops:';
        }

        tripLegsList.innerHTML = '';
        if (!legDistancesArray || Array.isArray(legDistancesArray) && legDistancesArray.length === 0) {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'text-muted');
            listItem.textContent = 'No mileage between stops available.';
            tripLegsList.appendChild(listItem);
        } else if (Array.isArray(legDistancesArray)) {
            for (let i = 0; i < legDistancesArray.length; i++) {
                const legItem = document.createElement('li');
                legItem.classList.add('list-group-item');

                const startAddressText = sequenceAddresses[i] ? sequenceAddresses[i].address_text : `Stop ${i + 1}`;
                const endAddressText = sequenceAddresses[i + 1] ? sequenceAddresses[i + 1].address_text : `Stop ${i + 2}`;

                legItem.textContent = `Leg ${i + 1}: ${startAddressText} to ${endAddressText} - ${legDistancesArray[i]}`;

                tripLegsList.appendChild(legItem);
            }
        } else {
            console.error('legDistancesArray is not an array:', legDistancesArray);
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'text-danger');
            listItem.textContent = 'Error displaying leg distances.';
            tripLegsList.appendChild(listItem);
        }


        mileageResultsDiv.style.display = 'block';
        if (saveTripButton) saveTripButton.style.display = 'block';
    }


    function renderTripHistory(trips) {
        if (!tripHistoryList) { console.error('Trip history list element not found for rendering.'); return; } // Add null check
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
                    Distance: ${trip.total_distance_miles !== undefined && trip.total_distance_miles !== null ? trip.total_distance_miles.toFixed(2) : '--'} miles<br>
                    Reimbursement: £${trip.reimbursement_amount !== undefined && trip.reimbursement_amount !== null ? trip.reimbursement_amount.toFixed(2) : '--'}
                `;
                listItem.appendChild(tripDetailsContent);

                const actionButtons = document.createElement('div');
                actionButtons.addEventListener('click', (event) => {
                    event.stopPropagation(); // Prevent the list item click from triggering modal
                });


                const editButton = document.createElement('button');
                editButton.classList.add('btn', 'btn-outline-secondary', 'btn-sm', 'ms-2');
                editButton.innerHTML = '<i class="bi bi-pencil"></i>';
                editButton.title = 'Edit trip';
                editButton.dataset.tripId = trip.id;
                editButton.addEventListener('click', (event) => {
                    const tripIdToEdit = parseInt(event.currentTarget.dataset.tripId, 10);
                    handleEditTripClick(tripIdToEdit); // handleEditTripClick needs to be defined in this scope or accessible
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
                        handleDeleteTrip(tripIdToDelete); // handleDeleteTrip needs to be defined in this scope or accessible
                    }
                });
                actionButtons.appendChild(deleteButton);

                listItem.appendChild(actionButtons);

                tripHistoryList.appendChild(listItem);
            });
        }
    }

    // renderTripDetailsModal, openEditTripModal, etc. also need to be defined within this scope


    function renderTripDetailsModal(trip) {
        if (!trip) {
            console.error('No trip data provided to render modal.');
            return;
        }

        // Add null checks for modal elements
        if (detailTripDateSpan) {
            const tripTimestamp = trip.trip_datetime ? new Date(trip.trip_datetime) : new Date(trip.created_at);
            const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
            const formattedDate = tripTimestamp.toLocaleDateString('en-GB', dateOptions);
            const formattedTime = tripTimestamp.toLocaleTimeString('en-GB', timeOptions);
            detailTripDateSpan.textContent = `${formattedDate} ${formattedTime}`;
        } else { console.error('detailTripDateSpan element not found.'); }


        if (detailTotalDistanceSpan) {
            detailTotalDistanceSpan.textContent = `${trip.total_distance_miles !== undefined && trip.total_distance_miles !== null ? trip.total_distance_miles.toFixed(2) : '--'} miles`;
        } else { console.error('detailTotalDistanceSpan element not found.'); }


        if (detailReimbursementSpan) {
            detailReimbursementSpan.textContent = `£${trip.reimbursement_amount !== undefined && trip.reimbursement_amount !== null ? trip.reimbursement_amount.toFixed(2) : '--'}`;
        } else { console.error('detailReimbursementSpan element not found.'); }


        const detailTripSequenceListEl = document.getElementById('detail-trip-sequence');
        if (detailTripSequenceListEl) {
            detailTripSequenceListEl.innerHTML = '';

            if (!trip.trip_data || !Array.isArray(trip.trip_data) || trip.trip_data.length === 0) {
                const listItem = document.createElement('li');
                listItem.classList.add('list-group-item', 'text-muted');
                listItem.textContent = 'Sequence data not available.';
                detailTripSequenceListEl.appendChild(listItem);
            } else {
                trip.trip_data.forEach((address, index) => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('list-group-item');
                    const addressText = address && address.address_text ? address.address_text : 'Unknown Address';
                    listItem.textContent = `${index + 1}. ${addressText}`;
                    detailTripSequenceListEl.appendChild(listItem);
                });
            }
        } else { console.error('detailTripSequenceList element not found in modal.'); }


        const modalTripLegsHeading = tripDetailsModalElement ? tripDetailsModalElement.querySelector('#tripDetailsModal .modal-body h6:last-of-type') : null;
        if (modalTripLegsHeading) {
            modalTripLegsHeading.textContent = 'Mileage Between Stops:';
        }

        const detailTripLegsListEl = document.getElementById('detail-trip-legs');

        if (detailTripLegsListEl) {
            detailTripLegsListEl.innerHTML = '';

            if (!trip.leg_distances || !Array.isArray(trip.leg_distances) || trip.leg_distances.length === 0) {
                const listItem = document.createElement('li');
                listItem.classList.add('list-group-item', 'text-muted');
                listItem.textContent = 'No mileage between stops available.';
                detailTripLegsListEl.appendChild(listItem);

            } else {
                trip.leg_distances.forEach((legDistanceText, index) => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('list-group-item');

                    const startAddressText = trip.trip_data && trip.trip_data[index] ? trip.trip_data[index].address_text : 'Start';
                    const endAddressText = trip.trip_data && trip.trip_data[index + 1] ? trip.trip_data[index + 1].address_text : 'End';

                    listItem.textContent = `Leg ${index + 1}: ${startAddressText} to ${endAddressText} - ${legDistanceText}`;
                    detailTripLegsListEl.appendChild(listItem);
                });
            }
        } else { console.error('detailTripLegsList element not found in modal.'); }
    }

    function openEditTripModal(trip) {
        if (!trip) {
            console.error('No trip data provided to open edit modal.');
            return;
        }
        if (!tripEditModalElement) { console.error('Edit modal element not found.'); return; } // Add null check
        if (!editTripIdInput) { console.error('Edit trip ID input element not found.'); } // Add null check
        if (!editTripDateInput) { console.error('Edit trip date input element not found.'); } // Add null check
        if (!editTripTimeInput) { console.error('Edit trip time input element not found.'); } // Add null check
        if (!editTripErrorDiv) { console.error('Edit trip error div element not found.'); } // Add null check


        hideError(editTripErrorDiv);

        if (editTripIdInput) editTripIdInput.value = trip.id;

        let tripDateValue = '';
        let tripTimeValue = '';

        if (trip.trip_datetime) {
            const tripDate = new Date(trip.trip_datetime);
            tripDateValue = tripDate.toISOString().substring(0, 10);
            tripTimeValue = tripDate.toTimeString().substring(0, 5);
        } else if (trip.created_at) {
            const createdAtDate = new Date(trip.created_at);
            tripDateValue = createdAtDate.toISOString().substring(0, 10);
            tripTimeValue = ''; // No time from created_at
        }

        if (editTripDateInput) editTripDateInput.value = tripDateValue;
        if (editTripTimeInput) editTripTimeInput.value = tripTimeValue;

        if (tripEditModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            const tripEditModal = new bootstrap.Modal(tripEditModalElement);
            tripEditModal.show();
        } else {
            console.error('Edit modal element or Bootstrap JS not found.');
            showToast('Error opening edit modal.');
        }
    }


    // --- State Management Functions (MOVED inside DOMContentLoaded) ---
    // Some rely on rendering functions

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
            if (tripDateInput) tripDateInput.value = '';
            if (tripTimeInput) tripTimeInput.value = '';
            renderTripSequence();
        }
    }

    function getCurrentFilterAndSortValues() {
        const startDate = filterStartDateInput ? filterStartDateInput.value : null; // Add null check
        const endDate = filterEndDateInput ? filterEndDateInput.value : null; // Add null check
        const sortBy = sortBySelect ? sortBySelect.value : 'created_at'; // Add null check with default
        const sortOrder = sortOrderSelect ? sortOrderSelect.value : 'desc'; // Add null check with default

        return {
            startDate: startDate,
            endDate: endDate,
            sortBy: sortBy,
            sortOrder: sortOrder
        };
    }


    // --- Event Handlers (Orchestrators) (MOVED inside DOMContentLoaded) ---
    // These rely on other functions

    async function handleAddAddressClick() {
        if (!addressInput) { console.error('Address input element not found.'); return; } // Add null check
        const address = addressInput.value.trim();
        hideError(addAddressErrorDiv); // Assumes addAddressErrorDiv is referenced

        if (!address) {
            displayError(addAddressErrorDiv, 'Address cannot be empty.');
            console.log('Address input is empty.');
            return;
        }

        try {
            await postAddress(address);
            showToast('Address saved successfully!');
            if (addressInput) addressInput.value = ''; // Add null check
            fetchAndDisplayAddressesWrapper(); // fetchAndDisplayAddressesWrapper needs to be defined in this scope or accessible

        } catch (error) {
            console.error('Handler caught error from postAddress:', error);
            // Error already displayed by postAddress
        }
    }

    async function handleCalculateMileageClick() {
        hideError(calculateMileageErrorDiv); // Assumes calculateMileageErrorDiv is referenced

        if (tripSequence.length < 2) {
            displayError(calculateMileageErrorDiv, 'Please add at least two addresses to calculate mileage.');
            if (mileageResultsDiv) mileageResultsDiv.style.display = 'none'; // Add null check
            if (saveTripButton) saveTripButton.style.display = 'none'; // Add null check
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

            renderMileageResults(results.totalDistance, tripSequence.calculatedTotalReimbursement, results.legDistances, tripSequence); // renderMileageResults needs to be defined in this scope or accessible


        } catch (error) {
            console.error('Handler caught error from postCalculateMileage:', error);
            if (mileageResultsDiv) mileageResultsDiv.style.display = 'none'; // Add null check
            if (saveTripButton) saveTripButton.style.display = 'none'; // Add null check
            // Error already displayed by postCalculateMileage
        }
    }

    async function handleSaveTripClick() {
        hideError(saveTripErrorDiv); // Assumes saveTripErrorDiv is referenced

        if (!mileageResultsDiv || mileageResultsDiv.style.display === 'none' || tripSequence.length < 2 || // Added null check for mileageResultsDiv
            !tripSequence.hasOwnProperty('calculatedTotalDistanceMiles') ||
            !tripSequence.hasOwnProperty('calculatedTotalReimbursement') ||
            !tripSequence.hasOwnProperty('calculatedLegDistances')
        ) {
            displayError(saveTripErrorDiv, 'No valid trip calculation available to save.');
            return;
        }

        const tripDateValue = tripDateInput ? tripDateInput.value : ''; // Add null check
        const tripTimeValue = tripTimeInput ? tripTimeInput.value : ''; // Add null check


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
            await postSaveTrip(tripDataToSave, 'POST'); // postSaveTrip needs to be defined in this scope or accessible


            showToast('Trip saved successfully!');
            tripSequence = [];
            delete tripSequence.calculatedLegDistances;
            delete tripSequence.calculatedTotalDistanceMiles;
            delete tripSequence.calculatedTotalReimbursement;

            if (tripDateInput) tripDateInput.value = '';
            if (tripTimeInput) tripTimeInput.value = '';

            renderTripSequence(); // renderTripSequence needs to be defined in this scope or accessible
            fetchAndDisplayTripHistoryWrapper(); // fetchAndDisplayTripHistoryWrapper needs to be defined in this scope or accessible


        } catch (error) {
            console.error('Handler caught error from postSaveTrip (POST):', error);
            // Error already displayed by postSaveTrip
        }
    }

    function handleEditTripClick(tripId) {
        console.log('Edit button clicked for trip ID:', tripId);
        hideError(fetchHistoryErrorDiv); // Assumes fetchHistoryErrorDiv is referenced

        const tripToEdit = savedTripHistory.find(trip => trip.id === tripId); // savedTripHistory is global state, accessible

        if (tripToEdit) {
            console.log('Found trip to edit:', tripToEdit);
            openEditTripModal(tripToEdit); // openEditTripModal needs to be defined in this scope or accessible
        } else {
            console.error('Could not find trip with ID:', tripId, 'in savedTripHistory for editing.');
            displayError(fetchHistoryErrorDiv, 'Could not find trip details for editing.');
        }
    }

    async function handleSaveEditTripClick() {
        hideError(editTripErrorDiv); // Assumes editTripErrorDiv is referenced

        if (!editTripIdInput) { console.error('Edit trip ID input element not found.'); return; } // Added null check
        const tripIdToUpdate = parseInt(editTripIdInput.value, 10);

        if (!editTripDateInput) { console.error('Edit trip date input element not found.'); return; } // Added null check
        const editedDateValue = editTripDateInput.value;

        if (!editTripTimeInput) { console.error('Edit trip time input element not found.'); return; } // Added null check
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
            await postSaveTrip(updatedTripData, 'PUT', tripIdToUpdate); // postSaveTrip needs to be defined in this scope or accessible


            showToast('Trip updated successfully!');
            const modalInstance = tripEditModalElement ? bootstrap.Modal.getInstance(tripEditModalElement) : null; // Add null check
            if (modalInstance) {
                modalInstance.hide();
            }
            fetchAndDisplayTripHistoryWrapper(); // fetchAndDisplayTripHistoryWrapper needs to be defined in this scope or accessible


        } catch (error) {
            console.error('Handler caught error during trip update:', error);
            // Error already displayed by postSaveTrip
        }
    }

    async function handleDeleteTrip(tripId) {
        console.log('Handling delete for trip ID:', tripId);
        hideError(fetchHistoryErrorDiv); // Assumes fetchHistoryErrorDiv is referenced


        try {
            await deleteTrip(tripId); // deleteTrip needs to be defined in this scope or accessible

            showToast('Trip deleted successfully!');
            fetchAndDisplayTripHistoryWrapper(); // fetchAndDisplayTripHistoryWrapper needs to be defined in this scope or accessible


        } catch (error) {
            console.error('Handler caught error during trip deletion:', error);
            // Error already displayed by deleteTrip
        }
    }


    function handleTripHistoryItemClick(event) {
        // Find the closest list item to handle clicks anywhere within it
        const listItem = event.target.closest('.list-group-item');
        if (!listItem) return;

        // Locate the div with data-trip-id within the list item
        const tripContentDiv = listItem.querySelector('div[data-trip-id]');
        if (!tripContentDiv) return;

        const clickedTripId = parseInt(tripContentDiv.dataset.tripId, 10);
        console.log('Trip content clicked, trip ID:', clickedTripId);

        const selectedTrip = savedTripHistory.find(trip => trip.id === clickedTripId);
        if (selectedTrip) {
            console.log('Found trip details:', selectedTrip);
            renderTripDetailsModal(selectedTrip);

            if (tripDetailsModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                const tripDetailsModal = new bootstrap.Modal(tripDetailsModalElement);
                tripDetailsModal.show();
            } else {
                console.error('Modal element or Bootstrap JS not found.');
                showToast('Error displaying trip details modal.');
            }
        } else {
            console.error('Could not find trip with ID:', clickedTripId, 'in savedTripHistory.');
            displayError(fetchHistoryErrorDiv, 'Could not load details for this trip.');
        }
    }

    function handleFilterSortChange() {
        console.log('Filter or sort control changed. Refreshing history.');
        fetchAndDisplayTripHistoryWrapper(); // fetchAndDisplayTripHistoryWrapper needs to be defined in this scope or accessible
    }

    // --- Auth State Change Listener (MOVED inside DOMContentLoaded) ---
    // This listener needs access to updateAuthUI
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state change:', event, session);
        updateAuthUI(session ? session.user : null); // updateAuthUI needs to be defined in this scope
    });


    // --- Initialization and Wrapper Functions (MOVED inside DOMContentLoaded) ---
    // These orchestrate initial data loading and rendering and rely on other functions

    async function fetchAndDisplayAddressesWrapper() {
        const { data: { user } } = await supabase.auth.getUser();
        const addressList = document.getElementById('address-list');

        if (user) {
            // Show loading spinner
            if (addressList) {
                addressList.innerHTML = `
                <li class="list-group-item text-center py-3">
                    <div class="spinner-border text-primary py-2" role="status">
                        <span class="visually-hidden">Loading addresses...</span>
                    </div>
                    <span class="ms-2 text-muted">Loading your addresses...</span>
                </li>
            `;
            }

            hideError(fetchAddressesErrorDiv);

            try {
                const addresses = await fetchAddresses();
                renderAddresses(addresses);
            } catch (error) {
                console.error("Failed to initialize addresses in wrapper:", error);
                // Error message will be shown by fetchAddresses
                if (addressList) addressList.innerHTML = ''; // Clear loading state
            }
        } else {
            if (addressList) renderAddresses([]);
        }
    }

    async function fetchAndDisplayTripHistoryWrapper() {
        const { data: { user } } = await supabase.auth.getUser(); // Check if user is logged in
        if (user) {
            hideError(fetchHistoryErrorDiv); // Assumes fetchHistoryErrorDiv is referenced
            if (tripHistoryList) tripHistoryList.innerHTML = '<li class="list-group-item text-muted">Loading trip history...</li>'; // Add null check


            const currentFiltersAndSorting = getCurrentFilterAndSortValues(); // getCurrentFilterAndSortValues needs to be defined in this scope or accessible
            console.log('Using filters and sorting:', currentFiltersAndSorting);

            try {
                const trips = await fetchTripHistory(currentFiltersAndSorting); // fetchTripHistory needs to be defined in this scope or accessible
                savedTripHistory = trips; // savedTripHistory is global state, accessible

                renderTripHistory(savedTripHistory); // renderTripHistory needs to be defined in this scope or accessible
            } catch (error) {
                console.error("Failed to initialize trip history in wrapper:", error);
                // Error is already displayed by fetchTripHistory
            }
        } else {
            // Clear history if logged out (Add null check for tripHistoryList)
            if (tripHistoryList) renderTripHistory([]);
        }
    }


    // --- Event Listener Attachments (MOVED inside DOMContentLoaded) ---
    // These attach listeners to the elements referenced above

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = loginEmailInput ? loginEmailInput.value.trim() : ''; // Add null check
            const password = loginPasswordInput ? loginPasswordInput.value.trim() : ''; // Add null check
            if (email && password) {
                handleLogin(email, password); // handleLogin needs to be defined in this scope or accessible
            } else {
                if (loginErrorDiv) displayError(loginErrorDiv, 'Please enter email and password.');
            }
        });
    } else { console.error('Login form element not found.'); }


    if (signupForm) {
        signupForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = signupEmailInput ? signupEmailInput.value.trim() : ''; // Add null check
            const password = signupPasswordInput ? signupPasswordInput.value.trim() : ''; // Add null check
            if (email && password) {
                if (password.length < 6) {
                    if (signupErrorDiv) displayError(signupErrorDiv, 'Password must be at least 6 characters long.');
                    return;
                }
                handleSignup(email, password); // handleSignup needs to be defined in this scope or accessible
            } else {
                if (signupErrorDiv) displayError(signupErrorDiv, 'Please enter email and password.');
            }
        });
    } else { console.error('Signup form element not found.'); }


    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout); // handleLogout needs to be defined in this scope or accessible
    } else { console.error('Logout button element not found.'); }


    if (addAddressButton) addAddressButton.addEventListener('click', handleAddAddressClick); // handleAddAddressClick needs to be defined in this scope or accessible
    if (calculateMileageButton) calculateMileageButton.addEventListener('click', handleCalculateMileageClick); // handleCalculateMileageClick needs to be defined in this scope or accessible
    if (saveTripButton) saveTripButton.addEventListener('click', handleSaveTripClick); // handleSaveTripClick needs to be defined in this scope or accessible
    if (clearTripSequenceButton) clearTripSequenceButton.addEventListener('click', clearTripSequence); // clearTripSequence needs to be defined in this scope or accessible
    if (saveEditTripButton) saveEditTripButton.addEventListener('click', handleSaveEditTripClick); // handleSaveEditTripClick needs to be defined in this scope or accessible


    if (tripHistoryList) tripHistoryList.addEventListener('click', handleTripHistoryItemClick); // handleTripHistoryItemClick needs to be defined in this scope or accessible


    if (filterStartDateInput) filterStartDateInput.addEventListener('change', handleFilterSortChange); // handleFilterSortChange needs to be defined in this scope or accessible
    if (filterEndDateInput) filterEndDateInput.addEventListener('change', handleFilterSortChange); // handleFilterSortChange needs to be defined in this scope or accessible
    if (sortBySelect) sortBySelect.addEventListener('change', handleFilterSortChange); // handleFilterSortChange needs to be defined in this scope or accessible
    if (sortOrderSelect) sortOrderSelect.addEventListener('change', handleFilterSortChange); // handleFilterSortChange needs to be defined in this scope or accessible


    // Initial check for auth state and data display
    // We need to await the initial session check before calling updateAuthUI
    const { data: { session } } = await supabase.auth.getSession();
    updateAuthUI(session ? session.user : null);


    // Initial display of trip sequence (it will be empty initially)
    renderTripSequence();


    // Set default date to today in the input field
    const today = new Date();
    const getYyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (tripDateInput) tripDateInput.value = `${getYyyy}-${mm}-${dd}`;
});

// bootstrap toast function
function showToast(message, type = 'success') {
    // Create toast from template
    const template = document.getElementById('toastTemplate');
    const clone = template.content.cloneNode(true);
    const toastEl = clone.querySelector('.toast');
    const toastHeader = clone.querySelector('.toast-header');
    const toastBody = clone.querySelector('.toast-body');
    
    // Set type-specific styling
    const typeStyles = {
        success: { class: 'bg-success', icon: 'bi-check-circle' },
        danger: { class: 'bg-danger', icon: 'bi-exclamation-triangle' },
        info: { class: 'bg-info', icon: 'bi-info-circle' }
    };
    
    toastHeader.className = `toast-header text-white ${typeStyles[type].class}`;
    toastHeader.querySelector('i').className = `${typeStyles[type].icon} me-2`;
    toastBody.textContent = message;

    // Add to container
    const container = document.getElementById('toastContainer');
    container.prepend(toastEl);

    // Initialize and show toast
    const toast = new bootstrap.Toast(toastEl, {
        autohide: true,
        delay: 5000
    });
    toast.show();

    // Cleanup after hide
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}