const { describe, it } = require('node:test');
const assert = require('node:assert');
const Link = require('../models/Link');

describe('Link Expiration (expiresAt)', () => {
	describe('Link.prototype.isExpired()', () => {
		it('should return false when expiresAt is not set', () => {
			const link = new Link({
				alias: 'active-link',
				url: 'https://example.com/active',
			});
			assert.strictEqual(link.isExpired(), false);
		});

		it('should return false when expiresAt is in the future', () => {
			const futureDate = new Date(Date.now() + 100000);
			const link = new Link({
				alias: 'future-link',
				url: 'https://example.com/future',
				expiresAt: futureDate,
			});
			assert.strictEqual(link.isExpired(), false);
		});

		it('should return true when expiresAt is in the past', () => {
			const pastDate = new Date(Date.now() - 100000);
			const link = new Link({
				alias: 'expired-link',
				url: 'https://example.com/expired',
				expiresAt: pastDate,
			});
			assert.strictEqual(link.isExpired(), true);
		});

		it('should return true when expiresAt is equal to current time', () => {
			const now = new Date();
			const link = new Link({
				alias: 'exact-link',
				url: 'https://example.com/exact',
				expiresAt: now,
			});
			assert.strictEqual(link.isExpired(now), true);
		});
	});

	describe('Link Access Decision (route handling)', () => {
		it('should fall through to not-found handler when link is expired', () => {
			const pastDate = new Date(Date.now() - 1000);
			const link = new Link({
				alias: 'expired-link',
				url: 'https://example.com',
				expiresAt: pastDate,
			});

			let didRedirect = false;
			let didNext = false;
			const res = {
				redirect: () => { didRedirect = true; },
			};
			const next = () => { didNext = true; };

			if (!link || link.isExpired()) {
				next();
			} else {
				res.redirect(308, link.url);
			}

			assert.strictEqual(didNext, true, 'Expired link should call next() to serve not-found page');
			assert.strictEqual(didRedirect, false, 'Expired link must not redirect');
		});

		it('should redirect to target URL when link has not expired', () => {
			const futureDate = new Date(Date.now() + 100000);
			const link = new Link({
				alias: 'valid-link',
				url: 'https://example.com/valid',
				expiresAt: futureDate,
			});

			let redirectedUrl = null;
			let redirectedStatus = null;
			let didNext = false;
			const res = {
				redirect: (status, url) => {
					redirectedStatus = status;
					redirectedUrl = url;
				},
			};
			const next = () => { didNext = true; };

			if (!link || link.isExpired()) {
				next();
			} else {
				res.redirect(308, link.url);
			}

			assert.strictEqual(didNext, false, 'Valid link should not call next()');
			assert.strictEqual(redirectedStatus, 308);
			assert.strictEqual(redirectedUrl, 'https://example.com/valid');
		});
	});
});
