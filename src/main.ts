
import { App } from '@aws-cdk/core';
import { AaronBrightonCaStack } from './aaronbrighton-ca';

const app = new App();

new AaronBrightonCaStack(app, 'deployed-aaronbrighton-ca'); // Try to line up this identifier with the one in pipeline.ts

app.synth();