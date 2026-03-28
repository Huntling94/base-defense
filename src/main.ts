const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

canvas.width = 960;
canvas.height = 640;

ctx.fillStyle = '#1a1a2e';
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.fillStyle = '#e0e0e0';
ctx.font = '24px monospace';
ctx.textAlign = 'center';
ctx.fillText('Base Defense', canvas.width / 2, canvas.height / 2);
