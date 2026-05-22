import {
  AutoScalingClient,
  DeleteAutoScalingGroupCommand,
  DescribeAutoScalingGroupsCommand,
  UpdateAutoScalingGroupCommand,
  DetachLoadBalancersCommand,
  DetachLoadBalancerTargetGroupsCommand,
} from "@aws-sdk/client-auto-scaling";

import {
  ElasticLoadBalancingV2Client,
  DeleteLoadBalancerCommand,
  DeleteTargetGroupCommand,
  DescribeLoadBalancersCommand,
  DescribeTargetGroupsCommand,
  DescribeListenersCommand,
  DeleteListenerCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";

import {
  EC2Client,
  DeleteLaunchTemplateCommand,
  DescribeLaunchTemplatesCommand,
  DescribeInstancesCommand,
  TerminateInstancesCommand,
} from "@aws-sdk/client-ec2";

const REGION = "us-east-1";
const PREFIX = "aws-learning-day15";

const asgClient = new AutoScalingClient({ region: REGION });
const elbClient = new ElasticLoadBalancingV2Client({ region: REGION });
const ec2Client = new EC2Client({ region: REGION });

/**
 * Delete listeners first (IMPORTANT FIX)
 */
async function deleteListeners(loadBalancerArn: string) {
  console.log("Deleting listeners...");

  const res = await elbClient.send(
    new DescribeListenersCommand({
      LoadBalancerArn: loadBalancerArn,
    })
  );

  for (const listener of res.Listeners || []) {
    if (listener.ListenerArn) {
      console.log("Deleting listener:", listener.ListenerArn);

      await elbClient.send(
        new DeleteListenerCommand({
          ListenerArn: listener.ListenerArn,
        })
      );
    }
  }

  console.log("Listeners deleted");
}

/**
 * 1. Delete ASG
 */
async function deleteASG() {
  console.log("Checking Auto Scaling Groups...");

  const asg = await asgClient.send(
    new DescribeAutoScalingGroupsCommand({})
  );

  const target = asg.AutoScalingGroups?.find((g: any) =>
    g.AutoScalingGroupName?.includes(PREFIX)
  );

  if (!target?.AutoScalingGroupName) {
    console.log("No ASG found");
    return;
  }

  console.log("Deleting ASG:", target.AutoScalingGroupName);

  await asgClient.send(
    new UpdateAutoScalingGroupCommand({
      AutoScalingGroupName: target.AutoScalingGroupName,
      MinSize: 0,
      MaxSize: 0,
      DesiredCapacity: 0,
    })
  );

  if (target.TargetGroupARNs?.length) {
    await asgClient.send(
      new DetachLoadBalancerTargetGroupsCommand({
        AutoScalingGroupName: target.AutoScalingGroupName,
        TargetGroupARNs: target.TargetGroupARNs,
      })
    );
  }

  if (target.LoadBalancerNames?.length) {
    await asgClient.send(
      new DetachLoadBalancersCommand({
        AutoScalingGroupName: target.AutoScalingGroupName,
        LoadBalancerNames: target.LoadBalancerNames,
      })
    );
  }

  await asgClient.send(
    new DeleteAutoScalingGroupCommand({
      AutoScalingGroupName: target.AutoScalingGroupName,
      ForceDelete: true,
    })
  );

  console.log("ASG deleted");
}

/**
 * 2. Delete ELB + Target Group (FIXED ORDER)
 */
async function deleteELB() {
  console.log("Finding Load Balancers...");

  const lbs = await elbClient.send(
    new DescribeLoadBalancersCommand({})
  );

  const lb = lbs.LoadBalancers?.find((l: any) =>
    l.LoadBalancerName?.includes(PREFIX)
  );

  if (!lb?.LoadBalancerArn) {
    console.log("No Load Balancer found");
    return;
  }

  console.log("Load Balancer found:", lb.LoadBalancerName);

  // ✅ STEP 1: delete listeners first
  await deleteListeners(lb.LoadBalancerArn);

  // STEP 2: delete load balancer
  await elbClient.send(
    new DeleteLoadBalancerCommand({
      LoadBalancerArn: lb.LoadBalancerArn,
    })
  );

  console.log("Load Balancer deleted");

  // STEP 3: delete target groups
  const tgs = await elbClient.send(
    new DescribeTargetGroupsCommand({})
  );

  const tg = tgs.TargetGroups?.find((t: any) =>
    t.TargetGroupName?.includes(PREFIX)
  );

  if (tg?.TargetGroupArn) {
    console.log("Deleting Target Group:", tg.TargetGroupName);

    await elbClient.send(
      new DeleteTargetGroupCommand({
        TargetGroupArn: tg.TargetGroupArn,
      })
    );
  }

  console.log("ELB cleanup done");
}

/**
 * 3. Terminate EC2
 */
async function terminateInstances() {
  console.log("Checking EC2 instances...");

  const instances = await ec2Client.send(
    new DescribeInstancesCommand({
      Filters: [
        {
          Name: "tag:Name",
          Values: [`*${PREFIX}*`],
        },
      ],
    })
  );

  const instanceIds: string[] = [];

  instances.Reservations?.forEach((r: any) => {
    r.Instances?.forEach((i: any) => {
      if (i.InstanceId) instanceIds.push(i.InstanceId);
    });
  });

  if (!instanceIds.length) {
    console.log("No EC2 instances found");
    return;
  }

  console.log("Terminating:", instanceIds);

  await ec2Client.send(
    new TerminateInstancesCommand({
      InstanceIds: instanceIds,
    })
  );

  console.log("Instances terminated");
}

/**
 * 4. Delete Launch Template
 */
async function deleteLaunchTemplate() {
  console.log("Finding Launch Templates...");

  const templates = await ec2Client.send(
    new DescribeLaunchTemplatesCommand({})
  );

  const lt = templates.LaunchTemplates?.find((t: any) =>
    t.LaunchTemplateName?.includes(PREFIX)
  );

  if (!lt?.LaunchTemplateId) {
    console.log("No Launch Template found");
    return;
  }

  console.log("Deleting Launch Template:", lt.LaunchTemplateName);

  await ec2Client.send(
    new DeleteLaunchTemplateCommand({
      LaunchTemplateId: lt.LaunchTemplateId,
    })
  );

  console.log("Launch Template deleted");
}

/**
 * MAIN
 */
async function cleanup() {
  try {
    console.log("===== DAY 15 CLEANUP START =====");

    await deleteASG();
    await deleteELB();
    await terminateInstances();
    await deleteLaunchTemplate();

    console.log("===== CLEANUP COMPLETE =====");
  } catch (err) {
    console.error("Cleanup failed:", err);
  }
}

cleanup();