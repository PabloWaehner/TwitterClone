var connected = false;

var socket = io("http://localhost:3003");
socket.emit("setup", userLoggedIn); //this will go back to the server, and will be handled by socket.on("setup")

socket.on("connected", () => connected = true);
socket.on("message received", (newMessage) => messageReceived(newMessage));