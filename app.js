"use strict";

const AWS = require('aws-sdk');

// assumes using ~/.aws/credentials ini file
// see http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html
AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: 'archetypal'});
AWS.config.update({ region: 'us-west-2' });

// versions should be locked in production code
AWS.config.apiVersions = {
  ec2: 'latest',
  elb: 'latest',
};

const async = require('async');
const fs = require('fs');
const iam = new AWS.IAM();
const ecs = new AWS.ECS();
const ec2 = new AWS.EC2();
const elb = new AWS.ELB();

// When generating new clusters, names will be based off this
const environmentName = "beta";

function emit(err, data) {
  if (err) {
    console.log(err, err.stack);
    return;
  }

  fs.writeFile("out.json", JSON.stringify(data, null, 2));
}

function createRole(name, policies) {
  iam.createRole({ RoleName: name }, (err, data) => {
    if (err) {
      console.log(err, err.stack);
      return false;
    }

    for (const policyArn of policies) {
      iam.attachRolePolicy({RoleName: name, PolicyArn: policyArn});
    }

  })
}

// createRole('test', 'arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role');


// iam.getRole({RoleName: 'ecsInstanceRole'}, emit);
// iam.listRolePolicies({RoleName: 'ecsInstanceRole'}, emit);
// iam.listAttachedRolePolicies({ RoleName: 'ecsInstanceRole' }, emit);

// ec2.describeInstances(emit);



// ecs.describeClusters({ clusters: ['default'] }, emit);

// ecs.listServices({ cluster: 'default' }, emit);

// ecs.describeServices(
//   { cluster: 'default', services: ['ui-web-service'] },
//   emit
//   );


 ecs.listTasks({ cluster: 'default' }, emit);


// ecs.describeTasks(
//   { cluster: 'default', tasks: ['eaa7b8cd-d668-48d0-bd52-1d09e2456be3'] },
//   emit
//   );


// ecs.describeTaskDefinition({ taskDefinition: 'nginx:2' }, emit);

function createVpc(callback) {
  console.log("Creating VPC...");
  ec2.createVpc({
    CidrBlock: '10.0.0.0/16',
    DryRun: false,
    InstanceTenancy: 'default'
  }, function(err, data) {
    if (!err) {
      asyncSharedData.vpc = data.Vpc;
      console.log("Created VPC: " + data.Vpc.VpcId);
    }
    callback(err, data);
  });
};

function createInternetGateway(callback) {
  console.log("Creating Internet Gateway...");
  ec2.createInternetGateway({
    DryRun: false
  }, function(err, data) {
    if (!err) {
      console.log(data);
      asyncSharedData.ig = data.InternetGateway;
      console.log("Created Internet Gateway: " + data.InternetGateway.InternetGatewayId);
    }
    callback(err, data);
  });
};

function attachInternetGateway(callback) {
  console.log("Attaching Internet Gateway...");
  ec2.attachInternetGateway({
    InternetGatewayId: asyncSharedData.ig.InternetGatewayId,
    VpcId: asyncSharedData.vpc.VpcId,
    DryRun: false
  }, function(err, data) {
    if (!err) {
      console.log("Attached Internet Gateway: " + asyncSharedData.ig.InternetGatewayId
        + " to VPC: " + asyncSharedData.vpc.VpcId);
    }
    callback(err, data);
  });
};

function createSubnet(callback) {
  console.log("Creating subnet...");
  ec2.createSubnet({
    CidrBlock: '10.0.0.0/24',
    VpcId: asyncSharedData.vpc.VpcId,
    //AvailabilityZone: 'STRING_VALUE',
    DryRun: false
  }, function(err, data) {
    if (!err) {
      asyncSharedData.subnet = data.Subnet;
      console.log("Created Subnet: " + data.Subnet.SubnetId);
    }
    callback(err, data);
  });
}

function createSecurityGroup(callback) {
  console.log("Creating Security Group...");
  ec2.createSecurityGroup({
    Description: 'Created via script for env: ' + environmentName,
    GroupName: environmentName,
    DryRun: false,
    VpcId: asyncSharedData.vpc.VpcId
  }, function(err, data) {
    if (!err) {
      asyncSharedData.sg = data;
      console.log("Created Security Group: " + data.GroupId);
    }
    callback(err, data);
  });
};

function createElb(callback) {
  console.log("Creating Elastic Load Balancer...");
  elb.createLoadBalancer({
    Listeners: [
      {
        InstancePort: 4110,
        LoadBalancerPort: 4110,
        Protocol: 'HTTP',
      },
      {
        InstancePort: 4111,
        LoadBalancerPort: 4111,
        Protocol: 'HTTP',
      },
    ],
    LoadBalancerName: environmentName,
    Scheme: 'internet-facing',
    SecurityGroups: [
      asyncSharedData.sg.GroupId,
    ],
    Subnets: [
      asyncSharedData.subnet.SubnetId
    ],
    Tags: [
      {
        Key: 'Name',
        Value: environmentName
      },
    ]
  }, function(err, data) {
    if (!err) {
      asyncSharedData.elb = data;
      console.log("Created Load Balancer: " + data.DNSName);
    }
    callback(err, data);
  });
};

function tagCreatedItems(callback) {
  console.log("Tagging created items...");
  ec2.createTags({
    Resources: [
      asyncSharedData.vpc.VpcId,
      asyncSharedData.ig.InternetGatewayId,
      asyncSharedData.sg.GroupId
    ],
    Tags: [
      {
        Key: 'Name',
        Value: environmentName
      },
    ],
    DryRun: false
  }, callback);
}

// END GOAL: REBUILD ENTIRE CLUSTER FROM 'SCRATCH' (rough draft)
////////////////////////////////////////////////////////////////
// --> assume there are Roles and Permissions already set up

var asyncSharedData = {};

async.series([
    createVpc,
    createInternetGateway,
    attachInternetGateway,
    createSubnet,
    createSecurityGroup,
    createElb,

    // TAG last
    tagCreatedItems,
], function (err, result) {
    // result now equals 'done'
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(result);           // successful response
    //console.log("In callback", err, result);
});


// create ECS cluster
//   add API & Scheduler
//     where to get environment variables?  Hard code here in a JSON file?  Have a JSON file per environment?
//   add UI
// create EC2 container running Docker for Kong/Cassandra
//   login to Docker <- need to SSH and store raw creds here?
//   pull in Docker images
//   start Cassandra & wait alotted time (~30 secs?)
//   start Kong
//   configure Kong and point at ELB

// Create these, or assume they exist?
//   SQS queues, DynamoDB tables, SES configs

// TODO use specific API version? (prevent JSON schemas from changing in future)
// TODO import/export functionality.  Have a script to dump a cluster to a JSON file that can be used to recreate a new cluster.

// TAG ITEMS
