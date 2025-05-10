import { supabase } from './supabaseClient.js';
import { utils } from './utils.js';

export const authHandler = {
    handleSignup: async (email, password, elements) => {
        try {
            utils.showLoading(elements.signupButton, 'Sign Up');
            utils.hideError(elements.signupErrorDiv);
            utils.hideAuthInfo(elements.authInfoDiv);

            const { data, error } = await supabase.auth.signUp({ email, password });
            
            if (error) throw error;
            
            if (data?.user) {
                utils.displayAuthInfo(elements.authInfoDiv, 'Check your email for confirmation!', 'success');
                elements.signupEmailInput.value = '';
                elements.signupPasswordInput.value = '';
            }
            
            return data;
        } catch (error) {
            utils.displayError(elements.signupErrorDiv, error.message);
            throw error;
        } finally {
            utils.hideLoading(elements.signupButton, 'Sign Up');
        }
    },

    handleLogin: async (email, password, elements) => {
        try {
            utils.showLoading(elements.loginButton, 'Log In');
            utils.hideError(elements.loginErrorDiv);
            utils.hideAuthInfo(elements.authInfoDiv);

            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            
            if (error) throw error;
            return data;
        } catch (error) {
            utils.displayError(elements.loginErrorDiv, error.message);
            throw error;
        } finally {
            utils.hideLoading(elements.loginButton, 'Log In');
        }
    },

    handleLogout: async (elements) => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            // Reset UI state
            elements.tripSequenceList.innerHTML = '<li class="list-group-item text-muted">Select addresses above to build your trip...</li>';
            elements.mileageResultsDiv.style.display = 'none';
            elements.tripDateInput.value = '';
            elements.tripTimeInput.value = '';
        } catch (error) {
            console.error('Logout failed:', error);
            alert(`Logout failed: ${error.message}`);
        }
    }
};