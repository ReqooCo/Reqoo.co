// Test-only deterministic GitHub REST responses. Not loaded by release workflows.
const scenario=process.env.REDS_TEST_SCENARIO;
if(!scenario)throw Error('REDS_TEST_SCENARIO is required for mock GitHub network');
const source='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const cadCommit='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const nonCAD='cccccccccccccccccccccccccccccccccccccccc';
const passed=['verify (core)','verify (modeling)','verify (product)'].map((name,i)=>({name,status:'completed',conclusion:'success',completed_at:'2026-11-06T10:00:00Z',app:{slug:scenario==='wrong-app'?'other-app':'github-actions'},details_url:'https://github.com/ReqooCo/Reqoo.co/actions/runs/100/job/'+(200+i)}));
const preview={name:'verify-live',status:'completed',conclusion:scenario==='failed-draft'?'failure':'success',completed_at:'2026-11-06T10:01:00Z',app:{slug:'github-actions'},details_url:'https://github.com/ReqooCo/Reqoo.co/actions/runs/101/job/300'};
globalThis.fetch=async raw=>{
 const uri=new URL(raw),p=uri.pathname;let body;
 if(p==='/repos/ReqooCo/Reqoo.co')body={owner:{login:'ReqooCo',id:scenario==='wrong-policy-owner'?999:315183885}};
 else if(p.endsWith('/actions/runs/900/approvals')){
  if(scenario==='approval-api-denied')return new Response('{}',{status:403});
  body=scenario==='no-owner-approval'?[]:[{state:scenario==='rejected-owner'?'rejected':'approved',environments:[{name:scenario==='wrong-environment'?'reds-draft':'reds-live'}],user:{login:scenario==='wrong-owner-login'?'other':'ReqooCo',id:scenario==='wrong-owner-id'?999:315183885,type:scenario==='bot-owner'?'Bot':'User'}}];
 }
 else if(p.endsWith('/actions/runs/900'))body={id:900,name:'Deploy Reqoo Final',path:scenario==='wrong-live-workflow'?'.github/workflows/fake.yml':'.github/workflows/deploy.yml',event:scenario==='wrong-live-event'?'workflow_dispatch':'push',head_branch:'main',head_sha:scenario==='wrong-live-run-sha'?source:'dddddddddddddddddddddddddddddddddddddddd',repository:{full_name:scenario==='wrong-live-repo'?'other/repo':'ReqooCo/Reqoo.co'}};
 else if(p.endsWith('/pulls/279/files'))body=scenario==='noncad-pr'?[{filename:'shop/index.html'}]:scenario==='renamed-cad-pr'?[{filename:'docs/moved.md',previous_filename:'cad-source/src/main.js'}]:scenario==='policy-pr'?[{filename:'scripts/reds-release-surface-audit.mjs'}]:[{filename:'cad-source/src/main.js'}];
 else if(p.includes('/compare/')){
  if(scenario.startsWith('pagination-')||scenario==='paginated'){
   const page=Number(uri.searchParams.get('page')||1);
   const first=Array.from({length:100},(_,i)=>({sha:String(i+1).padStart(40,'0')}));
   body={status:'ahead',total_commits:scenario==='pagination-drift'&&page===2?102:101,
    commits:page===1?first:scenario==='pagination-truncated'?[]:
     scenario==='pagination-duplicate'?[first.at(-1)]:[{sha:cadCommit}]};
  }else{
   const commits=scenario==='identical'?[]:scenario==='delayed'?[
    {sha:cadCommit},{sha:nonCAD}
   ]:[{sha:cadCommit}];
   body={status:commits.length?'ahead':'identical',total_commits:commits.length,commits};
  }
 }else if(p.endsWith('/commits/'+cadCommit))body={files:[{filename:'cad-source/src/main.js'}]};
 else if((scenario.startsWith('pagination-')||scenario==='paginated')&&
    /^\/repos\/ReqooCo\/Reqoo.co\/commits\/[0-9]{40}$/.test(p))body={files:[{filename:'docs/audit-history.md'}]};
 else if(p.endsWith('/commits/'+nonCAD))body={files:[{filename:'docs/README.md'}]};
 else if(p.endsWith('/commits/'+cadCommit+'/pulls'))
  body=scenario==='unreviewed'||scenario==='delayed'?[]:[{
   number:277,user:{login:'author'},merged_at:'2026-11-06T10:05:00Z',
   base:{ref:'main'},head:{ref:'reds/draft',repo:{full_name:'ReqooCo/Reqoo.co'},sha:source}
  }];
 else if(p.endsWith('/pulls/277/reviews')) {
  const approval={id:1,state:'APPROVED',author_association:scenario==='outside-review'?'NONE':'COLLABORATOR',commit_id:source,user:{login:scenario==='self-review'?'author':'reviewer',type:scenario==='bot-review'?'Bot':'User'}};
  body=scenario==='no-review'?[]:scenario==='stale-review'?[{...approval,commit_id:nonCAD}]:
   scenario==='dismissed-review'?[approval,{...approval,id:2,state:'DISMISSED'}]:
   scenario==='changes-requested'?[approval,{...approval,id:2,state:'CHANGES_REQUESTED'}]:[approval];
 }
 else if(p.endsWith('/commits/'+source+'/check-runs'))
  body={check_runs:[...(scenario==='failed-check'?passed.map((c,i)=>i===2?{...c,conclusion:'failure'}:c):passed),...(scenario==='missing-draft'?[]:[preview])]};
 else if(p.endsWith('/actions/runs/100'))body={name:scenario==='wrong-workflow'?'Unrelated fake CI':'CAD PR validation',event:'pull_request',head_sha:source,head_branch:'reds/draft',status:'completed',conclusion:'success'};
 else if(p.endsWith('/actions/runs/101'))body={name:scenario==='wrong-preview'?'Not REDS Draft':'REDS single Draft preview verification',event:'push',head_sha:source,head_branch:'reds/draft',status:'completed',conclusion:'success'};
 else throw Error('Unexpected mock GitHub API endpoint: '+p);
 return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
};
