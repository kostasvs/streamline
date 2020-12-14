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
	}
});
