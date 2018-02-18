/* globals AFRAME THREE */
AFRAME.registerComponent('collision-helper', {
  schema: {
    type: {default: 'sphere', oneOf: ['sphere', 'box']},
    radius: {default: 1, if: {type: ['sphere']}},
    debug: {default: false},
    color: {type: 'color', default: 0x888888}
  },

  init: function () {
    var data = this.data;

    this.geometry = new THREE.IcosahedronGeometry(1, 1);
    this.material = new THREE.MeshBasicMaterial({color: data.color, wireframe: true});
    this.helperMesh = null;

    if (data.debug) {
      this.createHelperMesh();
    }
  },

  createHelperMesh: function () {
    var radius = this.data.radius;
    this.helperMesh = new THREE.Mesh(this.geometry, this.material);
    this.helperMesh.visible = true;
    this.helperMesh.scale.set(radius, radius, radius);
    this.el.setObject3D('collision-helper-mesh', this.helperMesh);
  },

  update: function (oldData) {
    var data = this.data;
    if (!data.debug) { return; }

    if (!this.helperMesh) {
      this.createHelperMesh();
    } else {
      this.material.color.set(data.color);
      this.helperMesh.scale.set(data.radius, data.radius, data.radius);
      this.helperMesh.visible = data.debug;
    }
  }
});
/* globals AFRAME ABLAST THREE */
AFRAME.registerComponent('bullet', {
  schema: {
    name: { default: '' },
    direction: { type: 'vec3' },
    maxSpeed: { default: 5.0 },
    initialSpeed: { default: 5.0 },
    position: { type: 'vec3' },
    acceleration: { default: 0.5 },
    destroyable: { default: false },
    owner: {default: 'player', oneOf: ['enemy', 'player']},
    color: {default: '#fff'}
  },

  init: function () {
    this.startEnemy = document.getElementById('start_enemy');
    this.backgroundEl = document.getElementById('border');
    this.bullet = BULLETS[this.data.name];
    this.bullet.definition.init.call(this);
    this.hit = false;
    this.direction = new THREE.Vector3();
    this.temps = {
      direction: new THREE.Vector3(),
      position: new THREE.Vector3()
    }
  },

  update: function (oldData) {
    var data = this.data;
    this.owner = this.data.owner;
    this.direction.set(data.direction.x, data.direction.y, data.direction.z);
    this.currentAcceleration = data.acceleration;
    this.speed = data.initialSpeed;
    this.startPosition = data.position;
  },

  play: function () {
    this.initTime = null;
  },

  hitObject: function (type, data) {
    this.bullet.definition.onHit.call(this);
    this.hit = true;
    if (this.data.owner === 'enemy') {
      this.el.emit('player-hit');
      //document.getElementById('hurtSound').components.sound.playSound();
    }
    this.resetBullet();
  },

  resetBullet: function () {
    this.hit = false;
    this.bullet.definition.reset.call(this);
    this.initTime = null;

    this.direction.set(this.data.direction.x, this.data.direction.y, this.data.direction.z);

    this.currentAcceleration = this.data.acceleration;
    this.speed = this.data.initialSpeed;
    this.startPosition = this.data.position;

    this.system.returnBullet(this.data.name, this.el);
  },

  tick: (function () {
    //var position = new THREE.Vector3();
    //var direction = new THREE.Vector3();
    return function tick (time, delta) {

      if (!this.initTime) {this.initTime = time;}

      this.bullet.definition.tick.call(this, time, delta);

      // Align the bullet to its direction
      this.el.object3D.lookAt(this.direction.clone().multiplyScalar(1000));

      // Update acceleration based on the friction
      this.temps.position.copy(this.el.getAttribute('position'));

      // Update speed based on acceleration
      this.speed = this.currentAcceleration * .1 * delta;
      if (this.speed > this.data.maxSpeed) { this.speed = this.data.maxSpeed; }

      // Set new position
      this.temps.direction.copy(this.direction);
      var newBulletPosition = this.temps.position.add(this.temps.direction.multiplyScalar(this.speed));
      console.log(newBulletPosition);
      this.el.setAttribute('position', newBulletPosition);

      // Check if the bullet is lost in the sky
      if (this.temps.position.length() >= 50) {
        this.resetBullet();
        return;
      }

      var collisionHelper = this.el.getAttribute('collision-helper');
      if (!collisionHelper) { return; }

      var bulletRadius = collisionHelper.radius;

      // Detect collision depending on the owner
      if (this.data.owner === 'player') {
        // megahack

        // Detect collision against enemies
        if (this.data.owner === 'player') {
          // Detect collision with the start game enemy
            var enemy = this.startEnemy;
            var helper = enemy.getAttribute('collision-helper');
            var radius = helper.radius;
            if (newBulletPosition.distanceTo(enemy.object3D.position) < radius + bulletRadius) {
              //this.el.sceneEl.systems.explosion.createExplosion('enemy', this.el.getAttribute('position'), '#ffb911', 0.5, this.direction, 'enemy_start');
              enemy.emit('hit');
              return;
            }
        }
      }
    };
  })()
});