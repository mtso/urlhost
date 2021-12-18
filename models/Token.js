const mongoose = require('mongoose');
const crypto = require('crypto');

const TokenSchema = new mongoose.Schema({
	name: {
		type: mongoose.Schema.Types.String,
	},
	keyHash: {
		type: mongoose.Schema.Types.String,
		unique: true,
	},
	expiresAt: {
		type: mongoose.Schema.Types.Date,
	},
}, {
	timestamps: true,
});

TokenSchema.methods.isExpired = function(now) {
	if (!this.expiresAt) {
		return false;
	}
	now = now || new Date();
	return now >= this.expiresAt;
};

TokenSchema.statics.getKeyHash = function(key) {
	return crypto.createHash('sha512').update(key).digest('hex');
};

TokenSchema.statics.findByKey = async function(key) {
	const keyHash = crypto.createHash('sha512').update(key).digest('hex');
	return await this.findOne({ keyHash });
};

TokenSchema.statics.checkIsValid = async function(key, now) {
	now = now || new Date();
	const keyHash = this.getKeyHash(key);
	const token = await this.findOne({ keyHash });
	return !!token && !token.isExpired(now);
};

module.exports = mongoose.model('token', TokenSchema);
