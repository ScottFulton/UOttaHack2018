/* globals AFRAME */
function createMixin (id, obj, scene) {
    var mixinEl = document.createElement('a-mixin');
    mixinEl.setAttribute('id', id);
    Object.keys(obj).forEach(function (componentName) {
      var value = obj[componentName];
      if (typeof value === 'object') {
        value = AFRAME.utils.styleParser.stringify(value);
      }
      mixinEl.setAttribute(componentName, value);
    });
  
    var assetsEl = scene ? scene.querySelector('a-assets') : document.querySelector('a-assets');
    if (!assetsEl) {
      assetsEl = document.createElement('a-assets');
      scene.appendChild(assetsEl);
    }
    assetsEl.appendChild(mixinEl);
  
    return mixinEl;
  }

var PoolHelper = function (groupName, data, sceneEl) {
    this.groupName = groupName;
    this.sceneEl = sceneEl || document.querySelector('a-scene');
    this.initializePools(groupName, data);
  };
  
  PoolHelper.prototype = {
    initializePools: function (groupName, data) {
      var self = this;
      Object.keys(data).forEach(function (name) {
        var item = data[name];
        var components = item.components;
        var mixinName = groupName + name;
        createMixin(mixinName, components, self.sceneEl);
  
        self.sceneEl.setAttribute('pool__' + mixinName,
          {
            size: item.poolSize,
            mixin: mixinName,
            dynamic: true
          });
      });
    },
  
    returnEntity: function (name, entity) {
      var mixinName = this.groupName + name;
      var poolName = 'pool__' + mixinName;
      this.sceneEl.components[poolName].returnEntity(entity);
    },
  
    requestEntity: function (name) {
      var mixinName = this.groupName + name;
      var poolName = 'pool__' + mixinName;
      var entity = this.sceneEl.components[poolName].requestEntity();
      // entity.id= this.groupName + Math.floor(Math.random() * 1000);
      return entity;
    }
  };

  BULLETS = {};

  function registerBullet (name, data, definition) {
    if (BULLETS[name]) {
      throw new Error('The bullet `' + name + '` has been already registered. ' +
                      'Check that you are not loading two versions of the same bullet ' +
                      'or two different bullets of the same name.');
    }
  
    BULLETS[name] = {
      poolSize: data.poolSize,
      components: data.components,
      definition: definition
    };
  
    console.info('Bullet registered ', name);
  };

  registerBullet(
    // name
    'default',
    // data
    {
      components: {
        bullet: {
          name: 'default',
          maxSpeed: 1,
          initialSpeed: 0.1,
          acceleration: 0.4,
          color: '#24CAFF'
        },
        'collision-helper': {
          debug: false,
          radius: 0.2
        },
        'json-model2': {
          src: '#playerBullet'
        }
      },
      poolSize: 10
    },
    // implementation
    {
      init: function () {
        var el = this.el;
        var color = this.bullet.components.bullet.color;
        el.setAttribute('material', 'color', color);
        el.setAttribute('scale', {x: 0.2, y: 0.2, z: 0.2});
        this.trail = null;
        var self = this;
        el.addEventListener('model-loaded', function(event) {
          // @todo Do it outside
          //event.detail.model.children[0].material.color.setRGB(1,0,0);
          self.trail = self.el.getObject3D('mesh').getObjectByName('trail');
          self.trail.scale.setY(0.001);
        });
      },
      reset: function () {
        var el = this.el;
        el.setAttribute('scale', {x: 0.2, y: 0.2, z: 0.2});
        if (this.trail) {
          this.trail.scale.setY(0.001);
        }
      },
      tick: function (time, delta) {
        //stretch trail
        if (this.trail && this.trail.scale.y < 1) {
          var trailScale;
          if (this.trail.scale.y < 0.005) {
            trailScale = this.trail.scale.y + 0.001;
          }
          else {
            trailScale = this.trail.scale.y + delta/50;
          }
          if (trailScale > 1) { trailScale = 1; }
          this.trail.scale.setY(trailScale);
        }
      },
      onHit: function (type) {
        this.el.setAttribute('material', 'color', '#FFF');
      }
    }
  );

  AFRAME.registerSystem('bullet', {
    init: function () {
      var self = this;
      this.poolHelper = new PoolHelper('bullet', BULLETS, this.sceneEl);
      this.activeBullets = [];
  
      this.sceneEl.addEventListener('gamestate-changed', function (evt) {
        if ('state' in evt.detail.diff) {
          if (evt.detail.state.state === 'STATE_GAME_OVER' || evt.detail.state.state === 'STATE_GAME_WIN') {
            self.reset();
          }
        }
      });
    },
  
    reset: function (entity) {
      var self = this;
      this.activeBullets.forEach(function (bullet) {
        self.returnBullet(bullet.getAttribute('bullet').name, bullet);
      });
    },
  
    returnBullet: function (name, entity) {
      this.activeBullets.splice(this.activeBullets.indexOf(entity), 1);
      this.poolHelper.returnEntity(name, entity);
    },
  
    getBullet: function (name) {
      var self = this;
      var bullet = this.poolHelper.requestEntity(name);
      this.activeBullets.push(bullet);
      return bullet;
    }
  });

