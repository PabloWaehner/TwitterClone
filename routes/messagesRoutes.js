const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../schemas/UserSchema');
const Chat = require('../schemas/ChatSchema');

router.get("/", (req, res, next) => {
    res.status(200).render("inboxPage", {
        pageTitle: "Inbox",
        userLoggedIn: req.session.user,
        userLoggedInJs: JSON.stringify(req.session.user)
    });
})

router.get("/new", (req, res, next) => {
    res.status(200).render("newMessage", {
        pageTitle: "New message",
        userLoggedIn: req.session.user,
        userLoggedInJs: JSON.stringify(req.session.user)
    });
})

router.get("/:chatId", async (req, res, next) => {

    var userId = req.session.user._id;
    var chatId = req.params.chatId;
    var isValidId = mongoose.isValidObjectId(chatId); //it checks if I'm not actually writing gibberish on the url (messages/id)

    var payload = {
        pageTitle: "Chat",
        userLoggedIn: req.session.user,
        userLoggedInJs: JSON.stringify(req.session.user)
    };

    if (!isValidId) {
        payload.errorMessage = "Chat does not exist or you do not have permission to view it.";
        return res.status(200).render("chatPage", payload);
    }

    var chat = await Chat.findOne({ _id: chatId, users: { $elemMatch: { $eq: userId } } }) //$elemMatch and $eq are mongodb operators
        .populate("users");

    if (chat == null) {
        // Check if chat id is really user id
        var userFound = await User.findById(chatId);

        if (userFound != null) {
            // get chat using user id
            chat = await getChatByUserId(userFound._id, userId);
        }
    }

    if (chat == null) {
        payload.errorMessage = "Chat does not exist or you do not have permission to view it.";
    }
    else {
        payload.chat = chat;
    }

    res.status(200).render("chatPage", payload);
})

function getChatByUserId(userLoggedInId, otherUserId) {
    return Chat.findOneAndUpdate({ //this is like a 'where' clause
        isGroupChat: false,
        users: {
            $size: 2,
            $all: [ //we also look 'where' all of these conditions are met
                { $elemMatch: { $eq: mongoose.Types.ObjectId(userLoggedInId) } },
                { $elemMatch: { $eq: mongoose.Types.ObjectId(otherUserId) } }
            ]
        }
    },
        { //if we didn't find one chat, we create it
            $setOnInsert: {
                users: [userLoggedInId, otherUserId]
            }
        },
        {
            new: true, //return the newly updated row
            upsert: true //if the chat wasn't found, create it (doing $setOnInsert)
        })
        .populate("users");
}


module.exports = router;