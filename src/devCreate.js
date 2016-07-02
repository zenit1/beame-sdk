var test = require('./prov_api.js');
var provApi = new test();
var debug = require("debug")("./src/devCreate.js");


var fs = require('fs');
var os = require('os');
var keys = ["$id", "hostname", "uid"];    //expected answer keys
var home = os.homedir();
var devPath = home + "/.beame/";              //path to store dev data: uid, hostname, key, certs, appData

try {
    if (fs.lstatSync(devPath)) {
        debug("Directory for developer already exists");
    }
}
catch (e) {
    debug("Dev path ", devPath);
    fs.mkdirSync(devPath);
}

/* Expected answer (values gonna change):
 *  "$id": "1",
 *  "hostname": "lkdz51o29q1hlfmusixn3ryilfhm5vdi.v1.beameio.net",
 *  "uid": "96fc1f42-30ac-4829-bbcc-3f518fcefcb5"
 *
 */

/*debug(process.argv);
 if (process.argv.length < 3) {
 debug('Usage: node '+__filename+' nikname');
 process.exit(-1);
 }*/

var param = process.argv[2];              //get name from cli
debug('Running api with cli param: ' + param);

var authData = {
    pk: home + "/authData/pk.pem",
    x509: home + "/authData/x509.pem",
    generateKeys: false,
    makeCSR: false,
    CSRsubj: "/C=US/ST=Florida/L=Gainesville/O=LFE.COM, Inc/OU=Development/CN=doesntMatter"
};

var createDeveloperRequest = function (param, callback) {

    var postData = {
        name: param
    };

    var testParams = {
        version: "/v1",
        api: "/dev/create",
        postData: postData,
        answerExpected: true,
        decode: false
    };

    provApi.runRestfulAPI(testParams, function (err, payload) {
        if (!err) {
            var i;
            fs.appendFileSync(devPath + 'developers', payload.hostname + '\r\n');

            var devDir = devPath + payload.hostname + '/';

            if (!fs.existsSync(devDir)) {
                fs.mkdirSync(devDir);//create directory for new developer, named with his unique hostname
            }

            fs.writeFileSync(devDir + "name", param);

            for (i = 0; i < keys.length; i++) {
                if (payload[keys[i]] !== undefined) {
                    debug(keys[i] + ': ' + payload[keys[i]]);
                    // next is single test use only,
                    // eventually, this gonna create folder for each user to be re-used in following multi-user tests:
                    fs.writeFile(devDir + keys[i], payload[keys[i]]);
                }
                else {
                    debug('Error, missing <' + keys[i] + '> element in provisioning answer');
                    //process.exit(-1);
                    callback(null);
                }
            }
            
            if (callback) {
                callback(payload);
            }
        }
        else {
            callback(null);
            debug('Fail: ' + err);
        }

    });
};


module.exports.requestCreateDeveloper = function (developerName, callback) {
    provApi.setAuthData(authData, function () {

        createDeveloperRequest(developerName, callback);
        //callback will return null,null so
        //nothing special to do here, this is
        //to use in further activities: update / getCert etc

    });
};


//module.exports =  requestCreateDeveloper;

