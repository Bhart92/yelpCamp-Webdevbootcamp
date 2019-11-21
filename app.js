var express= require("express"),
 app = express(),
 bodyParser = require("body-parser"),
 mongoose = require("mongoose"),
 Campground = require("./models/campground"),
 Comment = require("./models/comment"),
 Review = require("./models/review"),
 passport = require("passport"),
 methodOverride = require("method-override"),
 localStrategy = require("passport-local"),
 moment = require("moment");
 User = require("./models/user");
 var commentRoutes    = require("./routes/comments"),
     campgroundRoutes = require("./routes/campgrounds"),
     authRoutes = require("./routes/auth");
var reviewRoutes = require("./routes/reviews");
var flash = require("connect-flash");

//Config
mongoose.connect("mongodb://localhost:27017/yelpCamp", {useNewUrlParser: true});
// mongoose.connect("mongodb+srv://bhart:bella21@cluster0-9mb0e.mongodb.net/yelpCamp?retryWrites=true", {
//   useNewUrlParser: true,
//   useCreateIndex: true,
// });



app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(flash());


// seedDB(); // Seeds databse




//passport config
app.use(require("express-session")({
  secret: "yelpcamp",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
//Routes
//adds currentUSer var to all templates .. req.user takes user info from passport
app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.error = req.flash("error");
   res.locals.success = req.flash("success");
   next();
});
app.locals.moment = require('moment');


app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);
app.use(authRoutes);
app.use("/campgrounds/:id/reviews", reviewRoutes);
app.get("/", function(req, res){
    res.render("landing");
});


// var port = process.env.PORT || 3000;
app.listen(3000, function(){
    console.log("live");
});
