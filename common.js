// planes collection
this.Planes = new Mongo.Collection("planes");
this.Organizations = new Mongo.Collection("organizations");

// mongo methods
Meteor.methods({
    // method to add a plane
    addPlane: function () {

        //if (!this.userId) return;
        var plane = {
            name: 'Plane',
            owner: null,
            createdOn: new Date(),
        };
        var id = Planes.insert(plane);
        console.log("addPlane " + id);
        return id;
    },
});