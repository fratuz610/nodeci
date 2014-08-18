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
		id : "scp-files",
		task: require("./tasks/scp-files.js"),
		input: {
			host : "%launch-ec2.PublicIpAddress%",
			port : 22,
			username: "ubuntu",
			keyFile : cf.aws.common.keyFile,
			fileList: [
				{ 
					src: "config-files/news-nginx-tweaks.conf",
					dest: "/tmp/news-nginx-tweaks.conf"
				},
				{ 
					src: "config-files/news-nginx-site.conf",
					dest: "/tmp/news-nginx-site.conf"
				},
				{ 
					src: "config-files/news-php-fpm-pool.conf",
					dest: "/tmp/news-php-fpm-pool.conf"
				}
			]
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
				"sudo apt-get install php5-cli php5-json php5-mysqlnd php5-fpm php5-cgi php5-gd php5-curl php5-mcrypt php5 unzip p7zip-full nginx git -y",
				"sudo rm /etc/php5/fpm/pool.d/www.conf",
				"sudo rm /etc/nginx/sites-available/default",
				"sudo rm /etc/nginx/sites-enabled/default",
				"sudo cp /tmp/news-nginx-tweaks.conf /etc/nginx/conf.d/news.conf",
				"sudo cp /tmp/news-nginx-site.conf /etc/nginx/sites-available/insideout.com.au",
				"sudo cp /tmp/news-php-fpm-pool.conf /etc/php5/fpm/pool.d/insideout.com.au.conf",
				"sudo ln -s /etc/nginx/sites-available/insideout.com.au /etc/nginx/sites-enabled/insideout.com.au",
				"sudo groupadd insideout.com.au",
				"sudo mkdir /var/www",
				"sudo useradd -g insideout.com.au -d /var/www/insideout.com.au -m -s /bin/bash insideout.com.au",
				"sudo -u insideout.com.au mkdir /var/www/insideout.com.au/log",
				"git clone "+ cf.repo.url +" /tmp/temp-repo",
				"cd /tmp/temp-repo && git checkout " + cf.repo.commitHash,
				"rm -R /tmp/temp-repo/.git",
				"sudo mv /tmp/temp-repo /var/www/insideout.com.au/web",
				"sudo chown -R insideout.com.au:insideout.com.au /var/www/insideout.com.au/web",
				"sudo service php5-fpm restart",
				"sudo service nginx restart"
			]
		}
	}
];

// we run all tasks
taskRunner.run(taskList);