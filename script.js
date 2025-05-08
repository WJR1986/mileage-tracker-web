// Get references to the HTML elements we need
const addressInput = document.getElementById('address-input');
const addAddressButton = document.getElementById('add-address-button');
const addressList = document.getElementById('address-list'); // We'll still use this to display addresses fetched from the backend

// Add an event listener to the button
addAddressButton.addEventListener('click', () => {
    const address = addressInput.value;

    if (address) {
        // Send the address to the backend
        fetch('api.php', { // 'api.php' is the URL relative to our current page
            method: 'POST', // We are sending data
            headers: {
                'Content-Type': 'application/json' // Tell the server we are sending JSON
            },
            body: JSON.stringify({ address: address }) // Convert the JavaScript object to a JSON string
        })
        .then(response => response.json()) // Parse the JSON response from the server
        .then(data => {
            // Handle the response from the PHP script
            console.log('Server response:', data); // Log the response to the console

            if (data.status === 'success') {
                // Address was received by PHP, now we would typically
                // add it to the list AFTER confirming it was saved to the database.
                // For now, we'll just clear the input and maybe give feedback.

                // --- Logic to refresh list from database will go here later ---

                addressInput.value = ''; // Clear input field

                // Optional: Give user feedback (e.g., "Address added!")
                alert('Address sent to backend!'); // Simple alert for testing
            } else {
                // Handle error response
                alert('Error sending address: ' + data.message);
            }
        })
        .catch(error => {
            // Handle network errors
            console.error('Fetch error:', error);
            alert('An error occurred while sending the address.');
        });
    }
});

// --- Code to load and display addresses from the database will go here later ---