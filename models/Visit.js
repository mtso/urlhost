const mongoose = require('mongoose');

const VisitSchema = new mongoose.Schema({
	linkId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'link',
	},
	alias: {
		type: mongoose.Schema.Types.String,
	},
	ips: {
		type: [mongoose.Schema.Types.String],
		indexed: true,
	},
	timestamp: {
		type: mongoose.Schema.Types.Date,
		indexed: true,
	},
}, {
	timestamps: false,
});

VisitSchema.index({ timestamp: -1 })
VisitSchema.index({ ips: 1 })

module.exports = mongoose.model('visit', VisitSchema);
