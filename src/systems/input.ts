export class InputManager {
  private keys: Set<string> = new Set();
  private mouseButtons: Set<number> = new Set();
  private mouseButtonsPressed: Set<number> = new Set();
  mouseScreenX: number = 0;
  mouseScreenY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseButtons.clear();
    });

    canvas.addEventListener('mousemove', (e) => {
      this.mouseScreenX = e.offsetX;
      this.mouseScreenY = e.offsetY;
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouseButtons.add(e.button);
      this.mouseButtonsPressed.add(e.button);
      e.preventDefault();
    });
    canvas.addEventListener('mouseup', (e) => {
      this.mouseButtons.delete(e.button);
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  isMouseDown(button: number = 0): boolean {
    return this.mouseButtons.has(button);
  }

  /** True only on the frame the button was first pressed. */
  wasMousePressed(button: number = 0): boolean {
    return this.mouseButtonsPressed.has(button);
  }

  /** Call at end of each frame to reset edge-detected state. */
  endFrame(): void {
    this.mouseButtonsPressed.clear();
  }
}
