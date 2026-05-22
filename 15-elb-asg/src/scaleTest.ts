import http from "http";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";

const REGION = "us-east-1";
const PREFIX = "aws-learning-day15";

const elbClient = new ElasticLoadBalancingV2Client({
  region: REGION,
});

/* ---------------- GET ALB DNS ---------------- */
async function getLoadBalancerDNS(): Promise<string> {
  const res = await elbClient.send(
    new DescribeLoadBalancersCommand({})
  );

  const lb = res.LoadBalancers?.find((l) =>
    l.LoadBalancerName?.includes(PREFIX)
  );

  if (!lb?.DNSName) {
    throw new Error("Load Balancer not found");
  }

  console.log("Found ALB:", lb.DNSName);
  return lb.DNSName;
}

/* ---------------- HTTP REQUEST ---------------- */
function makeRequest(url: string, i: number): Promise<void> {
  return new Promise((resolve) => {
    const req = http.get(
      url,
      { timeout: 5000 }, // ⬅️ IMPORTANT FIX
      (res) => {
        res.on("data", () => {});

        res.on("end", () => {
          console.log(
            `Request ${i} → Status: ${res.statusCode}`
          );
          resolve();
        });
      }
    );

    req.on("error", (err) => {
      console.log(
        `Request ${i} → Error: ${err.message}`
      );
      resolve();
    });

    req.on("timeout", () => {
      console.log(`Request ${i} → Timeout`);
      req.destroy();
      resolve();
    });
  });
}

/* ---------------- LOAD TEST ---------------- */
async function runLoadTest() {
  const dnsName = await getLoadBalancerDNS();

  const url = `http://${dnsName}`;

  console.log("\nStarting load test...\n");

  const totalRequests = 30;
  const batchSize = 5; // safe for ALB warmup

  for (let i = 1; i <= totalRequests; i += batchSize) {
    const batch: Promise<void>[] = [];

    for (
      let j = i;
      j < i + batchSize && j <= totalRequests;
      j++
    ) {
      batch.push(makeRequest(url, j));
    }

    await Promise.all(batch);

    // ⬅️ small delay prevents ALB spike failure
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\nLoad test completed");
}

runLoadTest().catch(console.error);