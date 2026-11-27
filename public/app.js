'use strict';

// Stores frequently used page elements and the current sign-in state.
const message = document.getElementById('message');
const authPanel = document.getElementById('auth-panel');
const accountPanel = document.getElementById('account-panel');
const adminPanel = document.getElementById('admin-panel');
const bookingsPanel = document.getElementById('bookings-panel');
const authForm = document.getElementById('auth-form');
const authMode = document.getElementById('auth-mode');
const tokenKey = 'stay-local-token';

let token = localStorage.getItem(tokenKey);
let currentUser = null;
let cities = [];

// Escapes text before placing database values into generated HTML.
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

// Shows a success or error message at the top of the page.
function showMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle('error', Boolean(isError));
    message.classList.remove('hidden');
}

// Sends requests to the backend and adds the current user's token when present.
async function api(url, options) {
    const request = options || {};
    const headers = { ...(request.headers || {}) };
    if (request.body && typeof request.body !== 'string') {
        request.body = JSON.stringify(request.body);
        headers['Content-Type'] = 'application/json';
    }
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { ...request, headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401 && token) logout(false);
        throw new Error(body.error || 'The request could not be completed.');
    }
    return body;
}

// Shows the correct page sections for a guest, admin, or signed-out visitor.
function renderSession() {
    const signedIn = Boolean(currentUser);
    authPanel.classList.toggle('hidden', signedIn);
    accountPanel.classList.toggle('hidden', !signedIn);
    adminPanel.classList.toggle('hidden', !signedIn || currentUser.role !== 'hotelAdmin');
    bookingsPanel.classList.toggle('hidden', !signedIn || currentUser.role !== 'user');
    document.getElementById('session-label').textContent = signedIn
        ? `${currentUser.name} · ${currentUser.role === 'hotelAdmin' ? 'Hotel administrator' : 'Guest'}`
        : 'Book a hotel time slot';
    document.getElementById('welcome').textContent = signedIn ? `Welcome, ${currentUser.name}` : '';
}

// Clears the saved token and returns the page to its signed-out state.
function logout(showNotice) {
    token = null;
    currentUser = null;
    localStorage.removeItem(tokenKey);
    renderSession();
    if (showNotice) showMessage('You have signed out.', false);
}

// Displays the signed-in guest's saved bookings.
function renderBookings(bookings) {
    const target = document.getElementById('bookings');
    if (!bookings.length) {
        target.innerHTML = '<p class="muted">You do not have any bookings yet.</p>';
        return;
    }
    target.innerHTML = bookings.slice().reverse().map((booking) => `
        <div class="booking-row">
            <strong>${escapeHtml(booking.hotelName)}</strong> · ${escapeHtml(booking.cityName)}
            <div class="muted">${escapeHtml(booking.date)} · ${escapeHtml(booking.startTime)}–${escapeHtml(booking.endTime)}
                · ${escapeHtml(booking.guests)} guest(s) · ${escapeHtml(booking.price)} per guest</div>
        </div>`).join('');
}

// Loads editable hotel forms for hotels owned by the signed-in admin.
async function loadAdminHotels() {
    if (!currentUser || currentUser.role !== 'hotelAdmin') return;
    const { hotels } = await api('/api/admin/hotels');
    const target = document.getElementById('admin-hotels');
    if (!hotels.length) {
        target.innerHTML = '<p class="muted">No hotels are assigned to your account.</p>';
        return;
    }
    target.innerHTML = hotels.map((hotel) => `
        <form class="hotel-editor" data-hotel-id="${escapeHtml(hotel.id)}">
            <p class="muted">${escapeHtml(hotel.cityName)}</p>
            <label>Hotel name</label>
            <input name="name" value="${escapeHtml(hotel.name)}" maxlength="120" required>
            <label>Address</label>
            <input name="address" value="${escapeHtml(hotel.address)}" maxlength="300" required>
            <label>Description</label>
            <textarea name="description" maxlength="2000">${escapeHtml(hotel.description)}</textarea>
            <label>Time slots (JSON)</label>
            <textarea name="slots" required>${escapeHtml(JSON.stringify(hotel.slots.map((slot) => ({
                _id: slot.id,
                startTime: slot.startTime,
                endTime: slot.endTime,
                capacity: slot.capacity,
                price: slot.price
            })), null, 2))}</textarea>
            <button type="submit">Save hotel details</button>
        </form>`).join('<hr>');
}

