export type DataSpace='live'|'preview';
// Runtime routing is intentional: promoting the exact reviewed bundle to live
// changes the data destination without building again or copying any records.
export function dataSpaceForHost(hostname:string,projectId:string,liveHosts:string[]=[]):DataSpace {
 if(['localhost','127.0.0.1','[::1]'].includes(hostname))return 'preview';
 if(!/^[a-z0-9-]+$/.test(projectId))throw Error('Invalid Firebase project ID');
 if([`${projectId}.web.app`,`${projectId}.firebaseapp.com`,...liveHosts].includes(hostname))return 'live';
 if(new RegExp(`^${projectId}--[a-z0-9-]+\\.web\\.app$`).test(hostname))return 'preview';
 throw new Error('此网址尚未配置数据空间，已停止连接，避免写入错误环境。');
}
export function workspaceRoot(space:DataSpace){if(space==='live')return 'users';if(space==='preview')return 'previewUsers';throw Error('Unknown data space');}
export function feedbackRoot(space:DataSpace){if(space==='live')return 'feedback';if(space==='preview')return 'previewFeedback';throw Error('Unknown data space');}
export function deviceNamespace(project:string,space:DataSpace){workspaceRoot(space);return space==='live'?project:project+':preview-v1';}
