/**
 * Idiotic Congress Chat Application
 * A simple real-time chat application using Firebase
 * With added account persistence, content moderation, and automatic chat switching
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
let currentChatRef = null; // Reference to current chat room

// Moderation settings
const moderationSettings = {
    enabled: true,
    maxMessagesPerMinute: 10,
    profanityFilter: true,
    maxMessageLength: 500,
    similarityThreshold: 0.8, // Threshold for detecting similar messages (spam)
    timeWindow: 10000, // 10 seconds window for spam detection
    maxSimilarMessages: 3 // Max number of similar messages allowed in timeWindow
};

// Initial profanity list (will be replaced by the GitHub list if fetch succeeds)
let profanityList = [
    'nigger', 'nigga', 'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'pussy', 
    'whore', 'slut', 'faggot', 'retard', 'coon', 'kike', 'spic', 'chink', 'gook',
    'wetback', 'nazi', 'paki', 'jap', 'dyke', 'fag', 'homo', 'queer', 'damn',
    'bastard', 'asshole', 'piss', 'cock', 'bullshit', 'motherfucker', 'fucker'
];

// Anti-spam tracking
const userMessageCounts = {};
const userMessageHistory = {}; // For tracking message similarity

// Function to fetch and load comprehensive profanity list from GitHub
async function initProfanityFilter() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/RobertJGabriel/Google-profanity-words/master/list.txt');
        const text = await response.text();
        profanityList = text.split('\n').filter(word => word.trim() !== '');
        console.log('Enhanced profanity filter loaded with', profanityList.length, 'words');
    } catch (error) {
        console.error('Failed to load enhanced profanity list:', error);
        // Keep using the default list if fetch fails
        console.log('Using default profanity list with', profanityList.length, 'words');
    }
}

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
    
    // Initialize the enhanced profanity filter
    initProfanityFilter();
}

// Calculate similarity between two strings (Levenshtein distance based)
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
    
    const shorter = str1.length < str2.length ? str1 : str2;
    const longer = str1.length >= str2.length ? str1 : str2;
    
    if (longer.length === 0) return 1.0;
    
    return (longer.length - editDistance(shorter, longer)) / longer.length;
}

// Levenshtein distance calculation
function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

// Handle user login with case-insensitive username matching
function handleLogin() {
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    // Get all users and perform case-insensitive matching
    userDataRef.once('value')
        .then((snapshot) => {
            let matchedUserId = null;
            let matchedUserData = null;
            
            // Check for case-insensitive match
            if (snapshot.exists()) {
                const users = snapshot.val();
                Object.keys(users).forEach(userId => {
                    const userData = users[userId];
                    if (userData.name && userData.name.toLowerCase() === username.toLowerCase()) {
                        matchedUserId = userId;
                        matchedUserData = userData;
                    }
                });
            }
            
            if (matchedUserId) {
                // User exists, retrieve their data
                currentUser = {
                    id: matchedUserId,
                    name: matchedUserData.name, // Use the exact case from the database
                    joinedAt: matchedUserData.joinedAt,
                    lastLogin: firebase.database.ServerValue.TIMESTAMP
                };
                
                // Update user data
                userDataRef.child(matchedUserId).update({
                    lastLogin: firebase.database.ServerValue.TIMESTAMP
                });
                
                console.log(`Welcome back, ${matchedUserData.name}!`);
                
                // Show the username with the correct case from the database
                showSystemMessage(`Logging in as ${matchedUserData.name} (matched from ${username})`);
            } else {
                // New user, create new data
                const userId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                
                // Create user object
                currentUser = {
                    id: userId,
                    name: username, // Use the username as entered
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
            
            // Set the current chat reference to the user's personal chat
            currentChatRef = database.ref(`userChats/${currentUser.id}`);
            
            // Show welcome message
            showSystemMessage(`Welcome to Idiotic Congress, ${currentUser.name}!`);
            
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
    
    // If we have a specific chat reference, use that instead
    const activeMessagesRef = currentChatRef || messagesRef;
    
    // Get last 50 messages
    activeMessagesRef.limitToLast(50).on('child_added', (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
    });
}

// Switch to a specific user's chat
function switchToUserChat(userId, username) {
    // Clear current messages display
    messagesContainer.innerHTML = '';
    
    // Set the current chat reference
    currentChatRef = database.ref(`userChats/${userId}`);
    
    // Show system message
    showSystemMessage(`Switched to ${username}'s chat`);
    
    // Start listening for messages in this chat
    listenForMessages();
}

// Check for spam with enhanced detection
function isSpamming(userId, message) {
    const now = Date.now();
    
    // Initialize user tracking if not exists
    if (!userMessageCounts[userId]) {
        userMessageCounts[userId] = {
            count: 0,
            resetTime: now + 60000 // 1 minute from now
        };
    }
    
    // Initialize message history if not exists
    if (!userMessageHistory[userId]) {
        userMessageHistory[userId] = [];
    }
    
    // Reset counter if time expired
    if (now > userMessageCounts[userId].resetTime) {
        userMessageCounts[userId] = {
            count: 0,
            resetTime: now + 60000
        };
    }
    
    // Clean up old messages from history
    userMessageHistory[userId] = userMessageHistory[userId].filter(
        msg => now - msg.timestamp < moderationSettings.timeWindow
    );
    
    // Check for similar messages in recent history
    const similarMessages = userMessageHistory[userId].filter(
        msg => calculateSimilarity(msg.text, message) > moderationSettings.similarityThreshold
    );
    
    if (similarMessages.length >= moderationSettings.maxSimilarMessages) {
        return true; // Detected as spam due to similar messages
    }
    
    // Add current message to history
    userMessageHistory[userId].push({
        text: message,
        timestamp: now
    });
    
    // Increment message count
    userMessageCounts[userId].count++;
    
    // Check if over limit
    return userMessageCounts[userId].count > moderationSettings.maxMessagesPerMinute;
}

// Filter profanity with improved detection using word boundaries
function filterProfanity(text) {
    if (!moderationSettings.profanityFilter) return text;
    
    let filteredText = text;
    
    // Replace profanity with asterisks using proper word boundaries
    profanityList.forEach(word => {
        if (word && word.trim()) {
            // Match whole words with word boundaries
            const regex = new RegExp('\\b' + word + '\\b', 'gi');
            filteredText = filteredText.replace(regex, '*'.repeat(word.length));
        }
    });
    
    return filteredText;
}

// Send a new message
function sendMessage() {
    if (!currentUser) return;
    
    const text = messageInput.value.trim();
    if (!text) return;
    
    // Check for command patterns
    const commandPattern = /^\/(\w+)(?:\s+(.*))?$/; // Matches commands like /command [args]
    const commandMatch = text.match(commandPattern);

    if (commandMatch) {
        const command = commandMatch[1];
        const args = commandMatch[2] ? commandMatch[2].trim() : '';

        switch (command) {
            case 'server':
                // Send a system message
                const systemMessage = {
                    system: true,
                    text: args || 'System message',
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
                messagesRef.push(systemMessage);
                break;

            case 'clear':
                // Clear chat history in the view (not from Firebase)
                messagesContainer.innerHTML = '';
                showSystemMessage('Chat history cleared.');
                return; // Exit to prevent sending a message

            case 'help':
                // Show available commands
                const helpMessage = `
                    Available commands:
                    /server [message] - Sends a message that appears as a system message
                    /clear - Clears the chat history in your view
                    /help - Shows all available commands
                    /nick [newname] - Changes your display name
                    /whisper [username] [message] - Sends a private message to a specific user
                    /online - Shows a list of currently online users
                    /confetti - Displays a fun confetti animation in the chat
                    /color [color] - Changes the color of your messages
                `;
                showSystemMessage(helpMessage);
                return; // Exit to prevent sending a message

            case 'nick':
                // Change display name
                if (args) {
                    currentUser.name = args;
                    userDataRef.child(currentUser.id).update({ name: args });
                    showSystemMessage(`Your display name has been changed to ${args}.`);
                } else {
                    showSystemMessage('Please provide a new name.');
                }
                return; // Exit to prevent sending a message

            case 'whisper':
                // Send a private message to a specific user
                const whisperArgs = args.split(' ');
                const whisperUser = whisperArgs.shift();
                const whisperMessage = whisperArgs.join(' ');

                // Here you would implement logic to send the message to the specific user
                // For now, we will just show a system message
                showSystemMessage(`Whisper to ${whisperUser}: ${whisperMessage}`);
                return; // Exit to prevent sending a message

            case 'online':
                // Show online users
                usersRef.once('value', (snapshot) => {
                    const onlineUsers = snapshot.val();
                    const onlineList = Object.values(onlineUsers).map(user => user.name).join(', ');
                    showSystemMessage(`Currently online: ${onlineList || 'No users online.'}`);
                });
                return; // Exit to prevent sending a message

            case 'confetti':
                // Trigger confetti animation (you'll need to implement this)
                showSystemMessage('🎉 Confetti animation triggered! 🎉');
                // Call your confetti function here
                return; // Exit to prevent sending a message

            case 'color':
                // Change message color
                if (args) {
                    // Here you would implement logic to change the message color
                    showSystemMessage(`Your message color has been changed to ${args}.`);
                } else {
                    showSystemMessage('Please provide a color.');
                }
                return; // Exit to prevent sending a message

            default:
                showSystemMessage('Unknown command. Type /help for a list of commands.');
                return; // Exit to prevent sending a message
        }
    }

    // Check message length
    if (text.length > moderationSettings.maxMessageLength) {
        showSystemMessage(`Message too long. Maximum length is ${moderationSettings.maxMessageLength} characters.`);
        return;
    }

    // Check for spam
    if (isSpamming(currentUser.id, text)) {
        showSystemMessage("You're sending messages too quickly or repeating similar content. Please slow down.");
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

    // Determine where to send the message
    const targetRef = currentChatRef || messagesRef;

    // Add to Firebase
    targetRef.push(message)
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
                <span class="username" onclick="handleUsernameClick('${message.userId}', '${escapeHtml(message.username)}')">${isSelf ? 'You' : escapeHtml(message.username)}</span> • ${timeString}
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Handle username click to switch to their chat
function handleUsernameClick(userId, username) {
    if (!currentUser) return;
    if (userId === currentUser.id) return; // Don't switch to your own chat
    
    switchToUserChat(userId, username);
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

// Make the handleUsernameClick function globally available
window.handleUsernameClick = handleUsernameClick;

// Initialize the app
init();
