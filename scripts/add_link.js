const mongoose = require('mongoose');

const Link = require('../models/Link');

mongoose.connect(process.env.MONGODB_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
}).then(async () => {
	const link = await Link.create({
		url: "https://www.redeemermv.org/",
		alias: "home",
	});
	console.log("created link " + link._id, {
		url: link.url,
		alias: link.alias,
		createdAt: link.createdAt,
	});
	process.exit(0);
});