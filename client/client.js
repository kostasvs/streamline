import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import 'bootstrap/dist/js/bootstrap.bundle';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';

//import '../imports/planesList.html';
//import '../imports/register.html';

Meteor.subscribe('planes');

Template.planesList.helpers({
	// list
	getList() {
		return Planes.find({});
	},
});

Template.planesList.events({
	// add plane
	'click #addPlane'(e) {
		e.preventDefault();
		var planeModal = $('#planeModal');
		$('.planeFeedback', planeModal).hide();
		$('input', planeModal).val('');
		planeModal.modal('show');
	},
	// plane info
	'click .plane-item'(e) {
		var item = $(e.target);
		var planeModal = $('#planeModal');
		$('.planeFeedback', planeModal).hide();
		$('#planeName', planeModal).val(item.data('name'));
		$('#planeModel', planeModal).val(item.data('model'));
		$('#planeReason', planeModal).val(item.data('reason'));
		$('#planeId', planeModal).val(item.data('id'));
		planeModal.modal('show');
	},
});

Template.planeModal.events({
	// save plane
	'submit #planeForm'(e) {
		var form = $(e.target);
		var name = $('#planeName', form).val();
		var model = $('#planeModel', form).val();
		var reason = $('#planeReason', form).val();
		var planeId = $('#planeId', form).val();
		Meteor.call(planeId ? 'updatePlane' : 'addPlane',
			name, model, reason, planeId, function (error, result) {

				var errText = null;
				if (error && error.reason) errText = error.reason;
				else if (!result) errText = "Saving changes failed!";
				if (errText) {
					// failed
					$('.planeFeedback').removeClass('text-success').addClass('text-danger')
						.text(errText).show();
				}
				else {
					// ok
					$('.planeFeedback').hide();
					var planeModal = $('#planeModal');
					planeModal.modal('hide');
					// update item if exists
					var item = $('#plane-item-' + planeId);
					item.data('name', name);
					item.data('model', model);
					item.data('reason', reason);
				}
			});
		return false;
	},
});

Template.personalCard.helpers({
	// subtext
	subtext() {
		Meteor.call('getUserPosition', function (error, result) {
			if (result) $('.personalCardSubText').text(result).slideDown('fast');
		});
		return "";
	},
});

Template.register.events({
	// registration form
	'submit #registerForm'(e) {
		var form = $(e.target);
		var name = $('#inputName', form).val();
		var email = $('#inputEmail1', form).val();
		var pass = $('#inputPassword1', form).val();
		var role = $('#roleInput', form).val();
		var orgName = $('#inputOrg1', form).val();
		var email2 = $('#inputEmail2', form).val();
		Meteor.call('registerUser', name, email, pass, role, orgName, email2, function (error, result) {
			var errText = null;
			if (error && error.reason) errText = error.reason;
			else if (!result) errText = "Registration failed!";
			if (errText) {
				// failed
				$('.registerFeedback').removeClass('text-success').addClass('text-danger')
					.text(errText).show();
			}
			else {
				// ok, log in
				$('.registerFeedback').addClass('text-success').removeClass('text-danger')
					.text("Registration success").show();
				var loginForm = $('#loginForm');
				$('#loginName', loginForm).val(email);
				$('#loginPass', loginForm).val(pass);
				loginForm.submit();
			}
		});
		return false;
	},
});

Template.navbar.events({
	// login form
	'submit #loginForm'(e) {
		var form = $(e.target);
		var email = $('#loginName', form).val();
		var pass = $('#loginPass', form).val();
		Meteor.loginWithPassword(email, pass, function (error) {
			if (error) {
				// failed
				var errText = error.reason || "Login failed (unknown reason)";
				$('.loginFeedback').removeClass('text-success').addClass('text-danger')
					.text(errText).show();
			}
			else {
				$('.loginFeedback').hide();
				form.closest('.modal').modal('hide');
			}
		});
		return false;
	},
	// logout
	'click .btnLogout'(e) {
		e.preventDefault();
		Meteor.logout();
	},
});

$(function () {
	// preloader
	var isLoading = true;
	function checkLogged() {
		if (Meteor.loggingIn()) {
			if (!isLoading) {
				$('.preloader').show();
				isLoading = true;
			}
			setTimeout(checkLogged, 100);
		}
		else {
			$('.preloader').fadeOut();
			isLoading = false;
		}
	};
	checkLogged();

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