const mongoose = require('mongoose');
const _ = require('lodash');

const OauthTokenSchema = new mongoose.Schema({
	accessToken: {
        type: mongoose.Schema.Types.String,
    },
	refreshToken: {
        type: mongoose.Schema.Types.String,
    },
	tokenType: {
        type: mongoose.Schema.Types.String,
    },
	expiresIn: {
        type: mongoose.Schema.Types.Number,
    },
	scope: {
        type: mongoose.Schema.Types.String,
    },
	createdAt: {
        type: mongoose.Schema.Types.Date,
    },
});

const UserSchema = new mongoose.Schema({
    planningCenterId: {
        type: mongoose.Schema.Types.String,
        index: true,
    },
	planningCenterToken: {
		type: OauthTokenSchema,
	},
	name: {
        type: mongoose.Schema.Types.String,
    },
	planningCenterData: {
		type: mongoose.Schema.Types.Object,
	},
}, {
	timestamps: true,
});

/**
 * @param {string} planningCenterId 
 * @param {object} person { name, id, organizationId }
 * @param {object} token { accessToken, refreshToken, tokenType, expresIn, scope, createdAt }
 * @returns 
 */
UserSchema.statics.createOrUpdateByPlanningCenterId = async function(planningCenterId, person, token) {
	person = _.pick(person, ['name', 'id', 'organizationId']);
	token = _.pick(token, ['accessToken', 'refreshToken', 'tokenType', 'expresIn', 'scope', 'createdAt']);

	let user = await this.findOne({ planningCenterId });
	if (user) {
		user.planningCenterToken = token;
		user.planningCenterData = person;
		if (user.name !== person.name) {
			user.name = person.name;
		}
		await user.save();
	} else {
		user = await this.create({
			planningCenterId,
			name: person.name,
			planningCenterToken: token,
			planningCenterData: person,
		});
	}
	return user;
};

module.exports = mongoose.model('user', UserSchema);
