import {initializeApp} from 'firebase/app';
import {getAuth,connectAuthEmulator} from 'firebase/auth';
import {initializeFirestore,memoryLocalCache,connectFirestoreEmulator} from 'firebase/firestore';
import {dataSpaceForHost,deviceNamespace} from './data-space';
// Public web app identifiers; authorization is enforced by Firestore rules, never by this key.
const emulated=import.meta.env.DEV&&import.meta.env.VITE_FIREBASE_EMULATORS!=='false';
const config={
 apiKey:import.meta.env.VITE_FIREBASE_API_KEY||'demo-key',
 authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN||'demo-friends-isolation.firebaseapp.com',
 projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID||'demo-friends-isolation',
 storageBucket:import.meta.env.VITE_FIREBASE_STORAGE_BUCKET||'',
 messagingSenderId:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID||'',
 appId:import.meta.env.VITE_FIREBASE_APP_ID||'demo-app'
};
if(!emulated&&(!import.meta.env.VITE_FIREBASE_API_KEY||!import.meta.env.VITE_FIREBASE_PROJECT_ID||!import.meta.env.VITE_FIREBASE_APP_ID))throw new Error('Configure your Firebase web app in .env.local before connecting to the cloud. See README.md.');
export const firebaseProject=emulated?'demo-friends-isolation':config.projectId;
export const dataSpace=dataSpaceForHost(location.hostname,config.projectId,(import.meta.env.VITE_LIVE_HOSTS||'').split(',').map((h:string)=>h.trim()).filter(Boolean));
export const deviceProject=deviceNamespace(firebaseProject,dataSpace);
export const firebaseApp=initializeApp(emulated?{...config,projectId:firebaseProject,apiKey:'demo-key'}:config);
export const auth=getAuth(firebaseApp);
// Firestore has no persistent shared cache. Our durable queue is partitioned by UID instead.
export const db=initializeFirestore(firebaseApp,{localCache:memoryLocalCache()});
if(emulated){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8085);}
