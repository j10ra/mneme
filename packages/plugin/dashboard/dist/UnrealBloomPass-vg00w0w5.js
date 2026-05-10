import{b as G,c as C,d as L}from"./main-yzsxa9mk.js";import{Hd as _,Ma as Q,fe as A,md as O,od as Z,sf as z,tf as $,u as F,wd as w}from"./main-k95qm63q.js";import"./main-a8pmq9gd.js";var v={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new _(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class j extends C{constructor(q,X=1,E,I){super();this.strength=X,this.radius=E,this.threshold=I,this.resolution=q!==void 0?new O(q.x,q.y):new O(256,256),this.clearColor=new _(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let D=Math.round(this.resolution.x/2),K=Math.round(this.resolution.y/2);this.renderTargetBright=new w(D,K,{type:Q}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let N=0;N<this.nMips;N++){let W=new w(D,K,{type:Q});W.texture.name="UnrealBloomPass.h"+N,W.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(W);let b=new w(D,K,{type:Q});b.texture.name="UnrealBloomPass.v"+N,b.texture.generateMipmaps=!1,this.renderTargetsVertical.push(b),D=Math.round(D/2),K=Math.round(K/2)}let Y=v;this.highPassUniforms=z.clone(Y.uniforms),this.highPassUniforms.luminosityThreshold.value=I,this.highPassUniforms.smoothWidth.value=0.01,this.materialHighPassFilter=new $({uniforms:this.highPassUniforms,vertexShader:Y.vertexShader,fragmentShader:Y.fragmentShader}),this.separableBlurMaterials=[];let J=[6,10,14,18,22];D=Math.round(this.resolution.x/2),K=Math.round(this.resolution.y/2);for(let N=0;N<this.nMips;N++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(J[N])),this.separableBlurMaterials[N].uniforms.invSize.value=new O(1/D,1/K),D=Math.round(D/2),K=Math.round(K/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=X,this.compositeMaterial.uniforms.bloomRadius.value=0.1;let H=[1,0.8,0.6,0.4,0.2];this.compositeMaterial.uniforms.bloomFactors.value=H,this.bloomTintColors=[new Z(1,1,1),new Z(1,1,1),new Z(1,1,1),new Z(1,1,1),new Z(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=z.clone(G.uniforms),this.blendMaterial=new $({uniforms:this.copyUniforms,vertexShader:G.vertexShader,fragmentShader:G.fragmentShader,premultipliedAlpha:!0,blending:F,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new _,this._oldClearAlpha=1,this._basic=new A,this._fsQuad=new L(null)}dispose(){for(let q=0;q<this.renderTargetsHorizontal.length;q++)this.renderTargetsHorizontal[q].dispose();for(let q=0;q<this.renderTargetsVertical.length;q++)this.renderTargetsVertical[q].dispose();this.renderTargetBright.dispose();for(let q=0;q<this.separableBlurMaterials.length;q++)this.separableBlurMaterials[q].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(q,X){let E=Math.round(q/2),I=Math.round(X/2);this.renderTargetBright.setSize(E,I);for(let D=0;D<this.nMips;D++)this.renderTargetsHorizontal[D].setSize(E,I),this.renderTargetsVertical[D].setSize(E,I),this.separableBlurMaterials[D].uniforms.invSize.value=new O(1/E,1/I),E=Math.round(E/2),I=Math.round(I/2)}render(q,X,E,I,D){q.getClearColor(this._oldClearColor),this._oldClearAlpha=q.getClearAlpha();let K=q.autoClear;if(q.autoClear=!1,q.setClearColor(this.clearColor,0),D)q.state.buffers.stencil.setTest(!1);if(this.renderToScreen)this._fsQuad.material=this._basic,this._basic.map=E.texture,q.setRenderTarget(null),q.clear(),this._fsQuad.render(q);this.highPassUniforms.tDiffuse.value=E.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,q.setRenderTarget(this.renderTargetBright),q.clear(),this._fsQuad.render(q);let Y=this.renderTargetBright;for(let J=0;J<this.nMips;J++)this._fsQuad.material=this.separableBlurMaterials[J],this.separableBlurMaterials[J].uniforms.colorTexture.value=Y.texture,this.separableBlurMaterials[J].uniforms.direction.value=j.BlurDirectionX,q.setRenderTarget(this.renderTargetsHorizontal[J]),q.clear(),this._fsQuad.render(q),this.separableBlurMaterials[J].uniforms.colorTexture.value=this.renderTargetsHorizontal[J].texture,this.separableBlurMaterials[J].uniforms.direction.value=j.BlurDirectionY,q.setRenderTarget(this.renderTargetsVertical[J]),q.clear(),this._fsQuad.render(q),Y=this.renderTargetsVertical[J];if(this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,q.setRenderTarget(this.renderTargetsHorizontal[0]),q.clear(),this._fsQuad.render(q),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,D)q.state.buffers.stencil.setTest(!0);if(this.renderToScreen)q.setRenderTarget(null),this._fsQuad.render(q);else q.setRenderTarget(E),this._fsQuad.render(q);q.setClearColor(this._oldClearColor,this._oldClearAlpha),q.autoClear=K}_getSeparableBlurMaterial(q){let X=[],E=q/3;for(let I=0;I<q;I++)X.push(0.39894*Math.exp(-0.5*I*I/(E*E))/E);return new $({defines:{KERNEL_RADIUS:q},uniforms:{colorTexture:{value:null},invSize:{value:new O(0.5,0.5)},direction:{value:new O(0.5,0.5)},gaussianCoefficients:{value:X}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {

					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;

					for ( int i = 1; i < KERNEL_RADIUS; i ++ ) {

						float x = float( i );
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * w;

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(q){return new $({defines:{NUM_MIPS:q},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}}j.BlurDirectionX=new O(1,0);j.BlurDirectionY=new O(0,1);export{j as UnrealBloomPass};
