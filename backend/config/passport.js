const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { OIDCUser } = require("../routes/mongoSchema");
const { registerUser } = require("../services"); 
const jwt = require("jsonwebtoken");

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
				// Check MongoDB for existing OIDC user
				let user = await OIDCUser.findOne({ providerId: profile.id });

				if (!user) {
					// 1️⃣ Create corresponding PostgreSQL user
					const pgUser = await registerUser({
						email: profile.emails[0].value,
						name: profile.displayName,
						role: "CarOwner", // default
						password: null, // OAuth users don't have password
					});

					// 2️⃣ Create MongoDB OIDC user including pg_user_id
					const userData = {
						provider: "google",
						providerId: profile.id,
						email: profile.emails[0].value,
						name: profile.displayName,
						picture: profile.photos[0]?.value,
						pg_user_id: pgUser.user_id, // link to PostgreSQL
					};

					user = await OIDCUser.create(userData);
					console.log(
						`✅ Created new Google user in Mongo + PostgreSQL: ${user.email}`
					);
				} else {
					// Optional: ensure pg_user_id exists
					if (!user.pg_user_id) {
						const pgUser = await registerUser({
							email: user.email,
							name: user.name,
							role: "CarOwner",
							password: null,
						});
						user.pg_user_id = pgUser.user_id;
						await user.save();
						console.log(
							`🔧 Added missing pg_user_id for existing Google user: ${user.email}`
						);
					}

					console.log(`🔁 Existing user logged in: ${user.email}`);
				}

				return done(null, user);
			} catch (error) {
				console.error("❌ Google login error:", error);
				return done(error, null);
			}
		}
	)
);

// Serialize/deserialize
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
	try {
		const user = await OIDCUser.findById(id);
		done(null, user);
	} catch (err) {
		done(err, null);
	}
});

module.exports = passport;
