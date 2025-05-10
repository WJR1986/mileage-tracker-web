export const getDOMElements = () => ({
    // Auth Elements
    authSection: document.getElementById('auth-section'),
    loggedOutView: document.getElementById('logged-out-view'),
    loggedInView: document.getElementById('logged-in-view'),
    userEmailSpan: document.getElementById('user-email'),
    logoutButton: document.getElementById('logout-button'),
    loginForm: document.getElementById('login-form'),
    loginEmailInput: document.getElementById('login-email'),
    loginPasswordInput: document.getElementById('login-password'),
    loginButton: document.getElementById('login-button'),
    loginErrorDiv: document.getElementById('login-error'),
    signupForm: document.getElementById('signup-form'),
    signupEmailInput: document.getElementById('signup-email'),
    signupPasswordInput: document.getElementById('signup-password'),
    signupButton: document.getElementById('signup-button'),
    signupErrorDiv: document.getElementById('signup-error'),
    authInfoDiv: document.getElementById('auth-info'),

    // Address & Trip Elements
    addressInput: document.getElementById('address-input'),
    addAddressButton: document.getElementById('add-address-button'),
    addressList: document.getElementById('address-list'),
    tripSequenceList: document.getElementById('trip-sequence-list'),
    calculateMileageButton: document.getElementById('calculate-mileage-button'),
    mileageResultsDiv: document.getElementById('mileage-results'),
    totalDistancePara: document.getElementById('total-distance'),
    potentialReimbursementPara: document.getElementById('potential-reimbursement'),
    tripLegsList: document.getElementById('trip-legs-list'),
    saveTripButton: document.getElementById('save-trip-button'),
    tripHistoryList: document.getElementById('trip-history-list'),
    clearTripSequenceButton: document.getElementById('clear-trip-sequence-button'),
    tripDateInput: document.getElementById('trip-date-input'),
    tripTimeInput: document.getElementById('trip-time-input'),
    
    // Modal Elements
    tripDetailsModalElement: document.getElementById('tripDetailsModal'),
    detailTripDateSpan: document.getElementById('detail-trip-date'),
    detailTotalDistanceSpan: document.getElementById('detail-total-distance'),
    detailReimbursementSpan: document.getElementById('detail-reimbursement'),
    detailTripSequenceList: document.getElementById('detail-trip-sequence'),
    detailTripLegsList: document.getElementById('detail-trip-legs'),
    tripEditModalElement: document.getElementById('tripEditModal'),
    editTripIdInput: document.getElementById('edit-trip-id'),
    editTripDateInput: document.getElementById('edit-trip-date-input'),
    editTripTimeInput: document.getElementById('edit-trip-time-input'),
    saveEditTripButton: document.getElementById('save-edit-trip-button'),
    editTripErrorDiv: document.getElementById('edit-trip-error'),

    // Filter/Sort Elements
    filterStartDateInput: document.getElementById('filter-start-date'),
    filterEndDateInput: document.getElementById('filter-end-date'),
    sortBySelect: document.getElementById('sort-by'),
    sortOrderSelect: document.getElementById('sort-order'),
    
    // Error Elements
    addAddressErrorDiv: document.getElementById('add-address-error'),
    fetchAddressesErrorDiv: document.getElementById('fetch-addresses-error'),
    calculateMileageErrorDiv: document.getElementById('calculate-mileage-error'),
    saveTripErrorDiv: document.getElementById('save-trip-error'),
    fetchHistoryErrorDiv: document.getElementById('fetch-history-error')
});