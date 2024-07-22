// Your web app's Firebase configuration
var firebaseConfig = {
    apiKey: "AIzaSyCUKkOjTS4jrL5ioUN9PKtWppca6Hzjbn4",
    authDomain: "coretrex-revenue.firebaseapp.com",
    projectId: "coretrex-revenue",
    storageBucket: "coretrex-revenue.appspot.com",
    messagingSenderId: "918994189710",
    appId: "1:918994189710:web:f06cfc46179b43ed4638df",
    measurementId: "G-MFYT73882K"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

let currentUser = null;

function googleLogin() {
    var provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth()
        .signInWithPopup(provider)
        .then((result) => {
            currentUser = result.user;
            storeUserInfo(currentUser);
            loadUserData(currentUser);
            updateUserUI(currentUser);
        }).catch((error) => {
            console.log(error);
        });
}

function storeUserInfo(user) {
    var db = firebase.firestore();
    db.collection("users").doc(user.uid).set({
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        profilePicture: user.photoURL
    }, { merge: true })
    .then(() => {
        console.log("User information successfully stored!");
    })
    .catch((error) => {
        console.error("Error storing user information: ", error);
    });
}

function loadUserData(user) {
    var db = firebase.firestore();
    resetMetrics(); // Clear previous metrics

    db.collection("clients").where("userId", "==", user.uid).get()
    .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const clientData = doc.data();
            const clientDiv = createClientDiv(clientData.id, clientData.name, clientData.retainer);
            if (clientData.status) {
                clientDiv.classList.add(clientData.status);
                if (clientData.status === 'forecast') {
                    clientDiv.style.color = '#696969';
                    clientDiv.style.backgroundColor = '#d3d3d3';
                }
            }
            document.getElementById(clientData.column).appendChild(clientDiv);
            if (!clientDiv.classList.contains('terminated') && clientData.status !== 'forecast') {
                totalRevenue += clientData.retainer;
                totalClients += 1;
            } else if (clientDiv.classList.contains('forecast')) {
                forecastRevenue += clientData.retainer;
                forecastClients += 1;
            }
        });
        updateMetrics();
        updatePodMetrics();
        sortAllClients();
    })
    .catch((error) => {
        console.log("Error getting client data:", error);
    });

    db.collection("pods").where("userId", "==", user.uid).get()
    .then((querySnapshot) => {
        document.getElementById('leftColumn').innerHTML = '';
        document.getElementById('rightColumn').innerHTML = '';
        querySnapshot.forEach((doc) => {
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
                    <span class="podClients">Clients: <span>0</span></span>
                </div>
                <div class="clients" id="${podData.clientsId}" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
                <div class="input-section">
                    <input type="text" class="clientName" placeholder="Enter Client Name">
                    <input type="number" class="clientRetainer" placeholder="Enter Client Retainer">
                    <button onclick="addClientToPod('${podData.clientsId}')">Add Client</button>
                </div>
                <button class="delete-pod" onclick="deletePod('${podData.id}')">🗑️</button>
            `;
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
    })
    .catch((error) => {
        console.log("Error getting pod data:", error);
    });
}

function updateUserUI(user) {
    document.getElementById("login-button").classList.add("hidden");
    document.querySelectorAll('.hidden').forEach(element => element.classList.remove('hidden'));
    const userIcon = document.getElementById("user-icon");
    userIcon.innerHTML = user.displayName.charAt(0).toUpperCase();
    userIcon.classList.remove("hidden");
}

function toggleLogoutButton() {
    const logoutButton = document.getElementById("logout-button");
    logoutButton.classList.toggle("hidden");
}

function logout() {
    firebase.auth().signOut().then(() => {
        currentUser = null;
        document.querySelectorAll('.hidden').forEach(element => element.classList.add('hidden'));
        document.getElementById("login-button").classList.remove("hidden");
        document.getElementById("user-icon").classList.add("hidden");
        document.getElementById("logout-button").classList.add("hidden");
        document.getElementById("leftColumn").innerHTML = '';
        document.getElementById("rightColumn").innerHTML = '';
        resetMetrics();
    }).catch((error) => {
        console.log(error);
    });
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserData(user);
        updateUserUI(user);
    }
});

let clientId = 0;
let totalRevenue = 0;
let mrrRiskRevenue = 0;
let totalClients = 0;
let totalSolid = 0;
let totalRisk = 0;
let totalTerminated = 0;
let forecastRevenue = 0;
let forecastClients = 0;

function addClientToPod(podId) {
    if (!currentUser) {
        alert('You must be logged in to add clients.');
        return;
    }

    const pod = document.getElementById(podId).closest('.pod');
    const clientNameInput = pod.querySelector('.clientName');
    const clientRetainerInput = pod.querySelector('.clientRetainer');
    const clientName = clientNameInput.value;
    const clientRetainer = parseFloat(clientRetainerInput.value);

    if (clientName && clientRetainer) {
        const clientDiv = createClientDiv(clientId++, clientName, clientRetainer);
        document.getElementById(podId).appendChild(clientDiv);

        if (!clientDiv.classList.contains('terminated') && !clientDiv.classList.contains('forecast')) {
            totalRevenue += clientRetainer;
            totalClients += 1;
            if (clientDiv.classList.contains('solid')) totalSolid += 1;
            else if (clientDiv.classList.contains('risk')) {
                totalRisk += 1;
                mrrRiskRevenue += clientRetainer;
            }
        } else if (clientDiv.classList.contains('terminated')) {
            totalTerminated += 1;
        } else if (clientDiv.classList.contains('forecast')) {
            forecastRevenue += clientRetainer;
            forecastClients += 1;
        }

        updateMetrics();
        updatePodMetrics();
        saveClientData(clientDiv, podId);
        clientNameInput.value = '';
        clientRetainerInput.value = '';
    } else {
        alert('Please enter client name and retainer.');
    }
}

function saveClientData(clientDiv, podId) {
    const db = firebase.firestore();
    db.collection("clients").doc(clientDiv.id).set({
        id: clientDiv.id,
        name: clientDiv.querySelector('.client-info').textContent,
        retainer: parseFloat(clientDiv.querySelector('.client-details').textContent.replace('$', '').replace(/,/g, '')),
        status: clientDiv.classList.contains('solid') ? 'solid' :
            clientDiv.classList.contains('risk') ? 'risk' :
            clientDiv.classList.contains('terminated') ? 'terminated' :
            clientDiv.classList.contains('forecast') ? 'forecast' : '',
        column: podId,
        userId: currentUser.uid
    }, { merge: true })
    .then(() => {
        console.log("Client information successfully stored!");
    })
    .catch((error) => {
        console.error("Error storing client information: ", error);
    });
}

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

function allowDrop(event) {
    event.preventDefault();
}

function drop(event) {
    event.preventDefault();
    const data = event.dataTransfer.getData('text/plain');
    const clientDiv = document.getElementById(data);
    const target = event.target.closest('.clients');

    if (target) {
        target.appendChild(clientDiv);
        updatePodMetrics();
        saveClientData(clientDiv, target.id);
    }
}

function deleteClient(clientId, clientRetainer) {
    const clientDiv = document.getElementById(clientId);
    const db = firebase.firestore();

    db.collection("clients").doc(clientId).delete()
    .then(() => {
        console.log("Client successfully deleted!");
    }).catch((error) => {
        console.error("Error removing client: ", error);
    });

    if (clientDiv.classList.contains('solid')) totalSolid -= 1;
    else if (clientDiv.classList.contains('risk')) {
        totalRisk -= 1;
        mrrRiskRevenue -= clientRetainer;
    } else if (clientDiv.classList.contains('terminated')) totalTerminated -= 1;
    if (!clientDiv.classList.contains('terminated') && !clientDiv.classList.contains('forecast')) {
        totalRevenue -= clientRetainer;
        totalClients -= 1;
    } else if (clientDiv.classList.contains('forecast')) {
        forecastRevenue -= clientRetainer;
        forecastClients -= 1;
    }
    clientDiv.remove();
    updateMetrics();
    updatePodMetrics();
}

function editClient(clientId, oldRetainer) {
    const clientDiv = document.getElementById(clientId);
    const clientInfo = clientDiv.querySelector('.client-info');
    const clientName = clientInfo.textContent.trim();

    clientInfo.innerHTML = `
        <input type="text" value="${clientName}" id="editName-${clientId}">
        <input type="number" value="${oldRetainer}" id="editRetainer-${clientId}">
        <button onclick="saveClient('${clientId}', ${oldRetainer})">Save</button>
    `;
}

function saveClient(clientId, oldRetainer) {
    const clientName = document.getElementById(`editName-${clientId}`).value;
    const newRetainer = parseFloat(document.getElementById(`editRetainer-${clientId}`).value);

    if (clientName && newRetainer) {
        const clientDiv = document.getElementById(clientId);
        const clientInfo = clientDiv.querySelector('.client-info');
        const clientDetails = clientDiv.querySelector('.client-details');

        clientInfo.innerHTML = clientName;
        clientDetails.innerHTML = `$${newRetainer.toLocaleString()}`;

        if (!clientDiv.classList.contains('terminated') && !clientDiv.classList.contains('forecast')) {
            totalRevenue = totalRevenue - oldRetainer + newRetainer;
            if (clientDiv.classList.contains('risk')) {
                mrrRiskRevenue = mrrRiskRevenue - oldRetainer + newRetainer;
            }
        } else if (clientDiv.classList.contains('forecast')) {
            forecastRevenue = forecastRevenue - oldRetainer + newRetainer;
        }
        updateMetrics();
        updatePodMetrics();
        saveClientData(clientDiv, clientDiv.closest('.clients').id);
    } else {
        alert('Please enter client name and retainer.');
    }
}

function changeStatus(clientId, status) {
    const clientDiv = document.getElementById(clientId);
    const oldStatus = ['solid', 'risk', 'terminated', 'forecast'].find(s => clientDiv.classList.contains(s));
    clientDiv.classList.remove('solid', 'risk', 'terminated', 'forecast');
    clientDiv.classList.add(status);

    if (status === 'forecast') {
        clientDiv.style.color = '#696969';
        clientDiv.style.backgroundColor = '#d3d3d3';
        if (oldStatus !== 'forecast') {
            const retainer = parseFloat(clientDiv.querySelector('.client-details').textContent.replace('$', '').replace(/,/g, ''));
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
        const retainer = parseFloat(clientDiv.querySelector('.client-details').textContent.replace('$', '').replace(/,/g, ''));
        if (oldStatus === 'forecast') {
            forecastRevenue -= retainer;
            forecastClients -= 1;
            if (status === 'solid') totalSolid += 1;
            else if (status === 'risk') {
                totalRisk += 1;
                mrrRiskRevenue += retainer;
            } else if (status === 'terminated') totalTerminated += 1;
            if (status !== 'terminated') {
                totalRevenue += retainer;
                totalClients += 1;
            }
        }
    }

    updateMetrics();
    updatePodMetrics();
    saveClientData(clientDiv, clientDiv.closest('.clients').id);
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

    // Calculate Forecast MRR and Forecast ARR excluding terminated clients
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
}

function updatePodMetrics() {
    document.querySelectorAll('.pod').forEach(pod => {
        let podRevenue = 0;
        let podSolid = 0;
        let podRisk = 0;
        let podTerminated = 0;
        let podClientsCount = 0;

        pod.querySelectorAll('.client').forEach(client => {
            const clientDetails = client.querySelector('.client-details').textContent;
            const retainer = parseFloat(clientDetails.replace('$', '').replace(/,/g, ''));
            if (!client.classList.contains('terminated')) {
                podRevenue += retainer;
                podClientsCount += 1;
            }
            if (client.classList.contains('solid')) podSolid += 1;
            else if (client.classList.contains('risk')) podRisk += 1;
            else if (client.classList.contains('terminated')) podTerminated += 1;
        });

        pod.querySelector('.podMRR span').innerText = podRevenue.toLocaleString();
        pod.querySelector('.podClients span').innerText = podClientsCount.toLocaleString();
    });
}

function deletePod(podId) {
    const pod = document.getElementById(podId);
    const clients = pod.querySelectorAll('.client');
    const db = firebase.firestore();

    clients.forEach(client => {
        const clientDetails = client.querySelector('.client-details').textContent;
        const retainer = parseFloat(clientDetails.replace('$', '').replace(/,/g, ''));
        db.collection("clients").doc(client.id).delete()
        .then(() => {
            console.log("Client successfully deleted!");
        }).catch((error) => {
            console.error("Error removing client: ", error);
        });

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

    db.collection("pods").doc(podId).delete()
    .then(() => {
        console.log("Pod successfully deleted!");
    }).catch((error) => {
        console.error("Error removing pod: ", error);
    });

    pod.remove();
    updateMetrics();
    updatePodMetrics();
}

function savePods() {
    const db = firebase.firestore();
    document.querySelectorAll('.pod').forEach(pod => {
        const podId = pod.id;
        const podName = pod.querySelector('.pod-name').innerText;
        const podClientsId = pod.querySelector('.clients').id;

        db.collection("pods").doc(podId).set({
            id: podId,
            name: podName,
            clientsId: podClientsId,
            userId: currentUser.uid
        }, { merge: true })
        .then(() => {
            console.log("Pod information successfully stored!");
        })
        .catch((error) => {
            console.error("Error storing pod information: ", error);
        });
    });
}

function editPodName(podId) {
    const podSpan = document.getElementById(podId);
    const currentName = podSpan.innerText;
    podSpan.innerHTML = `<input type="text" value="${currentName}" id="${podId}-edit" onblur="savePodName('${podId}')">`;
    document.getElementById(`${podId}-edit`).focus();
}

function savePodName(podId) {
    const podInput = document.getElementById(`${podId}-edit`);
    const newName = podInput.value;
    document.getElementById(podId).innerText = newName;
    savePods();
}

function addPod() {
    if (!currentUser) {
        alert('You must be logged in to add pods.');
        return;
    }

    const leftColumn = document.getElementById('leftColumn');
    const rightColumn = document.getElementById('rightColumn');
    const newPodId = `pod${document.querySelectorAll('.pod').length + 1}`;
    const newClientsId = `clients${document.querySelectorAll('.clients').length + 1}`;

    const podDiv = document.createElement('div');
    podDiv.classList.add('pod');
    podDiv.id = newPodId;
    podDiv.innerHTML = `
        <div class="pod-header">
            <h2 class="pod-name" id="${newPodId}Name">New Pod</h2>
            <div class="pod-icons">
                <button class="edit-name" onclick="editPodName('${newPodId}Name')">✎</button>
            </div>
        </div>
        <div class="pod-stats">
            <span class="podMRR">MRR: $<span>0</span></span>
            <span class="podClients">Clients: <span>0</span></span>
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

    const newClientsDiv = document.getElementById(newClientsId);
    newClientsDiv.addEventListener('dragover', allowDrop);
    newClientsDiv.addEventListener('drop', drop);

    savePods();
}

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

function resetMetrics() {
    totalRevenue = 0;
    mrrRiskRevenue = 0;
    totalClients = 0;
    totalSolid = 0;
    totalRisk = 0;
    totalTerminated = 0;
    forecastRevenue = 0;
    forecastClients = 0;
    updateMetrics();
}
