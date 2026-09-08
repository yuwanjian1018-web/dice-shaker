const { FACE_NORMALS, createLayout } = require('./dice-3d-layout')
const model = require('../assets/models/cup-scene')
const { COVER_DURATION_MS } = require('./game')

// Loader deliberately supports the static meshes, PBR maps and sampled TRS tracks
// in our checked-in model. No DOM, network requests, Blob URLs or remote assets.
function createAssembly(THREE, binary, loadImage) {
  const resources = { geometries: [], materials: [], textures: [] }
  const cache = new Map()
  function attribute(index) {
    if (cache.has(index)) return cache.get(index)
    const a = model.accessors[index], view = model.bufferViews[a.bufferView]
    const Type = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[a.componentType]
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]
    if (!Type || !size || a.sparse || view.byteStride) throw new Error('Unsupported model accessor')
    const result = new THREE.BufferAttribute(new Type(binary, (view.byteOffset || 0) + (a.byteOffset || 0), a.count * size), size, Boolean(a.normalized))
    cache.set(index, result)
    return result
  }
  const promises = [], textureCache = new Map()
  function texture(index, color) {
    const def = model.textures[index]
    const key = `${def.source}:${color}`
    if (textureCache.has(key)) return textureCache.get(key)
    const result = new THREE.Texture()
    textureCache.set(key, result)
    result.flipY = false
    result.wrapS = result.wrapT = THREE.RepeatWrapping
    result.encoding = color ? THREE.sRGBEncoding : THREE.LinearEncoding
    result.anisotropy = 4
    resources.textures.push(result)
    promises.push(loadImage('/assets/models/' + model.images[def.source].uri).then(img => {
      result.image = img; result.needsUpdate = true
    }))
    return result
  }
  const materials = model.materials.map(def => {
    const pbr = def.pbrMetallicRoughness || {}, c = pbr.baseColorFactor || [1, 1, 1, 1]
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color().setRGB(c[0], c[1], c[2]),
      roughness: pbr.roughnessFactor === undefined ? 1 : pbr.roughnessFactor,
      metalness: pbr.metallicFactor === undefined ? 1 : pbr.metallicFactor,
      // Every shipped primitive is wound to match its authored normal and both
      // shells are closed, so a back face never reaches the screen. Culling them
      // halves the rasterised triangles in the colour and depth passes alike.
      side: THREE.FrontSide
    })
    mat.name = def.name
    mat.dithering = true
    // Keep black leather readable under the compact mobile lighting rig.
    if (/leather/.test(def.name)) mat.color.multiplyScalar(1.65)
    const specular = (def.extensions || {}).KHR_materials_specular
    if (specular) mat.reflectivity = .5 * Math.sqrt(specular.specularFactor === undefined ? 1 : specular.specularFactor)
    if (pbr.baseColorTexture) mat.map = texture(pbr.baseColorTexture.index, true)
    if (pbr.metallicRoughnessTexture) {
      mat.roughnessMap = texture(pbr.metallicRoughnessTexture.index, false)
      mat.metalnessMap = mat.roughnessMap
    }
    if (def.normalTexture) {
      mat.normalMap = texture(def.normalTexture.index, false)
      mat.normalScale.setScalar(def.normalTexture.scale === undefined ? 1 : def.normalTexture.scale)
    }
    const coat = (def.extensions || {}).KHR_materials_clearcoat
    if (coat) { mat.clearcoat = coat.clearcoatFactor || 0; mat.clearcoatRoughness = coat.clearcoatRoughnessFactor || 0 }
    if (model.meshes.some(mesh => mesh.primitives.some(p => p.attributes._OCCLUSION !== undefined))) {
      mat.onBeforeCompile = shader => {
        shader.vertexShader = 'attribute float occlusion; varying float vCavity;\n' + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCavity = occlusion;')
        shader.fragmentShader = 'varying float vCavity;\n' + shader.fragmentShader
        // Baked hemisphere visibility provides local bounce occlusion at socket
        // lips and lining seams. Retain direct specular highlights on the resin.
        shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>', `#include <aomap_fragment>
          reflectedLight.indirectDiffuse *= vCavity;
          reflectedLight.indirectSpecular *= vCavity;
          reflectedLight.directDiffuse *= mix(0.7, 1.0, vCavity);`)
      }
    }
    resources.materials.push(mat)
    return mat
  })
  // Fine, repeatable fibre height for the lining, shared by both cloth materials.
  // Generated locally once; mipmaps prevent grain from shimmering during motion.
  const fibreSize = 128, fibreData = new Uint8Array(fibreSize * fibreSize * 3)
  let fibreSeed = 1977
  for (let i = 0; i < fibreSize * fibreSize; i++) {
    fibreSeed = (Math.imul(fibreSeed, 1664525) + 1013904223) >>> 0
    const value = 178 + (fibreSeed >>> 26)
    fibreData.fill(value, i * 3, i * 3 + 3)
  }
  const fibre = new THREE.DataTexture(fibreData, fibreSize, fibreSize, THREE.RGBFormat)
  fibre.wrapS = fibre.wrapT = THREE.RepeatWrapping
  fibre.repeat.set(3, 3); fibre.generateMipmaps = true
  fibre.minFilter = THREE.LinearMipmapLinearFilter; fibre.magFilter = THREE.LinearFilter
  fibre.needsUpdate = true; resources.textures.push(fibre)
  for (const mat of materials) if (/suede|felt/.test(mat.name)) {
    mat.map = fibre; mat.color.multiplyScalar(1.85)
    mat.bumpMap = fibre; mat.bumpScale = .028
    mat.sheen = new THREE.Color(.045, .048, .052)
  }
  const meshes = model.meshes.map(def => def.primitives.map(p => {
    const geo = new THREE.BufferGeometry()
    const names = { POSITION: 'position', NORMAL: 'normal', TEXCOORD_0: 'uv', _OCCLUSION: 'occlusion' }
    for (const key of Object.keys(names)) if (p.attributes[key] !== undefined) geo.addAttribute(names[key], attribute(p.attributes[key]))
    geo.setIndex(attribute(p.indices))
    geo.computeBoundingBox(); geo.computeBoundingSphere()
    resources.geometries.push(geo)
    return { geo, mat: materials[p.material] }
  }))
  const nodes = model.nodes.map(def => {
    const node = new THREE.Group(); node.name = def.name
    if (def.translation) node.position.fromArray(def.translation)
    if (def.rotation) node.quaternion.fromArray(def.rotation)
    if (def.scale) node.scale.fromArray(def.scale)
    if (def.matrix) { node.matrix.fromArray(def.matrix); node.matrix.decompose(node.position, node.quaternion, node.scale) }
    if (def.mesh !== undefined) for (const primitive of meshes[def.mesh]) {
      const mesh = new THREE.Mesh(primitive.geo, primitive.mat)
      // Pips are dimples recessed into the die body and can never widen its
      // silhouette, so keeping them out of the depth pass drops 10k triangles each.
      mesh.castShadow = !/spherical inset/.test(primitive.mat.name)
      // Low-resolution self-shadow maps create triangular acne on the curved
      // lining. Keep geometric lighting there; dice still cast onto the tray.
      mesh.receiveShadow = !def.name.startsWith('Lid -')
      node.add(mesh)
    }
    return node
  })
  model.nodes.forEach((def, i) => (def.children || []).forEach(child => nodes[i].add(nodes[child])))
  const root = new THREE.Group()
  model.scenes[model.scene || 0].nodes.forEach(index => root.add(nodes[index]))
  const animation = model.animations[0]
  const tracks = animation.channels.map(c => {
    const s = animation.samplers[c.sampler]
    return { node: nodes[c.target.node], path: c.target.path, times: attribute(s.input).array, values: attribute(s.output).array }
  })
  const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion()
  function pose(progress) {
    for (const track of tracks) {
      const time = progress * track.times[track.times.length - 1]
      let i = 0
      while (i < track.times.length - 2 && track.times[i + 1] < time) i++
      const t = Math.min(1, Math.max(0, (time - track.times[i]) / (track.times[i + 1] - track.times[i])))
      if (track.path === 'rotation') {
        q1.fromArray(track.values, i * 4); q2.fromArray(track.values, (i + 1) * 4)
        track.node.quaternion.copy(q1).slerp(q2, t)
      } else {
        const target = track.path === 'translation' ? track.node.position : track.node.scale
        for (let j = 0; j < 3; j++) target.setComponent(j, track.values[i * 3 + j] * (1 - t) + track.values[(i + 1) * 3 + j] * t)
      }
    }
    root.updateMatrixWorld(true)
  }
  return { root, nodes, pose, resources, ready: Promise.all(promises) }
}

async function createShakerScene({ THREE, canvas, width, height, pixelRatio, readBinary, loadImage }) {
  let renderer, assembly, environment
  try {
    // preserveDrawingBuffer makes iOS copy the whole surface every frame; the
    // settings snapshot instead reads the buffer back inside its drawing task.
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' })
    // Resolution is the first thing traded when frames slip, then the shadow map.
    // Phones vary far too much for one fixed budget, and iOS reports no device tier.
    const QUALITY = [1, .84, .7, .58], SHADOW_SIZES = [1024, 1024, 512, 512], PIXEL_BUDGET = 1150000
    const basePixelRatio = Math.max(1, Math.min(pixelRatio || 1, 2))
    let quality = 0, shadowLight = null, viewWidth = width, viewHeight = height
    function applyResolution() {
      const ceiling = Math.min(basePixelRatio, Math.sqrt(PIXEL_BUDGET / Math.max(1, viewWidth * viewHeight)))
      renderer.setPixelRatio(Math.max(1, ceiling * QUALITY[quality]))
      renderer.setSize(viewWidth, viewHeight, false)
    }
    function applyShadowQuality() {
      if (!shadowLight) return
      const size = Math.min(SHADOW_SIZES[quality], renderer.capabilities.maxTextureSize)
      if (shadowLight.shadow.mapSize.width === size) return
      shadowLight.shadow.mapSize.set(size, size)
      // Hold the penumbra at a fixed width in the scene as the texel size changes.
      shadowLight.shadow.radius = size / 512
      if (shadowLight.shadow.map) { shadowLight.shadow.map.dispose(); shadowLight.shadow.map = null }
    }
    applyResolution()
    // Bundled Three r108 reads gammaOutput, not the later outputEncoding API.
    renderer.gammaOutput = true
    renderer.gammaFactor = 2.2
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = .88
    renderer.shadowMap.enabled = true
    // PCF samples the map 17 times per lit fragment where PCFSoft needs 36.
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.setClearColor(0, 0)
    assembly = createAssembly(THREE, await readBinary(), loadImage)
    await assembly.ready
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, width / height, .1, 100)
    scene.add(assembly.root)
    scene.add(new THREE.HemisphereLight(0xf6f4ee, 0x596474, .28))
    function light(color, intensity, xyz, shadow) {
      const l = new THREE.DirectionalLight(color, intensity)
      l.position.set(...xyz); l.target.position.set(0, 2, -2)
      l.castShadow = Boolean(shadow)
      if (shadow) {
        Object.assign(l.shadow.camera, { left: -5, right: 5, top: 10, bottom: -6, near: 1, far: 40 })
        l.shadow.bias = -.00003
        shadowLight = l
        applyShadowQuality()
      }
      scene.add(l, l.target)
    }
    light(0xffeee0, 1.25, [-6, 10, 2], true)
    light(0xdce8ff, .75, [6, 8, -7], false)
    light(0xffffff, .16, [3, 4, 8], false)
    // Render a local studio cubemap once, so highlights describe the curved shell.
    const studio = new THREE.Scene()
    studio.background = new THREE.Color(.10, .11, .13)
    const panels = []
    for (const [x, y, z, sx, sy] of [[-6, 2, 8, 5, 12], [7, 3, -6, 3, 10], [0, 10, 0, 7, 7]]) {
      const p = new THREE.Mesh(new THREE.PlaneBufferGeometry(sx, sy), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }))
      p.position.set(x, y, z); p.lookAt(0, 0, 0); studio.add(p); panels.push(p)
    }
    const cube = new THREE.CubeCamera(.1, 50, 256)
    cube.renderTarget.texture.generateMipmaps = true
    cube.renderTarget.texture.minFilter = THREE.LinearMipmapLinearFilter
    // Store linear radiance, applying the display transform only to the final image.
    renderer.gammaOutput = false; renderer.toneMapping = THREE.NoToneMapping
    cube.update(renderer, studio); environment = cube.renderTarget
    renderer.gammaOutput = true; renderer.toneMapping = THREE.ACESFilmicToneMapping
    for (const p of panels) { p.geometry.dispose(); p.material.dispose() }
    for (const mat of assembly.resources.materials) {
      mat.envMap = environment.texture
      mat.envMapIntensity = /suede|felt/.test(mat.name) ? .16 : (/leather/.test(mat.name) ? 1.3 : .80)
      mat.needsUpdate = true
    }
    const base = assembly.nodes.find(n => n.name === 'BasePivot')
    const lid = assembly.nodes.find(n => n.name === 'LidPivot')
    const dice = assembly.nodes.filter(n => n.name.startsWith('Dice '))
    const extra = dice[0].clone(true); extra.name = 'Dice 6'; base.add(extra); dice.push(extra)
    let progress = 0, state = {}, layout, layoutRevision, lastCount, visible = true, disposed = false, raf = null
    let closing = null, shakeStart = 0
    let previousFrame = 0, frameTotal = 0, frameCount = 0, calmWindows = 0
    const point = new THREE.Vector3(), direction = new THREE.Vector3(0, .5, Math.sqrt(.75))
    const up = new THREE.Vector3(0, direction.z, -direction.y)
    // Each fit only ever reads flat projections of a swept vertex, so the sweep
    // stores those instead of ~95k live Vector3 objects and the churn they cause.
    const spread = [], floor = []
    for (let i = 0; i <= 20; i++) {
      assembly.pose(i / 20)
      for (const node of [lid, base.children.find(n => n.name.startsWith('Base -'))]) node.traverse(mesh => {
        if (!mesh.isMesh) return
        const pos = mesh.geometry.attributes.position
        for (let k = 0; k < pos.count; k++) {
          point.fromBufferAttribute(pos, k).applyMatrix4(mesh.matrixWorld)
          spread.push(Math.abs(point.x), point.dot(direction))
          if (node !== lid) floor.push(point.dot(direction), point.dot(up))
        }
      })
    }
    const spreadFit = Float32Array.from(spread), floorFit = Float32Array.from(floor)
    spread.length = floor.length = 0
    const target = new THREE.Vector3(0, 2.5, -2.4)
    // Camera-up is perpendicular to the view direction and the target never leaves
    // the x = 0 plane, so sliding it below leaves these projections untouched.
    const targetDepth = target.dot(direction)
    function resize(w, h) {
      viewWidth = w; viewHeight = h
      applyResolution()
      camera.aspect = w / h; camera.updateProjectionMatrix()
      const tanY = Math.tan(camera.fov * Math.PI / 360), tanX = tanY * camera.aspect
      // Fill the width without zooming out to contain the rising, open lid.
      let distance = 0
      for (let i = 0; i < spreadFit.length; i += 2) distance = Math.max(distance, spreadFit[i + 1] - targetDepth + spreadFit[i] * 1.08 / tanX)
      // Anchor the base near the bottom throughout its forward tilt. Moving the
      // target along camera-up preserves depth and the width fit calculated above.
      let targetUp = Infinity
      for (let i = 0; i < floorFit.length; i += 2) targetUp = Math.min(targetUp, floorFit[i + 1] + .94 * tanY * (distance + targetDepth - floorFit[i]))
      target.addScaledVector(up, targetUp - target.dot(up))
      camera.position.copy(target).addScaledVector(direction, distance); camera.lookAt(target)
    }
    resize(width, height)
    function draw() {
      if (!visible || disposed) return
      // A fully seated opaque lid hides every die. Skip those covered triangles
      // during the shake while retaining all dice objects and their exact values.
      for (const die of dice) for (const mesh of die.children) mesh.visible = progress > .001
      assembly.pose(progress)
      renderer.render(scene, camera)
    }
    function tick() {
      raf = null
      if (!visible || disposed) return
      const now = Date.now()
      if (closing) {
        const t = Math.min(1, (now - closing.start) / COVER_DURATION_MS)
        progress = closing.from * (1 - t * t * (3 - 2 * t))
        if (t === 1) closing = null
      }
      if (state.phase === 'shaking') {
        const t = (now - shakeStart) / 1000
        assembly.root.position.set(Math.sin(t * 38) * .20, Math.abs(Math.sin(t * 32)) * .16, 0)
        assembly.root.rotation.z = Math.sin(t * 33) * .065
      } else { assembly.root.position.set(0, 0, 0); assembly.root.rotation.z = 0 }
      draw()
      // Frame spacing is the only honest measure of GPU cost here, so quality is
      // judged solely across the runs that render back to back on their own.
      if (closing || state.phase === 'shaking') { measure(now); raf = canvas.requestAnimationFrame(tick) }
      else previousFrame = 0
    }
    function measure(now) {
      const delta = now - previousFrame
      previousFrame = now
      if (delta === now || delta > 200) return
      frameTotal += delta; frameCount += 1
      if (frameCount < 24) return
      const average = frameTotal / frameCount
      frameTotal = frameCount = 0
      // Give up a step of resolution below ~48fps, and only climb back after three
      // calm windows so that one smooth burst cannot start an oscillation.
      if (average > 21 && quality < QUALITY.length - 1) { quality += 1; calmWindows = 0 }
      else if (average < 17.4 && quality > 0 && (calmWindows += 1) >= 3) { quality -= 1; calmWindows = 0 }
      else return
      applyResolution(); applyShadowQuality()
    }
    function schedule() {
      if (disposed || !visible || raf !== null) return
      raf = canvas.requestAnimationFrame(tick)
    }
    function update(next) {
      if (disposed) return
      const previous = state
      state = next
      if (!layout || next.rollRevision !== layoutRevision || next.diceCount !== lastCount) {
        layout = createLayout(next.diceCount); layoutRevision = next.rollRevision; lastCount = next.diceCount
      }
      const diceChanged = next.rollRevision !== previous.rollRevision || next.diceCount !== previous.diceCount
      if (diceChanged) for (let i = 0; i < dice.length; i++) {
        dice[i].visible = i < next.diceCount
        if (!dice[i].visible) continue
        const pose = layout[i], normal = new THREE.Vector3(...FACE_NORMALS[next.dice[i].value])
        dice[i].position.set(pose.x, .578, pose.z - 3.12)
        dice[i].scale.setScalar(.47)
        dice[i].quaternion.setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0))
        dice[i].quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), pose.yaw))
      }
      if (next.phase === 'covering' && previous.phase !== 'covering' && progress > 0) closing = { from: progress, start: Date.now() }
      else if (next.phase !== 'covering') { closing = null; progress = next.lidProgress }
      if (next.phase === 'shaking' && previous.phase !== 'shaking') shakeStart = Date.now()
      // A drag emits states faster than the display refreshes; letting the next
      // frame pick up the newest progress renders once per refresh, not per event.
      schedule()
    }
    function suspend() { visible = false; previousFrame = 0; if (raf !== null) canvas.cancelAnimationFrame(raf); raf = null }
    function resume() {
      if (disposed) return
      visible = true
      previousFrame = 0
      if (raf !== null) canvas.cancelAnimationFrame(raf)
      raf = null
      schedule()
    }
    function dispose() {
      if (disposed) return
      suspend(); disposed = true
      assembly.resources.geometries.forEach(x => x.dispose())
      assembly.resources.materials.forEach(x => x.dispose())
      assembly.resources.textures.forEach(x => x.dispose())
      scene.traverse(n => { if (n.isLight && n.shadow && n.shadow.map) n.shadow.map.dispose() })
      environment.dispose(); renderer.dispose()
    }
    function inspect() {
      return { progress, count: dice.filter(d => d.visible).length, triangles: renderer.info.render.triangles,
        quality, pixelRatio: renderer.getPixelRatio(), shadowSize: shadowLight.shadow.mapSize.width,
        points: state.dice && state.dice.map(d => d.value), phase: state.phase, disposed,
        dice: dice.filter(d => d.visible).map((d, i) => ({ value: state.dice[i].value, position: d.position.toArray(),
          localTop: new THREE.Vector3(...FACE_NORMALS[state.dice[i].value]).applyQuaternion(d.quaternion).toArray() })),
        lidPosition: lid.position.toArray(), baseQuaternion: base.quaternion.toArray() }
    }
    assembly.pose(0)
    return { update, resize(w, h) { resize(w, h); draw() }, suspend, resume, dispose, inspect,
      // The drawing buffer only clears once the frame reaches the compositor, so
      // reading it back inside this task needs no preserved buffer to copy from.
      snapshot() {
        if (typeof canvas.toDataURL !== 'function') return ''
        draw()
        const data = canvas.toDataURL('image/png')
        return typeof data === 'string' && data.length > 1024 ? data : ''
      } }
  } catch (error) {
    if (assembly) for (const key of Object.keys(assembly.resources)) assembly.resources[key].forEach(x => x.dispose())
    if (environment) environment.dispose()
    if (renderer) renderer.dispose()
    throw error
  }
}
module.exports = { createAssembly, createShakerScene }
