import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import 'bootstrap/dist/js/bootstrap.bundle';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-select/dist/css/bootstrap-select.min.css';
import 'bootstrap-select/dist/js/bootstrap-select';

// date validation function
function isValidDate(d) {
	return d instanceof Date && !isNaN(d);
}

// date difference in days
// a and b are javascript Date objects
const _MS_PER_DAY = 1000 * 60 * 60 * 24;
function dateDiffInDays(a, b) {
	// Discard the time and time-zone information.
	const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
	const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

	return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

Meteor.subscribe('planes');
Meteor.subscribe('tasks');
Meteor.subscribe('employees');

Template.tasksTable.helpers({
	// list
	getList() {
		var filters = {}, setFilter = Session.get('tasksTableFilter');
		return Tasks.find(filters);
	},
	// task helpers
	getTaskPlane(task) {
		var planeId = task.plane;
		if (!planeId) return '-';
		var plane = Planes.findOne(planeId);
		if (!plane) return '-';
		return plane.name;
	},
	getTaskDeadline(task) {
		var deadline = task.deadline;
		if (!deadline) return '';
		return deadline.toLocaleDateString();
	},
	getTaskStatus(task) {
		var status = +(task.status) || 0;
		if (status < 0 || status >= statusLabels.length) return 'Uknown status';
		return statusLabels[status];
	},
	getTaskStatusIcon(task) {
		var status = +(task.status) || 0;
		if (status < 0 || status >= statusLabels.length) return 'question';
		return statusLabelIcons[status];
	},
	getTaskColor(task, defClass) {
		var deadline = task.deadline;
		if (deadline) deadline = new Date(deadline);
		if (!deadline || !isValidDate(deadline)) return defClass;
		var diff = dateDiffInDays(new Date(), deadline);
		//if (diff > 3) return defClass;
		//if (diff > 0) return 'text-warning';
		if (diff > 0) return defClass;
		return 'text-danger';
	},
	// get list of task assignees
	getTaskAssigned: function (taskId) {
		if (!taskId) return;
		var user = Meteor.user();
		if (!user || !user.profile) return;
		var assigned = [];
		var task = Tasks.findOne(taskId);
		if (!task || !task.assignees || task.organization !== user.profile.organization) return assigned;
		for (var a of task.assignees) {
			var u = Employees.findOne(a);
			if (u) assigned.push({
				name: u.profile.name,
				id: u._id,
			});
		}
		return assigned;
	},
	// planes
	availablePlanes() {
		return Planes.find({ releasedOn: null });
	},
	// employees
	availableEmployees() {
		return Employees.find({});
	},
});

Template.planesSelect.helpers({
	// planes
	availablePlanes() {
		return Planes.find({ releasedOn: null });
	},
});

// reactive planesSelect
Template.planesSelect.onRendered(function () {
	$('select#taskPlane').selectpicker();
});
var planesSelectTimer = false;
Template.planesOption.onRendered(function () {
	if (planesSelectTimer !== false) {
		Meteor.clearTimeout(planesSelectTimer);
	}
	planesSelectTimer = Meteor.setTimeout(function () {
		$('select#taskPlane').selectpicker("refresh");
		planesSelectTimer = false;
	}, 10);
});

Template.employeesSelect.helpers({
	// employees
	availableEmployees() {
		return Employees.find({});
	},
});

// reactive employeesSelect
Template.employeesSelect.onRendered(function () {
	$('select.taskEmployee:not(.template)').each(function () {
		$(this).selectpicker();
	});
});
var employeesSelectTimer = false;
Template.employeesOption.onRendered(function () {
	if (employeesSelectTimer !== false) {
		Meteor.clearTimeout(employeesSelectTimer);
	}
	employeesSelectTimer = Meteor.setTimeout(function () {
		$('select.taskEmployee:not(.template)').each(function () {
			$(this).selectpicker("refresh");
		});
		employeesSelectTimer = false;
	}, 10);
});

Template.tasksTable.events({
	// add task
	'click #addTask'(e) {
		e.preventDefault();
		var taskModal = $('#taskModal');
		$('.taskFeedback, .taskCreated', taskModal).hide();
		$('input, textarea, select', taskModal).val('').change();
		$('#taskStatus', taskModal).val(0).change();
		$('.select-assigned', taskModal).remove();
		taskModal.modal('show');
	},
	// task info
	'click .task-link'(e) {
		e.preventDefault();
		var item = $(e.currentTarget).closest('.task-item');
		var taskModal = $('#taskModal');
		$('.taskFeedback, .taskCreated', taskModal).hide();
		$('#taskName', taskModal).val(item.data('name'));
		$('#taskDescription', taskModal).val(item.data('description'));
		$('#taskWC', taskModal).val(item.data('wc'));
		$('#taskPlane', taskModal).val(item.data('plane')).change();
		var deadline = item.data('deadline');
		if (!deadline) deadline = null;
		else {
			deadline = new Date(deadline);
			if (!isValidDate(deadline)) deadline = null;
		}
		$('#taskDeadline', taskModal)[0].valueAsDate = deadline;
		$('#taskStatus', taskModal).val(item.data('status'));
		$('#taskRemarks', taskModal).val(item.data('remarks'));
		$('.select-assigned', taskModal).remove();
		var template = $('.select-assigned-template');
		$('.task-assigned', item).each(function () {
			var myid = $(this).data('id');
			var select = template.clone(true).appendTo(template.parent());
			select.removeClass('select-assigned-template d-none').addClass('select-assigned');
			var sel = $('select', select);
			sel.removeClass('template');
			sel.selectpicker('refresh');
			sel.val(myid).change();
			$('.dropdown-toggle', select);
			// deletion handler
			$('.btnRemoveParent', select).click(function () {
				$(this).parent().remove();
			});
		});
		$('#taskId', taskModal).val(item.data('id'));
		taskModal.modal('show');
	},
});

Template.taskModal.onRendered(function () {
	$('select#taskStatus').selectpicker();
});
Template.taskModal.helpers({
	// get status labels
	getStatusLabels() {
		var list = [], i = 0;
		for (var s of statusLabels) {
			list.push({
				index: i++,
				label: s,
			});
		}
		return list;
	},
	// readonly field if employee
	readonlyIfEmployee() {
		var user = Meteor.user();
		if (!user || !user.profile || !user.profile.isManager) return { readonly: true };
		return {};
	},
	// employees
	availableEmployees() {
		return Employees.find({});
	},
	// employees
	availablePlanes() {
		return Planes.find({});
	},
});

Template.taskModal.events({
	// modal autofocus & select bugfix
	'shown.bs.modal .modal'(e) {
		$('.dropdown-toggle:not(.first-click)', modal).addClass('first-click').click(); // bugfix
		var modal = $(e.currentTarget);
		$('.auto-focus', modal).trigger('focus');
	},
	// add more assignees
	'click .btnAddMore'(e) {
		var btn = $(e.currentTarget);
		e.preventDefault();
		var template = $('.select-assigned-template');
		var select = template.clone(true).appendTo(template.parent());
		select.removeClass('select-assigned-template d-none').addClass('select-assigned');
		var sel = $('select', select);
		sel.removeClass('template');
		sel.selectpicker('refresh');
		$('.dropdown-toggle', select).click(); // bugfix
		// deletion handler
		$('.btnRemoveParent', select).click(function () {
			$(this).parent().remove();
		});
	},
	// clear form
	'click .btnClear'(e) {
		var btn = $(e.currentTarget);
		var form = btn.closest('form');
		$('input, textarea, select', form).val('').change();
		$('#taskStatus', form).val(0).change();
		$('.select-assigned', taskModal).remove();
		btn.closest('.taskCreated').hide();
	},
	// save task
	'submit #taskForm'(e) {
		var form = $(e.currentTarget);
		var name = $('#taskName', form).val();
		var description = $('#taskDescription', form).val();
		var wc = $('#taskWC', form).val();
		var plane = $('#taskPlane', form).val();
		var deadline = $('#taskDeadline', form).val();
		var status = $('#taskStatus', form).val();
		var remarks = $('#taskRemarks', form).val();
		var assignees = [];
		$('.select-assigned', form).each(function () {
			var myval = $('select', this).val();
			if (myval) assignees.push(myval);
		});
		var taskId = $('#taskId', form).val();
		Meteor.call('updateTask',
			name, description, wc, plane, deadline, assignees, status, remarks, taskId,
			function (error, result) {

				var errText = null;
				if (error && error.reason) errText = error.reason;
				else if (!result) errText = "Saving changes failed!";
				if (errText) {
					// failed
					$('.taskFeedback').removeClass('text-success').addClass('text-danger')
						.text(errText).show();
					$('.taskCreated').hide();
				}
				else {
					// ok
					$('.taskFeedback').hide();
					if (taskId) {
						$('#taskModal').modal('hide');
						// update item if exists
						var item = $('#task-item-' + taskId);
						item.data('name', name);
						item.data('description', description);
						item.data('wc', wc);
						item.data('plane', plane);
						item.data('status', status);
						item.data('remarks', remarks);
						$('.task-assigned', item).each(function () {
							var myid = $(this).data('id');
							if (!assignees.includes(myid)) $(this).remove();
							else {
								var i = assignees.indexOf(myid);
								if (i > -1) assignees.splice(i, 1);
							}
						});
						var container = $('.task-assigned-container', item);
						var template = $('select-assigned-template', form);
						assignees.forEach(function (val) {
							var mytext = $('option[value="' + val + '"]', template).text();
							$('<div>').addClass('task-assigned').data('id', val).text(mytext)
								.appendTo(container);
						});
					}
					else $('.taskCreated').hide().slideDown();
				}
			});
		return false;
	},
});

Template.planesList.helpers({
	// list
	getList() {
		var filters = {}, setFilter = Session.get('planeListFilter');
		if (setFilter === 1) filters = { releasedOn: null };
		else if (setFilter === 2) filters = {
			releasedOn: { $not: null }
		};
		return Planes.find(filters);
	},
	// filter
	showAll() {
		return !Session.get('planeListFilter');
	},
	showActive() {
		return Session.get('planeListFilter') === 1;
	},
	showReleased() {
		return Session.get('planeListFilter') === 2;
	},
});

Template.planesList.events({
	// filter
	'click .planesListFilter'(e) {
		var btn = $(e.currentTarget);
		e.preventDefault();
		var toFilter = btn.hasClass('planesListReleased') ? 2 :
			(btn.hasClass('planesListActive') ? 1 : 0);
		Session.set('planeListFilter', toFilter);
	},
	// add plane
	'click #addPlane'(e) {
		e.preventDefault();
		var planeModal = $('#planeModal');
		$('.planeFeedback', planeModal).hide();
		$('input, textarea', planeModal).val('');
		$('.btnRelease, .btnTakeIn, .textReleased', planeModal).hide();
		planeModal.modal('show');
	},
	// plane info
	'click .plane-item'(e) {
		var item = $(e.currentTarget);
		var planeModal = $('#planeModal');
		$('.planeFeedback', planeModal).hide();
		$('#planeName', planeModal).val(item.data('name'));
		$('#planeModel', planeModal).val(item.data('model'));
		$('#planeReason', planeModal).val(item.data('reason'));
		$('#planeId', planeModal).val(item.data('id'));
		$('.btnRelease, .btnTakeIn, .textReleased', planeModal).hide();
		var released = item.data('released');
		if (released) released = new Date(released);
		if (released) {
			$('.btnTakeIn', planeModal).show();
			$('.textReleased', planeModal).addClass('text-success')
				.text('Released to service on ' + released.toLocaleDateString()).show();
		}
		else {
			$('.btnRelease', planeModal).show();
			var entered = new Date(item.data('entered'));
			$('.textReleased', planeModal).removeClass('text-success')
				.text('Taken in for maintenance on ' + entered.toLocaleDateString()).show();
		}
		planeModal.modal('show');
	},
});

Template.planeModal.helpers({
	// readonly field if employee
	readonlyIfEmployee() {
		var user = Meteor.user();
		if (!user || !user.profile || !user.profile.isManager) return { readonly: true };
		return {};
	},
});

Template.planeModal.events({
	// modal autofocus
	'shown.bs.modal .modal'(e) {
		var modal = $(e.currentTarget);
		$('.auto-focus', modal).trigger('focus');
	},
	// save plane
	'submit #planeForm'(e) {
		var form = $(e.currentTarget);
		var name = $('#planeName', form).val();
		var model = $('#planeModel', form).val();
		var reason = $('#planeReason', form).val();
		var planeId = $('#planeId', form).val();
		Meteor.call('updatePlane',
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
					if (planeId) {
						var item = $('#plane-item-' + planeId);
						item.data('name', name);
						item.data('model', model);
						item.data('reason', reason);
					}
				}
			});
		return false;
	},
	// release
	'click .btnRelease'(e) {
		e.preventDefault();
		var form = $(e.currentTarget).closest('form');
		var planeId = $('#planeId', form).val();
		Meteor.call('releasePlane', planeId, true, function (error, result) {

			var errText = null;
			if (error && error.reason) errText = error.reason;
			else if (!result) errText = "Status updating failed!";
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
				item.addClass('released').data('released', new Date());
			}
		});
		return false;
	},
	// take in
	'click .btnTakeIn'(e) {
		e.preventDefault();
		var form = $(e.currentTarget).closest('form');
		var planeId = $('#planeId', form).val();
		Meteor.call('releasePlane', planeId, false, function (error, result) {

			var errText = null;
			if (error && error.reason) errText = error.reason;
			else if (!result) errText = "Status updating failed!";
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
				item.removeClass('released').data('entered', new Date()).data('released', null);
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
		var form = $(e.currentTarget);
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
	// modal autofocus
	'shown.bs.modal .modal'(e) {
		var modal = $(e.currentTarget);
		$('.auto-focus', modal).trigger('focus');
		console.log($('.auto-focus', modal).length);
	},
	// login form
	'submit #loginForm'(e) {
		var form = $(e.currentTarget);
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