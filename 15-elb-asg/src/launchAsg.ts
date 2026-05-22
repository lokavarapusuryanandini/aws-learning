import {
  EC2Client,
  CreateLaunchTemplateCommand,
  DescribeImagesCommand,
  DescribeSubnetsCommand,
  DescribeVpcsCommand,
  DescribeSecurityGroupsCommand,
  Subnet,
} from "@aws-sdk/client-ec2";

import {
  ElasticLoadBalancingV2Client,
  CreateLoadBalancerCommand,
  CreateTargetGroupCommand,
  CreateListenerCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";

import {
  AutoScalingClient,
  CreateAutoScalingGroupCommand,
} from "@aws-sdk/client-auto-scaling";

const REGION = "us-east-1";
const PREFIX = "aws-learning-day15";

const ec2 = new EC2Client({ region: REGION });
const elb = new ElasticLoadBalancingV2Client({ region: REGION });
const asg = new AutoScalingClient({ region: REGION });

/* ---------------- AMI ---------------- */
async function getLatestAMI(): Promise<string> {
  const res = await ec2.send(
    new DescribeImagesCommand({
      Owners: ["amazon"],
      Filters: [
        { Name: "name", Values: ["al2023-ami-*-x86_64"] },
        { Name: "state", Values: ["available"] },
      ],
    })
  );

  const images = res.Images || [];

  images.sort((a, b) =>
    (b.CreationDate || "").localeCompare(a.CreationDate || "")
  );

  const ami = images[0]?.ImageId;
  if (!ami) throw new Error("No AMI found");

  console.log("Using AMI:", ami);
  return ami;
}

/* ---------------- SUBNETS ---------------- */
async function getPublicSubnets(): Promise<string[]> {
  const res = await ec2.send(new DescribeSubnetsCommand({}));

  const subnets = res.Subnets ?? [];

  const publicSubnets = subnets.filter(
    (s: Subnet) => s.SubnetId && s.MapPublicIpOnLaunch
  );

  const ids = publicSubnets.map((s) => s.SubnetId!).slice(0, 2);

  if (ids.length < 2) throw new Error("Need 2 public subnets");

  console.log("Using subnets:", ids);
  return ids;
}

/* ---------------- VPC ---------------- */
async function getDefaultVPC(): Promise<string> {
  const res = await ec2.send(new DescribeVpcsCommand({}));

  const vpc = res.Vpcs?.find((v) => v.IsDefault);
  if (!vpc?.VpcId) throw new Error("No default VPC found");

  console.log("Using VPC:", vpc.VpcId);
  return vpc.VpcId;
}

/* ---------------- SECURITY GROUP ---------------- */
async function getSecurityGroup(): Promise<string> {
  const res = await ec2.send(
    new DescribeSecurityGroupsCommand({
      Filters: [
        { Name: "group-name", Values: [`${PREFIX}-sg`] },
      ],
    })
  );

  const sg = res.SecurityGroups?.[0];

  if (!sg?.GroupId) {
    throw new Error("Create SG with HTTP 80 open first");
  }

  console.log("Using Security Group:", sg.GroupId);
  return sg.GroupId;
}

/* ---------------- MAIN ---------------- */
async function launch() {
  console.log("===== STARTING DAY 15 SETUP =====");

  const ami = await getLatestAMI();
  const subnets = await getPublicSubnets();
  const vpcId = await getDefaultVPC();
  const sgId = await getSecurityGroup();

  /* ---------------- Launch Template ---------------- */
  console.log("Creating Launch Template...");

  const lt = await ec2.send(
    new CreateLaunchTemplateCommand({
      LaunchTemplateName: `${PREFIX}-lt`,
      LaunchTemplateData: {
        ImageId: ami,
        InstanceType: "t3.micro",
        SecurityGroupIds: [sgId],

      UserData: Buffer.from(`#!/bin/bash
yum update -y
yum install -y httpd

systemctl enable httpd
systemctl start httpd

echo "<h1>Healthy ASG Instance: $(hostname)</h1>" > /var/www/html/index.html

# ensure firewall not blocking locally
chmod 644 /var/www/html/index.html
`).toString("base64"),
      },
    })
  );

  const ltId = lt.LaunchTemplate?.LaunchTemplateId!;
  console.log("Launch Template created:", ltId);

  /* ---------------- ALB ---------------- */
  console.log("Creating Load Balancer...");

  const lb = await elb.send(
    new CreateLoadBalancerCommand({
      Name: `${PREFIX}-lb`,
      Subnets: subnets,
      Type: "application",
    })
  );

  const lbArn = lb.LoadBalancers?.[0]?.LoadBalancerArn!;
  const lbDns = lb.LoadBalancers?.[0]?.DNSName!;

  console.log("ALB created:", lbDns);

  /* ---------------- Target Group (FIXED HEALTH CHECK) ---------------- */
  console.log("Creating Target Group...");

  const tg = await elb.send(
    new CreateTargetGroupCommand({
      Name: `${PREFIX}-tg`,
      Protocol: "HTTP",
      Port: 80,
      VpcId: vpcId,
      TargetType: "instance",

      HealthCheckPath: "/",
      HealthCheckProtocol: "HTTP",
      Matcher: {
        HttpCode: "200",
      },
    })
  );

  const tgArn = tg.TargetGroups?.[0]?.TargetGroupArn!;
  console.log("Target Group created");

  /* ---------------- Listener ---------------- */
  console.log("Creating Listener...");

  await elb.send(
    new CreateListenerCommand({
      LoadBalancerArn: lbArn,
      Port: 80,
      Protocol: "HTTP",
      DefaultActions: [
        {
          Type: "forward",
          TargetGroupArn: tgArn,
        },
      ],
    })
  );

  console.log("Listener created");

  /* ---------------- Auto Scaling Group ---------------- */
  console.log("Creating Auto Scaling Group...");

  await asg.send(
    new CreateAutoScalingGroupCommand({
      AutoScalingGroupName: `${PREFIX}-asg`,
      VPCZoneIdentifier: subnets.join(","),

      LaunchTemplate: {
        LaunchTemplateId: ltId,
        Version: "$Latest",
      },

      MinSize: 2,
      MaxSize: 4,
      DesiredCapacity: 2,

      TargetGroupARNs: [tgArn],
      HealthCheckType: "ELB",
      HealthCheckGracePeriod: 120,
    })
  );

  console.log("ASG created → waiting for instances...");
  console.log("===== SETUP COMPLETE =====");
  console.log("ALB URL:", lbDns);
}

launch().catch(console.error);