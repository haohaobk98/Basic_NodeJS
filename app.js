var express = require('express');
var path = require('path');
var mongojs = require('mongojs');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
var session = require('express-session');

var User = require('./model/user');

var flash = require('connect-flash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
// set database
var mongo = require('mongodb');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/loginapp');
var db = mongoose.connection;

// init app
var app = express();

// set the views
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// set public
app.use(express.static(path.join(__dirname,'public')));

// thiết lập  Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// middleware được gọi ở từng request, kiểm tra session lấy ra passport.user nếu chưa có thì tạo rỗng.
app.use(passport.initialize());
// lấy thông tin user rồi gắn vào req.user 
app.use(passport.session());


  // Connect Flash
  app.use(flash());

//global vars
app.use(function(req,res,next){
//	res.locals.success_msg = req.flash('success_msg');
  //res.locals.error_msg = req.flash('error_msg');
  //res.locals.error = req.flash('error');
   // res.locals.message = null;
	res.locals.errors = null;
	res.locals.user = req.user || null;
	res.locals.mail = req.mail || null;
    next();
});

// Express Validator
app.use(expressValidator({
    errorFormatter: function(param, msg, value) {
        var namespace = param.split('.')
        , root    = namespace.shift()
        , formParam = root;
  
      while(namespace.length) {
        formParam += '[' + namespace.shift() + ']';
      }
      return {
        param : formParam,
        msg   : msg,
        value : value
      };
    }
  }));


// homepage route
app.get('/',function(req,res){
res.render('homepage');
});

// add new books
app.get('/book/add',function(req,res){
res.render('add_book');
});

// register
app.get('/register',function(req,res){
    res.render('register');
    });
// Register User
app.post('/register', function (req, res) {
	var name = req.body.name;
	var email = req.body.email;
	var username = req.body.username;
	var PhoneNumber = req.body.PhoneNumber;
	var password = req.body.password;
	var password2 = req.body.password2;

	// Validation
	req.checkBody('name', 'Name is required').notEmpty();
	req.checkBody('email', 'Email is required').notEmpty();
	req.checkBody('email', 'Email is not valid').isEmail();
	req.checkBody('username', 'Username is required').notEmpty();
	req.checkBody('PhoneNumber','PhoneNumber is required').notEmpty();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

	var errors = req.validationErrors();

	if (errors) {
		res.render('register', {
			errors: errors
		});
    }else {
		
		//checking for email and username are already taken
		User.findOne({ username: { 
			"$regex": "^" + username + "\\b", "$options": "i"
	    }}, function (err, user) {
			User.findOne({ email: { 
				"$regex": "^" + email + "\\b", "$options": "i"
		}}, function (err, mail) {
				if (user || mail) {
					res.render('register', {
						user: user,
						mail: mail
					});
				}
				else {
					var newUser = new User({
						name: name,
						email: email,
						username: username,
						password: password
					});
					User.createUser(newUser, function (err, user) {
						if (err) throw err;
						console.log(user);
					});
         	req.flash('success_msg', 'You are registered and can now login');
					res.redirect('/login');
				}
			});
		});
	}
    
});
//khi login thi chay middleware va goi den cai nay
passport.use(new LocalStrategy(
	function (username, password, done) {
		User.getUserByUsername(username, function (err, user) {
			if (err) throw err;
			if (!user) {
				return done(null, false, { message: 'Unknown User' });
			}

			User.comparePassword(password, user.password, function (err, isMatch) {
				if (err) throw err;
				if (isMatch) {
					return done(null, user);
				} else {
					return done(null, false, { message: 'Invalid password' });
				}
			});
		});
	}));
// ham duoc goi khi xac thực thành công để lưu thông tin user vào sesstion
passport.serializeUser(function (user, done) {
	done(null, user.id);
});
// giuos ta lấy dữ liệu user dựa vào thông tin lưu trên session và gắn vào req.user 
passport.deserializeUser(function (id, done) {
	User.getUserById(id, function (err, user) {
		done(err, user);
	});
});

// login
app.get('/login',function(req,res){
    res.render('login');
    });

app.post('/login',
	passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login', failureFlash: true }),
	function (req, res) {
		res.redirect('/',function(){
			alert("ban da dang nhap thanh cong");
		});
		
	});

	app.get('/logout', function (req, res) {
	req.logout();

	req.flash('success_msg', 'You are logged out');

	res.redirect('/');
});

// get follow list
app.get('/followList',checkAuthentication,function(req,res){
    res.render('followList');
});
function checkAuthentication(req,res,next){
    if(req.isAuthenticated()){
        //req.isAuthenticated() will return true if user is logged in
        next();
    } else{
        res.send("you have to login first");
    }
}


app.listen(3004,function(){
    console.log('server started at port 3004');
});