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

	// modal button
	$('.btnSubmit').click(function () {
		$(this).closest('.modal').find('form').submit();
	});

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