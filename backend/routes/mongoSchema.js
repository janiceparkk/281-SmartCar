const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema(
	{
		alert_id: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		car_id: {
			type: String,
			required: true,
			index: true,
		},
		alert_type: {
			type: String,
			required: true,
			enum: [
				"collision",
				"horn",
				"siren",
				"glass_break",
				"gunshot",
				"scream",
				"tire_skid",
				"engine_trouble",
				"brake_squeal",
				"other",
			],
		},
		sound_classification: {
			type: String,
		},
		confidence_score: {
			type: Number,
			required: true,
			min: 0,
			max: 1,
		},
		location: {
			latitude: Number,
			longitude: Number,
			accuracy: Number, // in meters
		},
		audio_context: {
			duration: Number, // in seconds
			decibel_level: Number,
			frequency_range: [Number], // [min_freq, max_freq] in Hz
			timestamp: Date,
		},
		status: {
			type: String,
			default: "Active",
			enum: ["Active", "Acknowledged", "Resolved", "False Positive"],
			index: true,
		},
		assigned_to: {
			type: String, // User ID or service staff ID
			required: false,
		},
		resolution_notes: {
			type: String,
			required: false,
		},
		resolved_at: {
			type: Date,
			required: false,
		},
	},
	{
		timestamps: true,
	}
);

// Indexes for efficient querying
AlertSchema.index({ car_id: 1, createdAt: -1 });
AlertSchema.index({ alert_type: 1, status: 1 });
AlertSchema.index({ createdAt: -1 });
AlertSchema.index({ status: 1, createdAt: -1 });

// Instance method to mark as resolved
AlertSchema.methods.markResolved = function (notes, assignedTo) {
	this.status = "Resolved";
	this.resolution_notes = notes;
	this.assigned_to = assignedTo;
	this.resolved_at = new Date();
	return this.save();
};

// Static method to get active alerts by car
AlertSchema.statics.getActiveAlertsByCar = function (carId) {
	return this.find({
		car_id: carId,
		status: "Active",
	}).sort({ createdAt: -1 });
};


const Alert = mongoose.model("Alert", AlertSchema);

const AudioStreamSchema = new mongoose.Schema(
	{
		car_id: {
			type: String,
			required: true,
			index: true,
		},
		raw_audio_data: {
			type: Buffer, // For storing binary audio data
			required: false, // Optional since we might store references instead
		},
		audio_file_path: {
			type: String, // Alternative: store file path to audio files
			required: false,
		},
		audio_features: [
			{
				feature_type: String, // e.g., "mfcc", "spectral_centroid", "zero_crossing_rate"
				values: [Number], // Array of feature values
				timestamp: Date,
			},
		],
		processing_results: {
			detected_events: [String],
			confidence_scores: [Number],
			processing_time: Number,
			model_version: String,
		},
		timestamps: [
			{
				segment_start: Date,
				segment_end: Date,
				segment_duration: Number, // in seconds
			},
		],
		metadata: {
			sample_rate: Number,
			bit_depth: Number,
			channels: Number,
			duration: Number, // in seconds
			file_format: String,
			file_size: Number, // in bytes
		},
		status: {
			type: String,
			enum: ["recording", "processing", "processed", "archived", "error"],
			default: "recording",
		},
	},
	{
		timestamps: true, // Adds createdAt and updatedAt
	}
);

// Index for efficient querying by car and time
AudioStreamSchema.index({ car_id: 1, createdAt: -1 });
AudioStreamSchema.index({ "metadata.duration": 1 });

const AudioStream = mongoose.model("AudioStream", AudioStreamSchema);

