
import { App } from '@aws-cdk/core';
import { AaronBrightonCaStack } from './aaronbrighton-ca';

const app = new App();

new AaronBrightonCaStack(app, 'deployed-scream-elon-com'); // Try to line up this identifier with the one in pipeline.ts

app.synth();