const mongoose = require('mongoose');

const LinkSchema = new mongoose.Schema({
	url: {
		type: mongoose.Schema.Types.String,
	},
	alias: {
		type: mongoose.Schema.Types.String,
		unique: true,
	},
	expiresAt: {
		type: mongoose.Schema.Types.Date,
	},
}, {
	timestamps: true,
});

LinkSchema.methods.isExpired = function(now) {
	if (!this.expiresAt) {
		return false;
	}
	now = now || new Date();
	return now >= this.expiresAt;
};

module.exports = mongoose.model('link', LinkSchema);
