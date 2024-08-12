import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js';
import { getFirestore, collection, addDoc, doc, updateDoc, getDoc, getDocs, deleteDoc, query } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAjFkdDSbmHF2sTfeMKMkcl2L4tAdmdwqw",
    authDomain: "coretrex-forecast.firebaseapp.com",
    projectId: "coretrex-forecast",
    storageBucket: "coretrex-forecast.appspot.com",
    messagingSenderId: "619634948025",
    appId: "1:619634948025:web:229017572239cb7cfd2868"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let clientId = 0;
let totalRevenue = 0;
let mrrRiskRevenue = 0;
let totalClients = 0;
let totalSolid = 0;
let totalRisk = 0;
let totalTerminated = 0;
let forecastRevenue = 0;
let forecastClients = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await loadPods();  // Ensure pods are loaded first
    await loadClients(); // Then load clients
    checkLoginState(); // Check if the user is already logged in
});

function checkPassword() {
    const password = document.getElementById('password').value;
    if (password === '2020') {
        localStorage.setItem('isLoggedIn', 'true'); // Save login state
        showMainContent();
    } else {
        alert('Incorrect password');
    }
}

function checkLoginState() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        showMainContent();
    }
}

function showMainContent() {
    document.getElementById('password-section').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
}

async function addClientToPod(podId) {
    const pod = document.getElementById(podId).closest('.pod');
    const clientNameInput = pod.querySelector('.clientName');
    const clientRetainerInput = pod.querySelector('.clientRetainer');
    const clientName = clientNameInput.value;
    const clientRetainer = parseFloat(clientRetainerInput.value);
    const podName = pod.querySelector('.pod-name').innerText;  // Get the pod name
    const clientStatus = 'solid';  // Default status for new clients

    if (clientName && clientRetainer) {
        // Add to Firestore
        try {
            const docRef = await addDoc(collection(db, 'clients'), {
                name: clientName,
                retainer: clientRetainer,
                podId: podId,
                podName: podName,  // Save the pod name
                status: clientStatus,  // Save the client status
                createdAt: new Date()
            });
            console.log("Document written with ID: ", docRef.id);

            // Create the client div and add it to the DOM
            const clientDiv = createClientDiv(docRef.id, clientName, clientRetainer);
            clientDiv.classList.add(clientStatus);  // Apply the status class
            const podElement = document.getElementById(podId);
            if (podElement) {
                podElement.appendChild(clientDiv);

                // Update the client metrics based on the initial status
                updateClientMetrics(clientDiv, clientRetainer, "add");

                updateMetrics();
                updatePodMetrics();
                sortClients(podId);

                clientNameInput.value = '';
                clientRetainerInput.value = '';
            } else {
                console.error(`Pod element with ID ${podId} not found.`);
            }
        } catch (e) {
            console.error("Error adding document: ", e);
        }
    } else {
        alert('Please enter client name and retainer.');
    }
}
window.addClientToPod = addClientToPod;

function createClientDiv(id, name, retainer) {
    const clientDiv = document.createElement('div');
    clientDiv.classList.add('client');
    clientDiv.id = `client-${id}`;
    clientDiv.setAttribute('draggable', true);
    clientDiv.ondragstart = dragStart;
    clientDiv.innerHTML = `
        <span class="client-info">${name}</span>
        <span class="client-details">$${retainer.toLocaleString()}</span>
        <div class="status-buttons">
            <button class="status-button solid" onclick="changeStatus('${clientDiv.id}', 'solid')">Solid</button>
            <button class="status-button risk" onclick="changeStatus('${clientDiv.id}', 'risk')">Risk</button>
            <button class="status-button terminated" onclick="changeStatus('${clientDiv.id}', 'terminated')">Terminated</button>
            <button class="status-button forecast" onclick="changeStatus('${clientDiv.id}', 'forecast')">Forecast</button>
        </div>
        <button class="edit" onclick="editClient('${clientDiv.id}', ${retainer})">Edit</button>
        <button class="delete" onclick="deleteClient('${clientDiv.id}', ${retainer})">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                <path d="M3 6h18v2H3V6zm2 2h14v14H5V8zm4 4v8h2v-8H9zm4 0v8h2v-8h-2zm4.667-8H20v2H4V4h2.333L7.5 2h9l1.167 2zM12 0H8L6 4H5v2h14V4h-1L16 0h-4z"/>
            </svg>
        </button>
    `;
    return clientDiv;
}

