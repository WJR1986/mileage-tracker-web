// js/ui.js

import { elements } from './dom.js';
import { tripState } from './state.js';

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

  // Preserve existing DOM elements
  const existingItems = Array.from(list.children).filter(child =>
    child.classList.contains('list-group-item')
  );

  // Cleanup ONLY if transitioning to empty state
  if (sequence.length === 0 && sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }

  // Empty state handling
  if (sequence.length === 0) {
    if (existingItems.length === 0) {
      list.innerHTML = `<li class="list-group-item text-muted">Select addresses above to build your trip...</li>`;
    }
    updateButtonStates(false);
    return;
  }

  // Reconcile DOM with state
  const newItems = sequence.map((addr, idx) => {
    // Add null checks for querySelector results
    const existingItem = existingItems.find(item => {
      const span = item.querySelector('span');
      return span && span.textContent.includes(addr.address_text);
    });

    if (existingItem) {
      const span = existingItem.querySelector('span');
      if (span) { // Add null check here
        const currentNumber = parseInt(span.textContent);
        if (currentNumber !== idx + 1) {
          span.textContent = `${idx + 1}. ${addr.address_text}`;
        }
      }
      return existingItem;
    }

    return createTripItem(addr, idx, onRemove);
  });

  // Efficient DOM update
  if (shouldUpdateDOM(list, newItems)) {
    list.replaceChildren(...newItems);
  }

  // Initialize Sortable.js once
  if (!sortableInstance) {
    initializeSortable(list, onRemove);
  }

  updateButtonStates(true);
}

function createTripItem(addr, idx, onRemove) {
  const li = document.createElement('li');
  li.className = 'list-group-item d-flex justify-content-between align-items-center pe-3';
  li.innerHTML = `
    <div class="d-flex align-items-center gap-2 w-100">
      <i class="bi bi-grip-vertical drag-handle text-muted me-2 h2" style="cursor: grab"></i>
      <span class="flex-grow-1 address-text">${idx + 1}. ${addr.address_text}</span>
      <button class="btn btn-outline-danger btn-sm remove-button">
        <i class="bi bi-x-circle"></i>
      </button>
    </div>
  `;

  const removeButton = li.querySelector('.remove-button');
  if (removeButton) { // Add null check
    removeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      onRemove(Array.from(li.parentNode.children).indexOf(li));
    });
  }

  return li;
}
function initializeSortable(list, onRemove) {
  sortableInstance = new Sortable(list, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    forceFallback: true,
    filter: '.remove-button',
    onStart: (evt) => {
      evt.item.style.transform = 'scale(1.02)';
    },
    onUpdate: (evt) => {
      const oldIndex = evt.oldIndex;
      const newIndex = evt.newIndex;
      if (oldIndex !== newIndex) {
        const movedItem = tripState.sequence[oldIndex];
        const newSequence = [...tripState.sequence];
        newSequence.splice(oldIndex, 1);
        newSequence.splice(newIndex, 0, movedItem);
        tripState.sequence = newSequence;

        // Visual update without re-render
        requestAnimationFrame(() => {
          Array.from(list.children).forEach((child, index) => {
            child.querySelector('span').textContent = `${index + 1}. ${tripState.sequence[index].address_text}`;
          });
        });
      }
    },
    onEnd: (evt) => {
      evt.item.style.transform = '';
    }
  });
}

function shouldUpdateDOM(list, newItems) {
  return (
    list.children.length !== newItems.length ||
    !Array.from(list.children).every((child, i) => child === newItems[i])
  );
}

function updateButtonStates(hasItems) {
  elements.calculateMileageButton.style.display = hasItems ? 'block' : 'none';
  elements.clearTripSequenceButton.style.display = hasItems ? 'block' : 'none';
  elements.mileageResultsDiv.style.display = 'none';
  elements.saveTripButton.style.display = 'none';
}

export function renderAddresses(addresses, onAddToTrip, onEdit, onDelete) {
  const list = elements.addressList;
  list.innerHTML = '';

  addresses.forEach(addr => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.innerHTML = `
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-start w-100 gap-2">
        <span class="address-text text-truncate flex-grow-1 me-2">${addr.address_text}</span>
        
        <div class="d-flex align-items-center gap-2">
          <button class="btn btn-primary btn-sm add-to-trip py-1 px-2">
            <span class="d-none d-md-inline">Add to Trip</span>
            <i class="bi bi-plus-lg d-md-none"></i>
          </button>
          
          <div class="d-flex gap-1">
            <button class="btn btn-outline-primary btn-sm edit-address py-1 px-2" 
                    data-id="${addr.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm delete-address py-1 px-2" 
                    data-id="${addr.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // Event listeners remain the same
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