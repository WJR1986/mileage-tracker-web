// Get references to the HTML elements we need
const addressInput = document.getElementById('address-input');
const addAddressButton = document.getElementById('add-address-button');
const addressList = document.getElementById('address-list'); // We'll still use this to display addresses fetched from the backend

// Add an event listener to the button
addAddressButton.addEventListener('click', () => {
    const address = addressInput.value;

    if (address) {
        // Send the address to the backend
        fetch('/.netlify/functions/hello', { // Use the function's path relative to the site root
            method: 'POST', // We are sending data
            headers: {
                'Content-Type': 'application/json' // Tell the server we are sending JSON
            },
            body: JSON.stringify({ address: address }) // Convert the JavaScript object to a JSON string
        })
        .then(response => response.json()) // Parse the JSON response from the server
        .then(data => {
            // Handle the response from the Netlify Function
            console.log('Function response:', data); // Log the response to the console

            if (data.status === 'success') {
                alert(data.message); // Show success message (e.g., "Address saved successfully")
                addressInput.value = ''; // Clear input field

                // --- Logic to refresh list from database will go here next ---

            } else {
                // Handle error response from the function
                alert('Error: ' + (data.message || 'An unknown error occurred'));
            }
        })
        .catch(error => {
            // Handle network errors or errors before the function runs
            console.error('Fetch error:', error);
            alert('An error occurred while saving the address.');
        });
    }
});

// --- Code to load and display addresses from the database will go here later ---