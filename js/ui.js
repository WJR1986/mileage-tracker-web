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

  if (!sequence.length) {
    list.innerHTML = `<li class="list-group-item text-muted">Select addresses above to build your trip...</li>`;
    elements.calculateMileageButton.style.display = 'block';
    elements.saveTripButton.style.display = 'none';
    elements.clearTripSequenceButton.style.display = 'none';
    elements.mileageResultsDiv.style.display = 'none';
    return;
  }

  sequence.forEach((addr, idx) => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `<span>${idx + 1}. ${addr.address_text}</span>`;
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-outline-danger btn-sm ms-2';
    removeBtn.innerHTML = '<i class="bi bi-x-circle"></i>';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', () => onRemove(idx));
    li.appendChild(removeBtn);
    list.appendChild(li);
  });

  elements.calculateMileageButton.style.display = 'block';
  elements.clearTripSequenceButton.style.display = 'block';
  elements.mileageResultsDiv.style.display = 'none';
  elements.saveTripButton.style.display = 'none';
}

export function renderAddresses(addresses, onAddToTrip) {
  const list = elements.addressList;
  list.innerHTML = '';

  if (!addresses.length) {
    list.innerHTML = `<li class="list-group-item text-muted">No saved addresses yet.</li>`;
    return;
  }

  addresses.forEach(addr => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `<span>${addr.address_text}</span>`;
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-sm';
    btn.textContent = 'Add to Trip';
    btn.onclick = () => onAddToTrip(addr);
    li.appendChild(btn);
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
  if (!list) return;

  list.innerHTML = '';

  if (!trips || trips.length === 0) {
    list.innerHTML = `<li class="list-group-item text-muted">No trips found</li>`;
    return;
  }

  trips.forEach(trip => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <div>
        <strong>${new Date(trip.trip_datetime).toLocaleDateString()}</strong><br>
        ${trip.total_distance_miles?.toFixed(2) || '0.00'} miles
      </div>
      <div>
        <button class="btn btn-sm btn-outline-secondary edit-trip" 
          data-trip-id="${trip.id}">Edit</button>
        <button class="btn btn-sm btn-outline-danger delete-trip" 
          data-trip-id="${trip.id}">Delete</button>
      </div>
    `;
    list.appendChild(li);
  });
}