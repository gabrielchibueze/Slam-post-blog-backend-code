const mongoose = require("mongoose")
const Schema = mongoose.Schema

const enquirySchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    enquiry: {
        type: String,
        required: true,
    },
   user: {
    _id: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    username: {
        type: String
    }
   }
}, {timestamps: true})

module.exports = mongoose.model("Enquiry", enquirySchema)