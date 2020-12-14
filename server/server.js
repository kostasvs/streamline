import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  // code to run on server at startup
});

// publish list of planes
Meteor.publish("planes", function () {
    return Planes.find();
});
