const express = require('express');
const app = express();
const port = 3003;
const middleware = require('./middleware');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('./database');
const session = require('express-session');


const server = app.listen(port, () => console.log("Server listening on port " + port));

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

// Api routes
const postsApiRoute = require('./routes/api/posts');
const usersApiRoute = require('./routes/api/users');

app.use("/login", loginRoute);
app.use("/register", registerRoute);
app.use("/logout", logoutRoute);
app.use("/posts", middleware.requireLogin, postRoute);
app.use("/profile", middleware.requireLogin, profileRoute);
app.use("/uploads", uploadRoute);
app.use("/search", middleware.requireLogin, searchRoute);

app.use("/api/posts", postsApiRoute);
app.use("/api/users", usersApiRoute);

app.get("/", middleware.requireLogin, (req, res, next) => { //when the root of the site is accessed ("/"), first execute the step in between (requireLogin), and then the rest (that's why it's called middleware)
    var payload = {
        pageTitle: "Home",
        userLoggedIn: req.session.user,
        userLoggedInJs: JSON.stringify(req.session.user)
    }
    res.status(200).render("home", payload); //first parameter: home.pug, second parameter: data we want to send 
});
