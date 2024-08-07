require("dotenv").config()
const express = require("express");
const mongoose = require("mongoose")
const app = express()
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const cors = require("cors")
const helmet = require("helmet")
const compression = require("compression")
const morgan = require("morgan")
const csrf = require("csurf")
const cookieParser = require("cookie-parser")
const bodyParser = require("body-parser");
const postsRouter = require("./Routes/posts");
const authRouter = require("./Routes/auth");
const enquiryRouter = require("./Routes/enquiry")
const User = require("./Models/user")
const bcryptjs = require("bcryptjs")
const jwt = require("jsonwebtoken")

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = "./images/"
        fs.mkdir(uploadDir, { recursive: true }, (err) => {
            if (err) {
                throw err
            }
            cb(null, uploadDir)
        })
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname)
    }
});
const csrfProtection = csrf({ cookie: true })
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

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    // credentials: true
};

const accessLogStreams = fs.createWriteStream(path.join(__dirname, "access.log"), { flags: "a" })

app.use(helmet());
app.use(compression())
// app.use(morgan("combined", { stream: accessLogStreams }))

app.use(cors(corsOptions))
// app.use((req, res, next) => {
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, PUT, PATCH, OPTIONS')
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, csrf-Token');
//     if (req.method === "OPTIONS") {
//         return res.sendStatus(200)
//     }
//     next();
// })

app.use(cookieParser())
app.use(bodyParser.json())

app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single("image"))
// app.use(csrfProtection)

// app.put("/login", (req, res, next) => {
//     const password = req.body.password;
//     const email = req.body.email;
//     User.findOne({ email: email }).then(user => {
//         if (!user) {
//             const error = new Error("Invalid User login details")
//             error.statusCode = 422;
//             return next(error)
//         }

//         return bcryptjs
//             .compare(password, user.password)
//             .then(passwordCompare => {
//                 if (!passwordCompare) {
//                     const error = new Error("Invalid User login details entered")
//                     error.statusCode = 422;
//                     throw error
//                 }
//                 const token = jwt.sign({
//                     email: user.email,
//                     userId: user._id.toString()
//                 },
//                     "Mysecretloginsecret",
//                     {
//                         expiresIn: "1h"
//                     })
//                 res.status(200).json({
//                     message: "Login successful",
//                     token: token,
//                     user: { ...user._doc, password: null }
//                 })
//             }).catch(err => {
//                 next(err)
//             }).catch(err => {
//                 next()
//             })


//     }).catch(err => {
//         if (!err.statusCode) {
//             err.statusCode = 422
//             next(err)
//         }
//     })
// })
app.use("/auth", authRouter);
app.use("/feeds", postsRouter);
app.use(enquiryRouter)
app.use("/images", express.static(path.join(__dirname, "images")));
app.get('/slam/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});
app.use((error, req, res, next) => {
    const status = error.statusCode || 500;
    const message = error.message;
    res.status(status).json({
        message: message
    })
});

mongoose.connect(process.env.MONGODB_URI)
    .then(result => {
        const server = app.listen(process.env.PORT || 8080);
        const io = require("./websocket").init(server);
        io.on("connection", socket => {
            // console.log("connected")
        })
    }).catch(err => console.log(err))

