var passport = require('passport');
var localStrategy = require('passport-local').Strategy;
var facebookStrategy = require('passport-facebook').Strategy;
var db = require('../models');
require('dotenv').config();

passport.serializeUser(function(user, callback){
	callback(null, user.id);
});

passport.deserializeUser(function(id, callback){
	db.user.findById(id).then(function(user){
		callback(null, user);
	}).catch(function(err){
		callback(err, null);
	});
});

passport.use(new localStrategy({
	usernameField: 'email',
	passwordField: 'password'
}, function(email, password, callback){
	console.log('got to passport auth');
	console.log(email, password);
	db.user.findOne({
		where: {email: email}
	}).then(function(user){
		console.log('passport promise');
		console.log(user);
		if(!user || !user.isValidPassword(password)){
			callback(null, false);
		} else {
			callback(null, user);
		}
	}).catch(function(err){
		console.log('catch block', err);
		callback(err, null);
	});
}));

passport.use(new facebookStrategy({
	clientID: process.env.FACEBOOK_APP_ID,
	clientSecret: process.env.FACEBOOK_APP_SECRET,
	callbackURL: process.env.BASE_URL + '/auth/callback/facebook',
	profileFields: ['id', 'email', 'displayName'],
	enableProof: true
}, function(accessToken, refreshToken, profile, callback){
	//insert or access facebook user in user table
	//see if we have an email address we can use to identify user
	var facebookEmail = profile.emails ? profile.emails[0].value : null;

	//see if the email exists in the users table
	db.user.findOne({
		where: {email: facebookEmail}
	}).then(function(existingUser){
		//this user has logged in before
		if(existingUser && facebookEmail){
			existingUser.updateAttributes({
				facebookId: profile.id,
				facebookToken: accessToken
			}).then(function(updatedUser){
				callback(null, updatedUser);
			}).catch(callback);
		} else {
			//this person is just new, we need to create an entry for them in users table
			//parse user's name
			var usernameArr = profile.displayName.split(' ');
			db.user.findOrCreate({
				where: {facebookId: profile.id},
				defaults: {
					facebookToken: accessToken,
					email: facebookEmail,
					firstname: usernameArr[0],
					lastname: usernameArr[usernameArry.length - 1],
					username: profile.displayName
				}
			}).spread(function(user, wasCreated){
				if(wasCreated){
					//expected case: they were new and we created them in user table
					callback(null, user);
				} else{
					//they were not new after all - we just need to update the token (new session)
					user.facebookToken = accessToken;
					user.email = facebookEmail;
					user.save().then(function(updatedUser){
						callback(null, updatedUser);
					}).catch(callback);
				}
			}).catch(callback);
		}
	});
}));

module.exports = passport;