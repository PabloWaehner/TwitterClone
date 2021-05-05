const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require('body-parser'); // body-parser is the way to handle user input
const bcrypt = require('bcrypt'); //to hash the password
const User = require('../schemas/UserSchema');

app.set("view engine", "pug");
app.set("views", "views");

app.use(bodyParser.urlencoded({ extended: false })); //extended:false means the body will only be able to contain key-value pairs made up of strings or arrays

//this page is handling the route, it's not handling traffic to the server like in app.js with "app"
router.get("/", (req, res, next) => {
    res.status(200).render("register");
});

router.post("/", async (req, res, next) => { //we make it async to use await later
    // console.log(req.body); //I can do req.body because I'm using bodyParser (without bodyParser there is no body object in req)
    // I'm creating these variables to use in the if statement
    var firstName = req.body.firstName.trim(); //firstName is the way I have it in the input name attribut in register.pug
    var lastName = req.body.lastName.trim();
    var username = req.body.username.trim();
    var email = req.body.email.trim();
    var password = req.body.password;

    var payload = req.body;

    if (firstName && lastName && username && email && password) {
        var user = await User.findOne({ //returns a promise. await makes sure that it waits for this operation to complete before continuing
            $or: [ //it will look for the rows where either the username OR the email is found
                { username: username },
                { email: email }
            ]
        })
            .catch((error) => {
                console.log(error);
                payload.errorMessage = "Something went wrong.";
                res.status(200).render("register", payload);
            })

        if (user == null) {
            //User not found
            var data = req.body;
            data.password = await bcrypt.hash(password, 10); //the second parameter is the salt rounds. 2 to the power of 10. The higher the number the safer (but also the slower)
            User.create(data) //create is like insert (it returns a promise)
                .then((user) => {
                    req.session.user = user;
                    return res.redirect("/");
                })
        } else {
            if (email == user.email) {
                payload.errorMessage = "Email already in use";
            } else {
                payload.errorMessage = "Username already in use";
            }
            res.status(200).render("register", payload);
        }
    } else {
        payload.errorMessage = "Make sure each field has a valid value."; //I'm creating a new property in the payload object called errorMessage
        // console.log("payload", payload);
        res.status(200).render("register", payload);
    }


});


module.exports = router;