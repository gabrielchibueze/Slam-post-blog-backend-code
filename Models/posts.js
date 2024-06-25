const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const postSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true,
    },
    imageUrl: {
        type: String,
        required: true
    },
    creator: {
        username: {
            type: String,
            required: true
        },
        _id: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        }

    },
    likes: [
        {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    ]

}, { timestamps: true })

module.exports = mongoose.model("Post", postSchema)