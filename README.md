# Idiotic Congress Chat

A simple real-time chat application built with Firebase Realtime Database.

## Features

- Real-time messaging
- User presence detection
- Material Design inspired UI
- Mobile-responsive layout
- System messages for connection status

## How It Works

The application uses Firebase Realtime Database to store and sync chat messages in real-time across all clients. When a user joins the chat, they're assigned a unique ID and their presence is tracked in the database. Messages are stored with timestamps and user information.

### Firebase Structure

```
/
├── messages/
│   ├── [message_id]/
│   │   ├── id: "msg_123456"
│   │   ├── text: "Hello world"
│   │   ├── userId: "user_abc123"
│   │   ├── username: "Joseph"
│   │   └── timestamp: 1621612345678
│   └── ...
│
└── users/
    ├── [user_id]/
    │   ├── id: "user_abc123"
    │   ├── name: "Joseph"
    │   └── joinedAt: 1621612300000
    └── ...
```

## Setup Firebase

To use this app with your own Firebase project:

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Set up a Realtime Database
3. Update the Firebase configuration in `app.js`
4. Set the following database rules:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**Note:** These rules allow anyone to read and write to your database. For production, you should implement proper authentication and security rules.

## Development

### Prerequisites

- A modern web browser
- Firebase account

### Running Locally

Simply open the `index.html` file in your browser or use a local server.

## Deployment

This app is deployed on GitHub Pages at: [https://ai-btech.github.io/IdioticCongress/](https://ai-btech.github.io/IdioticCongress/)

## License

MIT