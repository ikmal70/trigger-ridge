// Keyboard and mouse input mapped to actions. `pressed` is true only on the update step the input went down.
// WASD moves, Space jumps. The mouse aims (Input.mouse is in screen pixels); left click attacks,
// right click / wheel switches weapon.
const Input = (() => {
  const KEYMAP = {
    KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
    Space: 'jump',
    KeyX: 'attack', KeyJ: 'attack',
    KeyQ: 'switch', KeyC: 'switch',
    KeyV: 'jet', KeyF: 'jet',
    ShiftLeft: 'dash', ShiftRight: 'dash',
    Enter: 'start', Escape: 'start',
  };
  const held = {}, pressed = {};
  const mouse = { x: 0, y: 0, active: false };
  const down = a => { if (!held[a]) pressed[a] = true; held[a] = true; };

  addEventListener('keydown', e => {
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    down(a);
  });
  addEventListener('keyup', e => {
    const a = KEYMAP[e.code];
    if (a) held[a] = false;
  });

  const toScreen = e => {
    const c = document.getElementById('game'), r = c.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * c.width / r.width;
    mouse.y = (e.clientY - r.top) * c.height / r.height;
    mouse.active = true;
  };
  const BUTTONS = { 0: 'attack', 2: 'switch' };
  addEventListener('mousemove', toScreen);
  addEventListener('mousedown', e => {
    const a = BUTTONS[e.button];
    if (!a) return;
    toScreen(e);
    e.preventDefault();
    down(a);
  });
  addEventListener('mouseup', e => {
    const a = BUTTONS[e.button];
    if (a) held[a] = false;
  });
  addEventListener('wheel', e => { if (Math.abs(e.deltaY) > 4) pressed.switch = true; }, { passive: true });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('blur', () => { for (const k in held) held[k] = false; });

  return {
    mouse,
    held: a => !!held[a],
    pressed: a => !!pressed[a],
    endStep() { for (const k in pressed) delete pressed[k]; },
  };
})();
