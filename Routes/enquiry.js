const express = require("express");
const { body } = require("express-validator");
const User = require("../Models/user");
const Enquiry = require("../Models/enquiry")

const router = express.Router();


router.put("/enquiry", async (req, res, next) => {
    const email = req.body.email;
    const name = req.body.name;
    const enquiry = req.body.enquiry
    const userId = req.body?.userId || null

    try {
        let memberId;
        let memberUsername;
        let user;
        if (userId) {
            user = await User.findById(userId)
            if (user) {
                memberId = user._id
                memberUsername = user.username
            }
        }
        const enquiryBody = {
            email: email,
            name: name,
            enquiry: enquiry,
            user: {
                _id: memberId || null,
                username: memberUsername || null
            }
        }
        const createEnquiry = new Enquiry(enquiryBody)
        const newEnquiry = await createEnquiry.save()
        if (!newEnquiry) {
            const error = new Error("Error sending enquiry. please try again")
            error.statusCode = 500;
            throw error
        }
        if(user){
            user.enquiries.unshift(newEnquiry._id)
            user.save()
        }
        res.status(201).json({
            message: "Enquiry has been created successfully",
            post: newEnquiry
        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 422
        }
        next(err)
    }
})

module.exports = router