// Updated version: May 21, 2025 - 11:27 PM - Cache buster
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

// Initialize Firebase with error handling
let app;
let database;

try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Error initializing Firebase:", error);
    alert("Failed to connect to chat server. Please try again later.");
}

// Get references to the HTML elements
const nameInput = document.getElementById('name-input');
const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');
const sendButton = document.getElementById('send-button');

// Add a status message to the chat
function addStatusMessage(text) {
    const statusElement = document.createElement('div');
    statusElement.textContent = text;
    statusElement.className = 'status-message';
    messagesDiv.appendChild(statusElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Add initial status message
addStatusMessage("Chat initialized. Enter your name and start chatting!");

// Function to send a message
sendButton.addEventListener('click', () => {
    if (!database) {
        addStatusMessage("Error: Not connected to chat server");
        return;
    }
    
    const name = nameInput.value || 'Anonymous';
    const message = messageInput.value;

    if (message) {
        try {
            // Push the message to Firebase - fixed to use push() correctly
            const messagesRef = ref(database, 'messages');
            const newMessageRef = push(messagesRef);
            set(newMessageRef, {
                name: name,
                message: message,
                timestamp: Date.now()
            });
            messageInput.value = ''; // Clear the input field
        } catch (error) {
            console.error("Error sending message:", error);
            addStatusMessage("Failed to send message. Please try again.");
        }
    }
});

// Function to listen for new messages
try {
    onChildAdded(ref(database, 'messages'), (data) => {
        const messageData = data.val();
        const messageElement = document.createElement('div');
        messageElement.textContent = `${messageData.name}: ${messageData.message}`;
        messagesDiv.appendChild(messageElement);
        // Auto-scroll to the bottom when new messages arrive
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
} catch (error) {
    console.error("Error setting up message listener:", error);
    addStatusMessage("Failed to connect to chat stream. Messages may not appear.");
}

// Allow Enter key to send messages
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendButton.click();
    }
});