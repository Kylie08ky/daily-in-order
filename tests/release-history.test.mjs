import test from 'node:test';import assert from 'node:assert/strict';
import {knownReleases,releaseBatch,pendingChanges} from '../lib/release-history.ts';
import {previewUpdates} from '../lib/update-history.ts';
import {english} from '../lib/english.ts';import {german} from '../lib/german.ts';
const manifest={version:'0.22.0',changes:previewUpdates};
test('multiple preview changes become one release dated at publication, not development',()=>{
 const result=releaseBatch(knownReleases,manifest,'hosting-demo','2026-11-14T23:30:00Z');
 assert.equal(result.length,knownReleases.length+1);assert.equal(result[0].date,'2026-11-15');assert.equal(result[0].version,'0.22.0');
 assert.equal(result[0].changeIds.length,7);assert.deepEqual(result.slice(1),knownReleases);assert.equal(pendingChanges(previewUpdates,result).length,0);
 assert.equal(releaseBatch(result,manifest,'hosting-demo','2026-11-16T00:00:00Z'),result);
});
test('later release includes only unpublished changes; preview history stays intact',()=>{
 const original=JSON.stringify(previewUpdates),first=releaseBatch(knownReleases,manifest,'v22','2026-11-13T12:00:00Z');
 const next={version:'0.23.0',changes:[{id:'v0.23.0',version:'0.23.0',title:'Synthetic update',items:['One change']},...previewUpdates]};
 const result=releaseBatch(first,next,'v23','2026-11-20T12:00:00Z');assert.deepEqual(result[0].items,['One change']);assert.equal(JSON.stringify(previewUpdates),original);
 assert.throws(()=>releaseBatch(first,manifest,'another-v22','2026-11-13T12:00:00Z'),/increase/);
});
test('release copy has English and German translations',()=>{for(const e of [...previewUpdates,...knownReleases])for(const text of [e.title,...e.items]){assert.ok(english[text],text);assert.ok(german[text],text);}});
