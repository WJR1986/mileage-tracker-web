// Get references to the HTML elements we need
const addressInput = document.getElementById('address-input');
const addAddressButton = document.getElementById('add-address-button');
const addressList = document.getElementById('address-list'); // We'll still use this to display addresses fetched from the backend

// Function to fetch and display addresses from the backend
async function fetchAndDisplayAddresses() {
    try {
        // Fetch addresses from the Netlify Function (using GET method)
        const response = await fetch('/.netlify/functions/hello', {
            method: 'GET' // We are requesting data
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const addresses = await response.json(); // Parse the JSON array of addresses

        // Clear the current list in the UI
        addressList.innerHTML = '';

        // Loop through the fetched addresses and add them to the list
        addresses.forEach(address => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item'); // Add Bootstrap list item class
            listItem.textContent = address.address_text; // Use the 'address_text' from the database

            // Optional: Add date/time or ID for debugging
            // listItem.textContent = `${address.address_text} (ID: ${address.id})`;

            addressList.appendChild(listItem);
        });

    } catch (error) {
        console.error('Error fetching and displaying addresses:', error);
        // Optional: Display an error message in the UI
        // addressList.innerHTML = '<li class="list-group-item text-danger">Failed to load addresses.</li>';
    }
}

// --- Code to load and display addresses from the database will go here later ---

// Add an event listener to the button
addAddressButton.addEventListener('click', () => {
    const address = addressInput.value;

    if (address) {
        // Send the address to the backend
        fetch('/.netlify/functions/hello', { // Change 'api.php' to this
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ address: address })
        })
        .then(response => response.json()) // Parse the JSON response from the server
        .then(data => {
            // Handle the response from the Netlify Function
            console.log('Function response:', data); // Log the response to the console

            if (data.status === 'success') {
                alert(data.message); // Still show success message
                addressInput.value = ''; // Still clear input field
        
                // Fetch and display the updated list of addresses
                fetchAndDisplayAddresses(); // Call the function to refresh the list
        
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
// Fetch and display addresses when the page loads
fetchAndDisplayAddresses();