import {Vector3} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
// OrbitControls caches its up-frame at construction. CAD named views and the
// orientation cube can change camera.up, so refresh that frame before orbiting.
export class CADNavigation extends OrbitControls{
 update(delta){if(this._quat){this._quat.setFromUnitVectors(this.object.up,new Vector3(0,1,0));this._quatInverse.copy(this._quat).invert();}return super.update(delta);}
 stopMotion(){this._sphericalDelta?.set(0,0,0);this._panOffset?.set(0,0,0);this._scale=1;}
 syncPose(){this.stopMotion();return this.update();}
}