function dragStart(event) {
    event.dataTransfer.setData('text/plain', event.target.id);
}
window.dragStart = dragStart;

function allowDrop(event) {
    event.preventDefault();
}
window.allowDrop = allowDrop;

function drop(event) {
    event.preventDefault();
    const data = event.dataTransfer.getData('text/plain');
    const clientDiv = document.getElementById(data);
    const target = event.target.closest('.clients');

    if (target) {
        target.appendChild(clientDiv);
        updatePodMetrics();
        sortClients(target.id);
    }
}
window.drop = drop;

function deleteClient(clientId, clientRetainer) {
    const clientDiv = document.getElementById(clientId);

    // Remove the client from the Firestore database
    const clientDocId = clientId.split('-')[1]; // Extract the document ID from clientId
    deleteClientFromFirestore(clientDocId);

    updateClientMetrics(clientDiv, clientRetainer, "delete");
    clientDiv.remove();
    updateMetrics();
    updatePodMetrics();
}
window.deleteClient = deleteClient;

async function deleteClientFromFirestore(clientDocId) {
    try {
        const clientDocRef = doc(db, 'clients', clientDocId);
        await deleteDoc(clientDocRef);
        console.log(`Client with ID ${clientDocId} deleted from Firestore.`);
    } catch (e) {
        console.error(`Error deleting client with ID ${clientDocId} from Firestore: `, e);
    }
}

async function deletePod(podId) {
    const pod = document.getElementById(podId);
    const clients = pod.querySelectorAll('.client');

    // Delete all clients associated with this pod from Firestore
    await Promise.all(Array.from(clients).map(client => {
        const clientDetails = client.querySelector('.client-details').textContent;
        const retainer = parseFloat(clientDetails.replace('$', '').replace(/,/g, ''));
        const clientDocId = client.id.split('-')[1]; // Extract the document ID from clientId

        // Remove client from Firestore
        return deleteClientFromFirestore(clientDocId).then(() => {
            // Update metrics
            if (!client.classList.contains('terminated') && !client.classList.contains('forecast')) {
                totalRevenue -= retainer;
                totalClients -= 1;
                if (client.classList.contains('risk')) {
                    mrrRiskRevenue -= retainer;
                }
            } else if (client.classList.contains('forecast')) {
                forecastRevenue -= retainer;
                forecastClients -= 1;
            }
            if (client.classList.contains('solid')) totalSolid -= 1;
            else if (client.classList.contains('risk')) totalRisk -= 1;
            else if (client.classList.contains('terminated')) totalTerminated -= 1;
        });
    }));

    // Remove the pod from the Firestore database
    const podDocId = pod.getAttribute('data-firestore-id');
    deletePodFromFirestore(podDocId);

    pod.remove();
    updateMetrics();
    updatePodMetrics();
}
window.deletePod = deletePod;

async function deletePodFromFirestore(podDocId) {
    try {
        const podDocRef = doc(db, 'pods', podDocId);
        await deleteDoc(podDocRef);
        console.log(`Pod with ID ${podDocId} deleted from Firestore.`);
    } catch (e) {
        console.error(`Error deleting pod with ID ${podDocId} from Firestore: `, e);
    }
}

function editClient(clientId, oldRetainer) {
    const clientDiv = document.getElementById(clientId);
    const clientInfo = clientDiv.querySelector('.client-info');
    const clientName = clientInfo.textContent.trim();

    // Retrieve the dates from data attributes
    const startDate = clientDiv.getAttribute('data-start-date') || '';
    const endDate = clientDiv.getAttribute('data-end-date') || '';

    clientInfo.innerHTML = `
        <input type="text" value="${clientName}" id="editName-${clientId}">
        <input type="number" value="${oldRetainer}" id="editRetainer-${clientId}">
        <input type="date" id="editStartDate-${clientId}" placeholder="Start Date" value="${startDate}">
        <input type="date" id="editEndDate-${clientId}" placeholder="End Date" value="${endDate}">
        <button onclick="saveClient('${clientId}', ${oldRetainer})">Save</button>
    `;
}
window.editClient = editClient;

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
    }).replace(/\//g, '.');
}

