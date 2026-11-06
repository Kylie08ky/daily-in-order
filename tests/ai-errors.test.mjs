import test from 'node:test';
import assert from 'node:assert/strict';
import {aiFailure,verificationDeadline} from '../lib/ai-errors.ts';
test('Firebase customErrorData maps to safe action messages, never raw provider text',()=>{
 const error=(status)=>({code:'fetch-error',message:'SECRET prompt and token',customErrorData:{status}});
 assert.match(aiFailure(error(429)),/额度/);assert.match(aiFailure(error(403)),/AI-403/);assert.match(aiFailure(error(404)),/AI-404/);
 assert.match(aiFailure(error(400)),/AI-400/);assert.match(aiFailure(error(503)),/AI-5XX/);assert.match(aiFailure({code:'error'}),/AI-NETWORK/);
 assert.match(aiFailure({...error(403),customErrorData:{errorDetails:[{reason:'SERVICE_DISABLED'}]}}),/配置/);
 assert.match(aiFailure({name:'AbortError'}),/超时/);
 for(const e of [null,error(500),error(403),{message:'SECRET'}])assert.doesNotMatch(aiFailure(e),/SECRET/);
});
test('verification timeout ends the waiting caller and cannot continue to AI when a late token arrives',async()=>{
 let resolve,called=false;
 const pending=new Promise(r=>resolve=r);
 await assert.rejects(verificationDeadline(pending,5).then(()=>{called=true;}),/verification-timeout/);
 resolve('late-token');await Promise.resolve();assert.equal(called,false);
 assert.equal(await verificationDeadline(Promise.resolve('valid'),50),'valid');
 await assert.rejects(verificationDeadline(Promise.reject(Error('denied')),50),/denied/);
});
