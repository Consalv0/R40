/* eslint space-infix-ops: 0, space-before-function-paren: 0, indent: 0, no-trailing-spaces: 0 */
/* global Image, requestAnimationFrame, Stats, $ */

// eslint-disable-next-line
// function preload() {
// }
//
// // eslint-disable-next-line
// function setup() {
//   createCanvas(900, 1000).parent('game')
// }
//
// // eslint-disable-next-line
// function draw() {
//   frameRate(60)
// }

// Raycast Engine Code
// =====================
// Inspired by/modified from:
// https://github.com/hunterloftis/playfuljs/blob/master/content/demos/raycaster.html
// Notes:
// Improved Raycasting algorithm.
// - The raycast uses a stack instead of recursion.
//   This lowers function call overhead (the bane of games),
//   and it also lowers the amount of objects created
//   (the other bane of games).
// - NOTE: Runs a heck of a lot better in node-webkit
// =====================

let CIRCLE = Math.PI * 2
let GOLDENR = (1 +Math.sqrt(5)) /2

// Texture Loader
// =========
function Texture (options) { // "options" are the values required to run
  this.width = 0
  this.height = 0
  this.img = undefined

  if (options) { // All options are true?
    for (let prop in options) { // For each option
      if (this.hasOwnProperty(prop)) { // Exists?
        this[prop] = options[prop] // Assign values
      }
    }

    if (options.hasOwnProperty('src')) { // Exist?
      this.img = new Image()  // Save image
      this.img.src = options.src // Save src inside Image
    }
  }
}

// The Map
// =======================
function RayMap (options) {
  this.walls = []
  this.floor = []
  this.ceiling = []
  this.skyBox = undefined
  this.light = 1
  this.width = 0
  this.height = 0
  this.outdoors = false
  this.wallTextures = []
  this.floorTextures = []
  this.ceilingTextures = []

  if (options) { // All options are true?
    for (let prop in options) { // For each option
      if (this.hasOwnProperty(prop)) {  // Exists?
        this[prop] = options[prop] // Assign values
      }
    }
  }
}

// The Movement
// ===========================
RayMap.prototype = {
  Get: function(x, y) { // Defines how to get the player position
    x = x | 0 // If x is not defined be 0
    y = y | 0
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return // Prevents player to break through walls
    return this.walls[y * this.width + x] // IDK
  },

  Raycast: function(point, angle, range) {
    let fullRange = false
    let layer = 'walls'
    let cells = []

    let sin = Math.sin(angle)
    let cos = Math.cos(angle)

    let stepX, stepY, nextStep
    nextStep = { x: point.x, y: point.y, cell: 0, distance: 0 }
    do {
      cells.push(nextStep)
      if (!fullRange && nextStep.cell > 0) break

      stepX = this.__step(sin, cos, nextStep.x, nextStep.y, false)
      stepY = this.__step(cos, sin, nextStep.y, nextStep.x, true)
      nextStep = stepX.length2 < stepY.length2
        ? this.__inspect(stepX, 1, 0, nextStep.distance, stepX.y, cos, sin, layer)
        : this.__inspect(stepY, 0, 1, nextStep.distance, stepY.x, cos, sin, layer)
    } while (nextStep.distance <= range)

    return cells
  },

  __step: function(rise, run, x, y, inverted) {
    if (run === 0) return { length2: Infinity }
    let dx = run > 0 ? Math.floor(x + 1) - x : Math.ceil(x - 1) - x
    let dy = dx * rise / run
    return {
      x: inverted ? y + dy : x + dx,
      y: inverted ? x + dx : y + dy,
      length2: dx * dx + dy * dy
    }
  },

  __inspect: function(step, shiftX, shiftY, distance, offset, cos, sin, layer) {
    let dx = cos < 0 ? shiftX : 0
    let dy = sin < 0 ? shiftY : 0
    let index = (((step.y - dy) | 0) * this.width) + ((step.x - dx) | 0)
    step.cell = (index < 0 || index >= this[layer].length) ? -1 : this[layer][index]
    step.distance = distance + Math.sqrt(step.length2)

    if (this.outdoors) {
      if (shiftX) step.shading = cos < 0 ? 2 : 0
      else step.shading = sin < 1 ? 2 : 1
    } else step.shading = 0
    step.offset = offset - (offset | 0)
    return step
  }
}

