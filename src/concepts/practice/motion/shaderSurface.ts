type Uniforms = Record<string, number | number[]>;
export type ShaderSurface = { render: (seconds: number) => void; dispose: () => void };

/** Shared, bounded renderer for the adapted React Bits background shaders. */
export function createShaderSurface(host: HTMLElement, fragment: string, uniforms: Uniforms): ShaderSurface | null {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, premultipliedAlpha: false });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null;
  let disposed = false, lost = false, lastTime = 12;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Shader allocation failed');
    shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
    return shader;
  };
  try {
    program = gl.createProgram();
    if (!program) throw new Error('Program allocation failed');
    gl.attachShader(program, compile(gl.VERTEX_SHADER, '#version 300 es\nin vec2 position;\nvoid main(){gl_Position=vec4(position,0.,1.);}'));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader linking failed');
    gl.useProgram(program);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    for (const [key, value] of Object.entries(uniforms)) {
      const location = gl.getUniformLocation(program, key);
      if (typeof value === 'number') gl.uniform1f(location, value);
      else if (value.length === 2) gl.uniform2fv(location, value);
      else gl.uniform3fv(location, value);
    }
  } catch {
    shaders.forEach(shader => gl.deleteShader(shader));
    if (program) gl.deleteProgram(program); if (buffer) gl.deleteBuffer(buffer);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }
  const time = gl.getUniformLocation(program, 'uTime');
  const resolution = gl.getUniformLocation(program, 'uResolution');
  canvas.setAttribute('aria-hidden', 'true'); host.appendChild(canvas);
  const render = (seconds: number) => {
    if (disposed || lost) return;
    lastTime = seconds; gl.uniform1f(time, seconds); gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const resize = () => {
    if (lost || disposed) return;
    // Atmosphere is intentionally soft: bound total shader work independently of retina size.
    const width = host.clientWidth, height = host.clientHeight;
    const ratio = Math.min(1, 1100 / Math.max(1, width));
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resolution, canvas.width, canvas.height); render(lastTime);
  };
  const onLost = (event: Event) => { event.preventDefault(); lost = true; canvas.style.opacity = '0'; host.dataset.shader = 'fallback'; };
  canvas.addEventListener('webglcontextlost', onLost);
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  host.dataset.shader = 'ready';
  return { render, dispose: () => {
    disposed = true; observer.disconnect(); canvas.removeEventListener('webglcontextlost', onLost);
    gl.deleteBuffer(buffer); gl.deleteProgram(program); shaders.forEach(shader => gl.deleteShader(shader));
    canvas.remove(); gl.getExtension('WEBGL_lose_context')?.loseContext();
  } };
}
