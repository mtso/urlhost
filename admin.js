const _ = require('lodash');
const express = require('express');
const request = require('superagent');
const moment = require('moment');

const User = require('./models/User');
const Link = require('./models/Link');
const Event = require('./models/Event');
const Visit = require('./models/Visit');

const PLANNING_CENTER_OAUTH_AUTHORIZE_URI = 'https://api.planningcenteronline.com/oauth/authorize';
const PLANNING_CENTER_OAUTH_TOKEN_URI = 'https://api.planningcenteronline.com/oauth/token';
const PLANNING_CENTER_API_URI = 'https://api.planningcenteronline.com';

const planningCenterClientId = process.env.PLANNING_CENTER_CLIENT_ID;
const planningCenterClientSecret = process.env.PLANNING_CENTER_CLIENT_SECRET;
const planningCenterRedirectUri = process.env.PLANNING_CENTER_REDIRECT_URI;
const planningCenterOrganizationId = process.env.PLANNING_CENTER_ORGANIZATION_ID;

const router = express.Router();

router.get('/style.css', (req, res) => {
    res.sendFile('./views/style.css', {root: __dirname});
});

router.get('/', async (req, res) => {
    let events = [];
    if (req.session.user) {
        events = await Event.find().sort({ createdAt: -1 }).limit(100);
    }

    res.render('admin_landing', {
        user: req.session.user,
        events: events,
        moment,
    });
});

router.get('/links', async (req, res) => {
    let links = [];
    if (req.session.user) {
        links = await Link.find().sort({ alias: 1 }).limit(1000);
    }

    res.render('admin_link_list', {
        user: req.session.user,
        links: links,
        moment,
    });
});

router.get('/manual', async (req, res) => {
    res.render('admin_manual', {
        user: req.session.user,
        moment,
    });
});

router.get('/links/:linkId', async (req, res) => {
    let link = null;
    try {
        link = await Link.findOne({ _id: req.params.linkId });
    } catch (err) {
        console.warn('Failed fetching link data', err);
    }

    if (link) {
        try {
            link.visits = await Visit.find({ linkId: link._id }).count();
        } catch (err) {
            console.error('Failed counting visits', err);
        }
    }

    res.render('admin_link', {
        user: req.session.user,
        link,
        moment,
    });
});

router.post('/links/:linkId/submit', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/_/links/' + req.params.linkId + '?error=User%20not%20logged-in')
    }

    const link = await Link.findOne({ _id: req.params.linkId });
    if (!link) {
        return res.status(404).json({ error: 'id_not_found' });
    }

    if (req.body.expires_at && req.body.expires_at.length > 1) {
        link.expiresAt = moment.utc(req.body.expires_at, 'YYYY-MM-DD').toDate();
    }

    if (req.body.url) {
        link.url = req.body.url;
    }

    if (req.body.alias) {
        link.alias = req.body.alias;
    }

    try {
        await link.save();
    } catch (err) {
        if (11000 === err.code) {
            return res.redirect('/_/links/' + req.params.linkId + '?error=alias%20already%20exists')
        } else {
            return res.redirect('/_/links/' + req.params.linkId + '?error=Unknown%20error,%20please%20try%20again')
        }
    }

    res.redirect('/_/links/' + req.params.linkId);

    Event.create({
        type: 'link_updated',
        userId: req.session.user._id,
        userName: req.session.user.name,
        data: {
            user: req.session.user,
            link,
        },
    }).catch((err) => {
        console.error('Failed to create event', err);
    });
});

router.post('/links/:linkId/delete', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/_/links/' + req.params.linkId + '?error=User%20not%20logged-in')
    }

    const link = await Link.findOne({ _id: req.params.linkId });
    if (!link) {
        return res.status(404).json({ error: 'id_not_found' });
    }

    const confirmationText = req.body.confirmation_text;
    if (confirmationText !== link.alias) {
        return res.redirect('/_/links/' + req.params.linkId + '?error=Delete%20error')
    }

    await link.delete();

    res.redirect('/_/links');

    Event.create({
        type: 'link_deleted',
        userId: req.session.user._id,
        userName: req.session.user.name,
        data: {
            user: req.session.user,
            link,
        },
    }).catch((err) => {
        console.error('Failed to create event', err);
    });
});

router.get('/new', async (req, res) => {
    res.render('admin_new', {
        user: req.session.user,
        moment,
    });
});

