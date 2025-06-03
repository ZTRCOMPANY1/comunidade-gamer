const socket = io();

function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value;
    socket.emit('chatMessage', message);
    input.value = '';
}

socket.on('chatMessage', (msg) => {
    const item = document.createElement('li');
    item.textContent = msg;
    document.getElementById('messages').appendChild(item);
});
