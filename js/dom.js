// js/dom.js

export const elements = {
  // Trips Stats
  totalTripsCount: document.getElementById('total-trips-count'),
  monthlyMileage: document.getElementById('monthly-mileage'),
  totalReimbursement: document.getElementById('total-reimbursement'),

  // Trip planning
  addressInput: document.getElementById('address-input'),
  addAddressButton: document.getElementById('add-address-button'),
  addressList: document.getElementById('address-list'),
  tripSequenceList: document.getElementById('trip-sequence-list'),
  calculateMileageButton: document.getElementById('calculate-mileage-button'),
  saveTripButton: document.getElementById('save-trip-button'),
  clearTripSequenceButton: document.getElementById('clear-trip-sequence-button'),

  // Trip result
  mileageResultsDiv: document.getElementById('mileage-results'),
  totalDistancePara: document.getElementById('total-distance'),
  potentialReimbursementPara: document.getElementById('potential-reimbursement'),
  tripLegsList: document.getElementById('trip-legs-list'),

  // Trip history
  tripHistoryList: document.getElementById('trip-history-list'),

  // Trip details modal
  tripDetailsModalElement: document.getElementById('tripDetailsModal'),
  detailTripDateSpan: document.getElementById('detail-trip-date'),
  detailTotalDistanceSpan: document.getElementById('detail-total-distance'),
  detailReimbursementSpan: document.getElementById('detail-reimbursement'),
  detailTripSequenceList: document.getElementById('detail-trip-sequence'),
  detailTripLegsList: document.getElementById('detail-trip-legs'),

  // Edit modal
  tripEditModalElement: document.getElementById('tripEditModal'),
  editTripIdInput: document.getElementById('edit-trip-id'),
  editTripDateInput: document.getElementById('edit-trip-date-input'),
  editTripTimeInput: document.getElementById('edit-trip-time-input'),
  saveEditTripButton: document.getElementById('save-edit-trip-button'),

  // Edit address
  editAddressInput: document.getElementById('edit-address-input'),
  editAddressModal: document.getElementById('editAddressModal'),

  // Date/Sort filters
  filterStartDateInput: document.getElementById('filter-start-date'),
  filterEndDateInput: document.getElementById('filter-end-date'),
  sortBySelect: document.getElementById('sort-by'),
  sortOrderSelect: document.getElementById('sort-order'),

  // Auth
  authSection: document.getElementById('auth-section'),
  loggedOutView: document.getElementById('logged-out-view'),
  loggedInView: document.getElementById('logged-in-view'),
  userEmailSpan: document.getElementById('user-email'),
  loginForm: document.getElementById('login-form'),
  loginEmailInput: document.getElementById('login-email'),
  loginPasswordInput: document.getElementById('login-password'),
  loginButton: document.getElementById('login-button'),
  logoutButton: document.getElementById('logout-button'),
  authInfoDiv: document.getElementById('auth-info'),
  appContentDiv: document.getElementById('app-content'),

  // Errors
  addAddressErrorDiv: document.getElementById('add-address-error'),
  fetchAddressesErrorDiv: document.getElementById('fetch-addresses-error'),
  calculateMileageErrorDiv: document.getElementById('calculate-mileage-error'),
  saveTripErrorDiv: document.getElementById('save-trip-error'),
  fetchHistoryErrorDiv: document.getElementById('fetch-history-error'),
  editTripErrorDiv: document.getElementById('edit-trip-error'),
  globalErrorDiv: document.getElementById('global-error'),

  // Date/Time input
  tripDateInput: document.getElementById('trip-date-input'),
  tripTimeInput: document.getElementById('trip-time-input'),

  // Export Features
  exportTripsPdfBtn: document.getElementById('exportTripsPdfBtn'),
  exportTripsCsvBtn: document.getElementById('exportTripsCsvBtn'),
};

export function showLoading(button, text = 'Working...') {
  if (!button) return;
  button.disabled = true;
  button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> ${text}`;
}

export function hideLoading(button, originalText = 'Submit') {
  if (!button) return;
  button.disabled = false;
  button.textContent = originalText;
}

export function displayError(container, message) {
  if (!container) return;

  // For longer errors
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <span>${message}</span>
      <button class="btn btn-link p-0" onclick="this.parentElement.parentElement.style.display='none'">
        <i class="bi bi-x"></i>
      </button>
    </div>
  `;

  container.style.display = 'block';
}

export function hideError(container) {
  if (!container) return;
  container.textContent = '';
  container.style.display = 'none';
}

export function displayAuthInfo(message, type = 'info') {
  const { authInfoDiv } = elements;
  if (!authInfoDiv) return;
  authInfoDiv.className = `alert alert-${type} mt-3`;
  authInfoDiv.textContent = message;
  authInfoDiv.style.display = 'block';
}

export function hideAuthInfo() {
  const { authInfoDiv } = elements;
  if (!authInfoDiv) return;
  authInfoDiv.textContent = '';
  authInfoDiv.style.display = 'none';
}
