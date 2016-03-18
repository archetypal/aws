'use strict';

const Util = require('./util');


Util.download('archetypal', 'docker/config.json', 'config.json');


/*
const AWS = require('aws-sdk');

AWS.config.update();

const ec2 = new AWS.EC2({region: 'us-west-2'});

ec2.describeInstances((error, data) => {
	console.log(error);
	console.log(data);
})
 */