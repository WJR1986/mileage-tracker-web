// js/main.js

import { initSupabase, getCurrentUser, login, logout } from './auth.js';
import {
  fetchAddresses,
  saveAddress,
  updateAddress, // Add this
  deleteAddress, // Add this
  calculateMileage,
  fetchTripHistory,
  saveTrip,
  deleteTrip
} from './api.js';
import { tripState, savedTripHistory, clearTripState } from './state.js';
import { elements, showLoading, hideLoading, displayError, hideError, displayAuthInfo, hideAuthInfo } from './dom.js';
import {
  renderTripSequence,
  renderAddresses,
  renderTripHistory,
  showTripDetailsModal,
  renderMileageResults  // Add this line
} from './ui.js';
import { parseDistanceTextToMiles, calculateReimbursement, formatTripDatetime, buildTripPayload } from './trip.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Show loading state immediately
  elements.appContentDiv.style.display = 'none';
  elements.loggedOutView.style.display = 'none';
  elements.loggedInView.style.display = 'none';

  await initSupabase();
  const user = await getCurrentUser();
  updateAuthUI(user); // Now handles UI transitions

  bindEventListeners();

  if (user) {
    loadAddresses();
    loadTripHistory();
  }

  renderTripSequence(tripState.sequence, removeAddressFromTripSequence);
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

function updateDashboardStats() {
  // Total Trips
  elements.totalTripsCount.textContent = savedTripHistory.length;

  // Monthly Mileage
  const thisMonthTrips = savedTripHistory.filter(trip => {
    const tripDate = new Date(trip.trip_datetime);
    return tripDate.getMonth() === new Date().getMonth();
  });
  const monthlyMileage = thisMonthTrips.reduce((sum, trip) => sum + trip.total_distance_miles, 0);
  elements.monthlyMileage.textContent = `${monthlyMileage.toFixed(1)} miles`;

  // Total Reimbursement
  const totalReimbursement = savedTripHistory.reduce((sum, trip) => sum + trip.reimbursement_amount, 0);
  elements.totalReimbursement.textContent = `£${totalReimbursement.toFixed(2)}`;
}

