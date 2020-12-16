// collections
this.Planes = new Mongo.Collection("planes");
this.Organizations = new Mongo.Collection("organizations");
this.Tasks = new Mongo.Collection("tasks");
this.Employees = Meteor.users; //new Mongo.Collection("employees");

// status labels
this.statusLabels = [
	'Open (Pending)',
	'Closed',
	'Awaiting other task',
	'Awaiting components/equipment'
];
this.statusLabelIcons = [
	'exclamation-circle',
	'check',
	'ban',
	'ban'
];
