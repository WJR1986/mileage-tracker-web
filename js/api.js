// js/api.js

import { getAuthHeader } from './auth.js';

const ADDRESS_ENDPOINT = '/.netlify/functions/hello';
const TRIP_ENDPOINT = '/.netlify/functions/save-trip';
const MILEAGE_ENDPOINT = '/.netlify/functions/calculate-mileage';

export async function fetchAddresses() {
  const headers = await getAuthHeader();
  const res = await fetch(ADDRESS_ENDPOINT, { method: 'GET', headers });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function saveAddress(addressText) {
  const headers = await getAuthHeader();
  const res = await fetch(ADDRESS_ENDPOINT, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: addressText })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function calculateMileage(addressArray) {
  const res = await fetch(MILEAGE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addresses: addressArray })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function fetchTripHistory(params = {}) {
  const headers = await getAuthHeader();
  const url = new URL(TRIP_ENDPOINT, window.location.origin);
  Object.entries(params).forEach(([key, val]) => val && url.searchParams.append(key, val));
  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function saveTrip(tripData, method = 'POST', tripId = null) {
  const headers = await getAuthHeader();
  const res = await fetch(TRIP_ENDPOINT, {
    method,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(method === 'PUT' ? { id: tripId, ...tripData } : tripData)
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function deleteTrip(tripId) {
  const headers = await getAuthHeader();
  const res = await fetch(TRIP_ENDPOINT, {
    method: 'DELETE',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: tripId })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}
