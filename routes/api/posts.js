const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require('body-parser');
const User = require('../../schemas/UserSchema');
const Post = require('../../schemas/PostSchema');

app.use(bodyParser.urlencoded({ extended: false }));

router.get("/", async (req, res, next) => {
    var searchObj = req.query;

    if (searchObj.isReply !== undefined) {
        var isReply = searchObj.isReply == "true";
        searchObj.replyTo = { $exists: isReply }; //$exists is a MongoDB operator. It shows replyTo if isReply is true
        delete searchObj.isReply; //in javascript, "delete" deletes the property from an object
        // console.log(searchObj);
    }

    if (searchObj.search !== undefined) {
        searchObj.content = { $regex: searchObj.search, $options: "i" }; // $options: "i" will make it ignore the case (uppercase/lowercase)
        delete searchObj.search; //search is not a valid property, so it will return no results
    }

    if (searchObj.followingOnly !== undefined) {
        var followingOnly = searchObj.followingOnly == "true";

        if (followingOnly) {
            var objectIds = [];

            if (!req.session.user.following) {
                req.session.user.following = [];
            }

            req.session.user.following.forEach(user => {
                objectIds.push(user);
            })

            objectIds.push(req.session.user._id); //if we want to see our own posts
            searchObj.postedBy = { $in: objectIds }; //find posts where postedBy is anywhere in the objectIds array
        }

        delete searchObj.followingOnly; //because followingOnly is not part of the User's schema
    }

    var results = await getPosts(searchObj);
    res.status(200).send(results);
});

router.get("/:id", async (req, res, next) => {
    var postId = req.params.id;

    var postData = await getPosts({ _id: postId });
    postData = postData[0];

    var results = {
        postData: postData
    }

    if (postData.replyTo !== undefined) {
        results.replyTo = postData.replyTo;
    }

    results.replies = await getPosts({ replyTo: postId });

    res.status(200).send(results);
});

router.post("/", async (req, res, next) => {
    if (!req.body.content) {
        console.log("content param not sent with request");
        res.sendStatus(400);
        return;
    }

    var postData = {
        content: req.body.content,
        postedBy: req.session.user
    }

    if (req.body.replyTo) {
        postData.replyTo = req.body.replyTo;
    }

    Post.create(postData)
        .then(async newPost => {
            newPost = await User.populate(newPost, { path: "postedBy" }); //now the postedBy property is the user Object
            res.status(201).send(newPost); //the HTTP 201 Created success status response code indicates that the request has succeeded and has led to the creation of a resource(MDN web docs)
        })
        .catch(err => {
            console.log(err);
            res.sendStatus(400);
        })

});

router.put("/:id/like", async (req, res, next) => {
    var postId = req.params.id;
    var userId = req.session.user._id;

    var isLiked = req.session.user.likes && req.session.user.likes.includes(postId); //if that post (id) is found in the likes array (if the user liked that post)

    var option = isLiked ? "$pull" : "$addToSet"; //pull removes from the array, addToSet adds to it

    console.log("isLiked: ", isLiked);
    console.log("option: ", option);
    console.log("userId: ", userId);

    //Insert User like (this keeps track of the posts the user liked)
    req.session.user = await User.findByIdAndUpdate(userId, { [option]: { likes: postId } }, { new: true }) //option has to be between square brackets to be injected. With { new: true } we make sure that it returns the newly updated document
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })

    //Insert Post like (this updates the Post collection, that is, which user liked a specific post)
    var post = await Post.findByIdAndUpdate(postId, { [option]: { likes: userId } }, { new: true })
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })

    res.status(200).send(post); //for a put request it could also be 204: successful, but no content
});

router.post("/:id/retweet", async (req, res, next) => {
    var postId = req.params.id;
    var userId = req.session.user._id;

    //Try and delete retweets
    var deletedPost = await Post.findOneAndDelete({ postedBy: userId, retweetData: postId }) //this will delete the post and return it
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })

    var option = deletedPost != null ? "$pull" : "$addToSet";
    var repost = deletedPost;

    if (repost == null) {
        repost = await Post.create({ postedBy: userId, retweetData: postId })
            .catch(error => {
                console.log(error);
                res.sendStatus(400);
            })
    }

    //add or remove one's retweet
    req.session.user = await User.findByIdAndUpdate(userId, { [option]: { retweets: repost._id } }, { new: true }) //retweets is found in the UserSchema.js
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })

    //We add ourselves to the list of users that retweeted a post
    var post = await Post.findByIdAndUpdate(postId, { [option]: { retweetUsers: userId } }, { new: true }) //retweetUsers is found in the PostSchema.js
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })

    res.status(200).send(post); //for a put request it could also be 204: successful, but no content
});

router.delete("/:id", (req, res, next) => {
    Post.findOneAndDelete(req.params.id)
        .then(() => res.sendStatus(202))
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
})

router.put("/:id", async (req, res, next) => {
    if (req.body.pinned !== undefined) {
        await Post.updateMany({ postedBy: req.session.user }, { pinned: false }) //we want to set all the posts to pinned false first, because there can only be one pinned true 
            .catch(error => {
                console.log(error);
                res.sendStatus(400);
            })
    }

    Post.findByIdAndUpdate(req.params.id, req.body)
        .then(() => res.sendStatus(204))
        .catch(error => {
            console.log(error);
            res.sendStatus(400);
        })
})

async function getPosts(filter) {
    var results = await Post.find(filter)
        .populate("postedBy") //without it, the post would have "undefined" user
        .populate("retweetData")
        .populate("replyTo")
        .sort({ "createdAt": -1 }) //shows the posts in descending order (the newest in the top)
        .catch(error => console.log(error))

    results = await User.populate(results, { path: "replyTo.postedBy" });
    return await User.populate(results, { path: "retweetData.postedBy" });
}

module.exports = router;