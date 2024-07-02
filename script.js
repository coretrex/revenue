// script.js
let clientId = 0;
let totalRevenue = 0;
let totalClients = 0;
let totalSolid = 0;
let totalRisk = 0;
let totalTerminated = 0;
let activeManagerId = 'apexNavigatorsClients'; // Default active manager pod

document.addEventListener('DOMContentLoaded', loadClients);

function addClient() {
    const clientName = document.getElementById('clientName').value;
    const clientRetainer = parseFloat(document.getElementById('clientRetainer').value);

    if (clientName && clientRetainer) {
        const clientDiv = createClientDiv(clientId++, clientName, clientRetainer);
        document.getElementById(activeManagerId).appendChild(clientDiv);

        totalRevenue += clientRetainer;
        totalClients += 1;
        if (clientDiv.classList.contains('solid')) totalSolid += 1;
        else if (clientDiv.classList.contains('risk')) totalRisk += 1;
        else if (clientDiv.classList.contains('terminated')) totalTerminated += 1;

        updateMetrics();
        saveClients();
        sortClients(activeManagerId);

        document.getElementById('clientName').value = '';
        document.getElementById('clientRetainer').value = '';
    } else {
        alert('Please enter client name and retainer.');
    }
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
    const target = event.target;

    if (target.classList.contains('clients')) {
        target.appendChild(clientDiv);
    } else if (target.closest('.clients')) {
        target.closest('.clients').appendChild(clientDiv);
    }

    updateManagerMetrics();
    saveClients();
    sortClients(target.closest('.clients').id);
}

function deleteClient(clientId, clientRetainer) {
    const clientDiv = document.getElementById(clientId);
    if (clientDiv.classList.contains('solid')) totalSolid -= 1;
    else if (clientDiv.classList.contains('risk')) totalRisk -= 1;
    else if (clientDiv.classList.contains('terminated')) totalTerminated -= 1;
    clientDiv.remove();
    totalRevenue -= clientRetainer;
    totalClients -= 1;
    updateMetrics();
    saveClients();
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

        totalRevenue = totalRevenue - oldRetainer + newRetainer;
        updateMetrics();
        saveClients();
        sortClients(clientDiv.closest('.clients').id);
    } else {
        alert('Please enter client name and retainer.');
    }
}

function changeStatus(clientId, status) {
    const clientDiv = document.getElementById(clientId);
    clientDiv.classList.remove('solid', 'risk', 'terminated');
    clientDiv.classList.add(status);
    const clientDetails = clientDiv.querySelector('.client-details');
    const trashCanIcon = clientDiv.querySelector('.delete svg');
    if (status === 'solid') {
        clientDetails.style.color = 'white';
        trashCanIcon.style.fill = 'white';
        clientDiv.style.outline = '2px solid white'; // Add this line for white outline
        totalSolid += 1;
        if (clientDiv.classList.contains('risk')) totalRisk -= 1;
        else if (clientDiv.classList.contains('terminated')) totalTerminated -= 1;
    } else if (status === 'risk') {
        clientDetails.style.color = '';
        trashCanIcon.style.fill = '';
        clientDiv.style.outline = ''; // Reset outline
        totalRisk += 1;
        if (clientDiv.classList.contains('solid')) totalSolid -= 1;
        else if (clientDiv.classList.contains('terminated')) totalTerminated -= 1;
    } else if (status === 'terminated') {
        clientDetails.style.color = '';
        trashCanIcon.style.fill = '';
        clientDiv.style.outline = ''; // Reset outline
        totalTerminated += 1;
        if (clientDiv.classList.contains('solid')) totalSolid -= 1;
        else if (clientDiv.classList.contains('risk')) totalRisk -= 1;
    }
    updateMetrics();
    saveClients();
    sortClients(clientDiv.closest('.clients').id);
}

function updateMetrics() {
    document.getElementById('totalRevenue').innerText = totalRevenue.toLocaleString();
    document.getElementById('annualRevenue').innerText = (totalRevenue * 12).toLocaleString();
    document.getElementById('totalClients').innerText = totalClients.toLocaleString();
    document.getElementById('totalSolid').innerText = totalSolid.toLocaleString();
    document.getElementById('totalRisk').innerText = totalRisk.toLocaleString();
    document.getElementById('totalTerminated').innerText = totalTerminated.toLocaleString();
}

function updateManagerMetrics() {
    document.querySelectorAll('.manager').forEach(manager => {
        let managerRevenue = 0;
        let managerSolid = 0;
        let managerRisk = 0;
        let managerTerminated = 0;
        manager.querySelectorAll('.client').forEach(client => {
            const clientDetails = client.querySelector('.client-details').textContent;
            const retainer = parseFloat(clientDetails.replace('$', '').replace(/,/g, ''));
            managerRevenue += retainer;
            if (client.classList.contains('solid')) managerSolid += 1;
            else if (client.classList.contains('risk')) managerRisk += 1;
            else if (client.classList.contains('terminated')) managerTerminated += 1;
        });
        manager.querySelector('.managerMRR span').innerText = managerRevenue.toLocaleString();
        manager.querySelector('.managerClients span').innerText = (managerSolid + managerRisk + managerTerminated).toLocaleString();
    });
}

