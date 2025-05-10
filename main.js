import { getDOMElements } from './domElements.js';
import { supabase } from './supabaseClient.js';
import { authHandler } from './auth.js';
import { api } from './api.js';
import { uiRenderer } from './ui.js';
import { utils } from './utils.js';

// Global State
let tripSequence = [];
let savedTripHistory = [];

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    const elements = getDOMElements();
    
    // Auth Event Listeners
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await authHandler.handleLogin(
            elements.loginEmailInput.value.trim(),
            elements.loginPasswordInput.value.trim(),
            elements
        );
    });

    elements.signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await authHandler.handleSignup(
            elements.signupEmailInput.value.trim(),
            elements.signupPasswordInput.value.trim(),
            elements
        );
    });

    elements.logoutButton.addEventListener('click', () => {
        authHandler.handleLogout(elements);
    });

    // Trip Planning Listeners
    elements.addAddressButton.addEventListener('click', async () => {
        const address = elements.addressInput.value.trim();
        if (!address) return;
        
        try {
            await api.postAddress(address);
            elements.addressInput.value = '';
            const addresses = await api.fetchAddresses();
            uiRenderer.renderAddresses(addresses, elements);
        } catch (error) {
            utils.displayError(elements.addAddressErrorDiv, error.message);
        }
    });

    elements.calculateMileageButton.addEventListener('click', async () => {
        try {
            const results = await api.postCalculateMileage(
                tripSequence.map(a => a.address_text)
            );
            uiRenderer.renderMileageResults(results, tripSequence, elements);
        } catch (error) {
            utils.displayError(elements.calculateMileageErrorDiv, error.message);
        }
    });

    // Initialize Auth State
    const { data: { session } } = await supabase.auth.getSession();
    updateAuthUI(session?.user, elements);
    
    // Auth State Listener
    supabase.auth.onAuthStateChange((_event, session) => {
        updateAuthUI(session?.user, elements);
        if (session?.user) {
            loadInitialData(elements);
        }
    });
});

async function loadInitialData(elements) {
    try {
        const [addresses, trips] = await Promise.all([
            api.fetchAddresses(),
            api.fetchTripHistory()
        ]);
        
        uiRenderer.renderAddresses(addresses, elements);
        uiRenderer.renderTripHistory(trips, elements);
        savedTripHistory = trips;
    } catch (error) {
        console.error('Initial data load failed:', error);
    }
}

function updateAuthUI(user, elements) {
    if (user) {
        elements.loggedOutView.style.display = 'none';
        elements.loggedInView.style.display = 'block';
        elements.appContent.style.display = 'block';
        elements.userEmailSpan.textContent = user.email;
    } else {
        elements.loggedOutView.style.display = 'block';
        elements.loggedInView.style.display = 'none';
        elements.appContent.style.display = 'none';
        elements.addressList.innerHTML = '';
        elements.tripHistoryList.innerHTML = '';
    }
}