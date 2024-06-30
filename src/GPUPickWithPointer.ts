//For ref https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Collisions/gpuPicker.ts

import type { AbstractMesh, BaseTexture, Nullable, Observer } from "@babylonjs/core";
import { GPUPicker, Vector3, Scene } from "@babylonjs/core";

//#todo type GPUPickingInfo = BABYLON.PickingInfo;
export class GPUPickingInfo {
    /**If the pick collided with an object */
    public hit : boolean = false;
    /**The mesh corresponding to the pick collision */
    public pickedMesh : Nullable<AbstractMesh> = null;
    /**The location of the pick collision */
    public pickedPoint : Nullable<Vector3> = null;
    /**Distance between camera and pick collision */
    public distance : number = 0;

    /**@alias pickedMesh */
    public mesh : Nullable<AbstractMesh> = null;
}

/**Extensions for the GPUPicker. Beware the performance costs of the extra information. At the time of writing, 
 * a position texture can only be obtained from the gBuffer. Enabling the GeometryBufferRenderer (that creates the gBuffer) 
 * means doubling the scene's draw calls.  */
export default class GPUPickerExtended extends GPUPicker {
    private _positionTexture : Nullable<BaseTexture> = null;
    private _positionTextureObservable : Nullable<Observer<BaseTexture>> = null;

    /**
     * Should outputs of GPUPicker include picked position.
     * @param positionTexture the position texture (world) from a multi renderer target.
     */
    public enablePosition(positionTexture : BaseTexture) {
        this._positionTexture = positionTexture;

        // It is not null. https://github.com/BabylonJS/Babylon.js/blob/f78c1e794cb1742b0bc2633c6770e837591ca446/packages/dev/core/src/Misc/observable.ts#L214
        this._positionTextureObservable = positionTexture.onDisposeObservable.add(this.disablePosition.bind(this))!;        
    }

    /**
     * Disable output of picked position.
     */    
    public disablePosition() {
        if(this._positionTextureObservable && this._positionTexture) {
            this._positionTexture.onDisposeObservable.remove(this._positionTextureObservable);
        }    
        this._positionTextureObservable = null;    
        this._positionTexture = null;
    }

    /**
     * Gets GPUPicker results with optional world position.
     * @param x screen x
     * @param y screen y
     *
     * @returns Promise of pick result
     */    
    public async pickAsyncExtended(x : number, y : number) : Promise<GPUPickingInfo> {
        const result = new GPUPickingInfo();
        const meshResult = await this.pickAsync(x,y,false);
        
        const scene : Scene = this.getScene()!;
        if(!(scene instanceof Scene)) {
            console.error("Please call GPUPicker.setPickingList first.");
            return result;
        }
        
        //Duplicate code here
        const engine = scene.getEngine();
        const rttSizeH = engine.getRenderHeight();
        const camera = scene.activeCamera;
        
        x = x >> 0;
        y = y >> 0;

        // Invert Y
        y = rttSizeH - y;        
        ////        

        if(meshResult && meshResult.mesh && this._positionTexture) {
            const position = await this._positionTexture.readPixels(-1, 0, null, undefined, true, x,y, 1,1);
            if(position) {
                result.hit = true;

                result.pickedPoint = Vector3.Zero();
                result.pickedPoint.set(position[0], position[1], position[2]);

                if(camera) {
                    result.distance = Vector3.Distance(camera.position, result.pickedPoint);
                }                

                result.pickedMesh = meshResult.mesh;                
                result.mesh = meshResult.mesh;                
            }
        }

        return result;                
    }
    
    protected getScene() : Scene|undefined {
        //@ts-ignore private
        return this._cachedScene || undefined;
    }
}