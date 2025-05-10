// js/main.js

import { initSupabase, getCurrentUser, login, logout } from './auth.js';
import { fetchAddresses, saveAddress, calculateMileage, fetchTripHistory, saveTrip, deleteTrip } from './api.js';
import { tripState, savedTripHistory, clearTripState } from './state.js';
import { elements, showLoading, hideLoading, displayError, hideError, displayAuthInfo, hideAuthInfo } from './dom.js';
import { 
  renderTripSequence, 
  renderAddresses,
  renderTripHistory,
  showTripDetailsModal
} from './ui.js';
import { parseDistanceTextToMiles, calculateReimbursement, formatTripDatetime, buildTripPayload } from './trip.js';

document.addEventListener('DOMContentLoaded', async () => {
  await initSupabase();
  const user = await getCurrentUser();
  updateAuthUI(user);

  bindEventListeners();

  if (user) {
    loadAddresses();
    loadTripHistory();
  }

  renderTripSequence(tripSequence, removeAddressFromTripSequence);
  setDefaultTripDate();
});

function updateAuthUI(user) {
  const { loggedOutView, loggedInView, userEmailSpan, appContentDiv } = elements;
  if (user) {
    loggedOutView.style.display = 'none';
    loggedInView.style.display = 'block';
    appContentDiv.style.display = 'block';
    userEmailSpan.textContent = user.email;
  } else {
    loggedOutView.style.display = 'block';
    loggedInView.style.display = 'none';
    appContentDiv.style.display = 'none';
    userEmailSpan.textContent = '';
  }
}

function bindEventListeners() {
  const {
    loginForm, loginEmailInput, loginPasswordInput, loginButton, logoutButton,
    addAddressButton, calculateMileageButton, saveTripButton, clearTripSequenceButton,
    tripHistoryList, saveEditTripButton
  } = elements;

  // Trip History Interactions
  tripHistoryList?.addEventListener('click', (e) => {
    const listItem = e.target.closest('[data-trip-id]');
    const tripId = listItem?.dataset.tripId;
    const isDelete = e.target.closest('.delete-trip');
    const isEdit = e.target.closest('.edit-trip');

    if (!tripId) return;

    if (isDelete) {
      if (confirm('Delete this trip permanently?')) {
        handleDeleteTrip(tripId);
      }
    } else if (isEdit) {
      handleEditTrip(tripId);
    } else {
      const trip = savedTripHistory.find(t => t.id == tripId);
      if (trip) showTripDetailsModal(trip);
    }
  });

  // Login Form
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email = loginEmailInput.value.trim();
      const password = loginPasswordInput.value.trim();
      if (email && password) {
        showLoading(loginButton, 'Logging in');
        const error = await login(email, password);
        hideLoading(loginButton, 'Log In');
        if (error) displayError(elements.loginErrorDiv, error.message);
        else updateAuthUI(await getCurrentUser());
        loadAddresses();
        loadTripHistory();
      }
    });
  }

  // Logout
  if (logoutButton) logoutButton.addEventListener('click', async () => {
    await logout();
    updateAuthUI(null);
    renderAddresses([], () => {});
    renderTripSequence([], () => {});
  });

  // Add Address
  if (addAddressButton) addAddressButton.addEventListener('click', async () => {
    const address = elements.addressInput.value.trim();
    if (!address) return displayError(elements.addAddressErrorDiv, 'Address cannot be empty.');
    hideError(elements.addAddressErrorDiv);
    showLoading(addAddressButton, 'Saving');
    try {
      await saveAddress(address);
      elements.addressInput.value = '';
      loadAddresses();
    } catch (err) {
      displayError(elements.addAddressErrorDiv, err.message);
    } finally {
      hideLoading(addAddressButton, 'Add Address');
    }
  });

  // Calculate Mileage
  if (calculateMileageButton) calculateMileageButton.addEventListener('click', handleCalculateMileage);

  // Save Trip
  if (saveTripButton) saveTripButton.addEventListener('click', handleSaveTrip);

  // Clear Trip
if (clearTripSequenceButton) clearTripSequenceButton.addEventListener('click', () => {
  clearTripState();
  renderTripSequence(tripState.sequence, removeAddressFromTripSequence);
});

  // Save Edited Trip
  if (saveEditTripButton) {
    saveEditTripButton.addEventListener('click', async () => {
      const tripId = elements.editTripIdInput.value;
      const date = elements.editTripDateInput.value;
      const time = elements.editTripTimeInput.value;
      
      if (!tripId || !date) {
        displayError(elements.editTripErrorDiv, 'Date is required');
        return;
      }

      try {
        showLoading(saveEditTripButton, 'Saving...');
        const datetime = `${date}T${time || '00:00'}:00`;
        await saveTrip({ tripDatetime: datetime }, 'PUT', tripId);
        await loadTripHistory();
        new bootstrap.Modal(elements.tripEditModalElement).hide();
      } catch (err) {
        displayError(elements.editTripErrorDiv, err.message);
      } finally {
        hideLoading(saveEditTripButton, 'Save Changes');
      }
    });
  }

  // Filter/Sort Controls
  elements.filterStartDateInput?.addEventListener('change', loadTripHistory);
  elements.filterEndDateInput?.addEventListener('change', loadTripHistory);
  elements.sortBySelect?.addEventListener('change', loadTripHistory);
  elements.sortOrderSelect?.addEventListener('change', loadTripHistory);
}

