import {validateProject} from './engine.js';
// All file entry points use the same schema and defaults, including older v1 files.
export function parseProject(text){
 let doc;try{doc=JSON.parse(text.replace(/^\uFEFF/,'').trim());}catch{throw Error('This file is not valid project JSON. Open the original .rqcad or .json download.');}
 validateProject(doc);doc.title??='Untitled';doc.ui={hidden:[],colors:{},...doc.ui};return doc;
}
export function serializeProject(doc){validateProject(doc);return JSON.stringify(doc,null,2);}
