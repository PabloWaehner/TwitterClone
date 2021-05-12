const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    firstName: { type: String, require: true, trim: true },
    lastName: { type: String, require: true, trim: true },
    username: { type: String, require: true, trim: true, unique: true },
    email: { type: String, require: true, trim: true, unique: true },
    password: { type: String, require: true },
    profilePic: { type: String, default: "images/profilePic.png" },
    likes: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
    retweets: [{ type: Schema.Types.ObjectId, ref: 'Post' }], //an array of all the posts the user has retweeted
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

var User = mongoose.model('User', UserSchema);
module.exports = User;