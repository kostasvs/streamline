import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

Meteor.startup(() => {
	// code to run on server at startup
});

// publish list of planes
Meteor.publish("planes", function () {
	var user = Meteor.user();
	if (!user || !user.profile) return;
	var org = user.profile.organization;
	return Planes.find({
		organization: org
	});
});

Meteor.methods({
	// add plane
	addPlane: function (name, model, reason) {
		var user = Meteor.user();
		if (!user || !user.profile || !user.profile.isManager) return;
		// check data
		name = (name || '').trim();
		model = (model || '').trim();
		reason = (reason || '').trim();
		[name, model].forEach(function (value, index) {
			var field = index == 0 ? "Name or S/N" : "Type or Model";
			if (!value) {
				throw new Meteor.Error('error',
					field + " required.");
			}
			if (index.length > 50) {
				throw new Meteor.Error('error',
					field + " must be less than 50 characters.");
			}
		});
		if (reason.length > 200) {
			throw new Meteor.Error('error',
				"Reason must be less than 200 characters.");
		}
		// add
		var plane = Planes.insert({
			name: name,
			model: model,
			reason: reason,
			organization: user.profile.organization,
			createdOn: new Date(),
		});
		return plane;
	},
	// update plane
	updatePlane: function (name, model, reason, id) {
		var user = Meteor.user();
		if (!user || !user.profile || !user.profile.isManager) return;
		// find plane
		var plane = Planes.findOne(id);
		if (!plane || plane.organization != user.profile.organization || plane.releasedOn) {
			throw new Meteor.Error('error',
				"You are not allowed to edit this plane.");
		}
		// check data
		name = (name || '').trim();
		model = (model || '').trim();
		reason = (reason || '').trim();
		[name, model].forEach(function (value, index) {
			var field = index == 0 ? "Name or S/N" : "Type or Model";
			if (!value) {
				throw new Meteor.Error('error',
					field + " required.");
			}
			if (index.length > 50) {
				throw new Meteor.Error('error',
					field + " must be less than 50 characters.");
			}
		});
		if (reason.length > 200) {
			throw new Meteor.Error('error',
				"Reason must be less than 200 characters.");
		}
		// mark as released
		Planes.update(plane._id, {
			$set: {
				name: name,
				model: model,
				reason: reason,
				lastEdited: new Date()
			}
		});
		return true;
	},
	// release plane
	releasePlane: function (id) {
		var user = Meteor.user();
		if (!user || !user.profile || !user.profile.isManager) return;
		// find plane
		var plane = Planes.findOne(id);
		if (!plane || plane.organization != user.profile.organization || plane.releasedOn) return;
		// mark as released
		Planes.update(plane._id, {
			$set: { releasedOn: new Date() }
		});
		return true;
	},
	// user position text
	getUserPosition: function () {
		var user = Meteor.user();
		if (!user || !user.profile) return "";
		var org = Organizations.findOne(user.profile.organization) || "(unknown)";
		return (user.profile.isManager ? "Manager of " : "Member of ") + org.name;
	},
	// register user
	registerUser: function (name, email, pass, role, orgName, managerEmail) {
		var isManager = role === 'manager';
		var myOrg;
		// check name
		name = (name || '').trim();
		if (!name) {
			throw new Meteor.Error('error',
				"Your name is required.");
		}
		if (name.length > 50) {
			throw new Meteor.Error('error',
				"Your name must be less than 50 characters.");
		}
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
				name: name,
				isManager: isManager,
				organization: myOrg,
			}
		});
		if (!uid) {
			throw new Meteor.Error('error',
				"User creation failed. Check that the information you entered is valid.");
		}
		if (isManager) {
			// update or remove new organization
			if (uid) Organizations.update(myOrg._id, {
				$set: { owner: uid }
			});
			else Organizations.remove(myOrg);
		}
		return uid;
	},
});