// Test-only deterministic GitHub REST responses. Not loaded by release workflows.
const scenario=process.env.REDS_TEST_SCENARIO;
if(!scenario)throw Error('REDS_TEST_SCENARIO is required for mock GitHub network');
const source='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const cadCommit='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const nonCAD='cccccccccccccccccccccccccccccccccccccccc';
const passed=['verify (core)','verify (modeling)','verify (product)'].map((name,i)=>({name,status:'completed',conclusion:'success',completed_at:'2026-11-06T10:00:00Z',app:{slug:scenario==='wrong-app'?'other-app':'github-actions'},details_url:'https://github.com/ReqooCo/Reqoo.co/actions/runs/100/job/'+(200+i)}));
globalThis.fetch=async raw=>{
 const uri=new URL(raw),p=uri.pathname;let body;
 if(p.includes('/compare/')){
  const commits=scenario==='identical'?[]:scenario==='delayed'?[
   {sha:cadCommit},{sha:nonCAD}
  ]:[{sha:cadCommit}];
  body={status:commits.length?'ahead':'identical',total_commits:commits.length,commits};
 }else if(p.endsWith('/commits/'+cadCommit))body={files:[{filename:'cad-source/src/main.js'}]};
 else if(p.endsWith('/commits/'+nonCAD))body={files:[{filename:'docs/README.md'}]};
 else if(p.endsWith('/commits/'+cadCommit+'/pulls'))
  body=scenario==='unreviewed'||scenario==='delayed'?[]:[{
   number:277,merged_at:'2026-11-06T10:05:00Z',
   base:{ref:'main'},head:{ref:'reds/draft',repo:{full_name:'ReqooCo/Reqoo.co'},sha:source}
  }];
 else if(p.endsWith('/commits/'+source+'/check-runs'))
  body={check_runs:scenario==='failed-check'?passed.map((c,i)=>i===2?{...c,conclusion:'failure'}:c):passed};
 else if(p.endsWith('/actions/runs/100'))body={name:scenario==='wrong-workflow'?'Unrelated fake CI':'CAD PR validation',event:'pull_request',head_sha:source,head_branch:'reds/draft',status:'completed',conclusion:'success'};
 else throw Error('Unexpected mock GitHub API endpoint: '+p);
 return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
};
