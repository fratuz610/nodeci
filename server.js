var cf = require("./config.js");
var aws = require('aws-sdk');

aws.config.update({ 
	accessKeyId: cf.aws.common.accessKey, 
	secretAccessKey: cf.aws.common.secretKey,
	sslEnabled: false,
	region: cf.aws.common.region
});

var launchEc2Task = require("./tasks/launch-ec2-task.js");
var sshCommands = require("./tasks/ssh-commands.js");

var RSVP = require("rsvp");

RSVP.on('error', function(reason) {
  console.assert(false, reason);
});


var commandList = [
	{
		id : "launch-ec2",
		task: launchEc2Task,
		input: {
			baseAMI : cf.aws.test.imageID,
			instanceSize : cf.aws.test.instanceType,
			instanceName : cf.aws.test.instanceName,
			securityGroupIDList : cf.aws.test.securityGroupIDList,
			subnetID : cf.aws.test.subnetID,
			keyName: cf.aws.common.keyName,
			publicIP: true
		}
	},
	{
		id : "ssh-commands",
		task: sshCommands,
		input: {
			host : "launch-ec2.PublicIpAddress",
			port : 22,
			username: "ubuntu",
			keyFile : cf.aws.common.keyFile,
			commandList: [
				"sudo apt-get update",
				"sudo apt-get install php5-cli php5-json php5-mysqlnd php5-fpm php5-cgi php5-gd php5-curl php5-mcrypt php5 unzip p7zip-full nginx git"
			]
		}
	}
];

var retryMap = {};
var valueStack = {};

function processQueue(elem) {

	if(retryMap[elem.id] === undefined)
		retryMap[elem.id] = 1;

	console.log("Start up input: " + JSON.stringify(elem.input, null, 2));

	// we do a deep scan and replace (previous values vs matching strings)
	modifiedInput = deepScanAndReplace(elem.input);

	console.log("Modified input: " + JSON.stringify(modifiedInput, null, 2));
	
	var pro = elem.task.run(modifiedInput, null, 2);

	pro.then(function(data) {

		console.log("Step " + elem.id + " SUCCESS");

		// we save the value in the value stack
		valueStack[elem.id] = data;

		// we flatten the value stack
		valueStack = flattenObject(valueStack);

		console.log("New value stack: " + JSON.stringify(valueStack, null, 2));

		// we invoke the new step with the old data as carry
		processQueue(commandList.shift());

	}, function(err) {

		console.error("Step " + elem.id + " FAILURE: " + err.stack);

		if(retryMap[elem.id] > 4)
			throw new Error("Task " + elem.id + " failed " + retryMap[elem.id] + " times, aborting");

		// we increment the retry number
		retryMap[elem.id]++;

		console.error("Retrying Step " + elem.id + "...");

		// we call the same step
		processQueue(elem);

	});

}

// we kick off
processQueue(commandList.shift());

function deepScanAndReplace(src) {

	var wasArray = false;

	if(src instanceof Array)
		wasArray = true;

	var ret = {};

	// we calculate the value stack possible matches
	for(var key in src) {

		if (!src.hasOwnProperty(key)) 
			continue;

		var value = src[key];

		if(typeof value === "string") {
			
			// we replace all matching strings
			if(valueStack[value] !== undefined)
				ret[key] = valueStack[value];
			else
				ret[key] = value;

		} else if (typeof value === 'object') {

			// we found a nested object, let's recurse
			ret[key] = deepScanAndReplace(value);

		} else {
			
			ret[key] = value;
		}
		// other field, nothing to do
	}


	if(wasArray)
		return asArray(ret);
	else
		return ret;
}

function flattenObject(ob) {
	var toReturn = {};
	
	for (var i in ob) {
		if (!ob.hasOwnProperty(i)) continue;
		
		if ((typeof ob[i]) == 'object') {
			var flatObject = flattenObject(ob[i]);
			for (var x in flatObject) {
				if (!flatObject.hasOwnProperty(x)) continue;
				
				toReturn[i + '.' + x] = flatObject[x];
			}
		} else {
			toReturn[i] = ob[i];
		}
	}
	return toReturn;
}

function asArray(obj) {
	var arrayRet = [];
	for(var index in obj) {
		arrayRet[index] =obj[index];
	}
	return arrayRet;
}