var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var Review = require("../models/review");
var Comment = require("../models/comment");
var middleware = require("../middleware");
require("dotenv").config();
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|jfif)$/i)) {
        return cb(new Error(''), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})
var cloudinary = require('cloudinary');
cloudinary.config({
  cloud_name: 'brandeno92',
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});
//campground routes

//INDEX - show all campgrounds
router.get("/", function(req, res){
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
            Campground.count({name: regex}).exec(function (err, count) {
                if (err) {
                    console.log(err);
                    res.redirect("back");
                } else {
                    if(allCampgrounds.length < 1) {
                        noMatch = "No campgrounds match that query, please try again.";
                    }
                    res.render("campgrounds/campgrounds", {
                        campgrounds: allCampgrounds,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: req.query.search
                    });
                }
            });
        });
    } else {
        // get all campgrounds from DB
        Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
            Campground.count().exec(function (err, count) {
                if (err) {
                    console.log(err);
                } else {
                    res.render("campgrounds/campgrounds", {
                        campgrounds: allCampgrounds,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: false
                    });
                }
            });
        });
    }
});
//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
  if(!req.file){
    req.flash('error', "it didnt work");
    res.redirect("back");
  } else{
    cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
      if(err) {
        return res.redirect('back');
      }
      // add cloudinary url for the image to the campground object under image property
      req.body.campground.image = result.secure_url;
      // add image's public_id to campground object
      req.body.campground.imageId = result.public_id;
      // add author to campground
      req.body.campground.author = {
        id: req.user._id,
        username: req.user.username
      }
      Campground.create(req.body.campground, function(err, campground) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        res.redirect('/campgrounds/' + campground.id);
      });
    });
  }
});
// the "new: route -- shows form"
router.get("/new", middleware.isLoggedIn, function(req, res){
    res.render("campgrounds/new.ejs");
})
//SHOW - shows more info about one campground
router.get("/:id", function(req, res){
    Campground.findById(req.params.id).populate("comments likes").populate({
      path: "reviews",
      options: {sort: {createdAt: -1}}
    }).exec(function(err, foundCampground){
        if(err || !foundCampground){
          req.flash("error", "Campground not found");
          res.redirect("back");
        } else{
            res.render("campgrounds/show.ejs", {campground: foundCampground});
        }
    });
});
//edit routes
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
  Campground.findById(req.params.id, function(err, foundCampground){
    res.render("campgrounds/edit", {campground: foundCampground});
  });
});
router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), function(req, res){
  //find and update correction campgrounds
  Campground.findById(req.params.id, async function(err, campground){
    if(err){
      req.flash("error", err.message);
      res.redirect("back");
    } else{
        if(req.file){
          try{
            await cloudinary.v2.uploader.destroy(campground.imageId);
            var result = await cloudinary.v2.uploader.upload(req.file.path);
            campground.imageId = result.public_id;
            campground.image = result.secure_url;
          } catch(err){
            req.flash("error", err.message);
            return res.redirect("back");
          }
      }
      campground.name = req.body.name
      campground.description = req.body.description;
      campground.save();
      req.flash("success", "Successfully updated!");
      res.redirect("/campgrounds/" + req.params.id);
    }
  });
});
//delete route
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res){
  Campground.findById(req.params.id, function(err, campground){
    if(err){
      req.flash("error", err.message);
      return res.redirect("back");
    } else {
      try{
        // deletes all comments associated with the campground
        Comment.remove({"_id": {$in: campground.comments}}, function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/campgrounds");
            }
            // deletes all reviews associated with the campground
            Review.remove({"_id": {$in: campground.reviews}}, async function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/campgrounds");
                }
                //  delete the campground
                await cloudinary.v2.uploader.destroy(campground.imageId);
                campground.remove();
                req.flash("success", "Success!");
                res.redirect('/campgrounds');
            });
        });
      } catch(err){
        req.flash("error", err.message);
        return res.redirect("back");
      }
    }
  });
});
// Campground like route
// Campground Like Route
router.post("/:id/like", middleware.isLoggedIn, function (req, res) {
    Campground.findById(req.params.id, function (err, foundCampground) {
        if (err) {
            console.log(err);
            return res.redirect("/campgrounds");
        }

        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundCampground.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCampground.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCampground.likes.push(req.user);
        }

        foundCampground.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/campgrounds");
            }
            return res.redirect("/campgrounds/" + foundCampground._id);
        });
    });
});
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;
