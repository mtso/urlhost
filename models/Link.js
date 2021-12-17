const mongoose = require('mongoose');

const LinkSchema = new mongoose.Schema({
	url: {
		type: mongoose.Schema.Types.String,
	},
	alias: {
		type: mongoose.Schema.Types.String,
		unique: true,
	},
}, {
	timestamps: true,
});

module.exports = mongoose.model('link', LinkSchema);
