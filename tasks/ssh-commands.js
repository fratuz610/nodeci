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

			    	console.log('Exit code: ' + code);

			      	ret[command].exitCode = code;

			    }).on('close', function() {

			      	console.log('Command complete');
			      	
			      	if(sshParams.commandList.length === 0) {
			      		conn.end();
			      		return resolve(ret);
			      	}

			      	console.log('Command complete ' + ret[command].stdout.length + " stdout bytes / " + ret[command].stderr.length + " stderr bytes");

			      	runCommand(sshParams.commandList.shift());
			     	
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