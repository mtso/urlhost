const express = require('express');
const mongoose = require('mongoose');

const Link = require('./models/Link');
const Visit = require('./models/Visit');
const IpTimeout = require('./models/IpTimeout');

mongoose.connect(process.env.MONGODB_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
})
// 	.then(async () => {
// 	if (true) return;
// 	const link = await Link.create({ url: "https://www.redeemermv.org/", alias: "home" });
// 	console.log("created link " + link._id);
// });

const app = express();

// app.get("/headers", (req, res) => {
// 	res.json(req.headers);
// });

function parseIps(headerString) {
	headerString = headerString || ''
	if (headerString.length < 1) {
		return [];
	}
	const ips = headerString.split(/,\s?/);
	return ips;
}

async function checkTimeout(req, res, next) {
	const ips = parseIps(req.headers['x-forwarded-for']);
	const mainIp = ips[0] || null;
	if (mainIp) {
		const ipTimeout = await IpTimeout.findOne({ ip: mainIp });
		if (!!ipTimeout) {
			// const millisecondsLeft = (ipTimeout.createdAt.getTime() + IpTimeout.TIMEOUT_DURATION_SECONDS*1000) - new Date().getTime();
			return res.json({
				error: "rate_limited",
				message: "Please try again later.",
				// message: "Please try again after " + millisecondsLeft / 1000,
				// milliseconds_left: millisecondsLeft,
			});
		}
	}
	next();
}

app.get('/:alias', checkTimeout, async (req, res, next) => {
	const alias = req.params.alias;
	const link = await Link.findOne({ alias });
	const ips = parseIps(req.headers['x-forwarded-for']);
	const mainIp = ips[0] || null;

	if (!link) {
		next();
		Visit.create({
			ips: ips,
			timestamp: new Date(),
			alias: alias,
		});
	} else {
		res.redirect(308, link.url);

		const visit = await Visit.create({
			linkId: link._id,
			ips: ips,
			timestamp: new Date(),
			alias: alias,
		});

		// Allow at most 10 visits within a 10 second window.
		const MAX_WINDOW = 10*1000;
		const MAX_VISITS_THRESHOLD = 10;
	
		const visits = await Visit.find({
			ips: {
				"$in": [mainIp]
			},
			timestamp: {
				"$gte": new Date((new Date()).getTime() - MAX_WINDOW)
			},
		}).limit(MAX_VISITS_THRESHOLD + 5);
		
		if (visits.length > MAX_VISITS_THRESHOLD) {
			const ipTimeout = await IpTimeout.create({ ip: mainIp });
			// "hit blacklist"
			// console.log("hit blacklist", mainIp, new Date());
			// console.log(visits.map((v) => ({ timestamp: v.timestamp, id: v._id })))
			// console.log(visits.map((v) => ({ timestamp: v.timestamp, ips: v.ips })))
		}
	}
});

app.get("/", (req, res) => {
	res.sendFile("./views/index.html", {root: __dirname});
});

app.get("/*", (req, res) => {
	res.sendFile("./views/not_found.html", {root: __dirname});
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log(`Listening on ${listener.address().port}`);
});