// Builds the public list of cities, hotels, time slots, and booking forms.
function renderCities() {
    const target = document.getElementById('city-list');
    if (!cities.length) {
        target.innerHTML = '<div class="panel"><p>No hotels are listed yet. An operator can add the first hotel using the setup form below.</p></div>';
        return;
    }
    target.innerHTML = cities.map((city) => `
        <section class="panel" style="grid-column:1/-1">
            <div class="eyebrow">${escapeHtml(city.name)}</div>
            <div class="grid">${city.hotels.map((hotel) => `
                <article class="hotel-card">
                    <h3>${escapeHtml(hotel.name)}</h3>
                    <div class="muted">${escapeHtml(hotel.address)}</div>
                    <p>${escapeHtml(hotel.description || 'Welcome to our hotel.')}</p>
                    ${hotel.slots.map((slot) => `
                        <div class="slot">
                            <div>
                                <strong>${escapeHtml(slot.startTime)}–${escapeHtml(slot.endTime)}</strong><br>
                                <span class="muted availability-label" data-capacity="${escapeHtml(slot.capacity)}">${escapeHtml(slot.capacity)} places per day · ${escapeHtml(slot.price)} per guest</span>
                            </div>
                            <span class="badge availability-badge">Per-day slot</span>
                            ${currentUser && currentUser.role === 'user' && slot.available > 0 ? `
                                <form class="booking-form" data-city-id="${escapeHtml(city.id)}" data-hotel-id="${escapeHtml(hotel.id)}" data-slot-id="${escapeHtml(slot.id)}">
                                    <label>Date<input name="date" type="date" min="${new Date().toISOString().slice(0, 10)}" required></label>
                                    <label>Guests<input name="guests" type="number" min="1" max="${Math.min(slot.available, 50)}" value="1" required></label>
                                    <button type="submit">Book this time</button>
                                </form>` : ''}
                            ${!currentUser && slot.available > 0 ? '<span class="muted">Sign in as a guest to book</span>' : ''}
                        </div>`).join('')}
                </article>`).join('')}</div>
        </section>`).join('');
}

// Refreshes public hotel data and any signed-in account information.
async function refresh() {
    try {
        cities = await api('/api/cities');
        renderCities();
        if (token) {
            const result = await api('/api/me');
            currentUser = result.user;
            renderSession();
            if (currentUser.role === 'user') renderBookings(currentUser.bookings);
            if (currentUser.role === 'hotelAdmin') await loadAdminHotels();
            renderCities();
        }
    } catch (error) {
        showMessage(error.message, true);
    }
}

// Shows or hides the name field when the account mode changes.
authMode.addEventListener('change', () => {
    const isRegister = authMode.value === 'register';
    document.getElementById('register-name-wrap').classList.toggle('hidden', !isRegister);
    document.getElementById('register-name').required = isRegister;
    document.getElementById('auth-password').autocomplete = isRegister ? 'new-password' : 'current-password';
});

// Submits either the guest registration form or the sign-in form.
authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const isRegister = authMode.value === 'register';
    const payload = {
        email: document.getElementById('auth-email').value,
        password: document.getElementById('auth-password').value
    };
    if (isRegister) payload.name = document.getElementById('register-name').value;
    try {
        const result = await api(`/api/auth/${isRegister ? 'register' : 'login'}`, { method: 'POST', body: payload });
        token = result.token;
        localStorage.setItem(tokenKey, token);
        currentUser = result.user;
        renderSession();
        await refresh();
        showMessage('You are signed in.', false);
    } catch (error) {
        showMessage(error.message, true);
    }
});

