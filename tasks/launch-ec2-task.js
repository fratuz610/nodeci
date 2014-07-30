var cf = require("../config.js");

var aws = require('aws-sdk');
var RSVP = require('rsvp');

var ec2 = new aws.EC2();

module.exports.run = function(ec2Params) {

	var promise = new RSVP.Promise(function(resolve, reject){

		var params = {
		  ImageId: ec2Params.baseAMI,
		  InstanceType: ec2Params.instanceSize,
		  MinCount: 1, 
		  MaxCount: 1,
		  InstanceInitiatedShutdownBehavior: 'terminate',
		  KeyName: ec2Params.keyName,
		  NetworkInterfaces: [{ 
		  		AssociatePublicIpAddress: ec2Params.publicIP || false,
		  		DeviceIndex : 0,
		  		SubnetId: ec2Params.subnetID,
		  		Groups: ec2Params.securityGroupIDList
		  	}]
		};

		// Create the instance
		ec2.runInstances(params, function(err, data) {
		  
		  if (err)
		  	return reject(err);

		  var instanceData = data.Instances[0];
		  var realInstanceName = ec2Params.instanceName + "-" + new Date().getTime();

		  console.log("Created instance", instanceData.InstanceId);

		  // Add tags to the instance
		  params = {
		  	Resources: [instanceData.InstanceId], 
		  	Tags: [ {Key: 'Name', Value: realInstanceName} ]
		  };

		  ec2.createTags(params, function(err) {

		  	if (err) { 
			  	console.error("Unable to tag instance " + err.stack);
			} else {
				console.log("Instance tagged name: " + realInstanceName);
			}
		    
		  });

		  // we wait for the instance to be running
		  params = {
		  	InstanceIds: [instanceData.InstanceId]
		  };

		  function describeInstance() {
		  	
		  	ec2.describeInstances(params, function(err, data) {
		  		if(err) {
		  			console.error("Unable to get instance status " + err);
		  			setTimeout(describeInstance, 1000);
		  			return;
		  		}

		  		if(data.Reservations[0].Instances[0].State.Name !== "running") {
	  				console.log("Instance " + instanceData.InstanceId + " is still " + data.Reservations[0].Instances[0].State.Name);
	  				setTimeout(describeInstance, 1000);
	  				return;
	  			}

	  			console.log("Instance " + instanceData.InstanceId + " is now running");
	  			resolve(data.Reservations[0].Instances[0]);
			  	
			});

		  }

		  describeInstance();

		});
	});

	return promise;
};