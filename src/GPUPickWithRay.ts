//For ref https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Collisions/gpuPicker.ts

import GPUPickerNotQuiteAsExtended, {GPUPickingInfo} from "./GPUPickWithPointer.js";

import type { AbstractMesh, BaseTexture, Nullable, Observer } from "@babylonjs/core";
import { GPUPicker, Vector3, Scene, Ray, FreeCamera } from "@babylonjs/core";

/**Extensions for the GPUPicker. Beware the performance costs of the extra information. At the time of writing, 
 * a position texture can only be obtained from the gBuffer. Enabling the GeometryBufferRenderer (that creates the gBuffer) 
 * means doubling the scene's draw calls.  */
export default class GPUPickerExtended extends GPUPickerNotQuiteAsExtended {
    private _raycastCamera : Nullable<FreeCamera> = null;
    private isOffLoop : boolean = true;

    //performance, hoping this would free some more frames (instead of creating dynamically)
    public enableRaycastCamera(position : Vector3) {
        const scene = this.getScene();
        this._raycastCamera = new FreeCamera("+RaycastCamera", position, scene);
        this._raycastCamera.minZ = 0.1;
        this._raycastCamera.maxZ = 4;

        if(scene) {
            scene.setActiveCameraById(this._raycastCamera.id);
        }

        return this._raycastCamera;
    }

    public disableRaycastCamera() {
        this._raycastCamera?.dispose();
        this._raycastCamera = null;
    }

    //If being off the render loop, this must be called and awaited otherwise every GPUPick will get stuck in promise.
    //See https://github.com/BabylonJS/Babylon.js/blob/338d5ec3bef6101027caca160c5e6a439b10e150/packages/dev/core/src/Collisions/gpuPicker.ts#L278
    public ensureReady(timeoutMs : number, maxRetries : number) {
        return (new Promise((resolve)=>{
            let retries = maxRetries;

            const retry = ()=>{
                //@ts-ignore private
                if( this._renderMaterial.isReady() === false ) {
                    retries--;
                    setTimeout(retry, timeoutMs);
                    return;
                }

                if(retries <= 0) {
                    resolve(false);
                }
                else
                    resolve(true);
            };

            retry();
        }));        
    }

    public async pickWithRayAsyncExtended(ray : Ray) : Promise<GPUPickingInfo>  {
        const scene : Scene = this.getScene()!;
        if(!(scene instanceof Scene)) {
            console.error("Please call GPUPicker.setPickingList first.");
            return new GPUPickingInfo();
        }
        
        const raycastCamera = this._raycastCamera;

        if(raycastCamera === null) {
            return new GPUPickingInfo();
        }
        
        const rayTarget = ray.direction.clone(); //#todo tmp vector
        rayTarget.scaleInPlace(ray.length);
        rayTarget.addInPlace(ray.origin);
        
        raycastCamera.position.copyFrom(ray.origin);
        raycastCamera.setTarget(rayTarget);

        //BABYLON.Tools.CreateScreenshot(scene.getEngine(), raycastCamera, {precision: 1.0});

        const x = scene.getEngine().getRenderWidth() / 2;
        const y = scene.getEngine().getRenderHeight() / 2;
        const pickingPromise = this.pickAsyncExtended(x, y);

        if(this.isOffLoop) {
            scene.getEngine().beginFrame();
            scene.render();
            scene.getEngine().endFrame();
            //this._pickingTexure.render(); //not working; getting null back from picker
        }

        const pickingInfo = await pickingPromise; 
        //console.log(pickingInfo.mesh?.name)
        return pickingInfo;           
    }
}