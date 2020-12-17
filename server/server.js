import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';

// date validation function
function isValidDate(d) {
	return d instanceof Date && !isNaN(d);
}
// function for filtering array unique values
function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}
Meteor.startup(() => {
	// code to run on server at startup
});

// publish lists
Meteor.publish("planes", function () {
	if (!this.userId) {
		return this.ready();
	}
	var user = Meteor.user();
	var org = user.profile.organization;
	return Planes.find({
		organization: org
	});
});
Meteor.publish("tasks", function () {
	if (!this.userId) {
		return this.ready();
	}
	var user = Meteor.user();
	var org = user.profile.organization;
	var filters = {
		organization: org
	};
	if (!user.profile.isManager) filters.assignees = { $elemMatch: { $eq: user._id } };
	return Tasks.find(filters);
});
Meteor.publish("employees", function () {
	if (!this.userId) {
		return this.ready();
	}
	var user = Meteor.user();
	var org = user.profile.organization;
	return Meteor.users.find({ 'profile.organization': org }, { profile: 1 });
});

Meteor.methods({
	// add/update task
	updateTask: function (name, description, wc, plane, deadline, assignees, status, remarks, taskId) {
		var user = Meteor.user();
		if (!user || !user.profile) return;
		check(name, String);
		check(description, String);
		check(wc, String);
		check(plane, String);
		check(deadline, String);
		check(assignees, Array);
		check(status, String);
		check(remarks, String);
		check(taskId, String);
		// find task
		var task;
		if (taskId) {
			task = Tasks.findOne(taskId);
			if (!task) {
				throw new Meteor.Error('error',
					"Task not found in database.");
			}
			if (task.organization !== user.profile.organization) {
				throw new Meteor.Error('error',
					"You are not allowed to edit this task.");
			}
		}
		// check data
		name = (name || '').trim();
		description = (description || '').trim();
		wc = (wc || '').trim();
		if (!name) {
			throw new Meteor.Error('error',
				"Task name required.");
		}
		if (name.length > 50) {
			throw new Meteor.Error('error',
				"Task name must be less than 50 characters.");
		}
		if (description.length > 1000) {
			throw new Meteor.Error('error',
				"Description must be less than 1000 characters.");
		}
		if (wc.length > 50) {
			throw new Meteor.Error('error',
				"Work Card/Technical Manual must be less than 50 characters.");
		}
		status = +(status) || 0;
		status = Math.round(status);
		if (status < 0 || status > statusLabels.length) {
			throw new Meteor.Error('error',
				"Please select a valid status.");
		}
		if (remarks.length > 100) {
			throw new Meteor.Error('error',
				"Status remarks must be less than 100 characters.");
		}
		plane = Planes.findOne(plane);
		if (!plane || plane.releasedOn) plane = null;
		else plane = plane._id;
		deadline = new Date(deadline);
		if (!isValidDate(deadline)) deadline = null;
		var assigneesVerified = [];
		if (assignees) {
			assignees = assignees.filter(onlyUnique);
			assignees.forEach(function (val) {
				check(val, String);
				var a = Meteor.users.findOne(val);
				if (a && a.profile.organization === user.profile.organization) {
					assigneesVerified.push(a._id);
				}
			});
		}
		var data = {
			status: status,
			remarks: remarks,
			closedOn: status === 1 ? new Date() : null,
		};
		if (user.profile.isManager) {
			data.name = name;
			data.description = description;
			data.wc = wc;
			data.plane = plane;
			data.deadline = deadline;
			data.assignees = assigneesVerified;
		}
		else if (status != 1 && task && task.closedOn) {
			throw new Meteor.Error('error',
				"Only the manager can re-open closed tasks.");
		}
		if (task) {
			// update
			data.lastEdited = new Date();
			Tasks.update(task._id, {
				$set: data
			});
		}
		else {
			// add
			data.createdOn = new Date();
			data.organization = user.profile.organization;
			task = Tasks.insert(data);
		}
		return task;
	},
	// add/update plane
	updatePlane: function (name, model, reason, id) {
		var user = Meteor.user();
		if (!user || !user.profile || !user.profile.isManager) return;
		// find plane
		var plane;
		if (id) {
			plane = Planes.findOne(id);
			if (!plane) {
				throw new Meteor.Error('error',
					"Plane not found in database.");
			}
			if (plane.organization !== user.profile.organization) {
				throw new Meteor.Error('error',
					"You are not allowed to edit this plane.");
			}
			if (plane.releasedOn) {
				throw new Meteor.Error('error',
					"You cannot edit a released plane.");
			}
		}
		// check data
		check(name, String);
		check(model, String);
		check(reason, String);
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
		if (plane) {
			// update
			Planes.update(plane._id, {
				$set: {
					name: name,
					model: model,
					reason: reason,
					lastEdited: new Date()
				}
			});
		}
		else {
			// add
			plane = Planes.insert({
				name: name,
				model: model,
				reason: reason,
				organization: user.profile.organization,
				createdOn: new Date(),
				enteredOn: new Date(),
			});
		}
		return plane;
	},
	// plane release/take in
	releasePlane: function (id, release) {
		check(id, String);
		check(release, Boolean);
		var user = Meteor.user();
		if (!user || !user.profile || !user.profile.isManager) return;
		// find plane
		var plane = Planes.findOne(id);
		if (!plane || plane.organization !== user.profile.organization) return;
		// if releasing, ensure there are no open tasks
		if (release) {
			var openTask = Tasks.findOne({ plane: id, closedOn: null });
			if (openTask) {
				throw new Meteor.Error('error',
					"There are open tasks for this plane. Close the tasks before releasing the plane.");
			}
		}
		// mark as released
		var updates = {
			releasedOn: release ? new Date() : null
		};
		if (!release) updates.enteredOn = new Date();
		Planes.update(plane._id, {
			$set: updates
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
		check(name, String);
		check(email, String);
		check(pass, String);
		check(role, String);
		check(orgName, String);
		check(managerEmail, String);
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