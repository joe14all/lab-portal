import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';

/**
 * PRODUCTION DOMAIN INFRASTRUCTURE
 * Defines the EventBridge Bus and Rules for decoupling logic.
 */
export class LabEventBusStack extends cdk.Stack {
  public readonly eventBus: events.EventBus;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Create Custom Event Bus
    this.eventBus = new events.EventBus(this, 'LabProductionBus', {
      eventBusName: 'LabProductionBus',
    });

    // 2. Rule: Batch Completed -> Trigger Invoice Generation
    // Matches events with source "production.batch" and detail-type "BatchCompleted"
    const batchCompletedRule = new events.Rule(this, 'BatchCompletedRule', {
      eventBus: this.eventBus,
      eventPattern: {
        source: ['production.batch'],
        detailType: ['BatchCompleted'],
        detail: {
          status: ['Completed']
        }
      },
    });

    // 3. (Optional) Define Lambda Target (Placeholder)
    // In a real deployment, this Lambda would reside in the Finance stack
    const invoiceGeneratorFn = new lambda.Function(this, 'InvoiceGeneratorFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log("Generating Invoice for:", JSON.stringify(event, null, 2));
          return { status: "Invoice Created" };
        };
      `),
    });

    batchCompletedRule.addTarget(new targets.LambdaFunction(invoiceGeneratorFn));

    // 4. Output the Bus ARN
    new cdk.CfnOutput(this, 'EventBusArn', {
      value: this.eventBus.eventBusArn,
      exportName: 'LabProductionBusArn',
    });
  }
}