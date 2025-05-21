// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";
import { getDatabase, ref, set, onChildAdded, push } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBF_h4SBa9NrY7Xj5nZL44QP-ucjel8M-M",
    authDomain: "eyechatbox.firebaseapp.com",
    databaseURL: "https://eyechatbox-default-rtdb.firebaseio.com",
    projectId: "eyechatbox",
    storageBucket: "eyechatbox.appspot.com",
    messagingSenderId: "227204788132",
    appId: "1:227204788132:web:57d12acd7d5a90fb579b31",
    measurementId: "G-Y7Y73CVL4X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Get references to the HTML elements
const nameInput = document.getElementById('name-input');
const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');
const sendButton = document.getElementById('send-button');

// Function to send a message
sendButton.addEventListener('click', () => {
    const name = nameInput.value || 'Anonymous';
    const message = messageInput.value;

    if (message) {
        // Push the message to Firebase - fixed to use push() correctly
        const messagesRef = ref(database, 'messages');
        const newMessageRef = push(messagesRef);
        set(newMessageRef, {
            name: name,
            message: message,
            timestamp: Date.now()
        });
        messageInput.value = ''; // Clear the input field
    }
});

// Function to listen for new messages
onChildAdded(ref(database, 'messages'), (data) => {
    const messageData = data.val();
    const messageElement = document.createElement('div');
    messageElement.textContent = `${messageData.name}: ${messageData.message}`;
    messagesDiv.appendChild(messageElement);
    // Auto-scroll to the bottom when new messages arrive
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Allow Enter key to send messages
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendButton.click();
    }
});