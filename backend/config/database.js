const { Pool } = require("pg");
const mongoose = require("mongoose");
const pgPool = new Pool({
	user: process.env.PG_USER,
	host: process.env.PG_HOST,
	database: process.env.PG_DATABASE,
	password: process.env.PG_PASSWORD,
	port: process.env.PG_PORT,
});

// MongoDB Connection
const connectMongoDB = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log("[DB] MongoDB connected");
	} catch (error) {
		console.error("[DB] MongoDB connection error:", error);
		throw error;
	}
};

module.exports = {
	pgPool,
	connectMongoDB,
	mongoose,
};
