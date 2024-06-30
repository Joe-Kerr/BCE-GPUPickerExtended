From here https://forum.babylonjs.com/t/new-feature-gpu-picking/51106/31?u=joe_kerr

Use like

```
const geometryBufferRenderer = scene.enableGeometryBufferRenderer();
geometryBufferRenderer.enablePosition = true; 
const gBuffer = geometryBufferRenderer.getGBuffer();

game.raycasting.gpuPicker.enablePosition(gBuffer.textures[BABYLON.GeometryBufferRenderer.POSITION_TEXTURE_TYPE]);     
game.raycasting.gpuPicker.enableRaycastCamera(BABYLON.Vector3.Zero());                             
game.raycasting.gpuPicker.setPickingList([...scene.meshes]); 

await game.raycasting.gpuPicker.ensureReady(20, 10);

//do picking now

game.raycasting.gpuPicker.disableRaycastCamera();   
```