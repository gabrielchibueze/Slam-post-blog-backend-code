const express = require("express");
const authController = require("../Controllers/auth");
const router = express.Router();
const { body } = require("express-validator");
const User = require("../Models/user");

router.put("/signup",
    [
        body("fullname").isLength({ min: 5 }),

        body("email").isEmail().trim().withMessage("Please enter a valid email address")
            .custom((value, { req }) => {
                return User.findOne({ email: value }).then(userDoc => {
                    if (userDoc) {
                        return Promise.reject("user account already exists, please sign in or use a different email address")
                    }
                })
            }).normalizeEmail(),

        body("username").trim().isLength({ min: 3, max: 12 }).withMessage("username should be a min. of 3 and max of 12 characters"),
        body("password").trim().isLength({ min: 6, max: 12 }).withMessage("password should be a min. of 6 and max of 12 characters"),

    ],
    authController.createUser);

router.put("/login",
    [
        body("email").isEmail().trim().withMessage("Please enter a valid email address")
            .custom((value, { req }) => {
                return User.findOne({ email: value }).then(userDoc => {
                    if (!userDoc) {
                        return Promise.reject("user account doest not exist, please sign in with correct email address")
                    }
                })
            }).normalizeEmail(),

        body("password").trim().isLength({ min: 6, max: 12 }).withMessage("password should be a min. of 6 and max of 12 characters"),

    ],
    authController.userLogin);


module.exports = router