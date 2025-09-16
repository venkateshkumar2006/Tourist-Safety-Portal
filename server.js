const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

let requests = [];

app.post('/request-access', (req, res) => {
    const { username } = req.body;
    const isExisting = requests.some(req => req.name === username);
    if (isExisting) {
        return res.status(409).json({ message: 'A request for this user already exists.' });
    }
    const newRequest = {
        name: username,
        id: Date.now(),
        status: 'pending',
        request_time: new Date().toLocaleString(),
        sos_requests: [],
        has_admin_sos_alert: false,
        latitude: null,
        longitude: null,
        accuracy: null
    };
    requests.push(newRequest);
    console.log(`New request received: ${username}`);
    res.json({ message: 'Request submitted successfully!' });
});

app.post('/sos-request', (req, res) => {
    const { username } = req.body;
    const user = requests.find(req => req.name === username && req.status === 'accepted');
    if (user) {
        const newSOS = {
            sos_time: new Date().toLocaleString(),
            latitude: user.latitude,
            longitude: user.longitude,
            accuracy: user.accuracy,
            message: `SOS sent from ${username}`
        };
        user.sos_requests.push(newSOS);
        console.log(`SOS ALERT: User "${username}" sent an emergency signal from Lat: ${user.latitude}, Long: ${user.longitude} with an accuracy of ±${user.accuracy.toFixed(2)}m at ${newSOS.sos_time}.`);
        res.status(200).json({ message: 'SOS request sent successfully.' });
    } else {
        res.status(404).json({ message: 'User not found or not approved.' });
    }
});

app.post('/update-location', (req, res) => {
    const { username, latitude, longitude, accuracy } = req.body;
    const user = requests.find(req => req.name === username && req.status === 'accepted');
    if (user) {
        user.latitude = latitude;
        user.longitude = longitude;
        user.accuracy = accuracy;
        res.status(200).json({ message: 'Location updated.' });
    } else {
        res.status(404).json({ message: 'User not found or not approved.' });
    }
});

app.post('/admin-sos-alert', (req, res) => {
    const { username } = req.body;
    const user = requests.find(req => req.name === username && req.status === 'accepted');
    if (user) {
        user.has_admin_sos_alert = true;
        res.status(200).json({ message: 'Admin SOS alert sent.' });
    } else {
        res.status(404).json({ message: 'User not found or not approved.' });
    }
});

app.post('/acknowledge-sos', (req, res) => {
    const { username } = req.body;
    const user = requests.find(req => req.name === username);
    if (user) {
        user.sos_requests = [];
        res.status(200).json({ message: 'SOS acknowledged.' });
    } else {
        res.status(404).json({ message: 'User not found.' });
    }
});

app.post('/acknowledge-admin-sos', (req, res) => {
    const { username } = req.body;
    const user = requests.find(req => req.name === username);
    if (user) {
        user.has_admin_sos_alert = false;
        res.status(200).json({ message: 'Admin SOS acknowledged.' });
    } else {
        res.status(404).json({ message: 'User not found.' });
    }
});

app.get('/get-requests', (req, res) => {
    res.json(requests);
});

app.post('/update-request', (req, res) => {
    const { id, status } = req.body;
    const requestToUpdate = requests.find(req => req.id === id);
    if (requestToUpdate) {
        requestToUpdate.status = status;
        if (status === 'accepted') {
            requestToUpdate.approved_time = new Date().toLocaleString();
            requestToUpdate.random_id = Math.random().toString(36).substring(2, 12);
        }
        console.log(`Request ID ${id} updated to ${status}`);
        res.json({ message: 'Request status updated.' });
    } else {
        res.status(404).json({ message: 'Request not found.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});