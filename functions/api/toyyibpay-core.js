const PROD_API='https://toyyibpay.com/index.php/api';
const SANDBOX_API='https://dev.toyyibpay.com/index.php/api';
const S=v=>String(v??'').trim();

export function toyyibApiBase(env){return S(env.TOYYIBPAY_ENV).toLowerCase()==='sandbox'?SANDBOX_API:PROD_API}
export function toyyibPayHost(env){return toyyibApiBase(env)===SANDBOX_API?'https://dev.toyyibpay.com':'https://toyyibpay.com'}
function safe(value,max){return S(value).replace(/[^a-zA-Z0-9 _-]/g,' ').replace(/\s+/g,' ').slice(0,max)}
function phone(value){let p=S(value).replace(/\D/g,'');if(p.startsWith('00'))p=p.slice(2);if(p.startsWith('0'))p='60'+p.slice(1);if(p&&!p.startsWith('60'))p='60'+p;return p}
async function postForm(url,params){const response=await fetch(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:params.toString()}),text=await response.text();let parsed=null;try{parsed=JSON.parse(text)}catch{}return{response,text,parsed}}
function detail(result,fallback){if(result.parsed&&!Array.isArray(result.parsed))return S(result.parsed.msg||result.parsed.message||result.parsed.error)||fallback;return S(result.text).slice(0,300)||fallback}

async function categoryFromDb(env){
 if(!env.DB)return'';
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS payment_provider_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL)').run();
 return S((await env.DB.prepare("SELECT value FROM payment_provider_settings WHERE key='toyyibpay_category_code' LIMIT 1").first())?.value);
}
async function saveCategory(env,code){if(env.DB)await env.DB.prepare("INSERT OR REPLACE INTO payment_provider_settings(key,value,updated_at) VALUES('toyyibpay_category_code',?,?)").bind(code,new Date().toISOString()).run()}
export async function ensureToyyibCategory(env){
 const secret=S(env.TOYYIBPAY_USER_SECRET_KEY);if(!secret)throw Error('ToyyibPay belum dikonfigurasi. Sila tetapkan TOYYIBPAY_USER_SECRET_KEY.');
 const configured=S(env.TOYYIBPAY_CATEGORY_CODE);if(configured)return configured;
 const stored=await categoryFromDb(env);if(stored)return stored;
 const result=await postForm(`${toyyibApiBase(env)}/createCategory`,new URLSearchParams({userSecretKey:secret,catname:'REQOO Payments',catdescription:'REQOO Shop dan PKSK online banking'}));
 const code=Array.isArray(result.parsed)?S(result.parsed[0]?.CategoryCode):'';
 if(!code)throw Error(`ToyyibPay gagal menyediakan category: ${detail(result,'respons provider tidak sah')}`);
 await saveCategory(env,code);return code;
}