async function saveClient(clientId, oldRetainer) {
    const clientName = document.getElementById(`editName-${clientId}`).value;
    const newRetainer = parseFloat(document.getElementById(`editRetainer-${clientId}`).value);
    const startDate = document.getElementById(`editStartDate-${clientId}`).value;
    const endDate = document.getElementById(`editEndDate-${clientId}`).value;

    if (clientName && newRetainer) {
        const clientDiv = document.getElementById(clientId);
        const clientInfo = clientDiv.querySelector('.client-info');
        const clientDetails = clientDiv.querySelector('.client-details');

        const formattedStartDate = startDate ? formatDate(startDate) : '';
        const formattedEndDate = endDate ? formatDate(endDate) : '';

        clientInfo.innerHTML = clientName;
        clientDetails.innerHTML = `$${newRetainer.toLocaleString()} - Start: ${formattedStartDate}`;
        if (formattedEndDate) {
            clientDetails.innerHTML += ` - End: ${formattedEndDate}`;
        }

        // Store the dates in data attributes
        clientDiv.setAttribute('data-start-date', startDate);
        clientDiv.setAttribute('data-end-date', endDate);

        // Update metrics for editing the client
        updateClientMetrics(clientDiv, newRetainer, "edit", oldRetainer);

        updateMetrics();
        updatePodMetrics();
        sortClients(clientDiv.closest('.clients').id);

        // Save the updated client information to Firestore
        try {
            const clientDocRef = doc(db, 'clients', clientId.split('-')[1]); // Extract Firestore ID from clientId
            await updateDoc(clientDocRef, {
                name: clientName,
                retainer: newRetainer,
                startDate: startDate ? new Date(startDate + 'T12:00:00') : null, // Save start date at noon
                endDate: endDate ? new Date(endDate + 'T12:00:00') : null // Save end date at noon
            });
            console.log("Client updated in Firestore.");
        } catch (e) {
            console.error("Error updating client in Firestore: ", e);
        }
    } else {
        alert('Please enter client name, retainer, start date, and end date.');
    }
}

window.saveClient = saveClient;

async function changeStatus(clientId, newStatus) {
    const clientDiv = document.getElementById(clientId);
    const oldStatus = ['solid', 'risk', 'terminated', 'forecast'].find(s => clientDiv.classList.contains(s)); // Get the old status
    clientDiv.classList.remove('solid', 'risk', 'terminated', 'forecast');
    clientDiv.classList.add(newStatus);

    const retainer = parseFloat(clientDiv.querySelector('.client-details').textContent.replace('$', '').replace(/,/g, ''));
    const podName = clientDiv.closest('.pod').querySelector('.pod-name').innerText;

    updateClientMetrics(clientDiv, retainer, "status-change", oldStatus, newStatus);

    updateMetrics();
    updatePodMetrics();
    sortClients(clientDiv.closest('.clients').id);

    // Update the status and pod name in Firestore
    try {
        const clientDocRef = doc(db, 'clients', clientId.split('-')[1]);
        await updateDoc(clientDocRef, {
            status: newStatus,
            podName: podName
        });
        console.log("Client status and pod name updated in Firestore.");
    } catch (e) {
        console.error("Error updating client status and pod name in Firestore: ", e);
    }
}

window.changeStatus = changeStatus;

