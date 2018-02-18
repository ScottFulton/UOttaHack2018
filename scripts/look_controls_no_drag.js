var PI_2 = Math.PI / 2;
var radToDeg = THREE.Math.radToDeg;

AFRAME.registerComponent('follow-mouse', {
  dependencies: ['position', 'rotation'],
  schema : { speed : {default:1}},
      init : function(){
        this.pointerLocked = false;
        this.rotation = {};
        this.pitchObject = new THREE.Object3D();
        this.yawObject = new THREE.Object3D();
        this.yawObject.position.y = 10;
        this.yawObject.add(this.pitchObject);
        document.addEventListener('mousedown',this.OnDocumentMouseDown.bind(this));
        document.addEventListener('mouseup',this.OnDocumentMouseUp.bind(this));
        document.addEventListener('mousemove',this.OnDocumentMouseMove.bind(this));
        document.addEventListener('pointerlockchange', this.onPointerLockChange, false);
        document.addEventListener('mozpointerlockchange', this.onPointerLockChange, false);
        document.addEventListener('pointerlockerror', this.onPointerLockError, false);
        var sceneEl = this.el.sceneEl;
        var canvasEl = sceneEl && sceneEl.canvas;
        canvasEl.onclick = this.requestPointer.bind(this);
      },
      tick : function() {
        var rotation = this.rotation;
        rotation.x = radToDeg(this.pitchObject.rotation.x);
        rotation.y = radToDeg(this.yawObject.rotation.y);
        rotation.z = 0;
        this.el.setAttribute('rotation', rotation);
      },
      OnDocumentMouseDown : function(event){
      },
      OnDocumentMouseUp : function(){
      },
      OnDocumentMouseMove : function(event)
      {
        var pitchObject = this.pitchObject;
        var yawObject = this.yawObject;
        var movementX;
        var movementY;
    
         // Calculate delta.
        movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    
        // Calculate rotation.
        yawObject.rotation.y -= movementX * 0.002;
        pitchObject.rotation.x -= movementY * 0.002;
        pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, pitchObject.rotation.x));
      },
      onPointerLockChange: function () {
        this.pointerLocked = !!(document.pointerLockElement || document.mozPointerLockElement);
      },
      /**
       * Recover from Pointer Lock error.
       */
      onPointerLockError: function () {
        this.pointerLocked = false;
      },

      requestPointer: function() {
        var sceneEl = this.el.sceneEl;
        var canvasEl = sceneEl && sceneEl.canvas;
        if (canvasEl.requestPointerLock) {
          canvasEl.requestPointerLock();
        } else if (canvasEl.mozRequestPointerLock) {
          canvasEl.mozRequestPointerLock();
        }
      }

});