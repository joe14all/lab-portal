# AWS AppSync Resolver Mapping Templates
# Cases Domain - DynamoDB Integration

This document provides VTL (Velocity Template Language) resolver templates for the Cases GraphQL schema.

## Table of Contents
1. [Query Resolvers](#query-resolvers)
2. [Mutation Resolvers](#mutation-resolvers)
3. [Field Resolvers](#field-resolvers)
4. [Business Rule Validation](#business-rule-validation)

---

## Query Resolvers

### getCase
**Request Mapping Template:**
```vtl
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": {
    "PK": $util.dynamodb.toDynamoDBJson("LAB#$ctx.identity.claims.labId"),
    "SK": $util.dynamodb.toDynamoDBJson("CASE#$ctx.args.id")
  }
}
```

**Response Mapping Template:**
```vtl
#if($ctx.error)
  $util.error($ctx.error.message, $ctx.error.type)
#end
$util.toJson($ctx.result)
```

---

### listCases
**Request Mapping Template:**
```vtl
{
  "version": "2018-05-29",
  "operation": "Query",
  "query": {
    "expression": "PK = :pk AND begins_with(SK, :sk)",
    "expressionValues": {
      ":pk": $util.dynamodb.toDynamoDBJson("LAB#$ctx.args.filter.labId"),
      ":sk": $util.dynamodb.toDynamoDBJson("CASE#")
    }
  },
  #if($ctx.args.filter.status)
  "filter": {
    "expression": "#status = :status",
    "expressionNames": {
      "#status": "status"
    },
    "expressionValues": {
      ":status": $util.dynamodb.toDynamoDBJson("$ctx.args.filter.status")
    }
  },
  #end
  "limit": #if($ctx.args.limit) $ctx.args.limit #else 20 #end,
  #if($ctx.args.nextToken)
  "nextToken": "$ctx.args.nextToken"
  #end
}
```

**Response Mapping Template:**
```vtl
{
  "items": $util.toJson($ctx.result.items),
  "nextToken": #if($ctx.result.nextToken) "$ctx.result.nextToken" #else null #end,
  "total": $ctx.result.scannedCount
}
```

---

### getCasesByStatus (GSI Query)
**Request Mapping Template:**
```vtl
{
  "version": "2018-05-29",
  "operation": "Query",
  "index": "GSI1-LabStatus",
  "query": {
    "expression": "GSI1PK = :gsi1pk",
    "expressionValues": {
      ":gsi1pk": $util.dynamodb.toDynamoDBJson("LAB#$ctx.args.labId#STATUS#$ctx.args.status")
    }
  },
  "scanIndexForward": false,
  "limit": #if($ctx.args.limit) $ctx.args.limit #else 50 #end
}
```

---

## Mutation Resolvers

### createCase
**Request Mapping Template:**
```vtl
#set($caseId = $util.autoId())
#set($caseNumber = "2025-" + $util.time.nowEpochMilliSeconds())
#set($now = $util.time.nowISO8601())

## Prepare units with generated IDs
#set($units = [])
#foreach($unit in $ctx.args.input.units)
  #set($unitId = "unit-" + $util.autoId())
  $util.qr($units.add({
    "id": $unitId,
    "caseId": $caseId,
    "tooth": $unit.tooth,
    "type": $unit.type,
    "material": $unit.material,
    "productId": $unit.productId,
    "shade": $unit.shade,
    "stumpShade": $unit.stumpShade,
    "instructions": $unit.instructions,
    "status": "STAGE_NEW",
    "createdAt": $now,
    "updatedAt": $now
  }))
#end

{
  "version": "2018-05-29",
  "operation": "PutItem",
  "key": {
    "PK": $util.dynamodb.toDynamoDBJson("LAB#$ctx.args.input.labId"),
    "SK": $util.dynamodb.toDynamoDBJson("CASE#$caseId")
  },
  "attributeValues": {
    "id": $util.dynamodb.toDynamoDBJson($caseId),
    "labId": $util.dynamodb.toDynamoDBJson($ctx.args.input.labId),
    "caseNumber": $util.dynamodb.toDynamoDBJson($caseNumber),
    "clinicId": $util.dynamodb.toDynamoDBJson($ctx.args.input.clinicId),
    "doctorId": $util.dynamodb.toDynamoDBJson($ctx.args.input.doctorId),
    "patient": $util.dynamodb.toDynamoDBJson($ctx.args.input.patient),
    "status": $util.dynamodb.toDynamoDBJson("STAGE_NEW"),
    "units": $util.dynamodb.toDynamoDBJson($units),
    "dueDate": $util.dynamodb.toDynamoDBJson($ctx.args.input.dueDate),
    "tags": $util.dynamodb.toDynamoDBJson($ctx.args.input.tags),
    "panNumbers": $util.dynamodb.toDynamoDBJson($ctx.args.input.panNumbers),
    "financial": $util.dynamodb.toDynamoDBJson({
      "priceListId": $ctx.args.input.priceListId,
      "estimatedTotal": 0,
      "currency": "USD"
    }),
    "version": $util.dynamodb.toDynamoDBJson(0),
    "createdAt": $util.dynamodb.toDynamoDBJson($now),
    "updatedAt": $util.dynamodb.toDynamoDBJson($now),
    "GSI1PK": $util.dynamodb.toDynamoDBJson("LAB#$ctx.args.input.labId#STATUS#STAGE_NEW"),
    "GSI1SK": $util.dynamodb.toDynamoDBJson("CREATED#$now")
  },
  "condition": {
    "expression": "attribute_not_exists(PK)"
  }
}
```

---

### updateCaseStatus (Point 1: Optimistic Locking + Point 3: Business Rule)
**Request Mapping Template:**
```vtl
## Point 3: Prevent shipment if any unit is on hold
#set($isShipping = $ctx.args.input.newStage == "STAGE_SHIPPING" || $ctx.args.input.newStage == "STAGE_SHIPPED")

## First, get current case to validate
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": {
    "PK": $util.dynamodb.toDynamoDBJson("LAB#$ctx.identity.claims.labId"),
    "SK": $util.dynamodb.toDynamoDBJson("CASE#$ctx.args.input.caseId")
  }
}
```

**Pipeline Resolver - Function 1 (Validate):**
```vtl
## Validate business rules
#set($currentCase = $ctx.prev.result)

## Point 1: Check version for optimistic locking
#if($currentCase.version != $ctx.args.input.version)
  $util.error("Concurrency conflict: Expected version $ctx.args.input.version, found $currentCase.version", "ConcurrencyError")
#end

## Point 3: Prevent shipment if any unit on hold
#if($isShipping)
  #set($heldUnits = [])
  #foreach($unit in $currentCase.units)
    #if($unit.status == "STAGE_HOLD")
      $util.qr($heldUnits.add($unit))
    #end
  #end
  
  #if($heldUnits.size() > 0)
    #set($teeth = [])
    #foreach($held in $heldUnits)
      #if($held.tooth)
        $util.qr($teeth.add("#$held.tooth"))
      #else
        $util.qr($teeth.add($held.id))
      #end
    #end
    $util.error("Cannot ship case: $heldUnits.size() unit(s) on hold ($util.str.join(', ', $teeth)). Resolve hold issues before shipping.", "BusinessRuleViolation")
  #end
#end

## Pass validation - continue to update
$util.toJson($currentCase)
```

**Pipeline Resolver - Function 2 (Update):**
```vtl
#set($now = $util.time.nowISO8601())
#set($newVersion = $ctx.prev.result.version + 1)

## Update units status
#set($updatedUnits = [])
#foreach($unit in $ctx.prev.result.units)
  #if($ctx.args.input.unitId)
    ## Update specific unit
    #if($unit.id == $ctx.args.input.unitId)
      $util.qr($updatedUnits.add($util.map.copyAndRetainAllKeys($unit, ["id", "caseId", "tooth", "type", "material", "productId", "shade", "stumpShade", "instructions", "createdAt"])))
      $util.qr($updatedUnits[$foreach.index].put("status", $ctx.args.input.newStage))
      $util.qr($updatedUnits[$foreach.index].put("updatedAt", $now))
      #if($ctx.args.input.newStage == "STAGE_HOLD" && $ctx.args.input.holdReason)
        $util.qr($updatedUnits[$foreach.index].put("holdReason", $ctx.args.input.holdReason))
      #end
    #else
      $util.qr($updatedUnits.add($unit))
    #end
  #else
    ## Bulk update all units
    $util.qr($updatedUnits.add($util.map.copyAndRetainAllKeys($unit, ["id", "caseId", "tooth", "type", "material", "productId", "shade", "stumpShade", "instructions", "createdAt"])))
    $util.qr($updatedUnits[$foreach.index].put("status", $ctx.args.input.newStage))
    $util.qr($updatedUnits[$foreach.index].put("updatedAt", $now))
  #end
#end

{
  "version": "2018-05-29",
  "operation": "UpdateItem",
  "key": {
    "PK": $util.dynamodb.toDynamoDBJson("LAB#$ctx.identity.claims.labId"),
    "SK": $util.dynamodb.toDynamoDBJson("CASE#$ctx.args.input.caseId")
  },
  "update": {
    "expression": "SET #units = :units, #status = :status, #version = :version, #updatedAt = :updatedAt, GSI1PK = :gsi1pk #if($ctx.args.input.holdReason), #holdReason = :holdReason #end",
    "expressionNames": {
      "#units": "units",
      "#status": "status",
      "#version": "version",
      "#updatedAt": "updatedAt"
      #if($ctx.args.input.holdReason)
      , "#holdReason": "holdReason"
      #end
    },
    "expressionValues": {
      ":units": $util.dynamodb.toDynamoDBJson($updatedUnits),
      ":status": $util.dynamodb.toDynamoDBJson($ctx.args.input.newStage),
      ":version": $util.dynamodb.toDynamoDBJson($newVersion),
      ":updatedAt": $util.dynamodb.toDynamoDBJson($now),
      ":gsi1pk": $util.dynamodb.toDynamoDBJson("LAB#$ctx.identity.claims.labId#STATUS#$ctx.args.input.newStage"),
      ":expectedVersion": $util.dynamodb.toDynamoDBJson($ctx.args.input.version)
      #if($ctx.args.input.holdReason)
      , ":holdReason": $util.dynamodb.toDynamoDBJson($ctx.args.input.holdReason)
      #end
    }
  },
  "condition": {
    "expression": "#version = :expectedVersion",
    "expressionNames": {
      "#version": "version"
    }
  }
}
```

**Response Mapping Template:**
```vtl
{
  "case": $util.toJson($ctx.result),
  "warnings": []
}
```

---

## Field Resolvers

### Case.clinic (Batch Resolver)
**Request Mapping Template:**
```vtl
{
  "version": "2018-05-29",
  "operation": "BatchGetItem",
  "tables": {
    "LabPortal-Main": {
      "keys": [
        #foreach($case in $ctx.source.items)
        {
          "PK": $util.dynamodb.toDynamoDBJson("LAB#$case.labId"),
          "SK": $util.dynamodb.toDynamoDBJson("CLINIC#$case.clinicId")
        }#if($foreach.hasNext),#end
        #end
      ],
      "consistentRead": false
    }
  }
}
```

---

### Case.product (Point 2: Product Catalog Linkage)
**Request Mapping Template:**
```vtl
#if($ctx.source.productId)
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": {
    "PK": $util.dynamodb.toDynamoDBJson("LAB#$ctx.source.labId"),
    "SK": $util.dynamodb.toDynamoDBJson("PRODUCT#$ctx.source.productId")
  }
}
#else
  #return(null)
#end
```

---

### CaseFile.presignedUrl (Lambda Resolver)
**Lambda Function:**
```javascript
exports.handler = async (event) => {
  const AWS = require('aws-sdk');
  const s3 = new AWS.S3();
  
  const { s3Key, s3Bucket } = event.source;
  
  const presignedUrl = s3.getSignedUrl('getObject', {
    Bucket: s3Bucket,
    Key: s3Key,
    Expires: 900 // 15 minutes
  });
  
  return presignedUrl;
};
```

---

## DynamoDB Table Structure

### Single-Table Design Pattern

**Primary Key:**
- `PK`: `LAB#{labId}`
- `SK`: `CASE#{caseId}` | `CLINIC#{clinicId}` | `PRODUCT#{productId}`

**GSI1 - Status Index:**
- `GSI1PK`: `LAB#{labId}#STATUS#{status}`
- `GSI1SK`: `CREATED#{timestamp}`

**GSI2 - Clinic Index:**
- `GSI2PK`: `CLINIC#{clinicId}`
- `GSI2SK`: `CASE#{caseId}`

---

## CDK Infrastructure Example

```typescript
import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class CasesAppSyncStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'LabPortalTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI for status queries
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1-LabStatus',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // AppSync API
    const api = new appsync.GraphqlApi(this, 'CasesApi', {
      name: 'lab-portal-cases-api',
      schema: appsync.SchemaFile.fromAsset('schema/cases.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: cognito.UserPool.fromUserPoolArn(
              this,
              'UserPool',
              'arn:aws:cognito:us-east-1:123456789:userpool/us-east-1_ABC123'
            ),
          },
        },
      },
      xrayEnabled: true,
    });

    // DynamoDB Data Source
    const dataSource = api.addDynamoDbDataSource('CasesDataSource', table);

    // Resolvers
    dataSource.createResolver('getCase', {
      typeName: 'Query',
      fieldName: 'getCase',
      requestMappingTemplate: appsync.MappingTemplate.fromFile('resolvers/getCase.req.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.fromFile('resolvers/getCase.res.vtl'),
    });

    dataSource.createResolver('updateCaseStatus', {
      typeName: 'Mutation',
      fieldName: 'updateCaseStatus',
      requestMappingTemplate: appsync.MappingTemplate.fromFile('resolvers/updateCaseStatus.req.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.fromFile('resolvers/updateCaseStatus.res.vtl'),
    });
  }
}
```

---

## Testing GraphQL Operations

### Query Example
```graphql
query GetCase {
  getCase(id: "case-5001") {
    id
    caseNumber
    status
    patient {
      name
      age
    }
    units {
      id
      tooth
      type
      productId
      product {
        name
        category
      }
      status
    }
    version
  }
}
```

### Mutation Example (Point 3: Will fail if units on hold)
```graphql
mutation ShipCase {
  updateCaseStatus(input: {
    caseId: "case-5002"
    version: 0
    newStage: STAGE_SHIPPING
  }) {
    case {
      id
      status
      units {
        id
        status
      }
    }
    warnings
  }
}

# Expected Error:
# "Cannot ship case: 1 unit(s) on hold (#8). Resolve hold issues before shipping."
```

### Subscription Example
```graphql
subscription OnCaseUpdated {
  onCaseUpdated(labId: "lab-001", caseId: "case-5001") {
    id
    status
    units {
      id
      status
    }
    updatedAt
  }
}
```

---

## Security Considerations

1. **Row-Level Security:** Use `$ctx.identity.claims.labId` to enforce lab isolation
2. **Field-Level Security:** Use `@aws_auth` directive for sensitive fields
3. **Rate Limiting:** Configure per-resolver rate limits in AppSync
4. **Encryption:** Enable encryption at rest for DynamoDB and S3
5. **Audit Logging:** Enable AWS CloudTrail for all API calls
