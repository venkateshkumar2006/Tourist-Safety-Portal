document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordContainer = document.getElementById('password-container');
    const passwordInput = document.getElementById('password');
    const message = document.getElementById('message');

    // --- Login Page Logic ---
    if (loginForm) {
        let statusCheckInterval;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = usernameInput.value;

            if (username === 'VKDSEDITZ') {
                passwordContainer.style.display = 'block';
                const adminPassword = passwordInput.value;
                if (adminPassword === 'VKDS123') {
                    window.location.href = 'admin-portal.html';
                } else if (adminPassword.length > 0) {
                    message.textContent = 'Incorrect password.';
                    message.style.color = 'red';
                }
            } else {
                try {
                    const response = await fetch('/request-access', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username })
                    });
                    const result = await response.json();
                    message.textContent = result.message;
                    message.style.color = response.ok ? 'green' : 'red';
                    passwordContainer.style.display = 'none';

                    if (response.ok) {
                        sessionStorage.setItem('username', username);
                        
                        clearInterval(statusCheckInterval);
                        statusCheckInterval = setInterval(async () => {
                            try {
                                const statusResponse = await fetch('/get-requests');
                                const allRequests = await statusResponse.json();
                                const userRequest = allRequests.find(req => req.name === username);

                                if (userRequest) {
                                    if (userRequest.status === 'accepted') {
                                        message.textContent = `Your request has been approved! Redirecting...`;
                                        message.style.color = 'green';
                                        clearInterval(statusCheckInterval);
                                        window.location.href = 'user-portal.html';
                                    } else if (userRequest.status === 'rejected') {
                                        message.textContent = `Your request has been rejected.`;
                                        message.style.color = 'red';
                                        clearInterval(statusCheckInterval);
                                    } else if (userRequest.status === 'logged_out') {
                                        message.textContent = `You have been logged out.`;
                                        message.style.color = 'orange';
                                        clearInterval(statusCheckInterval);
                                        window.location.href = 'index.html';
                                    }
                                }
                            } catch (error) {
                                console.error('Failed to check status:', error);
                            }
                        }, 3000);
                    }

                } catch (error) {
                    message.textContent = 'Failed to submit request.';
                    message.style.color = 'red';
                }
            }
        });

        usernameInput.addEventListener('input', () => {
            if (usernameInput.value === 'VKDSEDITZ') {
                passwordContainer.style.display = 'block';
                message.textContent = '';
            } else {
                passwordContainer.style.display = 'none';
                message.textContent = '';
            }
        });
    }

    // --- Admin Portal Logic ---
    const adminContainer = document.querySelector('.admin-portal-container');
    if (adminContainer) {
        const pendingList = document.getElementById('pending-list');
        const acceptedList = document.getElementById('accepted-list');
        const rejectedList = document.getElementById('rejected-list');
        const loggedOutList = document.getElementById('logged-out-list');
        const sosList = document.getElementById('sos-list');
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        
        const adminLogoutBtn = document.getElementById('admin-logout-btn');
        if (adminLogoutBtn) {
            adminLogoutBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
        
        const adminTabsContainer = document.getElementById('admin-tabs-container');
        adminTabsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button') || event.target.closest('.tab-button')) {
                const button = event.target.closest('.tab-button');
                const tabId = button.dataset.tab;
                
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                tabContents.forEach(content => content.classList.add('hidden'));
                document.getElementById(tabId).classList.remove('hidden');
                
                fetchAndRenderAllRequests();
            }
        });

        async function fetchAndRenderAllRequests() {
            try {
                const response = await fetch('/get-requests');
                const allRequests = await response.json();
                
                const pending = allRequests.filter(req => req.status === 'pending');
                const accepted = allRequests.filter(req => req.status === 'accepted');
                const rejected = allRequests.filter(req => req.status === 'rejected');
                const loggedOut = allRequests.filter(req => req.status === 'logged_out');
                const sos = allRequests.filter(req => req.sos_requests.length > 0 || req.has_admin_sos_alert);

                // Update tab counters
                document.getElementById('pending-count').textContent = pending.length;
                document.getElementById('accepted-count').textContent = accepted.length;
                document.getElementById('rejected-count').textContent = rejected.length;
                document.getElementById('logged-out-count').textContent = loggedOut.length;
                document.getElementById('sos-count').textContent = sos.length;

                renderRequests(pendingList, pending, 'pending');
                renderRequests(acceptedList, accepted, 'accepted');
                renderRequests(rejectedList, rejected, 'rejected');
                renderRequests(loggedOutList, loggedOut, 'logged_out');
                renderRequests(sosList, sos, 'sos');

            } catch (error) {
                console.error('Failed to fetch requests:', error);
            }
        }
        
        setInterval(fetchAndRenderAllRequests, 3000);

        async function handleRequestAction(event) {
            const target = event.target;
            const listItem = target.closest('li');
            if (!listItem) return;
            const userId = parseInt(target.dataset.id);

            const isAcceptBtn = target.classList.contains('accept-btn');
            const isRejectBtn = target.classList.contains('reject-btn');
            const isLogoutBtn = target.classList.contains('logout-btn');
            const isAdminSOSBtn = target.classList.contains('admin-sos-btn');

            let newStatus;
            let endpoint;

            if (isAcceptBtn) {
                newStatus = 'accepted';
                endpoint = '/update-request';
            } else if (isRejectBtn) {
                newStatus = 'rejected';
                endpoint = '/update-request';
            } else if (isLogoutBtn) {
                newStatus = 'logged_out';
                endpoint = '/update-request';
            } else if (isAdminSOSBtn) {
                const user = (await (await fetch('/get-requests')).json()).find(req => req.id === userId);
                if (user) {
                    await fetch('/admin-sos-alert', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: user.name })
                    });
                }
                return;
            }

            if (endpoint) {
                try {
                    await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: userId, status: newStatus })
                    });
                    fetchAndRenderAllRequests();
                } catch (error) {
                    console.error('Failed to update request status:', error);
                }
            }
        }

        function renderRequests(list, data, listType) {
            list.innerHTML = '';
            if (data.length === 0) {
                list.innerHTML = `<li class="empty-state">No ${listType.replace('_', ' ')} requests</li>`;
                return;
            }

            data.forEach(user => {
                const listItem = document.createElement('li');
                let buttonsHtml = '';
                
                if (listType === 'pending') {
                    buttonsHtml = `
                        <button class="accept-btn" data-id="${user.id}">Accept</button>
                        <button class="reject-btn" data-id="${user.id}">Reject</button>
                    `;
                } else if (listType === 'accepted') {
                    buttonsHtml = `
                        <button class="admin-sos-btn" data-id="${user.id}">SOS</button>
                        <button class="logout-btn" data-id="${user.id}">Logout</button>
                    `;
                }

                if (listType === 'sos') {
                    const sosAlerts = user.sos_requests.length > 0 ? user.sos_requests : (user.has_admin_sos_alert ? [{ sos_time: "Admin Alert" }] : []);
                    sosAlerts.forEach(sos => {
                        const sosItem = document.createElement('li');
                        sosItem.classList.add('sos-request-item');
                        let geoDetails = '';
                        if (sos.latitude && sos.longitude) {
                            const mapsUrl = `https://www.google.com/maps?q=${sos.latitude},${sos.longitude}`;
                            geoDetails = `<br><small>Location: Lat ${sos.latitude.toFixed(4)}, Long ${sos.longitude.toFixed(4)}</small><br><a href="${mapsUrl}" target="_blank" class="map-link">View on Map</a>`;
                        }

                        let timeDisplay = sos.sos_time ? `<br><small>SOS Time: ${sos.sos_time}</small>` : '';

                        sosItem.innerHTML = `
                            <div><strong>${user.name}</strong>${timeDisplay}${geoDetails}</div>
                        `;
                        list.appendChild(sosItem);
                    });
                    return;
                }

                let userDetails = `<div><strong>${user.name}</strong>`;

                if (user.request_time) {
                    userDetails += `<br><small>Request Time: ${user.request_time}</small>`;
                }
                if (user.approved_time) {
                    userDetails += `<br><small>Approved Time: ${user.approved_time}</small>`;
                }
                if (user.random_id) {
                    userDetails += `<br><small>ID: ${user.random_id}</small>`;
                }
                if (listType === 'accepted') {
                    if (user.latitude && user.longitude) {
                        userDetails += `<br><small>Live Location: Lat ${user.latitude.toFixed(4)}, Long ${user.longitude.toFixed(4)}</small>`;
                        if (user.accuracy) {
                             userDetails += `<br><small>Accuracy: ±${user.accuracy.toFixed(2)}m</small>`;
                        }
                        userDetails += `<br><a href="https://www.google.com/maps?q=${user.latitude},${user.longitude}" target="_blank" class="map-link">View Live Location</a>`;
                    } else {
                        userDetails += `<br><small>Awaiting live location...</small>`;
                    }
                }
                userDetails += `</div>`;

                listItem.innerHTML = `
                    ${userDetails}
                    <div class="action-buttons">
                        ${buttonsHtml}
                    </div>
                `;
                list.appendChild(listItem);
            });
        }

        pendingList.addEventListener('click', handleRequestAction);
        acceptedList.addEventListener('click', handleRequestAction);
        
        window.showTab = function(tabId) {
            tabButtons.forEach(button => button.classList.remove('active'));
            document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
            tabContents.forEach(content => content.classList.add('hidden'));
            document.getElementById(tabId).classList.remove('hidden');
            fetchAndRenderAllRequests();
        };

        const initialTab = document.querySelector('.tab-button.active');
        if(initialTab) {
            window.showTab(initialTab.dataset.tab);
        } else {
            fetchAndRenderAllRequests();
        }
    }

    // --- User Portal Logic ---
    const userPortalContainer = document.querySelector('.user-portal-container');
    if (userPortalContainer) {
        let userDetailsInterval;
        const username = sessionStorage.getItem('username');

        async function getUserDetails() {
            try {
                const response = await fetch('/get-requests');
                const allRequests = await response.json();
                const user = allRequests.find(req => req.name === username);

                if (user && user.status === 'accepted') {
                    document.getElementById('username-display').textContent = user.name;
                    document.getElementById('request-time-display').textContent = user.request_time;
                    document.getElementById('approved-time-display').textContent = user.approved_time;
                    document.getElementById('random-id-display').textContent = user.random_id;

                    const adminSOSAlert = document.getElementById('admin-sos-alert');
                    if (user.has_admin_sos_alert) {
                        adminSOSAlert.style.display = 'block';
                        // After a delay, send the acknowledgement
                        setTimeout(async () => {
                             await fetch('/acknowledge-admin-sos', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username })
                            });
                        }, 30000); // 30-second delay
                    } else {
                        adminSOSAlert.style.display = 'none';
                    }

                } else {
                    clearInterval(userDetailsInterval);
                    window.location.href = 'index.html';
                }
            } catch (error) {
                console.error('Failed to fetch user details:', error);
                clearInterval(userDetailsInterval);
                window.location.href = 'index.html';
            }
        }
        
        if (username) {
            userDetailsInterval = setInterval(getUserDetails, 3000);
        } else {
            window.location.href = 'index.html';
        }
        
        const userLogoutBtn = document.getElementById('logout-btn');
        if (userLogoutBtn) {
            userLogoutBtn.addEventListener('click', async () => {
                const user = (await (await fetch('/get-requests')).json()).find(req => req.name === username);
                if (user) {
                    await fetch('/update-request', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: user.id, status: 'logged_out' })
                    });
                }
                sessionStorage.removeItem('username');
                clearInterval(userDetailsInterval);
                window.location.href = 'index.html';
            });
        }
        
        const locationStatus = document.getElementById('location-status');
        let userLatitude = null;
        let userLongitude = null;
        let userAccuracy = null;

        // Get user location on page load
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                userLatitude = position.coords.latitude;
                userLongitude = position.coords.longitude;
                userAccuracy = position.coords.accuracy;
                locationStatus.textContent = 'Location tracking is active.';
                
                // Start continuous tracking
                navigator.geolocation.watchPosition((position) => {
                    userLatitude = position.coords.latitude;
                    userLongitude = position.coords.longitude;
                    userAccuracy = position.coords.accuracy;
                    locationStatus.textContent = `Location tracking is active. Accuracy: ±${userAccuracy.toFixed(2)}m`;
                    // Send location to server
                    sendLocationToServer(username, userLatitude, userLongitude, userAccuracy);
                }, (error) => {
                    console.error('Location watch failed:', error.message);
                }, { enableHighAccuracy: true });

            }, (error) => {
                locationStatus.textContent = `Location access denied: ${error.message}`;
            }, { enableHighAccuracy: true });
        } else {
            locationStatus.textContent = 'Geolocation is not supported by your browser.';
        }

        async function sendLocationToServer(username, latitude, longitude, accuracy) {
            try {
                await fetch('/update-location', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, latitude, longitude, accuracy })
                });
            } catch (error) {
                console.error('Failed to send location to server:', error);
            }
        }

        const sosBtn = document.getElementById('sos-btn');
        if (sosBtn) {
            sosBtn.addEventListener('click', async () => {
                const username = sessionStorage.getItem('username');
                if (username) {
                    try {
                        const response = await fetch('/sos-request', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                username: username,
                                latitude: userLatitude,
                                longitude: userLongitude
                            })
                        });
                        if (response.ok) {
                            alert('Your SOS request has been sent to the admin!');
                        } else {
                            alert('Failed to send SOS request.');
                        }
                    } catch (error) {
                        alert('Failed to send SOS request.');
                        console.error('SOS failed:', error);
                    }
                }
            });
        }
    }
});