// The Camera
// ==========================
function RayCamera(options) {
  this.fov = CIRCLE * 0.2
  this.range = 14
  this.lightRange = 5
  this.position = { x: 0, y: 0 }
  this.direction

  if (options) {
    for (let prop in options) {
      if (this.hasOwnProperty(prop)) {
        this[prop] = options[prop]
      }
    }
  }

  this.spacing = this.width / this.resolution
}

RayCamera.prototype = {
  Rotate: function(angle) {
    this.direction = (this.direction + angle + CIRCLE) % (CIRCLE)
  }
}

// The Render Engine
// ==============================
function RaycastRenderer(options) {
  this.width = GOLDENR
  this.height = 1
  this.resolution = options.height
  this.textureSmoothing = false
  this.domElement = document.createElement('canvas')

  if (options) {
    for (let prop in options) {
      if (this.hasOwnProperty(prop)) {
        this[prop] = options[prop]
      }
    }
  }

  this.domElement.width = this.width
  this.domElement.height = this.height
  this.ctx = this.domElement.getContext('2d')
  this.spacing = this.width / this.resolution
}

RaycastRenderer.prototype = {
  __project: function(height, angle, distance) {
    let z = distance * Math.cos(angle)
    let wallHeight = this.height * height / z
    let bottom = this.height / 2 * (1 + 1/z)
    return {
      top: bottom - wallHeight,
      height: wallHeight
    }
  },

  __drawSky: function(camera, map) {
    if (map.skybox && map.skybox.img) {
      let width = this.width * (CIRCLE / camera.fov)
      let left = -width * camera.direction / CIRCLE

      this.ctx.save()
      this.ctx.drawImage(map.skybox.img, left, 0, width, this.height)

      if (left < width - this.width) {
        this.ctx.drawImage(map.skybox.img, left + width, 0, width, this.height)
      }

      if (map.light > 0) {
        this.ctx.fillStyle = '#ffffff'
        this.ctx.globalAlpha = map.light * 0.1
        this.ctx.fillRect(0, this.height * 0.5, this.width, this.height * 0.5)
      }

      this.ctx.restore()
    }
  },

  __drawColumn: function(column, ray, angle, camera, textures) {
    let left = Math.floor(column * this.spacing)
    let width = Math.ceil(this.spacing)
    let hit = -1

    // eslint-disable-next-line
    while (++hit < ray.length && ray[hit].cell <= 0);

    let texture
    let textureX = 0
    if (hit < ray.length) {
      // TODO: Deal with transparent walls here somehow
      let step = ray[hit]
      texture = textures[step.cell > textures.length ? 0 : step.cell - 1]
      textureX = (texture.width * step.offset) | 0
      let wall = this.__project(1, angle, step.distance)

      this.ctx.globalAlpha = 1
      this.ctx.drawImage(texture.img, textureX, 0, 1, texture.height, left, wall.top, width, wall.height)

      this.ctx.fillStyle = '#000000'
      this.ctx.globalAlpha = Math.max((step.distance + step.shading) / camera.lightRange, 0)

      this.textureSmoothing ? this.ctx.fillRect(left, wall.top, width, wall.height)
        : this.ctx.fillRect(left | 0, wall.top | 0, width, wall.height + 1)
    }
  },

  __drawColumns: function(camera, map) {
    this.ctx.save()
    this.ctx.imageSmoothingEnabled = this.textureSmoothing
    for (let col = 0; col < this.resolution; col++) {
      let angle = camera.fov * (col / this.resolution - 0.5)
      let ray = map.Raycast(camera.position, camera.direction + angle, camera.range)
      this.__drawColumn(col, ray, angle, camera, map.wallTextures)
    }
    this.ctx.restore()
  },

  Render: function(camera, map) {
      this.__drawSky(camera, map)
      if (map.wallTextures.length > 0) {
        this.__drawColumns(camera, map)
      }
  },

  Raycast: function(point, angle, range) {
    if (this.map) return this.map.Raycast(point, angle, range)
    return []
  }
}

// Raycast Demo code
// ==================
// Controls and player object modified from same thing
// as the Raycast Engine
// ======================
let canvas = document.getElementById('game')
let ctx = canvas.getContext('2d')

let wallTex = new Texture({ // Assign wall texture
  src: 'assets/wall.gif',
  width: 64,
  height: 64
})
function MiniMap(options) {
  this.target = undefined
  this.width = 22
  this.height = 22
  this.cellSize = 4

  if (options) {
    for (let prop in options) {
      if (this.hasOwnProperty(prop)) {
        this[prop] = options[prop]
      }
    }
  }

  if (this.target === undefined) {
    this.target = document.createElement('canvas')
  }
  this.target.width = this.width * this.cellSize
  this.target.height = this.height * this.cellSize
  this.ctx = this.target.getContext('2d')
}

