document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    initializeFirebase();
    loadPods();
});

function checkPassword() {
    const password = document.getElementById('password').value;
    if (password === 'CoreTrex2020') {
        console.log('Password is correct');
        document.getElementById('password-section').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    } else {
        alert('Incorrect password');
        console.log('Incorrect password');
    }
}

// Firebase configuration and initialization
let db;

function initializeFirebase() {
    const firebaseConfig = {
        apiKey: "AIzaSyAjFkdDSbmHF2sTfeMKMkcl2L4tAdmdwqw",
        authDomain: "coretrex-forecast.firebaseapp.com",
        projectId: "coretrex-forecast",
        storageBucket: "coretrex-forecast.appspot.com",
        messagingSenderId: "619634948025",
        appId: "1:619634948025:web:229017572239cb7cfd2868"
    };

    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore(app);
    console.log('Firebase initialized', db);
}

async function addPod() {
    const podName = prompt("Enter Pod Name:");
    if (podName) {
        try {
            const docRef = await db.collection("pods").add({
                name: podName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("Document written with ID: ", docRef.id);
            loadPods(); // Reload pods to reflect the new pod
        } catch (e) {
            console.error("Error adding document: ", e);
        }
    }
}

async function loadPods() {
    const podsContainer = document.getElementById('pods-container');
    podsContainer.innerHTML = ''; // Clear previous pods

    try {
        const querySnapshot = await db.collection("pods").get();
        querySnapshot.forEach((doc) => {
            const pod = doc.data();
            console.log(`${doc.id} => ${JSON.stringify(pod)}`);

            // Create a pod element
            const podElement = document.createElement('div');
            podElement.className = 'pod';
            podElement.innerHTML = `
                <h2>${pod.name}</h2>
                <button onclick="deletePod('${doc.id}')">Delete Pod</button>
            `;
            podsContainer.appendChild(podElement);
        });
    } catch (e) {
        console.error("Error getting documents: ", e);
    }
}

async function deletePod(podId) {
    try {
        await db.collection("pods").doc(podId).delete();
        console.log("Document successfully deleted!");
        loadPods(); // Reload pods to reflect the deletion
    } catch (e) {
        console.error("Error removing document: ", e);
    }
}
