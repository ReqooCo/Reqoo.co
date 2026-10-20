// Read only: inspect secret NAMES on the existing Worker; never print values or API responses.
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token)throw Error('Cloudflare deployment credentials missing');
const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/workers/scripts/reqoo-catalog-api/secrets`,{headers:{Authorization:`Bearer ${token}`}});
const data=await response.json();
if(!response.ok||!data.success)throw Error(`Unable to verify Worker secret names (HTTP ${response.status})`);
const names=new Set(data.result.map(x=>x.name));
const required=[['BILLPLZ_API_KEY','BILLPLZ_SECRET_KEY','BILLPLZ_KEY'],['BILLPLZ_COLLECTION_ID'],['BILLPLZ_X_SIGNATURE_KEY','BILLPLZ_X_SIGNATURE']];
for(const aliases of required)if(!aliases.some(name=>names.has(name)))throw Error(`Missing Worker secret: ${aliases[0]}`);
console.log('PASS: Billplz API, collection and signature secret names exist on reqoo-catalog-api. Values were not retrieved.');
