var express = require('express');
var passport = require('../config/passportConfig');
var db = require('../models');
var router = express.Router();

router.get('/login', function(req, res){
	res.render('auth/login');
});

router.post('/login', passport.authenticate('local', {
	successRedirect: '/profile',
	successFlash: 'Login successful',
	failureRedirect: '/auth/login',
	failureFlash: 'Invalid credentials'
}));

router.get('/signup', function(req, res){
	res.render('auth/signup');
});

router.post('/signup', function(req, res, next){
	console.log(req.body, '= req.body');
	db.user.findOrCreate({
		where: {email:req.body.email},
		defaults: {
			username: req.body.username,
			firstname: req.body.firstname,
			lastname: req.body.lastname,
			password: req.body.password
		}
	}).spread(function(user, wasCreated){
		if(wasCreated){
			//Good job, you didn't try to make a duplicate!
			passport.authenticate('local', {
				successRedirect: '/profile',
				successFlash: 'Successfully logged in',
			})(req, res, next);
		} else {
			//bad job, tried to sign up when you should login
			req.flash('error', 'Email already exists');
			res.redirect('/auth/login');
		}
	}).catch(function(err){
		req.flash('error', err.message);
		res.redirect('/auth/signup');
	});
});

router.get('/logout', function(req, res){
	req.logout();
	req.flash('success', 'Successfully logged out');
	res.redirect('/');
});

//calls the passport-facebook strategy (located in passport config)
router.get('/facebook', passport.authenticate('facebook', {
	scope: ['public_profile', 'email']
}));

//handle the response from facebook(logic located in passport config)
router.get('/callback/facebook', passport.authenticate('facebook', {
	successRedirect: '/profile',
	successFlash: 'You successfully logged in via Facebook',
	failureRedirect: '/auth/login',
	failureFlash: 'You tried to login with FB, but FB does not like you.'
}));

module.exports = router;