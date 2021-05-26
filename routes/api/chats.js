const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require("body-parser")
const Chat = require('../../schemas/ChatSchema');

app.use(bodyParser.urlencoded({ extended: false }));

router.post("/", async (req, res, next) => {
    if (!req.body.users) {
        console.log("Users param not sent with request");
        return res.sendStatus(400);
    }

    var users = JSON.parse(req.body.users); //we need to convert the string back to an object, because in $("#createChatButton").click() in common.js we stringified it

    if (users.length == 0) {
        console.log("Users array is empty");
        return res.sendStatus(400);
    }

    users.push(req.session.user);

    var chatData = {
        users: users,
        isGroupChat: true //even if it's just two people 
    };

    Chat.create(chatData)
        .then(results => res.status(200).send(results))
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
})

router.get("/", async (req, res, next) => {
    Chat.find({ users: { $elemMatch: { $eq: req.session.user._id } } })
        .populate("users")
        .sort({ updatedAt: -1 })
        .then(results => res.status(200).send(results))
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
})

module.exports = router;