"use strict";

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fs = require('fs');

class Util {

	static download(bucket, key, dest) {
        s3.getObject({ Bucket: bucket, Key: key }).createReadStream().pipe(
			fs.createWriteStream(dest));
	}

}

module.exports = Util;