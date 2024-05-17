require("dotenv").config({ path: "./uri.env" })
const express = require("express");
const mongoose = require("mongoose")
const app = express()
const multer = require("multer")
const path = require("path")
const cors = require("cors")


const bodyParser = require("body-parser");
const postsRouter = require("./Routes/posts");
const authRouter = require("./Routes/auth")

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "images/")
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname)
    }
});



const fileFilter = (req, file, cb) => {
    if (file.mimetype === "image/jpeg" ||
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpg"
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const corsOption = {
    origin: 'http://localhost:5173',
};
app.use(bodyParser.json())
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single("image"))
app.use("/images", express.static(path.join(__dirname, "images")))
app.use((error, req, res, next) => {
    const status = error.statusCode || 500;
    const message = error.message;
    res.status(status).json({
        message: message
    })
})
// app.use((req, res, next) => {
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, PUT, PATCH')
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//     next();
// })
app.use(cors(corsOption))
app.use("/auth", authRouter)
app.use("/feeds", postsRouter);

mongoose.connect(process.env.MONGODB_URI)
    .then(result => {
        const server = app.listen(8080);
        const io = require("./websocket").init(server);

        // const io = require("socket.io")(server);
        io.on("connection", socket => {
            console.log("client connected")
        })
    }).catch(err => console.log(err))