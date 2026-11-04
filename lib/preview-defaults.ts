import type {State} from './model.ts';
import type {DataSpace} from './data-space.ts';
// Apply only once in the preview data space; later explicit choices remain intact.
export function initializePreviewModules(state:State,space:DataSpace):State{
 if(space==='preview'&&!state.settings.previewModulesInitialized){
  state.settings.visibleModules=['german','reading','habits','fitness','finance'];
  state.settings.nutritionEnabled=true;
  state.settings.previewModulesInitialized=true;
 }
 return state;
}
