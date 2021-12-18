const mongoose = require('mongoose');
const crypto = require('crypto');

const Token = require('../models/Token');

mongoose.connect(process.env.MONGODB_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
}).then(async () => {
	crypto.randomBytes(32, async (err, buf) => {
		if (err) {
			console.error('Failed to generate token', err);
			process.exit(1);
		}
		const key = buf.toString('base64').replace(/[/+=]/g, '');
		const keyHash = crypto.createHash('sha512').update(key).digest('hex');
		// console.log(key);
		// console.log(keyHash);
		
		const token = await Token.create({
			name: 'Zapier API Key ' + (new Date().toLocaleString()),
			expiresAt: null,
			keyHash: keyHash,
		});

		const isValid = await Token.checkIsValid(key);
		console.log("New token: " + key);
		console.log("is valid", isValid);

		process.exit(0);
	})
});