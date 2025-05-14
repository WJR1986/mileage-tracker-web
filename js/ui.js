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

    // Mobile badge
    const mobileBadge = document.createElement('span');
    mobileBadge.className = 'badge bg-secondary me-2 d-md-none';
    mobileBadge.textContent = idx + 1;
    li.querySelector('.text-truncate').before(mobileBadge);

    // Add move handlers
    li.querySelector('.move-up').addEventListener('click', () => moveItem(idx, 'up'));
    li.querySelector('.move-down').addEventListener('click', () => moveItem(idx, 'down'));
    
    list.appendChild(li);
  });
}

export function renderAddresses(addresses, onAddToTrip, onEdit, onDelete) {
  const list = elements.addressList;
  list.innerHTML = '';

  addresses.forEach(addr => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>${addr.address_text}</span>
      <div>
        <button class="btn btn-primary btn-sm me-2 add-to-trip text-sm-end">
          Add to Trip
        </button>
        <button class="btn btn-outline-primary btn-sm edit-address" data-id="${addr.id}">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm ms-2 delete-address" data-id="${addr.id}">
          <i class="bi bi-trash"></i>
        </button>
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