// Signs the current account out when the button is clicked.
document.getElementById('logout').addEventListener('click', () => logout(true));

// Creates a hotel-admin account and its first hotel using the operator token.
document.getElementById('setup-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    let slots;
    try {
        slots = JSON.parse(document.getElementById('setup-slots').value);
        const response = await fetch('/api/setup/hotel-admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Setup-Token': document.getElementById('setup-token').value
            },
            body: JSON.stringify({
                name: document.getElementById('setup-admin-name').value,
                email: document.getElementById('setup-email').value,
                password: document.getElementById('setup-password').value,
                cityName: document.getElementById('setup-city').value,
                hotelName: document.getElementById('setup-hotel').value,
                address: document.getElementById('setup-address').value,
                description: document.getElementById('setup-description').value,
                slots
            })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Administrator setup failed.');
        token = result.token;
        localStorage.setItem(tokenKey, token);
        currentUser = result.user;
        renderSession();
        await refresh();
        showMessage('Hotel administrator and hotel created.', false);
    } catch (error) {
        showMessage(error instanceof SyntaxError ? 'Time slots must be valid JSON.' : error.message, true);
    }
});

// Handles booking submissions and hotel-admin edits from generated forms.
document.addEventListener('submit', async (event) => {
    if (event.target.matches('.booking-form')) {
        event.preventDefault();
        if (!currentUser || currentUser.role !== 'user') {
            showMessage('Sign in with a guest account before booking.', true);
            return;
        }
        const form = event.target;
        const data = new FormData(form);
        try {
            await api('/api/bookings', {
                method: 'POST',
                body: {
                    cityId: form.dataset.cityId,
                    hotelId: form.dataset.hotelId,
                    slotId: form.dataset.slotId,
                    date: data.get('date'),
                    guests: Number(data.get('guests'))
                }
            });
            await refresh();
            showMessage('Your hotel time has been booked.', false);
        } catch (error) {
            showMessage(error.message, true);
        }
    }

    if (event.target.matches('.hotel-editor')) {
        event.preventDefault();
        const form = event.target;
        let slots;
        try {
            slots = JSON.parse(new FormData(form).get('slots'));
            await api(`/api/admin/hotels/${encodeURIComponent(form.dataset.hotelId)}`, {
                method: 'PATCH',
                body: {
                    name: new FormData(form).get('name'),
                    address: new FormData(form).get('address'),
                    description: new FormData(form).get('description'),
                    slots
                }
            });
            await refresh();
            showMessage('Your hotel details have been saved.', false);
        } catch (error) {
            showMessage(error instanceof SyntaxError ? 'Time slots must be valid JSON.' : error.message, true);
        }
    }
});

// Checks date-specific availability when a guest selects a booking date.
document.addEventListener('change', async (event) => {
    const dateInput = event.target;
    if (!dateInput.matches('.booking-form input[name="date"]') || !dateInput.value) return;

    const form = dateInput.closest('.booking-form');
    const query = new URLSearchParams({
        cityId: form.dataset.cityId,
        hotelId: form.dataset.hotelId,
        slotId: form.dataset.slotId,
        date: dateInput.value
    });
    try {
        const result = await api(`/api/availability?${query}`);
        if (dateInput.value !== result.date) return;
        const label = form.closest('.slot').querySelector('.availability-label');
        const badge = form.closest('.slot').querySelector('.availability-badge');
        const submit = form.querySelector('button[type="submit"]');
        const guests = form.elements.guests;
        label.textContent = `${result.available} of ${result.capacity} available for ${result.date}`;
        badge.textContent = result.available > 0 ? 'Available' : 'Full';
        guests.max = Math.min(result.available, 50);
        guests.disabled = result.available < 1;
        submit.disabled = result.available < 1;
    } catch (error) {
        showMessage(error.message, true);
    }
});

// Prepares the page and loads its initial hotel data.
renderSession();
refresh();