router.post('/new/submit', async (req, res) => {
    const url = req.body.url;
    const alias = req.body.alias;
    let expiresAt = null;

    if (req.body.expires_at && req.body.expires_at.length > 1) {
        expiresAt = moment.utc(req.body.expires_at, 'YYYY-MM-DD').toDate();
    }

    if (!url) {
        return res.redirect('/new?error=Missing%20URL')
    }
    if (!alias) {
        return res.redirect('/new?error=Missing%20alias')
    }
    if (!req.session.user) {
        return res.redirect('/new?error=User%20not%20logged-in')
    }

    const link = await Link.create({
        alias,
        url,
        expiresAt,
    });
    res.redirect('/_');

    Event.create({
        type: 'link_created',
        userId: req.session.user._id,
        userName: req.session.user.name,
        data: {
            user: req.session.user,
            link,
        },
    }).catch((err) => {
        console.error('Failed to create event', err);
    });
});

router.get('/auth/planningcenter', async (req, res) => {
    const params = [{
        name: 'client_id',
        value: planningCenterClientId,
    },
    {
        name: 'redirect_uri',
        value: planningCenterRedirectUri
    },
    {
        name: 'response_type',
        value: 'code',
    },
    {
        name: 'scope',
        value: 'people'
    }];
    const formatted = params.map((p) => p.name + '=' + p.value).join('&');

    res.redirect(PLANNING_CENTER_OAUTH_AUTHORIZE_URI + '?' + formatted);
});

router.get('/auth/planningcenter/callback', async (req, res, next) => {
    const code = req.query['code'];

    let token = null;

    try {
        const tokenResp = await request.post(PLANNING_CENTER_OAUTH_TOKEN_URI)
            .set('Content-Type', 'multipart/form-data')
            .field('grant_type', 'authorization_code')
            .field('code', code)
            .field('client_id', planningCenterClientId)
            .field('client_secret', planningCenterClientSecret)
            .field('redirect_uri', planningCenterRedirectUri)
            .accept('application/json');
        if (tokenResp.status !== 200) {
            console.warn('Unexpected status', tokenResp.status);
            return res.status(400).json({
                error: 'invalid_code',
            });
        }
        token = tokenResp.body;

    } catch (err) {
        if (err.message === 'Unauthorized') {
            return res.redirect('/_?state=invalid_code');
        } else {
            console.error('Unhandled token error', err);
            return res.status(500).json({
                error: 'invalid_code',
            });
        }
    }

    try {
        const accessToken = token['access_token'];

        const personResp = await request.get(PLANNING_CENTER_API_URI + '/people/v2/me')
            .set('Authorization', 'Bearer ' + accessToken);
        const person = personResp.body;
        /*
        {
            "data": {
                "type": "Person",
                "id": "...",
                "attributes": {
                    "name": "...",
                    ...
                },
                "parent": {
                    "id": "...",
                    "type": "Organization"
                }
            }
        }
        */

        const planningCenterUserId = _.get(person, 'data.id');
        const personData = {
            name: _.get(person, 'data.attributes.name'),
            id: _.get(person, 'data.id'),
            organizationId: _.get(person, 'meta.parent.id'),
        };
        const tokenCreatedAt = _.get(token, 'created_at');
        const tokenData = {
            accessToken: _.get(token, 'access_token'),
            refreshToken: _.get(token, 'refresh_token'),
            tokenType: _.get(token, 'token_type'),
            expresIn: _.get(token, 'expires_in'),
            scope: _.get(token, 'scope'),
            createdAt: !!tokenCreatedAt ? new Date(tokenCreatedAt * 1000) : null,
        };

        const user = await User.createOrUpdateByPlanningCenterId(
            planningCenterUserId,
            personData,
            tokenData
        );

        if (personData.organizationId !== planningCenterOrganizationId) {
            return res.redirect('/login_failed');
        }

        await new Promise((resolve, reject) => {
            req.session.regenerate(function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        req.session.user = user;
        req.session.userId  = user._id;

        await new Promise((resolve, reject) => {
            req.session.save(function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        res.redirect('/_');

    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.get('/logout', async (req, res) => {
    if (req.session.user) {
        req.session.user = null;
        req.session.userId = null;
        await new Promise((resolve, reject) => {
            req.session.save(function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(err);
                }
            });
        });
        await new Promise((resolve, reject) => {
            req.session.regenerate(function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(err);
                }
            })
        });
    }
    res.redirect('/_');
});

router.get('/login_failed', async (req, res) => {
    res.render('admin_login_failed', {
        user: req.session.user,
    });
});

router.get('/*', (req, res) => {
    res.render('admin_not_found', {
        user: req.session.user,
    });
});

module.exports = router;
