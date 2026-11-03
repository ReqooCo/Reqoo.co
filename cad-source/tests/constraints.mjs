import assert from 'node:assert/strict';
import {solveSketch} from '../src/constraints.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,a+' != '+b);
const points=[[0,0],[29,1],[31,19],[-1,21]];
const constraints=[{type:'fixed',a:0,x:0,y:0},{type:'horizontal',a:0,b:1},{type:'length',a:0,b:1,value:30},{type:'vertical',a:1,b:2},{type:'length',a:1,b:2,value:20},{type:'horizontal',a:2,b:3},{type:'vertical',a:3,b:0}];
const solved=solveSketch(points,constraints);assert.equal(solved.dof,0);assert.equal(solved.state,'fully');solved.points.forEach((p,i)=>p.forEach((v,j)=>near(v,[[0,0],[30,0],[30,20],[0,20]][i][j])));
const edited=solveSketch(solved.points,constraints.map(c=>c.type==='length'&&c.a===0?{...c,value:40}:c));near(edited.points[1][0],40);near(edited.points[2][0],40);near(edited.points[2][1],20);
assert.equal(solveSketch([[0,0],[10,0]],[{type:'horizontal',a:0,b:1}]).dof,3);
assert.equal(solveSketch([[0,0],[10,0]],[{type:'horizontal',a:0,b:1},{type:'horizontal',a:0,b:1}]).dof,3);
const copy=JSON.stringify(points);assert.throws(()=>solveSketch(points,[...constraints,{type:'length',a:0,b:1,value:35}]),/Conflicting/);assert.equal(JSON.stringify(points),copy);
assert.throws(()=>solveSketch([[0,0],[10,0]],[{type:'length',a:0,b:9,value:10}]),/missing point/);
assert.throws(()=>solveSketch([[0,0],[10,0]],[{type:'length',a:0,b:1,value:-10}]),/positive/);
const joined=solveSketch([[0,0],[10,2]],[{type:'coincident',a:0,b:1}]);near(joined.points[0][0],joined.points[1][0]);near(joined.points[0][1],joined.points[1][1]);
console.log('PASS sketch constraints: dimensions, edit propagation, rank, duplicate constraints, conflicts, validation, coincidence');

const symmetric=solveSketch([[0,0],[0,20]],[{type:'fixed',a:0,x:0,y:0},{type:'horizontal',a:0,b:1},{type:'length',a:0,b:1,value:30}]);near(symmetric.points[1][0],30);near(symmetric.points[1][1],0);assert.equal(symmetric.dof,0);
const collapsed=solveSketch([[0,0],[0,0]],[{type:'length',a:0,b:1,value:20}]);near(Math.hypot(collapsed.points[1][0]-collapsed.points[0][0],collapsed.points[1][1]-collapsed.points[0][1]),20);
console.log('PASS axis-aligned and collapsed initial geometry');

const parallel=solveSketch([[0,0],[10,0],[0,5],[8,6]],[{type:'fixed',a:0,x:0,y:0},{type:'fixed',a:1,x:10,y:0},{type:'parallel',a:2,b:3,c:0,d:1},{type:'equal',a:2,b:3,c:0,d:1}]);assert.ok(Math.abs(parallel.points[2][1]-parallel.points[3][1])<1e-5);assert.ok(Math.abs(Math.hypot(...parallel.points[3].map((v,i)=>v-parallel.points[2][i]))-10)<1e-5);
const perpendicular=solveSketch([[0,0],[10,0],[5,4]],[{type:'fixed',a:0,x:0,y:0},{type:'fixed',a:1,x:10,y:0},{type:'perpendicular',a:1,b:2,c:0,d:1}]);assert.ok(Math.abs(perpendicular.points[2][0]-10)<1e-5);
const mid=solveSketch([[0,0],[10,0],[4,2]],[{type:'fixed',a:0,x:0,y:0},{type:'fixed',a:1,x:10,y:0},{type:'midpoint',a:2,b:0,c:1}]);assert.ok(Math.abs(mid.points[2][0]-5)<1e-5&&Math.abs(mid.points[2][1])<1e-5);
const angular=solveSketch([[0,0],[10,1]],[{type:'fixed',a:0,x:0,y:0},{type:'length',a:0,b:1,value:10},{type:'angle',a:0,b:1,value:45}]);assert.ok(Math.abs(angular.points[1][0]-Math.sqrt(50))<1e-5);
console.log('PASS parallel, perpendicular, equal, midpoint and angular constraints');
