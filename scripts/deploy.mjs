import {spawnSync} from 'node:child_process';
import {project} from './project-config.mjs';
// Normal deploys are review-only. Never change the live Hosting channel here.
for(const [cmd,args] of [['npm',['run','build']],['node',['node_modules/firebase-tools/lib/bin/firebase.js','deploy','--project',project,'--only','firestore:rules,firestore:indexes']],['node',['node_modules/firebase-tools/lib/bin/firebase.js','hosting:channel:deploy','workbench-review','--project',project,'--expires','30d']]]){
 const r=spawnSync(cmd,args,{stdio:'inherit',shell:process.platform==='win32'&&cmd==='npm'});if(r.status!==0)process.exit(r.status||1);
}
