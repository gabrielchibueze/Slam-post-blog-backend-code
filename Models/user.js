const mongoose = require("mongoose")
const Schema = mongoose.Schema;

const userSchema = new Schema({
    fullname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true
    },
    status: {
        type: String,
    },
    posts: [
        {
            type: Schema.Types.ObjectId,
            ref: "Post",
        }
    ],
    likedPosts: [
        {
            type: Schema.Types.ObjectId,
            ref: "Post"
        }
    ],
    likes: [
        {
            type: Schema.Types.ObjectId,
            ref: "Post"
        }
    ],
    following: [
        {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    enquiries: [
        {
            type: Schema.Types.ObjectId,
            ref: "Enquiry"
        }
    ],
    followers: [
        {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    ]
}, { timestamps: true })

module.exports = mongoose.model("User", userSchema)