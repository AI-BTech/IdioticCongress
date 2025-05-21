// Updated version: May 21, 2025 - 11:31 PM - Cache buster v2
// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";
import { getDatabase, ref, set, onChildAdded, push, get, child } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-database.js";

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
    addStatusMessage("Connected to chat server successfully!");
} catch (error) {
    console.error("Error initializing Firebase:", error);
    addStatusMessage("Failed to connect to chat server. Please try again later.");
}

// Get references to the HTML elements
const nameInput = document.getElementById('name-input');
const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');
const sendButton = document.getElementById('send-button');

// Add a status message to the chat
function addStatusMessage(text) {
    console.log("Status message:", text);
    const statusElement = document.createElement('div');
    statusElement.textContent = text;
    statusElement.className = 'status-message';
    messagesDiv.appendChild(statusElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

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
            console.log("Sending message:", message);
            // Push the message to Firebase - fixed to use push() correctly
            const messagesRef = ref(database, 'messages');
            const newMessageRef = push(messagesRef);
            
            const messageData = {
                name: name,
                message: message,
                timestamp: Date.now()
            };
            
            set(newMessageRef, messageData)
                .then(() => {
                    console.log("Message sent successfully:", messageData);
                    addStatusMessage(`Message sent: ${message}`);
                })
                .catch((error) => {
                    console.error("Error sending message:", error);
                    addStatusMessage("Failed to send message. Please check Firebase rules.");
                });
                
            messageInput.value = ''; // Clear the input field
        } catch (error) {
            console.error("Error in send message function:", error);
            addStatusMessage("Failed to send message. Please try again.");
        }
    }
});

// Test database connection
const dbRef = ref(database);
get(child(dbRef, 'test'))
    .then((snapshot) => {
        if (snapshot.exists()) {
            console.log("Database connection test successful:", snapshot.val());
        } else {
            console.log("Database connection test successful, but no test data found");
            // Create test data
            set(ref(database, 'test'), {
                message: "Test connection successful",
                timestamp: Date.now()
            }).then(() => {
                console.log("Test data created successfully");
            }).catch((error) => {
                console.error("Error creating test data:", error);
            });
        }
    })
    .catch((error) => {
        console.error("Database connection test failed:", error);
        addStatusMessage("Failed to connect to chat database. Please check Firebase rules.");
    });

// Function to listen for new messages
try {
    console.log("Setting up message listener...");
    onChildAdded(ref(database, 'messages'), (data) => {
        console.log("New message received:", data.val());
        const messageData = data.val();
        const messageElement = document.createElement('div');
        messageElement.textContent = `${messageData.name}: ${messageData.message}`;
        messageElement.className = 'message';
        messagesDiv.appendChild(messageElement);
        // Auto-scroll to the bottom when new messages arrive
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
    console.log("Message listener set up successfully");
} catch (error) {
    console.error("Error setting up message listener:", error);
    addStatusMessage("Failed to connect to chat stream. Messages may not appear.");
}

// Add a test message to verify everything is working
setTimeout(() => {
    try {
        const testRef = ref(database, 'messages');
        const newTestRef = push(testRef);
        set(newTestRef, {
            name: "System",
            message: "Chat system is active and working!",
            timestamp: Date.now()
        }).then(() => {
            console.log("Test message sent successfully");
        }).catch((error) => {
            console.error("Error sending test message:", error);
            addStatusMessage("Error: Cannot write to Firebase database. Please check rules.");
        });
    } catch (error) {
        console.error("Error in test message:", error);
    }
}, 3000);

// Allow Enter key to send messages
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendButton.click();
    }
});