export async function createToyyibBill(data,env){
 const secret=S(env.TOYYIBPAY_USER_SECRET_KEY),categoryCode=await ensureToyyibCategory(env),amountMinor=Math.round(Number(data.amountMinor||0)),orderRef=S(data.orderRef),name=S(data.name),email=S(data.email)||'payment@reqoo.co',mobile=phone(data.phone);
 if(!Number.isSafeInteger(amountMinor)||amountMinor<100)throw Error('Jumlah bayaran ToyyibPay tidak sah.');
 if(!orderRef||!name||mobile.length<10)throw Error('Nama, WhatsApp dan rujukan order diperlukan.');
 const returnUrl=S(data.returnUrl),callbackUrl=S(data.callbackUrl);try{new URL(returnUrl);new URL(callbackUrl)}catch{throw Error('URL callback ToyyibPay tidak sah.')}
 const params=new URLSearchParams({userSecretKey:secret,categoryCode,billName:safe(data.billName||`REQOO ${orderRef}`,30),billDescription:safe(data.description||`REQOO Order ${orderRef}`,100),billPriceSetting:'1',billPayorInfo:'1',billAmount:String(amountMinor),billReturnUrl:returnUrl,billCallbackUrl:callbackUrl,billExternalReferenceNo:orderRef,billTo:name.slice(0,255),billEmail:email.slice(0,255),billPhone:mobile,billSplitPayment:'0',billSplitPaymentArgs:'',billPaymentChannel:'0',billContentEmail:safe(data.emailContent||'Terima kasih atas pembayaran anda kepada REQOO.',200),billChargeToCustomer:S(env.TOYYIBPAY_CHARGE_TO_CUSTOMER)||'0',enableFPXB2B:'1',chargeFPXB2B:'0',enableDuitNowQR:'0',chargeDuitNowQR:'0'});
 const result=await postForm(`${toyyibApiBase(env)}/createBill`,params),billCode=Array.isArray(result.parsed)?S(result.parsed[0]?.BillCode):'';
 if(!billCode)throw Error(`ToyyibPay gagal mencipta bayaran: ${detail(result,'respons provider tidak sah')}`);
 return{provider:'toyyibpay',billCode,billUrl:`${toyyibPayHost(env)}/${billCode}`,amountMinor,categoryCode};
}

// Pure JavaScript MD5 is used because Workers Web Crypto does not expose MD5.
export function md5Hex(input){
 const bytes=new TextEncoder().encode(String(input)),len=bytes.length,withOne=len+1,padded=((withOne+8+63)>>6)<<6,data=new Uint8Array(padded);data.set(bytes);data[len]=0x80;const bits=len*8;for(let i=0;i<8;i++)data[padded-8+i]=Math.floor(bits/2**(8*i))&255;
 let a0=0x67452301,b0=0xefcdab89,c0=0x98badcfe,d0=0x10325476;const shifts=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21],k=Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*2**32)>>>0),words=new Uint32Array(16);
 for(let offset=0;offset<padded;offset+=64){for(let i=0;i<16;i++)words[i]=data[offset+i*4]|data[offset+i*4+1]<<8|data[offset+i*4+2]<<16|data[offset+i*4+3]<<24;let a=a0,b=b0,c=c0,d=d0;for(let i=0;i<64;i++){let f,g;if(i<16){f=(b&c)|(~b&d);g=i}else if(i<32){f=(d&b)|(~d&c);g=(5*i+1)%16}else if(i<48){f=b^c^d;g=(3*i+5)%16}else{f=c^(b|~d);g=(7*i)%16}const sum=(a+f+k[i]+words[g])>>>0;a=d;d=c;c=b;b=(b+((sum<<shifts[i])|(sum>>>(32-shifts[i]))))>>>0}a0=(a0+a)>>>0;b0=(b0+b)>>>0;c0=(c0+c)>>>0;d0=(d0+d)>>>0}
 return[a0,b0,c0,d0].map(n=>[n&255,n>>>8&255,n>>>16&255,n>>>24&255].map(x=>x.toString(16).padStart(2,'0')).join('')).join('');
}
function equal(a,b){a=S(a).toLowerCase();b=S(b).toLowerCase();if(!a||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
export function verifyToyyibCallback(data,env){
 const secret=S(env.TOYYIBPAY_USER_SECRET_KEY),status=S(data.status||data.status_id),orderId=S(data.order_id),refno=S(data.refno),received=S(data.hash).toLowerCase();
 const expected=secret&&received?md5Hex(`${secret}${status}${orderId}${refno}ok`):'';
 return{valid:equal(expected,received),paid:status==='1',status,orderId,refno,billCode:S(data.billcode),amount:Number(data.amount||0),transactionId:S(data.transaction_id||data.fpx_transaction_id)};
}
export function callbackAmountMatches(value,amountMinor){const n=Number(value);return!Number.isFinite(n)||n<=0||Math.round(n)===Number(amountMinor)||Math.round(n*100)===Number(amountMinor)}
