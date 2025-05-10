// js/main.js

import { initSupabase, getCurrentUser, login, logout } from './auth.js';
import { fetchAddresses, saveAddress, calculateMileage, fetchTripHistory, saveTrip, deleteTrip } from './api.js';
import { tripSequence, savedTripHistory, clearTripState } from './state.js';
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
    addAddressButton, calculateMileageButton, saveTripButton, clearTripSequenceButton
  } = elements;
elements.tripHistoryList?.addEventListener('click', (e) => {
  const listItem = e.target.closest('[data-trip-id]');
  if (!listItem) return;
  
  const tripId = listItem.dataset.tripId;
  const trip = savedTripHistory.find(t => t.id == tripId);
  
  if (trip) {
    showTripDetailsModal(trip);
  }
});

const editButtons = document.querySelectorAll('.edit-trip-button');
editButtons.forEach(btn => 
  btn.addEventListener('click', () => handleEditTrip(btn.dataset.tripId))
);

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

  if (logoutButton) logoutButton.addEventListener('click', async () => {
    await logout();
    updateAuthUI(null);
    renderAddresses([], () => {});
    renderTripSequence([], () => {});
  });

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

  if (calculateMileageButton) calculateMileageButton.addEventListener('click', handleCalculateMileage);

  if (saveTripButton) saveTripButton.addEventListener('click', handleSaveTrip);

  if (clearTripSequenceButton) clearTripSequenceButton.addEventListener('click', () => {
    clearTripState();
    renderTripSequence(tripSequence, removeAddressFromTripSequence);
  });

  // You can also bind edit/delete here for tripHistoryList items
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
function addAddressToTripSequence(address) {
  tripSequence.push(address);
  renderTripSequence(tripSequence, removeAddressFromTripSequence);
}

function removeAddressFromTripSequence(index) {
  tripSequence.splice(index, 1);
  renderTripSequence(tripSequence, removeAddressFromTripSequence);
}

async function handleCalculateMileage() {
  const addresses = tripSequence.map(a => a.address_text);
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

    tripSequence.calculatedTotalDistanceMiles = totalMiles;
    tripSequence.calculatedTotalReimbursement = reimbursement;
    tripSequence.calculatedLegDistances = result.legDistances;

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

  if (!tripSequence.calculatedTotalDistanceMiles) {
    return displayError(elements.saveTripErrorDiv, 'No trip calculation to save.');
  }

  const payload = buildTripPayload(
    tripSequence,
    tripSequence.calculatedTotalDistanceMiles,
    tripSequence.calculatedTotalReimbursement,
    tripSequence.calculatedLegDistances,
    datetime
  );

  showLoading(elements.saveTripButton, 'Saving Trip');
  hideError(elements.saveTripErrorDiv);
  try {
    await saveTrip(payload, 'POST');
    alert('Trip saved!');
    clearTripState();
    renderTripSequence(tripSequence, removeAddressFromTripSequence);
    elements.tripDateInput.value = '';
    elements.tripTimeInput.value = '';
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