async function loadAddresses() {
  try {
    const addresses = await fetchAddresses();
    renderAddresses(addresses, addAddressToTripSequence);
  } catch (err) {
    displayError(elements.fetchAddressesErrorDiv, err.message);
  }
}

async function loadTripHistory() {
  try {
    const params = {
      startDate: elements.filterStartDateInput?.value,
      endDate: elements.filterEndDateInput?.value,
      sortBy: elements.sortBySelect?.value,
      sortOrder: elements.sortOrderSelect?.value
    };
    
    const trips = await fetchTripHistory(params);
    savedTripHistory.length = 0;
    savedTripHistory.push(...trips);
    
    // Add this line to trigger the rendering
    renderTripHistory(savedTripHistory);
    
  } catch (err) {
    displayError(elements.fetchHistoryErrorDiv, err.message);
  }
}
async function handleDeleteTrip(tripId) {
  if (!confirm('Are you sure you want to delete this trip?')) return;
  
  try {
    showLoading(elements.tripHistoryList, 'Deleting...');
    await deleteTrip(tripId);
    await loadTripHistory();
  } catch (err) {
    displayError(elements.fetchHistoryErrorDiv, err.message);
  } finally {
    hideLoading(elements.tripHistoryList);
  }
}

async function handleEditTrip(tripId) {
  const trip = savedTripHistory.find(t => t.id == tripId);
  if (!trip) return;

  // Populate edit modal
  elements.editTripIdInput.value = tripId;
  elements.editTripDateInput.value = new Date(trip.trip_datetime).toISOString().split('T')[0];
  elements.editTripTimeInput.value = new Date(trip.trip_datetime).toTimeString().substring(0, 5);
  
  // Show modal
  new bootstrap.Modal(elements.tripEditModalElement).show();
}

function addAddressToTripSequence(address) {
  tripState.sequence.push(address);
  renderTripSequence(tripState.sequence, removeAddressFromTripSequence);
}

function removeAddressFromTripSequence(index) {
  tripState.sequence.splice(index, 1);
  renderTripSequence(tripState.sequence, removeAddressFromTripSequence);
}

async function handleCalculateMileage() {
  const addresses = tripState.sequence.map(a => a.address_text);
  if (addresses.length < 2) {
    displayError(elements.calculateMileageErrorDiv, 'Need at least 2 addresses.');
    return;
  }
  showLoading(elements.calculateMileageButton, 'Calculating');
  hideError(elements.calculateMileageErrorDiv);
  try {
    const result = await calculateMileage(addresses);
    const totalMiles = parseDistanceTextToMiles(result.totalDistance);
    const reimbursement = calculateReimbursement(totalMiles);

  tripState.calculatedTotalDistanceMiles = totalMiles;
  tripState.calculatedTotalReimbursement = reimbursement;
  tripState.calculatedLegDistances = result.legDistances;

    // renderMileageResults(...) to show UI — implement as needed
    elements.mileageResultsDiv.style.display = 'block';
    elements.saveTripButton.style.display = 'block';
    elements.totalDistancePara.textContent = `Total Distance: ${result.totalDistance}`;
    elements.potentialReimbursementPara.textContent = `Reimbursement: £${reimbursement.toFixed(2)}`;
  } catch (err) {
    displayError(elements.calculateMileageErrorDiv, err.message);
  } finally {
    hideLoading(elements.calculateMileageButton, 'Calculate Mileage');
  }
}

async function handleSaveTrip() {
  const date = elements.tripDateInput?.value;
  const time = elements.tripTimeInput?.value;
  const datetime = formatTripDatetime(date, time);

  // Check if we have valid calculations
  if (!tripState.calculatedTotalDistanceMiles) {
    return displayError(elements.saveTripErrorDiv, 'No trip calculation to save.');
  }

  // Build the payload using the state object
  const payload = buildTripPayload(
    tripState.sequence, // Use the sequence array from state
    tripState.calculatedTotalDistanceMiles,
    tripState.calculatedTotalReimbursement,
    tripState.calculatedLegDistances,
    datetime
  );

  showLoading(elements.saveTripButton, 'Saving Trip');
  hideError(elements.saveTripErrorDiv);
  
  try {
    await saveTrip(payload, 'POST');
    alert('Trip saved!');
    
    // Clear state using the state management function
    clearTripState();
    
    // Render empty sequence using the state's sequence array
    renderTripSequence(tripState.sequence, removeAddressFromTripSequence);
    
    // Reset form inputs
    elements.tripDateInput.value = '';
    elements.tripTimeInput.value = '';
    
    // Refresh history
    loadTripHistory();
  } catch (err) {
    displayError(elements.saveTripErrorDiv, err.message);
  } finally {
    hideLoading(elements.saveTripButton, 'Save Trip');
  }
}

function setDefaultTripDate() {
  const today = new Date().toISOString().slice(0, 10);
  if (elements.tripDateInput) elements.tripDateInput.value = today;
}
