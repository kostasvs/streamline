import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import 'bootstrap/dist/js/bootstrap.bundle';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';

//import '../imports/planesList.html';
//import '../imports/register.html';

Template.planesList.helpers({
	// list
	planesList() {
		return Planes.find({});
	},
});

Template.planesList.events({
	// add plane
	'click #addPlane'(e) {
		e.preventDefault();
		//if (!this.userId) return;
		var plane = {
			name: 'Plane',
			owner: null,
			createdOn: new Date(),
		};
		var id = Planes.insert(plane);
		console.log("addPlane=" + id);
	},
});

Template.register.events({
	// registration form
	'submit #registerForm'(e) {
		var form = $(e.target);
		var email = $('#inputEmail1', form).val();
		var pass = $('#inputPassword1', form).val();
		var role = $('#roleInput', form).val();
		var orgName = $('#inputOrg1', form).val();
		var email2 = $('#inputEmail2', form).val();
		Meteor.call('registerUser', email, pass, role, orgName, email2, function (error, result) {
			var errText = null;
			if (error && error.reason) errText = error.reason;
			else if (!result) errText = "Registration failed!";
			if (errText) {
				$('.registerFeedback').removeClass('text-success').addClass('text-danger')
					.text(errText).show();
			}
			else {
				$('.registerFeedback').addClass('text-success').removeClass('text-danger')
					.text("Registration success").show();
			}
		});
		return false;
	},
});

$(function () {
	// registration page
	var registerCard = $('.registerCard');
	if (registerCard.length) {
		$('#manager-tab', registerCard).click(function () {
			$('#roleInput', registerCard).val('manager');
		});
		$('#employee-tab', registerCard).click(function () {
			$('#roleInput', registerCard).val('employee');
		});
	}
});