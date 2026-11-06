// Read-only preflight. Never enable APIs, alter enforcement, or attach billing here.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {loadEnv} from 'vite';
const env={...loadEnv('production',process.cwd(),'VITE_'),...process.env};
if(env.VITE_AI_ENABLED!=='true'){console.log('AI disabled; no cloud preflight needed.');process.exit(0);}
const project=JSON.parse(readFileSync('.firebaserc','utf8')).projects?.default;
if(!project||project.startsWith('demo-'))throw Error('Set a real deployment project for the AI preflight.');
const require=createRequire(import.meta.url);
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {requireAuth}=require('firebase-tools/lib/requireAuth');
const {Client}=require('firebase-tools/lib/apiv2');
await requireAuth({...getGlobalDefaultAccount(),project});
const services=new Client({urlPrefix:'https://serviceusage.googleapis.com',apiVersion:'v1'});
const required=['firebaseappcheck.googleapis.com','recaptchaenterprise.googleapis.com','firebasevertexai.googleapis.com','generativelanguage.googleapis.com'];
const missing=[];
for(const service of required){const result=await services.get(`projects/${project}/services/${service}`);if(result.body.state!=='ENABLED')missing.push(service);}
if(missing.length)throw Error('AI prerequisite APIs are disabled: '+missing.join(', ')+'. Enable them in the Firebase/Google Cloud console before preview release.');
if(!env.VITE_APPCHECK_SITE_KEY)throw Error('Missing VITE_APPCHECK_SITE_KEY.');
const billing=await new Client({urlPrefix:'https://cloudbilling.googleapis.com',apiVersion:'v1'}).get(`projects/${project}/billingInfo`);
if(billing.body.billingEnabled)throw Error('This AI trial requires Spark without Cloud Billing. Stop and review costs before release.');
console.log('AI preflight passed: four prerequisite APIs enabled, site key configured, billing disabled. Browser attestation and generation still require a smoke test.');
