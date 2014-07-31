var cf = require("../config.js");

var RSVP = require('rsvp');

var Connection = require('ssh2');


module.exports.run = function(sshParams) {

	// host
	// port
	// username
	// keyFile
	// commandList

	var promise = new RSVP.Promise(function(resolve, reject){

		var conn = new Connection();

		console.log("Attempting connection to " + sshParams.host + ":" + sshParams.port+ " ...");

		conn.on('ready', function() {

		  console.log('Connected to ' + sshParams.host + ":" + sshParams.port);

		  var ret = {};

		  if(sshParams.commandList.length === 0)
		  	return reject(new Error("No commands to execute!"));

		  function runCommand(command) {

		  	console.log("Running '" + command +"'");

		  	ret[command] = {
		  		exitCode: null,
		  		stdout: "",
		  		stderr: "",
		  		startTime: new Date().getTime(),
		  		endTime: 0
		  	};

		  	conn.exec(command, function(err, stream) {
			    
			    if (err) 
			    	return reject(err);

			    stream.on('exit', function(code, signal) {

			      	ret[command].exitCode = parseInt(code);

			    }).on('close', function() {

			      	if(sshParams.commandList.length === 0) {
			      		conn.end();
			      		return resolve(ret);
			      	}

			      	if(ret[command].exitCode !== 0) {
			      		console.log('Command completed ERROR: exit code ' + ret[command].exitCode);
				      	console.log("Command stdout: '" + ret[command].stdout.substring(0, 100).trim() + "'");
				      	console.log("Command stderr: '" + ret[command].stderr.substring(0, 100).trim() + "'");

				      	return reject(new Error("Failed to run " + command + " exit code: " + ret[command].exitCode));

			      	} else {
			      		console.log('Command completed SUCCESSFULLY: ' + ret[command].stdout.substring(0, 100).trim() + "'");
				      	runCommand(sshParams.commandList.shift());
			      	}
			      	
			    }).on('data', function(data) {

			      	ret[command].stdout += data;
			      
			    }).stderr.on('data', function(data) {
			      
			      	ret[command].stderr += data;

			    });
			  });

		  }

		  // we kick off
		  runCommand(sshParams.commandList.shift());
		  
		}).on('error', function(err) {

			return reject(err);

		}).connect({
		  host: sshParams.host,
		  port: sshParams.port,
		  username: sshParams.username,
		  privateKey: require('fs').readFileSync(sshParams.keyFile),
		  readyTimeout: 60000,
		  pingInterval: 10000
		});

	});

	return promise;

};