AFRAME.registerComponent('shoot', {
    schema: {
      direction: {type: 'vec3', default: {x: 0, y: -2, z: -1}},  // Event to fire bullet.
      on: {default: 'triggerdown'},  // Event to fire bullet.
      spaceKeyEnabled: {default: true},  // Keyboard support.
      weapon: {default: 'default'}  // Weapon definition.
    },
  
    init: function () {
      var data = this.data;
      var el = this.el;
      var self = this;
  
      this.coolingDown = false;  // Limit fire rate.
      this.shoot = this.shoot.bind(this);
      this.weapon = null;
  
      // Add keyboard listener.
      if (data.spaceKeyEnabled) {
        window.addEventListener('keydown', function (evt) {
          if (evt.code === 'Space' || evt.keyCode === '32') { self.shoot(); }
        });
      }
  /*
      if (AFRAME.utils.device.isMobile())
      {
        window.addEventListener('click', function (evt) {
          self.shoot();
        });
      }
  */
    },
  
    update: function (oldData) {
      // Update weapon.
      //this.weapon = WEAPONS[this.data.weapon];
  
      if (oldData.on !== this.data.on) {
        this.el.removeEventListener(oldData.on, this.shoot);
        this.el.addEventListener(this.data.on, this.shoot);
      }
    },
  
    shoot: (function () {
      var direction = new THREE.Vector3();
      var position = new THREE.Vector3();
      var quaternion = new THREE.Quaternion();
      var scale = new THREE.Vector3();
      var translation = new THREE.Vector3();
      var incVive = new THREE.Vector3(0.0, -0.23, -0.15);
      var incOculus = new THREE.Vector3(0, -0.23, -0.8);
      var inc = new THREE.Vector3();
  
      return function () {
        var bulletEntity;
        var el = this.el;
        var data = this.data;
        var matrixWorld;
        var self = this;
        var weapon = this.weapon;
  
        if (this.coolingDown) { return; }
  
        // Get firing entity's transformations.
        el.object3D.updateMatrixWorld();
        matrixWorld = el.object3D.matrixWorld;
        position.setFromMatrixPosition(matrixWorld);
        matrixWorld.decompose(translation, quaternion, scale);
  
        // Set projectile direction.
        direction.set(data.direction.x, data.direction.y, data.direction.z);
        direction.applyQuaternion(quaternion);
        direction.normalize();
  
        if (el.components['weapon']) {
          inc.copy(el.components.weapon.controllerModel === 'oculus-touch-controller' ? incOculus : incVive);
        }
        inc.applyQuaternion(quaternion);
        position.add(inc);
  
        // Ask system for bullet and set bullet position to starting point.
        bulletEntity = el.sceneEl.systems.bullet.getBullet('default');
        bulletEntity.setAttribute('position', position);
        bulletEntity.setAttribute('bullet', {
          direction: direction.clone(),
          position: position.clone(),
          owner: 'player'
        });
        bulletEntity.setAttribute('visible', true);
        bulletEntity.setAttribute('position', position);
        bulletEntity.play();
  
        // Communicate the shoot.
        el.emit('shoot', bulletEntity);
        console.log('test');
  
        // Set cooldown period.
        this.coolingDown = true;
        setTimeout(function () {
          self.coolingDown = false;
          console.log('cooldown done');
        }, 500);
      };
    })()
  });