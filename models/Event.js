const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
	type: {
		type: mongoose.Schema.Types.String,
	},
		userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'user',
	},
		userName: {
		type: mongoose.Schema.Types.String,
	},
		data: {
		type: mongoose.Schema.Types.Object,
	},
	message: {
		type: mongoose.Schema.Types.String,
	},
}, {
	timestamps: true,
});

EventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('event', EventSchema);
