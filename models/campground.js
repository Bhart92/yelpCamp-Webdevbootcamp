var mongoose = require("mongoose");

var campgroundSchema = new mongoose.Schema({
    name: String,
    image: String,
    price: String,
    imageId: String,
    description: String,
    reviews: [
     {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Review"
     }
     ],
     rating: {
         type: Number,
         default: 0
     },
    author: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      username: String
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
      }
    ],
    likes: [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
]
});
var Campground = mongoose.model("Campground", campgroundSchema);

module.exports = mongoose.model("Campground", campgroundSchema);
