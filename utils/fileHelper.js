const fs = require("fs")

exports.deleteFIle = (filePath) => {

    return fs.unlink(filePath, (err) => {
        if (err) {
            err.statusCode = 422;
            err.message = "Error occured while deleting the post image"
        }
    })
    
}