var express = require("express");
var router = express.Router();
var User = require("../models/user");
var passport = require("passport");
var Campground = require("../models/campground");
var Review = require("../models/campground");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
require("dotenv").config();
//auth routes//////////////
//register route
router.get("/register", function(req, res){
  res.render("register");
});
//register logic
router.post("/register", function(req, res){
  var newUser = new User({
    username: req.body.username,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    avatar: req.body.avatar
    });
  if(req.body.adminCode === 'secretcode123'){
    newUser.isAdmin = true;
  }
User.register(newUser, req.body.password, function(err, user){
  if(err){
    console.log(err);
    req.flash("error", err.message);
    return res.redirect("/register");
  }
    passport.authenticate("local")(req, res, function(){
      req.flash("success", "Welcome to yelpcampe " + user.username );
    res.redirect("/campgrounds");
    });
  });
});
//login route
router.get("/login", function(req, res){
res.render("login");
});
//login logic
router.post("/login", passport.authenticate("local",
{
  successRedirect: "/campgrounds", failureRedirect: "/login"
}), function(req, res){

});
//logout route
router.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});
router.get("/users/:id", function(req, res) {
  User.findById(req.params.id, function(err, foundUser) {
    if(err) {
      res.send(err);
      console.log(foundUser);
    }
    Campground.find().where('author.id').equals(foundUser._id).exec(function(err, campgrounds) {
      if(err) {
        req.flash("error", "Something went wrong.");
        return res.redirect("/");
      }
      res.render("users/show", {user: foundUser, campgrounds: campgrounds});
    })
  });
});
//////////////
//password reset
router.get("/forgot", function(req, res){
  res.render("forgot");
});
router.post("/forgot", function(req, res){
  async.waterfall([
    function(done){
      crypto.randomBytes(20, function(err, buf){
        if(err){
          req.flash("Something went wrong, plase try again");
          res.redirect("back");
        }
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done){
      User.findOne({email: req.body.email }, function(err, user){
        if(err){
          req.flash("Something went wrong, plase try again");
          res.redirect("back");
        }
        if(!user){
          req.flash("error", "No account with that email address found");
          return res.redirect("/forgot");
        }
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // pass change token expires after 1 hour

        user.save(function(err){
          done(err, token, user);
        });
      });
    },
    function(token, user, done){
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: 'hartwebdev92@gmail.com', //Left of at 6:30 for youtube course -- password reset ********************!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!,
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'hartwebdev92@gmail.com',
        text: 'Click the link below to change your apssword. http://' + req.headers.host + '/reset/' + token + '\n\n'
      };
      smtpTransport.sendMail(mailOptions, function(err){
        if(err){
          req.flash("Something went wrong, plase try again");
          res.redirect("back");
        }
        console.log('mail sent');
        req.flash("success", 'email has been sent');
        done(err, 'done');
      });
    }
  ], function(err){
    if(err) return next(err);
    res.redirect('/forgot');
  });
});
router.get('/reset/:token', function(req, res){
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user){
    if(err){
      req.flash("Something went wrong, plase try again");
      res.redirect("back");
    }
    if(!user){
      req.flash('error', 'Password reset token is invalid or has expired.');
      return red.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});
router.post("/reset/:token", function(req, res){
  async.waterfall([
    function(done){
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user){
        if(err){
          req.flash("Something went wrong, plase try again");
          res.redirect("back");
        }
        if(!user){
          req.flash('error', 'Password reset token is invalid or has expired.');
          return red.redirect('/forgot');
        }
        if(req.body.password === req.body.confirm){
          user.setPassword(req.body.password, function(err){
            if(err){
              req.flash("Something went wrong, plase try again");
              res.redirect("back");
            }
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err){
              if(err){
                req.flash("Something went wrong, plase try again");
                res.redirect("back");
              }
              req.logIn(user, function(err){
                done(err, user);
              });
            });
          });
        } else{
          req.flash("error", "passwords do not match");
          return res.redirect("back");
        }
      });
    },
    function(user, done){
       var smtpTransport = nodemailer.createTransport({
         service: 'Gmail',
         auth: {
           user: 'hartwebdev92@gmail.com',
           pass: process.env.GMAILPW
         }
       });
       var mailOptions = {
         to: user.email,
         from: 'hartwebdev92.com',
         subject: 'Your password has been changed',
         text: 'Hello, \n\n' +
                'This is a confirmation that the password for your account ' + user.email + 'has just been changed'
       };
       smtpTransport.sendMail(mailOptions, function(err){
         if(err){
           req.flash("Something went wrong, plase try again");
           res.redirect("back");
         }
         req.flash("success", 'Sucess! your password had been Changed!');
         done(err);
       });
    }
  ],function(err){
    if(err){
      req.flash("Something went wrong, plase try again");
      res.redirect("back");
    }
    res.redirect('/campgrounds');
  });
});
//////////////





module.exports = router;
