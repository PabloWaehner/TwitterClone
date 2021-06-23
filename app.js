const express = require('express');
const app = express();
const port = 3003;
const middleware = require('./middleware');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('./database');
const session = require('express-session');

const server = app.listen(port, () => console.log("Server listening on port " + port));
const io = require('socket.io')(server, { pingTimeout: 60000, allowEIO3: true }); //pingTimeout: how many miliseconds without a pong packet to consider the connection closed

app.set("view engine", "pug"); // the template engine used is pug (npm install pug) -> like handlebars
app.set("views", "views"); //second argument is for the folder where it looks what to render

app.use(bodyParser.urlencoded({ extended: false }));

/*everything in the public folder is served statically. Static means the files can be accessed directly.
a static file is not processed by the server before it's given to the user/the browser (http://localhost:3003/css/login.css will show what's inside this file for example). 
here we use the built in path object that node.js comes with.
__direname gives the absolute path to the file that is currently operating, and here it specifies the public folder as static */
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: "anything I want",
    resave: true,
    saveUninitialized: false
}));

// Routes
const loginRoute = require('./routes/loginRoutes');
const registerRoute = require('./routes/registerRoutes');
const logoutRoute = require('./routes/logoutRoutes');
const postRoute = require('./routes/postRoutes');
const profileRoute = require('./routes/profileRoutes');
const uploadRoute = require('./routes/uploadRoutes');
const searchRoute = require('./routes/searchRoutes');
const messagesRoute = require('./routes/messagesRoutes');

// Api routes
const postsApiRoute = require('./routes/api/posts');
const usersApiRoute = require('./routes/api/users');
const chatsApiRoute = require('./routes/api/chats');
const messagesApiRoute = require('./routes/api/messages');

app.use("/login", loginRoute);
app.use("/register", registerRoute);
app.use("/logout", logoutRoute);
app.use("/posts", middleware.requireLogin, postRoute);
app.use("/profile", middleware.requireLogin, profileRoute);
app.use("/uploads", uploadRoute);
app.use("/search", middleware.requireLogin, searchRoute);
app.use("/messages", middleware.requireLogin, messagesRoute);

app.use("/api/posts", postsApiRoute);
app.use("/api/users", usersApiRoute);
app.use("/api/chats", chatsApiRoute);
app.use("/api/messages", messagesApiRoute);

app.get("/", middleware.requireLogin, (req, res, next) => { //when the root of the site is accessed ("/"), first execute the step in between (requireLogin), and then the rest (that's why it's called middleware)
    var payload = {
        pageTitle: "Home",
        userLoggedIn: req.session.user,
        userLoggedInJs: JSON.stringify(req.session.user)
    }
    res.status(200).render("home", payload); //first parameter: home.pug, second parameter: data we want to send 
});

io.on("connection", socket => {
    socket.on("setup", userData => { //userData will be what's passed in to emit("setup") in clientSocket.js (userLoggedIn)
        socket.join(userData._id);
        socket.emit("connected"); //this goes back to the client (clientSocket.js) and will be handled by socket.on("connected")
    })
    socket.on("join room", room => socket.join(room)); // "receives" what was sent on socket.emit("join room")
    socket.on("typing", room => socket.in(room).emit("typing"));
    socket.on("stop typing", room => socket.in(room).emit("stop typing"));
    socket.on("new message", newMessage => {
        var chat = newMessage.chat;

        if (!chat.users) return console.log("Chat.users not defined");

        chat.users.forEach(user => {

            if (user._id == newMessage.sender._id) return;
            console.log(user);
            socket.in(user._id).emit("message received", newMessage);
        })
    });
})