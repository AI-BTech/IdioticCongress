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
        // Push the message to Firebase
        const messagesRef = ref(database, 'messages');
        set(messagesRef.push(), {
            name: name,
            message: message
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
});
