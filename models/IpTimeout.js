const mongoose = require('mongoose');

const TIMEOUT_DURATION_SECONDS = 60;

const IpTimeoutSchema = new mongoose.Schema({
	ip: {
		type: mongoose.Schema.Types.String,
		indexed: true,
	},
	createdAt: {
		type: mongoose.Schema.Types.Date,
		expires: TIMEOUT_DURATION_SECONDS, // time out for a minute.
		default: () => new Date(),
	},
});

module.exports = mongoose.model('ip_timeout', IpTimeoutSchema);
module.exports.TIMEOUT_DURATION_SECONDS = TIMEOUT_DURATION_SECONDS;
