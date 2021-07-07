import * as path from 'path';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import { App, Construct, Stack, StackProps, Duration, Stage, StageProps, SecretValue } from '@aws-cdk/core';
import * as pipelines from '@aws-cdk/pipelines';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';

export class AaronBrightonDotCaStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const domains = [
      'new.aaronbrighton.ca',
      'www.new.aaronbrighton.ca',
    ];

    const publicZone = route53.HostedZone.fromHostedZoneAttributes(this, 'route53-zone', {
      hostedZoneId: 'ZRZJWLXW3FS0K',
      zoneName: 'aaronbrighton.ca',
    });

    const customCertificate = new acm.Certificate(this, 'custom-certificate', {
      domainName: domains[0],
      subjectAlternativeNames: domains.slice(1),
      validation: acm.CertificateValidation.fromDns(publicZone),
    });

    const cloudfrontToS3Resource = new CloudFrontToS3(this, 'cloudfront-s3', {
      insertHttpSecurityHeaders: false,
      cloudFrontDistributionProps: {
        certificate: customCertificate,
        domainNames: domains,
      },
    });

    let counter: number = 0;
    domains.forEach((domain) => {
      counter += 1;

      new route53.ARecord(this, `route53-a-record${counter}`, {
        zone: publicZone,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudfrontToS3Resource.cloudFrontWebDistribution)),
        recordName: domain,
      });

      new route53.AaaaRecord(this, `route53-aaaa-record${counter}`, {
        zone: publicZone,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudfrontToS3Resource.cloudFrontWebDistribution)),
        recordName: domain,
      });
    });

    if (cloudfrontToS3Resource.s3Bucket) {
      new s3deploy.BucketDeployment(this, 'website-deploy', {
        sources: [s3deploy.Source.asset(path.join(__dirname, 'hugo/public'))],
        destinationBucket: cloudfrontToS3Resource.s3Bucket,
        cacheControl: [
          s3deploy.CacheControl.setPublic(),
          s3deploy.CacheControl.mustRevalidate(),
          s3deploy.CacheControl.maxAge(Duration.hours(1)),
        ],
        distribution: cloudfrontToS3Resource.cloudFrontWebDistribution,
      });
    }
  }
}

class DeployStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    new AaronBrightonDotCaStack(this, 'aaronbrighton-ca');
  }
}

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub',
      output: sourceArtifact,
      oauthToken: SecretValue.secretsManager('github-token'),
      owner: 'aaronbrighton',
      repo: 'aaronbrighton.ca',
      branch: 'main',
    });

    const synthAction = pipelines.SimpleSynthAction.standardYarnSynth({
      sourceArtifact,
      cloudAssemblyArtifact,
      buildCommand: 'yarn build && yarn test',
    });

    const pipeline = new pipelines.CdkPipeline(this, 'aaronbrighton-ca-pipeline', {
      cloudAssemblyArtifact,
      sourceAction,
      synthAction,
    });

    pipeline.addApplicationStage(new DeployStage(this, 'prod'));
  }
}


const app = new App();
new PipelineStack(app, 'aaronbrighton-ca-pipeline');


app.synth();