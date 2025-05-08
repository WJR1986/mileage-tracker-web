// Get references to the HTML elements we need
const addressInput = document.getElementById('address-input');
const addAddressButton = document.getElementById('add-address-button');
const addressList = document.getElementById('address-list');

// Function to fetch and display addresses from the backend
async function fetchAndDisplayAddresses() {
    try {
        // Fetch addresses from the Netlify Function (using GET method)
        const response = await fetch('/.netlify/functions/hello', {
            method: 'GET' // We are requesting data
        });

        if (!response.ok) {
            // If the response is not OK (e.g., 500 error), throw an error
            const errorBody = await response.text(); // Get the response body for more info
            throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
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

// Add an event listener to the button
addAddressButton.addEventListener('click', () => {
    const address = addressInput.value.trim(); // Use trim() to remove leading/trailing whitespace

    if (address) {
        // Send the address to the backend
        fetch('/.netlify/functions/hello', {
            method: 'POST', // We are sending data
            headers: {
                'Content-Type': 'application/json' // Tell the server we are sending JSON
            },
            body: JSON.stringify({ address: address }) // Convert the JavaScript object to a JSON string
        })
        .then(response => response.json()) // Parse the JSON response from the server
        .then(data => {
            // Handle the response from the Netlify Function (POST request)
            console.log('Function POST response:', data); // Log the response to the console

            if (data.status === 'success') {
                alert(data.message); // Show success message (e.g., "Address saved successfully")
                addressInput.value = ''; // Clear input field

                // Fetch and display the updated list of addresses AFTER successful save
                fetchAndDisplayAddresses();

            } else {
                // Handle error response from the function
                alert('Error saving address: ' + (data.message || 'An unknown error occurred'));
            }
        })
        .catch(error => {
            // Handle network errors or errors before the function runs
            console.error('Fetch POST error:', error);
            alert('An error occurred while saving the address.');
        });
    } else {
        // Optional: Alert if the input is empty
        // alert('Please enter an address.');
    }
});

// Fetch and display addresses when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayAddresses();
});