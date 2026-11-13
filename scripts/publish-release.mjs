import {spawnSync} from 'node:child_process';
import {getGlobalDefaultAccount,getAccessToken} from '../node_modules/firebase-tools/lib/auth.js';
import {historySchema,knownReleases,releaseBatch,pendingChanges} from '../lib/release-history.ts';
import {z} from 'zod';
const manifestSchema=z.object({version:z.string().regex(/^\d+\.\d+\.\d+$/),sha256:z.string().length(64),changes:z.array(z.object({id:z.string(),version:z.string(),title:z.string(),items:z.array(z.string())}))});
export async function publishRelease(project){
 const checkOnly=process.argv.includes('--check');
 if(!checkOnly&&!process.argv.includes('--confirm-reviewed-preview'))throw Error('Live publication requires explicit approval of the current preview.');
 const account=getGlobalDefaultAccount();if(!account)throw Error('Firebase CLI login required');
 const token=await getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'};
 async function get(url,optional=false){const r=await fetch(url,{headers});if(optional&&r.status===404)return null;if(!r.ok)throw Error('Release preflight failed: HTTP '+r.status);return r.json();}
 const host=`https://firebasehosting.googleapis.com/v1beta1/projects/${project}/sites/${project}/channels/`;
 const root=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)`;
 const name=`projects/${project}/databases/(default)/documents/releaseHistory/live`;
 const stored=await get(root+'/documents/releaseHistory/live',true),history=stored?historySchema.parse(JSON.parse(stored.fields.payload.stringValue)):knownReleases;
 const preview=await get(host+'workbench-review'),version=preview.release?.version?.name;
 if(!version||!preview.url)throw Error('Preview release is unavailable.');
 async function publicJson(path){const response=await fetch(preview.url+path,{cache:'no-store'});if(!response.ok)throw Error('Reviewed metadata unavailable');return response.json();}
 const manifest=manifestSchema.parse(await publicJson('/release-notes.json')),build=await publicJson('/version.json');
 if(manifest.version!==build.appVersion||manifest.sha256!==build.sha256)throw Error('Reviewed metadata does not match application build.');
 if((await get(host+'workbench-review')).release?.version?.name!==version)throw Error('Preview changed during preflight. Review the latest preview first.');
 const pending=pendingChanges(manifest.changes,history);
 console.log(JSON.stringify({version:manifest.version,pendingUpdates:pending.length,previousRelease:history[0]?.version,mode:checkOnly?'read-only':'approved promotion'}));
 if(checkOnly)return;
 // Validate batching before touching Hosting. Pin the reviewed version, never rebuild.
 releaseBatch(history,manifest,version,new Date().toISOString());
 let live=await get(host+'live');
 if(live.release?.version?.name!==version){
  const result=spawnSync('node',['node_modules/firebase-tools/lib/bin/firebase.js','hosting:clone',`${project}@${version.split('/').at(-1)}`,`${project}:live`,'--project',project],{stdio:'inherit'});
  if(result.status!==0)throw Error('Hosting promotion failed; release history was not changed.');
  live=await get(host+'live');
 }
 if(live.release?.version?.name!==version||!live.release.releaseTime)throw Error('Live version could not be verified; release history was not changed.');
 const next=releaseBatch(history,manifest,version,live.release.releaseTime);
 if(next===history){console.log('This Hosting version is already recorded.');return;}
 const payload=JSON.stringify(next);
 const response=await fetch(root+'/documents:commit',{method:'POST',headers,body:JSON.stringify({writes:[{update:{name,fields:{payload:{stringValue:payload}}},currentDocument:stored?{updateTime:stored.updateTime}:{exists:false}}]})});
 if(!response.ok)throw Error('Hosting is live, but release-history publication failed (HTTP '+response.status+'). Re-run the approved release command to repair metadata; do not rebuild.');
 const verified=await get(root+'/documents/releaseHistory/live');if(verified.fields.payload.stringValue!==payload)throw Error('Release-history verification failed.');
 console.log('Reviewed version promoted; one publication batch recorded. No user workspace was read or copied.');
}
