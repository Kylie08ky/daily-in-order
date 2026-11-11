import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {emptyState,validateState} from '../lib/model.ts';
import {decodeState,encodeState} from '../lib/snapshot-codec.ts';
import {STATE_SCHEMA_VERSION,CLOUD_ENVELOPE_VERSION,SchemaCompatibilityError} from '../lib/schema-version.ts';
import {createDeviceStore,projected,receive,accept} from '../lib/offline.ts';
import {applyOperation} from '../lib/operation.ts';

const op=()=>({operationId:crypto.randomUUID(),instant:'2026-11-11T12:00:00.000Z',command:{type:'note.save',payload:{date:'2026-11-11',text:'Synthetic pending change'}}});
test('state formats 1–12 share the cloud codec; chunk envelope 1 is independent',()=>{
 assert.equal(STATE_SCHEMA_VERSION,12);assert.equal(CLOUD_ENVELOPE_VERSION,1);
 for(let version=1;version<=12;version++){
  const state=emptyState();state.schemaVersion=version;state.notes['2026-11-09']='Keep original date';
  const decoded=decodeState([JSON.stringify(state)]);
  assert.equal(decoded.schemaVersion,12);assert.deepEqual(decoded.notes,state.notes);
  assert.deepEqual(decodeState(encodeState(decoded)),decoded);assert.equal(state.schemaVersion,version);
 }
});
test('unsupported cloud or local formats cannot overwrite local state or pending operations',async()=>{
 const device=createDeviceStore('demo-schema-'+crypto.randomUUID(),'synthetic');
 const base={ownerId:'synthetic',revision:4,updatedAt:'2026-11-11T12:00:00.000Z',state:emptyState()};
 const saved=await device.writeDevice(accept(receive(undefined,base),op()),undefined);
 const future={...base,state:{...base.state,schemaVersion:13,futureOnly:{important:'retain'}}};
 assert.throws(()=>receive(saved,future),SchemaCompatibilityError);
 assert.throws(()=>decodeState([JSON.stringify(future.state)]),SchemaCompatibilityError);
 assert.throws(()=>encodeState(future.state),SchemaCompatibilityError);
 assert.throws(()=>validateState(future.state),SchemaCompatibilityError);
 assert.deepEqual(await device.readDevice(),saved);
 const futureDevice=await device.writeDevice({...saved,base:future},saved.generation);
 assert.throws(()=>projected(futureDevice),SchemaCompatibilityError);
 assert.throws(()=>applyOperation(future.state,op()),SchemaCompatibilityError);
 assert.throws(()=>receive(futureDevice,base),SchemaCompatibilityError);
 assert.deepEqual(await device.readDevice(),futureDevice);
 assert.equal(futureDevice.base.state.futureOnly.important,'retain');
});
