// The same drag recipe drives both the live outline and the native sketch.
export function dragRecipe(shape,a,b,mode){
 const dx=Math.abs(b[0]-a[0]),dy=Math.abs(b[1]-a[1]),centre=mode==='center',mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
 if(shape==='rectangle'||shape==='ellipse')return{x:centre?a[0]:mid[0],y:centre?a[1]:mid[1],width:dx*(centre?2:1),height:dy*(centre?2:1)};
 if(shape==='circle'){const edge=mode==='diameter';return{x:edge?mid[0]:a[0],y:edge?mid[1]:a[1],radius:Math.hypot(b[0]-a[0],b[1]-a[1])/(edge?2:1)};}
 return{x:a[0],y:a[1],radius:Math.hypot(b[0]-a[0],b[1]-a[1])};
}
export const startChoices=shape=>shape==='rectangle'||shape==='ellipse'?[['corner','Corner'],['center','Center']]:shape==='circle'?[['center','Center'],['diameter','Diameter']]:shape==='arc'?[['height','Height'],['threePoint','3-point'],['centerArc','Center']]:shape==='spline'?[['fit','Fit'],['control','Control']]:[];
export const defaultStart=shape=>shape==='rectangle'?'corner':shape==='arc'?'height':shape==='spline'?'fit':'center';
