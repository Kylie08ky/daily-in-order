import {assertStateVersion} from './schema-version.ts';
import {applyCommand} from './commands.ts';
import {type State,type Command} from './model.ts';
export type Operation={operationId:string;command:Command;instant:string};
// A stable namespace keeps IDs referenced by later offline operations identical on the server.
export function applyOperation(state:State,op:Operation){assertStateVersion(state);let n=0;return applyCommand(state,op.command,new Date(op.instant),()=>op.operationId+':'+(++n));}