function updateClientMetrics(clientDiv, retainer, operation, oldRetainer = 0, oldStatus = null, newStatus = null) {
    switch (operation) {
        case "add":
            if (!clientDiv.classList.contains('terminated') && !clientDiv.classList.contains('forecast')) {
                totalRevenue += retainer;
                totalClients += 1;
                if (clientDiv.classList.contains('solid')) totalSolid += 1;
                else if (clientDiv.classList.contains('risk')) {
                    totalRisk += 1;
                    mrrRiskRevenue += retainer;
                }
            } else if (clientDiv.classList.contains('terminated')) {
                totalTerminated += 1;
            } else if (clientDiv.classList.contains('forecast')) {
                forecastRevenue += retainer;
                forecastClients += 1;
            }
            break;
        case "delete":
            if (clientDiv.classList.contains('solid')) totalSolid -= 1;
            else if (clientDiv.classList.contains('risk')) {
                totalRisk -= 1;
                mrrRiskRevenue -= retainer;
            } else if (clientDiv.classList.contains('terminated')) totalTerminated -= 1;
            if (!clientDiv.classList.contains('terminated') && !clientDiv.classList.contains('forecast')) {
                totalRevenue -= retainer;
                totalClients -= 1;
            } else if (clientDiv.classList.contains('forecast')) {
                forecastRevenue -= retainer;
                forecastClients -= 1;
            }
            break;
        case "edit":
            if (!clientDiv.classList.contains('terminated') && !clientDiv.classList.contains('forecast')) {
                totalRevenue = totalRevenue - oldRetainer + retainer;
                if (clientDiv.classList.contains('risk')) {
                    mrrRiskRevenue = mrrRiskRevenue - oldRetainer + retainer;
                }
            } else if (clientDiv.classList.contains('forecast')) {
                forecastRevenue = forecastRevenue - oldRetainer + retainer;
            }
            break;
        case "status-change":
            if (newStatus === 'forecast') {
                clientDiv.style.color = '#696969';
                clientDiv.style.backgroundColor = '#d3d3d3';
                if (oldStatus !== 'forecast') {
                    forecastRevenue += retainer;
                    forecastClients += 1;
                    if (oldStatus === 'solid') totalSolid -= 1;
                    else if (oldStatus === 'risk') {
                        totalRisk -= 1;
                        mrrRiskRevenue -= retainer;
                    } else if (oldStatus === 'terminated') totalTerminated -= 1;
                    if (oldStatus !== 'terminated') {
                        totalRevenue -= retainer;
                        totalClients -= 1;
                    }
                }
            } else {
                clientDiv.style.color = '';
                clientDiv.style.backgroundColor = '';
                if (oldStatus === 'forecast') {
                    forecastRevenue -= retainer;
                    forecastClients -= 1;
                }
                if (newStatus === 'solid') {
                    totalSolid += 1;
                } else if (newStatus === 'risk') {
                    totalRisk += 1;
                    mrrRiskRevenue += retainer;
                } else if (newStatus === 'terminated') {
                    totalTerminated += 1;
                }
                if (oldStatus !== 'terminated') {
                    totalRevenue += retainer;
                    totalClients += 1;
                }
            }
            break;
        default:
            console.error("Unknown operation:", operation);
    }

    updateMetrics();  // Ensure metrics are updated whenever client metrics are updated
}


function calculateAverageTenure() {
    let totalDays = 0;
    let count = 0;
    const today = new Date();

    document.querySelectorAll('.client').forEach(client => {
        if (!client.classList.contains('forecast')) {
            const startDate = client.getAttribute('data-start-date');
            const endDate = client.getAttribute('data-end-date');
            if (startDate) {
                const start = new Date(startDate);

                // Skip clients with start dates in the future
                if (start > today) return;

                const end = endDate ? new Date(endDate) : today;
                const tenure = (end - start) / (1000 * 60 * 60 * 24); // Convert from milliseconds to days
                totalDays += tenure;
                count++;
            }
        }
    });

    const avgTenure = count > 0 ? Math.round(totalDays / count) : 0;
    document.getElementById('avgTenureDays').innerText = avgTenure;
}


