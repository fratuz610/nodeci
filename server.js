var cf = require("./config.js");
var taskRunner = require("./taskRunner.js");
var aws = require('aws-sdk');

aws.config.update({ 
	accessKeyId: cf.aws.common.accessKey, 
	secretAccessKey: cf.aws.common.secretKey,
	sslEnabled: false,
	region: cf.aws.common.region
});

var taskList = [
	{
		id : "launch-ec2",
		task: require("./tasks/launch-ec2-task.js"),
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
		task: require("./tasks/ssh-commands.js"),
		input: {
			host : "%launch-ec2.PublicIpAddress%",
			port : 22,
			username: "ubuntu",
			keyFile : cf.aws.common.keyFile,
			commandList: [
				"sudo apt-get update",
				"sudo apt-get install php5-cli php5-json php5-mysqlnd php5-fpm php5-cgi php5-gd php5-curl php5-mcrypt php5 unzip p7zip-full nginx git -y"
			]
		}
	}
];

// we run all tasks
taskRunner.run(taskList);