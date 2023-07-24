'use strict';
// LOGIN PAGE
var usernamePage = document.querySelector('#username-page');
var usernameForm = document.querySelector('#usernameForm');

//CHAT PAGE
var chatPage = document.querySelector('#chat-page');
var messageForm = document.querySelector('#messageForm');
var messageInput = document.querySelector('#message');
var messageArea = document.querySelector('#messageArea');

//CONNECTING...
var connectingElement = document.querySelector('.connecting');

//CHANNELS SECTION
var channelPage = document.querySelector('#channel-page');



var stompClient = null;
var username = null;
var connectedUsers = [];

var colors = [
    '#2196F3', '#32c787', '#00BCD4', '#ff5652',
    '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
];

function connect(event) {
    username = document.querySelector('#name').value.trim();

    if(username) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');
        channelPage.classList.remove('hidden');

        var socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);

        stompClient.connect({}, onConnected, onError);
    }
    event.preventDefault();
}


function onConnected() {
    // Subscribe to the Public Topic
    stompClient.subscribe('/topic/public', onMessageReceived);

    // Tell your username to the server
    stompClient.send("/app/chat.addUser",
        {},
        JSON.stringify({sender: username, type: 'JOIN'})
    )

    
    username = document.querySelector('#name').value.trim();
    connectedUsers.push(username);

    // Update the channel-page with the list of connected users
    updateChannelPage();
    
    // Subscribe to private channel
    stompClient.subscribe( username + '/private', onPrivateMessageReceived);

    //Hide "Connecting..." text
    connectingElement.classList.add('hidden');
}


function onError(error) {
    connectingElement.textContent = 'Could not connect to WebSocket server. Please refresh this page to try again!';
    connectingElement.style.color = 'red';
}


function sendMessage(event) {
    var messageContent = messageInput.value.trim();
    if (messageContent && stompClient) {
        var chatMessage = {
            sender: username,
            content: messageInput.value,
            type: 'CHAT'
        };
        if (messageContent.startsWith('@')) {
            var recipient = messageContent.split(' ')[0].substring(1);
            chatMessage.recipient = recipient;
            sendPrivateMessage(chatMessage);
        } else {
            stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        }
        messageInput.value = '';
    }
    event.preventDefault();
}

function sendPrivateMessage(chatMessage) {
    if (stompClient) {
        stompClient.send("/app/chat.sendPrivateMessage", {}, JSON.stringify(chatMessage));
    }
}

function onMessageReceived(payload) {
    var message = JSON.parse(payload.body);

    var messageElement = document.createElement('li');

    if(message.type === 'JOIN') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' joined!';
    } else if (message.type === 'LEAVE') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' left!';
    } else {
        messageElement.classList.add('chat-message');

        var avatarElement = document.createElement('i');
        var avatarText = document.createTextNode(message.sender[0]);
        avatarElement.appendChild(avatarText);
        avatarElement.style['background-color'] = getAvatarColor(message.sender);

        messageElement.appendChild(avatarElement);

        var usernameElement = document.createElement('span');
        var usernameText = document.createTextNode(message.sender);
        usernameElement.appendChild(usernameText);
        messageElement.appendChild(usernameElement);
    }

    var textElement = document.createElement('p');
    var messageText = document.createTextNode(message.content);
    textElement.appendChild(messageText);

    messageElement.appendChild(textElement);

    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

function onPrivateMessageReceived(payload) {

    // Check if the received message type is 'LEAVE'
    if (message.type === 'LEAVE') {

        // Remove the username from the connectedUsers array
        var index = connectedUsers.indexOf(message.sender);
        if (index !== -1) {
            connectedUsers.splice(index, 1);
        }
        // Update the channel-page with the updated list of connected users
        updateChannelPage();
    }
    // Parse the payload received from the server into a JavaScript object
    var message = JSON.parse(payload.body);

    // Create a new list item element to represent the private message
    var messageElement = document.createElement('li');
    messageElement.classList.add('private-message');

    // Create an element for the avatar (initial letter of sender's username)
    var avatarElement = document.createElement('i');
    var avatarText = document.createTextNode(message.sender[0]);
    avatarElement.appendChild(avatarText);

    // Set the background color of the avatar using a helper function getAvatarColor()
    avatarElement.style['background-color'] = getAvatarColor(message.sender);

    // Add the avatar element to the message element
    messageElement.appendChild(avatarElement);

    // Create an element for the username of the sender
    var usernameElement = document.createElement('span');
    var usernameText = document.createTextNode(message.sender);
    usernameElement.appendChild(usernameText);

    // Add the username element to the message element
    messageElement.appendChild(usernameElement);

    // Create an element for the text content of the message
    var textElement = document.createElement('p');
    var messageText = document.createTextNode(message.content);
    textElement.appendChild(messageText);

    // Add the text element to the message element
    messageElement.appendChild(textElement);

    // Add the message element to the message area (the chat display)
    messageArea.appendChild(messageElement);

    // Scroll to the bottom of the message area to show the latest message
    messageArea.scrollTop = messageArea.scrollHeight;
}


function getAvatarColor(messageSender) {
    var hash = 0;
    for (var i = 0; i < messageSender.length; i++) {
        hash = 31 * hash + messageSender.charCodeAt(i);
    }
    var index = Math.abs(hash % colors.length);
    return colors[index];
}

function updateChannelPage() {
    var channelArea = document.querySelector('.channel-area');

    connectedUsers.forEach(function (user) {
        var userItem = document.createElement('li');
        userItem.textContent = user;
        userItem.onclick = sendPrivateMessage();
        channelArea.appendChild(userItem);
    });
}

usernameForm.addEventListener('submit', connect, true)
messageForm.addEventListener('submit', sendMessage, true)