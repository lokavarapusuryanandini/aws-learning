import {
  STSClient,
  GetCallerIdentityCommand
} from "@aws-sdk/client-sts";

const REGION = "ap-south-1";

const sts = new STSClient({
  region: REGION
});

async function wellArchitectedReview() {

  try {

    /*
      AWS Account Information
    */

    const identity =
      await sts.send(
        new GetCallerIdentityCommand({})
      );

    console.log(`
========================================
 AWS WELL-ARCHITECTED REVIEW
========================================
`);

    console.log(
      "AWS Account ID:",
      identity.Account
    );

    console.log(
      "AWS ARN:",
      identity.Arn
    );

    console.log(`
========================================
1. OPERATIONAL EXCELLENCE
========================================

Checklist:
✔ Monitor workloads
✔ Automate deployments
✔ Improve operational procedures

AWS Services:
- CloudWatch
- CloudFormation
- CodePipeline
`);

    console.log(`
========================================
2. SECURITY
========================================

Checklist:
✔ Use IAM least privilege
✔ Enable MFA
✔ Encrypt sensitive data

AWS Services:
- IAM
- KMS
- CloudTrail
`);

    console.log(`
========================================
3. RELIABILITY
========================================

Checklist:
✔ Multi-AZ deployments
✔ Backup strategies
✔ Automatic recovery

AWS Services:
- Route53
- Auto Scaling
- Backup
`);

    console.log(`
========================================
4. PERFORMANCE EFFICIENCY
========================================

Checklist:
✔ Use scalable services
✔ Monitor performance
✔ Optimize workloads

AWS Services:
- CloudFront
- ElastiCache
- EC2 Auto Scaling
`);

    console.log(`
========================================
5. COST OPTIMIZATION
========================================

Checklist:
✔ Delete unused resources
✔ Monitor billing
✔ Use right-sized resources

AWS Services:
- Cost Explorer
- Budgets
- Trusted Advisor
`);

    console.log(`
========================================
6. SUSTAINABILITY
========================================

Checklist:
✔ Optimize infrastructure
✔ Use serverless workloads
✔ Reduce idle resources

AWS Services:
- Lambda
- S3 Intelligent Tiering
- Auto Scaling
`);

    console.log(`
========================================
 REVIEW COMPLETE
========================================
`);

  } catch (error) {

    console.error(error);
  }
}

wellArchitectedReview();