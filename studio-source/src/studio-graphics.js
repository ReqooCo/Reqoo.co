import * as THREE from 'three';
export function createStudioRenderer(){
 try{return new THREE.WebGLRenderer({antialias:!matchMedia('(pointer:coarse)').matches,powerPreference:'default'});}
 catch(error){
  const app=document.getElementById('app');document.body.classList.add('cadGraphicsError');
  app.innerHTML='<section role="alert"><h1>Paparan 3D belum tersedia</h1><p>Browser ini tidak dapat mengaktifkan grafik WebGL. Cuba buka pautan ini terus dalam Safari atau Chrome, kemudian muat semula.</p><p>Jika masih gagal, tutup tab 3D lain dan cuba semula.</p><button id="retryGraphics" type="button">Cuba semula</button></section>';
  document.getElementById('retryGraphics').onclick=()=>location.reload();
  throw error;
 }
}
