const express = require("express");
const router = express.Router();
const postsController = require("../Controllers/posts")
const isAuth = require("../middleware/is-auth")
const { body } = require("express-validator")


router.get("/posts", postsController.getPosts);
router.post("/post", isAuth, [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 7})
], postsController.createPost)

router.get("/posts/:postId", postsController.getSinglePost);

router.delete("/delete/:postId", isAuth, postsController.deletePost);

router.put("/edit/:postId", isAuth, [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 7, max: 150 })
], postsController.editPost);

router.patch("/status", isAuth, [
    body("status").trim().isLength({ min: 1 })
],
    postsController.statusUpdate
);
router.put("/likes", isAuth, postsController.likePost)
router.put("/follow", isAuth, postsController.followUser)
module.exports = router