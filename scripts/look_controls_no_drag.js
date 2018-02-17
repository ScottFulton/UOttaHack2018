var PI_2 = Math.PI / 2;
var radToDeg = THREE.Math.radToDeg;

AFRAME.registerComponent('follow-mouse', {
  dependencies: ['position', 'rotation'],
  schema : { speed : {default:1}},
      init : function(){
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
        var previousMouseEvent = this.previousMouseEvent;
        var movementX;
        var movementY;
    
         // Calculate delta.
        movementX = event.movementX || event.mozMovementX;
        movementY = event.movementY || event.mozMovementY;
        if (movementX === undefined || movementY === undefined) {
          movementX = event.screenX - previousMouseEvent.screenX;
          movementY = event.screenY - previousMouseEvent.screenY;
        }
        this.previousMouseEvent = event;
    
        // Calculate rotation.
        yawObject.rotation.y -= movementX * 0.002;
        pitchObject.rotation.x -= movementY * 0.002;
        pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, pitchObject.rotation.x));
      }

});