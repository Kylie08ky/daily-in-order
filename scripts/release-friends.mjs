import {spawnSync} from 'node:child_process';
import {project} from './project-config.mjs';
if(!process.argv.includes('--confirm-reviewed-preview'))throw Error('Live publication requires explicit user approval of the current preview. Review it first, then pass --confirm-reviewed-preview.');
// Promote the reviewed Hosting version as-is. Do not rebuild from potentially changed sources.
const r=spawnSync('node',['node_modules/firebase-tools/lib/bin/firebase.js','hosting:clone',`${project}:workbench-review`,`${project}:live`,'--project',project],{stdio:'inherit'});process.exit(r.status||0);
