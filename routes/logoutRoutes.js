const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const User = require('../schemas/UserSchema');

app.use(bodyParser.urlencoded({ extended: false }));

//this page is handling the route, it's not handling traffic to the server like in app.js with "app"
router.get("/", (req, res, next) => {
    if (req.session) {
        req.session.destroy(() => {
            res.redirect("/login");
        });
    }
});

module.exports = router;