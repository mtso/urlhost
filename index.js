const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');

const Link = require('./models/Link');
const Visit = require('./models/Visit');
const IpTimeout = require('./models/IpTimeout');
const Token = require('./models/Token');

mongoose.connect(process.env.MONGODB_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

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
	const ips = parseIps(req.get('x-forwarded-for'));
	const mainIp = ips[0] || null;
	if (mainIp) {
		const ipTimeout = await IpTimeout.findOne({ ip: mainIp });
		if (!!ipTimeout) {
			return res.status(429).json({
				error: "rate_limited",
				message: "Please try again later.",
			});
		}
	}
	next();
}

async function captureVisit(visitData, mainIp) {
	const visit = await Visit.create(visitData);

	// Allow at most 10 404-alias-not-found visits within a 10 second window.
	const MAX_WINDOW = 10*1000;
	const MAX_VISITS_THRESHOLD = 10;

	const visits = await Visit.find({
		ips: {
			"$in": [mainIp]
		},
		timestamp: {
			"$gte": new Date((new Date()).getTime() - MAX_WINDOW)
		},
		linkId: null,
	}).limit(MAX_VISITS_THRESHOLD + 5);

	if (visits.length > MAX_VISITS_THRESHOLD) {
		const ipTimeout = await IpTimeout.create({ ip: mainIp });
	}
}

async function validateApiKey(req, res, next) {
	const tokenHeader = req.get('authorization');
	if (!tokenHeader || tokenHeader === '' || !(/^bearer/i).test(tokenHeader)) {
		return res.status(403).json({
			error: 'unauthorized',
			message: 'Please specify an active API key including "Bearer" prefix in Authorization header.',
		});
	}
	const key = (tokenHeader || '').replace(/bearer\s+/i, '');
	const isValid = await Token.checkIsValid(key);
	if (!isValid) {
		return res.status(403).json({
			error: 'unauthorized',
			message: 'Please specify an active API key including "Bearer" prefix in Authorization header.',
		});
	}
	next();
}

const app = express();

app.use(function(req, res, next) {
    if(req.get("X-Forwarded-Proto") == "http") {
		// request was via http, so redirect to https
		res.redirect('https://' + req.headers.host + req.url);
    } else {
        next();
    }
});

app.use(bodyParser.json());

app.get("/", (req, res) => {
	res.sendFile("./views/index.html", {root: __dirname});
});

app.get("/favicon.ico", (req, res) => {
	res.status(404).json({error: "not_found"});
});

app.post("/webhooks/links", validateApiKey, async (req, res) => {
	if (req.body.sheet_name !== "live") {
		console.log('Make sure to edit the "live" sheet!', req.body);
		return res.json({
			status: 'skipped',
		});
	}

	if (!req.body.alias) {
		console.log('Missing alias', req.body);
		return res.json({
			status: 'skipped'
		})
	}
	
	if (req.body.modified_column === 'alias' && !!req.body.old_value) {
		const link = await Link.findOneAndUpdate({
			alias: req.body.old_value,
		}, {
			alias: req.body.alias,
			url: req.body.url,
			expiresAt: req.body.expires_at,
		}, {
			upsert: true,
			new: true,
		});
		console.log('linkUpdate', new Date(), JSON.stringify(req.body, null, 2), link.toObject());
		return res.json({
			status: 'updated',
		});
	}

	const link = await Link.findOneAndUpdate({
		alias: req.body.alias,
	}, {
		alias: req.body.alias,
		url: req.body.url,
		expiresAt: req.body.expires_at,
	}, {
		upsert: true,
		new: true,
	});
	console.log('linkCreate', new Date(), JSON.stringify(req.body, null, 2), link.toObject());
	res.json({
		status: 'updated',
	});
});

app.get('/:alias', checkTimeout, async (req, res, next) => {
	const alias = req.params.alias;
	const link = await Link.findOne({ alias });
	const ips = parseIps(req.get('x-forwarded-for'));
	const mainIp = ips[0] || null;

	if (!link) {
		next();
	} else {
		res.redirect(308, link.url);
	}

	captureVisit({
		linkId: !link ? null : link._id,
		ips: ips,
		timestamp: new Date(),
		alias: alias,
	}, mainIp);
});

app.get("/*", (req, res) => {
	res.status(404).sendFile("./views/not_found.html", {root: __dirname});
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log(`Listening on ${listener.address().port}`);
});
