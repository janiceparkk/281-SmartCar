const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: process.env.GOOGLE_CALLBACK_URL,
			scope: ["profile", "email"],
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				// User profile data
				const user = {
					id: profile.id,
					email: profile.emails[0].value,
					name: profile.displayName,
					picture: profile.photos[0].value,
					provider: "google",
				};

				// Here you can save to your database
				console.log("Google user authenticated:", user.email);

				return done(null, user);
			} catch (error) {
				return done(error, null);
			}
		}
	)
);

// Serialize/Deserialize (same as before)
passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((user, done) => {
	done(null, user);
});

module.exports = passport;
