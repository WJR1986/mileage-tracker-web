import { utils } from './utils.js';
import { REIMBURSEMENT_RATE_PER_MILE } from './config.js';

export const uiRenderer = {
    renderAddresses: (addresses, elements) => {
        elements.addressList.innerHTML = '';
        
        if (!addresses || addresses.length === 0) {
            const placeholder = document.createElement('li');
            placeholder.classList.add('list-group-item', 'text-muted');
            placeholder.textContent = 'No saved addresses yet. Add your first address above!';
            elements.addressList.appendChild(placeholder);
            return;
        }

        addresses.forEach(address => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
            
            const addressText = document.createElement('span');
            addressText.textContent = address.address_text;
            
            const addButton = document.createElement('button');
            addButton.classList.add('btn', 'btn-primary', 'btn-sm');
            addButton.textContent = 'Add to Trip';
            addButton.addEventListener('click', () => {
                elements.tripSequence.push(address);
                this.renderTripSequence(elements);
            });

            listItem.appendChild(addressText);
            listItem.appendChild(addButton);
            elements.addressList.appendChild(listItem);
        });
    },

    renderTripSequence: (tripSequence, elements) => {
        elements.tripSequenceList.innerHTML = '';
        
        if (tripSequence.length === 0) {
            const placeholder = document.createElement('li');
            placeholder.classList.add('list-group-item', 'text-muted');
            placeholder.textContent = 'Select addresses above to build your trip...';
            elements.tripSequenceList.appendChild(placeholder);
            elements.clearTripSequenceButton.style.display = 'none';
            return;
        }

        tripSequence.forEach((address, index) => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
            
            const addressText = document.createElement('span');
            addressText.textContent = `${index + 1}. ${address.address_text}`;
            
            const removeButton = document.createElement('button');
            removeButton.classList.add('btn', 'btn-outline-danger', 'btn-sm');
            removeButton.innerHTML = '<i class="bi bi-x-circle"></i>';
            removeButton.addEventListener('click', () => {
                tripSequence.splice(index, 1);
                this.renderTripSequence(elements);
            });

            listItem.appendChild(addressText);
            listItem.appendChild(removeButton);
            elements.tripSequenceList.appendChild(listItem);
        });

        elements.clearTripSequenceButton.style.display = 'block';
        elements.calculateMileageButton.disabled = tripSequence.length < 2;
    },

    renderMileageResults: (results, tripSequence, elements) => {
        const totalDistanceMiles = parseFloat(results.totalDistance.replace(' miles', ''));
        const reimbursement = totalDistanceMiles * REIMBURSEMENT_RATE_PER_MILE;
        
        elements.totalDistancePara.textContent = `Total Distance (${tripSequence.length} Stops): ${results.totalDistance}`;
        elements.potentialReimbursementPara.textContent = `Potential Reimbursement: £${reimbursement.toFixed(2)}`;
        
        elements.tripLegsList.innerHTML = '';
        results.legDistances.forEach((leg, index) => {
            const li = document.createElement('li');
            li.classList.add('list-group-item');
            li.textContent = `Leg ${index + 1}: ${tripSequence[index].address_text} to ${tripSequence[index + 1].address_text} - ${leg}`;
            elements.tripLegsList.appendChild(li);
        });
        
        elements.mileageResultsDiv.style.display = 'block';
        elements.saveTripButton.style.display = 'block';
    },

    renderTripHistory: (trips, elements) => {
        elements.tripHistoryList.innerHTML = '';
        
        if (!trips || trips.length === 0) {
            const placeholder = document.createElement('li');
            placeholder.classList.add('list-group-item', 'text-muted');
            placeholder.textContent = 'No trip history available yet.';
            elements.tripHistoryList.appendChild(placeholder);
            return;
        }

        trips.forEach(trip => {
            const li = document.createElement('li');
            li.classList.add('list-group-item', 'list-group-item-action', 'd-flex', 'justify-content-between', 'align-items-center');
            
            const tripDate = new Date(trip.trip_datetime || trip.created_at);
            const formattedDate = utils.formatDateTime(tripDate);
            
            const content = document.createElement('div');
            content.innerHTML = `
                <strong>Trip on ${formattedDate.date} ${formattedDate.time}</strong><br>
                Distance: ${trip.total_distance_miles?.toFixed(2) || '--'} miles<br>
                Reimbursement: £${trip.reimbursement_amount?.toFixed(2) || '--'}
            `;
            
            const actions = document.createElement('div');
            actions.innerHTML = `
                <button class="btn btn-outline-secondary btn-sm edit-btn" data-id="${trip.id}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger btn-sm ms-2 delete-btn" data-id="${trip.id}">
                    <i class="bi bi-trash"></i>
                </button>
            `;

            li.appendChild(content);
            li.appendChild(actions);
            elements.tripHistoryList.appendChild(li);
        });
    }
};