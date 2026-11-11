// State format and Firestore's chunk envelope are independent protocols.
export const STATE_SCHEMA_VERSION = 12;
export const MIN_STATE_SCHEMA_VERSION = 1;
export const CLOUD_ENVELOPE_VERSION = 1;

export class SchemaCompatibilityError extends Error {
 readonly code = 'workspace/schema-incompatible';
 readonly received:unknown;
 readonly protocol:'state'|'envelope';
 constructor(received:unknown, protocol:'state'|'envelope'='state') {
  super('当前应用不支持这份记录的数据格式。请更新应用后重试；现有记录和待同步操作已保留，不要清空或降级。');
  this.name='SchemaCompatibilityError';
  this.received=received;this.protocol=protocol;
 }
}
export function assertStateVersion(value:unknown):void {
 const version=(value as {schemaVersion?:unknown}|null)?.schemaVersion;
 if(typeof version!=='number'||!Number.isInteger(version)||version<MIN_STATE_SCHEMA_VERSION||version>STATE_SCHEMA_VERSION)throw new SchemaCompatibilityError(version);
}
export function assertEnvelopeVersion(version:unknown):void {
 if(version!==CLOUD_ENVELOPE_VERSION)throw new SchemaCompatibilityError(version,'envelope');
}
