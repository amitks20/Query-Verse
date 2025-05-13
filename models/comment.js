const mongoose = require("mongoose");

const commentSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "post"
    },
    content: String,
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('comment', commentSchema);
