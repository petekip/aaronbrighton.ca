import { App, Construct, Stage, Stack, StackProps, StageProps } from '@aws-cdk/core';
import { CodePipeline, CodePipelineSource, ShellStep } from '@aws-cdk/pipelines';
import { AaronBrightonCaStack } from './aaronbrighton-ca';

class AaronBrightonCaPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection('aaronbrighton/aaronbrighton.ca', 'main', {
          connectionArn: 'arn:aws:codestar-connections:us-east-1:518127035527:connection/03591007-b58e-46a6-ad43-67f98a485812', // Created using the AWS console
        }),
        commands: [
          'yarn install',
          'yarn build',
          'npx cdk synth --app "npx ts-node --prefer-ts-exts src/pipeline.ts"', // We only want to deploy the app in this pipeline file.  The main.ts is for direct dev deployments.
        ],
      }),
    });

    pipeline.addStage(new AaronBrighton(this, 'deployed')); // Will result in a deployment of deployed-aaronbrighton-ca
  }
}

class AaronBrighton extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    new AaronBrightonCaStack(this, 'aaronbrighton-ca'); // Will be prepended with "deployed" (see pipeline.addStage)
  }
}

const app = new App();
new AaronBrightonCaPipelineStack(app, 'pipeline-aaronbrighton-ca');