function deleteManager(managerId) {
    const manager = document.getElementById(managerId);
    const clients = manager.querySelectorAll('.client');
    clients.forEach(client => {
        const clientDetails = client.querySelector('.client-details').textContent;
        const retainer = parseFloat(clientDetails.replace('$', '').replace(/,/g, ''));
        totalRevenue -= retainer;
        totalClients -= 1;
        if (client.classList.contains('solid')) totalSolid -= 1;
        else if (client.classList.contains('risk')) totalRisk -= 1;
        else if (client.classList.contains('terminated')) totalTerminated -= 1;
    });
    manager.remove();
    updateMetrics();
    saveClients();
}

function saveClients() {
    const clients = [];
    document.querySelectorAll('.client').forEach(clientDiv => {
        const clientId = clientDiv.id;
        const clientName = clientDiv.querySelector('.client-info').textContent;
        const clientDetails = clientDiv.querySelector('.client-details').textContent;
        const retainer = parseFloat(clientDetails.replace('$', '').replace(/,/g, ''));
        const status = clientDiv.classList.contains('solid') ? 'solid' :
            clientDiv.classList.contains('risk') ? 'risk' :
            clientDiv.classList.contains('terminated') ? 'terminated' : '';
        const column = clientDiv.closest('.clients').id;
        const managerName = clientDiv.closest('.manager').querySelector('.manager-name').innerText;

        clients.push({ id: clientId, name: clientName, retainer, status, column, managerName });
    });

    localStorage.setItem('clients', JSON.stringify(clients));
    localStorage.setItem('totalRevenue', totalRevenue);
    localStorage.setItem('totalClients', totalClients);
    localStorage.setItem('totalSolid', totalSolid);
    localStorage.setItem('totalRisk', totalRisk);
    localStorage.setItem('totalTerminated', totalTerminated);
}

function loadClients() {
    const clients = JSON.parse(localStorage.getItem('clients'));
    if (clients) {
        clients.forEach(client => {
            const clientDiv = createClientDiv(client.id, client.name, client.retainer);
            if (client.status) {
                clientDiv.classList.add(client.status);
                const clientDetails = clientDiv.querySelector('.client-details');
                const trashCanIcon = clientDiv.querySelector('.delete svg');
                if (client.status === 'solid') {
                    clientDetails.style.color = 'white';
                    trashCanIcon.style.fill = 'white';
                    totalSolid += 1;
                } else if (client.status === 'risk') {
                    totalRisk += 1;
                } else if (client.status === 'terminated') {
                    totalTerminated += 1;
                }
            }
            document.getElementById(client.column).appendChild(clientDiv);
            document.getElementById(client.column).closest('.manager').querySelector('.manager-name').innerText = client.managerName;
            totalRevenue += client.retainer;
            totalClients += 1;
        });
        clientId = clients.length;
        updateMetrics();
        updateManagerMetrics();
        sortAllClients();
    }
}

function editManagerName(managerId) {
    const managerSpan = document.getElementById(managerId);
    const currentName = managerSpan.innerText;
    managerSpan.innerHTML = `<input type="text" value="${currentName}" id="${managerId}-edit" onblur="saveManagerName('${managerId}')">`;
    document.getElementById(`${managerId}-edit`).focus();
}

function saveManagerName(managerId) {
    const managerInput = document.getElementById(`${managerId}-edit`);
    const newName = managerInput.value;
    document.getElementById(managerId).innerText = newName;
    saveClients();
}

function addManager() {
    const leftColumn = document.getElementById('leftColumn');
    const rightColumn = document.getElementById('rightColumn');
    const newManagerId = `manager${document.querySelectorAll('.manager').length + 1}`;
    const newClientsId = `clients${document.querySelectorAll('.clients').length + 1}`;

    const managerDiv = document.createElement('div');
    managerDiv.classList.add('manager');
    managerDiv.id = newManagerId;
    managerDiv.innerHTML = `
        <div class="manager-header">
            <h2 class="manager-name" id="${newManagerId}Name">New Manager</h2>
            <div class="manager-icons">
                <button class="edit-name" onclick="editManagerName('${newManagerId}Name')">✎</button>
            </div>
        </div>
        <div class="manager-stats">
            <span class="managerMRR">MRR: $<span>0</span></span>
            <span class="managerClients">Clients: <span>0</span></span>
        </div>
        <div class="clients" id="${newClientsId}" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
        <button class="delete-manager" onclick="deleteManager('${newManagerId}')">🗑️</button>
    `;

    if (leftColumn.children.length <= rightColumn.children.length) {
        leftColumn.appendChild(managerDiv);
    } else {
        rightColumn.appendChild(managerDiv);
    }

    // Ensure the new manager pod can handle drag and drop
    const newClientsDiv = document.getElementById(newClientsId);
    newClientsDiv.addEventListener('dragover', allowDrop);
    newClientsDiv.addEventListener('drop', drop);

    saveClients();
}

function sortClients(columnId) {
    const column = document.getElementById(columnId);
    const clients = Array.from(column.querySelectorAll('.client'));
    clients.sort((a, b) => {
        const statusOrder = ['solid', 'risk', 'terminated'];
        return statusOrder.indexOf(a.classList[1]) - statusOrder.indexOf(b.classList[1]);
    });
    clients.forEach(client => column.appendChild(client));
}

function sortAllClients() {
    document.querySelectorAll('.clients').forEach(column => sortClients(column.id));
}
