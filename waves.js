/* Vanta Waves 0.5.24, with the selected gray, height, shininess, and zoom. */
(() => {
  const host = document.querySelector('.profile-waves');
  if (!host || !window.VANTA?.WAVES || !window.THREE) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let effect;
  let inView = true;
  let contextLost = false;

  try {
    effect = window.VANTA.WAVES({
      el: host,
      mouseControls: !motion.matches,
      touchControls: !motion.matches,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      scale: 1,
      scaleMobile: 1,
      color: 0x7f7f7f,
      shininess: 0,
      waveHeight: 16.5,
      zoom: 0.65
    });
  } catch (_) {
    // Keep the CSS background if WebGL is unavailable.
    host.replaceChildren();
    return;
  }
  if (!effect.renderer || !effect.plane) return;

  // Vanta's pinned version exposes its frame handle; freeze the scene rather
  // than continuously rendering when motion is reduced or the hero is hidden.
  function syncAnimation() {
    cancelAnimationFrame(effect.req);
    if (contextLost || document.hidden || !inView) return;
    effect.prevNow = performance.now();
    if (motion.matches) {
      effect.renderer.render(effect.scene, effect.camera);
    } else {
      effect.animationLoop();
    }
  }

  new ResizeObserver(() => {
    effect.resize();
    syncAnimation();
  }).observe(host);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncAnimation();
  }).observe(host);
  document.addEventListener('visibilitychange', syncAnimation);
  motion.addEventListener('change', () => {
    // These are the same callbacks used by the pinned Vanta version.
    const method = motion.matches ? 'removeEventListener' : 'addEventListener';
    window[method]('mousemove', effect.windowMouseMoveWrapper);
    window[method]('scroll', effect.windowMouseMoveWrapper);
    window[method]('touchstart', effect.windowTouchWrapper);
    window[method]('touchmove', effect.windowTouchWrapper);
    syncAnimation();
  });
  effect.renderer.domElement.addEventListener('webglcontextlost', () => {
    contextLost = true;
    cancelAnimationFrame(effect.req);
    effect.renderer.domElement.style.visibility = 'hidden';
  });
  effect.renderer.domElement.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    effect.renderer.domElement.style.visibility = '';
    syncAnimation();
  });
  syncAnimation();
})();
