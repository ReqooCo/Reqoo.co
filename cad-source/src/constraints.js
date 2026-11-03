// Geometric constraints for shared-vertex 2D polylines. No mesh approximation.
export function solveSketch(points,constraints=[],{tolerance=1e-6}={}){
 if(!Array.isArray(points)||points.length<2||points.length>100||points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||Math.abs(v)>2000)))throw Error('Use 2–100 finite sketch points');
 if(!Array.isArray(constraints)||constraints.length>160)throw Error('Too many sketch constraints');
 if(!constraints.length)return{points:points.map(p=>[...p]),dof:points.length*2,state:'under',error:0};
 if(points.length>40)throw Error('Constrained polylines support up to 40 points');
 const count=points.length,n=count*2,index=i=>{if(!Number.isInteger(i)||i<0||i>=count)throw Error('Constraint refers to a missing point');return i*2;};
 const rows=[];
 const target=v=>{if(!Number.isFinite(v)||Math.abs(v)>4000)throw Error('Invalid constraint dimension');return v;};
 for(const c of constraints){
  if(!c||typeof c!=='object')throw Error('Invalid sketch constraint');
  const a=index(c.a),b=c.b===undefined?null:index(c.b),d=(x,k)=>x[k];
  if(c.type==='fixed'){const px=target(c.x),py=target(c.y);rows.push(x=>d(x,a)-px,x=>d(x,a+1)-py);continue;}
  if(b===null||a===b)throw Error('Constraint needs two distinct points');
  if(c.type==='horizontal')rows.push(x=>x[b+1]-x[a+1]);
  else if(c.type==='vertical')rows.push(x=>x[b]-x[a]);
  else if(c.type==='coincident')rows.push(x=>x[b]-x[a],x=>x[b+1]-x[a+1]);
  else if(c.type==='length'){const v=target(c.value);if(v<=0)throw Error('Length must be positive');rows.push(x=>Math.hypot(x[b]-x[a],x[b+1]-x[a+1])-v);}
  else if(c.type==='angle'){const angle=target(c.value)*Math.PI/180;rows.push(x=>Math.atan2(Math.sin(Math.atan2(x[b+1]-x[a+1],x[b]-x[a])-angle),Math.cos(Math.atan2(x[b+1]-x[a+1],x[b]-x[a])-angle))*Math.max(1,Math.hypot(x[b]-x[a],x[b+1]-x[a+1])));}
  else if(c.type==='midpoint'){const k=index(c.c);rows.push(x=>x[a]-(x[b]+x[k])/2,x=>x[a+1]-(x[b+1]+x[k+1])/2);}
  else if(['parallel','perpendicular','equal'].includes(c.type)){const k=index(c.c),l=index(c.d);if(k===l)throw Error('Reference segment needs distinct points');if(c.type==='equal')rows.push(x=>Math.hypot(x[b]-x[a],x[b+1]-x[a+1])-Math.hypot(x[l]-x[k],x[l+1]-x[k+1]));else rows.push(x=>{const ax=x[b]-x[a],ay=x[b+1]-x[a+1],bx=x[l]-x[k],by=x[l+1]-x[k+1];return(c.type==='parallel'?ax*by-ay*bx:ax*bx+ay*by)/Math.max(1,Math.hypot(bx,by));});}
  else throw Error('Unsupported sketch constraint');
 }
 const residual=x=>rows.map(fn=>fn(x));
 function jacobian(x){const j=rows.map(()=>Array(n).fill(0));for(let k=0;k<n;k++){const h=1e-5,old=x[k];x[k]=old+h;const a=residual(x);x[k]=old-h;const b=residual(x);x[k]=old;for(let i=0;i<rows.length;i++)j[i][k]=(a[i]-b[i])/(2*h);}return j;}
 function linear(a,b){a=a.map((r,i)=>[...r,b[i]]);for(let k=0;k<n;k++){let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;[a[k],a[pivot]]=[a[pivot],a[k]];if(Math.abs(a[k][k])<1e-16)return null;for(let i=k+1;i<n;i++){const t=a[i][k]/a[k][k];for(let j=k;j<=n;j++)a[i][j]-=t*a[k][j];}}const x=Array(n).fill(0);for(let i=n-1;i>=0;i--){let v=a[i][n];for(let j=i+1;j<n;j++)v-=a[i][j]*x[j];x[i]=v/a[i][i];}return x;}
 const x=points.flat();let damping=1e-7;
 // Seed a feasible direction when a length starts perpendicular to its axis constraint.
 // The numerical length gradient alone cannot escape that symmetric configuration.
 for(const c of constraints.filter(c=>c.type==='length')){
  const a=c.a*2,b=c.b*2,rule=constraints.find(r=>['horizontal','vertical'].includes(r.type)&&((r.a===c.a&&r.b===c.b)||(r.a===c.b&&r.b===c.a))),axis=rule?.type==='vertical'?1:0;
  if((rule&&Math.abs(x[b+axis]-x[a+axis])<1e-8)||Math.hypot(x[b]-x[a],x[b+1]-x[a+1])<1e-8){
   const af=constraints.some(r=>r.type==='fixed'&&r.a===c.a),bf=constraints.some(r=>r.type==='fixed'&&r.a===c.b);
   if(!bf)x[b+axis]=x[a+axis]+c.value;else if(!af)x[a+axis]=x[b+axis]-c.value;
  }
 }
 for(let iter=0;iter<100;iter++){
  const r=residual(x),err=Math.max(...r.map(Math.abs));if(err<tolerance)break;
  const j=jacobian(x),a=Array.from({length:n},()=>Array(n).fill(0)),b=Array(n).fill(0);
  for(let i=0;i<j.length;i++)for(let k=0;k<n;k++){b[k]-=j[i][k]*r[i];for(let l=0;l<n;l++)a[k][l]+=j[i][k]*j[i][l];}
  for(let k=0;k<n;k++)a[k][k]+=damping;
  const delta=linear(a,b);if(!delta)break;
  const trial=x.map((v,k)=>v+delta[k]),cost=v=>residual(v).reduce((s,r)=>s+r*r,0);
  if(cost(trial)<cost(x)){for(let k=0;k<n;k++)x[k]=trial[k];damping=Math.max(1e-12,damping*.3);}else damping=Math.min(1e12,damping*10);
 }
 const err=Math.max(...residual(x).map(Math.abs));
 if(!Number.isFinite(err)||err>tolerance*10||x.some(v=>!Number.isFinite(v)||Math.abs(v)>2000))throw Error('Conflicting constraints. Remove a lock or dimension before applying.');
 const mat=jacobian(x);let rank=0;
 for(let col=0;col<n&&rank<mat.length;col++){let pivot=rank;for(let i=rank+1;i<mat.length;i++)if(Math.abs(mat[i][col])>Math.abs(mat[pivot][col]))pivot=i;if(Math.abs(mat[pivot][col])<1e-7)continue;[mat[rank],mat[pivot]]=[mat[pivot],mat[rank]];const v=mat[rank][col];for(let j=col;j<n;j++)mat[rank][j]/=v;for(let i=rank+1;i<mat.length;i++){const t=mat[i][col];for(let j=col;j<n;j++)mat[i][j]-=t*mat[rank][j];}rank++;}
 return{points:Array.from({length:count},(_,i)=>[x[2*i],x[2*i+1]]),dof:n-rank,state:n===rank?'fully':'under',error:err};
}
