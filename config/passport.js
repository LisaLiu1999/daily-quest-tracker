// config/passport.js
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const User = require('../models/User'); 
// const { encrypt } = require('../utils/crypto'); // <-- 移除

module.exports = function(passport) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
        const googleUser = {
            googleId: profile.id,
            username: profile.displayName,
            email: profile.emails[0].value,
        };
        try {
            let user = await User.findOne({ googleId: googleUser.googleId });
            if (user) {
                return done(null, user);
            } else {
                // (移除 Crypto) - 使用明文 email 比對
                user = await User.findOne({ email: googleUser.email });
                if (user) {
                    return done(null, false, { message: 'Email already registered locally.' });
                }
                // (移除 Crypto) - 建立新使用者 (使用明文 email)
                user = await User.create({
                    googleId: googleUser.googleId,
                    username: googleUser.username,
                    email: googleUser.email, // <-- 儲存明文 email
                    role: 'User'
                });
                console.log(`New user created via Google SSO: ${googleUser.email}`);
                return done(null, user);
            }
        } catch (err) {
            console.error(err);
            return done(err, false);
        }
    }));

    // (Passport 序列化/反序列化 - 保持不變)
    passport.serializeUser((user, done) => { done(null, user.id); });
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};