const RealTimeAnalyticsSchema = new mongoose.Schema(
	{
		time_window: {
			type: String,
			required: true,
			enum: ["5min", "15min", "1hour", "6hour", "24hour"],
			index: true,
		},
		window_start: {
			type: Date,
			required: true,
			index: true,
		},
		window_end: {
			type: Date,
			required: true,
		},
		car_metrics: [
			{
				car_id: String,

				total_alerts: Number,
				alert_types: {
					collision: Number,
					horn: Number,
					siren: Number,
					glass_break: Number,
					gunshot: Number,
					scream: Number,
					other: Number,
				},
				audio_processing_volume: Number, // MB processed
				average_confidence: Number,
				uptime_percentage: Number,
			},
		],
		alert_patterns: {
			hot_spots: [
				{
					location: {
						latitude: Number,
						longitude: Number,
					},
					alert_count: Number,
					dominant_alert_type: String,
				},
			],
			temporal_patterns: {
				peak_hours: [Number], // 0-23
				weekly_trends: [Number], // 0-6 (Sunday-Saturday)
			},
			correlation_analysis: {
				weather_impact: Map, // weather condition -> alert count
				time_of_day_impact: Map, // hour -> alert count
			},
		},
		system_performance: {
			total_audio_processed: Number, // in MB
			average_processing_latency: Number, // in milliseconds
			model_accuracy: Number, // 0-1
			system_uptime: Number, // percentage
			active_cars: Number,
			storage_usage: {
				audio_data: Number, // in GB
				analytics_data: Number, // in GB
				total: Number, // in GB
			},
		},
		aggregated_data: {
			total_alerts: Number,
			alerts_by_type: Map, // alert_type -> count
			average_confidence_score: Number,
			most_common_sound: String,
			geographic_coverage: Number, // number of unique locations
			data_throughput: Number, // MB per hour
		},
	},
	{
		timestamps: true,
	}
);

// Compound index for time-based queries
RealTimeAnalyticsSchema.index({ time_window: 1, window_start: -1 });
RealTimeAnalyticsSchema.index({ window_start: 1, window_end: 1 });

// Pre-save hook to set window_end based on time_window
RealTimeAnalyticsSchema.pre("save", function (next) {
	const windowDurations = {
		"5min": 5 * 60 * 1000,
		"15min": 15 * 60 * 1000,
		"1hour": 60 * 60 * 1000,
		"6hour": 6 * 60 * 60 * 1000,
		"24hour": 24 * 60 * 60 * 1000,
	};

	this.window_end = new Date(
		this.window_start.getTime() + windowDurations[this.time_window]
	);
	next();
});

const RealTimeAnalytics = mongoose.model(
	"RealTimeAnalytics",
	RealTimeAnalyticsSchema
);


const SystemLogSchema = new mongoose.Schema(
	{
		timestamp: {
			type: Date,
			default: Date.now,
			index: true,
		},
		component: {
			type: String,
			required: true,
			enum: [
				"audio_processor",
				"ml_model",
				"database",
				"api_server",
				"websocket",
				"authentication",
				"car_agent",
				"alert_system",
				"analytics_engine",
				"file_storage",
				"notification_service",
			],
			index: true,
		},
		log_level: {
			type: String,
			required: true,
			enum: ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"],
			index: true,
		},
		message: {
			type: String,
			required: true,
		},
		context_data: {
			car_id: String,
			user_id: String,
			session_id: String,
			request_id: String,
			processing_time: Number,
			memory_usage: Number,
			cpu_usage: Number,
			additional_info: mongoose.Schema.Types.Mixed,
		},
		stack_trace: {
			type: String,
			required: function () {
				return this.log_level === "ERROR" || this.log_level === "FATAL";
			},
		},
		source: {
			file: String,
			line_number: Number,
			function: String,
		},
		environment: {
			type: String,
			enum: ["development", "staging", "production"],
			default: "development",
		},
	},
	{
		timestamps: false, // We use custom timestamp field
	}
);

// Compound indexes for efficient log querying
SystemLogSchema.index({ component: 1, timestamp: -1 });
SystemLogSchema.index({ log_level: 1, timestamp: -1 });
SystemLogSchema.index({ timestamp: -1 });
SystemLogSchema.index({ "context_data.car_id": 1, timestamp: -1 });

// Static method for common queries
SystemLogSchema.statics.findRecentErrors = function (hours = 24) {
	const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
	return this.find({
		log_level: { $in: ["ERROR", "FATAL"] },
		timestamp: { $gte: cutoff },
	}).sort({ timestamp: -1 });
};

SystemLogSchema.statics.getComponentStats = function (hours = 1) {
	const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
	return this.aggregate([
		{ $match: { timestamp: { $gte: cutoff } } },
		{
			$group: {
				_id: {
					component: "$component",
					log_level: "$log_level",
				},
				count: { $sum: 1 },
				latest: { $max: "$timestamp" },
			},
		},
		{
			$group: {
				_id: "$_id.component",
				levels: {
					$push: {
						level: "$_id.log_level",
						count: "$count",
					},
				},
				total_logs: { $sum: "$count" },
				last_activity: { $max: "$latest" },
			},
		},
	]);
};

const SystemLog = mongoose.model("SystemLog", SystemLogSchema);

module.exports = {
	Alert,AudioStream,RealTimeAnalytics, SystemLog
};
