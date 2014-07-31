var cf = require("../config.js");

var RSVP = require('rsvp');

var Connection = require('ssh2');


module.exports.run = function(scpParams) {

	// host
	// port
	// username
	// keyFile
	// fileList (src, dest)

	var promise = new RSVP.Promise(function(resolve, reject){

		var conn = new Connection();

		console.log("Attempting connection to " + scpParams.host + ":" + scpParams.port+ " ...");

		conn.on('ready', function() {

		  console.log('Connected to ' + scpParams.host + ":" + scpParams.port);

		  var ret = {};

		  if(scpParams.fileList.length === 0)
		  	return reject(new Error("No files to upload"));

		  function uploadFile(file) {

		  	console.log("Opening sftp session...");

		  	ret[file.src] = {
		  		src: file.src,
		  		dest: file.dest,
		  		startTime: new Date().getTime(),
		  		endTime: 0
		  	};

		  	conn.sftp(function(err, sftp) {
			    
			    if (err) 
			    	return reject(err);

			    console.log("Uploading file '" + file.src +"' to '" + file.dest + "'");

			    sftp.fastPut(file.src, file.dest, function(err) {
			    	if (err) 
			    		return reject(err);

			    	ret[file.src].endTime = new Date().getTime();

			    	console.log("File '" + file.src +"' uploaded successfully");

			    	if(scpParams.fileList.length === 0) {
			      		conn.end();
			      		return resolve(ret);
			      	}

			      	// we upload the next file
			      	uploadFile(scpParams.fileList.shift());
			    });
			  });

		  }

		  // we kick off
		  uploadFile(scpParams.fileList.shift());
		  
		}).on('error', function(err) {

			return reject(err);

		}).connect({
		  host: scpParams.host,
		  port: scpParams.port,
		  username: scpParams.username,
		  privateKey: require('fs').readFileSync(scpParams.keyFile),
		  readyTimeout: 60000,
		  pingInterval: 10000
		});

	});

	return promise;

};