// Keyboard input mapped to actions. `pressed` is true only on the update step the key went down.
const Input = (() => {
  // Movement is on the arrow keys; actions sit under the left hand.
  const KEYMAP = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    KeyZ: 'jump', Space: 'jump',
    KeyX: 'attack',
    KeyC: 'shoot',
    ShiftLeft: 'dash', ShiftRight: 'dash',
    Enter: 'start', Escape: 'start',
  };
  const held = {}, pressed = {};

  addEventListener('keydown', e => {
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (!held[a]) pressed[a] = true;
    held[a] = true;
  });
  addEventListener('keyup', e => {
    const a = KEYMAP[e.code];
    if (a) held[a] = false;
  });
  addEventListener('blur', () => { for (const k in held) held[k] = false; });

  return {
    held: a => !!held[a],
    pressed: a => !!pressed[a],
    endStep() { for (const k in pressed) delete pressed[k]; },
  };
})();