function calculateAverageLTV() {
    let totalLTV = 0;
    let count = 0;
    const today = new Date();

    document.querySelectorAll('.client').forEach(client => {
        if (!client.classList.contains('forecast')) {
            const startDate = client.getAttribute('data-start-date');
            const endDate = client.getAttribute('data-end-date');
            if (startDate) {
                const start = new Date(startDate);

                // Skip clients with start dates in the future
                if (start > today) return;

                const end = endDate ? new Date(endDate) : today;
                const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

                const retainer = parseFloat(client.querySelector('.client-details').textContent.replace('$', '').replace(/,/g, ''));
                const ltv = retainer * months;
                totalLTV += ltv;
                count++;
            }
        }
    });

    const avgLTV = count > 0 ? Math.round(totalLTV / count) : 0;
    document.getElementById('avgLTV').innerText = avgLTV.toLocaleString();
}


function updateMetrics() {
    document.getElementById('totalRevenue').innerText = totalRevenue.toLocaleString();
    document.getElementById('annualRevenue').innerText = (totalRevenue * 12).toLocaleString();
    document.getElementById('totalClients').innerText = totalClients.toLocaleString();
    document.getElementById('totalSolid').innerText = totalSolid.toLocaleString();
    document.getElementById('totalRisk').innerText = totalRisk.toLocaleString();
    document.getElementById('mrrRisk').innerText = mrrRiskRevenue.toLocaleString();
    document.getElementById('arrRisk').innerText = (mrrRiskRevenue * 12).toLocaleString();
    document.getElementById('totalTerminated').innerText = totalTerminated.toLocaleString();

    let forecastMRR = 0;
    let forecastARR = 0;
    let forecastClients = 0;
    document.querySelectorAll('.client').forEach(client => {
        if (!client.classList.contains('terminated')) {
            const retainer = parseFloat(client.querySelector('.client-details').textContent.replace('$', '').replace(/,/g, ''));
            forecastMRR += retainer;
            forecastClients += 1;
        }
    });
    forecastARR = forecastMRR * 12;

    document.getElementById('forecastMRR').innerText = forecastMRR.toLocaleString();
    document.getElementById('forecastARR').innerText = forecastARR.toLocaleString();
    document.getElementById('forecastClients').innerText = forecastClients.toLocaleString();

    // Update average tenure
    calculateAverageTenure();

    // Update average LTV
    calculateAverageLTV();
}

function updatePodMetrics() {
    document.querySelectorAll('.pod').forEach(pod => {
        let podRevenue = 0;
        let podSolid = 0;
        let podRisk = 0;
        let podTerminated = 0;
        let podActiveClientsCount = 0;
        let podForecastClientsCount = 0;

        pod.querySelectorAll('.client').forEach(client => {
            const clientDetails = client.querySelector('.client-details').textContent;
            const retainer = parseFloat(clientDetails.replace('$', '').replace(/,/g, ''));
            if (!client.classList.contains('terminated')) {
                podRevenue += retainer;
                podForecastClientsCount += 1; // Count all non-terminated clients for forecast
                if (!client.classList.contains('forecast')) {
                    podActiveClientsCount += 1; // Count only non-forecast, non-terminated clients for active
                }
            }
            if (client.classList.contains('solid')) podSolid += 1;
            else if (client.classList.contains('risk')) podRisk += 1;
            else if (client.classList.contains('terminated')) podTerminated += 1;
        });

        pod.querySelector('.podMRR span').innerText = podRevenue.toLocaleString();
        pod.querySelector('.podClients span').innerText = podActiveClientsCount.toLocaleString();
        pod.querySelector('.podClientsForecast span').innerText = podForecastClientsCount.toLocaleString();
    });
}

