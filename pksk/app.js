/*
  REQOO PKSK LANDING V2
  - Keeps purchase flow on /pksk/payment/
  - Preserves ?ref= referral attribution
  - Does not touch simulator sets
*/
const CONFIG = {
  ORDER_URL: "/pksk/payment/",
  SIMULATOR_URL: "/pksk/simulator/"
};

function withReferral(url){
  const ref=new URLSearchParams(location.search).get("ref");
  return ref ? url+"?ref="+encodeURIComponent(ref.toUpperCase()) : url;
}

document.getElementById("buyBtn").href=withReferral(CONFIG.ORDER_URL);
document.getElementById("buyBtn2").href=withReferral(CONFIG.ORDER_URL);
