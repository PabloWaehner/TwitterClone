const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PostSchema = new Schema({
    content: { type: String, trim: true },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // the id that is automatically added to every document in the collection ("table" in mongoDB). ref determines that it's the ObjectId of the User
    pinned: Boolean,
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    retweetUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }], //all the users that retweeted this post
    retweetData: { type: Schema.Types.ObjectId, ref: 'Post' }, //the post that was retweeted (contains the id of the retweeted post)
    replyTo: { type: Schema.Types.ObjectId, ref: 'Post' },
    pinned: Boolean
}, { timestamps: true });

var Post = mongoose.model('Post', PostSchema);
module.exports = Post;