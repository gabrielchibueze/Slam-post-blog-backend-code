const jwt = require("jsonwebtoken")

module.exports = (req, res, next) => {
    const authHeader = req.get("Authorization")
    if (!authHeader) {
        const error = new Error("Invalid unauthorization")
        error.statusCode = 401
        throw error
    }
    const token = authHeader.split(" ")[1]
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, "Mysecretloginsecret")
        if (!decodedToken) {
            const error = new Error("Invalid unauthorized")
            error.statusCode = 401
            throw error
        }
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 403
        }
    }
    req.userId = decodedToken.userId
    next()
}