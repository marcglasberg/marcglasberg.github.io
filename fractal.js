/* Flowing, domain-warped fractal inspired by the background at https://pid.com.br/. */
(() => {
  const canvas = document.querySelector('.profile-fractal');
  const profile = canvas.closest('.profile-band');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  // The CSS background remains visible if WebGL is unavailable.
  if (!gl) return;

  const vertex = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;
  const fragment = `
    precision mediump float;
    uniform vec2 resolution;
    uniform vec2 pointer;
    uniform float time;
    uniform float darkTheme;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float noise(vec2 p) {
      vec2 cell = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(cell), hash(cell + vec2(1., 0.)), u.x),
                 mix(hash(cell + vec2(0., 1.)), hash(cell + vec2(1., 1.)), u.x), u.y);
    }
    float fractal(vec2 p) {
      float value = 0., amplitude = .5;
      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(.17, .31);
        amplitude *= .55;
      }
      return value;
    }
    void main() {
      vec2 uv = (gl_FragCoord.xy - .5 * resolution) / min(resolution.x, resolution.y);
      vec2 cursor = pointer * 2. - 1.;
      cursor.x *= resolution.x / resolution.y;
      float t = time * .09;
      float influence = exp(-4. * distance(uv, cursor * .35));
      vec2 flow = uv * 2. + (uv - cursor * .15) * influence * .35;
      vec2 warp = vec2(fractal(flow + vec2(t, -t)), fractal(flow + vec2(-t * .7, t * 1.1)));
      vec2 detail = vec2(fractal(flow * 1.8 + warp * 2. + vec2(1.7, 9.2 - t)),
                         fractal(flow * 1.8 - warp * 2. + vec2(8.3, 2.8 + t)));
      vec2 field = flow + (warp - .5) * 1.6 + (detail - .5) * .8;
      float bands = 1. - smoothstep(.05, .55, abs(sin((field.x + field.y * .75 - t * 4.) * 5.5)));
      float rings = smoothstep(.65, 1.4, abs(sin(length(field + vec2(sin(t), cos(t)) * .15) * 14. - t * 7.)));
      float mist = smoothstep(.28, .82, fractal(field * 1.3 - t));
      float shade = clamp(mist * .4 + bands * .45 + rings * .2, 0., 1.);
      // Deliberately narrow palette: off-white through very light neutral gray.
      // Move the light endpoint 20% toward white; preserve the darker endpoint.
      vec3 offWhite = vec3(.952, .9552, .9488);
      vec3 paleGray = vec3(.895, .903, .895);
      vec3 lightColor = mix(offWhite, paleGray, shade);
      vec3 darkColor = mix(vec3(.055, .090, .075), vec3(.180, .240, .205), shade);
      gl_FragColor = vec4(mix(lightColor, darkColor, darkTheme), 1.);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  }
  const shaders = [compile(gl.VERTEX_SHADER, vertex), compile(gl.FRAGMENT_SHADER, fragment)];
  if (shaders.some(shader => !shader)) {
    shaders.forEach(shader => shader && gl.deleteShader(shader));
    return;
  }
  const program = gl.createProgram();
  if (!program) return;
  shaders.forEach(shader => gl.attachShader(program, shader));
  gl.linkProgram(program);
  shaders.forEach(shader => gl.deleteShader(shader));
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return;
  }
  const buffer = gl.createBuffer();
  if (!buffer) { gl.deleteProgram(program); return; }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.useProgram(program);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, 'resolution');
  const clock = gl.getUniformLocation(program, 'time');
  const pointer = gl.getUniformLocation(program, 'pointer');
  const theme = gl.getUniformLocation(program, 'darkTheme');
  let pointerX = .5, pointerY = .5, targetX = .5, targetY = .5;
  let frame = 0, previousTime = 0, elapsed = 9.5, lastDraw = 0;
  let inView = true, contextLost = false;

  function draw() {
    if (contextLost) return;
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform1f(clock, elapsed);
    gl.uniform2f(pointer, pointerX, pointerY);
    gl.uniform1f(theme, document.documentElement.dataset.theme === 'dark' ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function animate(now) {
    frame = 0;
    // The gentle background only needs 30 fps; freeze time while offscreen.
    if (now - lastDraw >= 1000 / 30) {
      elapsed += previousTime ? Math.min((now - previousTime) / 1000, .1) : 0;
      previousTime = now;
      lastDraw = now;
      pointerX += (targetX - pointerX) * .07;
      pointerY += (targetY - pointerY) * .07;
      draw();
    }
    frame = requestAnimationFrame(animate);
  }
  function syncAnimation() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    if (contextLost || document.hidden || !inView) return;
    draw();
    if (!motion.matches) frame = requestAnimationFrame(animate);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    syncAnimation();
  }
  profile.addEventListener('pointermove', event => {
    if (motion.matches) return;
    const rect = profile.getBoundingClientRect();
    targetX = (event.clientX - rect.left) / rect.width;
    targetY = 1 - (event.clientY - rect.top) / rect.height;
  }, { passive: true });
  profile.addEventListener('pointerleave', () => { targetX = targetY = .5; });
  document.addEventListener('visibilitychange', syncAnimation);
  new MutationObserver(syncAnimation).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  motion.addEventListener('change', () => {
    if (motion.matches) pointerX = pointerY = targetX = targetY = .5;
    syncAnimation();
  });
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncAnimation();
  }).observe(profile);
  new ResizeObserver(resize).observe(profile);
  window.addEventListener('resize', resize, { passive: true });
  canvas.addEventListener('webglcontextlost', () => {
    contextLost = true;
    cancelAnimationFrame(frame);
    // Hiding the unavailable drawing surface exposes the original page background.
    canvas.style.visibility = 'hidden';
  });
  resize();
})();
