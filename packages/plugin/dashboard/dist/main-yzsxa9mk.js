import{Xd as v,Zd as i,ge as p,jg as d}from"./main-k95qm63q.js";var x={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class s{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}var t=new d(-1,1,1,-1,0,1);class n extends i{constructor(){super();this.setAttribute("position",new v([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new v([0,2,0,0,2,0],2))}}var a=new n;class h{constructor(o){this._mesh=new p(a,o)}dispose(){this._mesh.geometry.dispose()}render(o){o.render(this._mesh,t)}get material(){return this._mesh.material}set material(o){this._mesh.material=o}}
export{x as b,s as c,h as d};
