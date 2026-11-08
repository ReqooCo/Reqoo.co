// A read-only, fail-closed probe using the actual reds-draft environment credential.
// Never log secret values, response bodies, or account identifiers. No writes occur.
const WORKER_DRAFT='reqoo-reds-draft';
const WORKER_LIVE=['reqoo-web','reqoo-catalog-api'];
const denied=status=>status===403||status===404;
export async function verifyDraftCredential({accountId,token,request=fetch}){
 if(!accountId||!token)throw Error('Missing reds-draft deployment secret or account ID');
 const base='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(accountId);
 const get=async path=>{
  const res=await request(base+path,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
  return res.status;
 };
 const own=await get('/workers/scripts/'+WORKER_DRAFT+'/settings');
 if(own!==200)throw Error('Draft Worker read permission not verified (HTTP '+own+'); deployment blocked');
 for(const script of WORKER_LIVE){
  const status=await get('/workers/scripts/'+script+'/settings');
  if(!denied(status))throw Error('Draft credential can access Live Worker metadata or permission was not denied ('+script+', HTTP '+status+')');
 }
 const d1=await get('/d1/database');
 if(!denied(d1))throw Error('Draft credential can list D1 databases or denial was not verified (HTTP '+d1+')');
 return {draftWorkerReadable:true,liveWorkersDenied:WORKER_LIVE.length,d1Denied:true};
}
if(process.argv[1]&&new URL('file:'+process.argv[1]).href===import.meta.url){
 try{
  const r=await verifyDraftCredential({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,token:process.env.CLOUDFLARE_API_TOKEN});
  console.log('REDS DRAFT TOKEN SCOPE PASS: Draft Worker readable; '+r.liveWorkersDenied+' Live Workers and D1 denied (read-only checks)');
 }catch(e){console.error('REDS DRAFT TOKEN SCOPE BLOCKED:',e.message);process.exitCode=1;}
}
