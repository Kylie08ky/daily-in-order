import {readFileSync} from 'node:fs';
import {loadEnv} from 'vite';
let settings;
try{settings=JSON.parse(readFileSync('.firebaserc','utf8'));}catch{throw Error('Copy .firebaserc.example to .firebaserc and set your Firebase project ID.');}
export const project=settings.projects?.default;
if(!project||project==='your-firebase-project-id'||project.startsWith('demo-')||!/^[a-z0-9-]+$/.test(project))throw Error('Set a real Firebase project ID before deploying.');
const env=loadEnv('production',process.cwd(),'VITE_');
if((process.env.VITE_FIREBASE_PROJECT_ID||env.VITE_FIREBASE_PROJECT_ID)!==project)throw Error('VITE_FIREBASE_PROJECT_ID must match .firebaserc before deploying.');
