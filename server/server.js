import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

Meteor.startup(() => {
	// code to run on server at startup
});

// publish list of planes
//Meteor.publish("planes", function () {
//    return Planes.find();
//});

Meteor.methods({
	// register user
	registerUser: function (email, pass, role, orgName, managerEmail) {
		var isManager = role === 'manager';
		var myOrg;
		// check password
		if (pass.length < 5) {
			throw new Meteor.Error('error',
				"Password must be at least 5 characters.");
		}
		if (isManager) {
			// check name
			orgName = (orgName || '').trim();
			if (!orgName) {
				throw new Meteor.Error('error',
					"Organization name required.");
			}
			if (orgName.length > 50) {
				throw new Meteor.Error('error',
					"Organization name must be less than 50 characters.");
			}
			// ensure organization doesn't exist
			var org = Organizations.findOne({
				"name": {
					$regex: new RegExp(orgName, "i")
				}
			});
			if (org) {
				throw new Meteor.Error('error',
					"An organization with this name already exists.");
			}
			// create it
			myOrg = Organizations.insert({
				name: orgName,
				createdOn: new Date(),
			});
		}
		else {
			// find manager and organization
			var myManager = Accounts.findUserByEmail(managerEmail);
			if (!myManager || !myManager.profile || !myManager.profile.isManager) {
				throw new Meteor.Error('error',
					"Could not find an organization manager with this email.");
			}
			myOrg = myManager.profile.organization;
		}
		// create user
		var uid = Accounts.createUser({
			email: email,
			password: pass,
			profile: {
				isManager: isManager,
				organization: myOrg,
			},
			createdOn: new Date(),
		});
		if (!uid) {
			throw new Meteor.Error('error',
				"User creation failed. Check that the information you entered is valid.");
		}
		if (isManager) {
			// update or remove new organization
			if (uid) Organizations.update(myOrg, {
				$set: { owner: uid }
			});
			else Organizations.remove(myOrg);
		}
		return uid;
	},
});