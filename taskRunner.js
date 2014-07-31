var RSVP = require("rsvp");

RSVP.on('error', function(reason) {
  console.assert(false, reason);
});


var commandList = null;
var retryMap = {};
var valueStack = {};

function processQueue(elem) {

	if(retryMap[elem.id] === undefined)
		retryMap[elem.id] = 1;

	//console.log("Start up input: " + JSON.stringify(elem.input, null, 2));

	// we do a deep scan and replace (previous values vs matching strings)
	modifiedInput = deepScanAndReplace(elem.input);

	//console.log("Modified input: " + JSON.stringify(modifiedInput, null, 2));
	
	var pro = elem.task.run(modifiedInput, null, 2);

	pro.then(function(data) {

		console.log("Step " + elem.id + " SUCCESS");

		// we save the value in the value stack
		valueStack[elem.id] = data;

		// we flatten the value stack
		valueStack = flattenObject(valueStack);

		//console.log("New value stack: " + JSON.stringify(valueStack, null, 2));

		if(commandList.length > 0)
			// we invoke the new step
			processQueue(commandList.shift());

	}, function(err) {

		console.error("Step " + elem.id + " FAILURE: " + err.stack);

		if(retryMap[elem.id] > 4)
			throw new Error("Task " + elem.id + " failed " + retryMap[elem.id] + " times, aborting");

		// we increment the retry number
		retryMap[elem.id]++;

		console.error("Retrying Step " + elem.id + "...");

		// we call the same step in 5 seconds
		setTimeout(function() { processQueue(elem); }, 5000);

	});

}

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

			// we start by copying the value from source
			ret[key] = src[key];

			// faster than regex replacement in V8
			for(var valueStackKey in valueStack) {

				if(value.split("%" + valueStackKey + "%").length > 1)
					ret[key] = value.split("%" + valueStackKey + "%").join(valueStack[valueStackKey]);
					
			}
			

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

module.exports.run = function(taskList) {
	
	// we save a reference to the module
	commandList = taskList;

	// we kick off
	processQueue(taskList.shift());

};