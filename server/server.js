import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  // code to run on server at startup
    if (!Planes.findOne()) {// no documents yet!
        Planes.insert({ name: "1st plane" });
    }
});

// publish list of planes
//Meteor.publish("planes", function () {
//    return Planes.find();
//});
