<?php

header('Content-Type: application/json');

// Get the raw POST data
$json_data = file_get_contents('php://input');

// Decode the JSON data
$data = json_decode($json_data, true);

// Check if data was received and contains the address
if ($data && isset($data['address'])) {
    $address = $data['address'];

    // --- Database insertion logic will go here later ---

    // For now, just send a success response back
    echo json_encode(['status' => 'success', 'message' => 'Address received', 'address' => $address]);

} else {
    // Send an error response if data is missing or invalid
    echo json_encode(['status' => 'error', 'message' => 'Invalid input']);
}

?>