async function loadClients() {
    // Wait for all pods to load first
    await loadPods();

    // Clear the current display
    document.querySelectorAll('.clients').forEach(column => column.innerHTML = '');

    // Fetch all clients from Firestore
    const q = query(collection(db, 'clients'));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach(doc => {
        const clientData = doc.data();
        const clientDiv = createClientDiv(doc.id, clientData.name, clientData.retainer);

        // Apply the status class
        if (clientData.status) {
            clientDiv.classList.add(clientData.status);
            if (clientData.status === 'forecast') {
                clientDiv.style.color = '#696969';
                clientDiv.style.backgroundColor = '#d3d3d3';
            }
        }

        // Format and display the startDate and endDate
        const formattedStartDate = clientData.startDate ? formatDate(clientData.startDate.toDate()) : '';
        const formattedEndDate = clientData.endDate ? formatDate(clientData.endDate.toDate()) : '';

        const clientDetails = clientDiv.querySelector('.client-details');
        clientDetails.innerHTML = `$${clientData.retainer.toLocaleString()} - Start: ${formattedStartDate}`;
        if (formattedEndDate) {
            clientDetails.innerHTML += ` - End: ${formattedEndDate}`;
        }

        // Store the dates in data attributes
        clientDiv.setAttribute('data-start-date', clientData.startDate ? clientData.startDate.toDate().toISOString().split('T')[0] : '');
        clientDiv.setAttribute('data-end-date', clientData.endDate ? clientData.endDate.toDate().toISOString().split('T')[0] : '');

        // Append to the correct pod, if it exists
        const podElement = document.getElementById(clientData.podId);
        if (podElement) {
            podElement.appendChild(clientDiv);

            // Update metrics (similar to what you do when adding a client)
            if (!clientDiv.classList.contains('terminated') && clientData.status !== 'forecast') {
                totalRevenue += clientData.retainer;
                totalClients += 1;
                if (clientData.status === 'risk') {
                    mrrRiskRevenue += clientData.retainer;
                    totalRisk += 1;
                } else if (clientData.status === 'solid') {
                    totalSolid += 1;
                }
            } else if (clientDiv.classList.contains('forecast')) {
                forecastRevenue += clientData.retainer;
                forecastClients += 1;
            } else if (clientData.status === 'terminated') {
                totalTerminated += 1;
            }
        } else {
            console.error(`Pod element with ID ${clientData.podId} not found.`);
        }
    });

    // Update the metrics on the UI
    updateMetrics();
    updatePodMetrics();
    sortAllClients();
}

async function loadPods() {
    // Clear the current display
    document.getElementById('leftColumn').innerHTML = '';
    document.getElementById('rightColumn').innerHTML = '';

    // Fetch all pods from Firestore
    const q = query(collection(db, 'pods'));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach(doc => {
        const podData = doc.data();
        const podDiv = document.createElement('div');
        podDiv.classList.add('pod');
        podDiv.id = podData.id;
        podDiv.innerHTML = `
            <div class="pod-header">
                <h2 class="pod-name" id="${podData.id}Name">${podData.name}</h2>
                <div class="pod-icons">
                    <button class="edit-name" onclick="editPodName('${podData.id}Name')">✎</button>
                </div>
            </div>
            <div class="pod-stats">
                <span class="podMRR">MRR: $<span>0</span></span>
                <span class="podClientsForecast"><i class="fas fa-chart-line"></i></i>Forecast Clients: <span>0</span></span>
                <span class="podClients">Active Clients: <span>0</span></span>
            </div>
            <div class="clients" id="${podData.clientsId}" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
            <div class="input-section">
                <input type="text" class="clientName" placeholder="Enter Client Name">
                <input type="number" class="clientRetainer" placeholder="Enter Client Retainer">
                <button onclick="addClientToPod('${podData.clientsId}')">Add Client</button>
            </div>
            <button class="delete-pod" onclick="deletePod('${podData.id}')">🗑️</button>
        `;

        // Store the Firestore document ID with the DOM element
        podDiv.setAttribute('data-firestore-id', doc.id);

        const leftColumn = document.getElementById('leftColumn');
        const rightColumn = document.getElementById('rightColumn');
        if (leftColumn.children.length <= rightColumn.children.length) {
            leftColumn.appendChild(podDiv);
        } else {
            rightColumn.appendChild(podDiv);
        }

        podDiv.querySelector('.clients').addEventListener('dragover', allowDrop);
        podDiv.querySelector('.clients').addEventListener('drop', drop);
    });
}

