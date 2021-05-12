const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const upload = multer({ dest: "uploads/" }); //multer will store the files in this "destination" (uploads/)
const User = require('../../schemas/UserSchema');
const Post = require('../../schemas/PostSchema');

app.use(bodyParser.urlencoded({ extended: false }));

router.put("/:userId/follow", async (req, res, next) => {
    var userId = req.params.userId;

    var user = await User.findById(userId);

    if (user == null) return res.sendStatus(400);

    //with user.followers we make sure the followers array exists. Then we check if the user logged in is in the followers array
    var isFollowing = user.followers && user.followers.includes(req.session.user._id);
    var option = isFollowing ? "$pull" : "$addToSet";

    //find user logged-in and add/remove userId (the person the logged-in user followed/unfollowed) from following array
    req.session.user = await User.findByIdAndUpdate(req.session.user._id, { [option]: { following: userId } }, { new: true })
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })

    User.findByIdAndUpdate(userId, { [option]: { followers: req.session.user._id } })
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })

    res.status(200).send(req.session.user);
});

router.get("/:userId/following", async (req, res, next) => {
    User.findById(req.params.userId)
        .populate("following") //this way it returns the user's Object, othwerwise it's just an id (in the users collection in mongoDB, under "following")
        .then(results => {
            res.status(200).send(results);
        })
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
});

router.get("/:userId/followers", async (req, res, next) => {
    User.findById(req.params.userId)
        .populate("followers")
        .then(results => {
            res.status(200).send(results);
        })
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
});

// upload.single because we process a single file
router.post("/profilePicture", upload.single("croppedImage"), async (req, res, next) => { //croppedImage is what was appended to formData in common.js, canvas.toBlob
    if (!req.file) { //we have file in req, because we npm installed multer
        console.log("No file uploaded with ajax request.");
        return res.sendStatus(400);
    }

    var filePath = `uploads/images/${req.file.filename}.png`;
    var tempPath = req.file.path;
    var targetPath = path.join(__dirname, `../../${filePath}`);

    fs.rename(tempPath, targetPath, async error => {
        if (error != null) {
            console.log(error);
            return res.sendStatus(400);
        }

        // we use req.session.user so that the change is everywhere
        req.session.user = await User.findByIdAndUpdate(req.session.user._id, { profilePic: filePath }, { new: true }); //findByIdAndUpdate returns the object before it is updated, we need to do {new:true} so it returns the object AFTER it is updated 
        res.sendStatus(204); //success, but no content
    })

});

module.exports = router;