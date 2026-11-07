import * as R from 'replicad';
// Exact clamped/periodic cubic B-spline whose poles are the editable controls.
export function controlSplineDrawing(points,closed=false){
 const oc=R.getOC(),owned=[],keep=o=>(owned.push(o),o),count=points.length,degree=Math.min(3,count-1),periodic=closed;
 if(closed&&count<3)throw Error('A closed spline needs at least three control points');
 try{const poles=keep(new oc.NCollection_Array1_gp_Pnt2d(1,count));points.forEach((p,i)=>poles.SetValue(i+1,keep(new oc.gp_Pnt2d(...p))));const n=periodic?count+1:count-degree+1,knots=keep(new oc.NCollection_Array1_double(1,n)),mults=keep(new oc.NCollection_Array1_int(1,n));for(let i=1;i<=n;i++){knots.SetValue(i,i-1);mults.SetValue(i,!periodic&&(i===1||i===n)?degree+1:1);}const curve=new R.Curve2D(new oc.Geom2d_BSplineCurve(poles,knots,mults,degree,periodic));return new R.Drawing(new R.Blueprint([curve]));}finally{owned.reverse().forEach(o=>o.delete());}
}
