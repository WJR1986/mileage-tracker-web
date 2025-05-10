export const utils = {
    showLoading: (buttonElement, originalText = 'Submit') => {
        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ${originalText}...`;
        }
    },

    hideLoading: (buttonElement, originalText) => {
        if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.textContent = originalText;
        }
    },

    displayError: (errorElement, message) => {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    },

    hideError: (errorElement) => {
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    },

    displayAuthInfo: (authInfoDiv, message, type = 'info') => {
        if (authInfoDiv) {
            authInfoDiv.className = `alert alert-${type} mt-3`;
            authInfoDiv.textContent = message;
            authInfoDiv.style.display = 'block';
        }
    },

    hideAuthInfo: (authInfoDiv) => {
        if (authInfoDiv) {
            authInfoDiv.textContent = '';
            authInfoDiv.style.display = 'none';
        }
    },

    getAuthHeader: async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) return null;
        return { 'Authorization': `Bearer ${session.access_token}` };
    },

    formatDateTime: (date) => {
        const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
        return {
            date: date.toLocaleDateString('en-GB', dateOptions),
            time: date.toLocaleTimeString('en-GB', timeOptions)
        };
    }
};