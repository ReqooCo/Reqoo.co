// Read-only credential separation audit. No Cloudflare mutations, no secret logging.
const denied = status => [401,403,404].includes(status);
export async function auditLiveCredentials({accountId,workerToken,d1Token,request=fetch}) {
  if (!accountId || !workerToken || !d1Token) throw Error('Missing environment credentials');
  const base='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(accountId);
  async function status(token,path) {
    const response=await request(base+path,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
    return response.status;
  }
  const web=await status(workerToken,'/workers/scripts/reqoo-web/settings');
  if(web!==200) throw Error('Live Worker token cannot read reqoo-web (HTTP '+web+')');
  const draft=await status(workerToken,'/workers/scripts/reqoo-reds-draft/settings');
  if(!denied(draft)) throw Error('Live Worker token is not isolated from Draft (HTTP '+draft+')');
  const workerD1=await status(workerToken,'/d1/database');
  if(!denied(workerD1)) throw Error('Live Worker token can access D1 listing (HTTP '+workerD1+')');
  const d1=await status(d1Token,'/d1/database');
  if(d1!==200) throw Error('D1 credential cannot read D1 listing (HTTP '+d1+')');
  const d1Worker=await status(d1Token,'/workers/scripts/reqoo-web/settings');
  if(!denied(d1Worker)) throw Error('D1 credential can access Live Worker metadata (HTTP '+d1Worker+')');
  return {liveWorkerReadable:true,draftDenied:true,workerD1Denied:true,d1Readable:true,d1WorkerDenied:true};
}
if(process.argv[1] && new URL('file:'+process.argv[1]).href===import.meta.url) {
 try {
  await auditLiveCredentials({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,workerToken:process.env.CLOUDFLARE_API_TOKEN,d1Token:process.env.CLOUDFLARE_D1_API_TOKEN});
  console.log('REDS LIVE READ-ONLY CREDENTIAL SCOPE PASS');
 } catch(e) {console.error('REDS LIVE SCOPE BLOCKED: '+e.message);process.exitCode=1;}
}
