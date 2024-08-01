require("dotenv").config({ path: "../uri.env" })
const express = require("express");
const Post = require("../Models/posts");
const { validationResult } = require("express-validator");
const fileHelper = require("../utils/fileHelper");
const User = require("../Models/user");
const io = require("../websocket")
const cloudinary = require('cloudinary').v2;


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
    const imageDataURI = req.body.image
    let imageFile;
    if (!validationError.isEmpty()) {
        const message = "Invalid Data input, check and try again";
        const error = new Error(message);
        error.statusCode = 422;
        return next(error);
    }
    if (!imageDataURI) {
        const error = new Error("No image file attached, please attatch the right image format (PNG, JPEG, JPG")
        error.statusCode = 422
        return next(error)
    }

    try {
        const currentUser = await User.findOne({ _id: req.userId })
        if (!currentUser) {
            const error = new Error("Invalid authorization token. Access denied")
            error.statusCode = 401;
            throw error
        }

        (async function () {

            // Configuration
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET
            });

            // Upload an image
            const uploadResult = await cloudinary.uploader
                .upload(imageDataURI, {
                    public_id: 'slampost-'+ Date.now(),
                    folder: "slam-post-blog"
                }).catch((error) => {
                    console.log(error);
                });

            // console.log(uploadResult);
            imageFile = uploadResult.secure_url
            const postBody = {
                title: req.body.title,
                content: req.body.content,
                creator: {
                    username: currentUser.username,
                    _id: req.userId
                },
                imageUrl: imageFile,
            };

            console.log(postBody)
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

            // Optimize delivery by resizing and applying auto-format and auto-quality
            // const optimizeUrl = cloudinary.url('slamposts', {
            //     fetch_format: 'auto',
            //     quality: 'auto'
            // });

            // console.log(optimizeUrl);

            // Transform the image: auto-crop to square aspect_ratio
            // const autoCropUrl = cloudinary.url('slamposts', {
            //     crop: 'auto',
            //     gravity: 'auto',
            //     width: 500,
            //     height: 500,
            // });
            // console.log(autoCropUrl);
        })();


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
        }
        next(err)
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
        user.status = statusUpdate;
        const savedUserStatus = await user.save()

        res.status(201).json({
            message: "status update was successful",
            status: savedUserStatus.status
        })
    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 422
        }
        next(err)
    }
}

exports.likePost = async (req, res, next) => {
    const postId = req.body.postId;
    const userId = req.body.userId;
    const postLike = req.body.postLike;
    let thisUser;
    let thisPost;
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error("Post not found. post is has either been removed or confined.")
                error.statusCode = 401
                return next(error)
            }
            thisPost = post
            if (postLike === "1") {
                post.likes.unshift(userId)
            }
            if (postLike === "-1") {
                post.likes.pop(userId)
            }
            return post.save()
        }).then(async (result) => {
            return User.findById(userId)
                .then(user => {
                    if (!user) {
                        const error = new Error("Unauthorized access. User must be signed in")
                        error.statusCode = 403
                        return next(error)
                    }
                    thisUser = user
                    if (postLike === "1") {
                        user.likedPosts.unshift(postId)
                    }
                    if (postLike === "-1") {
                        user.likedPosts.pop(postId)
                    }
                    return user.save()
                })
                .catch(err => {
                    if (!err.statusCode) {
                        err.statusCode = 403
                    }
                    next(err)
                })

        }).then(result => {
            if (!thisPost || !thisUser) {
                const error = new Error("unable to complete like operation")
                error.statusCode = 401
                return next(error)
            }
            const postCreatorId = thisPost.creator._id.toString()
            return User.findById(postCreatorId)
                .then(user => {
                    if (!user) {
                        const error = new Error("unable to complete like operation")
                        error.statusCode = 401
                        return next(error)
                    }
                    if (postLike === "1") {
                        user.likes.unshift(postId)
                    }
                    if (postLike === "-1") {
                        user.likes.pop(postId)
                    }
                    return user.save()
                })
        }).catch(err => {
            if (!err.statusCode) {
                err.statusCode = 403
            }
            next(err)
        })
}

exports.followUser = async (req, res, next) => {
    const currentUserId = req.body.userId;
    const followedUserId = req.body.followedUserId;
    const followOrUnfollow = req.body.followOrUnfollow

    try {
        const currentUser = await User.findById(currentUserId)
        const followedUser = await User.findById(followedUserId)
        if (!currentUser || !followedUser) {
            const error = new Error("user not found. An error occured.")
            error.statusCode = 500
            return next(error)
        }
        if (followOrUnfollow === "follow") {
            currentUser.following.unshift(followedUserId)
            followedUser.followers.unshift(currentUserId)
        }
        if (followOrUnfollow === "unfollow") {
            currentUser.following.pop(followedUserId)
            followedUser.followers.pop(currentUserId)
        }
        const savedCurrentUser = await currentUser.save()
        const savedfollowedUser = await followedUser.save()

        if (!savedCurrentUser || !savedfollowedUser) {
            const error = new Error("An completing the 'follow' operation.")
            error.statusCode = 500
            return next(error)
        }
        res.status(201).json({
            message: followOrUnfollow + " user was successful",
            ok: true
        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }

}