function bindEventListeners() {
  const {
    loginForm, loginEmailInput, loginPasswordInput, loginButton, logoutButton,
    addAddressButton, calculateMileageButton, saveTripButton, clearTripSequenceButton,
    tripHistoryList, saveEditTripButton
  } = elements;

  // Trip History Interactions
  tripHistoryList?.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-trip');
    if (deleteBtn) {
      const tripId = deleteBtn.dataset.tripId;
      if (confirm('Delete this trip permanently?')) {
        handleDeleteTrip(tripId);
      }
      return;
    }

    const editBtn = e.target.closest('.edit-trip');
    if (editBtn) {
      const tripId = editBtn.dataset.tripId;
      handleEditTrip(tripId);
      return;
    }

    const listItem = e.target.closest('[data-trip-id]');
    const tripId = listItem?.dataset.tripId;
    if (tripId) {
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
  if (elements.logoutButton) elements.logoutButton.addEventListener('click', async () => {
    await logout();
    updateAuthUI(null);
    renderAddresses([], () => { });
    renderTripSequence([], () => { });
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
  // Inside the saveEditTripButton event listener:
  if (saveEditTripButton) {
    saveEditTripButton.addEventListener('click', async () => {
      const tripId = elements.editTripIdInput.value;
      const date = elements.editTripDateInput.value; // Date in UTC (YYYY-MM-DD)
      const time = elements.editTripTimeInput.value; // Time in local HH:mm

      if (!tripId || !date) {
        displayError(elements.editTripErrorDiv, 'Date is required');
        return;
      }

      try {
        showLoading(saveEditTripButton, 'Saving...');

        // Parse LOCAL time from input
        const [localHours, localMinutes] = time.split(':');

        // Create a Date object in LOCAL timezone
        const localDate = new Date(date);
        localDate.setHours(parseInt(localHours), parseInt(localMinutes));

        // Convert to UTC ISO string (e.g., "2024-05-20T16:00:00Z")
        const datetimeUTC = localDate.toISOString();

        await saveTrip({ tripDatetime: datetimeUTC }, 'PUT', tripId);
        await loadTripHistory();
        const editModal = bootstrap.Modal.getInstance(elements.tripEditModalElement);
        editModal.hide();
      } catch (err) {
        displayError(elements.editTripErrorDiv, err.message || 'Failed to save trip.');
      } finally {
        hideLoading(saveEditTripButton, 'Save Changes');
      }
    });
  }

  document.getElementById('save-edit-address')?.addEventListener('click', async () => {
    const newAddress = elements.editAddressInput.value.trim();
    if (!newAddress) return;

    try {
      await updateAddress(elements.currentEditingAddressId, newAddress);
      await loadAddresses();
      bootstrap.Modal.getInstance(elements.editAddressModal).hide();
    } catch (err) {
      displayError(document.getElementById('edit-address-error'), err.message);
    }
  });
  // Filter/Sort Controls
  elements.filterStartDateInput?.addEventListener('change', loadTripHistory);
  elements.filterEndDateInput?.addEventListener('change', loadTripHistory);
  elements.sortBySelect?.addEventListener('change', loadTripHistory);
  elements.sortOrderSelect?.addEventListener('change', loadTripHistory);
  elements.exportPdfBtn = document.getElementById('exportPdfBtn');
  elements.exportCsvBtn = document.getElementById('exportCsvBtn');

elements.exportTripsPdfBtn.addEventListener('click', () => generateTripsReport('pdf'));
elements.exportTripsCsvBtn.addEventListener('click', () => generateTripsReport('csv'));
}

async function loadAddresses() {
  try {
    const addresses = await fetchAddresses();
    // Add onEdit and onDelete handlers here
    renderAddresses(addresses, addAddressToTripSequence, handleEditAddress, handleDeleteAddress);
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
    updateDashboardStats();

  } catch (err) {
    displayError(elements.fetchHistoryErrorDiv, err.message);
  }
}

async function handleDeleteTrip(tripId) {
  if (!confirm('Are you sure you want to delete this trip?')) return;

  try {
    showLoading(elements.deleteTripButton, 'Deleting...'); // Target the delete button, not the list
    await deleteTrip(tripId);
    await loadTripHistory(); // Reload the list after deletion
  } catch (err) {
    displayError(elements.fetchHistoryErrorDiv, err.message);
  } finally {
    hideLoading(elements.deleteTripButton, 'Delete');
  }
}

async function handleEditTrip(tripId) {
  const trip = savedTripHistory.find(t => t.id == tripId);
  if (!trip) return;

  // Parse the stored UTC datetime
  const tripDate = new Date(trip.trip_datetime);

  // Convert to local time and format as HH:mm
  const hours = tripDate.getHours().toString().padStart(2, '0'); // 17 → "17"
  const minutes = tripDate.getMinutes().toString().padStart(2, '0'); // 0 → "00"

  elements.editTripIdInput.value = tripId;
  elements.editTripDateInput.value = tripDate.toISOString().split('T')[0]; // Date in UTC
  elements.editTripTimeInput.value = `${hours}:${minutes}`; // Time in local 24h
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

    // Create leg descriptions with addresses
    const legsWithAddresses = result.legDistances.map((distance, index) => {
      const start = tripState.sequence[index].address_text;
      const end = tripState.sequence[index + 1].address_text;
      return `${start} → ${end} (${distance})`;
    });

    // Update tripState
    tripState.calculatedTotalDistanceMiles = totalMiles;
    tripState.calculatedTotalReimbursement = reimbursement;
    tripState.calculatedLegDistances = legsWithAddresses; // Store formatted legs

    // Render with enhanced legs
    renderMileageResults(
      result.totalDistance,
      reimbursement,
      legsWithAddresses // Pass formatted legs
    );

    elements.saveTripButton.style.display = 'block';
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
    tripState.sequence,
    tripState.calculatedTotalDistanceMiles,
    tripState.calculatedTotalReimbursement,
    tripState.calculatedLegDistances, // Make sure this contains the leg distances
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

async function handleEditAddress(address) {
  elements.editAddressInput.value = address.address_text;
  elements.currentEditingAddressId = address.id;
  new bootstrap.Modal(elements.editAddressModal).show();
}

async function handleSaveEditedAddress() {
  const newText = elements.editAddressInput.value.trim();
  if (!newText) return;

  try {
    await updateAddress(elements.currentEditingAddressId, newText);
    await loadAddresses();
    bootstrap.Modal.getInstance(elements.editAddressModal).hide();
  } catch (err) {
    displayError(elements.editAddressErrorDiv, err.message);
  }
}
async function handleDeleteAddress(addressId) {
  if (confirm("Permanently delete this address?")) {
    try {
      await deleteAddress(addressId);
      await loadAddresses();
    } catch (err) {
      displayError(elements.fetchAddressesErrorDiv, err.message);
    }
  }
}

async function generateTripsReport(format) {
  // Use current filters & sorting to determine which trips to include
  const trips = [...savedTripHistory];
  // Build table rows: Date, Distance (miles), Reimbursement (£)
  const rows = trips.map(trip => ([
    formatTripDatetimeDisplay(trip.trip_datetime),
    trip.total_distance_miles.toFixed(1),
    trip.reimbursement_amount.toFixed(2)
  ]));

  if (format === 'csv') {
    // CSV header
    const header = ['Date', 'Distance (miles)', 'Reimbursement (£)'];
    const csvContent = [header, ...rows]
      .map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `trips_${new Date().toISOString().slice(0,10)}.csv`);
    return;
  }

  // PDF generation
  const docDefinition = {
    content: [
      { text: 'Trip Report', style: 'header' },
      { text: `Generated: ${new Date().toLocaleString()}`, margin: [0, 0, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: [
            ['Date', 'Distance (miles)', 'Reimbursement (£)'],
            ...rows
          ]
        }
      }
    ],
    styles: {
      header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] }
    },
    defaultStyle: { fontSize: 10 }
  };
  pdfMake.createPdf(docDefinition).download(`trips_${new Date().toISOString().slice(0,10)}.pdf`);
}