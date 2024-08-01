const bcryptjs = require("bcryptjs");
const User = require("../Models/user");
const jwt = require("jsonwebtoken")
const { validationResult } = require("express-validator")


exports.createUser = (req, res, next) => {
    const fullname = req.body.fullname;
    const email = req.body.email;
    const username = req.body.username;
    const password = req.body.password
    const validationError = validationResult(req)
    if (!validationError.isEmpty()) {
        const message = validationError.array()[0].msg
        const error = new Error(message);
        error.statusCode = 422;
        throw error
    }
    bcryptjs.hash(password, 12).then(hashedPassword => {
        const user = new User({
            fullname: fullname,
            email: email,
            username: username,
            password: hashedPassword
        });
        return user.save()
    }).then(user => {
        res.status(201).json({
            message: "User account created successfully",
            userId: user._id,
            username: user.username
        })
    }).catch(err => {
        if (!err.statusCode) {
            err.statusCode = 422
            next(err)
        }
    })
}


exports.userLogin = (req, res, next) => {
    const password = req.body.password;
    const email = req.body.email;
    
    User.findOne({ email: email }).then(user => {
        if (!user) {
            const error = new Error("Invalid User login details")
            error.statusCode = 422;
            return next(error)
        }

        return bcryptjs.compare(password, user.password)
            .then(passwordCompare => {
                if (!passwordCompare) {
                    const error = new Error("Invalid User login details entered")
                    error.statusCode = 422;
                    throw error
                }
                const token = jwt.sign({
                    email: user.email,
                    userId: user._id.toString()
                },
                    "Mysecretloginsecret",
                    {
                        expiresIn: "1h"
                    })
                res.status(200).json({
                    message: "Login successful",
                    token: token,
                    user: { ...user._doc, password: null }
                })
            }).catch(err => {
                next(err)
            }).catch(err => {
                next()
            })


    }).catch(err => {
        if (!err.statusCode) {
            err.statusCode = 422
            next(err)
        }
    })
};

exports.getUser = async (req, res, next) => {
    const userId = req.params.userId
    try {
        if (!userId) {
            const error = new Error("Unauthorized access");
            error.statusCode = 401;
            throw error
        };
        const user = await User.findById(userId).populate("enquiries").populate("posts");
        if (!user) {
            const error = new Error("Unauthorized access");
            error.statusCode = 401;
            throw error
        }
        res.status(200).json({
            ...user._doc, password: null
        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 401
        }
    }



}