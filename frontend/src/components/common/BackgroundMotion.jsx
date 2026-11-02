import React, { useEffect, useRef } from 'react';
import transparentShield from '../../assets/transparent.png';

/**
 * BackgroundMotion:
 * - Fluid WebGL shader running an animated 2D Simplex noise field in luminous light porcelain/azure tones.
 * - Floating scroll parallax shield outlines in the background.
 * - Zero click interference (pointer-events-none throughout).
 */
export default function BackgroundMotion() {
  const canvasRef = useRef(null);
  const shield1Ref = useRef(null);
  const shield2Ref = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId;
    let gl = canvas.getContext('webgl');
    const handlePanelPointerMove = (event) => {
      const panel = event.target.closest('.glass-panel');
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      panel.style.setProperty('--mouseX', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      panel.style.setProperty('--mouseY', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    };
    document.addEventListener('pointermove', handlePanelPointerMove, { passive: true });

    if (!gl) {
      return () => {
        document.removeEventListener('pointermove', handlePanelPointerMove);
      };
    }

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // 1. Simplex Noise WebGL Shader tuned for Luminous Light Palette
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;

      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5; vec3 a0 = x - floor(x + 0.5);
        vec3 g = a0 * vec3(x0.x,x12.xz) + h * vec3(x0.y,x12.yw);
        vec3 t = 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        return 0.5 + 0.5 * (130.0 * m * g * t).x;
      }

      void main() {
        vec2 uv = v_texCoord;
        float n1 = snoise(uv * 1.2 + u_time * 0.03);
        float n2 = snoise(uv * 2.0 - u_time * 0.05 + 50.0);
        
        vec3 color1 = vec3(0.025, 0.06, 0.15); 
        vec3 color2 = vec3(0.04, 0.11, 0.28); 
        vec3 accent = vec3(0.08, 0.35, 0.75); 
        
        vec3 baseColor = mix(color1, color2, n1);
        gl_FragColor = vec4(mix(baseColor, accent, n2 * 0.25), 1.0);
      }
    `;

    function compileShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');

    function render(t) {
      if (!gl || !canvas) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    }
    animId = requestAnimationFrame(render);

    // 2. Parallax Scrolling for Background Shields (Exact User Multipliers)
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (shield1Ref.current) {
        shield1Ref.current.style.transform = `translateY(${scrollY * -0.4}px) rotate(${scrollY * 0.05}deg)`;
      }
      if (shield2Ref.current) {
        shield2Ref.current.style.transform = `translateY(${scrollY * -0.2}px) rotate(${scrollY * -0.03}deg)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('pointermove', handlePanelPointerMove);
      if (gl && buf) {
        gl.deleteBuffer(buf);
        gl.deleteProgram(prog);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-2] overflow-hidden select-none" aria-hidden="true">
      <div className="background-atmosphere">
        <span className="atmosphere-plane atmosphere-plane-one" />
        <span className="atmosphere-plane atmosphere-plane-two" />
        <span className="atmosphere-plane atmosphere-plane-three" />
        <span className="atmosphere-orb atmosphere-orb-blue" />
        <span className="atmosphere-orb atmosphere-orb-cyan" />
      </div>

      {/* WebGL Fluid Background Canvas */}
      <div className="absolute inset-0 w-full h-full opacity-75">
        <canvas
          ref={canvasRef}
          id="shader-canvas"
          className="w-full h-full block"
        />
      </div>

      {/* MOTION: Background Scroll Shields */}
      <img
        ref={shield1Ref}
        id="bg-shield-1"
        src="/app/sentinel-shield-blue.png"
        alt=""
        className="background-shield background-shield-one fixed right-[-5%] top-[10%] w-[450px] h-[450px] opacity-[0.15] pointer-events-none z-[-1] transition-transform duration-700 ease-out mix-blend-screen blur-[3px]"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <img
        ref={shield2Ref}
        id="bg-shield-2"
        src="/app/aegis-ai-shield.png"
        alt=""
        className="background-shield background-shield-two fixed left-[-10%] bottom-[5%] w-[600px] h-[600px] opacity-[0.1] pointer-events-none z-[-1] transition-transform duration-1000 ease-out mix-blend-screen blur-[5px]"
        onError={(e) => { e.target.style.display = 'none'; }}
      />

      <img
        src={transparentShield}
        alt=""
        className="background-shield background-shield-transparent background-shield-transparent-left"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />

      <img
        src={transparentShield}
        alt=""
        className="background-shield background-shield-transparent background-shield-transparent-right"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />

    </div>
  );
}
