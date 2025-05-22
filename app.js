/**
 * Idiotic Congress Chat Application
 * A simple real-time chat application using Firebase
 * With added account persistence and content moderation
 */

// Firebase Configuration
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
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM Elements
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const usernameInput = document.getElementById('username-input');
const loginButton = document.getElementById('login-button');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');
const onlineCountElement = document.getElementById('online-count');

// App State
let currentUser = null;
let userRef = null;
let messagesRef = database.ref('messages');
let usersRef = database.ref('users');
let userDataRef = database.ref('userData');

// Moderation settings
const moderationSettings = {
    enabled: true,
    maxMessagesPerMinute: 10,
    profanityFilter: true,
    maxMessageLength: 500
};

// Profanity list - words to filter
const profanityList = [
    'nigger', 'nigga', 'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'pussy', 
    'whore', 'slut', 'faggot', 'retard', 'coon', 'kike', 'spic', 'chink', 'gook',
    'wetback', 'nazi', 'paki', 'jap', 'dyke', 'fag', 'homo', 'queer'
];

// Anti-spam tracking
const userMessageCounts = {};

// Initialize App
function init() {
    console.log('Initializing Idiotic Congress Chat App');
    
    // Add event listeners
    loginButton.addEventListener('click', handleLogin);
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Listen for online users count
    usersRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const count = Object.keys(snapshot.val() || {}).length;
            onlineCountElement.textContent = count;
        } else {
            onlineCountElement.textContent = '0';
        }
    });
    
    // Check for errors
    database.ref('.info/connected').on('value', (snapshot) => {
        const connected = snapshot.val();
        if (!connected) {
            showSystemMessage('Disconnected from server. Trying to reconnect...');
        } else {
            showSystemMessage('Connected to chat server!');
        }
    });
}

// Handle user login
function handleLogin() {
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    // Check if this username exists in userData
    userDataRef.orderByChild('name').equalTo(username).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                // User exists, retrieve their data
                const userData = Object.values(snapshot.val())[0];
                const userId = Object.keys(snapshot.val())[0];
                
                // Use existing user data
                currentUser = {
                    id: userId,
                    name: username,
                    joinedAt: userData.joinedAt,
                    lastLogin: firebase.database.ServerValue.TIMESTAMP
                };
                
                // Update user data
                userDataRef.child(userId).update({
                    lastLogin: firebase.database.ServerValue.TIMESTAMP
                });
                
                console.log(`Welcome back, ${username}!`);
            } else {
                // New user, create new data
                const userId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                
                // Create user object
                currentUser = {
                    id: userId,
                    name: username,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP,
                    lastLogin: firebase.database.ServerValue.TIMESTAMP
                };
                
                // Store persistent user data
                userDataRef.child(userId).set(currentUser);
                
                console.log(`New user created: ${username}`);
            }
            
            // Add user to online users
            userRef = usersRef.child(currentUser.id);
            userRef.set({
                id: currentUser.id,
                name: currentUser.name,
                online: true
            });
            
            // Remove user when disconnected
            userRef.onDisconnect().remove();
            
            // Show chat interface
            loginContainer.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            
            // Show welcome message
            showSystemMessage(`Welcome to Idiotic Congress, ${username}!`);
            
            // Start listening for messages
            listenForMessages();
            
            // Focus on message input
            messageInput.focus();
        })
        .catch((error) => {
            console.error("Error checking user:", error);
            alert("Error logging in. Please try again.");
        });
}

// Listen for new messages
function listenForMessages() {
    // Clear any existing listeners
    messagesRef.off();
    
    // Get last 50 messages
    messagesRef.limitToLast(50).on('child_added', (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
    });
}

// Check for spam
function isSpamming(userId) {
    if (!userMessageCounts[userId]) {
        userMessageCounts[userId] = {
            count: 0,
            resetTime: Date.now() + 60000 // 1 minute from now
        };
    }
    
    // Reset counter if time expired
    if (Date.now() > userMessageCounts[userId].resetTime) {
        userMessageCounts[userId] = {
            count: 0,
            resetTime: Date.now() + 60000
        };
    }
    
    // Increment message count
    userMessageCounts[userId].count++;
    
    // Check if over limit
    return userMessageCounts[userId].count > moderationSettings.maxMessagesPerMinute;
}

// Filter profanity
function filterProfanity(text) {
    if (!moderationSettings.profanityFilter) return text;
    
    let filteredText = text;
    
    // Replace profanity with asterisks
    profanityList.forEach(word => {
        const regex = new RegExp(word, 'gi');
        filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    });
    
    return filteredText;
}

// Send a new message
function sendMessage() {
    if (!currentUser) return;
    
    const text = messageInput.value.trim();
    if (!text) return;
    
    // Check message length
    if (text.length > moderationSettings.maxMessageLength) {
        showSystemMessage(`Message too long. Maximum length is ${moderationSettings.maxMessageLength} characters.`);
        return;
    }
    
    // Check for spam
    if (isSpamming(currentUser.id)) {
        showSystemMessage("You're sending messages too quickly. Please slow down.");
        return;
    }
    
    // Filter content
    const filteredText = filterProfanity(text);
    
    // Clear input field
    messageInput.value = '';
    
    // Create message object
    const message = {
        id: 'msg_' + Date.now(),
        text: filteredText,
        userId: currentUser.id,
        username: currentUser.name,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Add to Firebase
    messagesRef.push(message)
        .then(() => {
            console.log('Message sent successfully');
        })
        .catch((error) => {
            console.error('Error sending message:', error);
            showSystemMessage('Failed to send message. Please try again.');
        });
}

// Display a message in the UI
function displayMessage(message) {
    const messageElement = document.createElement('div');
    const isSelf = currentUser && message.userId === currentUser.id;
    
    messageElement.className = `message ${isSelf ? 'self' : 'other'} clearfix`;
    
    // Format timestamp if available
    let timeString = '';
    if (message.timestamp) {
        const date = new Date(message.timestamp);
        timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // For system messages
    if (message.system) {
        messageElement.className = 'system-message';
        messageElement.textContent = message.text;
    } else {
        messageElement.innerHTML = `
            <div class="message-bubble">${escapeHtml(message.text)}</div>
            <div class="message-info">
                ${isSelf ? 'You' : escapeHtml(message.username)} • ${timeString}
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show system message
function showSystemMessage(text) {
    displayMessage({
        system: true,
        text: text,
        timestamp: Date.now()
    });
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (userRef) {
        userRef.remove();
    }
});

// Initialize the app
init();