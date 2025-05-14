// js/ui.js

import { elements } from './dom.js';

export function getCurrentFilters() {
  return {
    startDate: elements.filterStartDateInput?.value || null,
    endDate: elements.filterEndDateInput?.value || null,
    sortBy: elements.sortBySelect?.value || 'created_at',
    sortOrder: elements.sortOrderSelect?.value || 'desc'
  };
}


  export function renderTripSequence(sequence, onRemove) {
  const list = elements.tripSequenceList;
  list.innerHTML = '';

  sequence.forEach((addr, idx) => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex align-items-center gap-2 p-2 p-md-3'; // Responsive padding
    
    li.innerHTML = `
      <div class="d-flex flex-grow-1 align-items-center gap-2">
        <span class="badge bg-secondary d-none d-md-flex">${idx + 1}</span> <!-- Hide badge on mobile -->
        <span class="flex-grow-1 text-truncate pe-2">${addr.address_text}</span>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary move-up" 
                  ${idx === 0 ? 'disabled' : ''}>
            <i class="bi bi-arrow-up"></i>
          </button>
          <button class="btn btn-outline-secondary move-down" 
                  ${idx === sequence.length - 1 ? 'disabled' : ''}>
            <i class="bi bi-arrow-down"></i>
          </button>
          <button class="btn btn-outline-danger">
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>
    `;

    // Mobile badge
    const mobileBadge = document.createElement('span');
    mobileBadge.className = 'badge bg-secondary me-2 d-md-none';
    mobileBadge.textContent = idx + 1;
    li.querySelector('.text-truncate').before(mobileBadge);

    // event listeners
    li.querySelector('.move-up').addEventListener('click', () => moveItem(idx, 'up'));
    li.querySelector('.move-down').addEventListener('click', () => moveItem(idx, 'down'));
    li.querySelector('.btn-outline-danger').addEventListener('click', () => onRemove(idx));
    
    list.appendChild(li);
  });

  // Helper function to move items
  function moveItem(currentIndex, direction) {
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    // Swap positions
    [sequence[currentIndex], sequence[newIndex]] = [sequence[newIndex], sequence[currentIndex]];
    // Re-render the list
    renderTripSequence(sequence, onRemove);
  }

  elements.calculateMileageButton.style.display = 'block';
  elements.clearTripSequenceButton.style.display = 'block';
  elements.mileageResultsDiv.style.display = 'none';
  elements.saveTripButton.style.display = 'none';
}

export function renderAddresses(addresses, onAddToTrip, onEdit, onDelete) {
  const list = elements.addressList;
  list.innerHTML = '';

  addresses.forEach(addr => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center';
    
    li.innerHTML = `
      <div class="mb-2 mb-md-0 me-md-2 flex-grow-1 text-truncate">${addr.address_text}</div>
      <div class="d-flex gap-1">
        <button class="btn btn-primary btn-sm add-to-trip">
          <span class="d-none d-md-inline">Add to Trip</span>
          <i class="bi bi-plus-circle d-md-none"></i>
        </button>
        <div class="btn-group">
          <button class="btn btn-outline-primary btn-sm edit-address">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm delete-address">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;

    // Add click handlers
    li.querySelector('.add-to-trip').addEventListener('click', () => onAddToTrip(addr));
    li.querySelector('.edit-address').addEventListener('click', () => onEdit(addr));
    li.querySelector('.delete-address').addEventListener('click', () => onDelete(addr.id));

    list.appendChild(li);
  });
}

export function renderMileageResults(totalDistance, reimbursement, legs) {
  elements.totalDistancePara.textContent = `Total Distance: ${totalDistance}`;
  elements.potentialReimbursementPara.textContent =
    `Reimbursement: £${reimbursement.toFixed(2)}`;
  elements.tripLegsList.innerHTML = legs.map((leg, i) => `
    <li class="list-group-item">
      Leg ${i + 1}: ${leg}
    </li>
  `).join('');
  elements.mileageResultsDiv.style.display = 'block';
}

export function renderTripHistory(trips) {
  const list = elements.tripHistoryList;
  list.innerHTML = '';

  trips.forEach(trip => {
    const li = document.createElement('li'); // <-- THIS WAS MISSING
    li.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
    li.style.cursor = 'pointer';
    li.dataset.tripId = trip.id;

    const tripDate = new Date(trip.trip_datetime);
    const dateString = tripDate.toLocaleDateString('en-GB');
    const timeString = tripDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    li.innerHTML = `
      <div class="w-100">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${dateString} ${timeString}</strong>
            <div class="mt-1 small text-muted">
              ${trip.trip_data?.map((addr, index) =>
      `${index + 1}. ${addr.address_text}`
    ).join(' -> ')}
            </div>
            <div class="mt-1 small">
              <span class="badge bg-primary me-2">
                ${trip.total_distance_miles?.toFixed(2)} miles
              </span>
              <span class="badge bg-success">
                £${trip.reimbursement_amount?.toFixed(2)}
              </span>
            </div>
          </div>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-warning edit-trip" data-trip-id="${trip.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger delete-trip" data-trip-id="${trip.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    list.appendChild(li);
  });
}

export function showTripDetailsModal(trip) {
  if (!trip) return;

  // Format date and time
  const tripDate = new Date(trip.trip_datetime);
  const dateString = tripDate.toLocaleDateString('en-GB');
  const timeString = tripDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Update modal elements
  elements.detailTripDateSpan.textContent = `${dateString} ${timeString}`;
  elements.detailTotalDistanceSpan.textContent =
    `${trip.total_distance_miles.toFixed(2)} miles`;
  elements.detailReimbursementSpan.textContent =
    `£${trip.reimbursement_amount.toFixed(2)}`;

  // Render trip sequence
  elements.detailTripSequenceList.innerHTML = trip.trip_data
    .map((addr, index) => `
      <li class="list-group-item">
        ${index + 1}. ${addr.address_text}
      </li>
    `)
    .join('');

  // Render trip legs
  elements.detailTripLegsList.innerHTML = trip.leg_distances
    .map((leg, index) => `
      <li class="list-group-item">
        Leg ${index + 1}: ${leg}
      </li>
    `)
    .join('');

  // Show the modal
  elements.detailTripDateSpan.textContent = `${dateString} ${timeString}`;
  // Show the modal
  new bootstrap.Modal(elements.tripDetailsModalElement).show();
}