async function savePodName(podId) {
    const podInput = document.getElementById(`${podId}-edit`);
    const newName = podInput.value;
    const podNameElement = document.getElementById(podId);
    podNameElement.innerText = newName;

    // Retrieve the Firestore document ID
    const podDiv = document.getElementById(podId.replace('Name', ''));
    const documentId = podDiv.getAttribute('data-firestore-id');

    if (!documentId) {
        console.error("Firestore document ID not found for pod:", podId);
        return;
    }

    console.log("Attempting to update pod with Firestore ID:", documentId);

    // Check if the document exists before trying to update it
    const podDocRef = doc(db, 'pods', documentId);
    const podDocSnap = await getDoc(podDocRef);

    if (podDocSnap.exists()) {
        // Update the pod name in Firestore
        try {
            await updateDoc(podDocRef, {
                name: newName
            });
            console.log("Pod name updated in Firestore.");
        } catch (e) {
            console.error("Error updating pod name in Firestore: ", e);
        }
    } else {
        console.error("No document found with Firestore ID:", documentId);
    }
}
window.savePodName = savePodName;

function editPodName(podId) {
    const podSpan = document.getElementById(podId);
    const currentName = podSpan.innerText;
    podSpan.innerHTML = `<input type="text" value="${currentName}" id="${podId}-edit" onblur="savePodName('${podId}')">`;
    document.getElementById(`${podId}-edit`).focus();
}
window.editPodName = editPodName;

async function addPod() {
    const leftColumn = document.getElementById('leftColumn');
    const rightColumn = document.getElementById('rightColumn');
    const newPodId = `pod${document.querySelectorAll('.pod').length + 1}`;
    const newClientsId = `clients${document.querySelectorAll('.clients').length + 1}`;
    const podName = "New Pod"; // Default name for new pods

    const podDiv = document.createElement('div');
    podDiv.classList.add('pod');
    podDiv.id = newPodId;
    podDiv.innerHTML = `
        <div class="pod-header">
            <h2 class="pod-name" id="${newPodId}Name">${podName}</h2>
            <div class="pod-icons">
                <button class="edit-name" onclick="editPodName('${newPodId}Name')">✎</button>
            </div>
        </div>
        <div class="pod-stats">
            <span class="podMRR">MRR: $<span>0</span></span>
            <span class="podClients">Clients (Active): <span>0</span></span>
            <span class="podClientsForecast">Clients (Forecast): <span>0</span></span>
        </div>
        <div class="clients" id="${newClientsId}" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
        <div class="input-section">
            <input type="text" class="clientName" placeholder="Enter Client Name">
            <input type="number" class="clientRetainer" placeholder="Enter Client Retainer">
            <button onclick="addClientToPod('${newClientsId}')">Add Client</button>
        </div>
        <button class="delete-pod" onclick="deletePod('${newPodId}')">🗑️</button>
    `;

    if (leftColumn.children.length <= rightColumn.children.length) {
        leftColumn.appendChild(podDiv);
    } else {
        rightColumn.appendChild(podDiv);
    }

    // Ensure the new pod can handle drag and drop
    const newClientsDiv = document.getElementById(newClientsId);
    newClientsDiv.addEventListener('dragover', allowDrop);
    newClientsDiv.addEventListener('drop', drop);

    // Save the new pod to Firestore
    try {
        const docRef = await addDoc(collection(db, 'pods'), {
            id: newPodId,
            name: podName,
            clientsId: newClientsId,
            createdAt: new Date()
        });

        // Store the Firestore document ID with the DOM element
        podDiv.setAttribute('data-firestore-id', docRef.id);

        console.log("Pod added with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding pod: ", e);
    }
}
window.addPod = addPod;

function sortClients(columnId) {
    const column = document.getElementById(columnId);
    const clients = Array.from(column.querySelectorAll('.client'));
    clients.sort((a, b) => {
        const statusOrder = ['solid', 'risk', 'terminated', 'forecast'];
        return statusOrder.indexOf(a.classList[1]) - statusOrder.indexOf(b.classList[1]);
    });
    clients.forEach(client => column.appendChild(client));
}

function sortAllClients() {
    document.querySelectorAll('.clients').forEach(column => sortClients(column.id));
}