// MiniMap
// =========================
MiniMap.prototype = {
  LoadMap: function(map) {
    if (this.width !== map.width) {
      this.width = map.width
      this.target.width = this.width * this.cellSize
    }
    if (this.height !== map.height) {
      this.height = map.height
      this.target.height = this.height * this.cellSize
    }

// Render MiniMap
    this.ctx.fillStyle = '#b6b6b6'
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (map.walls[(this.height - y - 1)*map.width + (this.width - x - 1)] === 0) {
          this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize)
        }
      }
    }
  },

// Render Player Position in MiniMap
  RenderRelMap: function(ctx, pos, playerPos) {
    let pX = (this.width - (playerPos.x | 0) - 1) * this.cellSize
    let pY = (this.height - (playerPos.y | 0) - 1) * this.cellSize
    ctx.drawImage(this.target, pos.x, pos.y, this.target.width, this.target.height)
    ctx.fillStyle = '#006eff'
    ctx.fillRect(pos.x + pX, pos.y + pY, this.cellSize, this.cellSize)
  }
}

let miniMap = new MiniMap()

let map = new RayMap({
  width: 22,
  height: 22,
  light: 2,
  walls: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1,
          1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1,
          1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1,
          1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1,
          1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1,
          1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1,
          1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1,
          1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
          1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1,
          1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1,
          1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1,
          1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1,
          1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1,
          1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1,
          1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1,
          1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1,
          1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1,
          1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  wallTextures: [wallTex]
})

miniMap.LoadMap(map)

let camera = new RayCamera()

let renderer = new RaycastRenderer({
  width: $(window).width(),
  height: $(window).width() /GOLDENR,
  textureSmoothing: false,
  domElement: canvas
})

function Controls() {
  this.codes = { 65: 'left', 68: 'right', 87: 'forward', 83: 'backward' }
  this.states = { 'left': false, 'right': false, 'forward': false, 'backward': false }
  document.addEventListener('keydown', this.onKey.bind(this, true), false)
  document.addEventListener('keyup', this.onKey.bind(this, false), false)
}

Controls.prototype.onKey = function(val, e) {
  let state = this.codes[e.keyCode]
  if (typeof state === 'undefined') return
  this.states[state] = val
  e.preventDefault && e.preventDefault()
  e.stopPropagation && e.stopPropagation()
}

let controls = new Controls()

let player = {
  position: {x: 10, y: 10},
  direction: Math.PI * 0,
  rotate: function(angle) {
    this.direction = (this.direction + angle + CIRCLE) % (CIRCLE)
    camera.direction = this.direction
  },
  walk: function(distance, map) {
    let dx = Math.cos(this.direction) * distance
    let dy = Math.sin(this.direction) * distance
    if (map.Get(this.position.x + dx, this.position.y) <= 0) this.position.x += dx
    if (map.Get(this.position.x, this.position.y + dy) <= 0) this.position.y += dy
    camera.position.x = this.position.x
    camera.position.y = this.position.y
  },
  update: function(controls, map, seconds) {
    if (controls.left) this.rotate(-3 * seconds) // How much the player would move per seconds
    if (controls.right) this.rotate(3 * seconds)
    if (controls.forward) this.walk(3 * seconds, map)
    if (controls.backward) this.walk(-3 * seconds, map)
  }
}

camera.direction = player.direction
camera.position.x = player.position.x
camera.position.y = player.position.y

let stats = new Stats()
stats.setMode(0)
stats.domElement.style.position = 'absolute'
stats.domElement.style.left = '0px'
stats.domElement.style.top = '0px'
document.body.appendChild(stats.domElement)

let lastTime = 0
let mapPos = {x: -44, y: -44}
function UpdateRender(time) {
  stats.begin()
  let seconds = (time - lastTime) / 1000
  lastTime = time
  if (seconds < 0.2) {
    player.update(controls.states, map, seconds)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    renderer.Render(camera, map)
    ctx.save()
    ctx.translate(50, 100)
    ctx.rotate(-(player.direction - Math.PI * 0.5))
    miniMap.RenderRelMap(ctx, mapPos, player.position)
    ctx.restore()
  }
  requestAnimationFrame(UpdateRender)
  stats.end()
}

requestAnimationFrame(UpdateRender)
