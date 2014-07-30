var fs = require('fs');

var currentFolder = __dirname + "/";

var config;
try {
  config = fs.readFileSync(currentFolder + "config.json");
} catch (e) {
  console.error("Unable to read config file(s): " + e);
  throw e;
}

console.log("Successfully parsed config file " + config.length + " bytes");

// we export the config for this environment
var parsedConfig;

try {
  parsedConfig = JSON.parse(config);
} catch (e) {
  console.error("Unable to read config file(s) - " + e.stack);
  throw e;
}

// static config
module.exports.aws = parsedConfig.aws;
module.exports.notification = parsedConfig.notification;