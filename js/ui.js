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

let sortableInstance = null;

export function renderTripSequence(sequence, onRemove) {
  const list = elements.tripSequenceList;
  list.innerHTML = '';

  // Cleanup previous instance
  if (sortableInstance) {
    console.log('Destroying existing Sortable instance');
    sortableInstance.destroy();
    sortableInstance = null;
  }

  // Empty state
  if (!sequence.length) {
    list.innerHTML = `<li class="list-group-item text-muted">Select addresses above to build your trip...</li>`;
    elements.calculateMileageButton.style.display = 'block';
    elements.saveTripButton.style.display = 'none';
    elements.clearTripSequenceButton.style.display = 'none';
    elements.mileageResultsDiv.style.display = 'none';
    return;
  }

  // Render items
  sequence.forEach((addr, idx) => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center pe-3';
    li.innerHTML = `
    <div class="d-flex align-items-center gap-2 w-100">
      <i class="bi bi-grip-vertical drag-handle text-muted me-2 h2" style="cursor: grab"></i>
      <span class="flex-grow-1">${idx + 1}. ${addr.address_text}</span>
      <button class="btn btn-outline-danger btn-sm remove-button">
        <i class="bi bi-x-circle"></i>
      </button>
    </div>
  `;

    // Use event delegation for delete buttons
    li.querySelector('.remove-button').addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent drag interaction
      onRemove(idx);
    });
    list.appendChild(li);
  });

  // Initialize Sortable.js
  if (sequence.length > 0) {
    console.log('Initializing new Sortable instance');
    sortableInstance = new Sortable(list, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      forceFallback: false, // Changed to false
      filter: '.remove-button', // Ignore delete button for drag
      preventOnFilter: false,
      onStart: (evt) => {
        console.log('Drag started', evt);
        evt.item.style.transform = 'scale(1.02)'; // Visual feedback
      },
      onEnd: (evt) => {
        console.log('Drag ended', evt);
        if (evt.newIndex !== undefined && evt.oldIndex !== undefined) {
          const reorderedSequence = [...tripState.sequence];
          const [movedItem] = reorderedSequence.splice(evt.oldIndex, 1);
          reorderedSequence.splice(evt.newIndex, 0, movedItem);
          tripState.sequence = reorderedSequence;

          // Update UI without full re-render
          setTimeout(() => {
            renderTripSequence(tripState.sequence, onRemove);
          }, 100);
        }
      }
    });
  }

  // Button states
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
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>${addr.address_text}</span>
      <div>
        <button class="btn btn-primary btn-sm me-2 add-to-trip">
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
    ).join(' → ')}
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