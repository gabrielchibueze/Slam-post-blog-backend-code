const express = require("express");
const Post = require("../Models/posts");
const { validationResult } = require("express-validator");
const fileHelper = require("../utils/fileHelper");
const User = require("../Models/user");
const io = require("../websocket")

exports.getPosts = async (req, res, next) => {

    const itemsPerPage = +req.query.limit;
    const pageNumber = +req.query.page || 1;
    let skipAmount = itemsPerPage * (pageNumber - 1);

    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip(skipAmount)
            .limit(itemsPerPage)
        const totalItems = await Post.find().countDocuments()

        if (!posts) {
            const error = new Error("Error occured fecthing post data");
            error.statusCode = 500
            throw error;
        }

        res.json({
            message: "Data fetching was successful",
            posts: posts,
            totalItems: totalItems
        })
    }

    catch (err) {
        next(err)
    }
}
exports.createPost = async (req, res, next) => {
    const validationError = validationResult(req)
    if (!validationError.isEmpty()) {
        const message = "Invalid Data input, check and try again";
        const error = new Error(message);
        error.statusCode = 422;
        return next(error);
    }
    if (!req.file) {
        const error = new Error("No image file attach, please attatch the right image format (PNG, JPEG, JPG")
        error.statusCode = 422
        return next(error)
    }

    // let currentUser;
    try {
        const currentUser = await User.findOne({ _id: req.userId })
        if (!currentUser) {
            const error = new Error("Invalid authorization token. Access denied")
            error.statusCode = 401;
            throw error
        }

        const postBody = {
            title: req.body.title,
            content: req.body.content,
            creator: {
                username: currentUser.username,
                _id: req.userId
            },
            imageUrl: req.file.path.replace("\\", "/"),
        };

        const post = new Post(postBody);
        const savedPost = await post.save();
        io.getIO().emit("posts", {
            action: "create",
            post: savedPost,
            user: post.creator
        })
        if (savedPost) {
            res.status(201).json({
                message: "Post has been created successfully",
                post: savedPost
            })
        }

        currentUser.posts.push({ _id: savedPost._id })
        currentUser.save()

    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }
}

exports.getSinglePost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
        const post = await Post.findById(postId)
        if (!post) {
            const error = new Error("There was an error fectching post details")
            error.statusCode = 500
            throw error
        }

        res.status(200).json({
            message: "fectching of post details was successful",
            post: post
        })
    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err)
    }
}

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId
    const userId = req.userId
    try {
        const user = await User.findById(userId)

        if (!user) {
            const error = new Error("Unathorized access");
            error.statusCode = 500;
            throw error
        }

        const post = await Post.findById(postId)
        if (post.creator._id.toString() !== user._id.toString()) {
            const error = new Error("Unauthozised access.");
            error.statusCode = 500;
            throw error
        }
        fileHelper.deleteFIle(post.imageUrl)
        const deletePost = await Post.findByIdAndDelete(postId)
        if (!deletePost) {
            const error = new Error("Error deleting post.");
            error.statusCode = 500;
            throw error
        }
        io.getIO().emit("posts", { action: "delete", postId: postId })
        res.status(200).json({
            message: "post have been successfully deleted",
            post: post
        })

        user.posts.pull(postId);
        return user.save()
    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err)
    }
}

exports.editPost = async (req, res, next) => {
    const postId = req.params.postId
    const title = req.body.title;
    const content = req.body.content
    let imageUrl = req.file?.path.replace("\\", "/") || null
    console.log(req.body.image)

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        const error = new Error("An Error occured while updating message, check if the input values are correct")
        error.statusCode = 422;
        return next(error)
    }
    if (!imageUrl && !req.body.image) {
        const error = new Error("No image file attached.")
        error.statusCode = 422
        return next(error)
    }
    try {
        const post = await Post.findById(postId)
        post.title = title;
        post.content = content;
        if (imageUrl) {
            fileHelper.deleteFIle(post.imageUrl)
            post.imageUrl = imageUrl
        }
        const savedPost = await post.save()
        io.getIO().emit("posts", {
            action: "update",
            post: savedPost,
            user: post.creator
        })
        res.status(201).json({
            message: "Post successfully upated",
            post: savedPost
        })
    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 422
            next(err)
        }
    }
}

exports.statusUpdate = async (req, res, next) => {
    const userId = req.userId;
    const statusUpdate = req.body.status;
    try {
        const user = await User.findById(userId)
        if (!user) {
            const error = new Error("Unauthorized access. User must be signed in")
            error.statusCode = 403
            return next(error)
        }
        user.userStatus = statusUpdate;
        const savedUserStatus = await user.save()

        res.status(201).json({
            message: "status update was successful",
            userStatus: savedUserStatus.userStatus
        })
    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 422
        }
        next(err)
    }
}