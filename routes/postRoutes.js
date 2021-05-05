const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const User = require('../schemas/UserSchema');

//this page is handling the route, it's not handling traffic to the server like in app.js with "app"
router.get("/:id", (req, res, next) => {
    var payload = {
        pageTitle: "View post",
        userLoggedIn: req.session.user,
        userLoggedInJs: JSON.stringify(req.session.user),
        postId: req.params.id //req.params.id is the way to get the id from the url ("/:id")
    }
    res.status(200).render("postPage", payload);
});



module.exports = router;