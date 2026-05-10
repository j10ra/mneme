var PY="184",mU={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},dU={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},TY=0,WZ=1,SY=2,lU=3,uU=0,o7=1,jY=2,O7=3,R7=0,sJ=1,z9=2,I9=0,a7=1,KZ=2,YZ=3,HZ=4,yY=5,cU=6,k7=100,vY=101,fY=102,bY=103,hY=104,xY=200,gY=201,pY=202,mY=203,dY=204,lY=205,uY=206,cY=207,nY=208,sY=209,iY=210,oY=211,aY=212,rY=213,tY=214,eY=0,JH=1,QH=2,XZ=3,$H=4,ZH=5,WH=6,KH=7,YH=0,HH=1,XH=2,q9=0,UZ=1,GZ=2,EZ=3,NZ=4,qZ=5,DZ=6,FZ=7,nU="attached",sU="detached",iU=300,M7=301,C8=302,NQ=303,qQ=304,r7=306,UH=1000,DQ=1001,GH=1002,Q8=1003,EH=1004,oU=1004,t7=1005,aU=1005,iJ=1006,FQ=1007,rU=1007,P8=1008,tU=1008,D9=1009,NH=1010,qH=1011,e7=1012,OZ=1013,$8=1014,g9=1015,p9=1016,RZ=1017,kZ=1018,L7=1020,DH=35902,FH=35899,OH=1021,RH=1022,_9=1023,T8=1026,S8=1027,kH=1028,MZ=1029,j8=1030,LZ=1031,eU=1032,VZ=1033,OQ=33776,RQ=33777,kQ=33778,MQ=33779,BZ=35840,zZ=35841,IZ=35842,_Z=35843,wZ=36196,AZ=37492,CZ=37496,PZ=37488,TZ=37489,LQ=37490,SZ=37491,jZ=37808,yZ=37809,vZ=37810,fZ=37811,bZ=37812,hZ=37813,xZ=37814,gZ=37815,pZ=37816,mZ=37817,dZ=37818,lZ=37819,uZ=37820,cZ=37821,nZ=36492,sZ=36494,iZ=36495,oZ=36283,aZ=36284,VQ=36285,rZ=36286,JG=2200,QG=2201,$G=2202,ZG=2300,WG=2301,KG=2302,YG=2303,HG=2400,XG=2401,UG=2402,GG=2500,EG=2501,NG=0,qG=1,DG=2,FG=3200,OG=3201,RG=3202,kG=3203,tZ=0,MH=1,y8="",LH="srgb",eZ="srgb-linear",JW="linear",FJ="srgb",MG="",LG="rg",VG="ga",BG=0,zG=7680,IG=7681,_G=7682,wG=7683,AG=34055,CG=34056,PG=5386,TG=512,SG=513,jG=514,yG=515,vG=516,fG=517,bG=518,hG=519,VH=512,BH=513,zH=514,BQ=515,IH=516,_H=517,zQ=518,wH=519,xG=35044,gG=35048,pG=35040,mG=35045,dG=35049,lG=35041,uG=35046,cG=35050,nG=35042,sG="100",QW="300 es",$W=2000,iG=2001,oG={COMPUTE:"compute",RENDER:"render"},aG={PERSPECTIVE:"perspective",LINEAR:"linear",FLAT:"flat"},rG={NORMAL:"normal",CENTROID:"centroid",SAMPLE:"sample",FIRST:"first",EITHER:"either"},tG={TEXTURE_COMPARE:"depthTextureCompare"};function eG(J){for(let Q=J.length-1;Q>=0;--Q)if(J[Q]>=65535)return!0;return!1}var JE={Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array};function X7(J,Q){return new JE[J](Q)}function AH(J){return ArrayBuffer.isView(J)&&!(J instanceof DataView)}function G7(J){return document.createElementNS("http://www.w3.org/1999/xhtml",J)}function CH(){let J=G7("canvas");return J.style.display="block",J}var LK={},J8=null;function QE(J){J8=J}function $E(){return J8}function u7(...J){let Q="THREE."+J.shift();if(J8)J8("log",Q,...J);else console.log(Q,...J)}function PH(J){let Q=J[0];if(typeof Q==="string"&&Q.startsWith("TSL:")){let $=J[1];if($&&$.isStackTrace)J[0]+=" "+$.getLocation();else J[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return J}function X0(...J){J=PH(J);let Q="THREE."+J.shift();if(J8)J8("warn",Q,...J);else{let $=J[0];if($&&$.isStackTrace)console.warn($.getError(Q));else console.warn(Q,...J)}}function T0(...J){J=PH(J);let Q="THREE."+J.shift();if(J8)J8("error",Q,...J);else{let $=J[0];if($&&$.isStackTrace)console.error($.getError(Q));else console.error(Q,...J)}}function HQ(...J){let Q=J.join(" ");if(Q in LK)return;LK[Q]=!0,X0(...J)}function h1(){if(typeof self<"u"&&typeof self.scheduler<"u"&&typeof self.scheduler.yield<"u")return self.scheduler.yield();return new Promise((J)=>{requestAnimationFrame(J)})}function TH(J,Q,$){return new Promise(function(Z,W){function K(){switch(J.clientWaitSync(Q,J.SYNC_FLUSH_COMMANDS_BIT,0)){case J.WAIT_FAILED:W();break;case J.TIMEOUT_EXPIRED:setTimeout(K,$);break;default:Z()}}setTimeout(K,$)})}var SH={[0]:1,[2]:6,[4]:7,[3]:5,[1]:0,[6]:2,[7]:4,[5]:3};class K9{addEventListener(J,Q){if(this._listeners===void 0)this._listeners={};let $=this._listeners;if($[J]===void 0)$[J]=[];if($[J].indexOf(Q)===-1)$[J].push(Q)}hasEventListener(J,Q){let $=this._listeners;if($===void 0)return!1;return $[J]!==void 0&&$[J].indexOf(Q)!==-1}removeEventListener(J,Q){let $=this._listeners;if($===void 0)return;let Z=$[J];if(Z!==void 0){let W=Z.indexOf(Q);if(W!==-1)Z.splice(W,1)}}dispatchEvent(J){let Q=this._listeners;if(Q===void 0)return;let $=Q[J.type];if($!==void 0){J.target=this;let Z=$.slice(0);for(let W=0,K=Z.length;W<K;W++)Z[W].call(this,J);J.target=null}}}var fJ=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],VK=1234567,z8=Math.PI/180,I8=180/Math.PI;function eJ(){let J=Math.random()*4294967295|0,Q=Math.random()*4294967295|0,$=Math.random()*4294967295|0,Z=Math.random()*4294967295|0;return(fJ[J&255]+fJ[J>>8&255]+fJ[J>>16&255]+fJ[J>>24&255]+"-"+fJ[Q&255]+fJ[Q>>8&255]+"-"+fJ[Q>>16&15|64]+fJ[Q>>24&255]+"-"+fJ[$&63|128]+fJ[$>>8&255]+"-"+fJ[$>>16&255]+fJ[$>>24&255]+fJ[Z&255]+fJ[Z>>8&255]+fJ[Z>>16&255]+fJ[Z>>24&255]).toLowerCase()}function m0(J,Q,$){return Math.max(Q,Math.min($,J))}function ZW(J,Q){return(J%Q+Q)%Q}function ZE(J,Q,$,Z,W){return Z+(J-Q)*(W-Z)/($-Q)}function WE(J,Q,$){if(J!==Q)return($-J)/(Q-J);else return 0}function m7(J,Q,$){return(1-$)*J+$*Q}function KE(J,Q,$,Z){return m7(J,Q,1-Math.exp(-$*Z))}function YE(J,Q=1){return Q-Math.abs(ZW(J,Q*2)-Q)}function HE(J,Q,$){if(J<=Q)return 0;if(J>=$)return 1;return J=(J-Q)/($-Q),J*J*(3-2*J)}function XE(J,Q,$){if(J<=Q)return 0;if(J>=$)return 1;return J=(J-Q)/($-Q),J*J*J*(J*(J*6-15)+10)}function UE(J,Q){return J+Math.floor(Math.random()*(Q-J+1))}function GE(J,Q){return J+Math.random()*(Q-J)}function EE(J){return J*(0.5-Math.random())}function NE(J){if(J!==void 0)VK=J;let Q=VK+=1831565813;return Q=Math.imul(Q^Q>>>15,Q|1),Q^=Q+Math.imul(Q^Q>>>7,Q|61),((Q^Q>>>14)>>>0)/4294967296}function qE(J){return J*z8}function DE(J){return J*I8}function FE(J){return(J&J-1)===0&&J!==0}function OE(J){return Math.pow(2,Math.ceil(Math.log(J)/Math.LN2))}function RE(J){return Math.pow(2,Math.floor(Math.log(J)/Math.LN2))}function kE(J,Q,$,Z,W){let{cos:K,sin:Y}=Math,H=K($/2),X=Y($/2),U=K((Q+Z)/2),E=Y((Q+Z)/2),N=K((Q-Z)/2),G=Y((Q-Z)/2),q=K((Z-Q)/2),O=Y((Z-Q)/2);switch(W){case"XYX":J.set(H*E,X*N,X*G,H*U);break;case"YZY":J.set(X*G,H*E,X*N,H*U);break;case"ZXZ":J.set(X*N,X*G,H*E,H*U);break;case"XZX":J.set(H*E,X*O,X*q,H*U);break;case"YXY":J.set(X*q,H*E,X*O,H*U);break;case"ZYZ":J.set(X*O,X*q,H*E,H*U);break;default:X0("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+W)}}function dJ(J,Q){switch(Q.constructor){case Float32Array:return J;case Uint32Array:return J/4294967295;case Uint16Array:return J/65535;case Uint8Array:return J/255;case Int32Array:return Math.max(J/2147483647,-1);case Int16Array:return Math.max(J/32767,-1);case Int8Array:return Math.max(J/127,-1);default:throw Error("Invalid component type.")}}function o0(J,Q){switch(Q.constructor){case Float32Array:return J;case Uint32Array:return Math.round(J*4294967295);case Uint16Array:return Math.round(J*65535);case Uint8Array:return Math.round(J*255);case Int32Array:return Math.round(J*2147483647);case Int16Array:return Math.round(J*32767);case Int8Array:return Math.round(J*127);default:throw Error("Invalid component type.")}}var ME={DEG2RAD:z8,RAD2DEG:I8,generateUUID:eJ,clamp:m0,euclideanModulo:ZW,mapLinear:ZE,inverseLerp:WE,lerp:m7,damp:KE,pingpong:YE,smoothstep:HE,smootherstep:XE,randInt:UE,randFloat:GE,randFloatSpread:EE,seededRandom:NE,degToRad:qE,radToDeg:DE,isPowerOfTwo:FE,ceilPowerOfTwo:OE,floorPowerOfTwo:RE,setQuaternionFromProperEuler:kE,normalize:o0,denormalize:dJ};class r{static{r.prototype.isVector2=!0}constructor(J=0,Q=0){this.x=J,this.y=Q}get width(){return this.x}set width(J){this.x=J}get height(){return this.y}set height(J){this.y=J}set(J,Q){return this.x=J,this.y=Q,this}setScalar(J){return this.x=J,this.y=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;default:throw Error("index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;default:throw Error("index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y)}copy(J){return this.x=J.x,this.y=J.y,this}add(J){return this.x+=J.x,this.y+=J.y,this}addScalar(J){return this.x+=J,this.y+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this}subScalar(J){return this.x-=J,this.y-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this}multiply(J){return this.x*=J.x,this.y*=J.y,this}multiplyScalar(J){return this.x*=J,this.y*=J,this}divide(J){return this.x/=J.x,this.y/=J.y,this}divideScalar(J){return this.multiplyScalar(1/J)}applyMatrix3(J){let Q=this.x,$=this.y,Z=J.elements;return this.x=Z[0]*Q+Z[3]*$+Z[6],this.y=Z[1]*Q+Z[4]*$+Z[7],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this}clamp(J,Q){return this.x=m0(this.x,J.x,Q.x),this.y=m0(this.y,J.y,Q.y),this}clampScalar(J,Q){return this.x=m0(this.x,J,Q),this.y=m0(this.y,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(m0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(J){return this.x*J.x+this.y*J.y}cross(J){return this.x*J.y-this.y*J.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(J){let Q=Math.sqrt(this.lengthSq()*J.lengthSq());if(Q===0)return Math.PI/2;let $=this.dot(J)/Q;return Math.acos(m0($,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let Q=this.x-J.x,$=this.y-J.y;return Q*Q+$*$}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this}equals(J){return J.x===this.x&&J.y===this.y}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this}rotateAround(J,Q){let $=Math.cos(Q),Z=Math.sin(Q),W=this.x-J.x,K=this.y-J.y;return this.x=W*$-K*Z+J.x,this.y=W*Z+K*$+J.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class xJ{constructor(J=0,Q=0,$=0,Z=1){this.isQuaternion=!0,this._x=J,this._y=Q,this._z=$,this._w=Z}static slerpFlat(J,Q,$,Z,W,K,Y){let H=$[Z+0],X=$[Z+1],U=$[Z+2],E=$[Z+3],N=W[K+0],G=W[K+1],q=W[K+2],O=W[K+3];if(E!==O||H!==N||X!==G||U!==q){let R=H*N+X*G+U*q+E*O;if(R<0)N=-N,G=-G,q=-q,O=-O,R=-R;let F=1-Y;if(R<0.9995){let D=Math.acos(R),k=Math.sin(D);F=Math.sin(F*D)/k,Y=Math.sin(Y*D)/k,H=H*F+N*Y,X=X*F+G*Y,U=U*F+q*Y,E=E*F+O*Y}else{H=H*F+N*Y,X=X*F+G*Y,U=U*F+q*Y,E=E*F+O*Y;let D=1/Math.sqrt(H*H+X*X+U*U+E*E);H*=D,X*=D,U*=D,E*=D}}J[Q]=H,J[Q+1]=X,J[Q+2]=U,J[Q+3]=E}static multiplyQuaternionsFlat(J,Q,$,Z,W,K){let Y=$[Z],H=$[Z+1],X=$[Z+2],U=$[Z+3],E=W[K],N=W[K+1],G=W[K+2],q=W[K+3];return J[Q]=Y*q+U*E+H*G-X*N,J[Q+1]=H*q+U*N+X*E-Y*G,J[Q+2]=X*q+U*G+Y*N-H*E,J[Q+3]=U*q-Y*E-H*N-X*G,J}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get w(){return this._w}set w(J){this._w=J,this._onChangeCallback()}set(J,Q,$,Z){return this._x=J,this._y=Q,this._z=$,this._w=Z,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(J){return this._x=J.x,this._y=J.y,this._z=J.z,this._w=J.w,this._onChangeCallback(),this}setFromEuler(J,Q=!0){let{_x:$,_y:Z,_z:W,_order:K}=J,Y=Math.cos,H=Math.sin,X=Y($/2),U=Y(Z/2),E=Y(W/2),N=H($/2),G=H(Z/2),q=H(W/2);switch(K){case"XYZ":this._x=N*U*E+X*G*q,this._y=X*G*E-N*U*q,this._z=X*U*q+N*G*E,this._w=X*U*E-N*G*q;break;case"YXZ":this._x=N*U*E+X*G*q,this._y=X*G*E-N*U*q,this._z=X*U*q-N*G*E,this._w=X*U*E+N*G*q;break;case"ZXY":this._x=N*U*E-X*G*q,this._y=X*G*E+N*U*q,this._z=X*U*q+N*G*E,this._w=X*U*E-N*G*q;break;case"ZYX":this._x=N*U*E-X*G*q,this._y=X*G*E+N*U*q,this._z=X*U*q-N*G*E,this._w=X*U*E+N*G*q;break;case"YZX":this._x=N*U*E+X*G*q,this._y=X*G*E+N*U*q,this._z=X*U*q-N*G*E,this._w=X*U*E-N*G*q;break;case"XZY":this._x=N*U*E-X*G*q,this._y=X*G*E-N*U*q,this._z=X*U*q+N*G*E,this._w=X*U*E+N*G*q;break;default:X0("Quaternion: .setFromEuler() encountered an unknown order: "+K)}if(Q===!0)this._onChangeCallback();return this}setFromAxisAngle(J,Q){let $=Q/2,Z=Math.sin($);return this._x=J.x*Z,this._y=J.y*Z,this._z=J.z*Z,this._w=Math.cos($),this._onChangeCallback(),this}setFromRotationMatrix(J){let Q=J.elements,$=Q[0],Z=Q[4],W=Q[8],K=Q[1],Y=Q[5],H=Q[9],X=Q[2],U=Q[6],E=Q[10],N=$+Y+E;if(N>0){let G=0.5/Math.sqrt(N+1);this._w=0.25/G,this._x=(U-H)*G,this._y=(W-X)*G,this._z=(K-Z)*G}else if($>Y&&$>E){let G=2*Math.sqrt(1+$-Y-E);this._w=(U-H)/G,this._x=0.25*G,this._y=(Z+K)/G,this._z=(W+X)/G}else if(Y>E){let G=2*Math.sqrt(1+Y-$-E);this._w=(W-X)/G,this._x=(Z+K)/G,this._y=0.25*G,this._z=(H+U)/G}else{let G=2*Math.sqrt(1+E-$-Y);this._w=(K-Z)/G,this._x=(W+X)/G,this._y=(H+U)/G,this._z=0.25*G}return this._onChangeCallback(),this}setFromUnitVectors(J,Q){let $=J.dot(Q)+1;if($<0.00000001)if($=0,Math.abs(J.x)>Math.abs(J.z))this._x=-J.y,this._y=J.x,this._z=0,this._w=$;else this._x=0,this._y=-J.z,this._z=J.y,this._w=$;else this._x=J.y*Q.z-J.z*Q.y,this._y=J.z*Q.x-J.x*Q.z,this._z=J.x*Q.y-J.y*Q.x,this._w=$;return this.normalize()}angleTo(J){return 2*Math.acos(Math.abs(m0(this.dot(J),-1,1)))}rotateTowards(J,Q){let $=this.angleTo(J);if($===0)return this;let Z=Math.min(1,Q/$);return this.slerp(J,Z),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(J){return this._x*J._x+this._y*J._y+this._z*J._z+this._w*J._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let J=this.length();if(J===0)this._x=0,this._y=0,this._z=0,this._w=1;else J=1/J,this._x=this._x*J,this._y=this._y*J,this._z=this._z*J,this._w=this._w*J;return this._onChangeCallback(),this}multiply(J){return this.multiplyQuaternions(this,J)}premultiply(J){return this.multiplyQuaternions(J,this)}multiplyQuaternions(J,Q){let{_x:$,_y:Z,_z:W,_w:K}=J,Y=Q._x,H=Q._y,X=Q._z,U=Q._w;return this._x=$*U+K*Y+Z*X-W*H,this._y=Z*U+K*H+W*Y-$*X,this._z=W*U+K*X+$*H-Z*Y,this._w=K*U-$*Y-Z*H-W*X,this._onChangeCallback(),this}slerp(J,Q){let{_x:$,_y:Z,_z:W,_w:K}=J,Y=this.dot(J);if(Y<0)$=-$,Z=-Z,W=-W,K=-K,Y=-Y;let H=1-Q;if(Y<0.9995){let X=Math.acos(Y),U=Math.sin(X);H=Math.sin(H*X)/U,Q=Math.sin(Q*X)/U,this._x=this._x*H+$*Q,this._y=this._y*H+Z*Q,this._z=this._z*H+W*Q,this._w=this._w*H+K*Q,this._onChangeCallback()}else this._x=this._x*H+$*Q,this._y=this._y*H+Z*Q,this._z=this._z*H+W*Q,this._w=this._w*H+K*Q,this.normalize();return this}slerpQuaternions(J,Q,$){return this.copy(J).slerp(Q,$)}random(){let J=2*Math.PI*Math.random(),Q=2*Math.PI*Math.random(),$=Math.random(),Z=Math.sqrt(1-$),W=Math.sqrt($);return this.set(Z*Math.sin(J),Z*Math.cos(J),W*Math.sin(Q),W*Math.cos(Q))}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._w===this._w}fromArray(J,Q=0){return this._x=J[Q],this._y=J[Q+1],this._z=J[Q+2],this._w=J[Q+3],this._onChangeCallback(),this}toArray(J=[],Q=0){return J[Q]=this._x,J[Q+1]=this._y,J[Q+2]=this._z,J[Q+3]=this._w,J}fromBufferAttribute(J,Q){return this._x=J.getX(Q),this._y=J.getY(Q),this._z=J.getZ(Q),this._w=J.getW(Q),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class P{static{P.prototype.isVector3=!0}constructor(J=0,Q=0,$=0){this.x=J,this.y=Q,this.z=$}set(J,Q,$){if($===void 0)$=this.z;return this.x=J,this.y=Q,this.z=$,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;case 2:this.z=Q;break;default:throw Error("index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error("index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this.z=J.z+Q.z,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this.z+=J.z*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this.z=J.z-Q.z,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this}multiplyVectors(J,Q){return this.x=J.x*Q.x,this.y=J.y*Q.y,this.z=J.z*Q.z,this}applyEuler(J){return this.applyQuaternion(BK.setFromEuler(J))}applyAxisAngle(J,Q){return this.applyQuaternion(BK.setFromAxisAngle(J,Q))}applyMatrix3(J){let Q=this.x,$=this.y,Z=this.z,W=J.elements;return this.x=W[0]*Q+W[3]*$+W[6]*Z,this.y=W[1]*Q+W[4]*$+W[7]*Z,this.z=W[2]*Q+W[5]*$+W[8]*Z,this}applyNormalMatrix(J){return this.applyMatrix3(J).normalize()}applyMatrix4(J){let Q=this.x,$=this.y,Z=this.z,W=J.elements,K=1/(W[3]*Q+W[7]*$+W[11]*Z+W[15]);return this.x=(W[0]*Q+W[4]*$+W[8]*Z+W[12])*K,this.y=(W[1]*Q+W[5]*$+W[9]*Z+W[13])*K,this.z=(W[2]*Q+W[6]*$+W[10]*Z+W[14])*K,this}applyQuaternion(J){let Q=this.x,$=this.y,Z=this.z,W=J.x,K=J.y,Y=J.z,H=J.w,X=2*(K*Z-Y*$),U=2*(Y*Q-W*Z),E=2*(W*$-K*Q);return this.x=Q+H*X+K*E-Y*U,this.y=$+H*U+Y*X-W*E,this.z=Z+H*E+W*U-K*X,this}project(J){return this.applyMatrix4(J.matrixWorldInverse).applyMatrix4(J.projectionMatrix)}unproject(J){return this.applyMatrix4(J.projectionMatrixInverse).applyMatrix4(J.matrixWorld)}transformDirection(J){let Q=this.x,$=this.y,Z=this.z,W=J.elements;return this.x=W[0]*Q+W[4]*$+W[8]*Z,this.y=W[1]*Q+W[5]*$+W[9]*Z,this.z=W[2]*Q+W[6]*$+W[10]*Z,this.normalize()}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this}divideScalar(J){return this.multiplyScalar(1/J)}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this}clamp(J,Q){return this.x=m0(this.x,J.x,Q.x),this.y=m0(this.y,J.y,Q.y),this.z=m0(this.z,J.z,Q.z),this}clampScalar(J,Q){return this.x=m0(this.x,J,Q),this.y=m0(this.y,J,Q),this.z=m0(this.z,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(m0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this.z+=(J.z-this.z)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this.z=J.z+(Q.z-J.z)*$,this}cross(J){return this.crossVectors(this,J)}crossVectors(J,Q){let{x:$,y:Z,z:W}=J,K=Q.x,Y=Q.y,H=Q.z;return this.x=Z*H-W*Y,this.y=W*K-$*H,this.z=$*Y-Z*K,this}projectOnVector(J){let Q=J.lengthSq();if(Q===0)return this.set(0,0,0);let $=J.dot(this)/Q;return this.copy(J).multiplyScalar($)}projectOnPlane(J){return F$.copy(this).projectOnVector(J),this.sub(F$)}reflect(J){return this.sub(F$.copy(J).multiplyScalar(2*this.dot(J)))}angleTo(J){let Q=Math.sqrt(this.lengthSq()*J.lengthSq());if(Q===0)return Math.PI/2;let $=this.dot(J)/Q;return Math.acos(m0($,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let Q=this.x-J.x,$=this.y-J.y,Z=this.z-J.z;return Q*Q+$*$+Z*Z}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)+Math.abs(this.z-J.z)}setFromSpherical(J){return this.setFromSphericalCoords(J.radius,J.phi,J.theta)}setFromSphericalCoords(J,Q,$){let Z=Math.sin(Q)*J;return this.x=Z*Math.sin($),this.y=Math.cos(Q)*J,this.z=Z*Math.cos($),this}setFromCylindrical(J){return this.setFromCylindricalCoords(J.radius,J.theta,J.y)}setFromCylindricalCoords(J,Q,$){return this.x=J*Math.sin(Q),this.y=$,this.z=J*Math.cos(Q),this}setFromMatrixPosition(J){let Q=J.elements;return this.x=Q[12],this.y=Q[13],this.z=Q[14],this}setFromMatrixScale(J){let Q=this.setFromMatrixColumn(J,0).length(),$=this.setFromMatrixColumn(J,1).length(),Z=this.setFromMatrixColumn(J,2).length();return this.x=Q,this.y=$,this.z=Z,this}setFromMatrixColumn(J,Q){return this.fromArray(J.elements,Q*4)}setFromMatrix3Column(J,Q){return this.fromArray(J.elements,Q*3)}setFromEuler(J){return this.x=J._x,this.y=J._y,this.z=J._z,this}setFromColor(J){return this.x=J.r,this.y=J.g,this.z=J.b,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this.z=J[Q+2],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J[Q+2]=this.z,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this.z=J.getZ(Q),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let J=Math.random()*Math.PI*2,Q=Math.random()*2-1,$=Math.sqrt(1-Q*Q);return this.x=$*Math.cos(J),this.y=Q,this.z=$*Math.sin(J),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}var F$=new P,BK=new xJ;class u0{static{u0.prototype.isMatrix3=!0}constructor(J,Q,$,Z,W,K,Y,H,X){if(this.elements=[1,0,0,0,1,0,0,0,1],J!==void 0)this.set(J,Q,$,Z,W,K,Y,H,X)}set(J,Q,$,Z,W,K,Y,H,X){let U=this.elements;return U[0]=J,U[1]=Z,U[2]=Y,U[3]=Q,U[4]=W,U[5]=H,U[6]=$,U[7]=K,U[8]=X,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(J){let Q=this.elements,$=J.elements;return Q[0]=$[0],Q[1]=$[1],Q[2]=$[2],Q[3]=$[3],Q[4]=$[4],Q[5]=$[5],Q[6]=$[6],Q[7]=$[7],Q[8]=$[8],this}extractBasis(J,Q,$){return J.setFromMatrix3Column(this,0),Q.setFromMatrix3Column(this,1),$.setFromMatrix3Column(this,2),this}setFromMatrix4(J){let Q=J.elements;return this.set(Q[0],Q[4],Q[8],Q[1],Q[5],Q[9],Q[2],Q[6],Q[10]),this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,Q){let $=J.elements,Z=Q.elements,W=this.elements,K=$[0],Y=$[3],H=$[6],X=$[1],U=$[4],E=$[7],N=$[2],G=$[5],q=$[8],O=Z[0],R=Z[3],F=Z[6],D=Z[1],k=Z[4],M=Z[7],V=Z[2],_=Z[5],A=Z[8];return W[0]=K*O+Y*D+H*V,W[3]=K*R+Y*k+H*_,W[6]=K*F+Y*M+H*A,W[1]=X*O+U*D+E*V,W[4]=X*R+U*k+E*_,W[7]=X*F+U*M+E*A,W[2]=N*O+G*D+q*V,W[5]=N*R+G*k+q*_,W[8]=N*F+G*M+q*A,this}multiplyScalar(J){let Q=this.elements;return Q[0]*=J,Q[3]*=J,Q[6]*=J,Q[1]*=J,Q[4]*=J,Q[7]*=J,Q[2]*=J,Q[5]*=J,Q[8]*=J,this}determinant(){let J=this.elements,Q=J[0],$=J[1],Z=J[2],W=J[3],K=J[4],Y=J[5],H=J[6],X=J[7],U=J[8];return Q*K*U-Q*Y*X-$*W*U+$*Y*H+Z*W*X-Z*K*H}invert(){let J=this.elements,Q=J[0],$=J[1],Z=J[2],W=J[3],K=J[4],Y=J[5],H=J[6],X=J[7],U=J[8],E=U*K-Y*X,N=Y*H-U*W,G=X*W-K*H,q=Q*E+$*N+Z*G;if(q===0)return this.set(0,0,0,0,0,0,0,0,0);let O=1/q;return J[0]=E*O,J[1]=(Z*X-U*$)*O,J[2]=(Y*$-Z*K)*O,J[3]=N*O,J[4]=(U*Q-Z*H)*O,J[5]=(Z*W-Y*Q)*O,J[6]=G*O,J[7]=($*H-X*Q)*O,J[8]=(K*Q-$*W)*O,this}transpose(){let J,Q=this.elements;return J=Q[1],Q[1]=Q[3],Q[3]=J,J=Q[2],Q[2]=Q[6],Q[6]=J,J=Q[5],Q[5]=Q[7],Q[7]=J,this}getNormalMatrix(J){return this.setFromMatrix4(J).invert().transpose()}transposeIntoArray(J){let Q=this.elements;return J[0]=Q[0],J[1]=Q[3],J[2]=Q[6],J[3]=Q[1],J[4]=Q[4],J[5]=Q[7],J[6]=Q[2],J[7]=Q[5],J[8]=Q[8],this}setUvTransform(J,Q,$,Z,W,K,Y){let H=Math.cos(W),X=Math.sin(W);return this.set($*H,$*X,-$*(H*K+X*Y)+K+J,-Z*X,Z*H,-Z*(-X*K+H*Y)+Y+Q,0,0,1),this}scale(J,Q){return this.premultiply(O$.makeScale(J,Q)),this}rotate(J){return this.premultiply(O$.makeRotation(-J)),this}translate(J,Q){return this.premultiply(O$.makeTranslation(J,Q)),this}makeTranslation(J,Q){if(J.isVector2)this.set(1,0,J.x,0,1,J.y,0,0,1);else this.set(1,0,J,0,1,Q,0,0,1);return this}makeRotation(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,-$,0,$,Q,0,0,0,1),this}makeScale(J,Q){return this.set(J,0,0,0,Q,0,0,0,1),this}equals(J){let Q=this.elements,$=J.elements;for(let Z=0;Z<9;Z++)if(Q[Z]!==$[Z])return!1;return!0}fromArray(J,Q=0){for(let $=0;$<9;$++)this.elements[$]=J[$+Q];return this}toArray(J=[],Q=0){let $=this.elements;return J[Q]=$[0],J[Q+1]=$[1],J[Q+2]=$[2],J[Q+3]=$[3],J[Q+4]=$[4],J[Q+5]=$[5],J[Q+6]=$[6],J[Q+7]=$[7],J[Q+8]=$[8],J}clone(){return new this.constructor().fromArray(this.elements)}}var O$=new u0,zK=new u0().set(0.4123908,0.3575843,0.1804808,0.212639,0.7151687,0.0721923,0.0193308,0.1191948,0.9505322),IK=new u0().set(3.2409699,-1.5373832,-0.4986108,-0.9692436,1.8759675,0.0415551,0.0556301,-0.203977,1.0569715);function LE(){let J={enabled:!0,workingColorSpace:"srgb-linear",spaces:{},convert:function(W,K,Y){if(this.enabled===!1||K===Y||!K||!Y)return W;if(this.spaces[K].transfer==="srgb")W.r=h9(W.r),W.g=h9(W.g),W.b=h9(W.b);if(this.spaces[K].primaries!==this.spaces[Y].primaries)W.applyMatrix3(this.spaces[K].toXYZ),W.applyMatrix3(this.spaces[Y].fromXYZ);if(this.spaces[Y].transfer==="srgb")W.r=U7(W.r),W.g=U7(W.g),W.b=U7(W.b);return W},workingToColorSpace:function(W,K){return this.convert(W,this.workingColorSpace,K)},colorSpaceToWorking:function(W,K){return this.convert(W,K,this.workingColorSpace)},getPrimaries:function(W){return this.spaces[W].primaries},getTransfer:function(W){if(W==="")return"linear";return this.spaces[W].transfer},getToneMappingMode:function(W){return this.spaces[W].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(W,K=this.workingColorSpace){return W.fromArray(this.spaces[K].luminanceCoefficients)},define:function(W){Object.assign(this.spaces,W)},_getMatrix:function(W,K,Y){return W.copy(this.spaces[K].toXYZ).multiply(this.spaces[Y].fromXYZ)},_getDrawingBufferColorSpace:function(W){return this.spaces[W].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(W=this.workingColorSpace){return this.spaces[W].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(W,K){return HQ("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),J.workingToColorSpace(W,K)},toWorkingColorSpace:function(W,K){return HQ("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),J.colorSpaceToWorking(W,K)}},Q=[0.64,0.33,0.3,0.6,0.15,0.06],$=[0.2126,0.7152,0.0722],Z=[0.3127,0.329];return J.define({["srgb-linear"]:{primaries:Q,whitePoint:Z,transfer:"linear",toXYZ:zK,fromXYZ:IK,luminanceCoefficients:$,workingColorSpaceConfig:{unpackColorSpace:"srgb"},outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}},["srgb"]:{primaries:Q,whitePoint:Z,transfer:"srgb",toXYZ:zK,fromXYZ:IK,luminanceCoefficients:$,outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}}}),J}var $J=LE();function h9(J){return J<0.04045?J*0.0773993808:Math.pow(J*0.9478672986+0.0521327014,2.4)}function U7(J){return J<0.0031308?J*12.92:1.055*Math.pow(J,0.41666)-0.055}var d8;class WW{static getDataURL(J,Q="image/png"){if(/^data:/i.test(J.src))return J.src;if(typeof HTMLCanvasElement>"u")return J.src;let $;if(J instanceof HTMLCanvasElement)$=J;else{if(d8===void 0)d8=G7("canvas");d8.width=J.width,d8.height=J.height;let Z=d8.getContext("2d");if(J instanceof ImageData)Z.putImageData(J,0,0);else Z.drawImage(J,0,0,J.width,J.height);$=d8}return $.toDataURL(Q)}static sRGBToLinear(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap){let Q=G7("canvas");Q.width=J.width,Q.height=J.height;let $=Q.getContext("2d");$.drawImage(J,0,0,J.width,J.height);let Z=$.getImageData(0,0,J.width,J.height),W=Z.data;for(let K=0;K<W.length;K++)W[K]=h9(W[K]/255)*255;return $.putImageData(Z,0,0),Q}else if(J.data){let Q=J.data.slice(0);for(let $=0;$<Q.length;$++)if(Q instanceof Uint8Array||Q instanceof Uint8ClampedArray)Q[$]=Math.floor(h9(Q[$]/255)*255);else Q[$]=h9(Q[$]);return{data:Q,width:J.width,height:J.height}}else return X0("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),J}}var VE=0;class b9{constructor(J=null){this.isSource=!0,Object.defineProperty(this,"id",{value:VE++}),this.uuid=eJ(),this.data=J,this.dataReady=!0,this.version=0}getSize(J){let Q=this.data;if(typeof HTMLVideoElement<"u"&&Q instanceof HTMLVideoElement)J.set(Q.videoWidth,Q.videoHeight,0);else if(typeof VideoFrame<"u"&&Q instanceof VideoFrame)J.set(Q.displayWidth,Q.displayHeight,0);else if(Q!==null)J.set(Q.width,Q.height,Q.depth||0);else J.set(0,0,0);return J}set needsUpdate(J){if(J===!0)this.version++}toJSON(J){let Q=J===void 0||typeof J==="string";if(!Q&&J.images[this.uuid]!==void 0)return J.images[this.uuid];let $={uuid:this.uuid,url:""},Z=this.data;if(Z!==null){let W;if(Array.isArray(Z)){W=[];for(let K=0,Y=Z.length;K<Y;K++)if(Z[K].isDataTexture)W.push(R$(Z[K].image));else W.push(R$(Z[K]))}else W=R$(Z);$.url=W}if(!Q)J.images[this.uuid]=$;return $}}function R$(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap)return WW.getDataURL(J);else if(J.data)return{data:Array.from(J.data),width:J.width,height:J.height,type:J.data.constructor.name};else return X0("Texture: Unable to serialize Texture."),{}}var BE=0,k$=new P;class kJ extends K9{constructor(J=kJ.DEFAULT_IMAGE,Q=kJ.DEFAULT_MAPPING,$=1001,Z=1001,W=1006,K=1008,Y=1023,H=1009,X=kJ.DEFAULT_ANISOTROPY,U=""){super();this.isTexture=!0,Object.defineProperty(this,"id",{value:BE++}),this.uuid=eJ(),this.name="",this.source=new b9(J),this.mipmaps=[],this.mapping=Q,this.channel=0,this.wrapS=$,this.wrapT=Z,this.magFilter=W,this.minFilter=K,this.anisotropy=X,this.format=Y,this.internalFormat=null,this.type=H,this.offset=new r(0,0),this.repeat=new r(1,1),this.center=new r(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new u0,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=U,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=J&&J.depth&&J.depth>1?!0:!1,this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(k$).x}get height(){return this.source.getSize(k$).y}get depth(){return this.source.getSize(k$).z}get image(){return this.source.data}set image(J){this.source.data=J}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(J){return this.name=J.name,this.source=J.source,this.mipmaps=J.mipmaps.slice(0),this.mapping=J.mapping,this.channel=J.channel,this.wrapS=J.wrapS,this.wrapT=J.wrapT,this.magFilter=J.magFilter,this.minFilter=J.minFilter,this.anisotropy=J.anisotropy,this.format=J.format,this.internalFormat=J.internalFormat,this.type=J.type,this.normalized=J.normalized,this.offset.copy(J.offset),this.repeat.copy(J.repeat),this.center.copy(J.center),this.rotation=J.rotation,this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrix.copy(J.matrix),this.generateMipmaps=J.generateMipmaps,this.premultiplyAlpha=J.premultiplyAlpha,this.flipY=J.flipY,this.unpackAlignment=J.unpackAlignment,this.colorSpace=J.colorSpace,this.renderTarget=J.renderTarget,this.isRenderTargetTexture=J.isRenderTargetTexture,this.isArrayTexture=J.isArrayTexture,this.userData=JSON.parse(JSON.stringify(J.userData)),this.needsUpdate=!0,this}setValues(J){for(let Q in J){let $=J[Q];if($===void 0){X0(`Texture.setValues(): parameter '${Q}' has value of undefined.`);continue}let Z=this[Q];if(Z===void 0){X0(`Texture.setValues(): property '${Q}' does not exist.`);continue}if(Z&&$&&(Z.isVector2&&$.isVector2))Z.copy($);else if(Z&&$&&(Z.isVector3&&$.isVector3))Z.copy($);else if(Z&&$&&(Z.isMatrix3&&$.isMatrix3))Z.copy($);else this[Q]=$}}toJSON(J){let Q=J===void 0||typeof J==="string";if(!Q&&J.textures[this.uuid]!==void 0)return J.textures[this.uuid];let $={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(J).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};if(Object.keys(this.userData).length>0)$.userData=this.userData;if(!Q)J.textures[this.uuid]=$;return $}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(J){if(this.mapping!==300)return J;if(J.applyMatrix3(this.matrix),J.x<0||J.x>1)switch(this.wrapS){case 1000:J.x=J.x-Math.floor(J.x);break;case 1001:J.x=J.x<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.x)%2)===1)J.x=Math.ceil(J.x)-J.x;else J.x=J.x-Math.floor(J.x);break}if(J.y<0||J.y>1)switch(this.wrapT){case 1000:J.y=J.y-Math.floor(J.y);break;case 1001:J.y=J.y<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.y)%2)===1)J.y=Math.ceil(J.y)-J.y;else J.y=J.y-Math.floor(J.y);break}if(this.flipY)J.y=1-J.y;return J}set needsUpdate(J){if(J===!0)this.version++,this.source.needsUpdate=!0}set needsPMREMUpdate(J){if(J===!0)this.pmremVersion++}}kJ.DEFAULT_IMAGE=null;kJ.DEFAULT_MAPPING=300;kJ.DEFAULT_ANISOTROPY=1;class GJ{static{GJ.prototype.isVector4=!0}constructor(J=0,Q=0,$=0,Z=1){this.x=J,this.y=Q,this.z=$,this.w=Z}get width(){return this.z}set width(J){this.z=J}get height(){return this.w}set height(J){this.w=J}set(J,Q,$,Z){return this.x=J,this.y=Q,this.z=$,this.w=Z,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this.w=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setW(J){return this.w=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;case 2:this.z=Q;break;case 3:this.w=Q;break;default:throw Error("index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error("index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this.w=J.w!==void 0?J.w:1,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this.w+=J.w,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this.w+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this.z=J.z+Q.z,this.w=J.w+Q.w,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this.z+=J.z*Q,this.w+=J.w*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this.w-=J.w,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this.w-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this.z=J.z-Q.z,this.w=J.w-Q.w,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this.w*=J.w,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this.w*=J,this}applyMatrix4(J){let Q=this.x,$=this.y,Z=this.z,W=this.w,K=J.elements;return this.x=K[0]*Q+K[4]*$+K[8]*Z+K[12]*W,this.y=K[1]*Q+K[5]*$+K[9]*Z+K[13]*W,this.z=K[2]*Q+K[6]*$+K[10]*Z+K[14]*W,this.w=K[3]*Q+K[7]*$+K[11]*Z+K[15]*W,this}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this.w/=J.w,this}divideScalar(J){return this.multiplyScalar(1/J)}setAxisAngleFromQuaternion(J){this.w=2*Math.acos(J.w);let Q=Math.sqrt(1-J.w*J.w);if(Q<0.0001)this.x=1,this.y=0,this.z=0;else this.x=J.x/Q,this.y=J.y/Q,this.z=J.z/Q;return this}setAxisAngleFromRotationMatrix(J){let Q,$,Z,W,K=0.01,Y=0.1,H=J.elements,X=H[0],U=H[4],E=H[8],N=H[1],G=H[5],q=H[9],O=H[2],R=H[6],F=H[10];if(Math.abs(U-N)<0.01&&Math.abs(E-O)<0.01&&Math.abs(q-R)<0.01){if(Math.abs(U+N)<0.1&&Math.abs(E+O)<0.1&&Math.abs(q+R)<0.1&&Math.abs(X+G+F-3)<0.1)return this.set(1,0,0,0),this;Q=Math.PI;let k=(X+1)/2,M=(G+1)/2,V=(F+1)/2,_=(U+N)/4,A=(E+O)/4,C=(q+R)/4;if(k>M&&k>V)if(k<0.01)$=0,Z=0.707106781,W=0.707106781;else $=Math.sqrt(k),Z=_/$,W=A/$;else if(M>V)if(M<0.01)$=0.707106781,Z=0,W=0.707106781;else Z=Math.sqrt(M),$=_/Z,W=C/Z;else if(V<0.01)$=0.707106781,Z=0.707106781,W=0;else W=Math.sqrt(V),$=A/W,Z=C/W;return this.set($,Z,W,Q),this}let D=Math.sqrt((R-q)*(R-q)+(E-O)*(E-O)+(N-U)*(N-U));if(Math.abs(D)<0.001)D=1;return this.x=(R-q)/D,this.y=(E-O)/D,this.z=(N-U)/D,this.w=Math.acos((X+G+F-1)/2),this}setFromMatrixPosition(J){let Q=J.elements;return this.x=Q[12],this.y=Q[13],this.z=Q[14],this.w=Q[15],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this.w=Math.min(this.w,J.w),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this.w=Math.max(this.w,J.w),this}clamp(J,Q){return this.x=m0(this.x,J.x,Q.x),this.y=m0(this.y,J.y,Q.y),this.z=m0(this.z,J.z,Q.z),this.w=m0(this.w,J.w,Q.w),this}clampScalar(J,Q){return this.x=m0(this.x,J,Q),this.y=m0(this.y,J,Q),this.z=m0(this.z,J,Q),this.w=m0(this.w,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(m0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z+this.w*J.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this.z+=(J.z-this.z)*Q,this.w+=(J.w-this.w)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this.z=J.z+(Q.z-J.z)*$,this.w=J.w+(Q.w-J.w)*$,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z&&J.w===this.w}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this.z=J[Q+2],this.w=J[Q+3],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J[Q+2]=this.z,J[Q+3]=this.w,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this.z=J.getZ(Q),this.w=J.getW(Q),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class IQ extends K9{constructor(J=1,Q=1,$={}){super();$=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},$),this.isRenderTarget=!0,this.width=J,this.height=Q,this.depth=$.depth,this.scissor=new GJ(0,0,J,Q),this.scissorTest=!1,this.viewport=new GJ(0,0,J,Q),this.textures=[];let Z={width:J,height:Q,depth:$.depth},W=new kJ(Z),K=$.count;for(let Y=0;Y<K;Y++)this.textures[Y]=W.clone(),this.textures[Y].isRenderTargetTexture=!0,this.textures[Y].renderTarget=this;this._setTextureOptions($),this.depthBuffer=$.depthBuffer,this.stencilBuffer=$.stencilBuffer,this.resolveDepthBuffer=$.resolveDepthBuffer,this.resolveStencilBuffer=$.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=$.depthTexture,this.samples=$.samples,this.multiview=$.multiview}_setTextureOptions(J={}){let Q={minFilter:1006,generateMipmaps:!1,flipY:!1,internalFormat:null};if(J.mapping!==void 0)Q.mapping=J.mapping;if(J.wrapS!==void 0)Q.wrapS=J.wrapS;if(J.wrapT!==void 0)Q.wrapT=J.wrapT;if(J.wrapR!==void 0)Q.wrapR=J.wrapR;if(J.magFilter!==void 0)Q.magFilter=J.magFilter;if(J.minFilter!==void 0)Q.minFilter=J.minFilter;if(J.format!==void 0)Q.format=J.format;if(J.type!==void 0)Q.type=J.type;if(J.anisotropy!==void 0)Q.anisotropy=J.anisotropy;if(J.colorSpace!==void 0)Q.colorSpace=J.colorSpace;if(J.flipY!==void 0)Q.flipY=J.flipY;if(J.generateMipmaps!==void 0)Q.generateMipmaps=J.generateMipmaps;if(J.internalFormat!==void 0)Q.internalFormat=J.internalFormat;for(let $=0;$<this.textures.length;$++)this.textures[$].setValues(Q)}get texture(){return this.textures[0]}set texture(J){this.textures[0]=J}set depthTexture(J){if(this._depthTexture!==null)this._depthTexture.renderTarget=null;if(J!==null)J.renderTarget=this;this._depthTexture=J}get depthTexture(){return this._depthTexture}setSize(J,Q,$=1){if(this.width!==J||this.height!==Q||this.depth!==$){this.width=J,this.height=Q,this.depth=$;for(let Z=0,W=this.textures.length;Z<W;Z++)if(this.textures[Z].image.width=J,this.textures[Z].image.height=Q,this.textures[Z].image.depth=$,this.textures[Z].isData3DTexture!==!0)this.textures[Z].isArrayTexture=this.textures[Z].image.depth>1;this.dispose()}this.viewport.set(0,0,J,Q),this.scissor.set(0,0,J,Q)}clone(){return new this.constructor().copy(this)}copy(J){this.width=J.width,this.height=J.height,this.depth=J.depth,this.scissor.copy(J.scissor),this.scissorTest=J.scissorTest,this.viewport.copy(J.viewport),this.textures.length=0;for(let Q=0,$=J.textures.length;Q<$;Q++){this.textures[Q]=J.textures[Q].clone(),this.textures[Q].isRenderTargetTexture=!0,this.textures[Q].renderTarget=this;let Z=Object.assign({},J.textures[Q].image);this.textures[Q].source=new b9(Z)}if(this.depthBuffer=J.depthBuffer,this.stencilBuffer=J.stencilBuffer,this.resolveDepthBuffer=J.resolveDepthBuffer,this.resolveStencilBuffer=J.resolveStencilBuffer,J.depthTexture!==null)this.depthTexture=J.depthTexture.clone();return this.samples=J.samples,this.multiview=J.multiview,this}dispose(){this.dispatchEvent({type:"dispose"})}}class oJ extends IQ{constructor(J=1,Q=1,$={}){super(J,Q,$);this.isWebGLRenderTarget=!0}}class J6 extends kJ{constructor(J=null,Q=1,$=1,Z=1){super(null);this.isDataArrayTexture=!0,this.image={data:J,width:Q,height:$,depth:Z},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(J){this.layerUpdates.add(J)}clearLayerUpdates(){this.layerUpdates.clear()}}class jH extends oJ{constructor(J=1,Q=1,$=1,Z={}){super(J,Q,Z);this.isWebGLArrayRenderTarget=!0,this.depth=$,this.texture=new J6(null,J,Q,$),this._setTextureOptions(Z),this.texture.isRenderTargetTexture=!0}}class Q6 extends kJ{constructor(J=null,Q=1,$=1,Z=1){super(null);this.isData3DTexture=!0,this.image={data:J,width:Q,height:$,depth:Z},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class yH extends oJ{constructor(J=1,Q=1,$=1,Z={}){super(J,Q,Z);this.isWebGL3DRenderTarget=!0,this.depth=$,this.texture=new Q6(null,J,Q,$),this._setTextureOptions(Z),this.texture.isRenderTargetTexture=!0}}class d0{static{d0.prototype.isMatrix4=!0}constructor(J,Q,$,Z,W,K,Y,H,X,U,E,N,G,q,O,R){if(this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],J!==void 0)this.set(J,Q,$,Z,W,K,Y,H,X,U,E,N,G,q,O,R)}set(J,Q,$,Z,W,K,Y,H,X,U,E,N,G,q,O,R){let F=this.elements;return F[0]=J,F[4]=Q,F[8]=$,F[12]=Z,F[1]=W,F[5]=K,F[9]=Y,F[13]=H,F[2]=X,F[6]=U,F[10]=E,F[14]=N,F[3]=G,F[7]=q,F[11]=O,F[15]=R,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new d0().fromArray(this.elements)}copy(J){let Q=this.elements,$=J.elements;return Q[0]=$[0],Q[1]=$[1],Q[2]=$[2],Q[3]=$[3],Q[4]=$[4],Q[5]=$[5],Q[6]=$[6],Q[7]=$[7],Q[8]=$[8],Q[9]=$[9],Q[10]=$[10],Q[11]=$[11],Q[12]=$[12],Q[13]=$[13],Q[14]=$[14],Q[15]=$[15],this}copyPosition(J){let Q=this.elements,$=J.elements;return Q[12]=$[12],Q[13]=$[13],Q[14]=$[14],this}setFromMatrix3(J){let Q=J.elements;return this.set(Q[0],Q[3],Q[6],0,Q[1],Q[4],Q[7],0,Q[2],Q[5],Q[8],0,0,0,0,1),this}extractBasis(J,Q,$){if(this.determinant()===0)return J.set(1,0,0),Q.set(0,1,0),$.set(0,0,1),this;return J.setFromMatrixColumn(this,0),Q.setFromMatrixColumn(this,1),$.setFromMatrixColumn(this,2),this}makeBasis(J,Q,$){return this.set(J.x,Q.x,$.x,0,J.y,Q.y,$.y,0,J.z,Q.z,$.z,0,0,0,0,1),this}extractRotation(J){if(J.determinant()===0)return this.identity();let Q=this.elements,$=J.elements,Z=1/l8.setFromMatrixColumn(J,0).length(),W=1/l8.setFromMatrixColumn(J,1).length(),K=1/l8.setFromMatrixColumn(J,2).length();return Q[0]=$[0]*Z,Q[1]=$[1]*Z,Q[2]=$[2]*Z,Q[3]=0,Q[4]=$[4]*W,Q[5]=$[5]*W,Q[6]=$[6]*W,Q[7]=0,Q[8]=$[8]*K,Q[9]=$[9]*K,Q[10]=$[10]*K,Q[11]=0,Q[12]=0,Q[13]=0,Q[14]=0,Q[15]=1,this}makeRotationFromEuler(J){let Q=this.elements,$=J.x,Z=J.y,W=J.z,K=Math.cos($),Y=Math.sin($),H=Math.cos(Z),X=Math.sin(Z),U=Math.cos(W),E=Math.sin(W);if(J.order==="XYZ"){let N=K*U,G=K*E,q=Y*U,O=Y*E;Q[0]=H*U,Q[4]=-H*E,Q[8]=X,Q[1]=G+q*X,Q[5]=N-O*X,Q[9]=-Y*H,Q[2]=O-N*X,Q[6]=q+G*X,Q[10]=K*H}else if(J.order==="YXZ"){let N=H*U,G=H*E,q=X*U,O=X*E;Q[0]=N+O*Y,Q[4]=q*Y-G,Q[8]=K*X,Q[1]=K*E,Q[5]=K*U,Q[9]=-Y,Q[2]=G*Y-q,Q[6]=O+N*Y,Q[10]=K*H}else if(J.order==="ZXY"){let N=H*U,G=H*E,q=X*U,O=X*E;Q[0]=N-O*Y,Q[4]=-K*E,Q[8]=q+G*Y,Q[1]=G+q*Y,Q[5]=K*U,Q[9]=O-N*Y,Q[2]=-K*X,Q[6]=Y,Q[10]=K*H}else if(J.order==="ZYX"){let N=K*U,G=K*E,q=Y*U,O=Y*E;Q[0]=H*U,Q[4]=q*X-G,Q[8]=N*X+O,Q[1]=H*E,Q[5]=O*X+N,Q[9]=G*X-q,Q[2]=-X,Q[6]=Y*H,Q[10]=K*H}else if(J.order==="YZX"){let N=K*H,G=K*X,q=Y*H,O=Y*X;Q[0]=H*U,Q[4]=O-N*E,Q[8]=q*E+G,Q[1]=E,Q[5]=K*U,Q[9]=-Y*U,Q[2]=-X*U,Q[6]=G*E+q,Q[10]=N-O*E}else if(J.order==="XZY"){let N=K*H,G=K*X,q=Y*H,O=Y*X;Q[0]=H*U,Q[4]=-E,Q[8]=X*U,Q[1]=N*E+O,Q[5]=K*U,Q[9]=G*E-q,Q[2]=q*E-G,Q[6]=Y*U,Q[10]=O*E+N}return Q[3]=0,Q[7]=0,Q[11]=0,Q[12]=0,Q[13]=0,Q[14]=0,Q[15]=1,this}makeRotationFromQuaternion(J){return this.compose(zE,J,IE)}lookAt(J,Q,$){let Z=this.elements;if(rJ.subVectors(J,Q),rJ.lengthSq()===0)rJ.z=1;if(rJ.normalize(),n9.crossVectors($,rJ),n9.lengthSq()===0){if(Math.abs($.z)===1)rJ.x+=0.0001;else rJ.z+=0.0001;rJ.normalize(),n9.crossVectors($,rJ)}return n9.normalize(),k6.crossVectors(rJ,n9),Z[0]=n9.x,Z[4]=k6.x,Z[8]=rJ.x,Z[1]=n9.y,Z[5]=k6.y,Z[9]=rJ.y,Z[2]=n9.z,Z[6]=k6.z,Z[10]=rJ.z,this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,Q){let $=J.elements,Z=Q.elements,W=this.elements,K=$[0],Y=$[4],H=$[8],X=$[12],U=$[1],E=$[5],N=$[9],G=$[13],q=$[2],O=$[6],R=$[10],F=$[14],D=$[3],k=$[7],M=$[11],V=$[15],_=Z[0],A=Z[4],C=Z[8],L=Z[12],I=Z[1],b=Z[5],T=Z[9],p=Z[13],u=Z[2],y=Z[6],l=Z[10],h=Z[14],m=Z[3],a=Z[7],W0=Z[11],N0=Z[15];return W[0]=K*_+Y*I+H*u+X*m,W[4]=K*A+Y*b+H*y+X*a,W[8]=K*C+Y*T+H*l+X*W0,W[12]=K*L+Y*p+H*h+X*N0,W[1]=U*_+E*I+N*u+G*m,W[5]=U*A+E*b+N*y+G*a,W[9]=U*C+E*T+N*l+G*W0,W[13]=U*L+E*p+N*h+G*N0,W[2]=q*_+O*I+R*u+F*m,W[6]=q*A+O*b+R*y+F*a,W[10]=q*C+O*T+R*l+F*W0,W[14]=q*L+O*p+R*h+F*N0,W[3]=D*_+k*I+M*u+V*m,W[7]=D*A+k*b+M*y+V*a,W[11]=D*C+k*T+M*l+V*W0,W[15]=D*L+k*p+M*h+V*N0,this}multiplyScalar(J){let Q=this.elements;return Q[0]*=J,Q[4]*=J,Q[8]*=J,Q[12]*=J,Q[1]*=J,Q[5]*=J,Q[9]*=J,Q[13]*=J,Q[2]*=J,Q[6]*=J,Q[10]*=J,Q[14]*=J,Q[3]*=J,Q[7]*=J,Q[11]*=J,Q[15]*=J,this}determinant(){let J=this.elements,Q=J[0],$=J[4],Z=J[8],W=J[12],K=J[1],Y=J[5],H=J[9],X=J[13],U=J[2],E=J[6],N=J[10],G=J[14],q=J[3],O=J[7],R=J[11],F=J[15],D=H*G-X*N,k=Y*G-X*E,M=Y*N-H*E,V=K*G-X*U,_=K*N-H*U,A=K*E-Y*U;return Q*(O*D-R*k+F*M)-$*(q*D-R*V+F*_)+Z*(q*k-O*V+F*A)-W*(q*M-O*_+R*A)}transpose(){let J=this.elements,Q;return Q=J[1],J[1]=J[4],J[4]=Q,Q=J[2],J[2]=J[8],J[8]=Q,Q=J[6],J[6]=J[9],J[9]=Q,Q=J[3],J[3]=J[12],J[12]=Q,Q=J[7],J[7]=J[13],J[13]=Q,Q=J[11],J[11]=J[14],J[14]=Q,this}setPosition(J,Q,$){let Z=this.elements;if(J.isVector3)Z[12]=J.x,Z[13]=J.y,Z[14]=J.z;else Z[12]=J,Z[13]=Q,Z[14]=$;return this}invert(){let J=this.elements,Q=J[0],$=J[1],Z=J[2],W=J[3],K=J[4],Y=J[5],H=J[6],X=J[7],U=J[8],E=J[9],N=J[10],G=J[11],q=J[12],O=J[13],R=J[14],F=J[15],D=Q*Y-$*K,k=Q*H-Z*K,M=Q*X-W*K,V=$*H-Z*Y,_=$*X-W*Y,A=Z*X-W*H,C=U*O-E*q,L=U*R-N*q,I=U*F-G*q,b=E*R-N*O,T=E*F-G*O,p=N*F-G*R,u=D*p-k*T+M*b+V*I-_*L+A*C;if(u===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let y=1/u;return J[0]=(Y*p-H*T+X*b)*y,J[1]=(Z*T-$*p-W*b)*y,J[2]=(O*A-R*_+F*V)*y,J[3]=(N*_-E*A-G*V)*y,J[4]=(H*I-K*p-X*L)*y,J[5]=(Q*p-Z*I+W*L)*y,J[6]=(R*M-q*A-F*k)*y,J[7]=(U*A-N*M+G*k)*y,J[8]=(K*T-Y*I+X*C)*y,J[9]=($*I-Q*T-W*C)*y,J[10]=(q*_-O*M+F*D)*y,J[11]=(E*M-U*_-G*D)*y,J[12]=(Y*L-K*b-H*C)*y,J[13]=(Q*b-$*L+Z*C)*y,J[14]=(O*k-q*V-R*D)*y,J[15]=(U*V-E*k+N*D)*y,this}scale(J){let Q=this.elements,$=J.x,Z=J.y,W=J.z;return Q[0]*=$,Q[4]*=Z,Q[8]*=W,Q[1]*=$,Q[5]*=Z,Q[9]*=W,Q[2]*=$,Q[6]*=Z,Q[10]*=W,Q[3]*=$,Q[7]*=Z,Q[11]*=W,this}getMaxScaleOnAxis(){let J=this.elements,Q=J[0]*J[0]+J[1]*J[1]+J[2]*J[2],$=J[4]*J[4]+J[5]*J[5]+J[6]*J[6],Z=J[8]*J[8]+J[9]*J[9]+J[10]*J[10];return Math.sqrt(Math.max(Q,$,Z))}makeTranslation(J,Q,$){if(J.isVector3)this.set(1,0,0,J.x,0,1,0,J.y,0,0,1,J.z,0,0,0,1);else this.set(1,0,0,J,0,1,0,Q,0,0,1,$,0,0,0,1);return this}makeRotationX(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(1,0,0,0,0,Q,-$,0,0,$,Q,0,0,0,0,1),this}makeRotationY(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,0,$,0,0,1,0,0,-$,0,Q,0,0,0,0,1),this}makeRotationZ(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,-$,0,0,$,Q,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(J,Q){let $=Math.cos(Q),Z=Math.sin(Q),W=1-$,K=J.x,Y=J.y,H=J.z,X=W*K,U=W*Y;return this.set(X*K+$,X*Y-Z*H,X*H+Z*Y,0,X*Y+Z*H,U*Y+$,U*H-Z*K,0,X*H-Z*Y,U*H+Z*K,W*H*H+$,0,0,0,0,1),this}makeScale(J,Q,$){return this.set(J,0,0,0,0,Q,0,0,0,0,$,0,0,0,0,1),this}makeShear(J,Q,$,Z,W,K){return this.set(1,$,W,0,J,1,K,0,Q,Z,1,0,0,0,0,1),this}compose(J,Q,$){let Z=this.elements,W=Q._x,K=Q._y,Y=Q._z,H=Q._w,X=W+W,U=K+K,E=Y+Y,N=W*X,G=W*U,q=W*E,O=K*U,R=K*E,F=Y*E,D=H*X,k=H*U,M=H*E,V=$.x,_=$.y,A=$.z;return Z[0]=(1-(O+F))*V,Z[1]=(G+M)*V,Z[2]=(q-k)*V,Z[3]=0,Z[4]=(G-M)*_,Z[5]=(1-(N+F))*_,Z[6]=(R+D)*_,Z[7]=0,Z[8]=(q+k)*A,Z[9]=(R-D)*A,Z[10]=(1-(N+O))*A,Z[11]=0,Z[12]=J.x,Z[13]=J.y,Z[14]=J.z,Z[15]=1,this}decompose(J,Q,$){let Z=this.elements;J.x=Z[12],J.y=Z[13],J.z=Z[14];let W=this.determinant();if(W===0)return $.set(1,1,1),Q.identity(),this;let K=l8.set(Z[0],Z[1],Z[2]).length(),Y=l8.set(Z[4],Z[5],Z[6]).length(),H=l8.set(Z[8],Z[9],Z[10]).length();if(W<0)K=-K;X9.copy(this);let X=1/K,U=1/Y,E=1/H;return X9.elements[0]*=X,X9.elements[1]*=X,X9.elements[2]*=X,X9.elements[4]*=U,X9.elements[5]*=U,X9.elements[6]*=U,X9.elements[8]*=E,X9.elements[9]*=E,X9.elements[10]*=E,Q.setFromRotationMatrix(X9),$.x=K,$.y=Y,$.z=H,this}makePerspective(J,Q,$,Z,W,K,Y=2000,H=!1){let X=this.elements,U=2*W/(Q-J),E=2*W/($-Z),N=(Q+J)/(Q-J),G=($+Z)/($-Z),q,O;if(H)q=W/(K-W),O=K*W/(K-W);else if(Y===2000)q=-(K+W)/(K-W),O=-2*K*W/(K-W);else if(Y===2001)q=-K/(K-W),O=-K*W/(K-W);else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+Y);return X[0]=U,X[4]=0,X[8]=N,X[12]=0,X[1]=0,X[5]=E,X[9]=G,X[13]=0,X[2]=0,X[6]=0,X[10]=q,X[14]=O,X[3]=0,X[7]=0,X[11]=-1,X[15]=0,this}makeOrthographic(J,Q,$,Z,W,K,Y=2000,H=!1){let X=this.elements,U=2/(Q-J),E=2/($-Z),N=-(Q+J)/(Q-J),G=-($+Z)/($-Z),q,O;if(H)q=1/(K-W),O=K/(K-W);else if(Y===2000)q=-2/(K-W),O=-(K+W)/(K-W);else if(Y===2001)q=-1/(K-W),O=-W/(K-W);else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+Y);return X[0]=U,X[4]=0,X[8]=0,X[12]=N,X[1]=0,X[5]=E,X[9]=0,X[13]=G,X[2]=0,X[6]=0,X[10]=q,X[14]=O,X[3]=0,X[7]=0,X[11]=0,X[15]=1,this}equals(J){let Q=this.elements,$=J.elements;for(let Z=0;Z<16;Z++)if(Q[Z]!==$[Z])return!1;return!0}fromArray(J,Q=0){for(let $=0;$<16;$++)this.elements[$]=J[$+Q];return this}toArray(J=[],Q=0){let $=this.elements;return J[Q]=$[0],J[Q+1]=$[1],J[Q+2]=$[2],J[Q+3]=$[3],J[Q+4]=$[4],J[Q+5]=$[5],J[Q+6]=$[6],J[Q+7]=$[7],J[Q+8]=$[8],J[Q+9]=$[9],J[Q+10]=$[10],J[Q+11]=$[11],J[Q+12]=$[12],J[Q+13]=$[13],J[Q+14]=$[14],J[Q+15]=$[15],J}}var l8=new P,X9=new d0,zE=new P(0,0,0),IE=new P(1,1,1),n9=new P,k6=new P,rJ=new P,_K=new d0,wK=new xJ;class N9{constructor(J=0,Q=0,$=0,Z=N9.DEFAULT_ORDER){this.isEuler=!0,this._x=J,this._y=Q,this._z=$,this._order=Z}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get order(){return this._order}set order(J){this._order=J,this._onChangeCallback()}set(J,Q,$,Z=this._order){return this._x=J,this._y=Q,this._z=$,this._order=Z,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(J){return this._x=J._x,this._y=J._y,this._z=J._z,this._order=J._order,this._onChangeCallback(),this}setFromRotationMatrix(J,Q=this._order,$=!0){let Z=J.elements,W=Z[0],K=Z[4],Y=Z[8],H=Z[1],X=Z[5],U=Z[9],E=Z[2],N=Z[6],G=Z[10];switch(Q){case"XYZ":if(this._y=Math.asin(m0(Y,-1,1)),Math.abs(Y)<0.9999999)this._x=Math.atan2(-U,G),this._z=Math.atan2(-K,W);else this._x=Math.atan2(N,X),this._z=0;break;case"YXZ":if(this._x=Math.asin(-m0(U,-1,1)),Math.abs(U)<0.9999999)this._y=Math.atan2(Y,G),this._z=Math.atan2(H,X);else this._y=Math.atan2(-E,W),this._z=0;break;case"ZXY":if(this._x=Math.asin(m0(N,-1,1)),Math.abs(N)<0.9999999)this._y=Math.atan2(-E,G),this._z=Math.atan2(-K,X);else this._y=0,this._z=Math.atan2(H,W);break;case"ZYX":if(this._y=Math.asin(-m0(E,-1,1)),Math.abs(E)<0.9999999)this._x=Math.atan2(N,G),this._z=Math.atan2(H,W);else this._x=0,this._z=Math.atan2(-K,X);break;case"YZX":if(this._z=Math.asin(m0(H,-1,1)),Math.abs(H)<0.9999999)this._x=Math.atan2(-U,X),this._y=Math.atan2(-E,W);else this._x=0,this._y=Math.atan2(Y,G);break;case"XZY":if(this._z=Math.asin(-m0(K,-1,1)),Math.abs(K)<0.9999999)this._x=Math.atan2(N,X),this._y=Math.atan2(Y,W);else this._x=Math.atan2(-U,G),this._y=0;break;default:X0("Euler: .setFromRotationMatrix() encountered an unknown order: "+Q)}if(this._order=Q,$===!0)this._onChangeCallback();return this}setFromQuaternion(J,Q,$){return _K.makeRotationFromQuaternion(J),this.setFromRotationMatrix(_K,Q,$)}setFromVector3(J,Q=this._order){return this.set(J.x,J.y,J.z,Q)}reorder(J){return wK.setFromEuler(this),this.setFromQuaternion(wK,J)}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._order===this._order}fromArray(J){if(this._x=J[0],this._y=J[1],this._z=J[2],J[3]!==void 0)this._order=J[3];return this._onChangeCallback(),this}toArray(J=[],Q=0){return J[Q]=this._x,J[Q+1]=this._y,J[Q+2]=this._z,J[Q+3]=this._order,J}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}N9.DEFAULT_ORDER="XYZ";class $6{constructor(){this.mask=1}set(J){this.mask=(1<<J|0)>>>0}enable(J){this.mask|=1<<J|0}enableAll(){this.mask=-1}toggle(J){this.mask^=1<<J|0}disable(J){this.mask&=~(1<<J|0)}disableAll(){this.mask=0}test(J){return(this.mask&J.mask)!==0}isEnabled(J){return(this.mask&(1<<J|0))!==0}}var _E=0,AK=new P,u8=new xJ,C9=new d0,M6=new P,A7=new P,wE=new P,AE=new xJ,CK=new P(1,0,0),PK=new P(0,1,0),TK=new P(0,0,1),SK={type:"added"},CE={type:"removed"},c8={type:"childadded",child:null},M$={type:"childremoved",child:null};class HJ extends K9{constructor(){super();this.isObject3D=!0,Object.defineProperty(this,"id",{value:_E++}),this.uuid=eJ(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=HJ.DEFAULT_UP.clone();let J=new P,Q=new N9,$=new xJ,Z=new P(1,1,1);function W(){$.setFromEuler(Q,!1)}function K(){Q.setFromQuaternion($,void 0,!1)}Q._onChange(W),$._onChange(K),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:J},rotation:{configurable:!0,enumerable:!0,value:Q},quaternion:{configurable:!0,enumerable:!0,value:$},scale:{configurable:!0,enumerable:!0,value:Z},modelViewMatrix:{value:new d0},normalMatrix:{value:new u0}}),this.matrix=new d0,this.matrixWorld=new d0,this.matrixAutoUpdate=HJ.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=HJ.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new $6,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(J){if(this.matrixAutoUpdate)this.updateMatrix();this.matrix.premultiply(J),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(J){return this.quaternion.premultiply(J),this}setRotationFromAxisAngle(J,Q){this.quaternion.setFromAxisAngle(J,Q)}setRotationFromEuler(J){this.quaternion.setFromEuler(J,!0)}setRotationFromMatrix(J){this.quaternion.setFromRotationMatrix(J)}setRotationFromQuaternion(J){this.quaternion.copy(J)}rotateOnAxis(J,Q){return u8.setFromAxisAngle(J,Q),this.quaternion.multiply(u8),this}rotateOnWorldAxis(J,Q){return u8.setFromAxisAngle(J,Q),this.quaternion.premultiply(u8),this}rotateX(J){return this.rotateOnAxis(CK,J)}rotateY(J){return this.rotateOnAxis(PK,J)}rotateZ(J){return this.rotateOnAxis(TK,J)}translateOnAxis(J,Q){return AK.copy(J).applyQuaternion(this.quaternion),this.position.add(AK.multiplyScalar(Q)),this}translateX(J){return this.translateOnAxis(CK,J)}translateY(J){return this.translateOnAxis(PK,J)}translateZ(J){return this.translateOnAxis(TK,J)}localToWorld(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(this.matrixWorld)}worldToLocal(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(C9.copy(this.matrixWorld).invert())}lookAt(J,Q,$){if(J.isVector3)M6.copy(J);else M6.set(J,Q,$);let Z=this.parent;if(this.updateWorldMatrix(!0,!1),A7.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight)C9.lookAt(A7,M6,this.up);else C9.lookAt(M6,A7,this.up);if(this.quaternion.setFromRotationMatrix(C9),Z)C9.extractRotation(Z.matrixWorld),u8.setFromRotationMatrix(C9),this.quaternion.premultiply(u8.invert())}add(J){if(arguments.length>1){for(let Q=0;Q<arguments.length;Q++)this.add(arguments[Q]);return this}if(J===this)return T0("Object3D.add: object can't be added as a child of itself.",J),this;if(J&&J.isObject3D)J.removeFromParent(),J.parent=this,this.children.push(J),J.dispatchEvent(SK),c8.child=J,this.dispatchEvent(c8),c8.child=null;else T0("Object3D.add: object not an instance of THREE.Object3D.",J);return this}remove(J){if(arguments.length>1){for(let $=0;$<arguments.length;$++)this.remove(arguments[$]);return this}let Q=this.children.indexOf(J);if(Q!==-1)J.parent=null,this.children.splice(Q,1),J.dispatchEvent(CE),M$.child=J,this.dispatchEvent(M$),M$.child=null;return this}removeFromParent(){let J=this.parent;if(J!==null)J.remove(this);return this}clear(){return this.remove(...this.children)}attach(J){if(this.updateWorldMatrix(!0,!1),C9.copy(this.matrixWorld).invert(),J.parent!==null)J.parent.updateWorldMatrix(!0,!1),C9.multiply(J.parent.matrixWorld);return J.applyMatrix4(C9),J.removeFromParent(),J.parent=this,this.children.push(J),J.updateWorldMatrix(!1,!0),J.dispatchEvent(SK),c8.child=J,this.dispatchEvent(c8),c8.child=null,this}getObjectById(J){return this.getObjectByProperty("id",J)}getObjectByName(J){return this.getObjectByProperty("name",J)}getObjectByProperty(J,Q){if(this[J]===Q)return this;for(let $=0,Z=this.children.length;$<Z;$++){let K=this.children[$].getObjectByProperty(J,Q);if(K!==void 0)return K}return}getObjectsByProperty(J,Q,$=[]){if(this[J]===Q)$.push(this);let Z=this.children;for(let W=0,K=Z.length;W<K;W++)Z[W].getObjectsByProperty(J,Q,$);return $}getWorldPosition(J){return this.updateWorldMatrix(!0,!1),J.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(A7,J,wE),J}getWorldScale(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(A7,AE,J),J}getWorldDirection(J){this.updateWorldMatrix(!0,!1);let Q=this.matrixWorld.elements;return J.set(Q[8],Q[9],Q[10]).normalize()}raycast(){}traverse(J){J(this);let Q=this.children;for(let $=0,Z=Q.length;$<Z;$++)Q[$].traverse(J)}traverseVisible(J){if(this.visible===!1)return;J(this);let Q=this.children;for(let $=0,Z=Q.length;$<Z;$++)Q[$].traverseVisible(J)}traverseAncestors(J){let Q=this.parent;if(Q!==null)J(Q),Q.traverseAncestors(J)}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let J=this.pivot;if(J!==null){let{x:Q,y:$,z:Z}=J,W=this.matrix.elements;W[12]+=Q-W[0]*Q-W[4]*$-W[8]*Z,W[13]+=$-W[1]*Q-W[5]*$-W[9]*Z,W[14]+=Z-W[2]*Q-W[6]*$-W[10]*Z}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(J){if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||J){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,J=!0}let Q=this.children;for(let $=0,Z=Q.length;$<Z;$++)Q[$].updateMatrixWorld(J)}updateWorldMatrix(J,Q){let $=this.parent;if(J===!0&&$!==null)$.updateWorldMatrix(!0,!1);if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);if(Q===!0){let Z=this.children;for(let W=0,K=Z.length;W<K;W++)Z[W].updateWorldMatrix(!1,!0)}}toJSON(J){let Q=J===void 0||typeof J==="string",$={};if(Q)J={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},$.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"};let Z={};if(Z.uuid=this.uuid,Z.type=this.type,this.name!=="")Z.name=this.name;if(this.castShadow===!0)Z.castShadow=!0;if(this.receiveShadow===!0)Z.receiveShadow=!0;if(this.visible===!1)Z.visible=!1;if(this.frustumCulled===!1)Z.frustumCulled=!1;if(this.renderOrder!==0)Z.renderOrder=this.renderOrder;if(this.static!==!1)Z.static=this.static;if(Object.keys(this.userData).length>0)Z.userData=this.userData;if(Z.layers=this.layers.mask,Z.matrix=this.matrix.toArray(),Z.up=this.up.toArray(),this.pivot!==null)Z.pivot=this.pivot.toArray();if(this.matrixAutoUpdate===!1)Z.matrixAutoUpdate=!1;if(this.morphTargetDictionary!==void 0)Z.morphTargetDictionary=Object.assign({},this.morphTargetDictionary);if(this.morphTargetInfluences!==void 0)Z.morphTargetInfluences=this.morphTargetInfluences.slice();if(this.isInstancedMesh){if(Z.type="InstancedMesh",Z.count=this.count,Z.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null)Z.instanceColor=this.instanceColor.toJSON()}if(this.isBatchedMesh){if(Z.type="BatchedMesh",Z.perObjectFrustumCulled=this.perObjectFrustumCulled,Z.sortObjects=this.sortObjects,Z.drawRanges=this._drawRanges,Z.reservedRanges=this._reservedRanges,Z.geometryInfo=this._geometryInfo.map((Y)=>({...Y,boundingBox:Y.boundingBox?Y.boundingBox.toJSON():void 0,boundingSphere:Y.boundingSphere?Y.boundingSphere.toJSON():void 0})),Z.instanceInfo=this._instanceInfo.map((Y)=>({...Y})),Z.availableInstanceIds=this._availableInstanceIds.slice(),Z.availableGeometryIds=this._availableGeometryIds.slice(),Z.nextIndexStart=this._nextIndexStart,Z.nextVertexStart=this._nextVertexStart,Z.geometryCount=this._geometryCount,Z.maxInstanceCount=this._maxInstanceCount,Z.maxVertexCount=this._maxVertexCount,Z.maxIndexCount=this._maxIndexCount,Z.geometryInitialized=this._geometryInitialized,Z.matricesTexture=this._matricesTexture.toJSON(J),Z.indirectTexture=this._indirectTexture.toJSON(J),this._colorsTexture!==null)Z.colorsTexture=this._colorsTexture.toJSON(J);if(this.boundingSphere!==null)Z.boundingSphere=this.boundingSphere.toJSON();if(this.boundingBox!==null)Z.boundingBox=this.boundingBox.toJSON()}function W(Y,H){if(Y[H.uuid]===void 0)Y[H.uuid]=H.toJSON(J);return H.uuid}if(this.isScene){if(this.background){if(this.background.isColor)Z.background=this.background.toJSON();else if(this.background.isTexture)Z.background=this.background.toJSON(J).uuid}if(this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0)Z.environment=this.environment.toJSON(J).uuid}else if(this.isMesh||this.isLine||this.isPoints){Z.geometry=W(J.geometries,this.geometry);let Y=this.geometry.parameters;if(Y!==void 0&&Y.shapes!==void 0){let H=Y.shapes;if(Array.isArray(H))for(let X=0,U=H.length;X<U;X++){let E=H[X];W(J.shapes,E)}else W(J.shapes,H)}}if(this.isSkinnedMesh){if(Z.bindMode=this.bindMode,Z.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0)W(J.skeletons,this.skeleton),Z.skeleton=this.skeleton.uuid}if(this.material!==void 0)if(Array.isArray(this.material)){let Y=[];for(let H=0,X=this.material.length;H<X;H++)Y.push(W(J.materials,this.material[H]));Z.material=Y}else Z.material=W(J.materials,this.material);if(this.children.length>0){Z.children=[];for(let Y=0;Y<this.children.length;Y++)Z.children.push(this.children[Y].toJSON(J).object)}if(this.animations.length>0){Z.animations=[];for(let Y=0;Y<this.animations.length;Y++){let H=this.animations[Y];Z.animations.push(W(J.animations,H))}}if(Q){let Y=K(J.geometries),H=K(J.materials),X=K(J.textures),U=K(J.images),E=K(J.shapes),N=K(J.skeletons),G=K(J.animations),q=K(J.nodes);if(Y.length>0)$.geometries=Y;if(H.length>0)$.materials=H;if(X.length>0)$.textures=X;if(U.length>0)$.images=U;if(E.length>0)$.shapes=E;if(N.length>0)$.skeletons=N;if(G.length>0)$.animations=G;if(q.length>0)$.nodes=q}return $.object=Z,$;function K(Y){let H=[];for(let X in Y){let U=Y[X];delete U.metadata,H.push(U)}return H}}clone(J){return new this.constructor().copy(this,J)}copy(J,Q=!0){if(this.name=J.name,this.up.copy(J.up),this.position.copy(J.position),this.rotation.order=J.rotation.order,this.quaternion.copy(J.quaternion),this.scale.copy(J.scale),this.pivot=J.pivot!==null?J.pivot.clone():null,this.matrix.copy(J.matrix),this.matrixWorld.copy(J.matrixWorld),this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrixWorldAutoUpdate=J.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=J.matrixWorldNeedsUpdate,this.layers.mask=J.layers.mask,this.visible=J.visible,this.castShadow=J.castShadow,this.receiveShadow=J.receiveShadow,this.frustumCulled=J.frustumCulled,this.renderOrder=J.renderOrder,this.static=J.static,this.animations=J.animations.slice(),this.userData=JSON.parse(JSON.stringify(J.userData)),Q===!0)for(let $=0;$<J.children.length;$++){let Z=J.children[$];this.add(Z.clone())}return this}}HJ.DEFAULT_UP=new P(0,1,0);HJ.DEFAULT_MATRIX_AUTO_UPDATE=!0;HJ.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class V8 extends HJ{constructor(){super();this.isGroup=!0,this.type="Group"}}var PE={type:"move"};class Z6{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){if(this._hand===null)this._hand=new V8,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1};return this._hand}getTargetRaySpace(){if(this._targetRay===null)this._targetRay=new V8,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new P,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new P;return this._targetRay}getGripSpace(){if(this._grip===null)this._grip=new V8,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new P,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new P,this._grip.eventsEnabled=!1;return this._grip}dispatchEvent(J){if(this._targetRay!==null)this._targetRay.dispatchEvent(J);if(this._grip!==null)this._grip.dispatchEvent(J);if(this._hand!==null)this._hand.dispatchEvent(J);return this}connect(J){if(J&&J.hand){let Q=this._hand;if(Q)for(let $ of J.hand.values())this._getHandJoint(Q,$)}return this.dispatchEvent({type:"connected",data:J}),this}disconnect(J){if(this.dispatchEvent({type:"disconnected",data:J}),this._targetRay!==null)this._targetRay.visible=!1;if(this._grip!==null)this._grip.visible=!1;if(this._hand!==null)this._hand.visible=!1;return this}update(J,Q,$){let Z=null,W=null,K=null,Y=this._targetRay,H=this._grip,X=this._hand;if(J&&Q.session.visibilityState!=="visible-blurred"){if(X&&J.hand){K=!0;for(let O of J.hand.values()){let R=Q.getJointPose(O,$),F=this._getHandJoint(X,O);if(R!==null)F.matrix.fromArray(R.transform.matrix),F.matrix.decompose(F.position,F.rotation,F.scale),F.matrixWorldNeedsUpdate=!0,F.jointRadius=R.radius;F.visible=R!==null}let U=X.joints["index-finger-tip"],E=X.joints["thumb-tip"],N=U.position.distanceTo(E.position),G=0.02,q=0.005;if(X.inputState.pinching&&N>G+q)X.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:J.handedness,target:this});else if(!X.inputState.pinching&&N<=G-q)X.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:J.handedness,target:this})}else if(H!==null&&J.gripSpace){if(W=Q.getPose(J.gripSpace,$),W!==null){if(H.matrix.fromArray(W.transform.matrix),H.matrix.decompose(H.position,H.rotation,H.scale),H.matrixWorldNeedsUpdate=!0,W.linearVelocity)H.hasLinearVelocity=!0,H.linearVelocity.copy(W.linearVelocity);else H.hasLinearVelocity=!1;if(W.angularVelocity)H.hasAngularVelocity=!0,H.angularVelocity.copy(W.angularVelocity);else H.hasAngularVelocity=!1;if(H.eventsEnabled)H.dispatchEvent({type:"gripUpdated",data:J,target:this})}}if(Y!==null){if(Z=Q.getPose(J.targetRaySpace,$),Z===null&&W!==null)Z=W;if(Z!==null){if(Y.matrix.fromArray(Z.transform.matrix),Y.matrix.decompose(Y.position,Y.rotation,Y.scale),Y.matrixWorldNeedsUpdate=!0,Z.linearVelocity)Y.hasLinearVelocity=!0,Y.linearVelocity.copy(Z.linearVelocity);else Y.hasLinearVelocity=!1;if(Z.angularVelocity)Y.hasAngularVelocity=!0,Y.angularVelocity.copy(Z.angularVelocity);else Y.hasAngularVelocity=!1;this.dispatchEvent(PE)}}}if(Y!==null)Y.visible=Z!==null;if(H!==null)H.visible=W!==null;if(X!==null)X.visible=K!==null;return this}_getHandJoint(J,Q){if(J.joints[Q.jointName]===void 0){let $=new V8;$.matrixAutoUpdate=!1,$.visible=!1,J.joints[Q.jointName]=$,J.add($)}return J.joints[Q.jointName]}}var vH={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},s9={h:0,s:0,l:0},L6={h:0,s:0,l:0};function L$(J,Q,$){if($<0)$+=1;if($>1)$-=1;if($<0.16666666666666666)return J+(Q-J)*6*$;if($<0.5)return Q;if($<0.6666666666666666)return J+(Q-J)*6*(0.6666666666666666-$);return J}class V0{constructor(J,Q,$){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(J,Q,$)}set(J,Q,$){if(Q===void 0&&$===void 0){let Z=J;if(Z&&Z.isColor)this.copy(Z);else if(typeof Z==="number")this.setHex(Z);else if(typeof Z==="string")this.setStyle(Z)}else this.setRGB(J,Q,$);return this}setScalar(J){return this.r=J,this.g=J,this.b=J,this}setHex(J,Q="srgb"){return J=Math.floor(J),this.r=(J>>16&255)/255,this.g=(J>>8&255)/255,this.b=(J&255)/255,$J.colorSpaceToWorking(this,Q),this}setRGB(J,Q,$,Z=$J.workingColorSpace){return this.r=J,this.g=Q,this.b=$,$J.colorSpaceToWorking(this,Z),this}setHSL(J,Q,$,Z=$J.workingColorSpace){if(J=ZW(J,1),Q=m0(Q,0,1),$=m0($,0,1),Q===0)this.r=this.g=this.b=$;else{let W=$<=0.5?$*(1+Q):$+Q-$*Q,K=2*$-W;this.r=L$(K,W,J+0.3333333333333333),this.g=L$(K,W,J),this.b=L$(K,W,J-0.3333333333333333)}return $J.colorSpaceToWorking(this,Z),this}setStyle(J,Q="srgb"){function $(W){if(W===void 0)return;if(parseFloat(W)<1)X0("Color: Alpha component of "+J+" will be ignored.")}let Z;if(Z=/^(\w+)\(([^\)]*)\)/.exec(J)){let W,K=Z[1],Y=Z[2];switch(K){case"rgb":case"rgba":if(W=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(Y))return $(W[4]),this.setRGB(Math.min(255,parseInt(W[1],10))/255,Math.min(255,parseInt(W[2],10))/255,Math.min(255,parseInt(W[3],10))/255,Q);if(W=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(Y))return $(W[4]),this.setRGB(Math.min(100,parseInt(W[1],10))/100,Math.min(100,parseInt(W[2],10))/100,Math.min(100,parseInt(W[3],10))/100,Q);break;case"hsl":case"hsla":if(W=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(Y))return $(W[4]),this.setHSL(parseFloat(W[1])/360,parseFloat(W[2])/100,parseFloat(W[3])/100,Q);break;default:X0("Color: Unknown color model "+J)}}else if(Z=/^\#([A-Fa-f\d]+)$/.exec(J)){let W=Z[1],K=W.length;if(K===3)return this.setRGB(parseInt(W.charAt(0),16)/15,parseInt(W.charAt(1),16)/15,parseInt(W.charAt(2),16)/15,Q);else if(K===6)return this.setHex(parseInt(W,16),Q);else X0("Color: Invalid hex color "+J)}else if(J&&J.length>0)return this.setColorName(J,Q);return this}setColorName(J,Q="srgb"){let $=vH[J.toLowerCase()];if($!==void 0)this.setHex($,Q);else X0("Color: Unknown color "+J);return this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(J){return this.r=J.r,this.g=J.g,this.b=J.b,this}copySRGBToLinear(J){return this.r=h9(J.r),this.g=h9(J.g),this.b=h9(J.b),this}copyLinearToSRGB(J){return this.r=U7(J.r),this.g=U7(J.g),this.b=U7(J.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(J="srgb"){return $J.workingToColorSpace(bJ.copy(this),J),Math.round(m0(bJ.r*255,0,255))*65536+Math.round(m0(bJ.g*255,0,255))*256+Math.round(m0(bJ.b*255,0,255))}getHexString(J="srgb"){return("000000"+this.getHex(J).toString(16)).slice(-6)}getHSL(J,Q=$J.workingColorSpace){$J.workingToColorSpace(bJ.copy(this),Q);let{r:$,g:Z,b:W}=bJ,K=Math.max($,Z,W),Y=Math.min($,Z,W),H,X,U=(Y+K)/2;if(Y===K)H=0,X=0;else{let E=K-Y;switch(X=U<=0.5?E/(K+Y):E/(2-K-Y),K){case $:H=(Z-W)/E+(Z<W?6:0);break;case Z:H=(W-$)/E+2;break;case W:H=($-Z)/E+4;break}H/=6}return J.h=H,J.s=X,J.l=U,J}getRGB(J,Q=$J.workingColorSpace){return $J.workingToColorSpace(bJ.copy(this),Q),J.r=bJ.r,J.g=bJ.g,J.b=bJ.b,J}getStyle(J="srgb"){$J.workingToColorSpace(bJ.copy(this),J);let{r:Q,g:$,b:Z}=bJ;if(J!=="srgb")return`color(${J} ${Q.toFixed(3)} ${$.toFixed(3)} ${Z.toFixed(3)})`;return`rgb(${Math.round(Q*255)},${Math.round($*255)},${Math.round(Z*255)})`}offsetHSL(J,Q,$){return this.getHSL(s9),this.setHSL(s9.h+J,s9.s+Q,s9.l+$)}add(J){return this.r+=J.r,this.g+=J.g,this.b+=J.b,this}addColors(J,Q){return this.r=J.r+Q.r,this.g=J.g+Q.g,this.b=J.b+Q.b,this}addScalar(J){return this.r+=J,this.g+=J,this.b+=J,this}sub(J){return this.r=Math.max(0,this.r-J.r),this.g=Math.max(0,this.g-J.g),this.b=Math.max(0,this.b-J.b),this}multiply(J){return this.r*=J.r,this.g*=J.g,this.b*=J.b,this}multiplyScalar(J){return this.r*=J,this.g*=J,this.b*=J,this}lerp(J,Q){return this.r+=(J.r-this.r)*Q,this.g+=(J.g-this.g)*Q,this.b+=(J.b-this.b)*Q,this}lerpColors(J,Q,$){return this.r=J.r+(Q.r-J.r)*$,this.g=J.g+(Q.g-J.g)*$,this.b=J.b+(Q.b-J.b)*$,this}lerpHSL(J,Q){this.getHSL(s9),J.getHSL(L6);let $=m7(s9.h,L6.h,Q),Z=m7(s9.s,L6.s,Q),W=m7(s9.l,L6.l,Q);return this.setHSL($,Z,W),this}setFromVector3(J){return this.r=J.x,this.g=J.y,this.b=J.z,this}applyMatrix3(J){let Q=this.r,$=this.g,Z=this.b,W=J.elements;return this.r=W[0]*Q+W[3]*$+W[6]*Z,this.g=W[1]*Q+W[4]*$+W[7]*Z,this.b=W[2]*Q+W[5]*$+W[8]*Z,this}equals(J){return J.r===this.r&&J.g===this.g&&J.b===this.b}fromArray(J,Q=0){return this.r=J[Q],this.g=J[Q+1],this.b=J[Q+2],this}toArray(J=[],Q=0){return J[Q]=this.r,J[Q+1]=this.g,J[Q+2]=this.b,J}fromBufferAttribute(J,Q){return this.r=J.getX(Q),this.g=J.getY(Q),this.b=J.getZ(Q),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}var bJ=new V0;V0.NAMES=vH;class _Q{constructor(J,Q=0.00025){this.isFogExp2=!0,this.name="",this.color=new V0(J),this.density=Q}clone(){return new _Q(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class wQ{constructor(J,Q=1,$=1000){this.isFog=!0,this.name="",this.color=new V0(J),this.near=Q,this.far=$}clone(){return new wQ(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class KW extends HJ{constructor(){super();if(this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new N9,this.environmentIntensity=1,this.environmentRotation=new N9,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(J,Q){if(super.copy(J,Q),J.background!==null)this.background=J.background.clone();if(J.environment!==null)this.environment=J.environment.clone();if(J.fog!==null)this.fog=J.fog.clone();if(this.backgroundBlurriness=J.backgroundBlurriness,this.backgroundIntensity=J.backgroundIntensity,this.backgroundRotation.copy(J.backgroundRotation),this.environmentIntensity=J.environmentIntensity,this.environmentRotation.copy(J.environmentRotation),J.overrideMaterial!==null)this.overrideMaterial=J.overrideMaterial.clone();return this.matrixAutoUpdate=J.matrixAutoUpdate,this}toJSON(J){let Q=super.toJSON(J);if(this.fog!==null)Q.object.fog=this.fog.toJSON();if(this.backgroundBlurriness>0)Q.object.backgroundBlurriness=this.backgroundBlurriness;if(this.backgroundIntensity!==1)Q.object.backgroundIntensity=this.backgroundIntensity;if(Q.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1)Q.object.environmentIntensity=this.environmentIntensity;return Q.object.environmentRotation=this.environmentRotation.toArray(),Q}}var U9=new P,P9=new P,V$=new P,T9=new P,n8=new P,s8=new P,jK=new P,B$=new P,z$=new P,I$=new P,_$=new GJ,w$=new GJ,A$=new GJ;class nJ{constructor(J=new P,Q=new P,$=new P){this.a=J,this.b=Q,this.c=$}static getNormal(J,Q,$,Z){Z.subVectors($,Q),U9.subVectors(J,Q),Z.cross(U9);let W=Z.lengthSq();if(W>0)return Z.multiplyScalar(1/Math.sqrt(W));return Z.set(0,0,0)}static getBarycoord(J,Q,$,Z,W){U9.subVectors(Z,Q),P9.subVectors($,Q),V$.subVectors(J,Q);let K=U9.dot(U9),Y=U9.dot(P9),H=U9.dot(V$),X=P9.dot(P9),U=P9.dot(V$),E=K*X-Y*Y;if(E===0)return W.set(0,0,0),null;let N=1/E,G=(X*H-Y*U)*N,q=(K*U-Y*H)*N;return W.set(1-G-q,q,G)}static containsPoint(J,Q,$,Z){if(this.getBarycoord(J,Q,$,Z,T9)===null)return!1;return T9.x>=0&&T9.y>=0&&T9.x+T9.y<=1}static getInterpolation(J,Q,$,Z,W,K,Y,H){if(this.getBarycoord(J,Q,$,Z,T9)===null){if(H.x=0,H.y=0,"z"in H)H.z=0;if("w"in H)H.w=0;return null}return H.setScalar(0),H.addScaledVector(W,T9.x),H.addScaledVector(K,T9.y),H.addScaledVector(Y,T9.z),H}static getInterpolatedAttribute(J,Q,$,Z,W,K){return _$.setScalar(0),w$.setScalar(0),A$.setScalar(0),_$.fromBufferAttribute(J,Q),w$.fromBufferAttribute(J,$),A$.fromBufferAttribute(J,Z),K.setScalar(0),K.addScaledVector(_$,W.x),K.addScaledVector(w$,W.y),K.addScaledVector(A$,W.z),K}static isFrontFacing(J,Q,$,Z){return U9.subVectors($,Q),P9.subVectors(J,Q),U9.cross(P9).dot(Z)<0}set(J,Q,$){return this.a.copy(J),this.b.copy(Q),this.c.copy($),this}setFromPointsAndIndices(J,Q,$,Z){return this.a.copy(J[Q]),this.b.copy(J[$]),this.c.copy(J[Z]),this}setFromAttributeAndIndices(J,Q,$,Z){return this.a.fromBufferAttribute(J,Q),this.b.fromBufferAttribute(J,$),this.c.fromBufferAttribute(J,Z),this}clone(){return new this.constructor().copy(this)}copy(J){return this.a.copy(J.a),this.b.copy(J.b),this.c.copy(J.c),this}getArea(){return U9.subVectors(this.c,this.b),P9.subVectors(this.a,this.b),U9.cross(P9).length()*0.5}getMidpoint(J){return J.addVectors(this.a,this.b).add(this.c).multiplyScalar(0.3333333333333333)}getNormal(J){return nJ.getNormal(this.a,this.b,this.c,J)}getPlane(J){return J.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(J,Q){return nJ.getBarycoord(J,this.a,this.b,this.c,Q)}getInterpolation(J,Q,$,Z,W){return nJ.getInterpolation(J,this.a,this.b,this.c,Q,$,Z,W)}containsPoint(J){return nJ.containsPoint(J,this.a,this.b,this.c)}isFrontFacing(J){return nJ.isFrontFacing(this.a,this.b,this.c,J)}intersectsBox(J){return J.intersectsTriangle(this)}closestPointToPoint(J,Q){let $=this.a,Z=this.b,W=this.c,K,Y;n8.subVectors(Z,$),s8.subVectors(W,$),B$.subVectors(J,$);let H=n8.dot(B$),X=s8.dot(B$);if(H<=0&&X<=0)return Q.copy($);z$.subVectors(J,Z);let U=n8.dot(z$),E=s8.dot(z$);if(U>=0&&E<=U)return Q.copy(Z);let N=H*E-U*X;if(N<=0&&H>=0&&U<=0)return K=H/(H-U),Q.copy($).addScaledVector(n8,K);I$.subVectors(J,W);let G=n8.dot(I$),q=s8.dot(I$);if(q>=0&&G<=q)return Q.copy(W);let O=G*X-H*q;if(O<=0&&X>=0&&q<=0)return Y=X/(X-q),Q.copy($).addScaledVector(s8,Y);let R=U*q-G*E;if(R<=0&&E-U>=0&&G-q>=0)return jK.subVectors(W,Z),Y=(E-U)/(E-U+(G-q)),Q.copy(Z).addScaledVector(jK,Y);let F=1/(R+O+N);return K=O*F,Y=N*F,Q.copy($).addScaledVector(n8,K).addScaledVector(s8,Y)}equals(J){return J.a.equals(this.a)&&J.b.equals(this.b)&&J.c.equals(this.c)}}class jJ{constructor(J=new P(1/0,1/0,1/0),Q=new P(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=J,this.max=Q}set(J,Q){return this.min.copy(J),this.max.copy(Q),this}setFromArray(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q+=3)this.expandByPoint(G9.fromArray(J,Q));return this}setFromBufferAttribute(J){this.makeEmpty();for(let Q=0,$=J.count;Q<$;Q++)this.expandByPoint(G9.fromBufferAttribute(J,Q));return this}setFromPoints(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q++)this.expandByPoint(J[Q]);return this}setFromCenterAndSize(J,Q){let $=G9.copy(Q).multiplyScalar(0.5);return this.min.copy(J).sub($),this.max.copy(J).add($),this}setFromObject(J,Q=!1){return this.makeEmpty(),this.expandByObject(J,Q)}clone(){return new this.constructor().copy(this)}copy(J){return this.min.copy(J.min),this.max.copy(J.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(J){return this.isEmpty()?J.set(0,0,0):J.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize(J){return this.isEmpty()?J.set(0,0,0):J.subVectors(this.max,this.min)}expandByPoint(J){return this.min.min(J),this.max.max(J),this}expandByVector(J){return this.min.sub(J),this.max.add(J),this}expandByScalar(J){return this.min.addScalar(-J),this.max.addScalar(J),this}expandByObject(J,Q=!1){J.updateWorldMatrix(!1,!1);let $=J.geometry;if($!==void 0){let W=$.getAttribute("position");if(Q===!0&&W!==void 0&&J.isInstancedMesh!==!0)for(let K=0,Y=W.count;K<Y;K++){if(J.isMesh===!0)J.getVertexPosition(K,G9);else G9.fromBufferAttribute(W,K);G9.applyMatrix4(J.matrixWorld),this.expandByPoint(G9)}else{if(J.boundingBox!==void 0){if(J.boundingBox===null)J.computeBoundingBox();V6.copy(J.boundingBox)}else{if($.boundingBox===null)$.computeBoundingBox();V6.copy($.boundingBox)}V6.applyMatrix4(J.matrixWorld),this.union(V6)}}let Z=J.children;for(let W=0,K=Z.length;W<K;W++)this.expandByObject(Z[W],Q);return this}containsPoint(J){return J.x>=this.min.x&&J.x<=this.max.x&&J.y>=this.min.y&&J.y<=this.max.y&&J.z>=this.min.z&&J.z<=this.max.z}containsBox(J){return this.min.x<=J.min.x&&J.max.x<=this.max.x&&this.min.y<=J.min.y&&J.max.y<=this.max.y&&this.min.z<=J.min.z&&J.max.z<=this.max.z}getParameter(J,Q){return Q.set((J.x-this.min.x)/(this.max.x-this.min.x),(J.y-this.min.y)/(this.max.y-this.min.y),(J.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(J){return J.max.x>=this.min.x&&J.min.x<=this.max.x&&J.max.y>=this.min.y&&J.min.y<=this.max.y&&J.max.z>=this.min.z&&J.min.z<=this.max.z}intersectsSphere(J){return this.clampPoint(J.center,G9),G9.distanceToSquared(J.center)<=J.radius*J.radius}intersectsPlane(J){let Q,$;if(J.normal.x>0)Q=J.normal.x*this.min.x,$=J.normal.x*this.max.x;else Q=J.normal.x*this.max.x,$=J.normal.x*this.min.x;if(J.normal.y>0)Q+=J.normal.y*this.min.y,$+=J.normal.y*this.max.y;else Q+=J.normal.y*this.max.y,$+=J.normal.y*this.min.y;if(J.normal.z>0)Q+=J.normal.z*this.min.z,$+=J.normal.z*this.max.z;else Q+=J.normal.z*this.max.z,$+=J.normal.z*this.min.z;return Q<=-J.constant&&$>=-J.constant}intersectsTriangle(J){if(this.isEmpty())return!1;this.getCenter(C7),B6.subVectors(this.max,C7),i8.subVectors(J.a,C7),o8.subVectors(J.b,C7),a8.subVectors(J.c,C7),i9.subVectors(o8,i8),o9.subVectors(a8,o8),U8.subVectors(i8,a8);let Q=[0,-i9.z,i9.y,0,-o9.z,o9.y,0,-U8.z,U8.y,i9.z,0,-i9.x,o9.z,0,-o9.x,U8.z,0,-U8.x,-i9.y,i9.x,0,-o9.y,o9.x,0,-U8.y,U8.x,0];if(!C$(Q,i8,o8,a8,B6))return!1;if(Q=[1,0,0,0,1,0,0,0,1],!C$(Q,i8,o8,a8,B6))return!1;return z6.crossVectors(i9,o9),Q=[z6.x,z6.y,z6.z],C$(Q,i8,o8,a8,B6)}clampPoint(J,Q){return Q.copy(J).clamp(this.min,this.max)}distanceToPoint(J){return this.clampPoint(J,G9).distanceTo(J)}getBoundingSphere(J){if(this.isEmpty())J.makeEmpty();else this.getCenter(J.center),J.radius=this.getSize(G9).length()*0.5;return J}intersect(J){if(this.min.max(J.min),this.max.min(J.max),this.isEmpty())this.makeEmpty();return this}union(J){return this.min.min(J.min),this.max.max(J.max),this}applyMatrix4(J){if(this.isEmpty())return this;return S9[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(J),S9[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(J),S9[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(J),S9[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(J),S9[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(J),S9[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(J),S9[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(J),S9[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(J),this.setFromPoints(S9),this}translate(J){return this.min.add(J),this.max.add(J),this}equals(J){return J.min.equals(this.min)&&J.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(J){return this.min.fromArray(J.min),this.max.fromArray(J.max),this}}var S9=[new P,new P,new P,new P,new P,new P,new P,new P],G9=new P,V6=new jJ,i8=new P,o8=new P,a8=new P,i9=new P,o9=new P,U8=new P,C7=new P,B6=new P,z6=new P,G8=new P;function C$(J,Q,$,Z,W){for(let K=0,Y=J.length-3;K<=Y;K+=3){G8.fromArray(J,K);let H=W.x*Math.abs(G8.x)+W.y*Math.abs(G8.y)+W.z*Math.abs(G8.z),X=Q.dot(G8),U=$.dot(G8),E=Z.dot(G8);if(Math.max(-Math.max(X,U,E),Math.min(X,U,E))>H)return!1}return!0}var f9=TE();function TE(){let J=new ArrayBuffer(4),Q=new Float32Array(J),$=new Uint32Array(J),Z=new Uint32Array(512),W=new Uint32Array(512);for(let X=0;X<256;++X){let U=X-127;if(U<-27)Z[X]=0,Z[X|256]=32768,W[X]=24,W[X|256]=24;else if(U<-14)Z[X]=1024>>-U-14,Z[X|256]=1024>>-U-14|32768,W[X]=-U-1,W[X|256]=-U-1;else if(U<=15)Z[X]=U+15<<10,Z[X|256]=U+15<<10|32768,W[X]=13,W[X|256]=13;else if(U<128)Z[X]=31744,Z[X|256]=64512,W[X]=24,W[X|256]=24;else Z[X]=31744,Z[X|256]=64512,W[X]=13,W[X|256]=13}let K=new Uint32Array(2048),Y=new Uint32Array(64),H=new Uint32Array(64);for(let X=1;X<1024;++X){let U=X<<13,E=0;while((U&8388608)===0)U<<=1,E-=8388608;U&=-8388609,E+=947912704,K[X]=U|E}for(let X=1024;X<2048;++X)K[X]=939524096+(X-1024<<13);for(let X=1;X<31;++X)Y[X]=X<<23;Y[31]=1199570944,Y[32]=2147483648;for(let X=33;X<63;++X)Y[X]=2147483648+(X-32<<23);Y[63]=3347054592;for(let X=1;X<64;++X)if(X!==32)H[X]=1024;return{floatView:Q,uint32View:$,baseTable:Z,shiftTable:W,mantissaTable:K,exponentTable:Y,offsetTable:H}}function cJ(J){if(Math.abs(J)>65504)X0("DataUtils.toHalfFloat(): Value out of range.");J=m0(J,-65504,65504),f9.floatView[0]=J;let Q=f9.uint32View[0],$=Q>>23&511;return f9.baseTable[$]+((Q&8388607)>>f9.shiftTable[$])}function g7(J){let Q=J>>10;return f9.uint32View[0]=f9.mantissaTable[f9.offsetTable[Q]+(J&1023)]+f9.exponentTable[Q],f9.floatView[0]}class fH{static toHalfFloat(J){return cJ(J)}static fromHalfFloat(J){return g7(J)}}var wJ=new P,I6=new r,SE=0;class UJ extends K9{constructor(J,Q,$=!1){super();if(Array.isArray(J))throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:SE++}),this.name="",this.array=J,this.itemSize=Q,this.count=J!==void 0?J.length/Q:0,this.normalized=$,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate(J){if(J===!0)this.version++}setUsage(J){return this.usage=J,this}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}copy(J){return this.name=J.name,this.array=new J.array.constructor(J.array),this.itemSize=J.itemSize,this.count=J.count,this.normalized=J.normalized,this.usage=J.usage,this.gpuType=J.gpuType,this}copyAt(J,Q,$){J*=this.itemSize,$*=Q.itemSize;for(let Z=0,W=this.itemSize;Z<W;Z++)this.array[J+Z]=Q.array[$+Z];return this}copyArray(J){return this.array.set(J),this}applyMatrix3(J){if(this.itemSize===2)for(let Q=0,$=this.count;Q<$;Q++)I6.fromBufferAttribute(this,Q),I6.applyMatrix3(J),this.setXY(Q,I6.x,I6.y);else if(this.itemSize===3)for(let Q=0,$=this.count;Q<$;Q++)wJ.fromBufferAttribute(this,Q),wJ.applyMatrix3(J),this.setXYZ(Q,wJ.x,wJ.y,wJ.z);return this}applyMatrix4(J){for(let Q=0,$=this.count;Q<$;Q++)wJ.fromBufferAttribute(this,Q),wJ.applyMatrix4(J),this.setXYZ(Q,wJ.x,wJ.y,wJ.z);return this}applyNormalMatrix(J){for(let Q=0,$=this.count;Q<$;Q++)wJ.fromBufferAttribute(this,Q),wJ.applyNormalMatrix(J),this.setXYZ(Q,wJ.x,wJ.y,wJ.z);return this}transformDirection(J){for(let Q=0,$=this.count;Q<$;Q++)wJ.fromBufferAttribute(this,Q),wJ.transformDirection(J),this.setXYZ(Q,wJ.x,wJ.y,wJ.z);return this}set(J,Q=0){return this.array.set(J,Q),this}getComponent(J,Q){let $=this.array[J*this.itemSize+Q];if(this.normalized)$=dJ($,this.array);return $}setComponent(J,Q,$){if(this.normalized)$=o0($,this.array);return this.array[J*this.itemSize+Q]=$,this}getX(J){let Q=this.array[J*this.itemSize];if(this.normalized)Q=dJ(Q,this.array);return Q}setX(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize]=Q,this}getY(J){let Q=this.array[J*this.itemSize+1];if(this.normalized)Q=dJ(Q,this.array);return Q}setY(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+1]=Q,this}getZ(J){let Q=this.array[J*this.itemSize+2];if(this.normalized)Q=dJ(Q,this.array);return Q}setZ(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+2]=Q,this}getW(J){let Q=this.array[J*this.itemSize+3];if(this.normalized)Q=dJ(Q,this.array);return Q}setW(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+3]=Q,this}setXY(J,Q,$){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this}setXYZ(J,Q,$,Z){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),Z=o0(Z,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this.array[J+2]=Z,this}setXYZW(J,Q,$,Z,W){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),Z=o0(Z,this.array),W=o0(W,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this.array[J+2]=Z,this.array[J+3]=W,this}onUpload(J){return this.onUploadCallback=J,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let J={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};if(this.name!=="")J.name=this.name;if(this.usage!==35044)J.usage=this.usage;return J}dispose(){this.dispatchEvent({type:"dispose"})}}class bH extends UJ{constructor(J,Q,$){super(new Int8Array(J),Q,$)}}class hH extends UJ{constructor(J,Q,$){super(new Uint8Array(J),Q,$)}}class xH extends UJ{constructor(J,Q,$){super(new Uint8ClampedArray(J),Q,$)}}class gH extends UJ{constructor(J,Q,$){super(new Int16Array(J),Q,$)}}class AQ extends UJ{constructor(J,Q,$){super(new Uint16Array(J),Q,$)}}class pH extends UJ{constructor(J,Q,$){super(new Int32Array(J),Q,$)}}class CQ extends UJ{constructor(J,Q,$){super(new Uint32Array(J),Q,$)}}class mH extends UJ{constructor(J,Q,$){super(new Uint16Array(J),Q,$);this.isFloat16BufferAttribute=!0}getX(J){let Q=g7(this.array[J*this.itemSize]);if(this.normalized)Q=dJ(Q,this.array);return Q}setX(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize]=cJ(Q),this}getY(J){let Q=g7(this.array[J*this.itemSize+1]);if(this.normalized)Q=dJ(Q,this.array);return Q}setY(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+1]=cJ(Q),this}getZ(J){let Q=g7(this.array[J*this.itemSize+2]);if(this.normalized)Q=dJ(Q,this.array);return Q}setZ(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+2]=cJ(Q),this}getW(J){let Q=g7(this.array[J*this.itemSize+3]);if(this.normalized)Q=dJ(Q,this.array);return Q}setW(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+3]=cJ(Q),this}setXY(J,Q,$){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array);return this.array[J+0]=cJ(Q),this.array[J+1]=cJ($),this}setXYZ(J,Q,$,Z){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),Z=o0(Z,this.array);return this.array[J+0]=cJ(Q),this.array[J+1]=cJ($),this.array[J+2]=cJ(Z),this}setXYZW(J,Q,$,Z,W){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),Z=o0(Z,this.array),W=o0(W,this.array);return this.array[J+0]=cJ(Q),this.array[J+1]=cJ($),this.array[J+2]=cJ(Z),this.array[J+3]=cJ(W),this}}class I0 extends UJ{constructor(J,Q,$){super(new Float32Array(J),Q,$)}}var jE=new jJ,P7=new P,P$=new P;class SJ{constructor(J=new P,Q=-1){this.isSphere=!0,this.center=J,this.radius=Q}set(J,Q){return this.center.copy(J),this.radius=Q,this}setFromPoints(J,Q){let $=this.center;if(Q!==void 0)$.copy(Q);else jE.setFromPoints(J).getCenter($);let Z=0;for(let W=0,K=J.length;W<K;W++)Z=Math.max(Z,$.distanceToSquared(J[W]));return this.radius=Math.sqrt(Z),this}copy(J){return this.center.copy(J.center),this.radius=J.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(J){return J.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(J){return J.distanceTo(this.center)-this.radius}intersectsSphere(J){let Q=this.radius+J.radius;return J.center.distanceToSquared(this.center)<=Q*Q}intersectsBox(J){return J.intersectsSphere(this)}intersectsPlane(J){return Math.abs(J.distanceToPoint(this.center))<=this.radius}clampPoint(J,Q){let $=this.center.distanceToSquared(J);if(Q.copy(J),$>this.radius*this.radius)Q.sub(this.center).normalize(),Q.multiplyScalar(this.radius).add(this.center);return Q}getBoundingBox(J){if(this.isEmpty())return J.makeEmpty(),J;return J.set(this.center,this.center),J.expandByScalar(this.radius),J}applyMatrix4(J){return this.center.applyMatrix4(J),this.radius=this.radius*J.getMaxScaleOnAxis(),this}translate(J){return this.center.add(J),this}expandByPoint(J){if(this.isEmpty())return this.center.copy(J),this.radius=0,this;P7.subVectors(J,this.center);let Q=P7.lengthSq();if(Q>this.radius*this.radius){let $=Math.sqrt(Q),Z=($-this.radius)*0.5;this.center.addScaledVector(P7,Z/$),this.radius+=Z}return this}union(J){if(J.isEmpty())return this;if(this.isEmpty())return this.copy(J),this;if(this.center.equals(J.center)===!0)this.radius=Math.max(this.radius,J.radius);else P$.subVectors(J.center,this.center).setLength(J.radius),this.expandByPoint(P7.copy(J.center).add(P$)),this.expandByPoint(P7.copy(J.center).sub(P$));return this}equals(J){return J.center.equals(this.center)&&J.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(J){return this.radius=J.radius,this.center.fromArray(J.center),this}}var yE=0,Z9=new d0,T$=new HJ,r8=new P,tJ=new jJ,T7=new jJ,PJ=new P;class n0 extends K9{constructor(){super();this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:yE++}),this.uuid=eJ(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(J){if(Array.isArray(J))this.index=new((eG(J))?CQ:AQ)(J,1);else this.index=J;return this}setIndirect(J,Q=0){return this.indirect=J,this.indirectOffset=Q,this}getIndirect(){return this.indirect}getAttribute(J){return this.attributes[J]}setAttribute(J,Q){return this.attributes[J]=Q,this}deleteAttribute(J){return delete this.attributes[J],this}hasAttribute(J){return this.attributes[J]!==void 0}addGroup(J,Q,$=0){this.groups.push({start:J,count:Q,materialIndex:$})}clearGroups(){this.groups=[]}setDrawRange(J,Q){this.drawRange.start=J,this.drawRange.count=Q}applyMatrix4(J){let Q=this.attributes.position;if(Q!==void 0)Q.applyMatrix4(J),Q.needsUpdate=!0;let $=this.attributes.normal;if($!==void 0){let W=new u0().getNormalMatrix(J);$.applyNormalMatrix(W),$.needsUpdate=!0}let Z=this.attributes.tangent;if(Z!==void 0)Z.transformDirection(J),Z.needsUpdate=!0;if(this.boundingBox!==null)this.computeBoundingBox();if(this.boundingSphere!==null)this.computeBoundingSphere();return this}applyQuaternion(J){return Z9.makeRotationFromQuaternion(J),this.applyMatrix4(Z9),this}rotateX(J){return Z9.makeRotationX(J),this.applyMatrix4(Z9),this}rotateY(J){return Z9.makeRotationY(J),this.applyMatrix4(Z9),this}rotateZ(J){return Z9.makeRotationZ(J),this.applyMatrix4(Z9),this}translate(J,Q,$){return Z9.makeTranslation(J,Q,$),this.applyMatrix4(Z9),this}scale(J,Q,$){return Z9.makeScale(J,Q,$),this.applyMatrix4(Z9),this}lookAt(J){return T$.lookAt(J),T$.updateMatrix(),this.applyMatrix4(T$.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(r8).negate(),this.translate(r8.x,r8.y,r8.z),this}setFromPoints(J){let Q=this.getAttribute("position");if(Q===void 0){let $=[];for(let Z=0,W=J.length;Z<W;Z++){let K=J[Z];$.push(K.x,K.y,K.z||0)}this.setAttribute("position",new I0($,3))}else{let $=Math.min(J.length,Q.count);for(let Z=0;Z<$;Z++){let W=J[Z];Q.setXYZ(Z,W.x,W.y,W.z||0)}if(J.length>Q.count)X0("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.");Q.needsUpdate=!0}return this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new jJ;let J=this.attributes.position,Q=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){T0("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new P(-1/0,-1/0,-1/0),new P(1/0,1/0,1/0));return}if(J!==void 0){if(this.boundingBox.setFromBufferAttribute(J),Q)for(let $=0,Z=Q.length;$<Z;$++){let W=Q[$];if(tJ.setFromBufferAttribute(W),this.morphTargetsRelative)PJ.addVectors(this.boundingBox.min,tJ.min),this.boundingBox.expandByPoint(PJ),PJ.addVectors(this.boundingBox.max,tJ.max),this.boundingBox.expandByPoint(PJ);else this.boundingBox.expandByPoint(tJ.min),this.boundingBox.expandByPoint(tJ.max)}}else this.boundingBox.makeEmpty();if(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))T0('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new SJ;let J=this.attributes.position,Q=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){T0("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new P,1/0);return}if(J){let $=this.boundingSphere.center;if(tJ.setFromBufferAttribute(J),Q)for(let W=0,K=Q.length;W<K;W++){let Y=Q[W];if(T7.setFromBufferAttribute(Y),this.morphTargetsRelative)PJ.addVectors(tJ.min,T7.min),tJ.expandByPoint(PJ),PJ.addVectors(tJ.max,T7.max),tJ.expandByPoint(PJ);else tJ.expandByPoint(T7.min),tJ.expandByPoint(T7.max)}tJ.getCenter($);let Z=0;for(let W=0,K=J.count;W<K;W++)PJ.fromBufferAttribute(J,W),Z=Math.max(Z,$.distanceToSquared(PJ));if(Q)for(let W=0,K=Q.length;W<K;W++){let Y=Q[W],H=this.morphTargetsRelative;for(let X=0,U=Y.count;X<U;X++){if(PJ.fromBufferAttribute(Y,X),H)r8.fromBufferAttribute(J,X),PJ.add(r8);Z=Math.max(Z,$.distanceToSquared(PJ))}}if(this.boundingSphere.radius=Math.sqrt(Z),isNaN(this.boundingSphere.radius))T0('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let J=this.index,Q=this.attributes;if(J===null||Q.position===void 0||Q.normal===void 0||Q.uv===void 0){T0("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let{position:$,normal:Z,uv:W}=Q;if(this.hasAttribute("tangent")===!1)this.setAttribute("tangent",new UJ(new Float32Array(4*$.count),4));let K=this.getAttribute("tangent"),Y=[],H=[];for(let C=0;C<$.count;C++)Y[C]=new P,H[C]=new P;let X=new P,U=new P,E=new P,N=new r,G=new r,q=new r,O=new P,R=new P;function F(C,L,I){X.fromBufferAttribute($,C),U.fromBufferAttribute($,L),E.fromBufferAttribute($,I),N.fromBufferAttribute(W,C),G.fromBufferAttribute(W,L),q.fromBufferAttribute(W,I),U.sub(X),E.sub(X),G.sub(N),q.sub(N);let b=1/(G.x*q.y-q.x*G.y);if(!isFinite(b))return;O.copy(U).multiplyScalar(q.y).addScaledVector(E,-G.y).multiplyScalar(b),R.copy(E).multiplyScalar(G.x).addScaledVector(U,-q.x).multiplyScalar(b),Y[C].add(O),Y[L].add(O),Y[I].add(O),H[C].add(R),H[L].add(R),H[I].add(R)}let D=this.groups;if(D.length===0)D=[{start:0,count:J.count}];for(let C=0,L=D.length;C<L;++C){let I=D[C],b=I.start,T=I.count;for(let p=b,u=b+T;p<u;p+=3)F(J.getX(p+0),J.getX(p+1),J.getX(p+2))}let k=new P,M=new P,V=new P,_=new P;function A(C){V.fromBufferAttribute(Z,C),_.copy(V);let L=Y[C];k.copy(L),k.sub(V.multiplyScalar(V.dot(L))).normalize(),M.crossVectors(_,L);let b=M.dot(H[C])<0?-1:1;K.setXYZW(C,k.x,k.y,k.z,b)}for(let C=0,L=D.length;C<L;++C){let I=D[C],b=I.start,T=I.count;for(let p=b,u=b+T;p<u;p+=3)A(J.getX(p+0)),A(J.getX(p+1)),A(J.getX(p+2))}}computeVertexNormals(){let J=this.index,Q=this.getAttribute("position");if(Q!==void 0){let $=this.getAttribute("normal");if($===void 0)$=new UJ(new Float32Array(Q.count*3),3),this.setAttribute("normal",$);else for(let N=0,G=$.count;N<G;N++)$.setXYZ(N,0,0,0);let Z=new P,W=new P,K=new P,Y=new P,H=new P,X=new P,U=new P,E=new P;if(J)for(let N=0,G=J.count;N<G;N+=3){let q=J.getX(N+0),O=J.getX(N+1),R=J.getX(N+2);Z.fromBufferAttribute(Q,q),W.fromBufferAttribute(Q,O),K.fromBufferAttribute(Q,R),U.subVectors(K,W),E.subVectors(Z,W),U.cross(E),Y.fromBufferAttribute($,q),H.fromBufferAttribute($,O),X.fromBufferAttribute($,R),Y.add(U),H.add(U),X.add(U),$.setXYZ(q,Y.x,Y.y,Y.z),$.setXYZ(O,H.x,H.y,H.z),$.setXYZ(R,X.x,X.y,X.z)}else for(let N=0,G=Q.count;N<G;N+=3)Z.fromBufferAttribute(Q,N+0),W.fromBufferAttribute(Q,N+1),K.fromBufferAttribute(Q,N+2),U.subVectors(K,W),E.subVectors(Z,W),U.cross(E),$.setXYZ(N+0,U.x,U.y,U.z),$.setXYZ(N+1,U.x,U.y,U.z),$.setXYZ(N+2,U.x,U.y,U.z);this.normalizeNormals(),$.needsUpdate=!0}}normalizeNormals(){let J=this.attributes.normal;for(let Q=0,$=J.count;Q<$;Q++)PJ.fromBufferAttribute(J,Q),PJ.normalize(),J.setXYZ(Q,PJ.x,PJ.y,PJ.z)}toNonIndexed(){function J(Y,H){let{array:X,itemSize:U,normalized:E}=Y,N=new X.constructor(H.length*U),G=0,q=0;for(let O=0,R=H.length;O<R;O++){if(Y.isInterleavedBufferAttribute)G=H[O]*Y.data.stride+Y.offset;else G=H[O]*U;for(let F=0;F<U;F++)N[q++]=X[G++]}return new UJ(N,U,E)}if(this.index===null)return X0("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let Q=new n0,$=this.index.array,Z=this.attributes;for(let Y in Z){let H=Z[Y],X=J(H,$);Q.setAttribute(Y,X)}let W=this.morphAttributes;for(let Y in W){let H=[],X=W[Y];for(let U=0,E=X.length;U<E;U++){let N=X[U],G=J(N,$);H.push(G)}Q.morphAttributes[Y]=H}Q.morphTargetsRelative=this.morphTargetsRelative;let K=this.groups;for(let Y=0,H=K.length;Y<H;Y++){let X=K[Y];Q.addGroup(X.start,X.count,X.materialIndex)}return Q}toJSON(){let J={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(J.uuid=this.uuid,J.type=this.type,this.name!=="")J.name=this.name;if(Object.keys(this.userData).length>0)J.userData=this.userData;if(this.parameters!==void 0){let H=this.parameters;for(let X in H)if(H[X]!==void 0)J[X]=H[X];return J}J.data={attributes:{}};let Q=this.index;if(Q!==null)J.data.index={type:Q.array.constructor.name,array:Array.prototype.slice.call(Q.array)};let $=this.attributes;for(let H in $){let X=$[H];J.data.attributes[H]=X.toJSON(J.data)}let Z={},W=!1;for(let H in this.morphAttributes){let X=this.morphAttributes[H],U=[];for(let E=0,N=X.length;E<N;E++){let G=X[E];U.push(G.toJSON(J.data))}if(U.length>0)Z[H]=U,W=!0}if(W)J.data.morphAttributes=Z,J.data.morphTargetsRelative=this.morphTargetsRelative;let K=this.groups;if(K.length>0)J.data.groups=JSON.parse(JSON.stringify(K));let Y=this.boundingSphere;if(Y!==null)J.data.boundingSphere=Y.toJSON();return J}clone(){return new this.constructor().copy(this)}copy(J){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let Q={};this.name=J.name;let $=J.index;if($!==null)this.setIndex($.clone());let Z=J.attributes;for(let X in Z){let U=Z[X];this.setAttribute(X,U.clone(Q))}let W=J.morphAttributes;for(let X in W){let U=[],E=W[X];for(let N=0,G=E.length;N<G;N++)U.push(E[N].clone(Q));this.morphAttributes[X]=U}this.morphTargetsRelative=J.morphTargetsRelative;let K=J.groups;for(let X=0,U=K.length;X<U;X++){let E=K[X];this.addGroup(E.start,E.count,E.materialIndex)}let Y=J.boundingBox;if(Y!==null)this.boundingBox=Y.clone();let H=J.boundingSphere;if(H!==null)this.boundingSphere=H.clone();return this.drawRange.start=J.drawRange.start,this.drawRange.count=J.drawRange.count,this.userData=J.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}class W6{constructor(J,Q){this.isInterleavedBuffer=!0,this.array=J,this.stride=Q,this.count=J!==void 0?J.length/Q:0,this.usage=35044,this.updateRanges=[],this.version=0,this.uuid=eJ()}onUploadCallback(){}set needsUpdate(J){if(J===!0)this.version++}setUsage(J){return this.usage=J,this}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}copy(J){return this.array=new J.array.constructor(J.array),this.count=J.count,this.stride=J.stride,this.usage=J.usage,this}copyAt(J,Q,$){J*=this.stride,$*=Q.stride;for(let Z=0,W=this.stride;Z<W;Z++)this.array[J+Z]=Q.array[$+Z];return this}set(J,Q=0){return this.array.set(J,Q),this}clone(J){if(J.arrayBuffers===void 0)J.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=eJ();if(J.arrayBuffers[this.array.buffer._uuid]===void 0)J.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer;let Q=new this.array.constructor(J.arrayBuffers[this.array.buffer._uuid]),$=new this.constructor(Q,this.stride);return $.setUsage(this.usage),$}onUpload(J){return this.onUploadCallback=J,this}toJSON(J){if(J.arrayBuffers===void 0)J.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=eJ();if(J.arrayBuffers[this.array.buffer._uuid]===void 0)J.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer));return{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}var mJ=new P;class _8{constructor(J,Q,$,Z=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=J,this.itemSize=Q,this.offset=$,this.normalized=Z}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(J){this.data.needsUpdate=J}applyMatrix4(J){for(let Q=0,$=this.data.count;Q<$;Q++)mJ.fromBufferAttribute(this,Q),mJ.applyMatrix4(J),this.setXYZ(Q,mJ.x,mJ.y,mJ.z);return this}applyNormalMatrix(J){for(let Q=0,$=this.count;Q<$;Q++)mJ.fromBufferAttribute(this,Q),mJ.applyNormalMatrix(J),this.setXYZ(Q,mJ.x,mJ.y,mJ.z);return this}transformDirection(J){for(let Q=0,$=this.count;Q<$;Q++)mJ.fromBufferAttribute(this,Q),mJ.transformDirection(J),this.setXYZ(Q,mJ.x,mJ.y,mJ.z);return this}getComponent(J,Q){let $=this.array[J*this.data.stride+this.offset+Q];if(this.normalized)$=dJ($,this.array);return $}setComponent(J,Q,$){if(this.normalized)$=o0($,this.array);return this.data.array[J*this.data.stride+this.offset+Q]=$,this}setX(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.data.array[J*this.data.stride+this.offset]=Q,this}setY(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.data.array[J*this.data.stride+this.offset+1]=Q,this}setZ(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.data.array[J*this.data.stride+this.offset+2]=Q,this}setW(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.data.array[J*this.data.stride+this.offset+3]=Q,this}getX(J){let Q=this.data.array[J*this.data.stride+this.offset];if(this.normalized)Q=dJ(Q,this.array);return Q}getY(J){let Q=this.data.array[J*this.data.stride+this.offset+1];if(this.normalized)Q=dJ(Q,this.array);return Q}getZ(J){let Q=this.data.array[J*this.data.stride+this.offset+2];if(this.normalized)Q=dJ(Q,this.array);return Q}getW(J){let Q=this.data.array[J*this.data.stride+this.offset+3];if(this.normalized)Q=dJ(Q,this.array);return Q}setXY(J,Q,$){if(J=J*this.data.stride+this.offset,this.normalized)Q=o0(Q,this.array),$=o0($,this.array);return this.data.array[J+0]=Q,this.data.array[J+1]=$,this}setXYZ(J,Q,$,Z){if(J=J*this.data.stride+this.offset,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),Z=o0(Z,this.array);return this.data.array[J+0]=Q,this.data.array[J+1]=$,this.data.array[J+2]=Z,this}setXYZW(J,Q,$,Z,W){if(J=J*this.data.stride+this.offset,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),Z=o0(Z,this.array),W=o0(W,this.array);return this.data.array[J+0]=Q,this.data.array[J+1]=$,this.data.array[J+2]=Z,this.data.array[J+3]=W,this}clone(J){if(J===void 0){u7("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let Q=[];for(let $=0;$<this.count;$++){let Z=$*this.data.stride+this.offset;for(let W=0;W<this.itemSize;W++)Q.push(this.data.array[Z+W])}return new UJ(new this.array.constructor(Q),this.itemSize,this.normalized)}else{if(J.interleavedBuffers===void 0)J.interleavedBuffers={};if(J.interleavedBuffers[this.data.uuid]===void 0)J.interleavedBuffers[this.data.uuid]=this.data.clone(J);return new _8(J.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}}toJSON(J){if(J===void 0){u7("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let Q=[];for(let $=0;$<this.count;$++){let Z=$*this.data.stride+this.offset;for(let W=0;W<this.itemSize;W++)Q.push(this.data.array[Z+W])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:Q,normalized:this.normalized}}else{if(J.interleavedBuffers===void 0)J.interleavedBuffers={};if(J.interleavedBuffers[this.data.uuid]===void 0)J.interleavedBuffers[this.data.uuid]=this.data.toJSON(J);return{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}}var vE=0;class yJ extends K9{constructor(){super();this.isMaterial=!0,Object.defineProperty(this,"id",{value:vE++}),this.uuid=eJ(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new V0(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(J){if(this._alphaTest>0!==J>0)this.version++;this._alphaTest=J}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(J){if(J===void 0)return;for(let Q in J){let $=J[Q];if($===void 0){X0(`Material: parameter '${Q}' has value of undefined.`);continue}let Z=this[Q];if(Z===void 0){X0(`Material: '${Q}' is not a property of THREE.${this.type}.`);continue}if(Z&&Z.isColor)Z.set($);else if(Z&&Z.isVector3&&($&&$.isVector3))Z.copy($);else this[Q]=$}}toJSON(J){let Q=J===void 0||typeof J==="string";if(Q)J={textures:{},images:{}};let $={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};if($.uuid=this.uuid,$.type=this.type,this.name!=="")$.name=this.name;if(this.color&&this.color.isColor)$.color=this.color.getHex();if(this.roughness!==void 0)$.roughness=this.roughness;if(this.metalness!==void 0)$.metalness=this.metalness;if(this.sheen!==void 0)$.sheen=this.sheen;if(this.sheenColor&&this.sheenColor.isColor)$.sheenColor=this.sheenColor.getHex();if(this.sheenRoughness!==void 0)$.sheenRoughness=this.sheenRoughness;if(this.emissive&&this.emissive.isColor)$.emissive=this.emissive.getHex();if(this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1)$.emissiveIntensity=this.emissiveIntensity;if(this.specular&&this.specular.isColor)$.specular=this.specular.getHex();if(this.specularIntensity!==void 0)$.specularIntensity=this.specularIntensity;if(this.specularColor&&this.specularColor.isColor)$.specularColor=this.specularColor.getHex();if(this.shininess!==void 0)$.shininess=this.shininess;if(this.clearcoat!==void 0)$.clearcoat=this.clearcoat;if(this.clearcoatRoughness!==void 0)$.clearcoatRoughness=this.clearcoatRoughness;if(this.clearcoatMap&&this.clearcoatMap.isTexture)$.clearcoatMap=this.clearcoatMap.toJSON(J).uuid;if(this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture)$.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(J).uuid;if(this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture)$.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(J).uuid,$.clearcoatNormalScale=this.clearcoatNormalScale.toArray();if(this.sheenColorMap&&this.sheenColorMap.isTexture)$.sheenColorMap=this.sheenColorMap.toJSON(J).uuid;if(this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture)$.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(J).uuid;if(this.dispersion!==void 0)$.dispersion=this.dispersion;if(this.iridescence!==void 0)$.iridescence=this.iridescence;if(this.iridescenceIOR!==void 0)$.iridescenceIOR=this.iridescenceIOR;if(this.iridescenceThicknessRange!==void 0)$.iridescenceThicknessRange=this.iridescenceThicknessRange;if(this.iridescenceMap&&this.iridescenceMap.isTexture)$.iridescenceMap=this.iridescenceMap.toJSON(J).uuid;if(this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture)$.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(J).uuid;if(this.anisotropy!==void 0)$.anisotropy=this.anisotropy;if(this.anisotropyRotation!==void 0)$.anisotropyRotation=this.anisotropyRotation;if(this.anisotropyMap&&this.anisotropyMap.isTexture)$.anisotropyMap=this.anisotropyMap.toJSON(J).uuid;if(this.map&&this.map.isTexture)$.map=this.map.toJSON(J).uuid;if(this.matcap&&this.matcap.isTexture)$.matcap=this.matcap.toJSON(J).uuid;if(this.alphaMap&&this.alphaMap.isTexture)$.alphaMap=this.alphaMap.toJSON(J).uuid;if(this.lightMap&&this.lightMap.isTexture)$.lightMap=this.lightMap.toJSON(J).uuid,$.lightMapIntensity=this.lightMapIntensity;if(this.aoMap&&this.aoMap.isTexture)$.aoMap=this.aoMap.toJSON(J).uuid,$.aoMapIntensity=this.aoMapIntensity;if(this.bumpMap&&this.bumpMap.isTexture)$.bumpMap=this.bumpMap.toJSON(J).uuid,$.bumpScale=this.bumpScale;if(this.normalMap&&this.normalMap.isTexture)$.normalMap=this.normalMap.toJSON(J).uuid,$.normalMapType=this.normalMapType,$.normalScale=this.normalScale.toArray();if(this.displacementMap&&this.displacementMap.isTexture)$.displacementMap=this.displacementMap.toJSON(J).uuid,$.displacementScale=this.displacementScale,$.displacementBias=this.displacementBias;if(this.roughnessMap&&this.roughnessMap.isTexture)$.roughnessMap=this.roughnessMap.toJSON(J).uuid;if(this.metalnessMap&&this.metalnessMap.isTexture)$.metalnessMap=this.metalnessMap.toJSON(J).uuid;if(this.emissiveMap&&this.emissiveMap.isTexture)$.emissiveMap=this.emissiveMap.toJSON(J).uuid;if(this.specularMap&&this.specularMap.isTexture)$.specularMap=this.specularMap.toJSON(J).uuid;if(this.specularIntensityMap&&this.specularIntensityMap.isTexture)$.specularIntensityMap=this.specularIntensityMap.toJSON(J).uuid;if(this.specularColorMap&&this.specularColorMap.isTexture)$.specularColorMap=this.specularColorMap.toJSON(J).uuid;if(this.envMap&&this.envMap.isTexture){if($.envMap=this.envMap.toJSON(J).uuid,this.combine!==void 0)$.combine=this.combine}if(this.envMapRotation!==void 0)$.envMapRotation=this.envMapRotation.toArray();if(this.envMapIntensity!==void 0)$.envMapIntensity=this.envMapIntensity;if(this.reflectivity!==void 0)$.reflectivity=this.reflectivity;if(this.refractionRatio!==void 0)$.refractionRatio=this.refractionRatio;if(this.gradientMap&&this.gradientMap.isTexture)$.gradientMap=this.gradientMap.toJSON(J).uuid;if(this.transmission!==void 0)$.transmission=this.transmission;if(this.transmissionMap&&this.transmissionMap.isTexture)$.transmissionMap=this.transmissionMap.toJSON(J).uuid;if(this.thickness!==void 0)$.thickness=this.thickness;if(this.thicknessMap&&this.thicknessMap.isTexture)$.thicknessMap=this.thicknessMap.toJSON(J).uuid;if(this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0)$.attenuationDistance=this.attenuationDistance;if(this.attenuationColor!==void 0)$.attenuationColor=this.attenuationColor.getHex();if(this.size!==void 0)$.size=this.size;if(this.shadowSide!==null)$.shadowSide=this.shadowSide;if(this.sizeAttenuation!==void 0)$.sizeAttenuation=this.sizeAttenuation;if(this.blending!==1)$.blending=this.blending;if(this.side!==0)$.side=this.side;if(this.vertexColors===!0)$.vertexColors=!0;if(this.opacity<1)$.opacity=this.opacity;if(this.transparent===!0)$.transparent=!0;if(this.blendSrc!==204)$.blendSrc=this.blendSrc;if(this.blendDst!==205)$.blendDst=this.blendDst;if(this.blendEquation!==100)$.blendEquation=this.blendEquation;if(this.blendSrcAlpha!==null)$.blendSrcAlpha=this.blendSrcAlpha;if(this.blendDstAlpha!==null)$.blendDstAlpha=this.blendDstAlpha;if(this.blendEquationAlpha!==null)$.blendEquationAlpha=this.blendEquationAlpha;if(this.blendColor&&this.blendColor.isColor)$.blendColor=this.blendColor.getHex();if(this.blendAlpha!==0)$.blendAlpha=this.blendAlpha;if(this.depthFunc!==3)$.depthFunc=this.depthFunc;if(this.depthTest===!1)$.depthTest=this.depthTest;if(this.depthWrite===!1)$.depthWrite=this.depthWrite;if(this.colorWrite===!1)$.colorWrite=this.colorWrite;if(this.stencilWriteMask!==255)$.stencilWriteMask=this.stencilWriteMask;if(this.stencilFunc!==519)$.stencilFunc=this.stencilFunc;if(this.stencilRef!==0)$.stencilRef=this.stencilRef;if(this.stencilFuncMask!==255)$.stencilFuncMask=this.stencilFuncMask;if(this.stencilFail!==7680)$.stencilFail=this.stencilFail;if(this.stencilZFail!==7680)$.stencilZFail=this.stencilZFail;if(this.stencilZPass!==7680)$.stencilZPass=this.stencilZPass;if(this.stencilWrite===!0)$.stencilWrite=this.stencilWrite;if(this.rotation!==void 0&&this.rotation!==0)$.rotation=this.rotation;if(this.polygonOffset===!0)$.polygonOffset=!0;if(this.polygonOffsetFactor!==0)$.polygonOffsetFactor=this.polygonOffsetFactor;if(this.polygonOffsetUnits!==0)$.polygonOffsetUnits=this.polygonOffsetUnits;if(this.linewidth!==void 0&&this.linewidth!==1)$.linewidth=this.linewidth;if(this.dashSize!==void 0)$.dashSize=this.dashSize;if(this.gapSize!==void 0)$.gapSize=this.gapSize;if(this.scale!==void 0)$.scale=this.scale;if(this.dithering===!0)$.dithering=!0;if(this.alphaTest>0)$.alphaTest=this.alphaTest;if(this.alphaHash===!0)$.alphaHash=!0;if(this.alphaToCoverage===!0)$.alphaToCoverage=!0;if(this.premultipliedAlpha===!0)$.premultipliedAlpha=!0;if(this.forceSinglePass===!0)$.forceSinglePass=!0;if(this.allowOverride===!1)$.allowOverride=!1;if(this.wireframe===!0)$.wireframe=!0;if(this.wireframeLinewidth>1)$.wireframeLinewidth=this.wireframeLinewidth;if(this.wireframeLinecap!=="round")$.wireframeLinecap=this.wireframeLinecap;if(this.wireframeLinejoin!=="round")$.wireframeLinejoin=this.wireframeLinejoin;if(this.flatShading===!0)$.flatShading=!0;if(this.visible===!1)$.visible=!1;if(this.toneMapped===!1)$.toneMapped=!1;if(this.fog===!1)$.fog=!1;if(Object.keys(this.userData).length>0)$.userData=this.userData;function Z(W){let K=[];for(let Y in W){let H=W[Y];delete H.metadata,K.push(H)}return K}if(Q){let W=Z(J.textures),K=Z(J.images);if(W.length>0)$.textures=W;if(K.length>0)$.images=K}return $}clone(){return new this.constructor().copy(this)}copy(J){this.name=J.name,this.blending=J.blending,this.side=J.side,this.vertexColors=J.vertexColors,this.opacity=J.opacity,this.transparent=J.transparent,this.blendSrc=J.blendSrc,this.blendDst=J.blendDst,this.blendEquation=J.blendEquation,this.blendSrcAlpha=J.blendSrcAlpha,this.blendDstAlpha=J.blendDstAlpha,this.blendEquationAlpha=J.blendEquationAlpha,this.blendColor.copy(J.blendColor),this.blendAlpha=J.blendAlpha,this.depthFunc=J.depthFunc,this.depthTest=J.depthTest,this.depthWrite=J.depthWrite,this.stencilWriteMask=J.stencilWriteMask,this.stencilFunc=J.stencilFunc,this.stencilRef=J.stencilRef,this.stencilFuncMask=J.stencilFuncMask,this.stencilFail=J.stencilFail,this.stencilZFail=J.stencilZFail,this.stencilZPass=J.stencilZPass,this.stencilWrite=J.stencilWrite;let Q=J.clippingPlanes,$=null;if(Q!==null){let Z=Q.length;$=Array(Z);for(let W=0;W!==Z;++W)$[W]=Q[W].clone()}return this.clippingPlanes=$,this.clipIntersection=J.clipIntersection,this.clipShadows=J.clipShadows,this.shadowSide=J.shadowSide,this.colorWrite=J.colorWrite,this.precision=J.precision,this.polygonOffset=J.polygonOffset,this.polygonOffsetFactor=J.polygonOffsetFactor,this.polygonOffsetUnits=J.polygonOffsetUnits,this.dithering=J.dithering,this.alphaTest=J.alphaTest,this.alphaHash=J.alphaHash,this.alphaToCoverage=J.alphaToCoverage,this.premultipliedAlpha=J.premultipliedAlpha,this.forceSinglePass=J.forceSinglePass,this.allowOverride=J.allowOverride,this.visible=J.visible,this.toneMapped=J.toneMapped,this.userData=JSON.parse(JSON.stringify(J.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(J){if(J===!0)this.version++}}class PQ extends yJ{constructor(J){super();this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new V0(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.alphaMap=J.alphaMap,this.rotation=J.rotation,this.sizeAttenuation=J.sizeAttenuation,this.fog=J.fog,this}}var t8,S7=new P,e8=new P,J7=new P,Q7=new r,j7=new r,dH=new d0,_6=new P,y7=new P,w6=new P,yK=new r,S$=new r,vK=new r;class YW extends HJ{constructor(J=new PQ){super();if(this.isSprite=!0,this.type="Sprite",t8===void 0){t8=new n0;let Q=new Float32Array([-0.5,-0.5,0,0,0,0.5,-0.5,0,1,0,0.5,0.5,0,1,1,-0.5,0.5,0,0,1]),$=new W6(Q,5);t8.setIndex([0,1,2,0,2,3]),t8.setAttribute("position",new _8($,3,0,!1)),t8.setAttribute("uv",new _8($,2,3,!1))}this.geometry=t8,this.material=J,this.center=new r(0.5,0.5),this.count=1}raycast(J,Q){if(J.camera===null)T0('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.');if(e8.setFromMatrixScale(this.matrixWorld),dH.copy(J.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(J.camera.matrixWorldInverse,this.matrixWorld),J7.setFromMatrixPosition(this.modelViewMatrix),J.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1)e8.multiplyScalar(-J7.z);let $=this.material.rotation,Z,W;if($!==0)W=Math.cos($),Z=Math.sin($);let K=this.center;A6(_6.set(-0.5,-0.5,0),J7,K,e8,Z,W),A6(y7.set(0.5,-0.5,0),J7,K,e8,Z,W),A6(w6.set(0.5,0.5,0),J7,K,e8,Z,W),yK.set(0,0),S$.set(1,0),vK.set(1,1);let Y=J.ray.intersectTriangle(_6,y7,w6,!1,S7);if(Y===null){if(A6(y7.set(-0.5,0.5,0),J7,K,e8,Z,W),S$.set(0,1),Y=J.ray.intersectTriangle(_6,w6,y7,!1,S7),Y===null)return}let H=J.ray.origin.distanceTo(S7);if(H<J.near||H>J.far)return;Q.push({distance:H,point:S7.clone(),uv:nJ.getInterpolation(S7,_6,y7,w6,yK,S$,vK,new r),face:null,object:this})}copy(J,Q){if(super.copy(J,Q),J.center!==void 0)this.center.copy(J.center);return this.material=J.material,this}}function A6(J,Q,$,Z,W,K){if(Q7.subVectors(J,$).addScalar(0.5).multiply(Z),W!==void 0)j7.x=K*Q7.x-W*Q7.y,j7.y=W*Q7.x+K*Q7.y;else j7.copy(Q7);J.copy(Q),J.x+=j7.x,J.y+=j7.y,J.applyMatrix4(dH)}var C6=new P,fK=new P;class HW extends HJ{constructor(){super();this.isLOD=!0,this._currentLevel=0,this.type="LOD",Object.defineProperties(this,{levels:{enumerable:!0,value:[]}}),this.autoUpdate=!0}copy(J){super.copy(J,!1);let Q=J.levels;for(let $=0,Z=Q.length;$<Z;$++){let W=Q[$];this.addLevel(W.object.clone(),W.distance,W.hysteresis)}return this.autoUpdate=J.autoUpdate,this}addLevel(J,Q=0,$=0){Q=Math.abs(Q);let Z=this.levels,W;for(W=0;W<Z.length;W++)if(Q<Z[W].distance)break;return Z.splice(W,0,{distance:Q,hysteresis:$,object:J}),this.add(J),this}removeLevel(J){let Q=this.levels;for(let $=0;$<Q.length;$++)if(Q[$].distance===J){let Z=Q.splice($,1);return this.remove(Z[0].object),!0}return!1}getCurrentLevel(){return this._currentLevel}getObjectForDistance(J){let Q=this.levels;if(Q.length>0){let $,Z;for($=1,Z=Q.length;$<Z;$++){let W=Q[$].distance;if(Q[$].object.visible)W-=W*Q[$].hysteresis;if(J<W)break}return Q[$-1].object}return null}raycast(J,Q){if(this.levels.length>0){C6.setFromMatrixPosition(this.matrixWorld);let Z=J.ray.origin.distanceTo(C6);this.getObjectForDistance(Z).raycast(J,Q)}}update(J){let Q=this.levels;if(Q.length>1){C6.setFromMatrixPosition(J.matrixWorld),fK.setFromMatrixPosition(this.matrixWorld);let $=C6.distanceTo(fK)/J.zoom;Q[0].object.visible=!0;let Z,W;for(Z=1,W=Q.length;Z<W;Z++){let K=Q[Z].distance;if(Q[Z].object.visible)K-=K*Q[Z].hysteresis;if($>=K)Q[Z-1].object.visible=!1,Q[Z].object.visible=!0;else break}this._currentLevel=Z-1;for(;Z<W;Z++)Q[Z].object.visible=!1}}toJSON(J){let Q=super.toJSON(J);if(this.autoUpdate===!1)Q.object.autoUpdate=!1;Q.object.levels=[];let $=this.levels;for(let Z=0,W=$.length;Z<W;Z++){let K=$[Z];Q.object.levels.push({object:K.object.uuid,distance:K.distance,hysteresis:K.hysteresis})}return Q}}var j9=new P,j$=new P,P6=new P,a9=new P,y$=new P,T6=new P,v$=new P;class v8{constructor(J=new P,Q=new P(0,0,-1)){this.origin=J,this.direction=Q}set(J,Q){return this.origin.copy(J),this.direction.copy(Q),this}copy(J){return this.origin.copy(J.origin),this.direction.copy(J.direction),this}at(J,Q){return Q.copy(this.origin).addScaledVector(this.direction,J)}lookAt(J){return this.direction.copy(J).sub(this.origin).normalize(),this}recast(J){return this.origin.copy(this.at(J,j9)),this}closestPointToPoint(J,Q){Q.subVectors(J,this.origin);let $=Q.dot(this.direction);if($<0)return Q.copy(this.origin);return Q.copy(this.origin).addScaledVector(this.direction,$)}distanceToPoint(J){return Math.sqrt(this.distanceSqToPoint(J))}distanceSqToPoint(J){let Q=j9.subVectors(J,this.origin).dot(this.direction);if(Q<0)return this.origin.distanceToSquared(J);return j9.copy(this.origin).addScaledVector(this.direction,Q),j9.distanceToSquared(J)}distanceSqToSegment(J,Q,$,Z){j$.copy(J).add(Q).multiplyScalar(0.5),P6.copy(Q).sub(J).normalize(),a9.copy(this.origin).sub(j$);let W=J.distanceTo(Q)*0.5,K=-this.direction.dot(P6),Y=a9.dot(this.direction),H=-a9.dot(P6),X=a9.lengthSq(),U=Math.abs(1-K*K),E,N,G,q;if(U>0)if(E=K*H-Y,N=K*Y-H,q=W*U,E>=0)if(N>=-q)if(N<=q){let O=1/U;E*=O,N*=O,G=E*(E+K*N+2*Y)+N*(K*E+N+2*H)+X}else N=W,E=Math.max(0,-(K*N+Y)),G=-E*E+N*(N+2*H)+X;else N=-W,E=Math.max(0,-(K*N+Y)),G=-E*E+N*(N+2*H)+X;else if(N<=-q)E=Math.max(0,-(-K*W+Y)),N=E>0?-W:Math.min(Math.max(-W,-H),W),G=-E*E+N*(N+2*H)+X;else if(N<=q)E=0,N=Math.min(Math.max(-W,-H),W),G=N*(N+2*H)+X;else E=Math.max(0,-(K*W+Y)),N=E>0?W:Math.min(Math.max(-W,-H),W),G=-E*E+N*(N+2*H)+X;else N=K>0?-W:W,E=Math.max(0,-(K*N+Y)),G=-E*E+N*(N+2*H)+X;if($)$.copy(this.origin).addScaledVector(this.direction,E);if(Z)Z.copy(j$).addScaledVector(P6,N);return G}intersectSphere(J,Q){j9.subVectors(J.center,this.origin);let $=j9.dot(this.direction),Z=j9.dot(j9)-$*$,W=J.radius*J.radius;if(Z>W)return null;let K=Math.sqrt(W-Z),Y=$-K,H=$+K;if(H<0)return null;if(Y<0)return this.at(H,Q);return this.at(Y,Q)}intersectsSphere(J){if(J.radius<0)return!1;return this.distanceSqToPoint(J.center)<=J.radius*J.radius}distanceToPlane(J){let Q=J.normal.dot(this.direction);if(Q===0){if(J.distanceToPoint(this.origin)===0)return 0;return null}let $=-(this.origin.dot(J.normal)+J.constant)/Q;return $>=0?$:null}intersectPlane(J,Q){let $=this.distanceToPlane(J);if($===null)return null;return this.at($,Q)}intersectsPlane(J){let Q=J.distanceToPoint(this.origin);if(Q===0)return!0;if(J.normal.dot(this.direction)*Q<0)return!0;return!1}intersectBox(J,Q){let $,Z,W,K,Y,H,X=1/this.direction.x,U=1/this.direction.y,E=1/this.direction.z,N=this.origin;if(X>=0)$=(J.min.x-N.x)*X,Z=(J.max.x-N.x)*X;else $=(J.max.x-N.x)*X,Z=(J.min.x-N.x)*X;if(U>=0)W=(J.min.y-N.y)*U,K=(J.max.y-N.y)*U;else W=(J.max.y-N.y)*U,K=(J.min.y-N.y)*U;if($>K||W>Z)return null;if(W>$||isNaN($))$=W;if(K<Z||isNaN(Z))Z=K;if(E>=0)Y=(J.min.z-N.z)*E,H=(J.max.z-N.z)*E;else Y=(J.max.z-N.z)*E,H=(J.min.z-N.z)*E;if($>H||Y>Z)return null;if(Y>$||$!==$)$=Y;if(H<Z||Z!==Z)Z=H;if(Z<0)return null;return this.at($>=0?$:Z,Q)}intersectsBox(J){return this.intersectBox(J,j9)!==null}intersectTriangle(J,Q,$,Z,W){y$.subVectors(Q,J),T6.subVectors($,J),v$.crossVectors(y$,T6);let K=this.direction.dot(v$),Y;if(K>0){if(Z)return null;Y=1}else if(K<0)Y=-1,K=-K;else return null;a9.subVectors(this.origin,J);let H=Y*this.direction.dot(T6.crossVectors(a9,T6));if(H<0)return null;let X=Y*this.direction.dot(y$.cross(a9));if(X<0)return null;if(H+X>K)return null;let U=-Y*a9.dot(v$);if(U<0)return null;return this.at(U/K,W)}applyMatrix4(J){return this.origin.applyMatrix4(J),this.direction.transformDirection(J),this}equals(J){return J.origin.equals(this.origin)&&J.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class m9 extends yJ{constructor(J){super();this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new V0(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new N9,this.combine=0,this.reflectivity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.specularMap=J.specularMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.combine=J.combine,this.reflectivity=J.reflectivity,this.refractionRatio=J.refractionRatio,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.fog=J.fog,this}}var bK=new d0,E8=new v8,S6=new SJ,hK=new P,j6=new P,y6=new P,v6=new P,f$=new P,f6=new P,xK=new P,b6=new P;class IJ extends HJ{constructor(J=new n0,Q=new m9){super();this.isMesh=!0,this.type="Mesh",this.geometry=J,this.material=Q,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(J,Q){if(super.copy(J,Q),J.morphTargetInfluences!==void 0)this.morphTargetInfluences=J.morphTargetInfluences.slice();if(J.morphTargetDictionary!==void 0)this.morphTargetDictionary=Object.assign({},J.morphTargetDictionary);return this.material=Array.isArray(J.material)?J.material.slice():J.material,this.geometry=J.geometry,this}updateMorphTargets(){let Q=this.geometry.morphAttributes,$=Object.keys(Q);if($.length>0){let Z=Q[$[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let W=0,K=Z.length;W<K;W++){let Y=Z[W].name||String(W);this.morphTargetInfluences.push(0),this.morphTargetDictionary[Y]=W}}}}getVertexPosition(J,Q){let $=this.geometry,Z=$.attributes.position,W=$.morphAttributes.position,K=$.morphTargetsRelative;Q.fromBufferAttribute(Z,J);let Y=this.morphTargetInfluences;if(W&&Y){f6.set(0,0,0);for(let H=0,X=W.length;H<X;H++){let U=Y[H],E=W[H];if(U===0)continue;if(f$.fromBufferAttribute(E,J),K)f6.addScaledVector(f$,U);else f6.addScaledVector(f$.sub(Q),U)}Q.add(f6)}return Q}raycast(J,Q){let $=this.geometry,Z=this.material,W=this.matrixWorld;if(Z===void 0)return;if($.boundingSphere===null)$.computeBoundingSphere();if(S6.copy($.boundingSphere),S6.applyMatrix4(W),E8.copy(J.ray).recast(J.near),S6.containsPoint(E8.origin)===!1){if(E8.intersectSphere(S6,hK)===null)return;if(E8.origin.distanceToSquared(hK)>(J.far-J.near)**2)return}if(bK.copy(W).invert(),E8.copy(J.ray).applyMatrix4(bK),$.boundingBox!==null){if(E8.intersectsBox($.boundingBox)===!1)return}this._computeIntersections(J,Q,E8)}_computeIntersections(J,Q,$){let Z,W=this.geometry,K=this.material,Y=W.index,H=W.attributes.position,X=W.attributes.uv,U=W.attributes.uv1,E=W.attributes.normal,N=W.groups,G=W.drawRange;if(Y!==null)if(Array.isArray(K))for(let q=0,O=N.length;q<O;q++){let R=N[q],F=K[R.materialIndex],D=Math.max(R.start,G.start),k=Math.min(Y.count,Math.min(R.start+R.count,G.start+G.count));for(let M=D,V=k;M<V;M+=3){let _=Y.getX(M),A=Y.getX(M+1),C=Y.getX(M+2);if(Z=h6(this,F,J,$,X,U,E,_,A,C),Z)Z.faceIndex=Math.floor(M/3),Z.face.materialIndex=R.materialIndex,Q.push(Z)}}else{let q=Math.max(0,G.start),O=Math.min(Y.count,G.start+G.count);for(let R=q,F=O;R<F;R+=3){let D=Y.getX(R),k=Y.getX(R+1),M=Y.getX(R+2);if(Z=h6(this,K,J,$,X,U,E,D,k,M),Z)Z.faceIndex=Math.floor(R/3),Q.push(Z)}}else if(H!==void 0)if(Array.isArray(K))for(let q=0,O=N.length;q<O;q++){let R=N[q],F=K[R.materialIndex],D=Math.max(R.start,G.start),k=Math.min(H.count,Math.min(R.start+R.count,G.start+G.count));for(let M=D,V=k;M<V;M+=3){let _=M,A=M+1,C=M+2;if(Z=h6(this,F,J,$,X,U,E,_,A,C),Z)Z.faceIndex=Math.floor(M/3),Z.face.materialIndex=R.materialIndex,Q.push(Z)}}else{let q=Math.max(0,G.start),O=Math.min(H.count,G.start+G.count);for(let R=q,F=O;R<F;R+=3){let D=R,k=R+1,M=R+2;if(Z=h6(this,K,J,$,X,U,E,D,k,M),Z)Z.faceIndex=Math.floor(R/3),Q.push(Z)}}}}function fE(J,Q,$,Z,W,K,Y,H){let X;if(Q.side===1)X=Z.intersectTriangle(Y,K,W,!0,H);else X=Z.intersectTriangle(W,K,Y,Q.side===0,H);if(X===null)return null;b6.copy(H),b6.applyMatrix4(J.matrixWorld);let U=$.ray.origin.distanceTo(b6);if(U<$.near||U>$.far)return null;return{distance:U,point:b6.clone(),object:J}}function h6(J,Q,$,Z,W,K,Y,H,X,U){J.getVertexPosition(H,j6),J.getVertexPosition(X,y6),J.getVertexPosition(U,v6);let E=fE(J,Q,$,Z,j6,y6,v6,xK);if(E){let N=new P;if(nJ.getBarycoord(xK,j6,y6,v6,N),W)E.uv=nJ.getInterpolatedAttribute(W,H,X,U,N,new r);if(K)E.uv1=nJ.getInterpolatedAttribute(K,H,X,U,N,new r);if(Y){if(E.normal=nJ.getInterpolatedAttribute(Y,H,X,U,N,new P),E.normal.dot(Z.direction)>0)E.normal.multiplyScalar(-1)}let G={a:H,b:X,c:U,normal:new P,materialIndex:0};nJ.getNormal(j6,y6,v6,G.normal),E.face=G,E.barycoord=N}return E}var v7=new GJ,gK=new GJ,pK=new GJ,bE=new GJ,mK=new d0,x6=new P,b$=new SJ,dK=new d0,h$=new v8;class XW extends IJ{constructor(J,Q){super(J,Q);this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode="attached",this.bindMatrix=new d0,this.bindMatrixInverse=new d0,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let J=this.geometry;if(this.boundingBox===null)this.boundingBox=new jJ;this.boundingBox.makeEmpty();let Q=J.getAttribute("position");for(let $=0;$<Q.count;$++)this.getVertexPosition($,x6),this.boundingBox.expandByPoint(x6)}computeBoundingSphere(){let J=this.geometry;if(this.boundingSphere===null)this.boundingSphere=new SJ;this.boundingSphere.makeEmpty();let Q=J.getAttribute("position");for(let $=0;$<Q.count;$++)this.getVertexPosition($,x6),this.boundingSphere.expandByPoint(x6)}copy(J,Q){if(super.copy(J,Q),this.bindMode=J.bindMode,this.bindMatrix.copy(J.bindMatrix),this.bindMatrixInverse.copy(J.bindMatrixInverse),this.skeleton=J.skeleton,J.boundingBox!==null)this.boundingBox=J.boundingBox.clone();if(J.boundingSphere!==null)this.boundingSphere=J.boundingSphere.clone();return this}raycast(J,Q){let $=this.material,Z=this.matrixWorld;if($===void 0)return;if(this.boundingSphere===null)this.computeBoundingSphere();if(b$.copy(this.boundingSphere),b$.applyMatrix4(Z),J.ray.intersectsSphere(b$)===!1)return;if(dK.copy(Z).invert(),h$.copy(J.ray).applyMatrix4(dK),this.boundingBox!==null){if(h$.intersectsBox(this.boundingBox)===!1)return}this._computeIntersections(J,Q,h$)}getVertexPosition(J,Q){return super.getVertexPosition(J,Q),this.applyBoneTransform(J,Q),Q}bind(J,Q){if(this.skeleton=J,Q===void 0)this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),Q=this.matrixWorld;this.bindMatrix.copy(Q),this.bindMatrixInverse.copy(Q).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let J=new GJ,Q=this.geometry.attributes.skinWeight;for(let $=0,Z=Q.count;$<Z;$++){J.fromBufferAttribute(Q,$);let W=1/J.manhattanLength();if(W!==1/0)J.multiplyScalar(W);else J.set(1,0,0,0);Q.setXYZW($,J.x,J.y,J.z,J.w)}}updateMatrixWorld(J){if(super.updateMatrixWorld(J),this.bindMode==="attached")this.bindMatrixInverse.copy(this.matrixWorld).invert();else if(this.bindMode==="detached")this.bindMatrixInverse.copy(this.bindMatrix).invert();else X0("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(J,Q){let $=this.skeleton,Z=this.geometry;if(gK.fromBufferAttribute(Z.attributes.skinIndex,J),pK.fromBufferAttribute(Z.attributes.skinWeight,J),Q.isVector4)v7.copy(Q),Q.set(0,0,0,0);else v7.set(...Q,1),Q.set(0,0,0);v7.applyMatrix4(this.bindMatrix);for(let W=0;W<4;W++){let K=pK.getComponent(W);if(K!==0){let Y=gK.getComponent(W);mK.multiplyMatrices($.bones[Y].matrixWorld,$.boneInverses[Y]),Q.addScaledVector(bE.copy(v7).applyMatrix4(mK),K)}}if(Q.isVector4)Q.w=v7.w;return Q.applyMatrix4(this.bindMatrixInverse)}}class TQ extends HJ{constructor(){super();this.isBone=!0,this.type="Bone"}}class W9 extends kJ{constructor(J=null,Q=1,$=1,Z,W,K,Y,H,X=1003,U=1003,E,N){super(null,K,Y,H,X,U,Z,W,E,N);this.isDataTexture=!0,this.image={data:J,width:Q,height:$},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}var lK=new d0,hE=new d0;class SQ{constructor(J=[],Q=[]){this.uuid=eJ(),this.bones=J.slice(0),this.boneInverses=Q,this.boneMatrices=null,this.previousBoneMatrices=null,this.boneTexture=null,this.init()}init(){let J=this.bones,Q=this.boneInverses;if(this.boneMatrices=new Float32Array(J.length*16),Q.length===0)this.calculateInverses();else if(J.length!==Q.length){X0("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let $=0,Z=this.bones.length;$<Z;$++)this.boneInverses.push(new d0)}}calculateInverses(){this.boneInverses.length=0;for(let J=0,Q=this.bones.length;J<Q;J++){let $=new d0;if(this.bones[J])$.copy(this.bones[J].matrixWorld).invert();this.boneInverses.push($)}}pose(){for(let J=0,Q=this.bones.length;J<Q;J++){let $=this.bones[J];if($)$.matrixWorld.copy(this.boneInverses[J]).invert()}for(let J=0,Q=this.bones.length;J<Q;J++){let $=this.bones[J];if($){if($.parent&&$.parent.isBone)$.matrix.copy($.parent.matrixWorld).invert(),$.matrix.multiply($.matrixWorld);else $.matrix.copy($.matrixWorld);$.matrix.decompose($.position,$.quaternion,$.scale)}}}update(){let J=this.bones,Q=this.boneInverses,$=this.boneMatrices,Z=this.boneTexture;for(let W=0,K=J.length;W<K;W++){let Y=J[W]?J[W].matrixWorld:hE;lK.multiplyMatrices(Y,Q[W]),lK.toArray($,W*16)}if(Z!==null)Z.needsUpdate=!0}clone(){return new SQ(this.bones,this.boneInverses)}computeBoneTexture(){let J=Math.sqrt(this.bones.length*4);J=Math.ceil(J/4)*4,J=Math.max(J,4);let Q=new Float32Array(J*J*4);Q.set(this.boneMatrices);let $=new W9(Q,J,J,1023,1015);return $.needsUpdate=!0,this.boneMatrices=Q,this.boneTexture=$,this}getBoneByName(J){for(let Q=0,$=this.bones.length;Q<$;Q++){let Z=this.bones[Q];if(Z.name===J)return Z}return}dispose(){if(this.boneTexture!==null)this.boneTexture.dispose(),this.boneTexture=null}fromJSON(J,Q){this.uuid=J.uuid;for(let $=0,Z=J.bones.length;$<Z;$++){let W=J.bones[$],K=Q[W];if(K===void 0)X0("Skeleton: No bone found with UUID:",W),K=new TQ;this.bones.push(K),this.boneInverses.push(new d0().fromArray(J.boneInverses[$]))}return this.init(),this}toJSON(){let J={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};J.uuid=this.uuid;let Q=this.bones,$=this.boneInverses;for(let Z=0,W=Q.length;Z<W;Z++){let K=Q[Z];J.bones.push(K.uuid);let Y=$[Z];J.boneInverses.push(Y.toArray())}return J}}class w8 extends UJ{constructor(J,Q,$,Z=1){super(J,Q,$);this.isInstancedBufferAttribute=!0,this.meshPerAttribute=Z}copy(J){return super.copy(J),this.meshPerAttribute=J.meshPerAttribute,this}toJSON(){let J=super.toJSON();return J.meshPerAttribute=this.meshPerAttribute,J.isInstancedBufferAttribute=!0,J}}var $7=new d0,uK=new d0,g6=[],cK=new jJ,xE=new d0,f7=new IJ,b7=new SJ;class UW extends IJ{constructor(J,Q,$){super(J,Q);this.isInstancedMesh=!0,this.instanceMatrix=new w8(new Float32Array($*16),16),this.previousInstanceMatrix=null,this.instanceColor=null,this.morphTexture=null,this.count=$,this.boundingBox=null,this.boundingSphere=null;for(let Z=0;Z<$;Z++)this.setMatrixAt(Z,xE)}computeBoundingBox(){let J=this.geometry,Q=this.count;if(this.boundingBox===null)this.boundingBox=new jJ;if(J.boundingBox===null)J.computeBoundingBox();this.boundingBox.makeEmpty();for(let $=0;$<Q;$++)this.getMatrixAt($,$7),cK.copy(J.boundingBox).applyMatrix4($7),this.boundingBox.union(cK)}computeBoundingSphere(){let J=this.geometry,Q=this.count;if(this.boundingSphere===null)this.boundingSphere=new SJ;if(J.boundingSphere===null)J.computeBoundingSphere();this.boundingSphere.makeEmpty();for(let $=0;$<Q;$++)this.getMatrixAt($,$7),b7.copy(J.boundingSphere).applyMatrix4($7),this.boundingSphere.union(b7)}copy(J,Q){if(super.copy(J,Q),this.instanceMatrix.copy(J.instanceMatrix),J.previousInstanceMatrix!==null)this.previousInstanceMatrix=J.previousInstanceMatrix.clone();if(J.morphTexture!==null)this.morphTexture=J.morphTexture.clone();if(J.instanceColor!==null)this.instanceColor=J.instanceColor.clone();if(this.count=J.count,J.boundingBox!==null)this.boundingBox=J.boundingBox.clone();if(J.boundingSphere!==null)this.boundingSphere=J.boundingSphere.clone();return this}getColorAt(J,Q){if(this.instanceColor===null)return Q.setRGB(1,1,1);else return Q.fromArray(this.instanceColor.array,J*3)}getMatrixAt(J,Q){return Q.fromArray(this.instanceMatrix.array,J*16)}getMorphAt(J,Q){let $=Q.morphTargetInfluences,Z=this.morphTexture.source.data.data,W=$.length+1,K=J*W+1;for(let Y=0;Y<$.length;Y++)$[Y]=Z[K+Y]}raycast(J,Q){let $=this.matrixWorld,Z=this.count;if(f7.geometry=this.geometry,f7.material=this.material,f7.material===void 0)return;if(this.boundingSphere===null)this.computeBoundingSphere();if(b7.copy(this.boundingSphere),b7.applyMatrix4($),J.ray.intersectsSphere(b7)===!1)return;for(let W=0;W<Z;W++){this.getMatrixAt(W,$7),uK.multiplyMatrices($,$7),f7.matrixWorld=uK,f7.raycast(J,g6);for(let K=0,Y=g6.length;K<Y;K++){let H=g6[K];H.instanceId=W,H.object=this,Q.push(H)}g6.length=0}}setColorAt(J,Q){if(this.instanceColor===null)this.instanceColor=new w8(new Float32Array(this.instanceMatrix.count*3).fill(1),3);return Q.toArray(this.instanceColor.array,J*3),this}setMatrixAt(J,Q){return Q.toArray(this.instanceMatrix.array,J*16),this}setMorphAt(J,Q){let $=Q.morphTargetInfluences,Z=$.length+1;if(this.morphTexture===null)this.morphTexture=new W9(new Float32Array(Z*this.count),Z,this.count,1028,1015);let W=this.morphTexture.source.data.data,K=0;for(let X=0;X<$.length;X++)K+=$[X];let Y=this.geometry.morphTargetsRelative?1:1-K,H=Z*J;return W[H]=Y,W.set($,H+1),this}updateMorphTargets(){}dispose(){if(this.dispatchEvent({type:"dispose"}),this.morphTexture!==null)this.morphTexture.dispose(),this.morphTexture=null}}var x$=new P,gE=new P,pE=new u0;class v9{constructor(J=new P(1,0,0),Q=0){this.isPlane=!0,this.normal=J,this.constant=Q}set(J,Q){return this.normal.copy(J),this.constant=Q,this}setComponents(J,Q,$,Z){return this.normal.set(J,Q,$),this.constant=Z,this}setFromNormalAndCoplanarPoint(J,Q){return this.normal.copy(J),this.constant=-Q.dot(this.normal),this}setFromCoplanarPoints(J,Q,$){let Z=x$.subVectors($,Q).cross(gE.subVectors(J,Q)).normalize();return this.setFromNormalAndCoplanarPoint(Z,J),this}copy(J){return this.normal.copy(J.normal),this.constant=J.constant,this}normalize(){let J=1/this.normal.length();return this.normal.multiplyScalar(J),this.constant*=J,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(J){return this.normal.dot(J)+this.constant}distanceToSphere(J){return this.distanceToPoint(J.center)-J.radius}projectPoint(J,Q){return Q.copy(J).addScaledVector(this.normal,-this.distanceToPoint(J))}intersectLine(J,Q,$=!0){let Z=J.delta(x$),W=this.normal.dot(Z);if(W===0){if(this.distanceToPoint(J.start)===0)return Q.copy(J.start);return null}let K=-(J.start.dot(this.normal)+this.constant)/W;if($===!0&&(K<0||K>1))return null;return Q.copy(J.start).addScaledVector(Z,K)}intersectsLine(J){let Q=this.distanceToPoint(J.start),$=this.distanceToPoint(J.end);return Q<0&&$>0||$<0&&Q>0}intersectsBox(J){return J.intersectsPlane(this)}intersectsSphere(J){return J.intersectsPlane(this)}coplanarPoint(J){return J.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(J,Q){let $=Q||pE.getNormalMatrix(J),Z=this.coplanarPoint(x$).applyMatrix4(J),W=this.normal.applyMatrix3($).normalize();return this.constant=-Z.dot(W),this}translate(J){return this.constant-=J.dot(this.normal),this}equals(J){return J.normal.equals(this.normal)&&J.constant===this.constant}clone(){return new this.constructor().copy(this)}}var N8=new SJ,mE=new r(0.5,0.5),p6=new P;class f8{constructor(J=new v9,Q=new v9,$=new v9,Z=new v9,W=new v9,K=new v9){this.planes=[J,Q,$,Z,W,K]}set(J,Q,$,Z,W,K){let Y=this.planes;return Y[0].copy(J),Y[1].copy(Q),Y[2].copy($),Y[3].copy(Z),Y[4].copy(W),Y[5].copy(K),this}copy(J){let Q=this.planes;for(let $=0;$<6;$++)Q[$].copy(J.planes[$]);return this}setFromProjectionMatrix(J,Q=2000,$=!1){let Z=this.planes,W=J.elements,K=W[0],Y=W[1],H=W[2],X=W[3],U=W[4],E=W[5],N=W[6],G=W[7],q=W[8],O=W[9],R=W[10],F=W[11],D=W[12],k=W[13],M=W[14],V=W[15];if(Z[0].setComponents(X-K,G-U,F-q,V-D).normalize(),Z[1].setComponents(X+K,G+U,F+q,V+D).normalize(),Z[2].setComponents(X+Y,G+E,F+O,V+k).normalize(),Z[3].setComponents(X-Y,G-E,F-O,V-k).normalize(),$)Z[4].setComponents(H,N,R,M).normalize(),Z[5].setComponents(X-H,G-N,F-R,V-M).normalize();else if(Z[4].setComponents(X-H,G-N,F-R,V-M).normalize(),Q===2000)Z[5].setComponents(X+H,G+N,F+R,V+M).normalize();else if(Q===2001)Z[5].setComponents(H,N,R,M).normalize();else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+Q);return this}intersectsObject(J){if(J.boundingSphere!==void 0){if(J.boundingSphere===null)J.computeBoundingSphere();N8.copy(J.boundingSphere).applyMatrix4(J.matrixWorld)}else{let Q=J.geometry;if(Q.boundingSphere===null)Q.computeBoundingSphere();N8.copy(Q.boundingSphere).applyMatrix4(J.matrixWorld)}return this.intersectsSphere(N8)}intersectsSprite(J){N8.center.set(0,0,0);let Q=mE.distanceTo(J.center);return N8.radius=0.7071067811865476+Q,N8.applyMatrix4(J.matrixWorld),this.intersectsSphere(N8)}intersectsSphere(J){let Q=this.planes,$=J.center,Z=-J.radius;for(let W=0;W<6;W++)if(Q[W].distanceToPoint($)<Z)return!1;return!0}intersectsBox(J){let Q=this.planes;for(let $=0;$<6;$++){let Z=Q[$];if(p6.x=Z.normal.x>0?J.max.x:J.min.x,p6.y=Z.normal.y>0?J.max.y:J.min.y,p6.z=Z.normal.z>0?J.max.z:J.min.z,Z.distanceToPoint(p6)<0)return!1}return!0}containsPoint(J){let Q=this.planes;for(let $=0;$<6;$++)if(Q[$].distanceToPoint(J)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}var k9=new d0,M9=new f8;class jQ{constructor(){this.coordinateSystem=2000}intersectsObject(J,Q){if(!Q.isArrayCamera||Q.cameras.length===0)return!1;for(let $=0;$<Q.cameras.length;$++){let Z=Q.cameras[$];if(k9.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),M9.setFromProjectionMatrix(k9,Z.coordinateSystem,Z.reversedDepth),M9.intersectsObject(J))return!0}return!1}intersectsSprite(J,Q){if(!Q||!Q.cameras||Q.cameras.length===0)return!1;for(let $=0;$<Q.cameras.length;$++){let Z=Q.cameras[$];if(k9.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),M9.setFromProjectionMatrix(k9,Z.coordinateSystem,Z.reversedDepth),M9.intersectsSprite(J))return!0}return!1}intersectsSphere(J,Q){if(!Q||!Q.cameras||Q.cameras.length===0)return!1;for(let $=0;$<Q.cameras.length;$++){let Z=Q.cameras[$];if(k9.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),M9.setFromProjectionMatrix(k9,Z.coordinateSystem,Z.reversedDepth),M9.intersectsSphere(J))return!0}return!1}intersectsBox(J,Q){if(!Q||!Q.cameras||Q.cameras.length===0)return!1;for(let $=0;$<Q.cameras.length;$++){let Z=Q.cameras[$];if(k9.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),M9.setFromProjectionMatrix(k9,Z.coordinateSystem,Z.reversedDepth),M9.intersectsBox(J))return!0}return!1}containsPoint(J,Q){if(!Q||!Q.cameras||Q.cameras.length===0)return!1;for(let $=0;$<Q.cameras.length;$++){let Z=Q.cameras[$];if(k9.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),M9.setFromProjectionMatrix(k9,Z.coordinateSystem,Z.reversedDepth),M9.containsPoint(J))return!0}return!1}clone(){return new jQ}}function g$(J,Q){return J-Q}function dE(J,Q){return J.z-Q.z}function lE(J,Q){return Q.z-J.z}class lH{constructor(){this.index=0,this.pool=[],this.list=[]}push(J,Q,$,Z){let W=this.pool,K=this.list;if(this.index>=W.length)W.push({start:-1,count:-1,z:-1,index:-1});let Y=W[this.index];K.push(Y),this.index++,Y.start=J,Y.count=Q,Y.z=$,Y.index=Z}reset(){this.list.length=0,this.index=0}}var uJ=new d0,uE=new V0(1,1,1),nK=new f8,cE=new jQ,m6=new jJ,q8=new SJ,h7=new P,sK=new P,nE=new P,p$=new lH,hJ=new IJ,d6=[];function sE(J,Q,$=0){let Z=Q.itemSize;if(J.isInterleavedBufferAttribute||J.array.constructor!==Q.array.constructor){let W=J.count;for(let K=0;K<W;K++)for(let Y=0;Y<Z;Y++)Q.setComponent(K+$,Y,J.getComponent(K,Y))}else Q.array.set(J.array,$*Z);Q.needsUpdate=!0}function D8(J,Q){if(J.constructor!==Q.constructor){let $=Math.min(J.length,Q.length);for(let Z=0;Z<$;Z++)Q[Z]=J[Z]}else{let $=Math.min(J.length,Q.length);Q.set(new J.constructor(J.buffer,0,$))}}class GW extends IJ{constructor(J,Q,$=Q*2,Z){super(new n0,Z);this.isBatchedMesh=!0,this.perObjectFrustumCulled=!0,this.sortObjects=!0,this.boundingBox=null,this.boundingSphere=null,this.customSort=null,this._instanceInfo=[],this._geometryInfo=[],this._availableInstanceIds=[],this._availableGeometryIds=[],this._nextIndexStart=0,this._nextVertexStart=0,this._geometryCount=0,this._visibilityChanged=!0,this._geometryInitialized=!1,this._maxInstanceCount=J,this._maxVertexCount=Q,this._maxIndexCount=$,this._multiDrawCounts=new Int32Array(J),this._multiDrawStarts=new Int32Array(J),this._multiDrawCount=0,this._matricesTexture=null,this._indirectTexture=null,this._colorsTexture=null,this._initMatricesTexture(),this._initIndirectTexture()}get maxInstanceCount(){return this._maxInstanceCount}get instanceCount(){return this._instanceInfo.length-this._availableInstanceIds.length}get unusedVertexCount(){return this._maxVertexCount-this._nextVertexStart}get unusedIndexCount(){return this._maxIndexCount-this._nextIndexStart}_initMatricesTexture(){let J=Math.sqrt(this._maxInstanceCount*4);J=Math.ceil(J/4)*4,J=Math.max(J,4);let Q=new Float32Array(J*J*4),$=new W9(Q,J,J,1023,1015);this._matricesTexture=$}_initIndirectTexture(){let J=Math.sqrt(this._maxInstanceCount);J=Math.ceil(J);let Q=new Uint32Array(J*J),$=new W9(Q,J,J,1029,1014);this._indirectTexture=$}_initColorsTexture(){let J=Math.sqrt(this._maxInstanceCount);J=Math.ceil(J);let Q=new Float32Array(J*J*4).fill(1),$=new W9(Q,J,J,1023,1015);$.colorSpace=$J.workingColorSpace,this._colorsTexture=$}_initializeGeometry(J){let Q=this.geometry,$=this._maxVertexCount,Z=this._maxIndexCount;if(this._geometryInitialized===!1){for(let W in J.attributes){let K=J.getAttribute(W),{array:Y,itemSize:H,normalized:X}=K,U=new Y.constructor($*H),E=new UJ(U,H,X);Q.setAttribute(W,E)}if(J.getIndex()!==null){let W=$>65535?new Uint32Array(Z):new Uint16Array(Z);Q.setIndex(new UJ(W,1))}this._geometryInitialized=!0}}_validateGeometry(J){let Q=this.geometry;if(Boolean(J.getIndex())!==Boolean(Q.getIndex()))throw Error('THREE.BatchedMesh: All geometries must consistently have "index".');for(let $ in Q.attributes){if(!J.hasAttribute($))throw Error(`THREE.BatchedMesh: Added geometry missing "${$}". All geometries must have consistent attributes.`);let Z=J.getAttribute($),W=Q.getAttribute($);if(Z.itemSize!==W.itemSize||Z.normalized!==W.normalized)throw Error("THREE.BatchedMesh: All attributes must have a consistent itemSize and normalized value.")}}validateInstanceId(J){let Q=this._instanceInfo;if(J<0||J>=Q.length||Q[J].active===!1)throw Error(`THREE.BatchedMesh: Invalid instanceId ${J}. Instance is either out of range or has been deleted.`)}validateGeometryId(J){let Q=this._geometryInfo;if(J<0||J>=Q.length||Q[J].active===!1)throw Error(`THREE.BatchedMesh: Invalid geometryId ${J}. Geometry is either out of range or has been deleted.`)}setCustomSort(J){return this.customSort=J,this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new jJ;let J=this.boundingBox,Q=this._instanceInfo;J.makeEmpty();for(let $=0,Z=Q.length;$<Z;$++){if(Q[$].active===!1)continue;let W=Q[$].geometryIndex;this.getMatrixAt($,uJ),this.getBoundingBoxAt(W,m6).applyMatrix4(uJ),J.union(m6)}}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new SJ;let J=this.boundingSphere,Q=this._instanceInfo;J.makeEmpty();for(let $=0,Z=Q.length;$<Z;$++){if(Q[$].active===!1)continue;let W=Q[$].geometryIndex;this.getMatrixAt($,uJ),this.getBoundingSphereAt(W,q8).applyMatrix4(uJ),J.union(q8)}}addInstance(J){if(this._instanceInfo.length>=this.maxInstanceCount&&this._availableInstanceIds.length===0)throw Error("THREE.BatchedMesh: Maximum item count reached.");let $={visible:!0,active:!0,geometryIndex:J},Z=null;if(this._availableInstanceIds.length>0)this._availableInstanceIds.sort(g$),Z=this._availableInstanceIds.shift(),this._instanceInfo[Z]=$;else Z=this._instanceInfo.length,this._instanceInfo.push($);let W=this._matricesTexture;uJ.identity().toArray(W.image.data,Z*16),W.needsUpdate=!0;let K=this._colorsTexture;if(K)uE.toArray(K.image.data,Z*4),K.needsUpdate=!0;return this._visibilityChanged=!0,Z}addGeometry(J,Q=-1,$=-1){this._initializeGeometry(J),this._validateGeometry(J);let Z={vertexStart:-1,vertexCount:-1,reservedVertexCount:-1,indexStart:-1,indexCount:-1,reservedIndexCount:-1,start:-1,count:-1,boundingBox:null,boundingSphere:null,active:!0},W=this._geometryInfo;Z.vertexStart=this._nextVertexStart,Z.reservedVertexCount=Q===-1?J.getAttribute("position").count:Q;let K=J.getIndex();if(K!==null)Z.indexStart=this._nextIndexStart,Z.reservedIndexCount=$===-1?K.count:$;if(Z.indexStart!==-1&&Z.indexStart+Z.reservedIndexCount>this._maxIndexCount||Z.vertexStart+Z.reservedVertexCount>this._maxVertexCount)throw Error("THREE.BatchedMesh: Reserved space request exceeds the maximum buffer size.");let H;if(this._availableGeometryIds.length>0)this._availableGeometryIds.sort(g$),H=this._availableGeometryIds.shift(),W[H]=Z;else H=this._geometryCount,this._geometryCount++,W.push(Z);return this.setGeometryAt(H,J),this._nextIndexStart=Z.indexStart+Z.reservedIndexCount,this._nextVertexStart=Z.vertexStart+Z.reservedVertexCount,H}setGeometryAt(J,Q){if(J>=this._geometryCount)throw Error("THREE.BatchedMesh: Maximum geometry count reached.");this._validateGeometry(Q);let $=this.geometry,Z=$.getIndex()!==null,W=$.getIndex(),K=Q.getIndex(),Y=this._geometryInfo[J];if(Z&&K.count>Y.reservedIndexCount||Q.attributes.position.count>Y.reservedVertexCount)throw Error("THREE.BatchedMesh: Reserved space not large enough for provided geometry.");let{vertexStart:H,reservedVertexCount:X}=Y;Y.vertexCount=Q.getAttribute("position").count;for(let U in $.attributes){let E=Q.getAttribute(U),N=$.getAttribute(U);sE(E,N,H);let G=E.itemSize;for(let q=E.count,O=X;q<O;q++){let R=H+q;for(let F=0;F<G;F++)N.setComponent(R,F,0)}N.needsUpdate=!0,N.addUpdateRange(H*G,X*G)}if(Z){let{indexStart:U,reservedIndexCount:E}=Y;Y.indexCount=Q.getIndex().count;for(let N=0;N<K.count;N++)W.setX(U+N,H+K.getX(N));for(let N=K.count,G=E;N<G;N++)W.setX(U+N,H);W.needsUpdate=!0,W.addUpdateRange(U,Y.reservedIndexCount)}if(Y.start=Z?Y.indexStart:Y.vertexStart,Y.count=Z?Y.indexCount:Y.vertexCount,Y.boundingBox=null,Q.boundingBox!==null)Y.boundingBox=Q.boundingBox.clone();if(Y.boundingSphere=null,Q.boundingSphere!==null)Y.boundingSphere=Q.boundingSphere.clone();return this._visibilityChanged=!0,J}deleteGeometry(J){let Q=this._geometryInfo;if(J>=Q.length||Q[J].active===!1)return this;let $=this._instanceInfo;for(let Z=0,W=$.length;Z<W;Z++)if($[Z].active&&$[Z].geometryIndex===J)this.deleteInstance(Z);return Q[J].active=!1,this._availableGeometryIds.push(J),this._visibilityChanged=!0,this}deleteInstance(J){return this.validateInstanceId(J),this._instanceInfo[J].active=!1,this._availableInstanceIds.push(J),this._visibilityChanged=!0,this}optimize(){let J=0,Q=0,$=this._geometryInfo,Z=$.map((K,Y)=>Y).sort((K,Y)=>{return $[K].vertexStart-$[Y].vertexStart}),W=this.geometry;for(let K=0,Y=$.length;K<Y;K++){let H=Z[K],X=$[H];if(X.active===!1)continue;if(W.index!==null){if(X.indexStart!==Q){let{indexStart:U,vertexStart:E,reservedIndexCount:N}=X,G=W.index,q=G.array,O=J-E;for(let R=U;R<U+N;R++)q[R]=q[R]+O;G.array.copyWithin(Q,U,U+N),G.addUpdateRange(Q,N),G.needsUpdate=!0,X.indexStart=Q}Q+=X.reservedIndexCount}if(X.vertexStart!==J){let{vertexStart:U,reservedVertexCount:E}=X,N=W.attributes;for(let G in N){let q=N[G],{array:O,itemSize:R}=q;O.copyWithin(J*R,U*R,(U+E)*R),q.addUpdateRange(J*R,E*R),q.needsUpdate=!0}X.vertexStart=J}J+=X.reservedVertexCount,X.start=W.index?X.indexStart:X.vertexStart}return this._nextIndexStart=Q,this._nextVertexStart=J,this._visibilityChanged=!0,this}getBoundingBoxAt(J,Q){if(J>=this._geometryCount)return null;let $=this.geometry,Z=this._geometryInfo[J];if(Z.boundingBox===null){let W=new jJ,K=$.index,Y=$.attributes.position;for(let H=Z.start,X=Z.start+Z.count;H<X;H++){let U=H;if(K)U=K.getX(U);W.expandByPoint(h7.fromBufferAttribute(Y,U))}Z.boundingBox=W}return Q.copy(Z.boundingBox),Q}getBoundingSphereAt(J,Q){if(J>=this._geometryCount)return null;let $=this.geometry,Z=this._geometryInfo[J];if(Z.boundingSphere===null){let W=new SJ;this.getBoundingBoxAt(J,m6),m6.getCenter(W.center);let K=$.index,Y=$.attributes.position,H=0;for(let X=Z.start,U=Z.start+Z.count;X<U;X++){let E=X;if(K)E=K.getX(E);h7.fromBufferAttribute(Y,E),H=Math.max(H,W.center.distanceToSquared(h7))}W.radius=Math.sqrt(H),Z.boundingSphere=W}return Q.copy(Z.boundingSphere),Q}setMatrixAt(J,Q){this.validateInstanceId(J);let $=this._matricesTexture,Z=this._matricesTexture.image.data;return Q.toArray(Z,J*16),$.needsUpdate=!0,this}getMatrixAt(J,Q){return this.validateInstanceId(J),Q.fromArray(this._matricesTexture.image.data,J*16)}setColorAt(J,Q){if(this.validateInstanceId(J),this._colorsTexture===null)this._initColorsTexture();return Q.toArray(this._colorsTexture.image.data,J*4),this._colorsTexture.needsUpdate=!0,this}getColorAt(J,Q){if(this.validateInstanceId(J),this._colorsTexture===null)if(Q.isVector4)return Q.set(1,1,1,1);else return Q.setRGB(1,1,1);else return Q.fromArray(this._colorsTexture.image.data,J*4)}setVisibleAt(J,Q){if(this.validateInstanceId(J),this._instanceInfo[J].visible===Q)return this;return this._instanceInfo[J].visible=Q,this._visibilityChanged=!0,this}getVisibleAt(J){return this.validateInstanceId(J),this._instanceInfo[J].visible}setGeometryIdAt(J,Q){return this.validateInstanceId(J),this.validateGeometryId(Q),this._instanceInfo[J].geometryIndex=Q,this}getGeometryIdAt(J){return this.validateInstanceId(J),this._instanceInfo[J].geometryIndex}getGeometryRangeAt(J,Q={}){this.validateGeometryId(J);let $=this._geometryInfo[J];return Q.vertexStart=$.vertexStart,Q.vertexCount=$.vertexCount,Q.reservedVertexCount=$.reservedVertexCount,Q.indexStart=$.indexStart,Q.indexCount=$.indexCount,Q.reservedIndexCount=$.reservedIndexCount,Q.start=$.start,Q.count=$.count,Q}setInstanceCount(J){let Q=this._availableInstanceIds,$=this._instanceInfo;Q.sort(g$);while(Q[Q.length-1]===$.length-1)$.pop(),Q.pop();if(J<$.length)throw Error(`BatchedMesh: Instance ids outside the range ${J} are being used. Cannot shrink instance count.`);let Z=new Int32Array(J),W=new Int32Array(J);D8(this._multiDrawCounts,Z),D8(this._multiDrawStarts,W),this._multiDrawCounts=Z,this._multiDrawStarts=W,this._maxInstanceCount=J;let K=this._indirectTexture,Y=this._matricesTexture,H=this._colorsTexture;if(K.dispose(),this._initIndirectTexture(),D8(K.image.data,this._indirectTexture.image.data),Y.dispose(),this._initMatricesTexture(),D8(Y.image.data,this._matricesTexture.image.data),H)H.dispose(),this._initColorsTexture(),D8(H.image.data,this._colorsTexture.image.data)}setGeometrySize(J,Q){let $=[...this._geometryInfo].filter((Y)=>Y.active);if(Math.max(...$.map((Y)=>Y.vertexStart+Y.reservedVertexCount))>J)throw Error(`BatchedMesh: Geometry vertex values are being used outside the range ${Q}. Cannot shrink further.`);if(this.geometry.index){if(Math.max(...$.map((H)=>H.indexStart+H.reservedIndexCount))>Q)throw Error(`BatchedMesh: Geometry index values are being used outside the range ${Q}. Cannot shrink further.`)}let W=this.geometry;if(W.dispose(),this._maxVertexCount=J,this._maxIndexCount=Q,this._geometryInitialized)this._geometryInitialized=!1,this.geometry=new n0,this._initializeGeometry(W);let K=this.geometry;if(W.index)D8(W.index.array,K.index.array);for(let Y in W.attributes)D8(W.attributes[Y].array,K.attributes[Y].array)}raycast(J,Q){let $=this._instanceInfo,Z=this._geometryInfo,W=this.matrixWorld,K=this.geometry;if(hJ.material=this.material,hJ.geometry.index=K.index,hJ.geometry.attributes=K.attributes,hJ.geometry.boundingBox===null)hJ.geometry.boundingBox=new jJ;if(hJ.geometry.boundingSphere===null)hJ.geometry.boundingSphere=new SJ;for(let Y=0,H=$.length;Y<H;Y++){if(!$[Y].visible||!$[Y].active)continue;let X=$[Y].geometryIndex,U=Z[X];hJ.geometry.setDrawRange(U.start,U.count),this.getMatrixAt(Y,hJ.matrixWorld).premultiply(W),this.getBoundingBoxAt(X,hJ.geometry.boundingBox),this.getBoundingSphereAt(X,hJ.geometry.boundingSphere),hJ.raycast(J,d6);for(let E=0,N=d6.length;E<N;E++){let G=d6[E];G.object=this,G.batchId=Y,Q.push(G)}d6.length=0}hJ.material=null,hJ.geometry.index=null,hJ.geometry.attributes={},hJ.geometry.setDrawRange(0,1/0)}copy(J){if(super.copy(J),this.geometry=J.geometry.clone(),this.perObjectFrustumCulled=J.perObjectFrustumCulled,this.sortObjects=J.sortObjects,this.boundingBox=J.boundingBox!==null?J.boundingBox.clone():null,this.boundingSphere=J.boundingSphere!==null?J.boundingSphere.clone():null,this._geometryInfo=J._geometryInfo.map((Q)=>({...Q,boundingBox:Q.boundingBox!==null?Q.boundingBox.clone():null,boundingSphere:Q.boundingSphere!==null?Q.boundingSphere.clone():null})),this._instanceInfo=J._instanceInfo.map((Q)=>({...Q})),this._availableInstanceIds=J._availableInstanceIds.slice(),this._availableGeometryIds=J._availableGeometryIds.slice(),this._nextIndexStart=J._nextIndexStart,this._nextVertexStart=J._nextVertexStart,this._geometryCount=J._geometryCount,this._maxInstanceCount=J._maxInstanceCount,this._maxVertexCount=J._maxVertexCount,this._maxIndexCount=J._maxIndexCount,this._geometryInitialized=J._geometryInitialized,this._multiDrawCounts=J._multiDrawCounts.slice(),this._multiDrawStarts=J._multiDrawStarts.slice(),this._indirectTexture=J._indirectTexture.clone(),this._indirectTexture.image.data=this._indirectTexture.image.data.slice(),this._matricesTexture=J._matricesTexture.clone(),this._matricesTexture.image.data=this._matricesTexture.image.data.slice(),this._colorsTexture!==null)this._colorsTexture=J._colorsTexture.clone(),this._colorsTexture.image.data=this._colorsTexture.image.data.slice();return this}dispose(){if(this.geometry.dispose(),this._matricesTexture.dispose(),this._matricesTexture=null,this._indirectTexture.dispose(),this._indirectTexture=null,this._colorsTexture!==null)this._colorsTexture.dispose(),this._colorsTexture=null}onBeforeRender(J,Q,$,Z,W){if(!this._visibilityChanged&&!this.perObjectFrustumCulled&&!this.sortObjects)return;let K=Z.getIndex(),Y=K===null?1:K.array.BYTES_PER_ELEMENT,H=1;if(W.wireframe)H=2,Y=Z.attributes.position.count>65535?4:2;let X=this._instanceInfo,U=this._multiDrawStarts,E=this._multiDrawCounts,N=this._geometryInfo,G=this.perObjectFrustumCulled,q=this._indirectTexture,O=q.image.data,R=$.isArrayCamera?cE:nK;if(G&&!$.isArrayCamera)uJ.multiplyMatrices($.projectionMatrix,$.matrixWorldInverse).multiply(this.matrixWorld),nK.setFromProjectionMatrix(uJ,$.coordinateSystem,$.reversedDepth);let F=0;if(this.sortObjects){uJ.copy(this.matrixWorld).invert(),h7.setFromMatrixPosition($.matrixWorld).applyMatrix4(uJ),sK.set(0,0,-1).transformDirection($.matrixWorld).transformDirection(uJ);for(let M=0,V=X.length;M<V;M++)if(X[M].visible&&X[M].active){let _=X[M].geometryIndex;this.getMatrixAt(M,uJ),this.getBoundingSphereAt(_,q8).applyMatrix4(uJ);let A=!1;if(G)A=!R.intersectsSphere(q8,$);if(!A){let C=N[_],L=nE.subVectors(q8.center,h7).dot(sK);p$.push(C.start,C.count,L,M)}}let D=p$.list,k=this.customSort;if(k===null)D.sort(W.transparent?lE:dE);else k.call(this,D,$);for(let M=0,V=D.length;M<V;M++){let _=D[M];U[F]=_.start*Y*H,E[F]=_.count*H,O[F]=_.index,F++}p$.reset()}else for(let D=0,k=X.length;D<k;D++)if(X[D].visible&&X[D].active){let M=X[D].geometryIndex,V=!1;if(G)this.getMatrixAt(D,uJ),this.getBoundingSphereAt(M,q8).applyMatrix4(uJ),V=!R.intersectsSphere(q8,$);if(!V){let _=N[M];U[F]=_.start*Y*H,E[F]=_.count*H,O[F]=D,F++}}q.needsUpdate=!0,this._multiDrawCount=F,this._visibilityChanged=!1}onBeforeShadow(J,Q,$,Z,W,K){this.onBeforeRender(J,null,Z,W,K)}}class gJ extends yJ{constructor(J){super();this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new V0(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.linewidth=J.linewidth,this.linecap=J.linecap,this.linejoin=J.linejoin,this.fog=J.fog,this}}var XQ=new P,UQ=new P,iK=new d0,x7=new v8,l6=new SJ,m$=new P,oK=new P;class x9 extends HJ{constructor(J=new n0,Q=new gJ){super();this.isLine=!0,this.type="Line",this.geometry=J,this.material=Q,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(J,Q){return super.copy(J,Q),this.material=Array.isArray(J.material)?J.material.slice():J.material,this.geometry=J.geometry,this}computeLineDistances(){let J=this.geometry;if(J.index===null){let Q=J.attributes.position,$=[0];for(let Z=1,W=Q.count;Z<W;Z++)XQ.fromBufferAttribute(Q,Z-1),UQ.fromBufferAttribute(Q,Z),$[Z]=$[Z-1],$[Z]+=XQ.distanceTo(UQ);J.setAttribute("lineDistance",new I0($,1))}else X0("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(J,Q){let $=this.geometry,Z=this.matrixWorld,W=J.params.Line.threshold,K=$.drawRange;if($.boundingSphere===null)$.computeBoundingSphere();if(l6.copy($.boundingSphere),l6.applyMatrix4(Z),l6.radius+=W,J.ray.intersectsSphere(l6)===!1)return;iK.copy(Z).invert(),x7.copy(J.ray).applyMatrix4(iK);let Y=W/((this.scale.x+this.scale.y+this.scale.z)/3),H=Y*Y,X=this.isLineSegments?2:1,U=$.index,N=$.attributes.position;if(U!==null){let G=Math.max(0,K.start),q=Math.min(U.count,K.start+K.count);for(let O=G,R=q-1;O<R;O+=X){let F=U.getX(O),D=U.getX(O+1),k=u6(this,J,x7,H,F,D,O);if(k)Q.push(k)}if(this.isLineLoop){let O=U.getX(q-1),R=U.getX(G),F=u6(this,J,x7,H,O,R,q-1);if(F)Q.push(F)}}else{let G=Math.max(0,K.start),q=Math.min(N.count,K.start+K.count);for(let O=G,R=q-1;O<R;O+=X){let F=u6(this,J,x7,H,O,O+1,O);if(F)Q.push(F)}if(this.isLineLoop){let O=u6(this,J,x7,H,q-1,G,q-1);if(O)Q.push(O)}}}updateMorphTargets(){let Q=this.geometry.morphAttributes,$=Object.keys(Q);if($.length>0){let Z=Q[$[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let W=0,K=Z.length;W<K;W++){let Y=Z[W].name||String(W);this.morphTargetInfluences.push(0),this.morphTargetDictionary[Y]=W}}}}}function u6(J,Q,$,Z,W,K,Y){let H=J.geometry.attributes.position;if(XQ.fromBufferAttribute(H,W),UQ.fromBufferAttribute(H,K),$.distanceSqToSegment(XQ,UQ,m$,oK)>Z)return;m$.applyMatrix4(J.matrixWorld);let U=Q.ray.origin.distanceTo(m$);if(U<Q.near||U>Q.far)return;return{distance:U,point:oK.clone().applyMatrix4(J.matrixWorld),index:Y,face:null,faceIndex:null,barycoord:null,object:J}}var aK=new P,rK=new P;class F9 extends x9{constructor(J,Q){super(J,Q);this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let J=this.geometry;if(J.index===null){let Q=J.attributes.position,$=[];for(let Z=0,W=Q.count;Z<W;Z+=2)aK.fromBufferAttribute(Q,Z),rK.fromBufferAttribute(Q,Z+1),$[Z]=Z===0?0:$[Z-1],$[Z+1]=$[Z]+aK.distanceTo(rK);J.setAttribute("lineDistance",new I0($,1))}else X0("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class EW extends x9{constructor(J,Q){super(J,Q);this.isLineLoop=!0,this.type="LineLoop"}}class yQ extends yJ{constructor(J){super();this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new V0(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.alphaMap=J.alphaMap,this.size=J.size,this.sizeAttenuation=J.sizeAttenuation,this.fog=J.fog,this}}var tK=new d0,e$=new v8,c6=new SJ,n6=new P;class NW extends HJ{constructor(J=new n0,Q=new yQ){super();this.isPoints=!0,this.type="Points",this.geometry=J,this.material=Q,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(J,Q){return super.copy(J,Q),this.material=Array.isArray(J.material)?J.material.slice():J.material,this.geometry=J.geometry,this}raycast(J,Q){let $=this.geometry,Z=this.matrixWorld,W=J.params.Points.threshold,K=$.drawRange;if($.boundingSphere===null)$.computeBoundingSphere();if(c6.copy($.boundingSphere),c6.applyMatrix4(Z),c6.radius+=W,J.ray.intersectsSphere(c6)===!1)return;tK.copy(Z).invert(),e$.copy(J.ray).applyMatrix4(tK);let Y=W/((this.scale.x+this.scale.y+this.scale.z)/3),H=Y*Y,X=$.index,E=$.attributes.position;if(X!==null){let N=Math.max(0,K.start),G=Math.min(X.count,K.start+K.count);for(let q=N,O=G;q<O;q++){let R=X.getX(q);n6.fromBufferAttribute(E,R),eK(n6,R,H,Z,J,Q,this)}}else{let N=Math.max(0,K.start),G=Math.min(E.count,K.start+K.count);for(let q=N,O=G;q<O;q++)n6.fromBufferAttribute(E,q),eK(n6,q,H,Z,J,Q,this)}}updateMorphTargets(){let Q=this.geometry.morphAttributes,$=Object.keys(Q);if($.length>0){let Z=Q[$[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let W=0,K=Z.length;W<K;W++){let Y=Z[W].name||String(W);this.morphTargetInfluences.push(0),this.morphTargetDictionary[Y]=W}}}}}function eK(J,Q,$,Z,W,K,Y){let H=e$.distanceSqToPoint(J);if(H<$){let X=new P;e$.closestPointToPoint(J,X),X.applyMatrix4(Z);let U=W.ray.origin.distanceTo(X);if(U<W.near||U>W.far)return;K.push({distance:U,distanceToRay:Math.sqrt(H),point:X,index:Q,face:null,faceIndex:null,barycoord:null,object:Y})}}class qW extends kJ{constructor(J,Q,$,Z,W=1006,K=1006,Y,H,X){super(J,Q,$,Z,W,K,Y,H,X);this.isVideoTexture=!0,this.generateMipmaps=!1,this._requestVideoFrameCallbackId=0;let U=this;function E(){U.needsUpdate=!0,U._requestVideoFrameCallbackId=J.requestVideoFrameCallback(E)}if("requestVideoFrameCallback"in J)this._requestVideoFrameCallbackId=J.requestVideoFrameCallback(E)}clone(){return new this.constructor(this.image).copy(this)}update(){let J=this.image;if("requestVideoFrameCallback"in J===!1&&J.readyState>=J.HAVE_CURRENT_DATA)this.needsUpdate=!0}dispose(){if(this._requestVideoFrameCallbackId!==0)this.source.data.cancelVideoFrameCallback(this._requestVideoFrameCallbackId),this._requestVideoFrameCallbackId=0;super.dispose()}}class uH extends qW{constructor(J,Q,$,Z,W,K,Y,H){super({},J,Q,$,Z,W,K,Y,H);this.isVideoFrameTexture=!0}update(){}clone(){return new this.constructor().copy(this)}setFrame(J){this.image=J,this.needsUpdate=!0}}class cH extends kJ{constructor(J,Q){super({width:J,height:Q});this.isFramebufferTexture=!0,this.magFilter=1003,this.minFilter=1003,this.generateMipmaps=!1,this.needsUpdate=!0}}class K6 extends kJ{constructor(J,Q,$,Z,W,K,Y,H,X,U,E,N){super(null,K,Y,H,X,U,Z,W,E,N);this.isCompressedTexture=!0,this.image={width:Q,height:$},this.mipmaps=J,this.flipY=!1,this.generateMipmaps=!1}}class nH extends K6{constructor(J,Q,$,Z,W,K){super(J,Q,$,W,K);this.isCompressedArrayTexture=!0,this.image.depth=Z,this.wrapR=1001,this.layerUpdates=new Set}addLayerUpdate(J){this.layerUpdates.add(J)}clearLayerUpdates(){this.layerUpdates.clear()}}class sH extends K6{constructor(J,Q,$){super(void 0,J[0].width,J[0].height,Q,$,301);this.isCompressedCubeTexture=!0,this.isCubeTexture=!0,this.image=J}}class V7 extends kJ{constructor(J=[],Q=301,$,Z,W,K,Y,H,X,U){super(J,Q,$,Z,W,K,Y,H,X,U);this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(J){this.image=J}}class iH extends kJ{constructor(J,Q,$,Z,W,K,Y,H,X){super(J,Q,$,Z,W,K,Y,H,X);this.isCanvasTexture=!0,this.needsUpdate=!0}}class oH extends kJ{constructor(J,Q,$,Z,W,K,Y,H,X){super(J,Q,$,Z,W,K,Y,H,X);this.isHTMLTexture=!0,this.generateMipmaps=!1,this.needsUpdate=!0;let U=J?J.parentNode:null;if(U!==null&&"requestPaint"in U)U.onpaint=()=>{this.needsUpdate=!0},U.requestPaint()}dispose(){let J=this.image?this.image.parentNode:null;if(J!==null&&"onpaint"in J)J.onpaint=null;super.dispose()}}class Z8 extends kJ{constructor(J,Q,$=1014,Z,W,K,Y=1003,H=1003,X,U=1026,E=1){if(U!==1026&&U!==1027)throw Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let N={width:J,height:Q,depth:E};super(N,Z,W,K,Y,H,U,$,X);this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(J){return super.copy(J),this.source=new b9(Object.assign({},J.image)),this.compareFunction=J.compareFunction,this}toJSON(J){let Q=super.toJSON(J);if(this.compareFunction!==null)Q.compareFunction=this.compareFunction;return Q}}class DW extends Z8{constructor(J,Q=1014,$=301,Z,W,K=1003,Y=1003,H,X=1026){let U={width:J,height:J,depth:1},E=[U,U,U,U,U,U];super(J,J,Q,$,Z,W,K,Y,H,X);this.image=E,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(J){this.image=J}}class vQ extends kJ{constructor(J=null){super();this.sourceTexture=J,this.isExternalTexture=!0}copy(J){return super.copy(J),this.sourceTexture=J.sourceTexture,this}}class b8 extends n0{constructor(J=1,Q=1,$=1,Z=1,W=1,K=1){super();this.type="BoxGeometry",this.parameters={width:J,height:Q,depth:$,widthSegments:Z,heightSegments:W,depthSegments:K};let Y=this;Z=Math.floor(Z),W=Math.floor(W),K=Math.floor(K);let H=[],X=[],U=[],E=[],N=0,G=0;q("z","y","x",-1,-1,$,Q,J,K,W,0),q("z","y","x",1,-1,$,Q,-J,K,W,1),q("x","z","y",1,1,J,$,Q,Z,K,2),q("x","z","y",1,-1,J,$,-Q,Z,K,3),q("x","y","z",1,-1,J,Q,$,Z,W,4),q("x","y","z",-1,-1,J,Q,-$,Z,W,5),this.setIndex(H),this.setAttribute("position",new I0(X,3)),this.setAttribute("normal",new I0(U,3)),this.setAttribute("uv",new I0(E,2));function q(O,R,F,D,k,M,V,_,A,C,L){let I=M/A,b=V/C,T=M/2,p=V/2,u=_/2,y=A+1,l=C+1,h=0,m=0,a=new P;for(let W0=0;W0<l;W0++){let N0=W0*b-p;for(let j0=0;j0<y;j0++){let B0=j0*I-T;a[O]=B0*D,a[R]=N0*k,a[F]=u,X.push(a.x,a.y,a.z),a[O]=0,a[R]=0,a[F]=_>0?1:-1,U.push(a.x,a.y,a.z),E.push(j0/A),E.push(1-W0/C),h+=1}}for(let W0=0;W0<C;W0++)for(let N0=0;N0<A;N0++){let j0=N+N0+y*W0,B0=N+N0+y*(W0+1),ZJ=N+(N0+1)+y*(W0+1),r0=N+(N0+1)+y*W0;H.push(j0,B0,r0),H.push(B0,ZJ,r0),m+=6}Y.addGroup(G,m,L),G+=m,N+=h}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new b8(J.width,J.height,J.depth,J.widthSegments,J.heightSegments,J.depthSegments)}}class fQ extends n0{constructor(J=1,Q=1,$=4,Z=8,W=1){super();this.type="CapsuleGeometry",this.parameters={radius:J,height:Q,capSegments:$,radialSegments:Z,heightSegments:W},Q=Math.max(0,Q),$=Math.max(1,Math.floor($)),Z=Math.max(3,Math.floor(Z)),W=Math.max(1,Math.floor(W));let K=[],Y=[],H=[],X=[],U=Q/2,E=Math.PI/2*J,N=Q,G=2*E+N,q=$*2+W,O=Z+1,R=new P,F=new P;for(let D=0;D<=q;D++){let k=0,M=0,V=0,_=0;if(D<=$){let L=D/$,I=L*Math.PI/2;M=-U-J*Math.cos(I),V=J*Math.sin(I),_=-J*Math.cos(I),k=L*E}else if(D<=$+W){let L=(D-$)/W;M=-U+L*Q,V=J,_=0,k=E+L*N}else{let L=(D-$-W)/$,I=L*Math.PI/2;M=U+J*Math.sin(I),V=J*Math.cos(I),_=J*Math.sin(I),k=E+N+L*E}let A=Math.max(0,Math.min(1,k/G)),C=0;if(D===0)C=0.5/Z;else if(D===q)C=-0.5/Z;for(let L=0;L<=Z;L++){let I=L/Z,b=I*Math.PI*2,T=Math.sin(b),p=Math.cos(b);F.x=-V*p,F.y=M,F.z=V*T,Y.push(F.x,F.y,F.z),R.set(-V*p,_,V*T),R.normalize(),H.push(R.x,R.y,R.z),X.push(I+C,A)}if(D>0){let L=(D-1)*O;for(let I=0;I<Z;I++){let b=L+I,T=L+I+1,p=D*O+I,u=D*O+I+1;K.push(b,T,p),K.push(T,u,p)}}}this.setIndex(K),this.setAttribute("position",new I0(Y,3)),this.setAttribute("normal",new I0(H,3)),this.setAttribute("uv",new I0(X,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new fQ(J.radius,J.height,J.capSegments,J.radialSegments,J.heightSegments)}}class bQ extends n0{constructor(J=1,Q=32,$=0,Z=Math.PI*2){super();this.type="CircleGeometry",this.parameters={radius:J,segments:Q,thetaStart:$,thetaLength:Z},Q=Math.max(3,Q);let W=[],K=[],Y=[],H=[],X=new P,U=new r;K.push(0,0,0),Y.push(0,0,1),H.push(0.5,0.5);for(let E=0,N=3;E<=Q;E++,N+=3){let G=$+E/Q*Z;X.x=J*Math.cos(G),X.y=J*Math.sin(G),K.push(X.x,X.y,X.z),Y.push(0,0,1),U.x=(K[N]/J+1)/2,U.y=(K[N+1]/J+1)/2,H.push(U.x,U.y)}for(let E=1;E<=Q;E++)W.push(E,E+1,0);this.setIndex(W),this.setAttribute("position",new I0(K,3)),this.setAttribute("normal",new I0(Y,3)),this.setAttribute("uv",new I0(H,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new bQ(J.radius,J.segments,J.thetaStart,J.thetaLength)}}class Y6 extends n0{constructor(J=1,Q=1,$=1,Z=32,W=1,K=!1,Y=0,H=Math.PI*2){super();this.type="CylinderGeometry",this.parameters={radiusTop:J,radiusBottom:Q,height:$,radialSegments:Z,heightSegments:W,openEnded:K,thetaStart:Y,thetaLength:H};let X=this;Z=Math.floor(Z),W=Math.floor(W);let U=[],E=[],N=[],G=[],q=0,O=[],R=$/2,F=0;if(D(),K===!1){if(J>0)k(!0);if(Q>0)k(!1)}this.setIndex(U),this.setAttribute("position",new I0(E,3)),this.setAttribute("normal",new I0(N,3)),this.setAttribute("uv",new I0(G,2));function D(){let M=new P,V=new P,_=0,A=(Q-J)/$;for(let C=0;C<=W;C++){let L=[],I=C/W,b=I*(Q-J)+J;for(let T=0;T<=Z;T++){let p=T/Z,u=p*H+Y,y=Math.sin(u),l=Math.cos(u);V.x=b*y,V.y=-I*$+R,V.z=b*l,E.push(V.x,V.y,V.z),M.set(y,A,l).normalize(),N.push(M.x,M.y,M.z),G.push(p,1-I),L.push(q++)}O.push(L)}for(let C=0;C<Z;C++)for(let L=0;L<W;L++){let I=O[L][C],b=O[L+1][C],T=O[L+1][C+1],p=O[L][C+1];if(J>0||L!==0)U.push(I,b,p),_+=3;if(Q>0||L!==W-1)U.push(b,T,p),_+=3}X.addGroup(F,_,0),F+=_}function k(M){let V=q,_=new r,A=new P,C=0,L=M===!0?J:Q,I=M===!0?1:-1;for(let T=1;T<=Z;T++)E.push(0,R*I,0),N.push(0,I,0),G.push(0.5,0.5),q++;let b=q;for(let T=0;T<=Z;T++){let u=T/Z*H+Y,y=Math.cos(u),l=Math.sin(u);A.x=L*l,A.y=R*I,A.z=L*y,E.push(A.x,A.y,A.z),N.push(0,I,0),_.x=y*0.5+0.5,_.y=l*0.5*I+0.5,G.push(_.x,_.y),q++}for(let T=0;T<Z;T++){let p=V+T,u=b+T;if(M===!0)U.push(u,u+1,p);else U.push(u+1,u,p);C+=3}X.addGroup(F,C,M===!0?1:2),F+=C}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new Y6(J.radiusTop,J.radiusBottom,J.height,J.radialSegments,J.heightSegments,J.openEnded,J.thetaStart,J.thetaLength)}}class H6 extends Y6{constructor(J=1,Q=1,$=32,Z=1,W=!1,K=0,Y=Math.PI*2){super(0,J,Q,$,Z,W,K,Y);this.type="ConeGeometry",this.parameters={radius:J,height:Q,radialSegments:$,heightSegments:Z,openEnded:W,thetaStart:K,thetaLength:Y}}static fromJSON(J){return new H6(J.radius,J.height,J.radialSegments,J.heightSegments,J.openEnded,J.thetaStart,J.thetaLength)}}class W8 extends n0{constructor(J=[],Q=[],$=1,Z=0){super();this.type="PolyhedronGeometry",this.parameters={vertices:J,indices:Q,radius:$,detail:Z};let W=[],K=[];if(Y(Z),X($),U(),this.setAttribute("position",new I0(W,3)),this.setAttribute("normal",new I0(W.slice(),3)),this.setAttribute("uv",new I0(K,2)),Z===0)this.computeVertexNormals();else this.normalizeNormals();function Y(D){let k=new P,M=new P,V=new P;for(let _=0;_<Q.length;_+=3)G(Q[_+0],k),G(Q[_+1],M),G(Q[_+2],V),H(k,M,V,D)}function H(D,k,M,V){let _=V+1,A=[];for(let C=0;C<=_;C++){A[C]=[];let L=D.clone().lerp(M,C/_),I=k.clone().lerp(M,C/_),b=_-C;for(let T=0;T<=b;T++)if(T===0&&C===_)A[C][T]=L;else A[C][T]=L.clone().lerp(I,T/b)}for(let C=0;C<_;C++)for(let L=0;L<2*(_-C)-1;L++){let I=Math.floor(L/2);if(L%2===0)N(A[C][I+1]),N(A[C+1][I]),N(A[C][I]);else N(A[C][I+1]),N(A[C+1][I+1]),N(A[C+1][I])}}function X(D){let k=new P;for(let M=0;M<W.length;M+=3)k.x=W[M+0],k.y=W[M+1],k.z=W[M+2],k.normalize().multiplyScalar(D),W[M+0]=k.x,W[M+1]=k.y,W[M+2]=k.z}function U(){let D=new P;for(let k=0;k<W.length;k+=3){D.x=W[k+0],D.y=W[k+1],D.z=W[k+2];let M=R(D)/2/Math.PI+0.5,V=F(D)/Math.PI+0.5;K.push(M,1-V)}q(),E()}function E(){for(let D=0;D<K.length;D+=6){let k=K[D+0],M=K[D+2],V=K[D+4],_=Math.max(k,M,V),A=Math.min(k,M,V);if(_>0.9&&A<0.1){if(k<0.2)K[D+0]+=1;if(M<0.2)K[D+2]+=1;if(V<0.2)K[D+4]+=1}}}function N(D){W.push(D.x,D.y,D.z)}function G(D,k){let M=D*3;k.x=J[M+0],k.y=J[M+1],k.z=J[M+2]}function q(){let D=new P,k=new P,M=new P,V=new P,_=new r,A=new r,C=new r;for(let L=0,I=0;L<W.length;L+=9,I+=6){D.set(W[L+0],W[L+1],W[L+2]),k.set(W[L+3],W[L+4],W[L+5]),M.set(W[L+6],W[L+7],W[L+8]),_.set(K[I+0],K[I+1]),A.set(K[I+2],K[I+3]),C.set(K[I+4],K[I+5]),V.copy(D).add(k).add(M).divideScalar(3);let b=R(V);O(_,I+0,D,b),O(A,I+2,k,b),O(C,I+4,M,b)}}function O(D,k,M,V){if(V<0&&D.x===1)K[k]=D.x-1;if(M.x===0&&M.z===0)K[k]=V/2/Math.PI+0.5}function R(D){return Math.atan2(D.z,-D.x)}function F(D){return Math.atan2(-D.y,Math.sqrt(D.x*D.x+D.z*D.z))}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new W8(J.vertices,J.indices,J.radius,J.detail)}}class hQ extends W8{constructor(J=1,Q=0){let $=(1+Math.sqrt(5))/2,Z=1/$,W=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-Z,-$,0,-Z,$,0,Z,-$,0,Z,$,-Z,-$,0,-Z,$,0,Z,-$,0,Z,$,0,-$,0,-Z,$,0,-Z,-$,0,Z,$,0,Z],K=[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9];super(W,K,J,Q);this.type="DodecahedronGeometry",this.parameters={radius:J,detail:Q}}static fromJSON(J){return new hQ(J.radius,J.detail)}}var s6=new P,i6=new P,d$=new P,o6=new nJ;class FW extends n0{constructor(J=null,Q=1){super();if(this.type="EdgesGeometry",this.parameters={geometry:J,thresholdAngle:Q},J!==null){let Z=Math.pow(10,4),W=Math.cos(z8*Q),K=J.getIndex(),Y=J.getAttribute("position"),H=K?K.count:Y.count,X=[0,0,0],U=["a","b","c"],E=[,,,],N={},G=[];for(let q=0;q<H;q+=3){if(K)X[0]=K.getX(q),X[1]=K.getX(q+1),X[2]=K.getX(q+2);else X[0]=q,X[1]=q+1,X[2]=q+2;let{a:O,b:R,c:F}=o6;if(O.fromBufferAttribute(Y,X[0]),R.fromBufferAttribute(Y,X[1]),F.fromBufferAttribute(Y,X[2]),o6.getNormal(d$),E[0]=`${Math.round(O.x*Z)},${Math.round(O.y*Z)},${Math.round(O.z*Z)}`,E[1]=`${Math.round(R.x*Z)},${Math.round(R.y*Z)},${Math.round(R.z*Z)}`,E[2]=`${Math.round(F.x*Z)},${Math.round(F.y*Z)},${Math.round(F.z*Z)}`,E[0]===E[1]||E[1]===E[2]||E[2]===E[0])continue;for(let D=0;D<3;D++){let k=(D+1)%3,M=E[D],V=E[k],_=o6[U[D]],A=o6[U[k]],C=`${M}_${V}`,L=`${V}_${M}`;if(L in N&&N[L]){if(d$.dot(N[L].normal)<=W)G.push(_.x,_.y,_.z),G.push(A.x,A.y,A.z);N[L]=null}else if(!(C in N))N[C]={index0:X[D],index1:X[k],normal:d$.clone()}}}for(let q in N)if(N[q]){let{index0:O,index1:R}=N[q];s6.fromBufferAttribute(Y,O),i6.fromBufferAttribute(Y,R),G.push(s6.x,s6.y,s6.z),G.push(i6.x,i6.y,i6.z)}this.setAttribute("position",new I0(G,3))}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}}class Y9{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){X0("Curve: .getPoint() not implemented.")}getPointAt(J,Q){let $=this.getUtoTmapping(J);return this.getPoint($,Q)}getPoints(J=5){let Q=[];for(let $=0;$<=J;$++)Q.push(this.getPoint($/J));return Q}getSpacedPoints(J=5){let Q=[];for(let $=0;$<=J;$++)Q.push(this.getPointAt($/J));return Q}getLength(){let J=this.getLengths();return J[J.length-1]}getLengths(J=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===J+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let Q=[],$,Z=this.getPoint(0),W=0;Q.push(0);for(let K=1;K<=J;K++)$=this.getPoint(K/J),W+=$.distanceTo(Z),Q.push(W),Z=$;return this.cacheArcLengths=Q,Q}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(J,Q=null){let $=this.getLengths(),Z=0,W=$.length,K;if(Q)K=Q;else K=J*$[W-1];let Y=0,H=W-1,X;while(Y<=H)if(Z=Math.floor(Y+(H-Y)/2),X=$[Z]-K,X<0)Y=Z+1;else if(X>0)H=Z-1;else{H=Z;break}if(Z=H,$[Z]===K)return Z/(W-1);let U=$[Z],N=$[Z+1]-U,G=(K-U)/N;return(Z+G)/(W-1)}getTangent(J,Q){let Z=J-0.0001,W=J+0.0001;if(Z<0)Z=0;if(W>1)W=1;let K=this.getPoint(Z),Y=this.getPoint(W),H=Q||(K.isVector2?new r:new P);return H.copy(Y).sub(K).normalize(),H}getTangentAt(J,Q){let $=this.getUtoTmapping(J);return this.getTangent($,Q)}computeFrenetFrames(J,Q=!1){let $=new P,Z=[],W=[],K=[],Y=new P,H=new d0;for(let G=0;G<=J;G++){let q=G/J;Z[G]=this.getTangentAt(q,new P)}W[0]=new P,K[0]=new P;let X=Number.MAX_VALUE,U=Math.abs(Z[0].x),E=Math.abs(Z[0].y),N=Math.abs(Z[0].z);if(U<=X)X=U,$.set(1,0,0);if(E<=X)X=E,$.set(0,1,0);if(N<=X)$.set(0,0,1);Y.crossVectors(Z[0],$).normalize(),W[0].crossVectors(Z[0],Y),K[0].crossVectors(Z[0],W[0]);for(let G=1;G<=J;G++){if(W[G]=W[G-1].clone(),K[G]=K[G-1].clone(),Y.crossVectors(Z[G-1],Z[G]),Y.length()>Number.EPSILON){Y.normalize();let q=Math.acos(m0(Z[G-1].dot(Z[G]),-1,1));W[G].applyMatrix4(H.makeRotationAxis(Y,q))}K[G].crossVectors(Z[G],W[G])}if(Q===!0){let G=Math.acos(m0(W[0].dot(W[J]),-1,1));if(G/=J,Z[0].dot(Y.crossVectors(W[0],W[J]))>0)G=-G;for(let q=1;q<=J;q++)W[q].applyMatrix4(H.makeRotationAxis(Z[q],G*q)),K[q].crossVectors(Z[q],W[q])}return{tangents:Z,normals:W,binormals:K}}clone(){return new this.constructor().copy(this)}copy(J){return this.arcLengthDivisions=J.arcLengthDivisions,this}toJSON(){let J={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return J.arcLengthDivisions=this.arcLengthDivisions,J.type=this.type,J}fromJSON(J){return this.arcLengthDivisions=J.arcLengthDivisions,this}}class X6 extends Y9{constructor(J=0,Q=0,$=1,Z=1,W=0,K=Math.PI*2,Y=!1,H=0){super();this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=J,this.aY=Q,this.xRadius=$,this.yRadius=Z,this.aStartAngle=W,this.aEndAngle=K,this.aClockwise=Y,this.aRotation=H}getPoint(J,Q=new r){let $=Q,Z=Math.PI*2,W=this.aEndAngle-this.aStartAngle,K=Math.abs(W)<Number.EPSILON;while(W<0)W+=Z;while(W>Z)W-=Z;if(W<Number.EPSILON)if(K)W=0;else W=Z;if(this.aClockwise===!0&&!K)if(W===Z)W=-Z;else W=W-Z;let Y=this.aStartAngle+J*W,H=this.aX+this.xRadius*Math.cos(Y),X=this.aY+this.yRadius*Math.sin(Y);if(this.aRotation!==0){let U=Math.cos(this.aRotation),E=Math.sin(this.aRotation),N=H-this.aX,G=X-this.aY;H=N*U-G*E+this.aX,X=N*E+G*U+this.aY}return $.set(H,X)}copy(J){return super.copy(J),this.aX=J.aX,this.aY=J.aY,this.xRadius=J.xRadius,this.yRadius=J.yRadius,this.aStartAngle=J.aStartAngle,this.aEndAngle=J.aEndAngle,this.aClockwise=J.aClockwise,this.aRotation=J.aRotation,this}toJSON(){let J=super.toJSON();return J.aX=this.aX,J.aY=this.aY,J.xRadius=this.xRadius,J.yRadius=this.yRadius,J.aStartAngle=this.aStartAngle,J.aEndAngle=this.aEndAngle,J.aClockwise=this.aClockwise,J.aRotation=this.aRotation,J}fromJSON(J){return super.fromJSON(J),this.aX=J.aX,this.aY=J.aY,this.xRadius=J.xRadius,this.yRadius=J.yRadius,this.aStartAngle=J.aStartAngle,this.aEndAngle=J.aEndAngle,this.aClockwise=J.aClockwise,this.aRotation=J.aRotation,this}}class OW extends X6{constructor(J,Q,$,Z,W,K){super(J,Q,$,$,Z,W,K);this.isArcCurve=!0,this.type="ArcCurve"}}function RW(){let J=0,Q=0,$=0,Z=0;function W(K,Y,H,X){J=K,Q=H,$=-3*K+3*Y-2*H-X,Z=2*K-2*Y+H+X}return{initCatmullRom:function(K,Y,H,X,U){W(Y,H,U*(H-K),U*(X-Y))},initNonuniformCatmullRom:function(K,Y,H,X,U,E,N){let G=(Y-K)/U-(H-K)/(U+E)+(H-Y)/E,q=(H-Y)/E-(X-Y)/(E+N)+(X-H)/N;G*=E,q*=E,W(Y,H,G,q)},calc:function(K){let Y=K*K,H=Y*K;return J+Q*K+$*Y+Z*H}}}var JY=new P,QY=new P,l$=new RW,u$=new RW,c$=new RW;class kW extends Y9{constructor(J=[],Q=!1,$="centripetal",Z=0.5){super();this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=J,this.closed=Q,this.curveType=$,this.tension=Z}getPoint(J,Q=new P){let $=Q,Z=this.points,W=Z.length,K=(W-(this.closed?0:1))*J,Y=Math.floor(K),H=K-Y;if(this.closed)Y+=Y>0?0:(Math.floor(Math.abs(Y)/W)+1)*W;else if(H===0&&Y===W-1)Y=W-2,H=1;let X,U;if(this.closed||Y>0)X=Z[(Y-1)%W];else QY.subVectors(Z[0],Z[1]).add(Z[0]),X=QY;let E=Z[Y%W],N=Z[(Y+1)%W];if(this.closed||Y+2<W)U=Z[(Y+2)%W];else JY.subVectors(Z[W-1],Z[W-2]).add(Z[W-1]),U=JY;if(this.curveType==="centripetal"||this.curveType==="chordal"){let G=this.curveType==="chordal"?0.5:0.25,q=Math.pow(X.distanceToSquared(E),G),O=Math.pow(E.distanceToSquared(N),G),R=Math.pow(N.distanceToSquared(U),G);if(O<0.0001)O=1;if(q<0.0001)q=O;if(R<0.0001)R=O;l$.initNonuniformCatmullRom(X.x,E.x,N.x,U.x,q,O,R),u$.initNonuniformCatmullRom(X.y,E.y,N.y,U.y,q,O,R),c$.initNonuniformCatmullRom(X.z,E.z,N.z,U.z,q,O,R)}else if(this.curveType==="catmullrom")l$.initCatmullRom(X.x,E.x,N.x,U.x,this.tension),u$.initCatmullRom(X.y,E.y,N.y,U.y,this.tension),c$.initCatmullRom(X.z,E.z,N.z,U.z,this.tension);return $.set(l$.calc(H),u$.calc(H),c$.calc(H)),$}copy(J){super.copy(J),this.points=[];for(let Q=0,$=J.points.length;Q<$;Q++){let Z=J.points[Q];this.points.push(Z.clone())}return this.closed=J.closed,this.curveType=J.curveType,this.tension=J.tension,this}toJSON(){let J=super.toJSON();J.points=[];for(let Q=0,$=this.points.length;Q<$;Q++){let Z=this.points[Q];J.points.push(Z.toArray())}return J.closed=this.closed,J.curveType=this.curveType,J.tension=this.tension,J}fromJSON(J){super.fromJSON(J),this.points=[];for(let Q=0,$=J.points.length;Q<$;Q++){let Z=J.points[Q];this.points.push(new P().fromArray(Z))}return this.closed=J.closed,this.curveType=J.curveType,this.tension=J.tension,this}}function $Y(J,Q,$,Z,W){let K=(Z-Q)*0.5,Y=(W-$)*0.5,H=J*J,X=J*H;return(2*$-2*Z+K+Y)*X+(-3*$+3*Z-2*K-Y)*H+K*J+$}function iE(J,Q){let $=1-J;return $*$*Q}function oE(J,Q){return 2*(1-J)*J*Q}function aE(J,Q){return J*J*Q}function d7(J,Q,$,Z){return iE(J,Q)+oE(J,$)+aE(J,Z)}function rE(J,Q){let $=1-J;return $*$*$*Q}function tE(J,Q){let $=1-J;return 3*$*$*J*Q}function eE(J,Q){return 3*(1-J)*J*J*Q}function J5(J,Q){return J*J*J*Q}function l7(J,Q,$,Z,W){return rE(J,Q)+tE(J,$)+eE(J,Z)+J5(J,W)}class xQ extends Y9{constructor(J=new r,Q=new r,$=new r,Z=new r){super();this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=J,this.v1=Q,this.v2=$,this.v3=Z}getPoint(J,Q=new r){let $=Q,Z=this.v0,W=this.v1,K=this.v2,Y=this.v3;return $.set(l7(J,Z.x,W.x,K.x,Y.x),l7(J,Z.y,W.y,K.y,Y.y)),$}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this.v3.copy(J.v3),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J.v3=this.v3.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this.v3.fromArray(J.v3),this}}class MW extends Y9{constructor(J=new P,Q=new P,$=new P,Z=new P){super();this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=J,this.v1=Q,this.v2=$,this.v3=Z}getPoint(J,Q=new P){let $=Q,Z=this.v0,W=this.v1,K=this.v2,Y=this.v3;return $.set(l7(J,Z.x,W.x,K.x,Y.x),l7(J,Z.y,W.y,K.y,Y.y),l7(J,Z.z,W.z,K.z,Y.z)),$}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this.v3.copy(J.v3),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J.v3=this.v3.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this.v3.fromArray(J.v3),this}}class gQ extends Y9{constructor(J=new r,Q=new r){super();this.isLineCurve=!0,this.type="LineCurve",this.v1=J,this.v2=Q}getPoint(J,Q=new r){let $=Q;if(J===1)$.copy(this.v2);else $.copy(this.v2).sub(this.v1),$.multiplyScalar(J).add(this.v1);return $}getPointAt(J,Q){return this.getPoint(J,Q)}getTangent(J,Q=new r){return Q.subVectors(this.v2,this.v1).normalize()}getTangentAt(J,Q){return this.getTangent(J,Q)}copy(J){return super.copy(J),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class LW extends Y9{constructor(J=new P,Q=new P){super();this.isLineCurve3=!0,this.type="LineCurve3",this.v1=J,this.v2=Q}getPoint(J,Q=new P){let $=Q;if(J===1)$.copy(this.v2);else $.copy(this.v2).sub(this.v1),$.multiplyScalar(J).add(this.v1);return $}getPointAt(J,Q){return this.getPoint(J,Q)}getTangent(J,Q=new P){return Q.subVectors(this.v2,this.v1).normalize()}getTangentAt(J,Q){return this.getTangent(J,Q)}copy(J){return super.copy(J),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class pQ extends Y9{constructor(J=new r,Q=new r,$=new r){super();this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=J,this.v1=Q,this.v2=$}getPoint(J,Q=new r){let $=Q,Z=this.v0,W=this.v1,K=this.v2;return $.set(d7(J,Z.x,W.x,K.x),d7(J,Z.y,W.y,K.y)),$}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class mQ extends Y9{constructor(J=new P,Q=new P,$=new P){super();this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=J,this.v1=Q,this.v2=$}getPoint(J,Q=new P){let $=Q,Z=this.v0,W=this.v1,K=this.v2;return $.set(d7(J,Z.x,W.x,K.x),d7(J,Z.y,W.y,K.y),d7(J,Z.z,W.z,K.z)),$}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class dQ extends Y9{constructor(J=[]){super();this.isSplineCurve=!0,this.type="SplineCurve",this.points=J}getPoint(J,Q=new r){let $=Q,Z=this.points,W=(Z.length-1)*J,K=Math.floor(W),Y=W-K,H=Z[K===0?K:K-1],X=Z[K],U=Z[K>Z.length-2?Z.length-1:K+1],E=Z[K>Z.length-3?Z.length-1:K+2];return $.set($Y(Y,H.x,X.x,U.x,E.x),$Y(Y,H.y,X.y,U.y,E.y)),$}copy(J){super.copy(J),this.points=[];for(let Q=0,$=J.points.length;Q<$;Q++){let Z=J.points[Q];this.points.push(Z.clone())}return this}toJSON(){let J=super.toJSON();J.points=[];for(let Q=0,$=this.points.length;Q<$;Q++){let Z=this.points[Q];J.points.push(Z.toArray())}return J}fromJSON(J){super.fromJSON(J),this.points=[];for(let Q=0,$=J.points.length;Q<$;Q++){let Z=J.points[Q];this.points.push(new r().fromArray(Z))}return this}}var GQ=Object.freeze({__proto__:null,ArcCurve:OW,CatmullRomCurve3:kW,CubicBezierCurve:xQ,CubicBezierCurve3:MW,EllipseCurve:X6,LineCurve:gQ,LineCurve3:LW,QuadraticBezierCurve:pQ,QuadraticBezierCurve3:mQ,SplineCurve:dQ});class VW extends Y9{constructor(){super();this.type="CurvePath",this.curves=[],this.autoClose=!1}add(J){this.curves.push(J)}closePath(){let J=this.curves[0].getPoint(0),Q=this.curves[this.curves.length-1].getPoint(1);if(!J.equals(Q)){let $=J.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new GQ[$](Q,J))}return this}getPoint(J,Q){let $=J*this.getLength(),Z=this.getCurveLengths(),W=0;while(W<Z.length){if(Z[W]>=$){let K=Z[W]-$,Y=this.curves[W],H=Y.getLength(),X=H===0?0:1-K/H;return Y.getPointAt(X,Q)}W++}return null}getLength(){let J=this.getCurveLengths();return J[J.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let J=[],Q=0;for(let $=0,Z=this.curves.length;$<Z;$++)Q+=this.curves[$].getLength(),J.push(Q);return this.cacheLengths=J,J}getSpacedPoints(J=40){let Q=[];for(let $=0;$<=J;$++)Q.push(this.getPoint($/J));if(this.autoClose)Q.push(Q[0]);return Q}getPoints(J=12){let Q=[],$;for(let Z=0,W=this.curves;Z<W.length;Z++){let K=W[Z],Y=K.isEllipseCurve?J*2:K.isLineCurve||K.isLineCurve3?1:K.isSplineCurve?J*K.points.length:J,H=K.getPoints(Y);for(let X=0;X<H.length;X++){let U=H[X];if($&&$.equals(U))continue;Q.push(U),$=U}}if(this.autoClose&&Q.length>1&&!Q[Q.length-1].equals(Q[0]))Q.push(Q[0]);return Q}copy(J){super.copy(J),this.curves=[];for(let Q=0,$=J.curves.length;Q<$;Q++){let Z=J.curves[Q];this.curves.push(Z.clone())}return this.autoClose=J.autoClose,this}toJSON(){let J=super.toJSON();J.autoClose=this.autoClose,J.curves=[];for(let Q=0,$=this.curves.length;Q<$;Q++){let Z=this.curves[Q];J.curves.push(Z.toJSON())}return J}fromJSON(J){super.fromJSON(J),this.autoClose=J.autoClose,this.curves=[];for(let Q=0,$=J.curves.length;Q<$;Q++){let Z=J.curves[Q];this.curves.push(new GQ[Z.type]().fromJSON(Z))}return this}}class c7 extends VW{constructor(J){super();if(this.type="Path",this.currentPoint=new r,J)this.setFromPoints(J)}setFromPoints(J){this.moveTo(J[0].x,J[0].y);for(let Q=1,$=J.length;Q<$;Q++)this.lineTo(J[Q].x,J[Q].y);return this}moveTo(J,Q){return this.currentPoint.set(J,Q),this}lineTo(J,Q){let $=new gQ(this.currentPoint.clone(),new r(J,Q));return this.curves.push($),this.currentPoint.set(J,Q),this}quadraticCurveTo(J,Q,$,Z){let W=new pQ(this.currentPoint.clone(),new r(J,Q),new r($,Z));return this.curves.push(W),this.currentPoint.set($,Z),this}bezierCurveTo(J,Q,$,Z,W,K){let Y=new xQ(this.currentPoint.clone(),new r(J,Q),new r($,Z),new r(W,K));return this.curves.push(Y),this.currentPoint.set(W,K),this}splineThru(J){let Q=[this.currentPoint.clone()].concat(J),$=new dQ(Q);return this.curves.push($),this.currentPoint.copy(J[J.length-1]),this}arc(J,Q,$,Z,W,K){let Y=this.currentPoint.x,H=this.currentPoint.y;return this.absarc(J+Y,Q+H,$,Z,W,K),this}absarc(J,Q,$,Z,W,K){return this.absellipse(J,Q,$,$,Z,W,K),this}ellipse(J,Q,$,Z,W,K,Y,H){let X=this.currentPoint.x,U=this.currentPoint.y;return this.absellipse(J+X,Q+U,$,Z,W,K,Y,H),this}absellipse(J,Q,$,Z,W,K,Y,H){let X=new X6(J,Q,$,Z,W,K,Y,H);if(this.curves.length>0){let E=X.getPoint(0);if(!E.equals(this.currentPoint))this.lineTo(E.x,E.y)}this.curves.push(X);let U=X.getPoint(1);return this.currentPoint.copy(U),this}copy(J){return super.copy(J),this.currentPoint.copy(J.currentPoint),this}toJSON(){let J=super.toJSON();return J.currentPoint=this.currentPoint.toArray(),J}fromJSON(J){return super.fromJSON(J),this.currentPoint.fromArray(J.currentPoint),this}}class e9 extends c7{constructor(J){super(J);this.uuid=eJ(),this.type="Shape",this.holes=[]}getPointsHoles(J){let Q=[];for(let $=0,Z=this.holes.length;$<Z;$++)Q[$]=this.holes[$].getPoints(J);return Q}extractPoints(J){return{shape:this.getPoints(J),holes:this.getPointsHoles(J)}}copy(J){super.copy(J),this.holes=[];for(let Q=0,$=J.holes.length;Q<$;Q++){let Z=J.holes[Q];this.holes.push(Z.clone())}return this}toJSON(){let J=super.toJSON();J.uuid=this.uuid,J.holes=[];for(let Q=0,$=this.holes.length;Q<$;Q++){let Z=this.holes[Q];J.holes.push(Z.toJSON())}return J}fromJSON(J){super.fromJSON(J),this.uuid=J.uuid,this.holes=[];for(let Q=0,$=J.holes.length;Q<$;Q++){let Z=J.holes[Q];this.holes.push(new c7().fromJSON(Z))}return this}}function Q5(J,Q,$=2){let Z=Q&&Q.length,W=Z?Q[0]*$:J.length,K=aH(J,0,W,$,!0),Y=[];if(!K||K.next===K.prev)return Y;let H,X,U;if(Z)K=Y5(J,Q,K,$);if(J.length>80*$){H=J[0],X=J[1];let E=H,N=X;for(let G=$;G<W;G+=$){let q=J[G],O=J[G+1];if(q<H)H=q;if(O<X)X=O;if(q>E)E=q;if(O>N)N=O}U=Math.max(E-H,N-X),U=U!==0?32767/U:0}return n7(K,Y,$,H,X,U,0),Y}function aH(J,Q,$,Z,W){let K;if(W===R5(J,Q,$,Z)>0)for(let Y=Q;Y<$;Y+=Z)K=ZY(Y/Z|0,J[Y],J[Y+1],K);else for(let Y=$-Z;Y>=Q;Y-=Z)K=ZY(Y/Z|0,J[Y],J[Y+1],K);if(K&&E7(K,K.next))i7(K),K=K.next;return K}function A8(J,Q){if(!J)return J;if(!Q)Q=J;let $=J,Z;do if(Z=!1,!$.steiner&&(E7($,$.next)||RJ($.prev,$,$.next)===0)){if(i7($),$=Q=$.prev,$===$.next)break;Z=!0}else $=$.next;while(Z||$!==Q);return Q}function n7(J,Q,$,Z,W,K,Y){if(!J)return;if(!Y&&K)E5(J,Z,W,K);let H=J;while(J.prev!==J.next){let{prev:X,next:U}=J;if(K?Z5(J,Z,W,K):$5(J)){Q.push(X.i,J.i,U.i),i7(J),J=U.next,H=U.next;continue}if(J=U,J===H){if(!Y)n7(A8(J),Q,$,Z,W,K,1);else if(Y===1)J=W5(A8(J),Q),n7(J,Q,$,Z,W,K,2);else if(Y===2)K5(J,Q,$,Z,W,K);break}}}function $5(J){let Q=J.prev,$=J,Z=J.next;if(RJ(Q,$,Z)>=0)return!1;let W=Q.x,K=$.x,Y=Z.x,H=Q.y,X=$.y,U=Z.y,E=Math.min(W,K,Y),N=Math.min(H,X,U),G=Math.max(W,K,Y),q=Math.max(H,X,U),O=Z.next;while(O!==Q){if(O.x>=E&&O.x<=G&&O.y>=N&&O.y<=q&&p7(W,H,K,X,Y,U,O.x,O.y)&&RJ(O.prev,O,O.next)>=0)return!1;O=O.next}return!0}function Z5(J,Q,$,Z){let W=J.prev,K=J,Y=J.next;if(RJ(W,K,Y)>=0)return!1;let H=W.x,X=K.x,U=Y.x,E=W.y,N=K.y,G=Y.y,q=Math.min(H,X,U),O=Math.min(E,N,G),R=Math.max(H,X,U),F=Math.max(E,N,G),D=JZ(q,O,Q,$,Z),k=JZ(R,F,Q,$,Z),M=J.prevZ,V=J.nextZ;while(M&&M.z>=D&&V&&V.z<=k){if(M.x>=q&&M.x<=R&&M.y>=O&&M.y<=F&&M!==W&&M!==Y&&p7(H,E,X,N,U,G,M.x,M.y)&&RJ(M.prev,M,M.next)>=0)return!1;if(M=M.prevZ,V.x>=q&&V.x<=R&&V.y>=O&&V.y<=F&&V!==W&&V!==Y&&p7(H,E,X,N,U,G,V.x,V.y)&&RJ(V.prev,V,V.next)>=0)return!1;V=V.nextZ}while(M&&M.z>=D){if(M.x>=q&&M.x<=R&&M.y>=O&&M.y<=F&&M!==W&&M!==Y&&p7(H,E,X,N,U,G,M.x,M.y)&&RJ(M.prev,M,M.next)>=0)return!1;M=M.prevZ}while(V&&V.z<=k){if(V.x>=q&&V.x<=R&&V.y>=O&&V.y<=F&&V!==W&&V!==Y&&p7(H,E,X,N,U,G,V.x,V.y)&&RJ(V.prev,V,V.next)>=0)return!1;V=V.nextZ}return!0}function W5(J,Q){let $=J;do{let Z=$.prev,W=$.next.next;if(!E7(Z,W)&&tH(Z,$,$.next,W)&&s7(Z,W)&&s7(W,Z))Q.push(Z.i,$.i,W.i),i7($),i7($.next),$=J=W;$=$.next}while($!==J);return A8($)}function K5(J,Q,$,Z,W,K){let Y=J;do{let H=Y.next.next;while(H!==Y.prev){if(Y.i!==H.i&&D5(Y,H)){let X=eH(Y,H);Y=A8(Y,Y.next),X=A8(X,X.next),n7(Y,Q,$,Z,W,K,0),n7(X,Q,$,Z,W,K,0);return}H=H.next}Y=Y.next}while(Y!==J)}function Y5(J,Q,$,Z){let W=[];for(let K=0,Y=Q.length;K<Y;K++){let H=Q[K]*Z,X=K<Y-1?Q[K+1]*Z:J.length,U=aH(J,H,X,Z,!1);if(U===U.next)U.steiner=!0;W.push(q5(U))}W.sort(H5);for(let K=0;K<W.length;K++)$=X5(W[K],$);return $}function H5(J,Q){let $=J.x-Q.x;if($===0){if($=J.y-Q.y,$===0){let Z=(J.next.y-J.y)/(J.next.x-J.x),W=(Q.next.y-Q.y)/(Q.next.x-Q.x);$=Z-W}}return $}function X5(J,Q){let $=U5(J,Q);if(!$)return Q;let Z=eH($,J);return A8(Z,Z.next),A8($,$.next)}function U5(J,Q){let $=Q,Z=J.x,W=J.y,K=-1/0,Y;if(E7(J,$))return $;do{if(E7(J,$.next))return $.next;else if(W<=$.y&&W>=$.next.y&&$.next.y!==$.y){let N=$.x+(W-$.y)*($.next.x-$.x)/($.next.y-$.y);if(N<=Z&&N>K){if(K=N,Y=$.x<$.next.x?$:$.next,N===Z)return Y}}$=$.next}while($!==Q);if(!Y)return null;let H=Y,X=Y.x,U=Y.y,E=1/0;$=Y;do{if(Z>=$.x&&$.x>=X&&Z!==$.x&&rH(W<U?Z:K,W,X,U,W<U?K:Z,W,$.x,$.y)){let N=Math.abs(W-$.y)/(Z-$.x);if(s7($,J)&&(N<E||N===E&&($.x>Y.x||$.x===Y.x&&G5(Y,$))))Y=$,E=N}$=$.next}while($!==H);return Y}function G5(J,Q){return RJ(J.prev,J,Q.prev)<0&&RJ(Q.next,J,J.next)<0}function E5(J,Q,$,Z){let W=J;do{if(W.z===0)W.z=JZ(W.x,W.y,Q,$,Z);W.prevZ=W.prev,W.nextZ=W.next,W=W.next}while(W!==J);W.prevZ.nextZ=null,W.prevZ=null,N5(W)}function N5(J){let Q,$=1;do{let Z=J,W;J=null;let K=null;Q=0;while(Z){Q++;let Y=Z,H=0;for(let U=0;U<$;U++)if(H++,Y=Y.nextZ,!Y)break;let X=$;while(H>0||X>0&&Y){if(H!==0&&(X===0||!Y||Z.z<=Y.z))W=Z,Z=Z.nextZ,H--;else W=Y,Y=Y.nextZ,X--;if(K)K.nextZ=W;else J=W;W.prevZ=K,K=W}Z=Y}K.nextZ=null,$*=2}while(Q>1);return J}function JZ(J,Q,$,Z,W){return J=(J-$)*W|0,Q=(Q-Z)*W|0,J=(J|J<<8)&16711935,J=(J|J<<4)&252645135,J=(J|J<<2)&858993459,J=(J|J<<1)&1431655765,Q=(Q|Q<<8)&16711935,Q=(Q|Q<<4)&252645135,Q=(Q|Q<<2)&858993459,Q=(Q|Q<<1)&1431655765,J|Q<<1}function q5(J){let Q=J,$=J;do{if(Q.x<$.x||Q.x===$.x&&Q.y<$.y)$=Q;Q=Q.next}while(Q!==J);return $}function rH(J,Q,$,Z,W,K,Y,H){return(W-Y)*(Q-H)>=(J-Y)*(K-H)&&(J-Y)*(Z-H)>=($-Y)*(Q-H)&&($-Y)*(K-H)>=(W-Y)*(Z-H)}function p7(J,Q,$,Z,W,K,Y,H){return!(J===Y&&Q===H)&&rH(J,Q,$,Z,W,K,Y,H)}function D5(J,Q){return J.next.i!==Q.i&&J.prev.i!==Q.i&&!F5(J,Q)&&(s7(J,Q)&&s7(Q,J)&&O5(J,Q)&&(RJ(J.prev,J,Q.prev)||RJ(J,Q.prev,Q))||E7(J,Q)&&RJ(J.prev,J,J.next)>0&&RJ(Q.prev,Q,Q.next)>0)}function RJ(J,Q,$){return(Q.y-J.y)*($.x-Q.x)-(Q.x-J.x)*($.y-Q.y)}function E7(J,Q){return J.x===Q.x&&J.y===Q.y}function tH(J,Q,$,Z){let W=r6(RJ(J,Q,$)),K=r6(RJ(J,Q,Z)),Y=r6(RJ($,Z,J)),H=r6(RJ($,Z,Q));if(W!==K&&Y!==H)return!0;if(W===0&&a6(J,$,Q))return!0;if(K===0&&a6(J,Z,Q))return!0;if(Y===0&&a6($,J,Z))return!0;if(H===0&&a6($,Q,Z))return!0;return!1}function a6(J,Q,$){return Q.x<=Math.max(J.x,$.x)&&Q.x>=Math.min(J.x,$.x)&&Q.y<=Math.max(J.y,$.y)&&Q.y>=Math.min(J.y,$.y)}function r6(J){return J>0?1:J<0?-1:0}function F5(J,Q){let $=J;do{if($.i!==J.i&&$.next.i!==J.i&&$.i!==Q.i&&$.next.i!==Q.i&&tH($,$.next,J,Q))return!0;$=$.next}while($!==J);return!1}function s7(J,Q){return RJ(J.prev,J,J.next)<0?RJ(J,Q,J.next)>=0&&RJ(J,J.prev,Q)>=0:RJ(J,Q,J.prev)<0||RJ(J,J.next,Q)<0}function O5(J,Q){let $=J,Z=!1,W=(J.x+Q.x)/2,K=(J.y+Q.y)/2;do{if($.y>K!==$.next.y>K&&$.next.y!==$.y&&W<($.next.x-$.x)*(K-$.y)/($.next.y-$.y)+$.x)Z=!Z;$=$.next}while($!==J);return Z}function eH(J,Q){let $=QZ(J.i,J.x,J.y),Z=QZ(Q.i,Q.x,Q.y),W=J.next,K=Q.prev;return J.next=Q,Q.prev=J,$.next=W,W.prev=$,Z.next=$,$.prev=Z,K.next=Z,Z.prev=K,Z}function ZY(J,Q,$,Z){let W=QZ(J,Q,$);if(!Z)W.prev=W,W.next=W;else W.next=Z.next,W.prev=Z,Z.next.prev=W,Z.next=W;return W}function i7(J){if(J.next.prev=J.prev,J.prev.next=J.next,J.prevZ)J.prevZ.nextZ=J.nextZ;if(J.nextZ)J.nextZ.prevZ=J.prevZ}function QZ(J,Q,$){return{i:J,x:Q,y:$,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function R5(J,Q,$,Z){let W=0;for(let K=Q,Y=$-Z;K<$;K+=Z)W+=(J[Y]-J[K])*(J[K+1]+J[Y+1]),Y=K;return W}class JX{static triangulate(J,Q,$=2){return Q5(J,Q,$)}}class E9{static area(J){let Q=J.length,$=0;for(let Z=Q-1,W=0;W<Q;Z=W++)$+=J[Z].x*J[W].y-J[W].x*J[Z].y;return $*0.5}static isClockWise(J){return E9.area(J)<0}static triangulateShape(J,Q){let $=[],Z=[],W=[];WY(J),KY($,J);let K=J.length;Q.forEach(WY);for(let H=0;H<Q.length;H++)Z.push(K),K+=Q[H].length,KY($,Q[H]);let Y=JX.triangulate($,Z);for(let H=0;H<Y.length;H+=3)W.push(Y.slice(H,H+3));return W}}function WY(J){let Q=J.length;if(Q>2&&J[Q-1].equals(J[0]))J.pop()}function KY(J,Q){for(let $=0;$<Q.length;$++)J.push(Q[$].x),J.push(Q[$].y)}class lQ extends n0{constructor(J=new e9([new r(0.5,0.5),new r(-0.5,0.5),new r(-0.5,-0.5),new r(0.5,-0.5)]),Q={}){super();this.type="ExtrudeGeometry",this.parameters={shapes:J,options:Q},J=Array.isArray(J)?J:[J];let $=this,Z=[],W=[];for(let Y=0,H=J.length;Y<H;Y++){let X=J[Y];K(X)}this.setAttribute("position",new I0(Z,3)),this.setAttribute("uv",new I0(W,2)),this.computeVertexNormals();function K(Y){let H=[],X=Q.curveSegments!==void 0?Q.curveSegments:12,U=Q.steps!==void 0?Q.steps:1,E=Q.depth!==void 0?Q.depth:1,N=Q.bevelEnabled!==void 0?Q.bevelEnabled:!0,G=Q.bevelThickness!==void 0?Q.bevelThickness:0.2,q=Q.bevelSize!==void 0?Q.bevelSize:G-0.1,O=Q.bevelOffset!==void 0?Q.bevelOffset:0,R=Q.bevelSegments!==void 0?Q.bevelSegments:3,F=Q.extrudePath,D=Q.UVGenerator!==void 0?Q.UVGenerator:k5,k,M=!1,V,_,A,C;if(F){k=F.getSpacedPoints(U),M=!0,N=!1;let t=F.isCatmullRomCurve3?F.closed:!1;V=F.computeFrenetFrames(U,t),_=new P,A=new P,C=new P}if(!N)R=0,G=0,q=0,O=0;let L=Y.extractPoints(X),I=L.shape,b=L.holes;if(!E9.isClockWise(I)){I=I.reverse();for(let t=0,$0=b.length;t<$0;t++){let e=b[t];if(E9.isClockWise(e))b[t]=e.reverse()}}function p(t){let L0=t[0];for(let M0=1;M0<=t.length;M0++){let x0=M0%t.length,S=t[x0],t0=S.x-L0.x,y0=S.y-L0.y,g0=t0*t0+y0*y0,K0=Math.max(Math.abs(S.x),Math.abs(S.y),Math.abs(L0.x),Math.abs(L0.y)),XJ=0.000000000000000000010000000000000001*K0*K0;if(g0<=XJ){t.splice(x0,1),M0--;continue}L0=S}}p(I),b.forEach(p);let u=b.length,y=I;for(let t=0;t<u;t++){let $0=b[t];I=I.concat($0)}function l(t,$0,e){if(!$0)T0("ExtrudeGeometry: vec does not exist");return t.clone().addScaledVector($0,e)}let h=I.length;function m(t,$0,e){let L0,M0,x0,S=t.x-$0.x,t0=t.y-$0.y,y0=e.x-t.x,g0=e.y-t.y,K0=S*S+t0*t0,XJ=S*g0-t0*y0;if(Math.abs(XJ)>Number.EPSILON){let w0=Math.sqrt(K0),w=Math.sqrt(y0*y0+g0*g0),B=$0.x-t0/w0,f=$0.y+S/w0,i=e.x-g0/w,J0=e.y+y0/w,Z0=((i-B)*g0-(J0-f)*y0)/(S*g0-t0*y0);L0=B+S*Z0-t.x,M0=f+t0*Z0-t.y;let q0=L0*L0+M0*M0;if(q0<=2)return new r(L0,M0);else x0=Math.sqrt(q0/2)}else{let w0=!1;if(S>Number.EPSILON){if(y0>Number.EPSILON)w0=!0}else if(S<-Number.EPSILON){if(y0<-Number.EPSILON)w0=!0}else if(Math.sign(t0)===Math.sign(g0))w0=!0;if(w0)L0=-t0,M0=S,x0=Math.sqrt(K0);else L0=S,M0=t0,x0=Math.sqrt(K0/2)}return new r(L0/x0,M0/x0)}let a=[];for(let t=0,$0=y.length,e=$0-1,L0=t+1;t<$0;t++,e++,L0++){if(e===$0)e=0;if(L0===$0)L0=0;a[t]=m(y[t],y[e],y[L0])}let W0=[],N0,j0=a.concat();for(let t=0,$0=u;t<$0;t++){let e=b[t];N0=[];for(let L0=0,M0=e.length,x0=M0-1,S=L0+1;L0<M0;L0++,x0++,S++){if(x0===M0)x0=0;if(S===M0)S=0;N0[L0]=m(e[L0],e[x0],e[S])}W0.push(N0),j0=j0.concat(N0)}let B0;if(R===0)B0=E9.triangulateShape(y,b);else{let t=[],$0=[];for(let e=0;e<R;e++){let L0=e/R,M0=G*Math.cos(L0*Math.PI/2),x0=q*Math.sin(L0*Math.PI/2)+O;for(let S=0,t0=y.length;S<t0;S++){let y0=l(y[S],a[S],x0);if(G0(y0.x,y0.y,-M0),L0===0)t.push(y0)}for(let S=0,t0=u;S<t0;S++){let y0=b[S];N0=W0[S];let g0=[];for(let K0=0,XJ=y0.length;K0<XJ;K0++){let w0=l(y0[K0],N0[K0],x0);if(G0(w0.x,w0.y,-M0),L0===0)g0.push(w0)}if(L0===0)$0.push(g0)}}B0=E9.triangulateShape(t,$0)}let ZJ=B0.length,r0=q+O;for(let t=0;t<h;t++){let $0=N?l(I[t],j0[t],r0):I[t];if(!M)G0($0.x,$0.y,0);else A.copy(V.normals[0]).multiplyScalar($0.x),_.copy(V.binormals[0]).multiplyScalar($0.y),C.copy(k[0]).add(A).add(_),G0(C.x,C.y,C.z)}for(let t=1;t<=U;t++)for(let $0=0;$0<h;$0++){let e=N?l(I[$0],j0[$0],r0):I[$0];if(!M)G0(e.x,e.y,E/U*t);else A.copy(V.normals[t]).multiplyScalar(e.x),_.copy(V.binormals[t]).multiplyScalar(e.y),C.copy(k[t]).add(A).add(_),G0(C.x,C.y,C.z)}for(let t=R-1;t>=0;t--){let $0=t/R,e=G*Math.cos($0*Math.PI/2),L0=q*Math.sin($0*Math.PI/2)+O;for(let M0=0,x0=y.length;M0<x0;M0++){let S=l(y[M0],a[M0],L0);G0(S.x,S.y,E+e)}for(let M0=0,x0=b.length;M0<x0;M0++){let S=b[M0];N0=W0[M0];for(let t0=0,y0=S.length;t0<y0;t0++){let g0=l(S[t0],N0[t0],L0);if(!M)G0(g0.x,g0.y,E+e);else G0(g0.x,g0.y+k[U-1].y,k[U-1].x+e)}}}s(),O0();function s(){let t=Z.length/3;if(N){let $0=0,e=h*$0;for(let L0=0;L0<ZJ;L0++){let M0=B0[L0];b0(M0[2]+e,M0[1]+e,M0[0]+e)}$0=U+R*2,e=h*$0;for(let L0=0;L0<ZJ;L0++){let M0=B0[L0];b0(M0[0]+e,M0[1]+e,M0[2]+e)}}else{for(let $0=0;$0<ZJ;$0++){let e=B0[$0];b0(e[2],e[1],e[0])}for(let $0=0;$0<ZJ;$0++){let e=B0[$0];b0(e[0]+h*U,e[1]+h*U,e[2]+h*U)}}$.addGroup(t,Z.length/3-t,0)}function O0(){let t=Z.length/3,$0=0;P0(y,$0),$0+=y.length;for(let e=0,L0=b.length;e<L0;e++){let M0=b[e];P0(M0,$0),$0+=M0.length}$.addGroup(t,Z.length/3-t,1)}function P0(t,$0){let e=t.length;while(--e>=0){let L0=e,M0=e-1;if(M0<0)M0=t.length-1;for(let x0=0,S=U+R*2;x0<S;x0++){let t0=h*x0,y0=h*(x0+1),g0=$0+L0+t0,K0=$0+M0+t0,XJ=$0+M0+y0,w0=$0+L0+y0;WJ(g0,K0,XJ,w0)}}}function G0(t,$0,e){H.push(t),H.push($0),H.push(e)}function b0(t,$0,e){p0(t),p0($0),p0(e);let L0=Z.length/3,M0=D.generateTopUV($,Z,L0-3,L0-2,L0-1);l0(M0[0]),l0(M0[1]),l0(M0[2])}function WJ(t,$0,e,L0){p0(t),p0($0),p0(L0),p0($0),p0(e),p0(L0);let M0=Z.length/3,x0=D.generateSideWallUV($,Z,M0-6,M0-3,M0-2,M0-1);l0(x0[0]),l0(x0[1]),l0(x0[3]),l0(x0[1]),l0(x0[2]),l0(x0[3])}function p0(t){Z.push(H[t*3+0]),Z.push(H[t*3+1]),Z.push(H[t*3+2])}function l0(t){W.push(t.x),W.push(t.y)}}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}toJSON(){let J=super.toJSON(),Q=this.parameters.shapes,$=this.parameters.options;return M5(Q,$,J)}static fromJSON(J,Q){let $=[];for(let W=0,K=J.shapes.length;W<K;W++){let Y=Q[J.shapes[W]];$.push(Y)}let Z=J.options.extrudePath;if(Z!==void 0)J.options.extrudePath=new GQ[Z.type]().fromJSON(Z);return new lQ($,J.options)}}var k5={generateTopUV:function(J,Q,$,Z,W){let K=Q[$*3],Y=Q[$*3+1],H=Q[Z*3],X=Q[Z*3+1],U=Q[W*3],E=Q[W*3+1];return[new r(K,Y),new r(H,X),new r(U,E)]},generateSideWallUV:function(J,Q,$,Z,W,K){let Y=Q[$*3],H=Q[$*3+1],X=Q[$*3+2],U=Q[Z*3],E=Q[Z*3+1],N=Q[Z*3+2],G=Q[W*3],q=Q[W*3+1],O=Q[W*3+2],R=Q[K*3],F=Q[K*3+1],D=Q[K*3+2];if(Math.abs(H-E)<Math.abs(Y-U))return[new r(Y,1-X),new r(U,1-N),new r(G,1-O),new r(R,1-D)];else return[new r(H,1-X),new r(E,1-N),new r(q,1-O),new r(F,1-D)]}};function M5(J,Q,$){if($.shapes=[],Array.isArray(J))for(let Z=0,W=J.length;Z<W;Z++){let K=J[Z];$.shapes.push(K.uuid)}else $.shapes.push(J.uuid);if($.options=Object.assign({},Q),Q.extrudePath!==void 0)$.options.extrudePath=Q.extrudePath.toJSON();return $}class uQ extends W8{constructor(J=1,Q=0){let $=(1+Math.sqrt(5))/2,Z=[-1,$,0,1,$,0,-1,-$,0,1,-$,0,0,-1,$,0,1,$,0,-1,-$,0,1,-$,$,0,-1,$,0,1,-$,0,-1,-$,0,1],W=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(Z,W,J,Q);this.type="IcosahedronGeometry",this.parameters={radius:J,detail:Q}}static fromJSON(J){return new uQ(J.radius,J.detail)}}class cQ extends n0{constructor(J=[new r(0,-0.5),new r(0.5,0),new r(0,0.5)],Q=12,$=0,Z=Math.PI*2){super();this.type="LatheGeometry",this.parameters={points:J,segments:Q,phiStart:$,phiLength:Z},Q=Math.floor(Q),Z=m0(Z,0,Math.PI*2);let W=[],K=[],Y=[],H=[],X=[],U=1/Q,E=new P,N=new r,G=new P,q=new P,O=new P,R=0,F=0;for(let D=0;D<=J.length-1;D++)switch(D){case 0:R=J[D+1].x-J[D].x,F=J[D+1].y-J[D].y,G.x=F*1,G.y=-R,G.z=F*0,O.copy(G),G.normalize(),H.push(G.x,G.y,G.z);break;case J.length-1:H.push(O.x,O.y,O.z);break;default:R=J[D+1].x-J[D].x,F=J[D+1].y-J[D].y,G.x=F*1,G.y=-R,G.z=F*0,q.copy(G),G.x+=O.x,G.y+=O.y,G.z+=O.z,G.normalize(),H.push(G.x,G.y,G.z),O.copy(q)}for(let D=0;D<=Q;D++){let k=$+D*U*Z,M=Math.sin(k),V=Math.cos(k);for(let _=0;_<=J.length-1;_++){E.x=J[_].x*M,E.y=J[_].y,E.z=J[_].x*V,K.push(E.x,E.y,E.z),N.x=D/Q,N.y=_/(J.length-1),Y.push(N.x,N.y);let A=H[3*_+0]*M,C=H[3*_+1],L=H[3*_+0]*V;X.push(A,C,L)}}for(let D=0;D<Q;D++)for(let k=0;k<J.length-1;k++){let M=k+D*J.length,V=M,_=M+J.length,A=M+J.length+1,C=M+1;W.push(V,_,C),W.push(A,C,_)}this.setIndex(W),this.setAttribute("position",new I0(K,3)),this.setAttribute("uv",new I0(Y,2)),this.setAttribute("normal",new I0(X,3))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new cQ(J.points,J.segments,J.phiStart,J.phiLength)}}class U6 extends W8{constructor(J=1,Q=0){let $=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],Z=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super($,Z,J,Q);this.type="OctahedronGeometry",this.parameters={radius:J,detail:Q}}static fromJSON(J){return new U6(J.radius,J.detail)}}class B7 extends n0{constructor(J=1,Q=1,$=1,Z=1){super();this.type="PlaneGeometry",this.parameters={width:J,height:Q,widthSegments:$,heightSegments:Z};let W=J/2,K=Q/2,Y=Math.floor($),H=Math.floor(Z),X=Y+1,U=H+1,E=J/Y,N=Q/H,G=[],q=[],O=[],R=[];for(let F=0;F<U;F++){let D=F*N-K;for(let k=0;k<X;k++){let M=k*E-W;q.push(M,-D,0),O.push(0,0,1),R.push(k/Y),R.push(1-F/H)}}for(let F=0;F<H;F++)for(let D=0;D<Y;D++){let k=D+X*F,M=D+X*(F+1),V=D+1+X*(F+1),_=D+1+X*F;G.push(k,M,_),G.push(M,V,_)}this.setIndex(G),this.setAttribute("position",new I0(q,3)),this.setAttribute("normal",new I0(O,3)),this.setAttribute("uv",new I0(R,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new B7(J.width,J.height,J.widthSegments,J.heightSegments)}}class nQ extends n0{constructor(J=0.5,Q=1,$=32,Z=1,W=0,K=Math.PI*2){super();this.type="RingGeometry",this.parameters={innerRadius:J,outerRadius:Q,thetaSegments:$,phiSegments:Z,thetaStart:W,thetaLength:K},$=Math.max(3,$),Z=Math.max(1,Z);let Y=[],H=[],X=[],U=[],E=J,N=(Q-J)/Z,G=new P,q=new r;for(let O=0;O<=Z;O++){for(let R=0;R<=$;R++){let F=W+R/$*K;G.x=E*Math.cos(F),G.y=E*Math.sin(F),H.push(G.x,G.y,G.z),X.push(0,0,1),q.x=(G.x/Q+1)/2,q.y=(G.y/Q+1)/2,U.push(q.x,q.y)}E+=N}for(let O=0;O<Z;O++){let R=O*($+1);for(let F=0;F<$;F++){let D=F+R,k=D,M=D+$+1,V=D+$+2,_=D+1;Y.push(k,M,_),Y.push(M,V,_)}}this.setIndex(Y),this.setAttribute("position",new I0(H,3)),this.setAttribute("normal",new I0(X,3)),this.setAttribute("uv",new I0(U,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new nQ(J.innerRadius,J.outerRadius,J.thetaSegments,J.phiSegments,J.thetaStart,J.thetaLength)}}class sQ extends n0{constructor(J=new e9([new r(0,0.5),new r(-0.5,-0.5),new r(0.5,-0.5)]),Q=12){super();this.type="ShapeGeometry",this.parameters={shapes:J,curveSegments:Q};let $=[],Z=[],W=[],K=[],Y=0,H=0;if(Array.isArray(J)===!1)X(J);else for(let U=0;U<J.length;U++)X(J[U]),this.addGroup(Y,H,U),Y+=H,H=0;this.setIndex($),this.setAttribute("position",new I0(Z,3)),this.setAttribute("normal",new I0(W,3)),this.setAttribute("uv",new I0(K,2));function X(U){let E=Z.length/3,N=U.extractPoints(Q),G=N.shape,q=N.holes;if(E9.isClockWise(G)===!1)G=G.reverse();for(let R=0,F=q.length;R<F;R++){let D=q[R];if(E9.isClockWise(D)===!0)q[R]=D.reverse()}let O=E9.triangulateShape(G,q);for(let R=0,F=q.length;R<F;R++){let D=q[R];G=G.concat(D)}for(let R=0,F=G.length;R<F;R++){let D=G[R];Z.push(D.x,D.y,0),W.push(0,0,1),K.push(D.x,D.y)}for(let R=0,F=O.length;R<F;R++){let D=O[R],k=D[0]+E,M=D[1]+E,V=D[2]+E;$.push(k,M,V),H+=3}}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}toJSON(){let J=super.toJSON(),Q=this.parameters.shapes;return L5(Q,J)}static fromJSON(J,Q){let $=[];for(let Z=0,W=J.shapes.length;Z<W;Z++){let K=Q[J.shapes[Z]];$.push(K)}return new sQ($,J.curveSegments)}}function L5(J,Q){if(Q.shapes=[],Array.isArray(J))for(let $=0,Z=J.length;$<Z;$++){let W=J[$];Q.shapes.push(W.uuid)}else Q.shapes.push(J.uuid);return Q}class G6 extends n0{constructor(J=1,Q=32,$=16,Z=0,W=Math.PI*2,K=0,Y=Math.PI){super();this.type="SphereGeometry",this.parameters={radius:J,widthSegments:Q,heightSegments:$,phiStart:Z,phiLength:W,thetaStart:K,thetaLength:Y},Q=Math.max(3,Math.floor(Q)),$=Math.max(2,Math.floor($));let H=Math.min(K+Y,Math.PI),X=0,U=[],E=new P,N=new P,G=[],q=[],O=[],R=[];for(let F=0;F<=$;F++){let D=[],k=F/$,M=0;if(F===0&&K===0)M=0.5/Q;else if(F===$&&H===Math.PI)M=-0.5/Q;for(let V=0;V<=Q;V++){let _=V/Q;E.x=-J*Math.cos(Z+_*W)*Math.sin(K+k*Y),E.y=J*Math.cos(K+k*Y),E.z=J*Math.sin(Z+_*W)*Math.sin(K+k*Y),q.push(E.x,E.y,E.z),N.copy(E).normalize(),O.push(N.x,N.y,N.z),R.push(_+M,1-k),D.push(X++)}U.push(D)}for(let F=0;F<$;F++)for(let D=0;D<Q;D++){let k=U[F][D+1],M=U[F][D],V=U[F+1][D],_=U[F+1][D+1];if(F!==0||K>0)G.push(k,M,_);if(F!==$-1||H<Math.PI)G.push(M,V,_)}this.setIndex(G),this.setAttribute("position",new I0(q,3)),this.setAttribute("normal",new I0(O,3)),this.setAttribute("uv",new I0(R,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new G6(J.radius,J.widthSegments,J.heightSegments,J.phiStart,J.phiLength,J.thetaStart,J.thetaLength)}}class iQ extends W8{constructor(J=1,Q=0){let $=[1,1,1,-1,-1,1,-1,1,-1,1,-1,-1],Z=[2,1,0,0,3,2,1,3,0,2,3,1];super($,Z,J,Q);this.type="TetrahedronGeometry",this.parameters={radius:J,detail:Q}}static fromJSON(J){return new iQ(J.radius,J.detail)}}class oQ extends n0{constructor(J=1,Q=0.4,$=12,Z=48,W=Math.PI*2,K=0,Y=Math.PI*2){super();this.type="TorusGeometry",this.parameters={radius:J,tube:Q,radialSegments:$,tubularSegments:Z,arc:W,thetaStart:K,thetaLength:Y},$=Math.floor($),Z=Math.floor(Z);let H=[],X=[],U=[],E=[],N=new P,G=new P,q=new P;for(let O=0;O<=$;O++){let R=K+O/$*Y;for(let F=0;F<=Z;F++){let D=F/Z*W;G.x=(J+Q*Math.cos(R))*Math.cos(D),G.y=(J+Q*Math.cos(R))*Math.sin(D),G.z=Q*Math.sin(R),X.push(G.x,G.y,G.z),N.x=J*Math.cos(D),N.y=J*Math.sin(D),q.subVectors(G,N).normalize(),U.push(q.x,q.y,q.z),E.push(F/Z),E.push(O/$)}}for(let O=1;O<=$;O++)for(let R=1;R<=Z;R++){let F=(Z+1)*O+R-1,D=(Z+1)*(O-1)+R-1,k=(Z+1)*(O-1)+R,M=(Z+1)*O+R;H.push(F,D,M),H.push(D,k,M)}this.setIndex(H),this.setAttribute("position",new I0(X,3)),this.setAttribute("normal",new I0(U,3)),this.setAttribute("uv",new I0(E,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new oQ(J.radius,J.tube,J.radialSegments,J.tubularSegments,J.arc)}}class aQ extends n0{constructor(J=1,Q=0.4,$=64,Z=8,W=2,K=3){super();this.type="TorusKnotGeometry",this.parameters={radius:J,tube:Q,tubularSegments:$,radialSegments:Z,p:W,q:K},$=Math.floor($),Z=Math.floor(Z);let Y=[],H=[],X=[],U=[],E=new P,N=new P,G=new P,q=new P,O=new P,R=new P,F=new P;for(let k=0;k<=$;++k){let M=k/$*W*Math.PI*2;D(M,W,K,J,G),D(M+0.01,W,K,J,q),R.subVectors(q,G),F.addVectors(q,G),O.crossVectors(R,F),F.crossVectors(O,R),O.normalize(),F.normalize();for(let V=0;V<=Z;++V){let _=V/Z*Math.PI*2,A=-Q*Math.cos(_),C=Q*Math.sin(_);E.x=G.x+(A*F.x+C*O.x),E.y=G.y+(A*F.y+C*O.y),E.z=G.z+(A*F.z+C*O.z),H.push(E.x,E.y,E.z),N.subVectors(E,G).normalize(),X.push(N.x,N.y,N.z),U.push(k/$),U.push(V/Z)}}for(let k=1;k<=$;k++)for(let M=1;M<=Z;M++){let V=(Z+1)*(k-1)+(M-1),_=(Z+1)*k+(M-1),A=(Z+1)*k+M,C=(Z+1)*(k-1)+M;Y.push(V,_,C),Y.push(_,A,C)}this.setIndex(Y),this.setAttribute("position",new I0(H,3)),this.setAttribute("normal",new I0(X,3)),this.setAttribute("uv",new I0(U,2));function D(k,M,V,_,A){let C=Math.cos(k),L=Math.sin(k),I=V/M*k,b=Math.cos(I);A.x=_*(2+b)*0.5*C,A.y=_*(2+b)*L*0.5,A.z=_*Math.sin(I)*0.5}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new aQ(J.radius,J.tube,J.tubularSegments,J.radialSegments,J.p,J.q)}}class rQ extends n0{constructor(J=new mQ(new P(-1,-1,0),new P(-1,1,0),new P(1,1,0)),Q=64,$=1,Z=8,W=!1){super();this.type="TubeGeometry",this.parameters={path:J,tubularSegments:Q,radius:$,radialSegments:Z,closed:W};let K=J.computeFrenetFrames(Q,W);this.tangents=K.tangents,this.normals=K.normals,this.binormals=K.binormals;let Y=new P,H=new P,X=new r,U=new P,E=[],N=[],G=[],q=[];O(),this.setIndex(q),this.setAttribute("position",new I0(E,3)),this.setAttribute("normal",new I0(N,3)),this.setAttribute("uv",new I0(G,2));function O(){for(let k=0;k<Q;k++)R(k);R(W===!1?Q:0),D(),F()}function R(k){U=J.getPointAt(k/Q,U);let M=K.normals[k],V=K.binormals[k];for(let _=0;_<=Z;_++){let A=_/Z*Math.PI*2,C=Math.sin(A),L=-Math.cos(A);H.x=L*M.x+C*V.x,H.y=L*M.y+C*V.y,H.z=L*M.z+C*V.z,H.normalize(),N.push(H.x,H.y,H.z),Y.x=U.x+$*H.x,Y.y=U.y+$*H.y,Y.z=U.z+$*H.z,E.push(Y.x,Y.y,Y.z)}}function F(){for(let k=1;k<=Q;k++)for(let M=1;M<=Z;M++){let V=(Z+1)*(k-1)+(M-1),_=(Z+1)*k+(M-1),A=(Z+1)*k+M,C=(Z+1)*(k-1)+M;q.push(V,_,C),q.push(_,A,C)}}function D(){for(let k=0;k<=Q;k++)for(let M=0;M<=Z;M++)X.x=k/Q,X.y=M/Z,G.push(X.x,X.y)}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}toJSON(){let J=super.toJSON();return J.path=this.parameters.path.toJSON(),J}static fromJSON(J){return new rQ(new GQ[J.path.type]().fromJSON(J.path),J.tubularSegments,J.radius,J.radialSegments,J.closed)}}class BW extends n0{constructor(J=null){super();if(this.type="WireframeGeometry",this.parameters={geometry:J},J!==null){let Q=[],$=new Set,Z=new P,W=new P;if(J.index!==null){let K=J.attributes.position,Y=J.index,H=J.groups;if(H.length===0)H=[{start:0,count:Y.count,materialIndex:0}];for(let X=0,U=H.length;X<U;++X){let E=H[X],N=E.start,G=E.count;for(let q=N,O=N+G;q<O;q+=3)for(let R=0;R<3;R++){let F=Y.getX(q+R),D=Y.getX(q+(R+1)%3);if(Z.fromBufferAttribute(K,F),W.fromBufferAttribute(K,D),YY(Z,W,$)===!0)Q.push(Z.x,Z.y,Z.z),Q.push(W.x,W.y,W.z)}}}else{let K=J.attributes.position;for(let Y=0,H=K.count/3;Y<H;Y++)for(let X=0;X<3;X++){let U=3*Y+X,E=3*Y+(X+1)%3;if(Z.fromBufferAttribute(K,U),W.fromBufferAttribute(K,E),YY(Z,W,$)===!0)Q.push(Z.x,Z.y,Z.z),Q.push(W.x,W.y,W.z)}}this.setAttribute("position",new I0(Q,3))}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}}function YY(J,Q,$){let Z=`${J.x},${J.y},${J.z}-${Q.x},${Q.y},${Q.z}`,W=`${Q.x},${Q.y},${Q.z}-${J.x},${J.y},${J.z}`;if($.has(Z)===!0||$.has(W)===!0)return!1;else return $.add(Z),$.add(W),!0}var HY=Object.freeze({__proto__:null,BoxGeometry:b8,CapsuleGeometry:fQ,CircleGeometry:bQ,ConeGeometry:H6,CylinderGeometry:Y6,DodecahedronGeometry:hQ,EdgesGeometry:FW,ExtrudeGeometry:lQ,IcosahedronGeometry:uQ,LatheGeometry:cQ,OctahedronGeometry:U6,PlaneGeometry:B7,PolyhedronGeometry:W8,RingGeometry:nQ,ShapeGeometry:sQ,SphereGeometry:G6,TetrahedronGeometry:iQ,TorusGeometry:oQ,TorusKnotGeometry:aQ,TubeGeometry:rQ,WireframeGeometry:BW});class zW extends yJ{constructor(J){super();this.isShadowMaterial=!0,this.type="ShadowMaterial",this.color=new V0(0),this.transparent=!0,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.fog=J.fog,this}}function h8(J){let Q={};for(let $ in J){Q[$]={};for(let Z in J[$]){let W=J[$][Z];if(XY(W))if(W.isRenderTargetTexture)X0("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),Q[$][Z]=null;else Q[$][Z]=W.clone();else if(Array.isArray(W))if(XY(W[0])){let K=[];for(let Y=0,H=W.length;Y<H;Y++)K[Y]=W[Y].clone();Q[$][Z]=K}else Q[$][Z]=W.slice();else Q[$][Z]=W}}return Q}function pJ(J){let Q={};for(let $=0;$<J.length;$++){let Z=h8(J[$]);for(let W in Z)Q[W]=Z[W]}return Q}function XY(J){return J&&(J.isColor||J.isMatrix3||J.isMatrix4||J.isVector2||J.isVector3||J.isVector4||J.isTexture||J.isQuaternion)}function V5(J){let Q=[];for(let $=0;$<J.length;$++)Q.push(J[$].clone());return Q}function IW(J){let Q=J.getRenderTarget();if(Q===null)return J.outputColorSpace;if(Q.isXRRenderTarget===!0)return Q.texture.colorSpace;return $J.workingColorSpace}var QX={clone:h8,merge:pJ},B5=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,z5=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class J9 extends yJ{constructor(J){super();if(this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=B5,this.fragmentShader=z5,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,J!==void 0)this.setValues(J)}copy(J){return super.copy(J),this.fragmentShader=J.fragmentShader,this.vertexShader=J.vertexShader,this.uniforms=h8(J.uniforms),this.uniformsGroups=V5(J.uniformsGroups),this.defines=Object.assign({},J.defines),this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.fog=J.fog,this.lights=J.lights,this.clipping=J.clipping,this.extensions=Object.assign({},J.extensions),this.glslVersion=J.glslVersion,this.defaultAttributeValues=Object.assign({},J.defaultAttributeValues),this.index0AttributeName=J.index0AttributeName,this.uniformsNeedUpdate=J.uniformsNeedUpdate,this}toJSON(J){let Q=super.toJSON(J);Q.glslVersion=this.glslVersion,Q.uniforms={};for(let Z in this.uniforms){let K=this.uniforms[Z].value;if(K&&K.isTexture)Q.uniforms[Z]={type:"t",value:K.toJSON(J).uuid};else if(K&&K.isColor)Q.uniforms[Z]={type:"c",value:K.getHex()};else if(K&&K.isVector2)Q.uniforms[Z]={type:"v2",value:K.toArray()};else if(K&&K.isVector3)Q.uniforms[Z]={type:"v3",value:K.toArray()};else if(K&&K.isVector4)Q.uniforms[Z]={type:"v4",value:K.toArray()};else if(K&&K.isMatrix3)Q.uniforms[Z]={type:"m3",value:K.toArray()};else if(K&&K.isMatrix4)Q.uniforms[Z]={type:"m4",value:K.toArray()};else Q.uniforms[Z]={value:K}}if(Object.keys(this.defines).length>0)Q.defines=this.defines;Q.vertexShader=this.vertexShader,Q.fragmentShader=this.fragmentShader,Q.lights=this.lights,Q.clipping=this.clipping;let $={};for(let Z in this.extensions)if(this.extensions[Z]===!0)$[Z]=!0;if(Object.keys($).length>0)Q.extensions=$;return Q}}class tQ extends J9{constructor(J){super(J);this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class eQ extends yJ{constructor(J){super();this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new V0(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new V0(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new r(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new N9,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.defines={STANDARD:""},this.color.copy(J.color),this.roughness=J.roughness,this.metalness=J.metalness,this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.emissive.copy(J.emissive),this.emissiveMap=J.emissiveMap,this.emissiveIntensity=J.emissiveIntensity,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.roughnessMap=J.roughnessMap,this.metalnessMap=J.metalnessMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.envMapIntensity=J.envMapIntensity,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.flatShading=J.flatShading,this.fog=J.fog,this}}class _W extends eQ{constructor(J){super();this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new r(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return m0(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(Q){this.ior=(1+0.4*Q)/(1-0.4*Q)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new V0(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new V0(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new V0(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(J)}get anisotropy(){return this._anisotropy}set anisotropy(J){if(this._anisotropy>0!==J>0)this.version++;this._anisotropy=J}get clearcoat(){return this._clearcoat}set clearcoat(J){if(this._clearcoat>0!==J>0)this.version++;this._clearcoat=J}get iridescence(){return this._iridescence}set iridescence(J){if(this._iridescence>0!==J>0)this.version++;this._iridescence=J}get dispersion(){return this._dispersion}set dispersion(J){if(this._dispersion>0!==J>0)this.version++;this._dispersion=J}get sheen(){return this._sheen}set sheen(J){if(this._sheen>0!==J>0)this.version++;this._sheen=J}get transmission(){return this._transmission}set transmission(J){if(this._transmission>0!==J>0)this.version++;this._transmission=J}copy(J){return super.copy(J),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=J.anisotropy,this.anisotropyRotation=J.anisotropyRotation,this.anisotropyMap=J.anisotropyMap,this.clearcoat=J.clearcoat,this.clearcoatMap=J.clearcoatMap,this.clearcoatRoughness=J.clearcoatRoughness,this.clearcoatRoughnessMap=J.clearcoatRoughnessMap,this.clearcoatNormalMap=J.clearcoatNormalMap,this.clearcoatNormalScale.copy(J.clearcoatNormalScale),this.dispersion=J.dispersion,this.ior=J.ior,this.iridescence=J.iridescence,this.iridescenceMap=J.iridescenceMap,this.iridescenceIOR=J.iridescenceIOR,this.iridescenceThicknessRange=[...J.iridescenceThicknessRange],this.iridescenceThicknessMap=J.iridescenceThicknessMap,this.sheen=J.sheen,this.sheenColor.copy(J.sheenColor),this.sheenColorMap=J.sheenColorMap,this.sheenRoughness=J.sheenRoughness,this.sheenRoughnessMap=J.sheenRoughnessMap,this.transmission=J.transmission,this.transmissionMap=J.transmissionMap,this.thickness=J.thickness,this.thicknessMap=J.thicknessMap,this.attenuationDistance=J.attenuationDistance,this.attenuationColor.copy(J.attenuationColor),this.specularIntensity=J.specularIntensity,this.specularIntensityMap=J.specularIntensityMap,this.specularColor.copy(J.specularColor),this.specularColorMap=J.specularColorMap,this}}class wW extends yJ{constructor(J){super();this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new V0(16777215),this.specular=new V0(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new V0(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new r(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new N9,this.combine=0,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.specular.copy(J.specular),this.shininess=J.shininess,this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.emissive.copy(J.emissive),this.emissiveMap=J.emissiveMap,this.emissiveIntensity=J.emissiveIntensity,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.specularMap=J.specularMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.combine=J.combine,this.reflectivity=J.reflectivity,this.envMapIntensity=J.envMapIntensity,this.refractionRatio=J.refractionRatio,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.flatShading=J.flatShading,this.fog=J.fog,this}}class AW extends yJ{constructor(J){super();this.isMeshToonMaterial=!0,this.defines={TOON:""},this.type="MeshToonMaterial",this.color=new V0(16777215),this.map=null,this.gradientMap=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new V0(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new r(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.gradientMap=J.gradientMap,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.emissive.copy(J.emissive),this.emissiveMap=J.emissiveMap,this.emissiveIntensity=J.emissiveIntensity,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.alphaMap=J.alphaMap,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.fog=J.fog,this}}class CW extends yJ{constructor(J){super();this.isMeshNormalMaterial=!0,this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new r(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(J)}copy(J){return super.copy(J),this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.flatShading=J.flatShading,this}}class PW extends yJ{constructor(J){super();this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new V0(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new V0(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new r(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new N9,this.combine=0,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.emissive.copy(J.emissive),this.emissiveMap=J.emissiveMap,this.emissiveIntensity=J.emissiveIntensity,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.specularMap=J.specularMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.combine=J.combine,this.reflectivity=J.reflectivity,this.envMapIntensity=J.envMapIntensity,this.refractionRatio=J.refractionRatio,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.flatShading=J.flatShading,this.fog=J.fog,this}}class J$ extends yJ{constructor(J){super();this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(J)}copy(J){return super.copy(J),this.depthPacking=J.depthPacking,this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this}}class Q$ extends yJ{constructor(J){super();this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(J)}copy(J){return super.copy(J),this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this}}class TW extends yJ{constructor(J){super();this.isMeshMatcapMaterial=!0,this.defines={MATCAP:""},this.type="MeshMatcapMaterial",this.color=new V0(16777215),this.matcap=null,this.map=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new r(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.defines={MATCAP:""},this.color.copy(J.color),this.matcap=J.matcap,this.map=J.map,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.alphaMap=J.alphaMap,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.flatShading=J.flatShading,this.fog=J.fog,this}}class SW extends gJ{constructor(J){super();this.isLineDashedMaterial=!0,this.type="LineDashedMaterial",this.scale=1,this.dashSize=3,this.gapSize=1,this.setValues(J)}copy(J){return super.copy(J),this.scale=J.scale,this.dashSize=J.dashSize,this.gapSize=J.gapSize,this}}function B8(J,Q){if(!J||J.constructor===Q)return J;if(typeof Q.BYTES_PER_ELEMENT==="number")return new Q(J);return Array.prototype.slice.call(J)}function $X(J){function Q(W,K){return J[W]-J[K]}let $=J.length,Z=Array($);for(let W=0;W!==$;++W)Z[W]=W;return Z.sort(Q),Z}function $Z(J,Q,$){let Z=J.length,W=new J.constructor(Z);for(let K=0,Y=0;Y!==Z;++K){let H=$[K]*Q;for(let X=0;X!==Q;++X)W[Y++]=J[H+X]}return W}function jW(J,Q,$,Z){let W=1,K=J[0];while(K!==void 0&&K[Z]===void 0)K=J[W++];if(K===void 0)return;let Y=K[Z];if(Y===void 0)return;if(Array.isArray(Y))do{if(Y=K[Z],Y!==void 0)Q.push(K.time),$.push(...Y);K=J[W++]}while(K!==void 0);else if(Y.toArray!==void 0)do{if(Y=K[Z],Y!==void 0)Q.push(K.time),Y.toArray($,$.length);K=J[W++]}while(K!==void 0);else do{if(Y=K[Z],Y!==void 0)Q.push(K.time),$.push(Y);K=J[W++]}while(K!==void 0)}function I5(J,Q,$,Z,W=30){let K=J.clone();K.name=Q;let Y=[];for(let X=0;X<K.tracks.length;++X){let U=K.tracks[X],E=U.getValueSize(),N=[],G=[];for(let q=0;q<U.times.length;++q){let O=U.times[q]*W;if(O<$||O>=Z)continue;N.push(U.times[q]);for(let R=0;R<E;++R)G.push(U.values[q*E+R])}if(N.length===0)continue;U.times=B8(N,U.times.constructor),U.values=B8(G,U.values.constructor),Y.push(U)}K.tracks=Y;let H=1/0;for(let X=0;X<K.tracks.length;++X)if(H>K.tracks[X].times[0])H=K.tracks[X].times[0];for(let X=0;X<K.tracks.length;++X)K.tracks[X].shift(-1*H);return K.resetDuration(),K}function _5(J,Q=0,$=J,Z=30){if(Z<=0)Z=30;let W=$.tracks.length,K=Q/Z;for(let Y=0;Y<W;++Y){let H=$.tracks[Y],X=H.ValueTypeName;if(X==="bool"||X==="string")continue;let U=J.tracks.find(function(D){return D.name===H.name&&D.ValueTypeName===X});if(U===void 0)continue;let E=0,N=H.getValueSize();if(H.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline)E=N/3;let G=0,q=U.getValueSize();if(U.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline)G=q/3;let O=H.times.length-1,R;if(K<=H.times[0]){let D=E,k=N-E;R=H.values.slice(D,k)}else if(K>=H.times[O]){let D=O*N+E,k=D+N-E;R=H.values.slice(D,k)}else{let D=H.createInterpolant(),k=E,M=N-E;D.evaluate(K),R=D.resultBuffer.slice(k,M)}if(X==="quaternion")new xJ().fromArray(R).normalize().conjugate().toArray(R);let F=U.times.length;for(let D=0;D<F;++D){let k=D*q+G;if(X==="quaternion")xJ.multiplyQuaternionsFlat(U.values,k,R,0,U.values,k);else{let M=q-G*2;for(let V=0;V<M;++V)U.values[k+V]-=R[V]}}}return J.blendMode=2501,J}class ZX{static convertArray(J,Q){return B8(J,Q)}static isTypedArray(J){return AH(J)}static getKeyframeOrder(J){return $X(J)}static sortedArray(J,Q,$){return $Z(J,Q,$)}static flattenJSON(J,Q,$,Z){jW(J,Q,$,Z)}static subclip(J,Q,$,Z,W=30){return I5(J,Q,$,Z,W)}static makeClipAdditive(J,Q=0,$=J,Z=30){return _5(J,Q,$,Z)}}class x8{constructor(J,Q,$,Z){this.parameterPositions=J,this._cachedIndex=0,this.resultBuffer=Z!==void 0?Z:new Q.constructor($),this.sampleValues=Q,this.valueSize=$,this.settings=null,this.DefaultSettings_={}}evaluate(J){let Q=this.parameterPositions,$=this._cachedIndex,Z=Q[$],W=Q[$-1];J:{Q:{let K;$:{Z:if(!(J<Z)){for(let Y=$+2;;){if(Z===void 0){if(J<W)break Z;return $=Q.length,this._cachedIndex=$,this.copySampleValue_($-1)}if($===Y)break;if(W=Z,Z=Q[++$],J<Z)break Q}K=Q.length;break $}if(!(J>=W)){let Y=Q[1];if(J<Y)$=2,W=Y;for(let H=$-2;;){if(W===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if($===H)break;if(Z=W,W=Q[--$-1],J>=W)break Q}K=$,$=0;break $}break J}while($<K){let Y=$+K>>>1;if(J<Q[Y])K=Y;else $=Y+1}if(Z=Q[$],W=Q[$-1],W===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(Z===void 0)return $=Q.length,this._cachedIndex=$,this.copySampleValue_($-1)}this._cachedIndex=$,this.intervalChanged_($,W,Z)}return this.interpolate_($,W,J,Z)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(J){let Q=this.resultBuffer,$=this.sampleValues,Z=this.valueSize,W=J*Z;for(let K=0;K!==Z;++K)Q[K]=$[W+K];return Q}interpolate_(){throw Error("call to abstract method")}intervalChanged_(){}}class yW extends x8{constructor(J,Q,$,Z){super(J,Q,$,Z);this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:2400,endingEnd:2400}}intervalChanged_(J,Q,$){let Z=this.parameterPositions,W=J-2,K=J+1,Y=Z[W],H=Z[K];if(Y===void 0)switch(this.getSettings_().endingStart){case 2401:W=J,Y=2*Q-$;break;case 2402:W=Z.length-2,Y=Q+Z[W]-Z[W+1];break;default:W=J,Y=$}if(H===void 0)switch(this.getSettings_().endingEnd){case 2401:K=J,H=2*$-Q;break;case 2402:K=1,H=$+Z[1]-Z[0];break;default:K=J-1,H=Q}let X=($-Q)*0.5,U=this.valueSize;this._weightPrev=X/(Q-Y),this._weightNext=X/(H-$),this._offsetPrev=W*U,this._offsetNext=K*U}interpolate_(J,Q,$,Z){let W=this.resultBuffer,K=this.sampleValues,Y=this.valueSize,H=J*Y,X=H-Y,U=this._offsetPrev,E=this._offsetNext,N=this._weightPrev,G=this._weightNext,q=($-Q)/(Z-Q),O=q*q,R=O*q,F=-N*R+2*N*O-N*q,D=(1+N)*R+(-1.5-2*N)*O+(-0.5+N)*q+1,k=(-1-G)*R+(1.5+G)*O+0.5*q,M=G*R-G*O;for(let V=0;V!==Y;++V)W[V]=F*K[U+V]+D*K[X+V]+k*K[H+V]+M*K[E+V];return W}}class $$ extends x8{constructor(J,Q,$,Z){super(J,Q,$,Z)}interpolate_(J,Q,$,Z){let W=this.resultBuffer,K=this.sampleValues,Y=this.valueSize,H=J*Y,X=H-Y,U=($-Q)/(Z-Q),E=1-U;for(let N=0;N!==Y;++N)W[N]=K[X+N]*E+K[H+N]*U;return W}}class vW extends x8{constructor(J,Q,$,Z){super(J,Q,$,Z)}interpolate_(J){return this.copySampleValue_(J-1)}}class fW extends x8{interpolate_(J,Q,$,Z){let W=this.resultBuffer,K=this.sampleValues,Y=this.valueSize,H=J*Y,X=H-Y,U=this.settings||this.DefaultSettings_,E=U.inTangents,N=U.outTangents;if(!E||!N){let O=($-Q)/(Z-Q),R=1-O;for(let F=0;F!==Y;++F)W[F]=K[X+F]*R+K[H+F]*O;return W}let G=Y*2,q=J-1;for(let O=0;O!==Y;++O){let R=K[X+O],F=K[H+O],D=q*G+O*2,k=N[D],M=N[D+1],V=J*G+O*2,_=E[V],A=E[V+1],C=($-Q)/(Z-Q),L,I,b,T,p;for(let u=0;u<8;u++){L=C*C,I=L*C,b=1-C,T=b*b,p=T*b;let l=p*Q+3*T*C*k+3*b*L*_+I*Z-$;if(Math.abs(l)<0.0000000001)break;let h=3*T*(k-Q)+6*b*C*(_-k)+3*L*(Z-_);if(Math.abs(h)<0.0000000001)break;C=C-l/h,C=Math.max(0,Math.min(1,C))}W[O]=p*R+3*T*C*M+3*b*L*A+I*F}return W}}class Q9{constructor(J,Q,$,Z){if(J===void 0)throw Error("THREE.KeyframeTrack: track name is undefined");if(Q===void 0||Q.length===0)throw Error("THREE.KeyframeTrack: no keyframes in track named "+J);this.name=J,this.times=B8(Q,this.TimeBufferType),this.values=B8($,this.ValueBufferType),this.setInterpolation(Z||this.DefaultInterpolation)}static toJSON(J){let Q=J.constructor,$;if(Q.toJSON!==this.toJSON)$=Q.toJSON(J);else{$={name:J.name,times:B8(J.times,Array),values:B8(J.values,Array)};let Z=J.getInterpolation();if(Z!==J.DefaultInterpolation)$.interpolation=Z}return $.type=J.ValueTypeName,$}InterpolantFactoryMethodDiscrete(J){return new vW(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodLinear(J){return new $$(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodSmooth(J){return new yW(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodBezier(J){let Q=new fW(this.times,this.values,this.getValueSize(),J);if(this.settings)Q.settings=this.settings;return Q}setInterpolation(J){let Q;switch(J){case 2300:Q=this.InterpolantFactoryMethodDiscrete;break;case 2301:Q=this.InterpolantFactoryMethodLinear;break;case 2302:Q=this.InterpolantFactoryMethodSmooth;break;case 2303:Q=this.InterpolantFactoryMethodBezier;break}if(Q===void 0){let $="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(J!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error($);return X0("KeyframeTrack:",$),this}return this.createInterpolant=Q,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return 2300;case this.InterpolantFactoryMethodLinear:return 2301;case this.InterpolantFactoryMethodSmooth:return 2302;case this.InterpolantFactoryMethodBezier:return 2303}}getValueSize(){return this.values.length/this.times.length}shift(J){if(J!==0){let Q=this.times;for(let $=0,Z=Q.length;$!==Z;++$)Q[$]+=J}return this}scale(J){if(J!==1){let Q=this.times;for(let $=0,Z=Q.length;$!==Z;++$)Q[$]*=J}return this}trim(J,Q){let $=this.times,Z=$.length,W=0,K=Z-1;while(W!==Z&&$[W]<J)++W;while(K!==-1&&$[K]>Q)--K;if(++K,W!==0||K!==Z){if(W>=K)K=Math.max(K,1),W=K-1;let Y=this.getValueSize();this.times=$.slice(W,K),this.values=this.values.slice(W*Y,K*Y)}return this}validate(){let J=!0,Q=this.getValueSize();if(Q-Math.floor(Q)!==0)T0("KeyframeTrack: Invalid value size in track.",this),J=!1;let $=this.times,Z=this.values,W=$.length;if(W===0)T0("KeyframeTrack: Track is empty.",this),J=!1;let K=null;for(let Y=0;Y!==W;Y++){let H=$[Y];if(typeof H==="number"&&isNaN(H)){T0("KeyframeTrack: Time is not a valid number.",this,Y,H),J=!1;break}if(K!==null&&K>H){T0("KeyframeTrack: Out of order keys.",this,Y,H,K),J=!1;break}K=H}if(Z!==void 0){if(AH(Z))for(let Y=0,H=Z.length;Y!==H;++Y){let X=Z[Y];if(isNaN(X)){T0("KeyframeTrack: Value is not a valid number.",this,Y,X),J=!1;break}}}return J}optimize(){let J=this.times.slice(),Q=this.values.slice(),$=this.getValueSize(),Z=this.getInterpolation()===2302,W=J.length-1,K=1;for(let Y=1;Y<W;++Y){let H=!1,X=J[Y],U=J[Y+1];if(X!==U&&(Y!==1||X!==J[0]))if(!Z){let E=Y*$,N=E-$,G=E+$;for(let q=0;q!==$;++q){let O=Q[E+q];if(O!==Q[N+q]||O!==Q[G+q]){H=!0;break}}}else H=!0;if(H){if(Y!==K){J[K]=J[Y];let E=Y*$,N=K*$;for(let G=0;G!==$;++G)Q[N+G]=Q[E+G]}++K}}if(W>0){J[K]=J[W];for(let Y=W*$,H=K*$,X=0;X!==$;++X)Q[H+X]=Q[Y+X];++K}if(K!==J.length)this.times=J.slice(0,K),this.values=Q.slice(0,K*$);else this.times=J,this.values=Q;return this}clone(){let J=this.times.slice(),Q=this.values.slice(),Z=new this.constructor(this.name,J,Q);return Z.createInterpolant=this.createInterpolant,Z}}Q9.prototype.ValueTypeName="";Q9.prototype.TimeBufferType=Float32Array;Q9.prototype.ValueBufferType=Float32Array;Q9.prototype.DefaultInterpolation=2301;class K8 extends Q9{constructor(J,Q,$){super(J,Q,$)}}K8.prototype.ValueTypeName="bool";K8.prototype.ValueBufferType=Array;K8.prototype.DefaultInterpolation=2300;K8.prototype.InterpolantFactoryMethodLinear=void 0;K8.prototype.InterpolantFactoryMethodSmooth=void 0;class Z$ extends Q9{constructor(J,Q,$,Z){super(J,Q,$,Z)}}Z$.prototype.ValueTypeName="color";class N7 extends Q9{constructor(J,Q,$,Z){super(J,Q,$,Z)}}N7.prototype.ValueTypeName="number";class bW extends x8{constructor(J,Q,$,Z){super(J,Q,$,Z)}interpolate_(J,Q,$,Z){let W=this.resultBuffer,K=this.sampleValues,Y=this.valueSize,H=($-Q)/(Z-Q),X=J*Y;for(let U=X+Y;X!==U;X+=4)xJ.slerpFlat(W,0,K,X-Y,K,X,H);return W}}class z7 extends Q9{constructor(J,Q,$,Z){super(J,Q,$,Z)}InterpolantFactoryMethodLinear(J){return new bW(this.times,this.values,this.getValueSize(),J)}}z7.prototype.ValueTypeName="quaternion";z7.prototype.InterpolantFactoryMethodSmooth=void 0;class Y8 extends Q9{constructor(J,Q,$){super(J,Q,$)}}Y8.prototype.ValueTypeName="string";Y8.prototype.ValueBufferType=Array;Y8.prototype.DefaultInterpolation=2300;Y8.prototype.InterpolantFactoryMethodLinear=void 0;Y8.prototype.InterpolantFactoryMethodSmooth=void 0;class q7 extends Q9{constructor(J,Q,$,Z){super(J,Q,$,Z)}}q7.prototype.ValueTypeName="vector";class D7{constructor(J="",Q=-1,$=[],Z=2500){if(this.name=J,this.tracks=$,this.duration=Q,this.blendMode=Z,this.uuid=eJ(),this.userData={},this.duration<0)this.resetDuration()}static parse(J){let Q=[],$=J.tracks,Z=1/(J.fps||1);for(let K=0,Y=$.length;K!==Y;++K)Q.push(A5($[K]).scale(Z));let W=new this(J.name,J.duration,Q,J.blendMode);return W.uuid=J.uuid,W.userData=JSON.parse(J.userData||"{}"),W}static toJSON(J){let Q=[],$=J.tracks,Z={name:J.name,duration:J.duration,tracks:Q,uuid:J.uuid,blendMode:J.blendMode,userData:JSON.stringify(J.userData)};for(let W=0,K=$.length;W!==K;++W)Q.push(Q9.toJSON($[W]));return Z}static CreateFromMorphTargetSequence(J,Q,$,Z){let W=Q.length,K=[];for(let Y=0;Y<W;Y++){let H=[],X=[];H.push((Y+W-1)%W,Y,(Y+1)%W),X.push(0,1,0);let U=$X(H);if(H=$Z(H,1,U),X=$Z(X,1,U),!Z&&H[0]===0)H.push(W),X.push(X[0]);K.push(new N7(".morphTargetInfluences["+Q[Y].name+"]",H,X).scale(1/$))}return new this(J,-1,K)}static findByName(J,Q){let $=J;if(!Array.isArray(J)){let Z=J;$=Z.geometry&&Z.geometry.animations||Z.animations}for(let Z=0;Z<$.length;Z++)if($[Z].name===Q)return $[Z];return null}static CreateClipsFromMorphTargetSequences(J,Q,$){let Z={},W=/^([\w-]*?)([\d]+)$/;for(let Y=0,H=J.length;Y<H;Y++){let X=J[Y],U=X.name.match(W);if(U&&U.length>1){let E=U[1],N=Z[E];if(!N)Z[E]=N=[];N.push(X)}}let K=[];for(let Y in Z)K.push(this.CreateFromMorphTargetSequence(Y,Z[Y],Q,$));return K}static parseAnimation(J,Q){if(X0("AnimationClip: parseAnimation() is deprecated and will be removed with r185"),!J)return T0("AnimationClip: No animation in JSONLoader data."),null;let $=function(E,N,G,q,O){if(G.length!==0){let R=[],F=[];if(jW(G,R,F,q),R.length!==0)O.push(new E(N,R,F))}},Z=[],W=J.name||"default",K=J.fps||30,Y=J.blendMode,H=J.length||-1,X=J.hierarchy||[];for(let E=0;E<X.length;E++){let N=X[E].keys;if(!N||N.length===0)continue;if(N[0].morphTargets){let G={},q;for(q=0;q<N.length;q++)if(N[q].morphTargets)for(let O=0;O<N[q].morphTargets.length;O++)G[N[q].morphTargets[O]]=-1;for(let O in G){let R=[],F=[];for(let D=0;D!==N[q].morphTargets.length;++D){let k=N[q];R.push(k.time),F.push(k.morphTarget===O?1:0)}Z.push(new N7(".morphTargetInfluence["+O+"]",R,F))}H=G.length*K}else{let G=".bones["+Q[E].name+"]";$(q7,G+".position",N,"pos",Z),$(z7,G+".quaternion",N,"rot",Z),$(q7,G+".scale",N,"scl",Z)}}if(Z.length===0)return null;return new this(W,H,Z,Y)}resetDuration(){let J=this.tracks,Q=0;for(let $=0,Z=J.length;$!==Z;++$){let W=this.tracks[$];Q=Math.max(Q,W.times[W.times.length-1])}return this.duration=Q,this}trim(){for(let J=0;J<this.tracks.length;J++)this.tracks[J].trim(0,this.duration);return this}validate(){let J=!0;for(let Q=0;Q<this.tracks.length;Q++)J=J&&this.tracks[Q].validate();return J}optimize(){for(let J=0;J<this.tracks.length;J++)this.tracks[J].optimize();return this}clone(){let J=[];for(let $=0;$<this.tracks.length;$++)J.push(this.tracks[$].clone());let Q=new this.constructor(this.name,this.duration,J,this.blendMode);return Q.userData=JSON.parse(JSON.stringify(this.userData)),Q}toJSON(){return this.constructor.toJSON(this)}}function w5(J){switch(J.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return N7;case"vector":case"vector2":case"vector3":case"vector4":return q7;case"color":return Z$;case"quaternion":return z7;case"bool":case"boolean":return K8;case"string":return Y8}throw Error("THREE.KeyframeTrack: Unsupported typeName: "+J)}function A5(J){if(J.type===void 0)throw Error("THREE.KeyframeTrack: track type undefined, can not parse");let Q=w5(J.type);if(J.times===void 0){let $=[],Z=[];jW(J.keys,$,Z,"value"),J.times=$,J.values=Z}if(Q.parse!==void 0)return Q.parse(J);else return new Q(J.name,J.times,J.values,J.interpolation)}var V9={enabled:!1,files:{},add:function(J,Q){if(this.enabled===!1)return;if(UY(J))return;this.files[J]=Q},get:function(J){if(this.enabled===!1)return;if(UY(J))return;return this.files[J]},remove:function(J){delete this.files[J]},clear:function(){this.files={}}};function UY(J){try{let Q=J.slice(J.indexOf(":")+1);return new URL(Q).protocol==="blob:"}catch(Q){return!1}}class W${constructor(J,Q,$){let Z=this,W=!1,K=0,Y=0,H=void 0,X=[];this.onStart=void 0,this.onLoad=J,this.onProgress=Q,this.onError=$,this._abortController=null,this.itemStart=function(U){if(Y++,W===!1){if(Z.onStart!==void 0)Z.onStart(U,K,Y)}W=!0},this.itemEnd=function(U){if(K++,Z.onProgress!==void 0)Z.onProgress(U,K,Y);if(K===Y){if(W=!1,Z.onLoad!==void 0)Z.onLoad()}},this.itemError=function(U){if(Z.onError!==void 0)Z.onError(U)},this.resolveURL=function(U){if(H)return H(U);return U},this.setURLModifier=function(U){return H=U,this},this.addHandler=function(U,E){return X.push(U,E),this},this.removeHandler=function(U){let E=X.indexOf(U);if(E!==-1)X.splice(E,2);return this},this.getHandler=function(U){for(let E=0,N=X.length;E<N;E+=2){let G=X[E],q=X[E+1];if(G.global)G.lastIndex=0;if(G.test(U))return q}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){if(!this._abortController)this._abortController=new AbortController;return this._abortController}}var WX=new W$;class lJ{constructor(J){if(this.manager=J!==void 0?J:WX,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(J,Q){let $=this;return new Promise(function(Z,W){$.load(J,Z,Q,W)})}parse(){}setCrossOrigin(J){return this.crossOrigin=J,this}setWithCredentials(J){return this.withCredentials=J,this}setPath(J){return this.path=J,this}setResourcePath(J){return this.resourcePath=J,this}setRequestHeader(J){return this.requestHeader=J,this}abort(){return this}}lJ.DEFAULT_MATERIAL_NAME="__DEFAULT";var y9={};class KX extends Error{constructor(J,Q){super(J);this.response=Q}}class B9 extends lJ{constructor(J){super(J);this.mimeType="",this.responseType="",this._abortController=new AbortController}load(J,Q,$,Z){if(J===void 0)J="";if(this.path!==void 0)J=this.path+J;J=this.manager.resolveURL(J);let W=V9.get(`file:${J}`);if(W!==void 0){this.manager.itemStart(J),setTimeout(()=>{if(Q)Q(W);this.manager.itemEnd(J)},0);return}if(y9[J]!==void 0){y9[J].push({onLoad:Q,onProgress:$,onError:Z});return}y9[J]=[],y9[J].push({onLoad:Q,onProgress:$,onError:Z});let K=new Request(J,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any==="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),Y=this.mimeType,H=this.responseType;fetch(K).then((X)=>{if(X.status===200||X.status===0){if(X.status===0)X0("FileLoader: HTTP Status 0 received.");if(typeof ReadableStream>"u"||X.body===void 0||X.body.getReader===void 0)return X;let U=y9[J],E=X.body.getReader(),N=X.headers.get("X-File-Size")||X.headers.get("Content-Length"),G=N?parseInt(N):0,q=G!==0,O=0,R=new ReadableStream({start(F){D();function D(){E.read().then(({done:k,value:M})=>{if(k)F.close();else{O+=M.byteLength;let V=new ProgressEvent("progress",{lengthComputable:q,loaded:O,total:G});for(let _=0,A=U.length;_<A;_++){let C=U[_];if(C.onProgress)C.onProgress(V)}F.enqueue(M),D()}},(k)=>{F.error(k)})}}});return new Response(R)}else throw new KX(`fetch for "${X.url}" responded with ${X.status}: ${X.statusText}`,X)}).then((X)=>{switch(H){case"arraybuffer":return X.arrayBuffer();case"blob":return X.blob();case"document":return X.text().then((U)=>{return new DOMParser().parseFromString(U,Y)});case"json":return X.json();default:if(Y==="")return X.text();else{let E=/charset="?([^;"\s]*)"?/i.exec(Y),N=E&&E[1]?E[1].toLowerCase():void 0,G=new TextDecoder(N);return X.arrayBuffer().then((q)=>G.decode(q))}}}).then((X)=>{V9.add(`file:${J}`,X);let U=y9[J];delete y9[J];for(let E=0,N=U.length;E<N;E++){let G=U[E];if(G.onLoad)G.onLoad(X)}}).catch((X)=>{let U=y9[J];if(U===void 0)throw this.manager.itemError(J),X;delete y9[J];for(let E=0,N=U.length;E<N;E++){let G=U[E];if(G.onError)G.onError(X)}this.manager.itemError(J)}).finally(()=>{this.manager.itemEnd(J)}),this.manager.itemStart(J)}setResponseType(J){return this.responseType=J,this}setMimeType(J){return this.mimeType=J,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}class YX extends lJ{constructor(J){super(J)}load(J,Q,$,Z){let W=this,K=new B9(this.manager);K.setPath(this.path),K.setRequestHeader(this.requestHeader),K.setWithCredentials(this.withCredentials),K.load(J,function(Y){try{Q(W.parse(JSON.parse(Y)))}catch(H){if(Z)Z(H);else T0(H);W.manager.itemError(J)}},$,Z)}parse(J){let Q=[];for(let $=0;$<J.length;$++){let Z=D7.parse(J[$]);Q.push(Z)}return Q}}class HX extends lJ{constructor(J){super(J)}load(J,Q,$,Z){let W=this,K=[],Y=new K6,H=new B9(this.manager);H.setPath(this.path),H.setResponseType("arraybuffer"),H.setRequestHeader(this.requestHeader),H.setWithCredentials(W.withCredentials);let X=0;function U(E){H.load(J[E],function(N){let G=W.parse(N,!0);if(K[E]={width:G.width,height:G.height,format:G.format,mipmaps:G.mipmaps},X+=1,X===6){if(G.mipmapCount===1)Y.minFilter=1006;if(Y.image=K,Y.format=G.format,Y.needsUpdate=!0,Q)Q(Y)}},$,Z)}if(Array.isArray(J))for(let E=0,N=J.length;E<N;++E)U(E);else H.load(J,function(E){let N=W.parse(E,!0);if(N.isCubemap){let G=N.mipmaps.length/N.mipmapCount;for(let q=0;q<G;q++){K[q]={mipmaps:[]};for(let O=0;O<N.mipmapCount;O++)K[q].mipmaps.push(N.mipmaps[q*N.mipmapCount+O]),K[q].format=N.format,K[q].width=N.width,K[q].height=N.height}Y.image=K}else Y.image.width=N.width,Y.image.height=N.height,Y.mipmaps=N.mipmaps;if(N.mipmapCount===1)Y.minFilter=1006;if(Y.format=N.format,Y.needsUpdate=!0,Q)Q(Y)},$,Z);return Y}}var Z7=new WeakMap;class F7 extends lJ{constructor(J){super(J)}load(J,Q,$,Z){if(this.path!==void 0)J=this.path+J;J=this.manager.resolveURL(J);let W=this,K=V9.get(`image:${J}`);if(K!==void 0){if(K.complete===!0)W.manager.itemStart(J),setTimeout(function(){if(Q)Q(K);W.manager.itemEnd(J)},0);else{let E=Z7.get(K);if(E===void 0)E=[],Z7.set(K,E);E.push({onLoad:Q,onError:Z})}return K}let Y=G7("img");function H(){if(U(),Q)Q(this);let E=Z7.get(this)||[];for(let N=0;N<E.length;N++){let G=E[N];if(G.onLoad)G.onLoad(this)}Z7.delete(this),W.manager.itemEnd(J)}function X(E){if(U(),Z)Z(E);V9.remove(`image:${J}`);let N=Z7.get(this)||[];for(let G=0;G<N.length;G++){let q=N[G];if(q.onError)q.onError(E)}Z7.delete(this),W.manager.itemError(J),W.manager.itemEnd(J)}function U(){Y.removeEventListener("load",H,!1),Y.removeEventListener("error",X,!1)}if(Y.addEventListener("load",H,!1),Y.addEventListener("error",X,!1),J.slice(0,5)!=="data:"){if(this.crossOrigin!==void 0)Y.crossOrigin=this.crossOrigin}return V9.add(`image:${J}`,Y),W.manager.itemStart(J),Y.src=J,Y}}class XX extends lJ{constructor(J){super(J)}load(J,Q,$,Z){let W=new V7;W.colorSpace="srgb";let K=new F7(this.manager);K.setCrossOrigin(this.crossOrigin),K.setPath(this.path);let Y=0;function H(X){K.load(J[X],function(U){if(W.images[X]=U,Y++,Y===6){if(W.needsUpdate=!0,Q)Q(W)}},void 0,Z)}for(let X=0;X<J.length;++X)H(X);return W}}class UX extends lJ{constructor(J){super(J)}load(J,Q,$,Z){let W=this,K=new W9,Y=new B9(this.manager);return Y.setResponseType("arraybuffer"),Y.setRequestHeader(this.requestHeader),Y.setPath(this.path),Y.setWithCredentials(W.withCredentials),Y.load(J,function(H){let X;try{X=W.parse(H)}catch(U){if(Z!==void 0)Z(U);else T0(U);return}if(X.image!==void 0)K.image=X.image;else if(X.data!==void 0)K.image.width=X.width,K.image.height=X.height,K.image.data=X.data;if(K.wrapS=X.wrapS!==void 0?X.wrapS:1001,K.wrapT=X.wrapT!==void 0?X.wrapT:1001,K.magFilter=X.magFilter!==void 0?X.magFilter:1006,K.minFilter=X.minFilter!==void 0?X.minFilter:1006,K.anisotropy=X.anisotropy!==void 0?X.anisotropy:1,X.colorSpace!==void 0)K.colorSpace=X.colorSpace;if(X.flipY!==void 0)K.flipY=X.flipY;if(X.format!==void 0)K.format=X.format;if(X.type!==void 0)K.type=X.type;if(X.mipmaps!==void 0)K.mipmaps=X.mipmaps,K.minFilter=1008;if(X.mipmapCount===1)K.minFilter=1006;if(X.generateMipmaps!==void 0)K.generateMipmaps=X.generateMipmaps;if(K.needsUpdate=!0,Q)Q(K,X)},$,Z),K}}class GX extends lJ{constructor(J){super(J)}load(J,Q,$,Z){let W=new kJ,K=new F7(this.manager);return K.setCrossOrigin(this.crossOrigin),K.setPath(this.path),K.load(J,function(Y){if(W.image=Y,W.needsUpdate=!0,Q!==void 0)Q(W)},$,Z),W}}class d9 extends HJ{constructor(J,Q=1){super();this.isLight=!0,this.type="Light",this.color=new V0(J),this.intensity=Q}dispose(){this.dispatchEvent({type:"dispose"})}copy(J,Q){return super.copy(J,Q),this.color.copy(J.color),this.intensity=J.intensity,this}toJSON(J){let Q=super.toJSON(J);return Q.object.color=this.color.getHex(),Q.object.intensity=this.intensity,Q}}class hW extends d9{constructor(J,Q,$){super(J,$);this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(HJ.DEFAULT_UP),this.updateMatrix(),this.groundColor=new V0(Q)}copy(J,Q){return super.copy(J,Q),this.groundColor.copy(J.groundColor),this}toJSON(J){let Q=super.toJSON(J);return Q.object.groundColor=this.groundColor.getHex(),Q}}var n$=new d0,GY=new P,EY=new P;class K${constructor(J){this.camera=J,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new r(512,512),this.mapType=1009,this.map=null,this.mapPass=null,this.matrix=new d0,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new f8,this._frameExtents=new r(1,1),this._viewportCount=1,this._viewports=[new GJ(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(J){let Q=this.camera,$=this.matrix;if(GY.setFromMatrixPosition(J.matrixWorld),Q.position.copy(GY),EY.setFromMatrixPosition(J.target.matrixWorld),Q.lookAt(EY),Q.updateMatrixWorld(),n$.multiplyMatrices(Q.projectionMatrix,Q.matrixWorldInverse),this._frustum.setFromProjectionMatrix(n$,Q.coordinateSystem,Q.reversedDepth),Q.coordinateSystem===2001||Q.reversedDepth)$.set(0.5,0,0,0.5,0,0.5,0,0.5,0,0,1,0,0,0,0,1);else $.set(0.5,0,0,0.5,0,0.5,0,0.5,0,0,0.5,0.5,0,0,0,1);$.multiply(n$)}getViewport(J){return this._viewports[J]}getFrameExtents(){return this._frameExtents}dispose(){if(this.map)this.map.dispose();if(this.mapPass)this.mapPass.dispose()}copy(J){return this.camera=J.camera.clone(),this.intensity=J.intensity,this.bias=J.bias,this.radius=J.radius,this.autoUpdate=J.autoUpdate,this.needsUpdate=J.needsUpdate,this.normalBias=J.normalBias,this.blurSamples=J.blurSamples,this.mapSize.copy(J.mapSize),this.biasNode=J.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let J={};if(this.intensity!==1)J.intensity=this.intensity;if(this.bias!==0)J.bias=this.bias;if(this.normalBias!==0)J.normalBias=this.normalBias;if(this.radius!==1)J.radius=this.radius;if(this.mapSize.x!==512||this.mapSize.y!==512)J.mapSize=this.mapSize.toArray();return J.camera=this.camera.toJSON(!1).object,delete J.camera.matrix,J}}var t6=new P,e6=new xJ,L9=new P;class E6 extends HJ{constructor(){super();this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new d0,this.projectionMatrix=new d0,this.projectionMatrixInverse=new d0,this.coordinateSystem=2000,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(J,Q){return super.copy(J,Q),this.matrixWorldInverse.copy(J.matrixWorldInverse),this.projectionMatrix.copy(J.projectionMatrix),this.projectionMatrixInverse.copy(J.projectionMatrixInverse),this.coordinateSystem=J.coordinateSystem,this}getWorldDirection(J){return super.getWorldDirection(J).negate()}updateMatrixWorld(J){if(super.updateMatrixWorld(J),this.matrixWorld.decompose(t6,e6,L9),L9.x===1&&L9.y===1&&L9.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(t6,e6,L9.set(1,1,1)).invert()}updateWorldMatrix(J,Q){if(super.updateWorldMatrix(J,Q),this.matrixWorld.decompose(t6,e6,L9),L9.x===1&&L9.y===1&&L9.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(t6,e6,L9.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}var r9=new P,NY=new r,qY=new r;class TJ extends E6{constructor(J=50,Q=1,$=0.1,Z=2000){super();this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=J,this.zoom=1,this.near=$,this.far=Z,this.focus=10,this.aspect=Q,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(J,Q){return super.copy(J,Q),this.fov=J.fov,this.zoom=J.zoom,this.near=J.near,this.far=J.far,this.focus=J.focus,this.aspect=J.aspect,this.view=J.view===null?null:Object.assign({},J.view),this.filmGauge=J.filmGauge,this.filmOffset=J.filmOffset,this}setFocalLength(J){let Q=0.5*this.getFilmHeight()/J;this.fov=I8*2*Math.atan(Q),this.updateProjectionMatrix()}getFocalLength(){let J=Math.tan(z8*0.5*this.fov);return 0.5*this.getFilmHeight()/J}getEffectiveFOV(){return I8*2*Math.atan(Math.tan(z8*0.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(J,Q,$){r9.set(-1,-1,0.5).applyMatrix4(this.projectionMatrixInverse),Q.set(r9.x,r9.y).multiplyScalar(-J/r9.z),r9.set(1,1,0.5).applyMatrix4(this.projectionMatrixInverse),$.set(r9.x,r9.y).multiplyScalar(-J/r9.z)}getViewSize(J,Q){return this.getViewBounds(J,NY,qY),Q.subVectors(qY,NY)}setViewOffset(J,Q,$,Z,W,K){if(this.aspect=J/Q,this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=Q,this.view.offsetX=$,this.view.offsetY=Z,this.view.width=W,this.view.height=K,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=this.near,Q=J*Math.tan(z8*0.5*this.fov)/this.zoom,$=2*Q,Z=this.aspect*$,W=-0.5*Z,K=this.view;if(this.view!==null&&this.view.enabled){let{fullWidth:H,fullHeight:X}=K;W+=K.offsetX*Z/H,Q-=K.offsetY*$/X,Z*=K.width/H,$*=K.height/X}let Y=this.filmOffset;if(Y!==0)W+=J*Y/this.getFilmWidth();this.projectionMatrix.makePerspective(W,W+Z,Q,Q-$,J,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let Q=super.toJSON(J);if(Q.object.fov=this.fov,Q.object.zoom=this.zoom,Q.object.near=this.near,Q.object.far=this.far,Q.object.focus=this.focus,Q.object.aspect=this.aspect,this.view!==null)Q.object.view=Object.assign({},this.view);return Q.object.filmGauge=this.filmGauge,Q.object.filmOffset=this.filmOffset,Q}}class EX extends K${constructor(){super(new TJ(50,1,0.5,500));this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(J){let Q=this.camera,$=I8*2*J.angle*this.focus,Z=this.mapSize.width/this.mapSize.height*this.aspect,W=J.distance||Q.far;if($!==Q.fov||Z!==Q.aspect||W!==Q.far)Q.fov=$,Q.aspect=Z,Q.far=W,Q.updateProjectionMatrix();super.updateMatrices(J)}copy(J){return super.copy(J),this.focus=J.focus,this}}class xW extends d9{constructor(J,Q,$=0,Z=Math.PI/3,W=0,K=2){super(J,Q);this.isSpotLight=!0,this.type="SpotLight",this.position.copy(HJ.DEFAULT_UP),this.updateMatrix(),this.target=new HJ,this.distance=$,this.angle=Z,this.penumbra=W,this.decay=K,this.map=null,this.shadow=new EX}get power(){return this.intensity*Math.PI}set power(J){this.intensity=J/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(J,Q){return super.copy(J,Q),this.distance=J.distance,this.angle=J.angle,this.penumbra=J.penumbra,this.decay=J.decay,this.target=J.target.clone(),this.map=J.map,this.shadow=J.shadow.clone(),this}toJSON(J){let Q=super.toJSON(J);if(Q.object.distance=this.distance,Q.object.angle=this.angle,Q.object.decay=this.decay,Q.object.penumbra=this.penumbra,Q.object.target=this.target.uuid,this.map&&this.map.isTexture)Q.object.map=this.map.toJSON(J).uuid;return Q.object.shadow=this.shadow.toJSON(),Q}}class NX extends K${constructor(){super(new TJ(90,1,0.5,500));this.isPointLightShadow=!0}}class gW extends d9{constructor(J,Q,$=0,Z=2){super(J,Q);this.isPointLight=!0,this.type="PointLight",this.distance=$,this.decay=Z,this.shadow=new NX}get power(){return this.intensity*4*Math.PI}set power(J){this.intensity=J/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(J,Q){return super.copy(J,Q),this.distance=J.distance,this.decay=J.decay,this.shadow=J.shadow.clone(),this}toJSON(J){let Q=super.toJSON(J);return Q.object.distance=this.distance,Q.object.decay=this.decay,Q.object.shadow=this.shadow.toJSON(),Q}}class I7 extends E6{constructor(J=-1,Q=1,$=1,Z=-1,W=0.1,K=2000){super();this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=J,this.right=Q,this.top=$,this.bottom=Z,this.near=W,this.far=K,this.updateProjectionMatrix()}copy(J,Q){return super.copy(J,Q),this.left=J.left,this.right=J.right,this.top=J.top,this.bottom=J.bottom,this.near=J.near,this.far=J.far,this.zoom=J.zoom,this.view=J.view===null?null:Object.assign({},J.view),this}setViewOffset(J,Q,$,Z,W,K){if(this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=Q,this.view.offsetX=$,this.view.offsetY=Z,this.view.width=W,this.view.height=K,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=(this.right-this.left)/(2*this.zoom),Q=(this.top-this.bottom)/(2*this.zoom),$=(this.right+this.left)/2,Z=(this.top+this.bottom)/2,W=$-J,K=$+J,Y=Z+Q,H=Z-Q;if(this.view!==null&&this.view.enabled){let X=(this.right-this.left)/this.view.fullWidth/this.zoom,U=(this.top-this.bottom)/this.view.fullHeight/this.zoom;W+=X*this.view.offsetX,K=W+X*this.view.width,Y-=U*this.view.offsetY,H=Y-U*this.view.height}this.projectionMatrix.makeOrthographic(W,K,Y,H,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let Q=super.toJSON(J);if(Q.object.zoom=this.zoom,Q.object.left=this.left,Q.object.right=this.right,Q.object.top=this.top,Q.object.bottom=this.bottom,Q.object.near=this.near,Q.object.far=this.far,this.view!==null)Q.object.view=Object.assign({},this.view);return Q}}class qX extends K${constructor(){super(new I7(-5,5,5,-5,0.5,500));this.isDirectionalLightShadow=!0}}class pW extends d9{constructor(J,Q){super(J,Q);this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(HJ.DEFAULT_UP),this.updateMatrix(),this.target=new HJ,this.shadow=new qX}dispose(){super.dispose(),this.shadow.dispose()}copy(J){return super.copy(J),this.target=J.target.clone(),this.shadow=J.shadow.clone(),this}toJSON(J){let Q=super.toJSON(J);return Q.object.shadow=this.shadow.toJSON(),Q.object.target=this.target.uuid,Q}}class mW extends d9{constructor(J,Q){super(J,Q);this.isAmbientLight=!0,this.type="AmbientLight"}}class dW extends d9{constructor(J,Q,$=10,Z=10){super(J,Q);this.isRectAreaLight=!0,this.type="RectAreaLight",this.width=$,this.height=Z}get power(){return this.intensity*this.width*this.height*Math.PI}set power(J){this.intensity=J/(this.width*this.height*Math.PI)}copy(J){return super.copy(J),this.width=J.width,this.height=J.height,this}toJSON(J){let Q=super.toJSON(J);return Q.object.width=this.width,Q.object.height=this.height,Q}}class Y${constructor(){this.isSphericalHarmonics3=!0,this.coefficients=[];for(let J=0;J<9;J++)this.coefficients.push(new P)}set(J){for(let Q=0;Q<9;Q++)this.coefficients[Q].copy(J[Q]);return this}zero(){for(let J=0;J<9;J++)this.coefficients[J].set(0,0,0);return this}getAt(J,Q){let{x:$,y:Z,z:W}=J,K=this.coefficients;return Q.copy(K[0]).multiplyScalar(0.282095),Q.addScaledVector(K[1],0.488603*Z),Q.addScaledVector(K[2],0.488603*W),Q.addScaledVector(K[3],0.488603*$),Q.addScaledVector(K[4],1.092548*($*Z)),Q.addScaledVector(K[5],1.092548*(Z*W)),Q.addScaledVector(K[6],0.315392*(3*W*W-1)),Q.addScaledVector(K[7],1.092548*($*W)),Q.addScaledVector(K[8],0.546274*($*$-Z*Z)),Q}getIrradianceAt(J,Q){let{x:$,y:Z,z:W}=J,K=this.coefficients;return Q.copy(K[0]).multiplyScalar(0.886227),Q.addScaledVector(K[1],1.023328*Z),Q.addScaledVector(K[2],1.023328*W),Q.addScaledVector(K[3],1.023328*$),Q.addScaledVector(K[4],0.858086*$*Z),Q.addScaledVector(K[5],0.858086*Z*W),Q.addScaledVector(K[6],0.743125*W*W-0.247708),Q.addScaledVector(K[7],0.858086*$*W),Q.addScaledVector(K[8],0.429043*($*$-Z*Z)),Q}add(J){for(let Q=0;Q<9;Q++)this.coefficients[Q].add(J.coefficients[Q]);return this}addScaledSH(J,Q){for(let $=0;$<9;$++)this.coefficients[$].addScaledVector(J.coefficients[$],Q);return this}scale(J){for(let Q=0;Q<9;Q++)this.coefficients[Q].multiplyScalar(J);return this}lerp(J,Q){for(let $=0;$<9;$++)this.coefficients[$].lerp(J.coefficients[$],Q);return this}equals(J){for(let Q=0;Q<9;Q++)if(!this.coefficients[Q].equals(J.coefficients[Q]))return!1;return!0}copy(J){return this.set(J.coefficients)}clone(){return new this.constructor().copy(this)}fromArray(J,Q=0){let $=this.coefficients;for(let Z=0;Z<9;Z++)$[Z].fromArray(J,Q+Z*3);return this}toArray(J=[],Q=0){let $=this.coefficients;for(let Z=0;Z<9;Z++)$[Z].toArray(J,Q+Z*3);return J}static getBasisAt(J,Q){let{x:$,y:Z,z:W}=J;Q[0]=0.282095,Q[1]=0.488603*Z,Q[2]=0.488603*W,Q[3]=0.488603*$,Q[4]=1.092548*$*Z,Q[5]=1.092548*Z*W,Q[6]=0.315392*(3*W*W-1),Q[7]=1.092548*$*W,Q[8]=0.546274*($*$-Z*Z)}}class lW extends d9{constructor(J=new Y$,Q=1){super(void 0,Q);this.isLightProbe=!0,this.sh=J}copy(J){return super.copy(J),this.sh.copy(J.sh),this}toJSON(J){let Q=super.toJSON(J);return Q.object.sh=this.sh.toArray(),Q}}class H$ extends lJ{constructor(J){super(J);this.textures={}}load(J,Q,$,Z){let W=this,K=new B9(W.manager);K.setPath(W.path),K.setRequestHeader(W.requestHeader),K.setWithCredentials(W.withCredentials),K.load(J,function(Y){try{Q(W.parse(JSON.parse(Y)))}catch(H){if(Z)Z(H);else T0(H);W.manager.itemError(J)}},$,Z)}parse(J){let Q=this.textures;function $(W){if(Q[W]===void 0)X0("MaterialLoader: Undefined texture",W);return Q[W]}let Z=this.createMaterialFromType(J.type);if(J.uuid!==void 0)Z.uuid=J.uuid;if(J.name!==void 0)Z.name=J.name;if(J.color!==void 0&&Z.color!==void 0)Z.color.setHex(J.color);if(J.roughness!==void 0)Z.roughness=J.roughness;if(J.metalness!==void 0)Z.metalness=J.metalness;if(J.sheen!==void 0)Z.sheen=J.sheen;if(J.sheenColor!==void 0)Z.sheenColor=new V0().setHex(J.sheenColor);if(J.sheenRoughness!==void 0)Z.sheenRoughness=J.sheenRoughness;if(J.emissive!==void 0&&Z.emissive!==void 0)Z.emissive.setHex(J.emissive);if(J.specular!==void 0&&Z.specular!==void 0)Z.specular.setHex(J.specular);if(J.specularIntensity!==void 0)Z.specularIntensity=J.specularIntensity;if(J.specularColor!==void 0&&Z.specularColor!==void 0)Z.specularColor.setHex(J.specularColor);if(J.shininess!==void 0)Z.shininess=J.shininess;if(J.clearcoat!==void 0)Z.clearcoat=J.clearcoat;if(J.clearcoatRoughness!==void 0)Z.clearcoatRoughness=J.clearcoatRoughness;if(J.dispersion!==void 0)Z.dispersion=J.dispersion;if(J.iridescence!==void 0)Z.iridescence=J.iridescence;if(J.iridescenceIOR!==void 0)Z.iridescenceIOR=J.iridescenceIOR;if(J.iridescenceThicknessRange!==void 0)Z.iridescenceThicknessRange=J.iridescenceThicknessRange;if(J.transmission!==void 0)Z.transmission=J.transmission;if(J.thickness!==void 0)Z.thickness=J.thickness;if(J.attenuationDistance!==void 0)Z.attenuationDistance=J.attenuationDistance;if(J.attenuationColor!==void 0&&Z.attenuationColor!==void 0)Z.attenuationColor.setHex(J.attenuationColor);if(J.anisotropy!==void 0)Z.anisotropy=J.anisotropy;if(J.anisotropyRotation!==void 0)Z.anisotropyRotation=J.anisotropyRotation;if(J.fog!==void 0)Z.fog=J.fog;if(J.flatShading!==void 0)Z.flatShading=J.flatShading;if(J.blending!==void 0)Z.blending=J.blending;if(J.combine!==void 0)Z.combine=J.combine;if(J.side!==void 0)Z.side=J.side;if(J.shadowSide!==void 0)Z.shadowSide=J.shadowSide;if(J.opacity!==void 0)Z.opacity=J.opacity;if(J.transparent!==void 0)Z.transparent=J.transparent;if(J.alphaTest!==void 0)Z.alphaTest=J.alphaTest;if(J.alphaHash!==void 0)Z.alphaHash=J.alphaHash;if(J.depthFunc!==void 0)Z.depthFunc=J.depthFunc;if(J.depthTest!==void 0)Z.depthTest=J.depthTest;if(J.depthWrite!==void 0)Z.depthWrite=J.depthWrite;if(J.colorWrite!==void 0)Z.colorWrite=J.colorWrite;if(J.blendSrc!==void 0)Z.blendSrc=J.blendSrc;if(J.blendDst!==void 0)Z.blendDst=J.blendDst;if(J.blendEquation!==void 0)Z.blendEquation=J.blendEquation;if(J.blendSrcAlpha!==void 0)Z.blendSrcAlpha=J.blendSrcAlpha;if(J.blendDstAlpha!==void 0)Z.blendDstAlpha=J.blendDstAlpha;if(J.blendEquationAlpha!==void 0)Z.blendEquationAlpha=J.blendEquationAlpha;if(J.blendColor!==void 0&&Z.blendColor!==void 0)Z.blendColor.setHex(J.blendColor);if(J.blendAlpha!==void 0)Z.blendAlpha=J.blendAlpha;if(J.stencilWriteMask!==void 0)Z.stencilWriteMask=J.stencilWriteMask;if(J.stencilFunc!==void 0)Z.stencilFunc=J.stencilFunc;if(J.stencilRef!==void 0)Z.stencilRef=J.stencilRef;if(J.stencilFuncMask!==void 0)Z.stencilFuncMask=J.stencilFuncMask;if(J.stencilFail!==void 0)Z.stencilFail=J.stencilFail;if(J.stencilZFail!==void 0)Z.stencilZFail=J.stencilZFail;if(J.stencilZPass!==void 0)Z.stencilZPass=J.stencilZPass;if(J.stencilWrite!==void 0)Z.stencilWrite=J.stencilWrite;if(J.wireframe!==void 0)Z.wireframe=J.wireframe;if(J.wireframeLinewidth!==void 0)Z.wireframeLinewidth=J.wireframeLinewidth;if(J.wireframeLinecap!==void 0)Z.wireframeLinecap=J.wireframeLinecap;if(J.wireframeLinejoin!==void 0)Z.wireframeLinejoin=J.wireframeLinejoin;if(J.rotation!==void 0)Z.rotation=J.rotation;if(J.linewidth!==void 0)Z.linewidth=J.linewidth;if(J.dashSize!==void 0)Z.dashSize=J.dashSize;if(J.gapSize!==void 0)Z.gapSize=J.gapSize;if(J.scale!==void 0)Z.scale=J.scale;if(J.polygonOffset!==void 0)Z.polygonOffset=J.polygonOffset;if(J.polygonOffsetFactor!==void 0)Z.polygonOffsetFactor=J.polygonOffsetFactor;if(J.polygonOffsetUnits!==void 0)Z.polygonOffsetUnits=J.polygonOffsetUnits;if(J.dithering!==void 0)Z.dithering=J.dithering;if(J.alphaToCoverage!==void 0)Z.alphaToCoverage=J.alphaToCoverage;if(J.premultipliedAlpha!==void 0)Z.premultipliedAlpha=J.premultipliedAlpha;if(J.forceSinglePass!==void 0)Z.forceSinglePass=J.forceSinglePass;if(J.allowOverride!==void 0)Z.allowOverride=J.allowOverride;if(J.visible!==void 0)Z.visible=J.visible;if(J.toneMapped!==void 0)Z.toneMapped=J.toneMapped;if(J.userData!==void 0)Z.userData=J.userData;if(J.vertexColors!==void 0)if(typeof J.vertexColors==="number")Z.vertexColors=J.vertexColors>0;else Z.vertexColors=J.vertexColors;if(J.uniforms!==void 0)for(let W in J.uniforms){let K=J.uniforms[W];switch(Z.uniforms[W]={},K.type){case"t":Z.uniforms[W].value=$(K.value);break;case"c":Z.uniforms[W].value=new V0().setHex(K.value);break;case"v2":Z.uniforms[W].value=new r().fromArray(K.value);break;case"v3":Z.uniforms[W].value=new P().fromArray(K.value);break;case"v4":Z.uniforms[W].value=new GJ().fromArray(K.value);break;case"m3":Z.uniforms[W].value=new u0().fromArray(K.value);break;case"m4":Z.uniforms[W].value=new d0().fromArray(K.value);break;default:Z.uniforms[W].value=K.value}}if(J.defines!==void 0)Z.defines=J.defines;if(J.vertexShader!==void 0)Z.vertexShader=J.vertexShader;if(J.fragmentShader!==void 0)Z.fragmentShader=J.fragmentShader;if(J.glslVersion!==void 0)Z.glslVersion=J.glslVersion;if(J.extensions!==void 0)for(let W in J.extensions)Z.extensions[W]=J.extensions[W];if(J.lights!==void 0)Z.lights=J.lights;if(J.clipping!==void 0)Z.clipping=J.clipping;if(J.size!==void 0)Z.size=J.size;if(J.sizeAttenuation!==void 0)Z.sizeAttenuation=J.sizeAttenuation;if(J.map!==void 0)Z.map=$(J.map);if(J.matcap!==void 0)Z.matcap=$(J.matcap);if(J.alphaMap!==void 0)Z.alphaMap=$(J.alphaMap);if(J.bumpMap!==void 0)Z.bumpMap=$(J.bumpMap);if(J.bumpScale!==void 0)Z.bumpScale=J.bumpScale;if(J.normalMap!==void 0)Z.normalMap=$(J.normalMap);if(J.normalMapType!==void 0)Z.normalMapType=J.normalMapType;if(J.normalScale!==void 0){let W=J.normalScale;if(Array.isArray(W)===!1)W=[W,W];Z.normalScale=new r().fromArray(W)}if(J.displacementMap!==void 0)Z.displacementMap=$(J.displacementMap);if(J.displacementScale!==void 0)Z.displacementScale=J.displacementScale;if(J.displacementBias!==void 0)Z.displacementBias=J.displacementBias;if(J.roughnessMap!==void 0)Z.roughnessMap=$(J.roughnessMap);if(J.metalnessMap!==void 0)Z.metalnessMap=$(J.metalnessMap);if(J.emissiveMap!==void 0)Z.emissiveMap=$(J.emissiveMap);if(J.emissiveIntensity!==void 0)Z.emissiveIntensity=J.emissiveIntensity;if(J.specularMap!==void 0)Z.specularMap=$(J.specularMap);if(J.specularIntensityMap!==void 0)Z.specularIntensityMap=$(J.specularIntensityMap);if(J.specularColorMap!==void 0)Z.specularColorMap=$(J.specularColorMap);if(J.envMap!==void 0)Z.envMap=$(J.envMap);if(J.envMapRotation!==void 0)Z.envMapRotation.fromArray(J.envMapRotation);if(J.envMapIntensity!==void 0)Z.envMapIntensity=J.envMapIntensity;if(J.reflectivity!==void 0)Z.reflectivity=J.reflectivity;if(J.refractionRatio!==void 0)Z.refractionRatio=J.refractionRatio;if(J.lightMap!==void 0)Z.lightMap=$(J.lightMap);if(J.lightMapIntensity!==void 0)Z.lightMapIntensity=J.lightMapIntensity;if(J.aoMap!==void 0)Z.aoMap=$(J.aoMap);if(J.aoMapIntensity!==void 0)Z.aoMapIntensity=J.aoMapIntensity;if(J.gradientMap!==void 0)Z.gradientMap=$(J.gradientMap);if(J.clearcoatMap!==void 0)Z.clearcoatMap=$(J.clearcoatMap);if(J.clearcoatRoughnessMap!==void 0)Z.clearcoatRoughnessMap=$(J.clearcoatRoughnessMap);if(J.clearcoatNormalMap!==void 0)Z.clearcoatNormalMap=$(J.clearcoatNormalMap);if(J.clearcoatNormalScale!==void 0)Z.clearcoatNormalScale=new r().fromArray(J.clearcoatNormalScale);if(J.iridescenceMap!==void 0)Z.iridescenceMap=$(J.iridescenceMap);if(J.iridescenceThicknessMap!==void 0)Z.iridescenceThicknessMap=$(J.iridescenceThicknessMap);if(J.transmissionMap!==void 0)Z.transmissionMap=$(J.transmissionMap);if(J.thicknessMap!==void 0)Z.thicknessMap=$(J.thicknessMap);if(J.anisotropyMap!==void 0)Z.anisotropyMap=$(J.anisotropyMap);if(J.sheenColorMap!==void 0)Z.sheenColorMap=$(J.sheenColorMap);if(J.sheenRoughnessMap!==void 0)Z.sheenRoughnessMap=$(J.sheenRoughnessMap);return Z}setTextures(J){return this.textures=J,this}createMaterialFromType(J){return H$.createMaterialFromType(J)}static createMaterialFromType(J){return new{ShadowMaterial:zW,SpriteMaterial:PQ,RawShaderMaterial:tQ,ShaderMaterial:J9,PointsMaterial:yQ,MeshPhysicalMaterial:_W,MeshStandardMaterial:eQ,MeshPhongMaterial:wW,MeshToonMaterial:AW,MeshNormalMaterial:CW,MeshLambertMaterial:PW,MeshDepthMaterial:J$,MeshDistanceMaterial:Q$,MeshBasicMaterial:m9,MeshMatcapMaterial:TW,LineDashedMaterial:SW,LineBasicMaterial:gJ,Material:yJ}[J]}}class EQ{static extractUrlBase(J){let Q=J.lastIndexOf("/");if(Q===-1)return"./";return J.slice(0,Q+1)}static resolveURL(J,Q){if(typeof J!=="string"||J==="")return"";if(/^https?:\/\//i.test(Q)&&/^\//.test(J))Q=Q.replace(/(^https?:\/\/[^\/]+).*/i,"$1");if(/^(https?:)?\/\//i.test(J))return J;if(/^data:.*,.*$/i.test(J))return J;if(/^blob:.*$/i.test(J))return J;return Q+J}}class uW extends n0{constructor(){super();this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(J){return super.copy(J),this.instanceCount=J.instanceCount,this}toJSON(){let J=super.toJSON();return J.instanceCount=this.instanceCount,J.isInstancedBufferGeometry=!0,J}}class cW extends lJ{constructor(J){super(J)}load(J,Q,$,Z){let W=this,K=new B9(W.manager);K.setPath(W.path),K.setRequestHeader(W.requestHeader),K.setWithCredentials(W.withCredentials),K.load(J,function(Y){try{Q(W.parse(JSON.parse(Y)))}catch(H){if(Z)Z(H);else T0(H);W.manager.itemError(J)}},$,Z)}parse(J){let Q={},$={};function Z(G,q){if(Q[q]!==void 0)return Q[q];let R=G.interleavedBuffers[q],F=W(G,R.buffer),D=X7(R.type,F),k=new W6(D,R.stride);return k.uuid=R.uuid,Q[q]=k,k}function W(G,q){if($[q]!==void 0)return $[q];let R=G.arrayBuffers[q],F=new Uint32Array(R).buffer;return $[q]=F,F}let K=J.isInstancedBufferGeometry?new uW:new n0,Y=J.data.index;if(Y!==void 0){let G=X7(Y.type,Y.array);K.setIndex(new UJ(G,1))}let H=J.data.attributes;for(let G in H){let q=H[G],O;if(q.isInterleavedBufferAttribute){let R=Z(J.data,q.data);O=new _8(R,q.itemSize,q.offset,q.normalized)}else{let R=X7(q.type,q.array);O=new(q.isInstancedBufferAttribute?w8:UJ)(R,q.itemSize,q.normalized)}if(q.name!==void 0)O.name=q.name;if(q.usage!==void 0)O.setUsage(q.usage);K.setAttribute(G,O)}let X=J.data.morphAttributes;if(X)for(let G in X){let q=X[G],O=[];for(let R=0,F=q.length;R<F;R++){let D=q[R],k;if(D.isInterleavedBufferAttribute){let M=Z(J.data,D.data);k=new _8(M,D.itemSize,D.offset,D.normalized)}else{let M=X7(D.type,D.array);k=new UJ(M,D.itemSize,D.normalized)}if(D.name!==void 0)k.name=D.name;O.push(k)}K.morphAttributes[G]=O}if(J.data.morphTargetsRelative)K.morphTargetsRelative=!0;let E=J.data.groups||J.data.drawcalls||J.data.offsets;if(E!==void 0)for(let G=0,q=E.length;G!==q;++G){let O=E[G];K.addGroup(O.start,O.count,O.materialIndex)}let N=J.data.boundingSphere;if(N!==void 0)K.boundingSphere=new SJ().fromJSON(N);if(J.name)K.name=J.name;if(J.userData)K.userData=J.userData;return K}}var s$={};class DX extends lJ{constructor(J){super(J)}load(J,Q,$,Z){let W=this,K=this.path===""?EQ.extractUrlBase(J):this.path;this.resourcePath=this.resourcePath||K;let Y=new B9(this.manager);Y.setPath(this.path),Y.setRequestHeader(this.requestHeader),Y.setWithCredentials(this.withCredentials),Y.load(J,function(H){let X=null;try{X=JSON.parse(H)}catch(E){if(Z!==void 0)Z(E);T0("ObjectLoader: Can't parse "+J+".",E.message);return}let U=X.metadata;if(U===void 0||U.type===void 0||U.type.toLowerCase()==="geometry"){if(Z!==void 0)Z(Error("THREE.ObjectLoader: Can't load "+J));T0("ObjectLoader: Can't load "+J);return}W.parse(X,Q)},$,Z)}async loadAsync(J,Q){let $=this,Z=this.path===""?EQ.extractUrlBase(J):this.path;this.resourcePath=this.resourcePath||Z;let W=new B9(this.manager);W.setPath(this.path),W.setRequestHeader(this.requestHeader),W.setWithCredentials(this.withCredentials);let K=await W.loadAsync(J,Q),Y;try{Y=JSON.parse(K)}catch(X){throw Error("ObjectLoader: Can't parse "+J+". "+X.message)}let H=Y.metadata;if(H===void 0||H.type===void 0||H.type.toLowerCase()==="geometry")throw Error("THREE.ObjectLoader: Can't load "+J);return await $.parseAsync(Y)}parse(J,Q){let $=this.parseAnimations(J.animations),Z=this.parseShapes(J.shapes),W=this.parseGeometries(J.geometries,Z),K=this.parseImages(J.images,function(){if(Q!==void 0)Q(X)}),Y=this.parseTextures(J.textures,K),H=this.parseMaterials(J.materials,Y),X=this.parseObject(J.object,W,H,Y,$),U=this.parseSkeletons(J.skeletons,X);if(this.bindSkeletons(X,U),this.bindLightTargets(X),Q!==void 0){let E=!1;for(let N in K)if(K[N].data instanceof HTMLImageElement){E=!0;break}if(E===!1)Q(X)}return X}async parseAsync(J){let Q=this.parseAnimations(J.animations),$=this.parseShapes(J.shapes),Z=this.parseGeometries(J.geometries,$),W=await this.parseImagesAsync(J.images),K=this.parseTextures(J.textures,W),Y=this.parseMaterials(J.materials,K),H=this.parseObject(J.object,Z,Y,K,Q),X=this.parseSkeletons(J.skeletons,H);return this.bindSkeletons(H,X),this.bindLightTargets(H),H}static registerGeometry(J,Q){s$[J]=Q}parseShapes(J){let Q={};if(J!==void 0)for(let $=0,Z=J.length;$<Z;$++){let W=new e9().fromJSON(J[$]);Q[W.uuid]=W}return Q}parseSkeletons(J,Q){let $={},Z={};if(Q.traverse(function(W){if(W.isBone)Z[W.uuid]=W}),J!==void 0)for(let W=0,K=J.length;W<K;W++){let Y=new SQ().fromJSON(J[W],Z);$[Y.uuid]=Y}return $}parseGeometries(J,Q){let $={};if(J!==void 0){let Z=new cW;for(let W=0,K=J.length;W<K;W++){let Y,H=J[W];switch(H.type){case"BufferGeometry":case"InstancedBufferGeometry":Y=Z.parse(H);break;default:if(H.type in HY)Y=HY[H.type].fromJSON(H,Q);else if(H.type in s$)Y=s$[H.type].fromJSON(H,Q);else X0(`ObjectLoader: Unknown geometry type "${H.type}". Use .registerGeometry() before starting the deserialization process.`)}if(Y.uuid=H.uuid,H.name!==void 0)Y.name=H.name;if(H.userData!==void 0)Y.userData=H.userData;$[H.uuid]=Y}}return $}parseMaterials(J,Q){let $={},Z={};if(J!==void 0){let W=new H$;W.setTextures(Q);for(let K=0,Y=J.length;K<Y;K++){let H=J[K];if($[H.uuid]===void 0)$[H.uuid]=W.parse(H);Z[H.uuid]=$[H.uuid]}}return Z}parseAnimations(J){let Q={};if(J!==void 0)for(let $=0;$<J.length;$++){let Z=J[$],W=D7.parse(Z);Q[W.uuid]=W}return Q}parseImages(J,Q){let $=this,Z={},W;function K(H){return $.manager.itemStart(H),W.load(H,function(){$.manager.itemEnd(H)},void 0,function(){$.manager.itemError(H),$.manager.itemEnd(H)})}function Y(H){if(typeof H==="string"){let X=H,U=/^(\/\/)|([a-z]+:(\/\/)?)/i.test(X)?X:$.resourcePath+X;return K(U)}else if(H.data)return{data:X7(H.type,H.data),width:H.width,height:H.height};else return null}if(J!==void 0&&J.length>0){let H=new W$(Q);W=new F7(H),W.setCrossOrigin(this.crossOrigin);for(let X=0,U=J.length;X<U;X++){let E=J[X],N=E.url;if(Array.isArray(N)){let G=[];for(let q=0,O=N.length;q<O;q++){let R=N[q],F=Y(R);if(F!==null)if(F instanceof HTMLImageElement)G.push(F);else G.push(new W9(F.data,F.width,F.height))}Z[E.uuid]=new b9(G)}else{let G=Y(E.url);Z[E.uuid]=new b9(G)}}}return Z}async parseImagesAsync(J){let Q=this,$={},Z;async function W(K){if(typeof K==="string"){let Y=K,H=/^(\/\/)|([a-z]+:(\/\/)?)/i.test(Y)?Y:Q.resourcePath+Y;return await Z.loadAsync(H)}else if(K.data)return{data:X7(K.type,K.data),width:K.width,height:K.height};else return null}if(J!==void 0&&J.length>0){Z=new F7(this.manager),Z.setCrossOrigin(this.crossOrigin);for(let K=0,Y=J.length;K<Y;K++){let H=J[K],X=H.url;if(Array.isArray(X)){let U=[];for(let E=0,N=X.length;E<N;E++){let G=X[E],q=await W(G);if(q!==null)if(q instanceof HTMLImageElement)U.push(q);else U.push(new W9(q.data,q.width,q.height))}$[H.uuid]=new b9(U)}else{let U=await W(H.url);$[H.uuid]=new b9(U)}}}return $}parseTextures(J,Q){function $(W,K){if(typeof W==="number")return W;return X0("ObjectLoader.parseTexture: Constant should be in numeric form.",W),K[W]}let Z={};if(J!==void 0)for(let W=0,K=J.length;W<K;W++){let Y=J[W];if(Y.image===void 0)X0('ObjectLoader: No "image" specified for',Y.uuid);if(Q[Y.image]===void 0)X0("ObjectLoader: Undefined image",Y.image);let H=Q[Y.image],X=H.data,U;if(Array.isArray(X)){if(U=new V7,X.length===6)U.needsUpdate=!0}else{if(X&&X.data)U=new W9;else U=new kJ;if(X)U.needsUpdate=!0}if(U.source=H,U.uuid=Y.uuid,Y.name!==void 0)U.name=Y.name;if(Y.mapping!==void 0)U.mapping=$(Y.mapping,C5);if(Y.channel!==void 0)U.channel=Y.channel;if(Y.offset!==void 0)U.offset.fromArray(Y.offset);if(Y.repeat!==void 0)U.repeat.fromArray(Y.repeat);if(Y.center!==void 0)U.center.fromArray(Y.center);if(Y.rotation!==void 0)U.rotation=Y.rotation;if(Y.wrap!==void 0)U.wrapS=$(Y.wrap[0],DY),U.wrapT=$(Y.wrap[1],DY);if(Y.format!==void 0)U.format=Y.format;if(Y.internalFormat!==void 0)U.internalFormat=Y.internalFormat;if(Y.type!==void 0)U.type=Y.type;if(Y.colorSpace!==void 0)U.colorSpace=Y.colorSpace;if(Y.minFilter!==void 0)U.minFilter=$(Y.minFilter,FY);if(Y.magFilter!==void 0)U.magFilter=$(Y.magFilter,FY);if(Y.anisotropy!==void 0)U.anisotropy=Y.anisotropy;if(Y.flipY!==void 0)U.flipY=Y.flipY;if(Y.generateMipmaps!==void 0)U.generateMipmaps=Y.generateMipmaps;if(Y.premultiplyAlpha!==void 0)U.premultiplyAlpha=Y.premultiplyAlpha;if(Y.unpackAlignment!==void 0)U.unpackAlignment=Y.unpackAlignment;if(Y.compareFunction!==void 0)U.compareFunction=Y.compareFunction;if(Y.normalized!==void 0)U.normalized=Y.normalized;if(Y.userData!==void 0)U.userData=Y.userData;Z[Y.uuid]=U}return Z}parseObject(J,Q,$,Z,W){let K;function Y(N){if(Q[N]===void 0)X0("ObjectLoader: Undefined geometry",N);return Q[N]}function H(N){if(N===void 0)return;if(Array.isArray(N)){let G=[];for(let q=0,O=N.length;q<O;q++){let R=N[q];if($[R]===void 0)X0("ObjectLoader: Undefined material",R);G.push($[R])}return G}if($[N]===void 0)X0("ObjectLoader: Undefined material",N);return $[N]}function X(N){if(Z[N]===void 0)X0("ObjectLoader: Undefined texture",N);return Z[N]}let U,E;switch(J.type){case"Scene":if(K=new KW,J.background!==void 0)if(Number.isInteger(J.background))K.background=new V0(J.background);else K.background=X(J.background);if(J.environment!==void 0)K.environment=X(J.environment);if(J.fog!==void 0){if(J.fog.type==="Fog")K.fog=new wQ(J.fog.color,J.fog.near,J.fog.far);else if(J.fog.type==="FogExp2")K.fog=new _Q(J.fog.color,J.fog.density);if(J.fog.name!=="")K.fog.name=J.fog.name}if(J.backgroundBlurriness!==void 0)K.backgroundBlurriness=J.backgroundBlurriness;if(J.backgroundIntensity!==void 0)K.backgroundIntensity=J.backgroundIntensity;if(J.backgroundRotation!==void 0)K.backgroundRotation.fromArray(J.backgroundRotation);if(J.environmentIntensity!==void 0)K.environmentIntensity=J.environmentIntensity;if(J.environmentRotation!==void 0)K.environmentRotation.fromArray(J.environmentRotation);break;case"PerspectiveCamera":if(K=new TJ(J.fov,J.aspect,J.near,J.far),J.focus!==void 0)K.focus=J.focus;if(J.zoom!==void 0)K.zoom=J.zoom;if(J.filmGauge!==void 0)K.filmGauge=J.filmGauge;if(J.filmOffset!==void 0)K.filmOffset=J.filmOffset;if(J.view!==void 0)K.view=Object.assign({},J.view);break;case"OrthographicCamera":if(K=new I7(J.left,J.right,J.top,J.bottom,J.near,J.far),J.zoom!==void 0)K.zoom=J.zoom;if(J.view!==void 0)K.view=Object.assign({},J.view);break;case"AmbientLight":K=new mW(J.color,J.intensity);break;case"DirectionalLight":K=new pW(J.color,J.intensity),K.target=J.target||"";break;case"PointLight":K=new gW(J.color,J.intensity,J.distance,J.decay);break;case"RectAreaLight":K=new dW(J.color,J.intensity,J.width,J.height);break;case"SpotLight":K=new xW(J.color,J.intensity,J.distance,J.angle,J.penumbra,J.decay),K.target=J.target||"";break;case"HemisphereLight":K=new hW(J.color,J.groundColor,J.intensity);break;case"LightProbe":let N=new Y$().fromArray(J.sh);K=new lW(N,J.intensity);break;case"SkinnedMesh":if(U=Y(J.geometry),E=H(J.material),K=new XW(U,E),J.bindMode!==void 0)K.bindMode=J.bindMode;if(J.bindMatrix!==void 0)K.bindMatrix.fromArray(J.bindMatrix);if(J.skeleton!==void 0)K.skeleton=J.skeleton;break;case"Mesh":U=Y(J.geometry),E=H(J.material),K=new IJ(U,E);break;case"InstancedMesh":U=Y(J.geometry),E=H(J.material);let{count:G,instanceMatrix:q,instanceColor:O}=J;if(K=new UW(U,E,G),K.instanceMatrix=new w8(new Float32Array(q.array),16),O!==void 0)K.instanceColor=new w8(new Float32Array(O.array),O.itemSize);break;case"BatchedMesh":if(U=Y(J.geometry),E=H(J.material),K=new GW(J.maxInstanceCount,J.maxVertexCount,J.maxIndexCount,E),K.geometry=U,K.perObjectFrustumCulled=J.perObjectFrustumCulled,K.sortObjects=J.sortObjects,K._drawRanges=J.drawRanges,K._reservedRanges=J.reservedRanges,K._geometryInfo=J.geometryInfo.map((R)=>{let F=null,D=null;if(R.boundingBox!==void 0)F=new jJ().fromJSON(R.boundingBox);if(R.boundingSphere!==void 0)D=new SJ().fromJSON(R.boundingSphere);return{...R,boundingBox:F,boundingSphere:D}}),K._instanceInfo=J.instanceInfo,K._availableInstanceIds=J._availableInstanceIds,K._availableGeometryIds=J._availableGeometryIds,K._nextIndexStart=J.nextIndexStart,K._nextVertexStart=J.nextVertexStart,K._geometryCount=J.geometryCount,K._maxInstanceCount=J.maxInstanceCount,K._maxVertexCount=J.maxVertexCount,K._maxIndexCount=J.maxIndexCount,K._geometryInitialized=J.geometryInitialized,K._matricesTexture=X(J.matricesTexture.uuid),K._indirectTexture=X(J.indirectTexture.uuid),J.colorsTexture!==void 0)K._colorsTexture=X(J.colorsTexture.uuid);if(J.boundingSphere!==void 0)K.boundingSphere=new SJ().fromJSON(J.boundingSphere);if(J.boundingBox!==void 0)K.boundingBox=new jJ().fromJSON(J.boundingBox);break;case"LOD":K=new HW;break;case"Line":K=new x9(Y(J.geometry),H(J.material));break;case"LineLoop":K=new EW(Y(J.geometry),H(J.material));break;case"LineSegments":K=new F9(Y(J.geometry),H(J.material));break;case"PointCloud":case"Points":K=new NW(Y(J.geometry),H(J.material));break;case"Sprite":K=new YW(H(J.material));break;case"Group":K=new V8;break;case"Bone":K=new TQ;break;default:K=new HJ}if(K.uuid=J.uuid,J.name!==void 0)K.name=J.name;if(J.matrix!==void 0){if(K.matrix.fromArray(J.matrix),J.matrixAutoUpdate!==void 0)K.matrixAutoUpdate=J.matrixAutoUpdate;if(K.matrixAutoUpdate)K.matrix.decompose(K.position,K.quaternion,K.scale)}else{if(J.position!==void 0)K.position.fromArray(J.position);if(J.rotation!==void 0)K.rotation.fromArray(J.rotation);if(J.quaternion!==void 0)K.quaternion.fromArray(J.quaternion);if(J.scale!==void 0)K.scale.fromArray(J.scale)}if(J.up!==void 0)K.up.fromArray(J.up);if(J.pivot!==void 0)K.pivot=new P().fromArray(J.pivot);if(J.morphTargetDictionary!==void 0)K.morphTargetDictionary=Object.assign({},J.morphTargetDictionary);if(J.morphTargetInfluences!==void 0)K.morphTargetInfluences=J.morphTargetInfluences.slice();if(J.castShadow!==void 0)K.castShadow=J.castShadow;if(J.receiveShadow!==void 0)K.receiveShadow=J.receiveShadow;if(J.shadow){if(J.shadow.intensity!==void 0)K.shadow.intensity=J.shadow.intensity;if(J.shadow.bias!==void 0)K.shadow.bias=J.shadow.bias;if(J.shadow.normalBias!==void 0)K.shadow.normalBias=J.shadow.normalBias;if(J.shadow.radius!==void 0)K.shadow.radius=J.shadow.radius;if(J.shadow.mapSize!==void 0)K.shadow.mapSize.fromArray(J.shadow.mapSize);if(J.shadow.camera!==void 0)K.shadow.camera=this.parseObject(J.shadow.camera)}if(J.visible!==void 0)K.visible=J.visible;if(J.frustumCulled!==void 0)K.frustumCulled=J.frustumCulled;if(J.renderOrder!==void 0)K.renderOrder=J.renderOrder;if(J.static!==void 0)K.static=J.static;if(J.userData!==void 0)K.userData=J.userData;if(J.layers!==void 0)K.layers.mask=J.layers;if(J.children!==void 0){let N=J.children;for(let G=0;G<N.length;G++)K.add(this.parseObject(N[G],Q,$,Z,W))}if(J.animations!==void 0){let N=J.animations;for(let G=0;G<N.length;G++){let q=N[G];K.animations.push(W[q])}}if(J.type==="LOD"){if(J.autoUpdate!==void 0)K.autoUpdate=J.autoUpdate;let N=J.levels;for(let G=0;G<N.length;G++){let q=N[G],O=K.getObjectByProperty("uuid",q.object);if(O!==void 0)K.addLevel(O,q.distance,q.hysteresis)}}return K}bindSkeletons(J,Q){if(Object.keys(Q).length===0)return;J.traverse(function($){if($.isSkinnedMesh===!0&&$.skeleton!==void 0){let Z=Q[$.skeleton];if(Z===void 0)X0("ObjectLoader: No skeleton found with UUID:",$.skeleton);else $.bind(Z,$.bindMatrix)}})}bindLightTargets(J){J.traverse(function(Q){if(Q.isDirectionalLight||Q.isSpotLight){let $=Q.target,Z=J.getObjectByProperty("uuid",$);if(Z!==void 0)Q.target=Z;else Q.target=new HJ}})}}var C5={UVMapping:300,CubeReflectionMapping:301,CubeRefractionMapping:302,EquirectangularReflectionMapping:303,EquirectangularRefractionMapping:304,CubeUVReflectionMapping:306},DY={RepeatWrapping:1000,ClampToEdgeWrapping:1001,MirroredRepeatWrapping:1002},FY={NearestFilter:1003,NearestMipmapNearestFilter:1004,NearestMipmapLinearFilter:1005,LinearFilter:1006,LinearMipmapNearestFilter:1007,LinearMipmapLinearFilter:1008},i$=new WeakMap;class FX extends lJ{constructor(J){super(J);if(this.isImageBitmapLoader=!0,typeof createImageBitmap>"u")X0("ImageBitmapLoader: createImageBitmap() not supported.");if(typeof fetch>"u")X0("ImageBitmapLoader: fetch() not supported.");this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(J){return this.options=J,this}load(J,Q,$,Z){if(J===void 0)J="";if(this.path!==void 0)J=this.path+J;J=this.manager.resolveURL(J);let W=this,K=V9.get(`image-bitmap:${J}`);if(K!==void 0){if(W.manager.itemStart(J),K.then){K.then((X)=>{if(i$.has(K)===!0){if(Z)Z(i$.get(K));W.manager.itemError(J),W.manager.itemEnd(J)}else{if(Q)Q(X);W.manager.itemEnd(J)}});return}setTimeout(function(){if(Q)Q(K);W.manager.itemEnd(J)},0);return}let Y={};Y.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",Y.headers=this.requestHeader,Y.signal=typeof AbortSignal.any==="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;let H=fetch(J,Y).then(function(X){return X.blob()}).then(function(X){return createImageBitmap(X,Object.assign(W.options,{colorSpaceConversion:"none"}))}).then(function(X){if(V9.add(`image-bitmap:${J}`,X),Q)Q(X);W.manager.itemEnd(J)}).catch(function(X){if(Z)Z(X);i$.set(H,X),V9.remove(`image-bitmap:${J}`),W.manager.itemError(J),W.manager.itemEnd(J)});V9.add(`image-bitmap:${J}`,H),W.manager.itemStart(J)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}var JQ;class X${static getContext(){if(JQ===void 0)JQ=new(window.AudioContext||window.webkitAudioContext);return JQ}static setContext(J){JQ=J}}class OX extends lJ{constructor(J){super(J)}load(J,Q,$,Z){let W=this,K=new B9(this.manager);K.setResponseType("arraybuffer"),K.setPath(this.path),K.setRequestHeader(this.requestHeader),K.setWithCredentials(this.withCredentials),K.load(J,function(H){try{let X=H.slice(0),U=X$.getContext(),E=J+"#decode";W.manager.itemStart(E),U.decodeAudioData(X,function(N){Q(N),W.manager.itemEnd(E)}).catch(function(N){Y(N),W.manager.itemEnd(E)})}catch(X){Y(X)}},$,Z);function Y(H){if(Z)Z(H);else T0(H);W.manager.itemError(J)}}}var OY=new d0,RY=new d0,F8=new d0;class RX{constructor(){this.type="StereoCamera",this.aspect=1,this.eyeSep=0.064,this.cameraL=new TJ,this.cameraL.layers.enable(1),this.cameraL.matrixAutoUpdate=!1,this.cameraR=new TJ,this.cameraR.layers.enable(2),this.cameraR.matrixAutoUpdate=!1,this._cache={focus:null,fov:null,aspect:null,near:null,far:null,zoom:null,eyeSep:null}}update(J){let Q=this._cache;if(Q.focus!==J.focus||Q.fov!==J.fov||Q.aspect!==J.aspect*this.aspect||Q.near!==J.near||Q.far!==J.far||Q.zoom!==J.zoom||Q.eyeSep!==this.eyeSep){Q.focus=J.focus,Q.fov=J.fov,Q.aspect=J.aspect*this.aspect,Q.near=J.near,Q.far=J.far,Q.zoom=J.zoom,Q.eyeSep=this.eyeSep,F8.copy(J.projectionMatrix);let Z=Q.eyeSep/2,W=Z*Q.near/Q.focus,K=Q.near*Math.tan(z8*Q.fov*0.5)/Q.zoom,Y,H;RY.elements[12]=-Z,OY.elements[12]=Z,Y=-K*Q.aspect+W,H=K*Q.aspect+W,F8.elements[0]=2*Q.near/(H-Y),F8.elements[8]=(H+Y)/(H-Y),this.cameraL.projectionMatrix.copy(F8),Y=-K*Q.aspect-W,H=K*Q.aspect-W,F8.elements[0]=2*Q.near/(H-Y),F8.elements[8]=(H+Y)/(H-Y),this.cameraR.projectionMatrix.copy(F8)}this.cameraL.matrixWorld.copy(J.matrixWorld).multiply(RY),this.cameraR.matrixWorld.copy(J.matrixWorld).multiply(OY)}}var W7=-90,K7=1;class nW extends HJ{constructor(J,Q,$){super();this.type="CubeCamera",this.renderTarget=$,this.coordinateSystem=null,this.activeMipmapLevel=0;let Z=new TJ(W7,K7,J,Q);Z.layers=this.layers,this.add(Z);let W=new TJ(W7,K7,J,Q);W.layers=this.layers,this.add(W);let K=new TJ(W7,K7,J,Q);K.layers=this.layers,this.add(K);let Y=new TJ(W7,K7,J,Q);Y.layers=this.layers,this.add(Y);let H=new TJ(W7,K7,J,Q);H.layers=this.layers,this.add(H);let X=new TJ(W7,K7,J,Q);X.layers=this.layers,this.add(X)}updateCoordinateSystem(){let J=this.coordinateSystem,Q=this.children.concat(),[$,Z,W,K,Y,H]=Q;for(let X of Q)this.remove(X);if(J===2000)$.up.set(0,1,0),$.lookAt(1,0,0),Z.up.set(0,1,0),Z.lookAt(-1,0,0),W.up.set(0,0,-1),W.lookAt(0,1,0),K.up.set(0,0,1),K.lookAt(0,-1,0),Y.up.set(0,1,0),Y.lookAt(0,0,1),H.up.set(0,1,0),H.lookAt(0,0,-1);else if(J===2001)$.up.set(0,-1,0),$.lookAt(-1,0,0),Z.up.set(0,-1,0),Z.lookAt(1,0,0),W.up.set(0,0,1),W.lookAt(0,1,0),K.up.set(0,0,-1),K.lookAt(0,-1,0),Y.up.set(0,-1,0),Y.lookAt(0,0,1),H.up.set(0,-1,0),H.lookAt(0,0,-1);else throw Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+J);for(let X of Q)this.add(X),X.updateMatrixWorld()}update(J,Q){if(this.parent===null)this.updateMatrixWorld();let{renderTarget:$,activeMipmapLevel:Z}=this;if(this.coordinateSystem!==J.coordinateSystem)this.coordinateSystem=J.coordinateSystem,this.updateCoordinateSystem();let[W,K,Y,H,X,U]=this.children,E=J.getRenderTarget(),N=J.getActiveCubeFace(),G=J.getActiveMipmapLevel(),q=J.xr.enabled;J.xr.enabled=!1;let O=$.texture.generateMipmaps;$.texture.generateMipmaps=!1;let R=!1;if(J.isWebGLRenderer===!0)R=J.state.buffers.depth.getReversed();else R=J.reversedDepthBuffer;if(J.setRenderTarget($,0,Z),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,W),J.setRenderTarget($,1,Z),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,K),J.setRenderTarget($,2,Z),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,Y),J.setRenderTarget($,3,Z),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,H),J.setRenderTarget($,4,Z),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,X),$.texture.generateMipmaps=O,J.setRenderTarget($,5,Z),R&&J.autoClear===!1)J.clearDepth();J.render(Q,U),J.setRenderTarget(E,N,G),J.xr.enabled=q,$.texture.needsPMREMUpdate=!0}}class sW extends TJ{constructor(J=[]){super();this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=J}}class iW{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(J){if(this._document=J,J.hidden!==void 0)this._pageVisibilityHandler=P5.bind(this),J.addEventListener("visibilitychange",this._pageVisibilityHandler,!1)}disconnect(){if(this._pageVisibilityHandler!==null)this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null;this._document=null}getDelta(){return this._delta/1000}getElapsed(){return this._elapsed/1000}getTimescale(){return this._timescale}setTimescale(J){return this._timescale=J,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(J){if(this._pageVisibilityHandler!==null&&this._document.hidden===!0)this._delta=0;else this._previousTime=this._currentTime,this._currentTime=(J!==void 0?J:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta;return this}}function P5(){if(this._document.hidden===!1)this.reset()}var O8=new P,o$=new xJ,T5=new P,R8=new P,k8=new P;class kX extends HJ{constructor(){super();this.type="AudioListener",this.context=X$.getContext(),this.gain=this.context.createGain(),this.gain.connect(this.context.destination),this.filter=null,this.timeDelta=0,this._timer=new iW}getInput(){return this.gain}removeFilter(){if(this.filter!==null)this.gain.disconnect(this.filter),this.filter.disconnect(this.context.destination),this.gain.connect(this.context.destination),this.filter=null;return this}getFilter(){return this.filter}setFilter(J){if(this.filter!==null)this.gain.disconnect(this.filter),this.filter.disconnect(this.context.destination);else this.gain.disconnect(this.context.destination);return this.filter=J,this.gain.connect(this.filter),this.filter.connect(this.context.destination),this}getMasterVolume(){return this.gain.gain.value}setMasterVolume(J){return this.gain.gain.setTargetAtTime(J,this.context.currentTime,0.01),this}updateMatrixWorld(J){super.updateMatrixWorld(J),this._timer.update();let Q=this.context.listener;if(this.timeDelta=this._timer.getDelta(),this.matrixWorld.decompose(O8,o$,T5),R8.set(0,0,-1).applyQuaternion(o$),k8.set(0,1,0).applyQuaternion(o$),Q.positionX){let $=this.context.currentTime+this.timeDelta;Q.positionX.linearRampToValueAtTime(O8.x,$),Q.positionY.linearRampToValueAtTime(O8.y,$),Q.positionZ.linearRampToValueAtTime(O8.z,$),Q.forwardX.linearRampToValueAtTime(R8.x,$),Q.forwardY.linearRampToValueAtTime(R8.y,$),Q.forwardZ.linearRampToValueAtTime(R8.z,$),Q.upX.linearRampToValueAtTime(k8.x,$),Q.upY.linearRampToValueAtTime(k8.y,$),Q.upZ.linearRampToValueAtTime(k8.z,$)}else Q.setPosition(O8.x,O8.y,O8.z),Q.setOrientation(R8.x,R8.y,R8.z,k8.x,k8.y,k8.z)}}class oW extends HJ{constructor(J){super();this.type="Audio",this.listener=J,this.context=J.context,this.gain=this.context.createGain(),this.gain.connect(J.getInput()),this.autoplay=!1,this.buffer=null,this.detune=0,this.loop=!1,this.loopStart=0,this.loopEnd=0,this.offset=0,this.duration=void 0,this.playbackRate=1,this.isPlaying=!1,this.hasPlaybackControl=!0,this.source=null,this.sourceType="empty",this._startedAt=0,this._progress=0,this._connected=!1,this.filters=[]}getOutput(){return this.gain}setNodeSource(J){return this.hasPlaybackControl=!1,this.sourceType="audioNode",this.source=J,this.connect(),this}setMediaElementSource(J){return this.hasPlaybackControl=!1,this.sourceType="mediaNode",this.source=this.context.createMediaElementSource(J),this.connect(),this}setMediaStreamSource(J){return this.hasPlaybackControl=!1,this.sourceType="mediaStreamNode",this.source=this.context.createMediaStreamSource(J),this.connect(),this}setBuffer(J){if(this.buffer=J,this.sourceType="buffer",this.autoplay)this.play();return this}play(J=0){if(this.isPlaying===!0){X0("Audio: Audio is already playing.");return}if(this.hasPlaybackControl===!1){X0("Audio: this Audio has no playback control.");return}this._startedAt=this.context.currentTime+J;let Q=this.context.createBufferSource();return Q.buffer=this.buffer,Q.loop=this.loop,Q.loopStart=this.loopStart,Q.loopEnd=this.loopEnd,Q.onended=this.onEnded.bind(this),Q.start(this._startedAt,this._progress+this.offset,this.duration),this.isPlaying=!0,this.source=Q,this.setDetune(this.detune),this.setPlaybackRate(this.playbackRate),this.connect()}pause(){if(this.hasPlaybackControl===!1){X0("Audio: this Audio has no playback control.");return}if(this.isPlaying===!0){if(this._progress+=Math.max(this.context.currentTime-this._startedAt,0)*this.playbackRate,this.loop===!0)this._progress=this._progress%(this.duration||this.buffer.duration);this.source.stop(),this.source.onended=null,this.isPlaying=!1}return this}stop(J=0){if(this.hasPlaybackControl===!1){X0("Audio: this Audio has no playback control.");return}if(this._progress=0,this.source!==null)this.source.stop(this.context.currentTime+J),this.source.onended=null;return this.isPlaying=!1,this}connect(){if(this.filters.length>0){this.source.connect(this.filters[0]);for(let J=1,Q=this.filters.length;J<Q;J++)this.filters[J-1].connect(this.filters[J]);this.filters[this.filters.length-1].connect(this.getOutput())}else this.source.connect(this.getOutput());return this._connected=!0,this}disconnect(){if(this._connected===!1)return;if(this.filters.length>0){this.source.disconnect(this.filters[0]);for(let J=1,Q=this.filters.length;J<Q;J++)this.filters[J-1].disconnect(this.filters[J]);this.filters[this.filters.length-1].disconnect(this.getOutput())}else this.source.disconnect(this.getOutput());return this._connected=!1,this}getFilters(){return this.filters}setFilters(J){if(!J)J=[];if(this._connected===!0)this.disconnect(),this.filters=J.slice(),this.connect();else this.filters=J.slice();return this}setDetune(J){if(this.detune=J,this.isPlaying===!0&&this.source.detune!==void 0)this.source.detune.setTargetAtTime(this.detune,this.context.currentTime,0.01);return this}getDetune(){return this.detune}getFilter(){return this.getFilters()[0]}setFilter(J){return this.setFilters(J?[J]:[])}setPlaybackRate(J){if(this.hasPlaybackControl===!1){X0("Audio: this Audio has no playback control.");return}if(this.playbackRate=J,this.isPlaying===!0)this.source.playbackRate.setTargetAtTime(this.playbackRate,this.context.currentTime,0.01);return this}getPlaybackRate(){return this.playbackRate}onEnded(){this.isPlaying=!1,this._progress=0}getLoop(){if(this.hasPlaybackControl===!1)return X0("Audio: this Audio has no playback control."),!1;return this.loop}setLoop(J){if(this.hasPlaybackControl===!1){X0("Audio: this Audio has no playback control.");return}if(this.loop=J,this.isPlaying===!0)this.source.loop=this.loop;return this}setLoopStart(J){return this.loopStart=J,this}setLoopEnd(J){return this.loopEnd=J,this}getVolume(){return this.gain.gain.value}setVolume(J){return this.gain.gain.setTargetAtTime(J,this.context.currentTime,0.01),this}copy(J,Q){if(super.copy(J,Q),J.sourceType!=="buffer")return X0("Audio: Audio source type cannot be copied."),this;return this.autoplay=J.autoplay,this.buffer=J.buffer,this.detune=J.detune,this.loop=J.loop,this.loopStart=J.loopStart,this.loopEnd=J.loopEnd,this.offset=J.offset,this.duration=J.duration,this.playbackRate=J.playbackRate,this.hasPlaybackControl=J.hasPlaybackControl,this.sourceType=J.sourceType,this.filters=J.filters.slice(),this}clone(J){return new this.constructor(this.listener).copy(this,J)}}var M8=new P,kY=new xJ,S5=new P,L8=new P;class MX extends oW{constructor(J){super(J);this.panner=this.context.createPanner(),this.panner.panningModel="HRTF",this.panner.connect(this.gain)}connect(){return super.connect(),this.panner.connect(this.gain),this}disconnect(){return super.disconnect(),this.panner.disconnect(this.gain),this}getOutput(){return this.panner}getRefDistance(){return this.panner.refDistance}setRefDistance(J){return this.panner.refDistance=J,this}getRolloffFactor(){return this.panner.rolloffFactor}setRolloffFactor(J){return this.panner.rolloffFactor=J,this}getDistanceModel(){return this.panner.distanceModel}setDistanceModel(J){return this.panner.distanceModel=J,this}getMaxDistance(){return this.panner.maxDistance}setMaxDistance(J){return this.panner.maxDistance=J,this}setDirectionalCone(J,Q,$){return this.panner.coneInnerAngle=J,this.panner.coneOuterAngle=Q,this.panner.coneOuterGain=$,this}updateMatrixWorld(J){if(super.updateMatrixWorld(J),this.hasPlaybackControl===!0&&this.isPlaying===!1)return;this.matrixWorld.decompose(M8,kY,S5),L8.set(0,0,1).applyQuaternion(kY);let Q=this.panner;if(Q.positionX){let $=this.context.currentTime+this.listener.timeDelta;Q.positionX.linearRampToValueAtTime(M8.x,$),Q.positionY.linearRampToValueAtTime(M8.y,$),Q.positionZ.linearRampToValueAtTime(M8.z,$),Q.orientationX.linearRampToValueAtTime(L8.x,$),Q.orientationY.linearRampToValueAtTime(L8.y,$),Q.orientationZ.linearRampToValueAtTime(L8.z,$)}else Q.setPosition(M8.x,M8.y,M8.z),Q.setOrientation(L8.x,L8.y,L8.z)}}class LX{constructor(J,Q=2048){this.analyser=J.context.createAnalyser(),this.analyser.fftSize=Q,this.data=new Uint8Array(this.analyser.frequencyBinCount),J.getOutput().connect(this.analyser)}getFrequencyData(){return this.analyser.getByteFrequencyData(this.data),this.data}getAverageFrequency(){let J=0,Q=this.getFrequencyData();for(let $=0;$<Q.length;$++)J+=Q[$];return J/Q.length}}class aW{constructor(J,Q,$){this.binding=J,this.valueSize=$;let Z,W,K;switch(Q){case"quaternion":Z=this._slerp,W=this._slerpAdditive,K=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array($*6),this._workIndex=5;break;case"string":case"bool":Z=this._select,W=this._select,K=this._setAdditiveIdentityOther,this.buffer=Array($*5);break;default:Z=this._lerp,W=this._lerpAdditive,K=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array($*5)}this._mixBufferRegion=Z,this._mixBufferRegionAdditive=W,this._setIdentity=K,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(J,Q){let $=this.buffer,Z=this.valueSize,W=J*Z+Z,K=this.cumulativeWeight;if(K===0){for(let Y=0;Y!==Z;++Y)$[W+Y]=$[Y];K=Q}else{K+=Q;let Y=Q/K;this._mixBufferRegion($,W,0,Y,Z)}this.cumulativeWeight=K}accumulateAdditive(J){let Q=this.buffer,$=this.valueSize,Z=$*this._addIndex;if(this.cumulativeWeightAdditive===0)this._setIdentity();this._mixBufferRegionAdditive(Q,Z,0,J,$),this.cumulativeWeightAdditive+=J}apply(J){let Q=this.valueSize,$=this.buffer,Z=J*Q+Q,W=this.cumulativeWeight,K=this.cumulativeWeightAdditive,Y=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,W<1){let H=Q*this._origIndex;this._mixBufferRegion($,Z,H,1-W,Q)}if(K>0)this._mixBufferRegionAdditive($,Z,this._addIndex*Q,1,Q);for(let H=Q,X=Q+Q;H!==X;++H)if($[H]!==$[H+Q]){Y.setValue($,Z);break}}saveOriginalState(){let J=this.binding,Q=this.buffer,$=this.valueSize,Z=$*this._origIndex;J.getValue(Q,Z);for(let W=$,K=Z;W!==K;++W)Q[W]=Q[Z+W%$];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){let J=this.valueSize*3;this.binding.setValue(this.buffer,J)}_setAdditiveIdentityNumeric(){let J=this._addIndex*this.valueSize,Q=J+this.valueSize;for(let $=J;$<Q;$++)this.buffer[$]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){let J=this._origIndex*this.valueSize,Q=this._addIndex*this.valueSize;for(let $=0;$<this.valueSize;$++)this.buffer[Q+$]=this.buffer[J+$]}_select(J,Q,$,Z,W){if(Z>=0.5)for(let K=0;K!==W;++K)J[Q+K]=J[$+K]}_slerp(J,Q,$,Z){xJ.slerpFlat(J,Q,J,Q,J,$,Z)}_slerpAdditive(J,Q,$,Z,W){let K=this._workIndex*W;xJ.multiplyQuaternionsFlat(J,K,J,Q,J,$),xJ.slerpFlat(J,Q,J,Q,J,K,Z)}_lerp(J,Q,$,Z,W){let K=1-Z;for(let Y=0;Y!==W;++Y){let H=Q+Y;J[H]=J[H]*K+J[$+Y]*Z}}_lerpAdditive(J,Q,$,Z,W){for(let K=0;K!==W;++K){let Y=Q+K;J[Y]=J[Y]+J[$+K]*Z}}}var rW="\\[\\]\\.:\\/",j5=new RegExp("["+rW+"]","g"),tW="[^"+rW+"]",y5="[^"+rW.replace("\\.","")+"]",v5=/((?:WC+[\/:])*)/.source.replace("WC",tW),f5=/(WCOD+)?/.source.replace("WCOD",y5),b5=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",tW),h5=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",tW),x5=new RegExp("^"+v5+f5+b5+h5+"$"),g5=["material","materials","bones","map"];class VX{constructor(J,Q,$){let Z=$||YJ.parseTrackName(Q);this._targetGroup=J,this._bindings=J.subscribe_(Q,Z)}getValue(J,Q){this.bind();let $=this._targetGroup.nCachedObjects_,Z=this._bindings[$];if(Z!==void 0)Z.getValue(J,Q)}setValue(J,Q){let $=this._bindings;for(let Z=this._targetGroup.nCachedObjects_,W=$.length;Z!==W;++Z)$[Z].setValue(J,Q)}bind(){let J=this._bindings;for(let Q=this._targetGroup.nCachedObjects_,$=J.length;Q!==$;++Q)J[Q].bind()}unbind(){let J=this._bindings;for(let Q=this._targetGroup.nCachedObjects_,$=J.length;Q!==$;++Q)J[Q].unbind()}}class YJ{constructor(J,Q,$){this.path=Q,this.parsedPath=$||YJ.parseTrackName(Q),this.node=YJ.findNode(J,this.parsedPath.nodeName),this.rootNode=J,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(J,Q,$){if(!(J&&J.isAnimationObjectGroup))return new YJ(J,Q,$);else return new YJ.Composite(J,Q,$)}static sanitizeNodeName(J){return J.replace(/\s/g,"_").replace(j5,"")}static parseTrackName(J){let Q=x5.exec(J);if(Q===null)throw Error("PropertyBinding: Cannot parse trackName: "+J);let $={nodeName:Q[2],objectName:Q[3],objectIndex:Q[4],propertyName:Q[5],propertyIndex:Q[6]},Z=$.nodeName&&$.nodeName.lastIndexOf(".");if(Z!==void 0&&Z!==-1){let W=$.nodeName.substring(Z+1);if(g5.indexOf(W)!==-1)$.nodeName=$.nodeName.substring(0,Z),$.objectName=W}if($.propertyName===null||$.propertyName.length===0)throw Error("PropertyBinding: can not parse propertyName from trackName: "+J);return $}static findNode(J,Q){if(Q===void 0||Q===""||Q==="."||Q===-1||Q===J.name||Q===J.uuid)return J;if(J.skeleton){let $=J.skeleton.getBoneByName(Q);if($!==void 0)return $}if(J.children){let $=function(W){for(let K=0;K<W.length;K++){let Y=W[K];if(Y.name===Q||Y.uuid===Q)return Y;let H=$(Y.children);if(H)return H}return null},Z=$(J.children);if(Z)return Z}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(J,Q){J[Q]=this.targetObject[this.propertyName]}_getValue_array(J,Q){let $=this.resolvedProperty;for(let Z=0,W=$.length;Z!==W;++Z)J[Q++]=$[Z]}_getValue_arrayElement(J,Q){J[Q]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(J,Q){this.resolvedProperty.toArray(J,Q)}_setValue_direct(J,Q){this.targetObject[this.propertyName]=J[Q]}_setValue_direct_setNeedsUpdate(J,Q){this.targetObject[this.propertyName]=J[Q],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(J,Q){this.targetObject[this.propertyName]=J[Q],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(J,Q){let $=this.resolvedProperty;for(let Z=0,W=$.length;Z!==W;++Z)$[Z]=J[Q++]}_setValue_array_setNeedsUpdate(J,Q){let $=this.resolvedProperty;for(let Z=0,W=$.length;Z!==W;++Z)$[Z]=J[Q++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(J,Q){let $=this.resolvedProperty;for(let Z=0,W=$.length;Z!==W;++Z)$[Z]=J[Q++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q]}_setValue_arrayElement_setNeedsUpdate(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(J,Q){this.resolvedProperty.fromArray(J,Q)}_setValue_fromArray_setNeedsUpdate(J,Q){this.resolvedProperty.fromArray(J,Q),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(J,Q){this.resolvedProperty.fromArray(J,Q),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(J,Q){this.bind(),this.getValue(J,Q)}_setValue_unbound(J,Q){this.bind(),this.setValue(J,Q)}bind(){let J=this.node,Q=this.parsedPath,$=Q.objectName,Z=Q.propertyName,W=Q.propertyIndex;if(!J)J=YJ.findNode(this.rootNode,Q.nodeName),this.node=J;if(this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!J){X0("PropertyBinding: No target node found for track: "+this.path+".");return}if($){let X=Q.objectIndex;switch($){case"materials":if(!J.material){T0("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.materials){T0("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}J=J.material.materials;break;case"bones":if(!J.skeleton){T0("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}J=J.skeleton.bones;for(let U=0;U<J.length;U++)if(J[U].name===X){X=U;break}break;case"map":if("map"in J){J=J.map;break}if(!J.material){T0("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.map){T0("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}J=J.material.map;break;default:if(J[$]===void 0){T0("PropertyBinding: Can not bind to objectName of node undefined.",this);return}J=J[$]}if(X!==void 0){if(J[X]===void 0){T0("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,J);return}J=J[X]}}let K=J[Z];if(K===void 0){let X=Q.nodeName;T0("PropertyBinding: Trying to update property for track: "+X+"."+Z+" but it wasn't found.",J);return}let Y=this.Versioning.None;if(this.targetObject=J,J.isMaterial===!0)Y=this.Versioning.NeedsUpdate;else if(J.isObject3D===!0)Y=this.Versioning.MatrixWorldNeedsUpdate;let H=this.BindingType.Direct;if(W!==void 0){if(Z==="morphTargetInfluences"){if(!J.geometry){T0("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!J.geometry.morphAttributes){T0("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}if(J.morphTargetDictionary[W]!==void 0)W=J.morphTargetDictionary[W]}H=this.BindingType.ArrayElement,this.resolvedProperty=K,this.propertyIndex=W}else if(K.fromArray!==void 0&&K.toArray!==void 0)H=this.BindingType.HasFromToArray,this.resolvedProperty=K;else if(Array.isArray(K))H=this.BindingType.EntireArray,this.resolvedProperty=K;else this.propertyName=Z;this.getValue=this.GetterByBindingType[H],this.setValue=this.SetterByBindingTypeAndVersioning[H][Y]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}YJ.Composite=VX;YJ.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};YJ.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};YJ.prototype.GetterByBindingType=[YJ.prototype._getValue_direct,YJ.prototype._getValue_array,YJ.prototype._getValue_arrayElement,YJ.prototype._getValue_toArray];YJ.prototype.SetterByBindingTypeAndVersioning=[[YJ.prototype._setValue_direct,YJ.prototype._setValue_direct_setNeedsUpdate,YJ.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[YJ.prototype._setValue_array,YJ.prototype._setValue_array_setNeedsUpdate,YJ.prototype._setValue_array_setMatrixWorldNeedsUpdate],[YJ.prototype._setValue_arrayElement,YJ.prototype._setValue_arrayElement_setNeedsUpdate,YJ.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[YJ.prototype._setValue_fromArray,YJ.prototype._setValue_fromArray_setNeedsUpdate,YJ.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];class BX{constructor(){this.isAnimationObjectGroup=!0,this.uuid=eJ(),this._objects=Array.prototype.slice.call(arguments),this.nCachedObjects_=0;let J={};this._indicesByUUID=J;for(let $=0,Z=arguments.length;$!==Z;++$)J[arguments[$].uuid]=$;this._paths=[],this._parsedPaths=[],this._bindings=[],this._bindingsIndicesByPath={};let Q=this;this.stats={objects:{get total(){return Q._objects.length},get inUse(){return this.total-Q.nCachedObjects_}},get bindingsPerObject(){return Q._bindings.length}}}add(){let J=this._objects,Q=this._indicesByUUID,$=this._paths,Z=this._parsedPaths,W=this._bindings,K=W.length,Y=void 0,H=J.length,X=this.nCachedObjects_;for(let U=0,E=arguments.length;U!==E;++U){let N=arguments[U],G=N.uuid,q=Q[G];if(q===void 0){q=H++,Q[G]=q,J.push(N);for(let O=0,R=K;O!==R;++O)W[O].push(new YJ(N,$[O],Z[O]))}else if(q<X){Y=J[q];let O=--X,R=J[O];Q[R.uuid]=q,J[q]=R,Q[G]=O,J[O]=N;for(let F=0,D=K;F!==D;++F){let k=W[F],M=k[O],V=k[q];if(k[q]=M,V===void 0)V=new YJ(N,$[F],Z[F]);k[O]=V}}else if(J[q]!==Y)T0("AnimationObjectGroup: Different objects with the same UUID detected. Clean the caches or recreate your infrastructure when reloading scenes.")}this.nCachedObjects_=X}remove(){let J=this._objects,Q=this._indicesByUUID,$=this._bindings,Z=$.length,W=this.nCachedObjects_;for(let K=0,Y=arguments.length;K!==Y;++K){let H=arguments[K],X=H.uuid,U=Q[X];if(U!==void 0&&U>=W){let E=W++,N=J[E];Q[N.uuid]=U,J[U]=N,Q[X]=E,J[E]=H;for(let G=0,q=Z;G!==q;++G){let O=$[G],R=O[E],F=O[U];O[U]=R,O[E]=F}}}this.nCachedObjects_=W}uncache(){let J=this._objects,Q=this._indicesByUUID,$=this._bindings,Z=$.length,W=this.nCachedObjects_,K=J.length;for(let Y=0,H=arguments.length;Y!==H;++Y){let X=arguments[Y],U=X.uuid,E=Q[U];if(E!==void 0)if(delete Q[U],E<W){let N=--W,G=J[N],q=--K,O=J[q];Q[G.uuid]=E,J[E]=G,Q[O.uuid]=N,J[N]=O,J.pop();for(let R=0,F=Z;R!==F;++R){let D=$[R],k=D[N],M=D[q];D[E]=k,D[N]=M,D.pop()}}else{let N=--K,G=J[N];if(N>0)Q[G.uuid]=E;J[E]=G,J.pop();for(let q=0,O=Z;q!==O;++q){let R=$[q];R[E]=R[N],R.pop()}}}this.nCachedObjects_=W}subscribe_(J,Q){let $=this._bindingsIndicesByPath,Z=$[J],W=this._bindings;if(Z!==void 0)return W[Z];let K=this._paths,Y=this._parsedPaths,H=this._objects,X=H.length,U=this.nCachedObjects_,E=Array(X);Z=W.length,$[J]=Z,K.push(J),Y.push(Q),W.push(E);for(let N=U,G=H.length;N!==G;++N){let q=H[N];E[N]=new YJ(q,J,Q)}return E}unsubscribe_(J){let Q=this._bindingsIndicesByPath,$=Q[J];if($!==void 0){let Z=this._paths,W=this._parsedPaths,K=this._bindings,Y=K.length-1,H=K[Y],X=J[Y];Q[X]=$,K[$]=H,K.pop(),W[$]=W[Y],W.pop(),Z[$]=Z[Y],Z.pop()}}}class eW{constructor(J,Q,$=null,Z=Q.blendMode){this._mixer=J,this._clip=Q,this._localRoot=$,this.blendMode=Z;let W=Q.tracks,K=W.length,Y=Array(K),H={endingStart:2400,endingEnd:2400};for(let X=0;X!==K;++X){let U=W[X].createInterpolant(null);if(Y[X]=U,U.settings)Object.assign(H,U.settings);U.settings=H}this._interpolantSettings=H,this._interpolants=Y,this._propertyBindings=Array(K),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._weightInterpolant=null,this.loop=2201,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(J){return this._startTime=J,this}setLoop(J,Q){return this.loop=J,this.repetitions=Q,this}setEffectiveWeight(J){return this.weight=J,this._effectiveWeight=this.enabled?J:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(J){return this._scheduleFading(J,0,1)}fadeOut(J){return this._scheduleFading(J,1,0)}crossFadeFrom(J,Q,$=!1){if(J.fadeOut(Q),this.fadeIn(Q),$===!0){let Z=this._clip.duration,W=J._clip.duration,K=W/Z,Y=Z/W;J.warp(1,K,Q),this.warp(Y,1,Q)}return this}crossFadeTo(J,Q,$=!1){return J.crossFadeFrom(this,Q,$)}stopFading(){let J=this._weightInterpolant;if(J!==null)this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(J);return this}setEffectiveTimeScale(J){return this.timeScale=J,this._effectiveTimeScale=this.paused?0:J,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(J){return this.timeScale=this._clip.duration/J,this.stopWarping()}syncWith(J){return this.time=J.time,this.timeScale=J.timeScale,this.stopWarping()}halt(J){return this.warp(this._effectiveTimeScale,0,J)}warp(J,Q,$){let Z=this._mixer,W=Z.time,K=this.timeScale,Y=this._timeScaleInterpolant;if(Y===null)Y=Z._lendControlInterpolant(),this._timeScaleInterpolant=Y;let{parameterPositions:H,sampleValues:X}=Y;return H[0]=W,H[1]=W+$,X[0]=J/K,X[1]=Q/K,this}stopWarping(){let J=this._timeScaleInterpolant;if(J!==null)this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(J);return this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(J,Q,$,Z){if(!this.enabled){this._updateWeight(J);return}let W=this._startTime;if(W!==null){let H=(J-W)*$;if(H<0||$===0)Q=0;else this._startTime=null,Q=$*H}Q*=this._updateTimeScale(J);let K=this._updateTime(Q),Y=this._updateWeight(J);if(Y>0){let H=this._interpolants,X=this._propertyBindings;switch(this.blendMode){case 2501:for(let U=0,E=H.length;U!==E;++U)H[U].evaluate(K),X[U].accumulateAdditive(Y);break;case 2500:default:for(let U=0,E=H.length;U!==E;++U)H[U].evaluate(K),X[U].accumulate(Z,Y)}}}_updateWeight(J){let Q=0;if(this.enabled){Q=this.weight;let $=this._weightInterpolant;if($!==null){let Z=$.evaluate(J)[0];if(Q*=Z,J>$.parameterPositions[1]){if(this.stopFading(),Z===0)this.enabled=!1}}}return this._effectiveWeight=Q,Q}_updateTimeScale(J){let Q=0;if(!this.paused){Q=this.timeScale;let $=this._timeScaleInterpolant;if($!==null){let Z=$.evaluate(J)[0];if(Q*=Z,J>$.parameterPositions[1])if(this.stopWarping(),Q===0)this.paused=!0;else this.timeScale=Q}}return this._effectiveTimeScale=Q,Q}_updateTime(J){let Q=this._clip.duration,$=this.loop,Z=this.time+J,W=this._loopCount,K=$===2202;if(J===0){if(W===-1)return Z;return K&&(W&1)===1?Q-Z:Z}if($===2200){if(W===-1)this._loopCount=0,this._setEndings(!0,!0,!1);J:{if(Z>=Q)Z=Q;else if(Z<0)Z=0;else{this.time=Z;break J}if(this.clampWhenFinished)this.paused=!0;else this.enabled=!1;this.time=Z,this._mixer.dispatchEvent({type:"finished",action:this,direction:J<0?-1:1})}}else{if(W===-1)if(J>=0)W=0,this._setEndings(!0,this.repetitions===0,K);else this._setEndings(this.repetitions===0,!0,K);if(Z>=Q||Z<0){let Y=Math.floor(Z/Q);Z-=Q*Y,W+=Math.abs(Y);let H=this.repetitions-W;if(H<=0){if(this.clampWhenFinished)this.paused=!0;else this.enabled=!1;Z=J>0?Q:0,this.time=Z,this._mixer.dispatchEvent({type:"finished",action:this,direction:J>0?1:-1})}else{if(H===1){let X=J<0;this._setEndings(X,!X,K)}else this._setEndings(!1,!1,K);this._loopCount=W,this.time=Z,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:Y})}}else this._loopCount=W,this.time=Z;if(K&&(W&1)===1)return Q-Z}return Z}_setEndings(J,Q,$){let Z=this._interpolantSettings;if($)Z.endingStart=2401,Z.endingEnd=2401;else{if(J)Z.endingStart=this.zeroSlopeAtStart?2401:2400;else Z.endingStart=2402;if(Q)Z.endingEnd=this.zeroSlopeAtEnd?2401:2400;else Z.endingEnd=2402}}_scheduleFading(J,Q,$){let Z=this._mixer,W=Z.time,K=this._weightInterpolant;if(K===null)K=Z._lendControlInterpolant(),this._weightInterpolant=K;let{parameterPositions:Y,sampleValues:H}=K;return Y[0]=W,H[0]=Q,Y[1]=W+J,H[1]=$,this}}var p5=new Float32Array(1);class zX extends K9{constructor(J){super();if(this._root=J,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}_bindAction(J,Q){let $=J._localRoot||this._root,Z=J._clip.tracks,W=Z.length,K=J._propertyBindings,Y=J._interpolants,H=$.uuid,X=this._bindingsByRootAndName,U=X[H];if(U===void 0)U={},X[H]=U;for(let E=0;E!==W;++E){let N=Z[E],G=N.name,q=U[G];if(q!==void 0)++q.referenceCount,K[E]=q;else{if(q=K[E],q!==void 0){if(q._cacheIndex===null)++q.referenceCount,this._addInactiveBinding(q,H,G);continue}let O=Q&&Q._propertyBindings[E].binding.parsedPath;q=new aW(YJ.create($,G,O),N.ValueTypeName,N.getValueSize()),++q.referenceCount,this._addInactiveBinding(q,H,G),K[E]=q}Y[E].resultBuffer=q.buffer}}_activateAction(J){if(!this._isActiveAction(J)){if(J._cacheIndex===null){let $=(J._localRoot||this._root).uuid,Z=J._clip.uuid,W=this._actionsByClip[Z];this._bindAction(J,W&&W.knownActions[0]),this._addInactiveAction(J,Z,$)}let Q=J._propertyBindings;for(let $=0,Z=Q.length;$!==Z;++$){let W=Q[$];if(W.useCount++===0)this._lendBinding(W),W.saveOriginalState()}this._lendAction(J)}}_deactivateAction(J){if(this._isActiveAction(J)){let Q=J._propertyBindings;for(let $=0,Z=Q.length;$!==Z;++$){let W=Q[$];if(--W.useCount===0)W.restoreOriginalState(),this._takeBackBinding(W)}this._takeBackAction(J)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;let J=this;this.stats={actions:{get total(){return J._actions.length},get inUse(){return J._nActiveActions}},bindings:{get total(){return J._bindings.length},get inUse(){return J._nActiveBindings}},controlInterpolants:{get total(){return J._controlInterpolants.length},get inUse(){return J._nActiveControlInterpolants}}}}_isActiveAction(J){let Q=J._cacheIndex;return Q!==null&&Q<this._nActiveActions}_addInactiveAction(J,Q,$){let Z=this._actions,W=this._actionsByClip,K=W[Q];if(K===void 0)K={knownActions:[J],actionByRoot:{}},J._byClipCacheIndex=0,W[Q]=K;else{let Y=K.knownActions;J._byClipCacheIndex=Y.length,Y.push(J)}J._cacheIndex=Z.length,Z.push(J),K.actionByRoot[$]=J}_removeInactiveAction(J){let Q=this._actions,$=Q[Q.length-1],Z=J._cacheIndex;$._cacheIndex=Z,Q[Z]=$,Q.pop(),J._cacheIndex=null;let W=J._clip.uuid,K=this._actionsByClip,Y=K[W],H=Y.knownActions,X=H[H.length-1],U=J._byClipCacheIndex;X._byClipCacheIndex=U,H[U]=X,H.pop(),J._byClipCacheIndex=null;let E=Y.actionByRoot,N=(J._localRoot||this._root).uuid;if(delete E[N],H.length===0)delete K[W];this._removeInactiveBindingsForAction(J)}_removeInactiveBindingsForAction(J){let Q=J._propertyBindings;for(let $=0,Z=Q.length;$!==Z;++$){let W=Q[$];if(--W.referenceCount===0)this._removeInactiveBinding(W)}}_lendAction(J){let Q=this._actions,$=J._cacheIndex,Z=this._nActiveActions++,W=Q[Z];J._cacheIndex=Z,Q[Z]=J,W._cacheIndex=$,Q[$]=W}_takeBackAction(J){let Q=this._actions,$=J._cacheIndex,Z=--this._nActiveActions,W=Q[Z];J._cacheIndex=Z,Q[Z]=J,W._cacheIndex=$,Q[$]=W}_addInactiveBinding(J,Q,$){let Z=this._bindingsByRootAndName,W=this._bindings,K=Z[Q];if(K===void 0)K={},Z[Q]=K;K[$]=J,J._cacheIndex=W.length,W.push(J)}_removeInactiveBinding(J){let Q=this._bindings,$=J.binding,Z=$.rootNode.uuid,W=$.path,K=this._bindingsByRootAndName,Y=K[Z],H=Q[Q.length-1],X=J._cacheIndex;if(H._cacheIndex=X,Q[X]=H,Q.pop(),delete Y[W],Object.keys(Y).length===0)delete K[Z]}_lendBinding(J){let Q=this._bindings,$=J._cacheIndex,Z=this._nActiveBindings++,W=Q[Z];J._cacheIndex=Z,Q[Z]=J,W._cacheIndex=$,Q[$]=W}_takeBackBinding(J){let Q=this._bindings,$=J._cacheIndex,Z=--this._nActiveBindings,W=Q[Z];J._cacheIndex=Z,Q[Z]=J,W._cacheIndex=$,Q[$]=W}_lendControlInterpolant(){let J=this._controlInterpolants,Q=this._nActiveControlInterpolants++,$=J[Q];if($===void 0)$=new $$(new Float32Array(2),new Float32Array(2),1,p5),$.__cacheIndex=Q,J[Q]=$;return $}_takeBackControlInterpolant(J){let Q=this._controlInterpolants,$=J.__cacheIndex,Z=--this._nActiveControlInterpolants,W=Q[Z];J.__cacheIndex=Z,Q[Z]=J,W.__cacheIndex=$,Q[$]=W}clipAction(J,Q,$){let Z=Q||this._root,W=Z.uuid,K=typeof J==="string"?D7.findByName(Z,J):J,Y=K!==null?K.uuid:J,H=this._actionsByClip[Y],X=null;if($===void 0)if(K!==null)$=K.blendMode;else $=2500;if(H!==void 0){let E=H.actionByRoot[W];if(E!==void 0&&E.blendMode===$)return E;if(X=H.knownActions[0],K===null)K=X._clip}if(K===null)return null;let U=new eW(this,K,Q,$);return this._bindAction(U,X),this._addInactiveAction(U,Y,W),U}existingAction(J,Q){let $=Q||this._root,Z=$.uuid,W=typeof J==="string"?D7.findByName($,J):J,K=W?W.uuid:J,Y=this._actionsByClip[K];if(Y!==void 0)return Y.actionByRoot[Z]||null;return null}stopAllAction(){let J=this._actions,Q=this._nActiveActions;for(let $=Q-1;$>=0;--$)J[$].stop();return this}update(J){J*=this.timeScale;let Q=this._actions,$=this._nActiveActions,Z=this.time+=J,W=Math.sign(J),K=this._accuIndex^=1;for(let X=0;X!==$;++X)Q[X]._update(Z,J,W,K);let Y=this._bindings,H=this._nActiveBindings;for(let X=0;X!==H;++X)Y[X].apply(K);return this}setTime(J){this.time=0;for(let Q=0;Q<this._actions.length;Q++)this._actions[Q].time=0;return this.update(J)}getRoot(){return this._root}uncacheClip(J){let Q=this._actions,$=J.uuid,Z=this._actionsByClip,W=Z[$];if(W!==void 0){let K=W.knownActions;for(let Y=0,H=K.length;Y!==H;++Y){let X=K[Y];this._deactivateAction(X);let U=X._cacheIndex,E=Q[Q.length-1];X._cacheIndex=null,X._byClipCacheIndex=null,E._cacheIndex=U,Q[U]=E,Q.pop(),this._removeInactiveBindingsForAction(X)}delete Z[$]}}uncacheRoot(J){let Q=J.uuid,$=this._actionsByClip;for(let K in $){let Y=$[K].actionByRoot,H=Y[Q];if(H!==void 0)this._deactivateAction(H),this._removeInactiveAction(H)}let Z=this._bindingsByRootAndName,W=Z[Q];if(W!==void 0)for(let K in W){let Y=W[K];Y.restoreOriginalState(),this._removeInactiveBinding(Y)}}uncacheAction(J,Q){let $=this.existingAction(J,Q);if($!==null)this._deactivateAction($),this._removeInactiveAction($)}}class IX extends IQ{constructor(J=1,Q=1,$=1,Z={}){super(J,Q,Z);this.isRenderTarget3D=!0,this.depth=$,this.texture=new Q6(null,J,Q,$),this._setTextureOptions(Z),this.texture.isRenderTargetTexture=!0}}class JK{constructor(J){this.value=J}clone(){return new JK(this.value.clone===void 0?this.value:this.value.clone())}}var m5=0;class _X extends K9{constructor(){super();this.isUniformsGroup=!0,Object.defineProperty(this,"id",{value:m5++}),this.name="",this.usage=35044,this.uniforms=[]}add(J){return this.uniforms.push(J),this}remove(J){let Q=this.uniforms.indexOf(J);if(Q!==-1)this.uniforms.splice(Q,1);return this}setName(J){return this.name=J,this}setUsage(J){return this.usage=J,this}dispose(){this.dispatchEvent({type:"dispose"})}copy(J){this.name=J.name,this.usage=J.usage;let Q=J.uniforms;this.uniforms.length=0;for(let $=0,Z=Q.length;$<Z;$++){let W=Array.isArray(Q[$])?Q[$]:[Q[$]];for(let K=0;K<W.length;K++)this.uniforms.push(W[K].clone())}return this}clone(){return new this.constructor().copy(this)}}class wX extends W6{constructor(J,Q,$=1){super(J,Q);this.isInstancedInterleavedBuffer=!0,this.meshPerAttribute=$}copy(J){return super.copy(J),this.meshPerAttribute=J.meshPerAttribute,this}clone(J){let Q=super.clone(J);return Q.meshPerAttribute=this.meshPerAttribute,Q}toJSON(J){let Q=super.toJSON(J);return Q.isInstancedInterleavedBuffer=!0,Q.meshPerAttribute=this.meshPerAttribute,Q}}class AX{constructor(J,Q,$,Z,W,K=!1){this.isGLBufferAttribute=!0,this.name="",this.buffer=J,this.type=Q,this.itemSize=$,this.elementSize=Z,this.count=W,this.normalized=K,this.version=0}set needsUpdate(J){if(J===!0)this.version++}setBuffer(J){return this.buffer=J,this}setType(J,Q){return this.type=J,this.elementSize=Q,this}setItemSize(J){return this.itemSize=J,this}setCount(J){return this.count=J,this}}var MY=new d0;class CX{constructor(J,Q,$=0,Z=1/0){this.ray=new v8(J,Q),this.near=$,this.far=Z,this.camera=null,this.layers=new $6,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(J,Q){this.ray.set(J,Q)}setFromCamera(J,Q){if(Q.isPerspectiveCamera)this.ray.origin.setFromMatrixPosition(Q.matrixWorld),this.ray.direction.set(J.x,J.y,0.5).unproject(Q).sub(this.ray.origin).normalize(),this.camera=Q;else if(Q.isOrthographicCamera)this.ray.origin.set(J.x,J.y,(Q.near+Q.far)/(Q.near-Q.far)).unproject(Q),this.ray.direction.set(0,0,-1).transformDirection(Q.matrixWorld),this.camera=Q;else T0("Raycaster: Unsupported camera type: "+Q.type)}setFromXRController(J){return MY.identity().extractRotation(J.matrixWorld),this.ray.origin.setFromMatrixPosition(J.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(MY),this}intersectObject(J,Q=!0,$=[]){return ZZ(J,this,$,Q),$.sort(LY),$}intersectObjects(J,Q=!0,$=[]){for(let Z=0,W=J.length;Z<W;Z++)ZZ(J[Z],this,$,Q);return $.sort(LY),$}}function LY(J,Q){return J.distance-Q.distance}function ZZ(J,Q,$,Z){let W=!0;if(J.layers.test(Q.layers)){if(J.raycast(Q,$)===!1)W=!1}if(W===!0&&Z===!0){let K=J.children;for(let Y=0,H=K.length;Y<H;Y++)ZZ(K[Y],Q,$,!0)}}class PX{constructor(J=!0){this.autoStart=J,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1,X0("Clock: This module has been deprecated. Please use THREE.Timer instead.")}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let J=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let Q=performance.now();J=(Q-this.oldTime)/1000,this.oldTime=Q,this.elapsedTime+=J}return J}}class TX{constructor(J=1,Q=0,$=0){this.radius=J,this.phi=Q,this.theta=$}set(J,Q,$){return this.radius=J,this.phi=Q,this.theta=$,this}copy(J){return this.radius=J.radius,this.phi=J.phi,this.theta=J.theta,this}makeSafe(){return this.phi=m0(this.phi,0.000001,Math.PI-0.000001),this}setFromVector3(J){return this.setFromCartesianCoords(J.x,J.y,J.z)}setFromCartesianCoords(J,Q,$){if(this.radius=Math.sqrt(J*J+Q*Q+$*$),this.radius===0)this.theta=0,this.phi=0;else this.theta=Math.atan2(J,$),this.phi=Math.acos(m0(Q/this.radius,-1,1));return this}clone(){return new this.constructor().copy(this)}}class SX{constructor(J=1,Q=0,$=0){this.radius=J,this.theta=Q,this.y=$}set(J,Q,$){return this.radius=J,this.theta=Q,this.y=$,this}copy(J){return this.radius=J.radius,this.theta=J.theta,this.y=J.y,this}setFromVector3(J){return this.setFromCartesianCoords(J.x,J.y,J.z)}setFromCartesianCoords(J,Q,$){return this.radius=Math.sqrt(J*J+$*$),this.theta=Math.atan2(J,$),this.y=Q,this}clone(){return new this.constructor().copy(this)}}class QK{static{QK.prototype.isMatrix2=!0}constructor(J,Q,$,Z){if(this.elements=[1,0,0,1],J!==void 0)this.set(J,Q,$,Z)}identity(){return this.set(1,0,0,1),this}fromArray(J,Q=0){for(let $=0;$<4;$++)this.elements[$]=J[$+Q];return this}set(J,Q,$,Z){let W=this.elements;return W[0]=J,W[2]=Q,W[1]=$,W[3]=Z,this}}var VY=new r;class jX{constructor(J=new r(1/0,1/0),Q=new r(-1/0,-1/0)){this.isBox2=!0,this.min=J,this.max=Q}set(J,Q){return this.min.copy(J),this.max.copy(Q),this}setFromPoints(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q++)this.expandByPoint(J[Q]);return this}setFromCenterAndSize(J,Q){let $=VY.copy(Q).multiplyScalar(0.5);return this.min.copy(J).sub($),this.max.copy(J).add($),this}clone(){return new this.constructor().copy(this)}copy(J){return this.min.copy(J.min),this.max.copy(J.max),this}makeEmpty(){return this.min.x=this.min.y=1/0,this.max.x=this.max.y=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y}getCenter(J){return this.isEmpty()?J.set(0,0):J.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize(J){return this.isEmpty()?J.set(0,0):J.subVectors(this.max,this.min)}expandByPoint(J){return this.min.min(J),this.max.max(J),this}expandByVector(J){return this.min.sub(J),this.max.add(J),this}expandByScalar(J){return this.min.addScalar(-J),this.max.addScalar(J),this}containsPoint(J){return J.x>=this.min.x&&J.x<=this.max.x&&J.y>=this.min.y&&J.y<=this.max.y}containsBox(J){return this.min.x<=J.min.x&&J.max.x<=this.max.x&&this.min.y<=J.min.y&&J.max.y<=this.max.y}getParameter(J,Q){return Q.set((J.x-this.min.x)/(this.max.x-this.min.x),(J.y-this.min.y)/(this.max.y-this.min.y))}intersectsBox(J){return J.max.x>=this.min.x&&J.min.x<=this.max.x&&J.max.y>=this.min.y&&J.min.y<=this.max.y}clampPoint(J,Q){return Q.copy(J).clamp(this.min,this.max)}distanceToPoint(J){return this.clampPoint(J,VY).distanceTo(J)}intersect(J){if(this.min.max(J.min),this.max.min(J.max),this.isEmpty())this.makeEmpty();return this}union(J){return this.min.min(J.min),this.max.max(J.max),this}translate(J){return this.min.add(J),this.max.add(J),this}equals(J){return J.min.equals(this.min)&&J.max.equals(this.max)}}var BY=new P,QQ=new P,Y7=new P,H7=new P,a$=new P,d5=new P,l5=new P;class yX{constructor(J=new P,Q=new P){this.start=J,this.end=Q}set(J,Q){return this.start.copy(J),this.end.copy(Q),this}copy(J){return this.start.copy(J.start),this.end.copy(J.end),this}getCenter(J){return J.addVectors(this.start,this.end).multiplyScalar(0.5)}delta(J){return J.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(J,Q){return this.delta(Q).multiplyScalar(J).add(this.start)}closestPointToPointParameter(J,Q){BY.subVectors(J,this.start),QQ.subVectors(this.end,this.start);let $=QQ.dot(QQ);if($===0)return 0;let W=QQ.dot(BY)/$;if(Q)W=m0(W,0,1);return W}closestPointToPoint(J,Q,$){let Z=this.closestPointToPointParameter(J,Q);return this.delta($).multiplyScalar(Z).add(this.start)}distanceSqToLine3(J,Q=d5,$=l5){let W,K,Y=this.start,H=J.start,X=this.end,U=J.end;Y7.subVectors(X,Y),H7.subVectors(U,H),a$.subVectors(Y,H);let E=Y7.dot(Y7),N=H7.dot(H7),G=H7.dot(a$);if(E<=0.00000000000000010000000000000001&&N<=0.00000000000000010000000000000001)return Q.copy(Y),$.copy(H),Q.sub($),Q.dot(Q);if(E<=0.00000000000000010000000000000001)W=0,K=G/N,K=m0(K,0,1);else{let q=Y7.dot(a$);if(N<=0.00000000000000010000000000000001)K=0,W=m0(-q/E,0,1);else{let O=Y7.dot(H7),R=E*N-O*O;if(R!==0)W=m0((O*G-q*N)/R,0,1);else W=0;if(K=(O*W+G)/N,K<0)K=0,W=m0(-q/E,0,1);else if(K>1)K=1,W=m0((O-q)/E,0,1)}}return Q.copy(Y).addScaledVector(Y7,W),$.copy(H).addScaledVector(H7,K),Q.distanceToSquared($)}applyMatrix4(J){return this.start.applyMatrix4(J),this.end.applyMatrix4(J),this}equals(J){return J.start.equals(this.start)&&J.end.equals(this.end)}clone(){return new this.constructor().copy(this)}}var zY=new P;class vX extends HJ{constructor(J,Q){super();this.light=J,this.matrixAutoUpdate=!1,this.color=Q,this.type="SpotLightHelper";let $=new n0,Z=[0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,-1,0,1,0,0,0,0,1,1,0,0,0,0,-1,1];for(let K=0,Y=1,H=32;K<H;K++,Y++){let X=K/H*Math.PI*2,U=Y/H*Math.PI*2;Z.push(Math.cos(X),Math.sin(X),1,Math.cos(U),Math.sin(U),1)}$.setAttribute("position",new I0(Z,3));let W=new gJ({fog:!1,toneMapped:!1});this.cone=new F9($,W),this.add(this.cone),this.update()}dispose(){this.cone.geometry.dispose(),this.cone.material.dispose()}update(){if(this.light.updateWorldMatrix(!0,!1),this.light.target.updateWorldMatrix(!0,!1),this.parent)this.parent.updateWorldMatrix(!0),this.matrix.copy(this.parent.matrixWorld).invert().multiply(this.light.matrixWorld);else this.matrix.copy(this.light.matrixWorld);this.matrixWorld.copy(this.light.matrixWorld);let J=this.light.distance?this.light.distance:1000,Q=J*Math.tan(this.light.angle);if(this.cone.scale.set(Q,Q,J),zY.setFromMatrixPosition(this.light.target.matrixWorld),this.cone.lookAt(zY),this.color!==void 0)this.cone.material.color.set(this.color);else this.cone.material.color.copy(this.light.color)}}var t9=new P,$Q=new d0,r$=new d0;class fX extends F9{constructor(J){let Q=bX(J),$=new n0,Z=[],W=[];for(let X=0;X<Q.length;X++){let U=Q[X];if(U.parent&&U.parent.isBone)Z.push(0,0,0),Z.push(0,0,0),W.push(0,0,0),W.push(0,0,0)}$.setAttribute("position",new I0(Z,3)),$.setAttribute("color",new I0(W,3));let K=new gJ({vertexColors:!0,depthTest:!1,depthWrite:!1,toneMapped:!1,transparent:!0});super($,K);this.isSkeletonHelper=!0,this.type="SkeletonHelper",this.root=J,this.bones=Q,this.matrix=J.matrixWorld,this.matrixAutoUpdate=!1;let Y=new V0(255),H=new V0(65280);this.setColors(Y,H)}updateMatrixWorld(J){let Q=this.bones,$=this.geometry,Z=$.getAttribute("position");r$.copy(this.root.matrixWorld).invert();for(let W=0,K=0;W<Q.length;W++){let Y=Q[W];if(Y.parent&&Y.parent.isBone)$Q.multiplyMatrices(r$,Y.matrixWorld),t9.setFromMatrixPosition($Q),Z.setXYZ(K,t9.x,t9.y,t9.z),$Q.multiplyMatrices(r$,Y.parent.matrixWorld),t9.setFromMatrixPosition($Q),Z.setXYZ(K+1,t9.x,t9.y,t9.z),K+=2}$.getAttribute("position").needsUpdate=!0,super.updateMatrixWorld(J)}setColors(J,Q){let Z=this.geometry.getAttribute("color");for(let W=0;W<Z.count;W+=2)Z.setXYZ(W,J.r,J.g,J.b),Z.setXYZ(W+1,Q.r,Q.g,Q.b);return Z.needsUpdate=!0,this}dispose(){this.geometry.dispose(),this.material.dispose()}}function bX(J){let Q=[];if(J.isBone===!0)Q.push(J);for(let $=0;$<J.children.length;$++)Q.push(...bX(J.children[$]));return Q}class hX extends IJ{constructor(J,Q,$){let Z=new G6(Q,4,2),W=new m9({wireframe:!0,fog:!1,toneMapped:!1});super(Z,W);this.light=J,this.color=$,this.type="PointLightHelper",this.matrix=this.light.matrixWorld,this.matrixAutoUpdate=!1,this.update()}dispose(){this.geometry.dispose(),this.material.dispose()}update(){if(this.light.updateWorldMatrix(!0,!1),this.color!==void 0)this.material.color.set(this.color);else this.material.color.copy(this.light.color)}}var u5=new P,IY=new V0,_Y=new V0;class xX extends HJ{constructor(J,Q,$){super();this.light=J,this.matrix=J.matrixWorld,this.matrixAutoUpdate=!1,this.color=$,this.type="HemisphereLightHelper";let Z=new U6(Q);if(Z.rotateY(Math.PI*0.5),this.material=new m9({wireframe:!0,fog:!1,toneMapped:!1}),this.color===void 0)this.material.vertexColors=!0;let W=Z.getAttribute("position"),K=new Float32Array(W.count*3);Z.setAttribute("color",new UJ(K,3)),this.add(new IJ(Z,this.material)),this.update()}dispose(){this.children[0].geometry.dispose(),this.children[0].material.dispose()}update(){let J=this.children[0];if(this.color!==void 0)this.material.color.set(this.color);else{let Q=J.geometry.getAttribute("color");IY.copy(this.light.color),_Y.copy(this.light.groundColor);for(let $=0,Z=Q.count;$<Z;$++){let W=$<Z/2?IY:_Y;Q.setXYZ($,W.r,W.g,W.b)}Q.needsUpdate=!0}this.light.updateWorldMatrix(!0,!1),J.lookAt(u5.setFromMatrixPosition(this.light.matrixWorld).negate())}}class gX extends F9{constructor(J=10,Q=10,$=4473924,Z=8947848){$=new V0($),Z=new V0(Z);let W=Q/2,K=J/Q,Y=J/2,H=[],X=[];for(let N=0,G=0,q=-Y;N<=Q;N++,q+=K){H.push(-Y,0,q,Y,0,q),H.push(q,0,-Y,q,0,Y);let O=N===W?$:Z;O.toArray(X,G),G+=3,O.toArray(X,G),G+=3,O.toArray(X,G),G+=3,O.toArray(X,G),G+=3}let U=new n0;U.setAttribute("position",new I0(H,3)),U.setAttribute("color",new I0(X,3));let E=new gJ({vertexColors:!0,toneMapped:!1});super(U,E);this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}class pX extends F9{constructor(J=10,Q=16,$=8,Z=64,W=4473924,K=8947848){W=new V0(W),K=new V0(K);let Y=[],H=[];if(Q>1)for(let E=0;E<Q;E++){let N=E/Q*(Math.PI*2),G=Math.sin(N)*J,q=Math.cos(N)*J;Y.push(0,0,0),Y.push(G,0,q);let O=E&1?W:K;H.push(O.r,O.g,O.b),H.push(O.r,O.g,O.b)}for(let E=0;E<$;E++){let N=E&1?W:K,G=J-J/$*E;for(let q=0;q<Z;q++){let O=q/Z*(Math.PI*2),R=Math.sin(O)*G,F=Math.cos(O)*G;Y.push(R,0,F),H.push(N.r,N.g,N.b),O=(q+1)/Z*(Math.PI*2),R=Math.sin(O)*G,F=Math.cos(O)*G,Y.push(R,0,F),H.push(N.r,N.g,N.b)}}let X=new n0;X.setAttribute("position",new I0(Y,3)),X.setAttribute("color",new I0(H,3));let U=new gJ({vertexColors:!0,toneMapped:!1});super(X,U);this.type="PolarGridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}var wY=new P,ZQ=new P,AY=new P;class mX extends HJ{constructor(J,Q,$){super();if(this.light=J,this.matrix=J.matrixWorld,this.matrixAutoUpdate=!1,this.color=$,this.type="DirectionalLightHelper",Q===void 0)Q=1;let Z=new n0;Z.setAttribute("position",new I0([-Q,Q,0,Q,Q,0,Q,-Q,0,-Q,-Q,0,-Q,Q,0],3));let W=new gJ({fog:!1,toneMapped:!1});this.lightPlane=new x9(Z,W),this.add(this.lightPlane),Z=new n0,Z.setAttribute("position",new I0([0,0,0,0,0,1],3)),this.targetLine=new x9(Z,W),this.add(this.targetLine),this.update()}dispose(){this.lightPlane.geometry.dispose(),this.lightPlane.material.dispose(),this.targetLine.geometry.dispose(),this.targetLine.material.dispose()}update(){if(this.light.updateWorldMatrix(!0,!1),this.light.target.updateWorldMatrix(!0,!1),wY.setFromMatrixPosition(this.light.matrixWorld),ZQ.setFromMatrixPosition(this.light.target.matrixWorld),AY.subVectors(ZQ,wY),this.lightPlane.lookAt(ZQ),this.color!==void 0)this.lightPlane.material.color.set(this.color),this.targetLine.material.color.set(this.color);else this.lightPlane.material.color.copy(this.light.color),this.targetLine.material.color.copy(this.light.color);this.targetLine.lookAt(ZQ),this.targetLine.scale.z=AY.length()}}var WQ=new P,LJ=new E6;class dX extends F9{constructor(J){let Q=new n0,$=new gJ({color:16777215,vertexColors:!0,toneMapped:!1}),Z=[],W=[],K={};Y("n1","n2"),Y("n2","n4"),Y("n4","n3"),Y("n3","n1"),Y("f1","f2"),Y("f2","f4"),Y("f4","f3"),Y("f3","f1"),Y("n1","f1"),Y("n2","f2"),Y("n3","f3"),Y("n4","f4"),Y("p","n1"),Y("p","n2"),Y("p","n3"),Y("p","n4"),Y("u1","u2"),Y("u2","u3"),Y("u3","u1"),Y("c","t"),Y("p","c"),Y("cn1","cn2"),Y("cn3","cn4"),Y("cf1","cf2"),Y("cf3","cf4");function Y(q,O){H(q),H(O)}function H(q){if(Z.push(0,0,0),W.push(0,0,0),K[q]===void 0)K[q]=[];K[q].push(Z.length/3-1)}Q.setAttribute("position",new I0(Z,3)),Q.setAttribute("color",new I0(W,3));super(Q,$);if(this.type="CameraHelper",this.camera=J,this.camera.updateProjectionMatrix)this.camera.updateProjectionMatrix();this.matrix=J.matrixWorld,this.matrixAutoUpdate=!1,this.pointMap=K,this.update();let X=new V0(16755200),U=new V0(16711680),E=new V0(43775),N=new V0(16777215),G=new V0(3355443);this.setColors(X,U,E,N,G)}setColors(J,Q,$,Z,W){let Y=this.geometry.getAttribute("color");return Y.setXYZ(0,J.r,J.g,J.b),Y.setXYZ(1,J.r,J.g,J.b),Y.setXYZ(2,J.r,J.g,J.b),Y.setXYZ(3,J.r,J.g,J.b),Y.setXYZ(4,J.r,J.g,J.b),Y.setXYZ(5,J.r,J.g,J.b),Y.setXYZ(6,J.r,J.g,J.b),Y.setXYZ(7,J.r,J.g,J.b),Y.setXYZ(8,J.r,J.g,J.b),Y.setXYZ(9,J.r,J.g,J.b),Y.setXYZ(10,J.r,J.g,J.b),Y.setXYZ(11,J.r,J.g,J.b),Y.setXYZ(12,J.r,J.g,J.b),Y.setXYZ(13,J.r,J.g,J.b),Y.setXYZ(14,J.r,J.g,J.b),Y.setXYZ(15,J.r,J.g,J.b),Y.setXYZ(16,J.r,J.g,J.b),Y.setXYZ(17,J.r,J.g,J.b),Y.setXYZ(18,J.r,J.g,J.b),Y.setXYZ(19,J.r,J.g,J.b),Y.setXYZ(20,J.r,J.g,J.b),Y.setXYZ(21,J.r,J.g,J.b),Y.setXYZ(22,J.r,J.g,J.b),Y.setXYZ(23,J.r,J.g,J.b),Y.setXYZ(24,Q.r,Q.g,Q.b),Y.setXYZ(25,Q.r,Q.g,Q.b),Y.setXYZ(26,Q.r,Q.g,Q.b),Y.setXYZ(27,Q.r,Q.g,Q.b),Y.setXYZ(28,Q.r,Q.g,Q.b),Y.setXYZ(29,Q.r,Q.g,Q.b),Y.setXYZ(30,Q.r,Q.g,Q.b),Y.setXYZ(31,Q.r,Q.g,Q.b),Y.setXYZ(32,$.r,$.g,$.b),Y.setXYZ(33,$.r,$.g,$.b),Y.setXYZ(34,$.r,$.g,$.b),Y.setXYZ(35,$.r,$.g,$.b),Y.setXYZ(36,$.r,$.g,$.b),Y.setXYZ(37,$.r,$.g,$.b),Y.setXYZ(38,Z.r,Z.g,Z.b),Y.setXYZ(39,Z.r,Z.g,Z.b),Y.setXYZ(40,W.r,W.g,W.b),Y.setXYZ(41,W.r,W.g,W.b),Y.setXYZ(42,W.r,W.g,W.b),Y.setXYZ(43,W.r,W.g,W.b),Y.setXYZ(44,W.r,W.g,W.b),Y.setXYZ(45,W.r,W.g,W.b),Y.setXYZ(46,W.r,W.g,W.b),Y.setXYZ(47,W.r,W.g,W.b),Y.setXYZ(48,W.r,W.g,W.b),Y.setXYZ(49,W.r,W.g,W.b),Y.needsUpdate=!0,this}update(){let J=this.geometry,Q=this.pointMap,$=1,Z=1,W,K;if(LJ.projectionMatrixInverse.copy(this.camera.projectionMatrixInverse),this.camera.reversedDepth===!0)W=1,K=0;else if(this.camera.coordinateSystem===2000)W=-1,K=1;else if(this.camera.coordinateSystem===2001)W=0,K=1;else throw Error("THREE.CameraHelper.update(): Invalid coordinate system: "+this.camera.coordinateSystem);zJ("c",Q,J,LJ,0,0,W),zJ("t",Q,J,LJ,0,0,K),zJ("n1",Q,J,LJ,-1,-1,W),zJ("n2",Q,J,LJ,1,-1,W),zJ("n3",Q,J,LJ,-1,1,W),zJ("n4",Q,J,LJ,1,1,W),zJ("f1",Q,J,LJ,-1,-1,K),zJ("f2",Q,J,LJ,1,-1,K),zJ("f3",Q,J,LJ,-1,1,K),zJ("f4",Q,J,LJ,1,1,K),zJ("u1",Q,J,LJ,0.7,1.1,W),zJ("u2",Q,J,LJ,-0.7,1.1,W),zJ("u3",Q,J,LJ,0,2,W),zJ("cf1",Q,J,LJ,-1,0,K),zJ("cf2",Q,J,LJ,1,0,K),zJ("cf3",Q,J,LJ,0,-1,K),zJ("cf4",Q,J,LJ,0,1,K),zJ("cn1",Q,J,LJ,-1,0,W),zJ("cn2",Q,J,LJ,1,0,W),zJ("cn3",Q,J,LJ,0,-1,W),zJ("cn4",Q,J,LJ,0,1,W),J.getAttribute("position").needsUpdate=!0}dispose(){this.geometry.dispose(),this.material.dispose()}}function zJ(J,Q,$,Z,W,K,Y){WQ.set(W,K,Y).unproject(Z);let H=Q[J];if(H!==void 0){let X=$.getAttribute("position");for(let U=0,E=H.length;U<E;U++)X.setXYZ(H[U],WQ.x,WQ.y,WQ.z)}}var KQ=new jJ;class lX extends F9{constructor(J,Q=16776960){let $=new Uint16Array([0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]),Z=new Float32Array(24),W=new n0;W.setIndex(new UJ($,1)),W.setAttribute("position",new UJ(Z,3));super(W,new gJ({color:Q,toneMapped:!1}));this.object=J,this.type="BoxHelper",this.matrixAutoUpdate=!1,this.update()}update(){if(this.object!==void 0)KQ.setFromObject(this.object);if(KQ.isEmpty())return;let{min:J,max:Q}=KQ,$=this.geometry.attributes.position,Z=$.array;Z[0]=Q.x,Z[1]=Q.y,Z[2]=Q.z,Z[3]=J.x,Z[4]=Q.y,Z[5]=Q.z,Z[6]=J.x,Z[7]=J.y,Z[8]=Q.z,Z[9]=Q.x,Z[10]=J.y,Z[11]=Q.z,Z[12]=Q.x,Z[13]=Q.y,Z[14]=J.z,Z[15]=J.x,Z[16]=Q.y,Z[17]=J.z,Z[18]=J.x,Z[19]=J.y,Z[20]=J.z,Z[21]=Q.x,Z[22]=J.y,Z[23]=J.z,$.needsUpdate=!0,this.geometry.computeBoundingSphere()}setFromObject(J){return this.object=J,this.update(),this}copy(J,Q){return super.copy(J,Q),this.object=J.object,this}dispose(){this.geometry.dispose(),this.material.dispose()}}class uX extends F9{constructor(J,Q=16776960){let $=new Uint16Array([0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]),Z=[1,1,1,-1,1,1,-1,-1,1,1,-1,1,1,1,-1,-1,1,-1,-1,-1,-1,1,-1,-1],W=new n0;W.setIndex(new UJ($,1)),W.setAttribute("position",new I0(Z,3));super(W,new gJ({color:Q,toneMapped:!1}));this.box=J,this.type="Box3Helper",this.geometry.computeBoundingSphere()}updateMatrixWorld(J){let Q=this.box;if(Q.isEmpty())return;Q.getCenter(this.position),Q.getSize(this.scale),this.scale.multiplyScalar(0.5),super.updateMatrixWorld(J)}dispose(){this.geometry.dispose(),this.material.dispose()}}class cX extends x9{constructor(J,Q=1,$=16776960){let Z=$,W=[1,-1,0,-1,1,0,-1,-1,0,1,1,0,-1,1,0,-1,-1,0,1,-1,0,1,1,0],K=new n0;K.setAttribute("position",new I0(W,3)),K.computeBoundingSphere();super(K,new gJ({color:Z,toneMapped:!1}));this.type="PlaneHelper",this.plane=J,this.size=Q;let Y=[1,1,0,-1,1,0,-1,-1,0,1,1,0,-1,-1,0,1,-1,0],H=new n0;H.setAttribute("position",new I0(Y,3)),H.computeBoundingSphere(),this.add(new IJ(H,new m9({color:Z,opacity:0.2,transparent:!0,depthWrite:!1,toneMapped:!1})))}updateMatrixWorld(J){this.position.set(0,0,0),this.scale.set(0.5*this.size,0.5*this.size,1),this.lookAt(this.plane.normal),this.translateZ(-this.plane.constant),super.updateMatrixWorld(J)}dispose(){this.geometry.dispose(),this.material.dispose(),this.children[0].geometry.dispose(),this.children[0].material.dispose()}}var CY=new P,YQ,t$;class nX extends HJ{constructor(J=new P(0,0,1),Q=new P(0,0,0),$=1,Z=16776960,W=$*0.2,K=W*0.2){super();if(this.type="ArrowHelper",YQ===void 0)YQ=new n0,YQ.setAttribute("position",new I0([0,0,0,0,1,0],3)),t$=new H6(0.5,1,5,1),t$.translate(0,-0.5,0);this.position.copy(Q),this.line=new x9(YQ,new gJ({color:Z,toneMapped:!1})),this.line.matrixAutoUpdate=!1,this.add(this.line),this.cone=new IJ(t$,new m9({color:Z,toneMapped:!1})),this.cone.matrixAutoUpdate=!1,this.add(this.cone),this.setDirection(J),this.setLength($,W,K)}setDirection(J){if(J.y>0.99999)this.quaternion.set(0,0,0,1);else if(J.y<-0.99999)this.quaternion.set(1,0,0,0);else{CY.set(J.z,0,-J.x).normalize();let Q=Math.acos(J.y);this.quaternion.setFromAxisAngle(CY,Q)}}setLength(J,Q=J*0.2,$=Q*0.2){this.line.scale.set(1,Math.max(0.0001,J-Q),1),this.line.updateMatrix(),this.cone.scale.set($,Q,$),this.cone.position.y=J,this.cone.updateMatrix()}setColor(J){this.line.material.color.set(J),this.cone.material.color.set(J)}copy(J){return super.copy(J,!1),this.line.copy(J.line),this.cone.copy(J.cone),this}dispose(){this.line.geometry.dispose(),this.line.material.dispose(),this.cone.geometry.dispose(),this.cone.material.dispose()}}class sX extends F9{constructor(J=1){let Q=[0,0,0,J,0,0,0,0,0,0,J,0,0,0,0,0,0,J],$=[1,0,0,1,0.6,0,0,1,0,0.6,1,0,0,0,1,0,0.6,1],Z=new n0;Z.setAttribute("position",new I0(Q,3)),Z.setAttribute("color",new I0($,3));let W=new gJ({vertexColors:!0,toneMapped:!1});super(Z,W);this.type="AxesHelper"}setColors(J,Q,$){let Z=new V0,W=this.geometry.attributes.color.array;return Z.set(J),Z.toArray(W,0),Z.toArray(W,3),Z.set(Q),Z.toArray(W,6),Z.toArray(W,9),Z.set($),Z.toArray(W,12),Z.toArray(W,15),this.geometry.attributes.color.needsUpdate=!0,this}dispose(){this.geometry.dispose(),this.material.dispose()}}class iX{constructor(){this.type="ShapePath",this.color=new V0,this.subPaths=[],this.currentPath=null}moveTo(J,Q){return this.currentPath=new c7,this.subPaths.push(this.currentPath),this.currentPath.moveTo(J,Q),this}lineTo(J,Q){return this.currentPath.lineTo(J,Q),this}quadraticCurveTo(J,Q,$,Z){return this.currentPath.quadraticCurveTo(J,Q,$,Z),this}bezierCurveTo(J,Q,$,Z,W,K){return this.currentPath.bezierCurveTo(J,Q,$,Z,W,K),this}splineThru(J){return this.currentPath.splineThru(J),this}toShapes(J){function Q(F){let D=[];for(let k=0,M=F.length;k<M;k++){let V=F[k],_=new e9;_.curves=V.curves,D.push(_)}return D}function $(F,D){let k=D.length,M=!1;for(let V=k-1,_=0;_<k;V=_++){let A=D[V],C=D[_],L=C.x-A.x,I=C.y-A.y;if(Math.abs(I)>Number.EPSILON){if(I<0)A=D[_],L=-L,C=D[V],I=-I;if(F.y<A.y||F.y>C.y)continue;if(F.y===A.y){if(F.x===A.x)return!0}else{let b=I*(F.x-A.x)-L*(F.y-A.y);if(b===0)return!0;if(b<0)continue;M=!M}}else{if(F.y!==A.y)continue;if(C.x<=F.x&&F.x<=A.x||A.x<=F.x&&F.x<=C.x)return!0}}return M}let Z=E9.isClockWise,W=this.subPaths;if(W.length===0)return[];let K,Y,H,X=[];if(W.length===1)return Y=W[0],H=new e9,H.curves=Y.curves,X.push(H),X;let U=!Z(W[0].getPoints());U=J?!U:U;let E=[],N=[],G=[],q=0,O;N[q]=void 0,G[q]=[];for(let F=0,D=W.length;F<D;F++)if(Y=W[F],O=Y.getPoints(),K=Z(O),K=J?!K:K,K){if(!U&&N[q])q++;if(N[q]={s:new e9,p:O},N[q].s.curves=Y.curves,U)q++;G[q]=[]}else G[q].push({h:Y,p:O[0]});if(!N[0])return Q(W);if(N.length>1){let F=!1,D=0;for(let k=0,M=N.length;k<M;k++)E[k]=[];for(let k=0,M=N.length;k<M;k++){let V=G[k];for(let _=0;_<V.length;_++){let A=V[_],C=!0;for(let L=0;L<N.length;L++)if($(A.p,N[L].p)){if(k!==L)D++;if(C)C=!1,E[L].push(A);else F=!0}if(C)E[k].push(A)}}if(D>0&&F===!1)G=E}let R;for(let F=0,D=N.length;F<D;F++){H=N[F].s,X.push(H),R=G[F];for(let k=0,M=R.length;k<M;k++)H.holes.push(R[k].h)}return X}}class oX extends K9{constructor(J,Q=null){super();this.object=J,this.domElement=Q,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(J){if(J===void 0){X0("Controls: connect() now requires an element.");return}if(this.domElement!==null)this.disconnect();this.domElement=J}disconnect(){}dispose(){}update(){}}function c5(J,Q){let $=J.image&&J.image.width?J.image.width/J.image.height:1;if($>Q)J.repeat.x=1,J.repeat.y=$/Q,J.offset.x=0,J.offset.y=(1-J.repeat.y)/2;else J.repeat.x=Q/$,J.repeat.y=1,J.offset.x=(1-J.repeat.x)/2,J.offset.y=0;return J}function n5(J,Q){let $=J.image&&J.image.width?J.image.width/J.image.height:1;if($>Q)J.repeat.x=Q/$,J.repeat.y=1,J.offset.x=(1-J.repeat.x)/2,J.offset.y=0;else J.repeat.x=1,J.repeat.y=$/Q,J.offset.x=0,J.offset.y=(1-J.repeat.y)/2;return J}function s5(J){return J.repeat.x=1,J.repeat.y=1,J.offset.x=0,J.offset.y=0,J}function U$(J,Q,$,Z){let W=i5(Z);switch($){case 1021:return J*Q;case 1028:return J*Q/W.components*W.byteLength;case 1029:return J*Q/W.components*W.byteLength;case 1030:return J*Q*2/W.components*W.byteLength;case 1031:return J*Q*2/W.components*W.byteLength;case 1022:return J*Q*3/W.components*W.byteLength;case 1023:return J*Q*4/W.components*W.byteLength;case 1033:return J*Q*4/W.components*W.byteLength;case 33776:case 33777:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*8;case 33778:case 33779:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 35841:case 35843:return Math.max(J,16)*Math.max(Q,8)/4;case 35840:case 35842:return Math.max(J,8)*Math.max(Q,8)/2;case 36196:case 37492:case 37488:case 37489:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*8;case 37496:case 37490:case 37491:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 37808:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 37809:return Math.floor((J+4)/5)*Math.floor((Q+3)/4)*16;case 37810:return Math.floor((J+4)/5)*Math.floor((Q+4)/5)*16;case 37811:return Math.floor((J+5)/6)*Math.floor((Q+4)/5)*16;case 37812:return Math.floor((J+5)/6)*Math.floor((Q+5)/6)*16;case 37813:return Math.floor((J+7)/8)*Math.floor((Q+4)/5)*16;case 37814:return Math.floor((J+7)/8)*Math.floor((Q+5)/6)*16;case 37815:return Math.floor((J+7)/8)*Math.floor((Q+7)/8)*16;case 37816:return Math.floor((J+9)/10)*Math.floor((Q+4)/5)*16;case 37817:return Math.floor((J+9)/10)*Math.floor((Q+5)/6)*16;case 37818:return Math.floor((J+9)/10)*Math.floor((Q+7)/8)*16;case 37819:return Math.floor((J+9)/10)*Math.floor((Q+9)/10)*16;case 37820:return Math.floor((J+11)/12)*Math.floor((Q+9)/10)*16;case 37821:return Math.floor((J+11)/12)*Math.floor((Q+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(J/4)*Math.ceil(Q/4)*16;case 36283:case 36284:return Math.ceil(J/4)*Math.ceil(Q/4)*8;case 36285:case 36286:return Math.ceil(J/4)*Math.ceil(Q/4)*16}throw Error(`Unable to determine texture byte length for ${$} format.`)}function i5(J){switch(J){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:case 35899:return{byteLength:4,components:3}}throw Error(`Unknown texture type ${J}.`)}class aX{static contain(J,Q){return c5(J,Q)}static cover(J,Q){return n5(J,Q)}static fill(J){return s5(J)}static getByteLength(J,Q,$,Z){return U$(J,Q,$,Z)}}if(typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"184"}}));if(typeof window<"u")if(window.__THREE__)X0("WARNING: Multiple instances of Three.js being imported.");else window.__THREE__="184";function MU(){let J=null,Q=!1,$=null,Z=null;function W(K,Y){$(K,Y),Z=J.requestAnimationFrame(W)}return{start:function(){if(Q===!0)return;if($===null)return;if(J===null)return;Z=J.requestAnimationFrame(W),Q=!0},stop:function(){if(J!==null)J.cancelAnimationFrame(Z);Q=!1},setAnimationLoop:function(K){$=K},setContext:function(K){J=K}}}function o5(J){let Q=new WeakMap;function $(H,X){let{array:U,usage:E}=H,N=U.byteLength,G=J.createBuffer();J.bindBuffer(X,G),J.bufferData(X,U,E),H.onUploadCallback();let q;if(U instanceof Float32Array)q=J.FLOAT;else if(typeof Float16Array<"u"&&U instanceof Float16Array)q=J.HALF_FLOAT;else if(U instanceof Uint16Array)if(H.isFloat16BufferAttribute)q=J.HALF_FLOAT;else q=J.UNSIGNED_SHORT;else if(U instanceof Int16Array)q=J.SHORT;else if(U instanceof Uint32Array)q=J.UNSIGNED_INT;else if(U instanceof Int32Array)q=J.INT;else if(U instanceof Int8Array)q=J.BYTE;else if(U instanceof Uint8Array)q=J.UNSIGNED_BYTE;else if(U instanceof Uint8ClampedArray)q=J.UNSIGNED_BYTE;else throw Error("THREE.WebGLAttributes: Unsupported buffer data format: "+U);return{buffer:G,type:q,bytesPerElement:U.BYTES_PER_ELEMENT,version:H.version,size:N}}function Z(H,X,U){let{array:E,updateRanges:N}=X;if(J.bindBuffer(U,H),N.length===0)J.bufferSubData(U,0,E);else{N.sort((q,O)=>q.start-O.start);let G=0;for(let q=1;q<N.length;q++){let O=N[G],R=N[q];if(R.start<=O.start+O.count+1)O.count=Math.max(O.count,R.start+R.count-O.start);else++G,N[G]=R}N.length=G+1;for(let q=0,O=N.length;q<O;q++){let R=N[q];J.bufferSubData(U,R.start*E.BYTES_PER_ELEMENT,E,R.start,R.count)}X.clearUpdateRanges()}X.onUploadCallback()}function W(H){if(H.isInterleavedBufferAttribute)H=H.data;return Q.get(H)}function K(H){if(H.isInterleavedBufferAttribute)H=H.data;let X=Q.get(H);if(X)J.deleteBuffer(X.buffer),Q.delete(H)}function Y(H,X){if(H.isInterleavedBufferAttribute)H=H.data;if(H.isGLBufferAttribute){let E=Q.get(H);if(!E||E.version<H.version)Q.set(H,{buffer:H.buffer,type:H.type,bytesPerElement:H.elementSize,version:H.version});return}let U=Q.get(H);if(U===void 0)Q.set(H,$(H,X));else if(U.version<H.version){if(U.size!==H.array.byteLength)throw Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");Z(U.buffer,H,X),U.version=H.version}}return{get:W,remove:K,update:Y}}var a5=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,r5=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,t5=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,e5=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,JN=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,QN=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,$N=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,ZN=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,WN=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,KN=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,YN=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,HN=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,XN=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,UN=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,GN=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,EN=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,NN=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,qN=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,DN=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,FN=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,ON=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,RN=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,kN=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,MN=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,LN=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,VN=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,BN=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,zN=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,IN=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,_N=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,wN="gl_FragColor = linearToOutputTexel( gl_FragColor );",AN=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,CN=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,PN=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,TN=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,SN=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,jN=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,yN=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,vN=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fN=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,bN=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,hN=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,xN=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,gN=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,pN=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,mN=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,dN=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,lN=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,uN=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,cN=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,nN=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,sN=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,iN=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,oN=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = inverseTransformDirection( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,aN=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,rN=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,tN=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,eN=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Jq=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Qq=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,$q=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Zq=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Wq=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Kq=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Yq=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Hq=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Xq=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Uq=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Gq=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Eq=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Nq=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,qq=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Dq=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Fq=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Oq=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Rq=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,kq=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Mq=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Lq=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Vq=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Bq=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,zq=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Iq=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,_q=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,wq=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Aq=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Cq=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Pq=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Tq=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Sq=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,jq=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,yq=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,vq=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,fq=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,bq=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,hq=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,xq=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,gq=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,pq=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,mq=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,dq=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,lq=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,uq=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,cq=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,nq=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,sq=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,iq=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,oq=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,aq=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,rq=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,tq=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,eq=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,JD=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,QD=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,$D=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,ZD=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,WD=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,KD=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,YD=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,HD=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,XD=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,UD=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,GD=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,ED=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ND=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,qD=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,DD=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,FD=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,OD=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,RD=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,kD=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,MD=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,LD=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,VD=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,BD=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,zD=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ID=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,_D=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,wD=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,AD=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,CD=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,PD=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,e0={alphahash_fragment:a5,alphahash_pars_fragment:r5,alphamap_fragment:t5,alphamap_pars_fragment:e5,alphatest_fragment:JN,alphatest_pars_fragment:QN,aomap_fragment:$N,aomap_pars_fragment:ZN,batching_pars_vertex:WN,batching_vertex:KN,begin_vertex:YN,beginnormal_vertex:HN,bsdfs:XN,iridescence_fragment:UN,bumpmap_pars_fragment:GN,clipping_planes_fragment:EN,clipping_planes_pars_fragment:NN,clipping_planes_pars_vertex:qN,clipping_planes_vertex:DN,color_fragment:FN,color_pars_fragment:ON,color_pars_vertex:RN,color_vertex:kN,common:MN,cube_uv_reflection_fragment:LN,defaultnormal_vertex:VN,displacementmap_pars_vertex:BN,displacementmap_vertex:zN,emissivemap_fragment:IN,emissivemap_pars_fragment:_N,colorspace_fragment:wN,colorspace_pars_fragment:AN,envmap_fragment:CN,envmap_common_pars_fragment:PN,envmap_pars_fragment:TN,envmap_pars_vertex:SN,envmap_physical_pars_fragment:dN,envmap_vertex:jN,fog_vertex:yN,fog_pars_vertex:vN,fog_fragment:fN,fog_pars_fragment:bN,gradientmap_pars_fragment:hN,lightmap_pars_fragment:xN,lights_lambert_fragment:gN,lights_lambert_pars_fragment:pN,lights_pars_begin:mN,lights_toon_fragment:lN,lights_toon_pars_fragment:uN,lights_phong_fragment:cN,lights_phong_pars_fragment:nN,lights_physical_fragment:sN,lights_physical_pars_fragment:iN,lights_fragment_begin:oN,lights_fragment_maps:aN,lights_fragment_end:rN,lightprobes_pars_fragment:tN,logdepthbuf_fragment:eN,logdepthbuf_pars_fragment:Jq,logdepthbuf_pars_vertex:Qq,logdepthbuf_vertex:$q,map_fragment:Zq,map_pars_fragment:Wq,map_particle_fragment:Kq,map_particle_pars_fragment:Yq,metalnessmap_fragment:Hq,metalnessmap_pars_fragment:Xq,morphinstance_vertex:Uq,morphcolor_vertex:Gq,morphnormal_vertex:Eq,morphtarget_pars_vertex:Nq,morphtarget_vertex:qq,normal_fragment_begin:Dq,normal_fragment_maps:Fq,normal_pars_fragment:Oq,normal_pars_vertex:Rq,normal_vertex:kq,normalmap_pars_fragment:Mq,clearcoat_normal_fragment_begin:Lq,clearcoat_normal_fragment_maps:Vq,clearcoat_pars_fragment:Bq,iridescence_pars_fragment:zq,opaque_fragment:Iq,packing:_q,premultiplied_alpha_fragment:wq,project_vertex:Aq,dithering_fragment:Cq,dithering_pars_fragment:Pq,roughnessmap_fragment:Tq,roughnessmap_pars_fragment:Sq,shadowmap_pars_fragment:jq,shadowmap_pars_vertex:yq,shadowmap_vertex:vq,shadowmask_pars_fragment:fq,skinbase_vertex:bq,skinning_pars_vertex:hq,skinning_vertex:xq,skinnormal_vertex:gq,specularmap_fragment:pq,specularmap_pars_fragment:mq,tonemapping_fragment:dq,tonemapping_pars_fragment:lq,transmission_fragment:uq,transmission_pars_fragment:cq,uv_pars_fragment:nq,uv_pars_vertex:sq,uv_vertex:iq,worldpos_vertex:oq,background_vert:aq,background_frag:rq,backgroundCube_vert:tq,backgroundCube_frag:eq,cube_vert:JD,cube_frag:QD,depth_vert:$D,depth_frag:ZD,distance_vert:WD,distance_frag:KD,equirect_vert:YD,equirect_frag:HD,linedashed_vert:XD,linedashed_frag:UD,meshbasic_vert:GD,meshbasic_frag:ED,meshlambert_vert:ND,meshlambert_frag:qD,meshmatcap_vert:DD,meshmatcap_frag:FD,meshnormal_vert:OD,meshnormal_frag:RD,meshphong_vert:kD,meshphong_frag:MD,meshphysical_vert:LD,meshphysical_frag:VD,meshtoon_vert:BD,meshtoon_frag:zD,points_vert:ID,points_frag:_D,shadow_vert:wD,shadow_frag:AD,sprite_vert:CD,sprite_frag:PD},F0={common:{diffuse:{value:new V0(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new u0},alphaMap:{value:null},alphaMapTransform:{value:new u0},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new u0}},envmap:{envMap:{value:null},envMapRotation:{value:new u0},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:0.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new u0}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new u0}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new u0},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new u0},normalScale:{value:new r(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new u0},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new u0}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new u0}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new u0}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:0.00025},fogNear:{value:1},fogFar:{value:2000},fogColor:{value:new V0(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new P},probesMax:{value:new P},probesResolution:{value:new P}},points:{diffuse:{value:new V0(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new u0},alphaTest:{value:0},uvTransform:{value:new u0}},sprite:{diffuse:{value:new V0(16777215)},opacity:{value:1},center:{value:new r(0.5,0.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new u0},alphaMap:{value:null},alphaMapTransform:{value:new u0},alphaTest:{value:0}}},A9={basic:{uniforms:pJ([F0.common,F0.specularmap,F0.envmap,F0.aomap,F0.lightmap,F0.fog]),vertexShader:e0.meshbasic_vert,fragmentShader:e0.meshbasic_frag},lambert:{uniforms:pJ([F0.common,F0.specularmap,F0.envmap,F0.aomap,F0.lightmap,F0.emissivemap,F0.bumpmap,F0.normalmap,F0.displacementmap,F0.fog,F0.lights,{emissive:{value:new V0(0)},envMapIntensity:{value:1}}]),vertexShader:e0.meshlambert_vert,fragmentShader:e0.meshlambert_frag},phong:{uniforms:pJ([F0.common,F0.specularmap,F0.envmap,F0.aomap,F0.lightmap,F0.emissivemap,F0.bumpmap,F0.normalmap,F0.displacementmap,F0.fog,F0.lights,{emissive:{value:new V0(0)},specular:{value:new V0(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:e0.meshphong_vert,fragmentShader:e0.meshphong_frag},standard:{uniforms:pJ([F0.common,F0.envmap,F0.aomap,F0.lightmap,F0.emissivemap,F0.bumpmap,F0.normalmap,F0.displacementmap,F0.roughnessmap,F0.metalnessmap,F0.fog,F0.lights,{emissive:{value:new V0(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:e0.meshphysical_vert,fragmentShader:e0.meshphysical_frag},toon:{uniforms:pJ([F0.common,F0.aomap,F0.lightmap,F0.emissivemap,F0.bumpmap,F0.normalmap,F0.displacementmap,F0.gradientmap,F0.fog,F0.lights,{emissive:{value:new V0(0)}}]),vertexShader:e0.meshtoon_vert,fragmentShader:e0.meshtoon_frag},matcap:{uniforms:pJ([F0.common,F0.bumpmap,F0.normalmap,F0.displacementmap,F0.fog,{matcap:{value:null}}]),vertexShader:e0.meshmatcap_vert,fragmentShader:e0.meshmatcap_frag},points:{uniforms:pJ([F0.points,F0.fog]),vertexShader:e0.points_vert,fragmentShader:e0.points_frag},dashed:{uniforms:pJ([F0.common,F0.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:e0.linedashed_vert,fragmentShader:e0.linedashed_frag},depth:{uniforms:pJ([F0.common,F0.displacementmap]),vertexShader:e0.depth_vert,fragmentShader:e0.depth_frag},normal:{uniforms:pJ([F0.common,F0.bumpmap,F0.normalmap,F0.displacementmap,{opacity:{value:1}}]),vertexShader:e0.meshnormal_vert,fragmentShader:e0.meshnormal_frag},sprite:{uniforms:pJ([F0.sprite,F0.fog]),vertexShader:e0.sprite_vert,fragmentShader:e0.sprite_frag},background:{uniforms:{uvTransform:{value:new u0},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:e0.background_vert,fragmentShader:e0.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new u0}},vertexShader:e0.backgroundCube_vert,fragmentShader:e0.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:e0.cube_vert,fragmentShader:e0.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:e0.equirect_vert,fragmentShader:e0.equirect_frag},distance:{uniforms:pJ([F0.common,F0.displacementmap,{referencePosition:{value:new P},nearDistance:{value:1},farDistance:{value:1000}}]),vertexShader:e0.distance_vert,fragmentShader:e0.distance_frag},shadow:{uniforms:pJ([F0.lights,F0.fog,{color:{value:new V0(0)},opacity:{value:1}}]),vertexShader:e0.shadow_vert,fragmentShader:e0.shadow_frag}};A9.physical={uniforms:pJ([A9.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new u0},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new u0},clearcoatNormalScale:{value:new r(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new u0},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new u0},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new u0},sheen:{value:0},sheenColor:{value:new V0(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new u0},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new u0},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new u0},transmissionSamplerSize:{value:new r},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new u0},attenuationDistance:{value:0},attenuationColor:{value:new V0(0)},specularColor:{value:new V0(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new u0},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new u0},anisotropyVector:{value:new r},anisotropyMap:{value:null},anisotropyMapTransform:{value:new u0}}]),vertexShader:e0.meshphysical_vert,fragmentShader:e0.meshphysical_frag};var G$={r:0,b:0,g:0},TD=new d0,LU=new u0;LU.set(-1,0,0,0,1,0,0,0,1);function SD(J,Q,$,Z,W,K){let Y=new V0(0),H=W===!0?0:1,X,U,E=null,N=0,G=null;function q(k){let M=k.isScene===!0?k.background:null;if(M&&M.isTexture){let V=k.backgroundBlurriness>0;M=Q.get(M,V)}return M}function O(k){let M=!1,V=q(k);if(V===null)F(Y,H);else if(V&&V.isColor)F(V,1),M=!0;let _=J.xr.getEnvironmentBlendMode();if(_==="additive")$.buffers.color.setClear(0,0,0,1,K);else if(_==="alpha-blend")$.buffers.color.setClear(0,0,0,0,K);if(J.autoClear||M)$.buffers.depth.setTest(!0),$.buffers.depth.setMask(!0),$.buffers.color.setMask(!0),J.clear(J.autoClearColor,J.autoClearDepth,J.autoClearStencil)}function R(k,M){let V=q(M);if(V&&(V.isCubeTexture||V.mapping===r7)){if(U===void 0)U=new IJ(new b8(1,1,1),new J9({name:"BackgroundCubeMaterial",uniforms:h8(A9.backgroundCube.uniforms),vertexShader:A9.backgroundCube.vertexShader,fragmentShader:A9.backgroundCube.fragmentShader,side:sJ,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),U.geometry.deleteAttribute("normal"),U.geometry.deleteAttribute("uv"),U.onBeforeRender=function(_,A,C){this.matrixWorld.copyPosition(C.matrixWorld)},Object.defineProperty(U.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),Z.update(U);if(U.material.uniforms.envMap.value=V,U.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,U.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,U.material.uniforms.backgroundRotation.value.setFromMatrix4(TD.makeRotationFromEuler(M.backgroundRotation)).transpose(),V.isCubeTexture&&V.isRenderTargetTexture===!1)U.material.uniforms.backgroundRotation.value.premultiply(LU);if(U.material.toneMapped=$J.getTransfer(V.colorSpace)!==FJ,E!==V||N!==V.version||G!==J.toneMapping)U.material.needsUpdate=!0,E=V,N=V.version,G=J.toneMapping;U.layers.enableAll(),k.unshift(U,U.geometry,U.material,0,0,null)}else if(V&&V.isTexture){if(X===void 0)X=new IJ(new B7(2,2),new J9({name:"BackgroundMaterial",uniforms:h8(A9.background.uniforms),vertexShader:A9.background.vertexShader,fragmentShader:A9.background.fragmentShader,side:R7,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),X.geometry.deleteAttribute("normal"),Object.defineProperty(X.material,"map",{get:function(){return this.uniforms.t2D.value}}),Z.update(X);if(X.material.uniforms.t2D.value=V,X.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,X.material.toneMapped=$J.getTransfer(V.colorSpace)!==FJ,V.matrixAutoUpdate===!0)V.updateMatrix();if(X.material.uniforms.uvTransform.value.copy(V.matrix),E!==V||N!==V.version||G!==J.toneMapping)X.material.needsUpdate=!0,E=V,N=V.version,G=J.toneMapping;X.layers.enableAll(),k.unshift(X,X.geometry,X.material,0,0,null)}}function F(k,M){k.getRGB(G$,IW(J)),$.buffers.color.setClear(G$.r,G$.g,G$.b,M,K)}function D(){if(U!==void 0)U.geometry.dispose(),U.material.dispose(),U=void 0;if(X!==void 0)X.geometry.dispose(),X.material.dispose(),X=void 0}return{getClearColor:function(){return Y},setClearColor:function(k,M=1){Y.set(k),H=M,F(Y,H)},getClearAlpha:function(){return H},setClearAlpha:function(k){H=k,F(Y,H)},render:O,addToRenderList:R,dispose:D}}function jD(J,Q){let $=J.getParameter(J.MAX_VERTEX_ATTRIBS),Z={},W=G(null),K=W,Y=!1;function H(T,p,u,y,l){let h=!1,m=N(T,y,u,p);if(K!==m)K=m,U(K.object);if(h=q(T,y,u,l),h)O(T,y,u,l);if(l!==null)Q.update(l,J.ELEMENT_ARRAY_BUFFER);if(h||Y){if(Y=!1,V(T,p,u,y),l!==null)J.bindBuffer(J.ELEMENT_ARRAY_BUFFER,Q.get(l).buffer)}}function X(){return J.createVertexArray()}function U(T){return J.bindVertexArray(T)}function E(T){return J.deleteVertexArray(T)}function N(T,p,u,y){let l=y.wireframe===!0,h=Z[p.id];if(h===void 0)h={},Z[p.id]=h;let m=T.isInstancedMesh===!0?T.id:0,a=h[m];if(a===void 0)a={},h[m]=a;let W0=a[u.id];if(W0===void 0)W0={},a[u.id]=W0;let N0=W0[l];if(N0===void 0)N0=G(X()),W0[l]=N0;return N0}function G(T){let p=[],u=[],y=[];for(let l=0;l<$;l++)p[l]=0,u[l]=0,y[l]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:p,enabledAttributes:u,attributeDivisors:y,object:T,attributes:{},index:null}}function q(T,p,u,y){let l=K.attributes,h=p.attributes,m=0,a=u.getAttributes();for(let W0 in a)if(a[W0].location>=0){let j0=l[W0],B0=h[W0];if(B0===void 0){if(W0==="instanceMatrix"&&T.instanceMatrix)B0=T.instanceMatrix;if(W0==="instanceColor"&&T.instanceColor)B0=T.instanceColor}if(j0===void 0)return!0;if(j0.attribute!==B0)return!0;if(B0&&j0.data!==B0.data)return!0;m++}if(K.attributesNum!==m)return!0;if(K.index!==y)return!0;return!1}function O(T,p,u,y){let l={},h=p.attributes,m=0,a=u.getAttributes();for(let W0 in a)if(a[W0].location>=0){let j0=h[W0];if(j0===void 0){if(W0==="instanceMatrix"&&T.instanceMatrix)j0=T.instanceMatrix;if(W0==="instanceColor"&&T.instanceColor)j0=T.instanceColor}let B0={};if(B0.attribute=j0,j0&&j0.data)B0.data=j0.data;l[W0]=B0,m++}K.attributes=l,K.attributesNum=m,K.index=y}function R(){let T=K.newAttributes;for(let p=0,u=T.length;p<u;p++)T[p]=0}function F(T){D(T,0)}function D(T,p){let{newAttributes:u,enabledAttributes:y,attributeDivisors:l}=K;if(u[T]=1,y[T]===0)J.enableVertexAttribArray(T),y[T]=1;if(l[T]!==p)J.vertexAttribDivisor(T,p),l[T]=p}function k(){let{newAttributes:T,enabledAttributes:p}=K;for(let u=0,y=p.length;u<y;u++)if(p[u]!==T[u])J.disableVertexAttribArray(u),p[u]=0}function M(T,p,u,y,l,h,m){if(m===!0)J.vertexAttribIPointer(T,p,u,l,h);else J.vertexAttribPointer(T,p,u,y,l,h)}function V(T,p,u,y){R();let l=y.attributes,h=u.getAttributes(),m=p.defaultAttributeValues;for(let a in h){let W0=h[a];if(W0.location>=0){let N0=l[a];if(N0===void 0){if(a==="instanceMatrix"&&T.instanceMatrix)N0=T.instanceMatrix;if(a==="instanceColor"&&T.instanceColor)N0=T.instanceColor}if(N0!==void 0){let{normalized:j0,itemSize:B0}=N0,ZJ=Q.get(N0);if(ZJ===void 0)continue;let{buffer:r0,type:s,bytesPerElement:O0}=ZJ,P0=s===J.INT||s===J.UNSIGNED_INT||N0.gpuType===OZ;if(N0.isInterleavedBufferAttribute){let G0=N0.data,b0=G0.stride,WJ=N0.offset;if(G0.isInstancedInterleavedBuffer){for(let p0=0;p0<W0.locationSize;p0++)D(W0.location+p0,G0.meshPerAttribute);if(T.isInstancedMesh!==!0&&y._maxInstanceCount===void 0)y._maxInstanceCount=G0.meshPerAttribute*G0.count}else for(let p0=0;p0<W0.locationSize;p0++)F(W0.location+p0);J.bindBuffer(J.ARRAY_BUFFER,r0);for(let p0=0;p0<W0.locationSize;p0++)M(W0.location+p0,B0/W0.locationSize,s,j0,b0*O0,(WJ+B0/W0.locationSize*p0)*O0,P0)}else{if(N0.isInstancedBufferAttribute){for(let G0=0;G0<W0.locationSize;G0++)D(W0.location+G0,N0.meshPerAttribute);if(T.isInstancedMesh!==!0&&y._maxInstanceCount===void 0)y._maxInstanceCount=N0.meshPerAttribute*N0.count}else for(let G0=0;G0<W0.locationSize;G0++)F(W0.location+G0);J.bindBuffer(J.ARRAY_BUFFER,r0);for(let G0=0;G0<W0.locationSize;G0++)M(W0.location+G0,B0/W0.locationSize,s,j0,B0*O0,B0/W0.locationSize*G0*O0,P0)}}else if(m!==void 0){let j0=m[a];if(j0!==void 0)switch(j0.length){case 2:J.vertexAttrib2fv(W0.location,j0);break;case 3:J.vertexAttrib3fv(W0.location,j0);break;case 4:J.vertexAttrib4fv(W0.location,j0);break;default:J.vertexAttrib1fv(W0.location,j0)}}}}k()}function _(){I();for(let T in Z){let p=Z[T];for(let u in p){let y=p[u];for(let l in y){let h=y[l];for(let m in h)E(h[m].object),delete h[m];delete y[l]}}delete Z[T]}}function A(T){if(Z[T.id]===void 0)return;let p=Z[T.id];for(let u in p){let y=p[u];for(let l in y){let h=y[l];for(let m in h)E(h[m].object),delete h[m];delete y[l]}}delete Z[T.id]}function C(T){for(let p in Z){let u=Z[p];for(let y in u){let l=u[y];if(l[T.id]===void 0)continue;let h=l[T.id];for(let m in h)E(h[m].object),delete h[m];delete l[T.id]}}}function L(T){for(let p in Z){let u=Z[p],y=T.isInstancedMesh===!0?T.id:0,l=u[y];if(l===void 0)continue;for(let h in l){let m=l[h];for(let a in m)E(m[a].object),delete m[a];delete l[h]}if(delete u[y],Object.keys(u).length===0)delete Z[p]}}function I(){if(b(),Y=!0,K===W)return;K=W,U(K.object)}function b(){W.geometry=null,W.program=null,W.wireframe=!1}return{setup:H,reset:I,resetDefaultState:b,dispose:_,releaseStatesOfGeometry:A,releaseStatesOfObject:L,releaseStatesOfProgram:C,initAttributes:R,enableAttribute:F,disableUnusedAttributes:k}}function yD(J,Q,$){let Z;function W(X){Z=X}function K(X,U){J.drawArrays(Z,X,U),$.update(U,Z,1)}function Y(X,U,E){if(E===0)return;J.drawArraysInstanced(Z,X,U,E),$.update(U,Z,E)}function H(X,U,E){if(E===0)return;Q.get("WEBGL_multi_draw").multiDrawArraysWEBGL(Z,X,0,U,0,E);let G=0;for(let q=0;q<E;q++)G+=U[q];$.update(G,Z,1)}this.setMode=W,this.render=K,this.renderInstances=Y,this.renderMultiDraw=H}function vD(J,Q,$,Z){let W;function K(){if(W!==void 0)return W;if(Q.has("EXT_texture_filter_anisotropic")===!0){let C=Q.get("EXT_texture_filter_anisotropic");W=J.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else W=0;return W}function Y(C){if(C!==_9&&Z.convert(C)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_FORMAT))return!1;return!0}function H(C){let L=C===p9&&(Q.has("EXT_color_buffer_half_float")||Q.has("EXT_color_buffer_float"));if(C!==D9&&Z.convert(C)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_TYPE)&&C!==g9&&!L)return!1;return!0}function X(C){if(C==="highp"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.HIGH_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.HIGH_FLOAT).precision>0)return"highp";C="mediump"}if(C==="mediump"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.MEDIUM_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.MEDIUM_FLOAT).precision>0)return"mediump"}return"lowp"}let U=$.precision!==void 0?$.precision:"highp",E=X(U);if(E!==U)X0("WebGLRenderer:",U,"not supported, using",E,"instead."),U=E;let N=$.logarithmicDepthBuffer===!0,G=$.reversedDepthBuffer===!0&&Q.has("EXT_clip_control");if($.reversedDepthBuffer===!0&&G===!1)X0("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let q=J.getParameter(J.MAX_TEXTURE_IMAGE_UNITS),O=J.getParameter(J.MAX_VERTEX_TEXTURE_IMAGE_UNITS),R=J.getParameter(J.MAX_TEXTURE_SIZE),F=J.getParameter(J.MAX_CUBE_MAP_TEXTURE_SIZE),D=J.getParameter(J.MAX_VERTEX_ATTRIBS),k=J.getParameter(J.MAX_VERTEX_UNIFORM_VECTORS),M=J.getParameter(J.MAX_VARYING_VECTORS),V=J.getParameter(J.MAX_FRAGMENT_UNIFORM_VECTORS),_=J.getParameter(J.MAX_SAMPLES),A=J.getParameter(J.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:K,getMaxPrecision:X,textureFormatReadable:Y,textureTypeReadable:H,precision:U,logarithmicDepthBuffer:N,reversedDepthBuffer:G,maxTextures:q,maxVertexTextures:O,maxTextureSize:R,maxCubemapSize:F,maxAttributes:D,maxVertexUniforms:k,maxVaryings:M,maxFragmentUniforms:V,maxSamples:_,samples:A}}function fD(J){let Q=this,$=null,Z=0,W=!1,K=!1,Y=new v9,H=new u0,X={value:null,needsUpdate:!1};this.uniform=X,this.numPlanes=0,this.numIntersection=0,this.init=function(N,G){let q=N.length!==0||G||Z!==0||W;return W=G,Z=N.length,q},this.beginShadows=function(){K=!0,E(null)},this.endShadows=function(){K=!1},this.setGlobalState=function(N,G){$=E(N,G,0)},this.setState=function(N,G,q){let{clippingPlanes:O,clipIntersection:R,clipShadows:F}=N,D=J.get(N);if(!W||O===null||O.length===0||K&&!F)if(K)E(null);else U();else{let k=K?0:Z,M=k*4,V=D.clippingState||null;X.value=V,V=E(O,G,M,q);for(let _=0;_!==M;++_)V[_]=$[_];D.clippingState=V,this.numIntersection=R?this.numPlanes:0,this.numPlanes+=k}};function U(){if(X.value!==$)X.value=$,X.needsUpdate=Z>0;Q.numPlanes=Z,Q.numIntersection=0}function E(N,G,q,O){let R=N!==null?N.length:0,F=null;if(R!==0){if(F=X.value,O!==!0||F===null){let D=q+R*4,k=G.matrixWorldInverse;if(H.getNormalMatrix(k),F===null||F.length<D)F=new Float32Array(D);for(let M=0,V=q;M!==R;++M,V+=4)Y.copy(N[M]).applyMatrix4(k,H),Y.normal.toArray(F,V),F[V+3]=Y.constant}X.value=F,X.needsUpdate=!0}return Q.numPlanes=R,Q.numIntersection=0,F}}var H8=4,rX=[0.125,0.215,0.35,0.446,0.526,0.582],g8=20,bD=256,N6=new I7,tX=new V0,$K=null,ZK=0,WK=0,KK=!1,hD=new P;class XK{constructor(J){this._renderer=J,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(J,Q=0,$=0.1,Z=100,W={}){let{size:K=256,position:Y=hD}=W;$K=this._renderer.getRenderTarget(),ZK=this._renderer.getActiveCubeFace(),WK=this._renderer.getActiveMipmapLevel(),KK=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(K);let H=this._allocateTargets();if(H.depthBuffer=!0,this._sceneToCubeUV(J,$,Z,H,Y),Q>0)this._blur(H,0,0,Q);return this._applyPMREM(H),this._cleanup(H),H}fromEquirectangular(J,Q=null){return this._fromTexture(J,Q)}fromCubemap(J,Q=null){return this._fromTexture(J,Q)}compileCubemapShader(){if(this._cubemapMaterial===null)this._cubemapMaterial=QU(),this._compileMaterial(this._cubemapMaterial)}compileEquirectangularShader(){if(this._equirectMaterial===null)this._equirectMaterial=JU(),this._compileMaterial(this._equirectMaterial)}dispose(){if(this._dispose(),this._cubemapMaterial!==null)this._cubemapMaterial.dispose();if(this._equirectMaterial!==null)this._equirectMaterial.dispose();if(this._backgroundBox!==null)this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose()}_setSize(J){this._lodMax=Math.floor(Math.log2(J)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){if(this._blurMaterial!==null)this._blurMaterial.dispose();if(this._ggxMaterial!==null)this._ggxMaterial.dispose();if(this._pingPongRenderTarget!==null)this._pingPongRenderTarget.dispose();for(let J=0;J<this._lodMeshes.length;J++)this._lodMeshes[J].geometry.dispose()}_cleanup(J){this._renderer.setRenderTarget($K,ZK,WK),this._renderer.xr.enabled=KK,J.scissorTest=!1,_7(J,0,0,J.width,J.height)}_fromTexture(J,Q){if(J.mapping===M7||J.mapping===C8)this._setSize(J.image.length===0?16:J.image[0].width||J.image[0].image.width);else this._setSize(J.image.width/4);$K=this._renderer.getRenderTarget(),ZK=this._renderer.getActiveCubeFace(),WK=this._renderer.getActiveMipmapLevel(),KK=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let $=Q||this._allocateTargets();return this._textureToCubeUV(J,$),this._applyPMREM($),this._cleanup($),$}_allocateTargets(){let J=3*Math.max(this._cubeSize,112),Q=4*this._cubeSize,$={magFilter:iJ,minFilter:iJ,generateMipmaps:!1,type:p9,format:_9,colorSpace:eZ,depthBuffer:!1},Z=eX(J,Q,$);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==J||this._pingPongRenderTarget.height!==Q){if(this._pingPongRenderTarget!==null)this._dispose();this._pingPongRenderTarget=eX(J,Q,$);let{_lodMax:W}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=xD(W)),this._blurMaterial=pD(W,J,Q),this._ggxMaterial=gD(W,J,Q)}return Z}_compileMaterial(J){let Q=new IJ(new n0,J);this._renderer.compile(Q,N6)}_sceneToCubeUV(J,Q,$,Z,W){let H=new TJ(90,1,Q,$),X=[1,-1,1,1,1,1],U=[1,1,1,-1,-1,-1],E=this._renderer,N=E.autoClear,G=E.toneMapping;if(E.getClearColor(tX),E.toneMapping=q9,E.autoClear=!1,E.state.buffers.depth.getReversed())E.setRenderTarget(Z),E.clearDepth(),E.setRenderTarget(null);if(this._backgroundBox===null)this._backgroundBox=new IJ(new b8,new m9({name:"PMREM.Background",side:sJ,depthWrite:!1,depthTest:!1}));let O=this._backgroundBox,R=O.material,F=!1,D=J.background;if(D){if(D.isColor)R.color.copy(D),J.background=null,F=!0}else R.color.copy(tX),F=!0;for(let k=0;k<6;k++){let M=k%3;if(M===0)H.up.set(0,X[k],0),H.position.set(W.x,W.y,W.z),H.lookAt(W.x+U[k],W.y,W.z);else if(M===1)H.up.set(0,0,X[k]),H.position.set(W.x,W.y,W.z),H.lookAt(W.x,W.y+U[k],W.z);else H.up.set(0,X[k],0),H.position.set(W.x,W.y,W.z),H.lookAt(W.x,W.y,W.z+U[k]);let V=this._cubeSize;if(_7(Z,M*V,k>2?V:0,V,V),E.setRenderTarget(Z),F)E.render(O,H);E.render(J,H)}E.toneMapping=G,E.autoClear=N,J.background=D}_textureToCubeUV(J,Q){let $=this._renderer,Z=J.mapping===M7||J.mapping===C8;if(Z){if(this._cubemapMaterial===null)this._cubemapMaterial=QU();this._cubemapMaterial.uniforms.flipEnvMap.value=J.isRenderTargetTexture===!1?-1:1}else if(this._equirectMaterial===null)this._equirectMaterial=JU();let W=Z?this._cubemapMaterial:this._equirectMaterial,K=this._lodMeshes[0];K.material=W;let Y=W.uniforms;Y.envMap.value=J;let H=this._cubeSize;_7(Q,0,0,3*H,2*H),$.setRenderTarget(Q),$.render(K,N6)}_applyPMREM(J){let Q=this._renderer,$=Q.autoClear;Q.autoClear=!1;let Z=this._lodMeshes.length;for(let W=1;W<Z;W++)this._applyGGXFilter(J,W-1,W);Q.autoClear=$}_applyGGXFilter(J,Q,$){let Z=this._renderer,W=this._pingPongRenderTarget,K=this._ggxMaterial,Y=this._lodMeshes[$];Y.material=K;let H=K.uniforms,X=$/(this._lodMeshes.length-1),U=Q/(this._lodMeshes.length-1),E=Math.sqrt(X*X-U*U),N=0+X*1.25,G=E*N,{_lodMax:q}=this,O=this._sizeLods[$],R=3*O*($>q-H8?$-q+H8:0),F=4*(this._cubeSize-O);H.envMap.value=J.texture,H.roughness.value=G,H.mipInt.value=q-Q,_7(W,R,F,3*O,2*O),Z.setRenderTarget(W),Z.render(Y,N6),H.envMap.value=W.texture,H.roughness.value=0,H.mipInt.value=q-$,_7(J,R,F,3*O,2*O),Z.setRenderTarget(J),Z.render(Y,N6)}_blur(J,Q,$,Z,W){let K=this._pingPongRenderTarget;this._halfBlur(J,K,Q,$,Z,"latitudinal",W),this._halfBlur(K,J,$,$,Z,"longitudinal",W)}_halfBlur(J,Q,$,Z,W,K,Y){let H=this._renderer,X=this._blurMaterial;if(K!=="latitudinal"&&K!=="longitudinal")T0("blur direction must be either latitudinal or longitudinal!");let U=3,E=this._lodMeshes[Z];E.material=X;let N=X.uniforms,G=this._sizeLods[$]-1,q=isFinite(W)?Math.PI/(2*G):2*Math.PI/(2*g8-1),O=W/q,R=isFinite(W)?1+Math.floor(U*O):g8;if(R>g8)X0(`sigmaRadians, ${W}, is too large and will clip, as it requested ${R} samples when the maximum is set to ${g8}`);let F=[],D=0;for(let A=0;A<g8;++A){let C=A/O,L=Math.exp(-C*C/2);if(F.push(L),A===0)D+=L;else if(A<R)D+=2*L}for(let A=0;A<F.length;A++)F[A]=F[A]/D;if(N.envMap.value=J.texture,N.samples.value=R,N.weights.value=F,N.latitudinal.value=K==="latitudinal",Y)N.poleAxis.value=Y;let{_lodMax:k}=this;N.dTheta.value=q,N.mipInt.value=k-$;let M=this._sizeLods[Z],V=3*M*(Z>k-H8?Z-k+H8:0),_=4*(this._cubeSize-M);_7(Q,V,_,3*M,2*M),H.setRenderTarget(Q),H.render(E,N6)}}function xD(J){let Q=[],$=[],Z=[],W=J,K=J-H8+1+rX.length;for(let Y=0;Y<K;Y++){let H=Math.pow(2,W);Q.push(H);let X=1/H;if(Y>J-H8)X=rX[Y-J+H8-1];else if(Y===0)X=0;$.push(X);let U=1/(H-2),E=-U,N=1+U,G=[E,E,N,E,N,N,E,E,N,N,E,N],q=6,O=6,R=3,F=2,D=1,k=new Float32Array(R*O*q),M=new Float32Array(F*O*q),V=new Float32Array(D*O*q);for(let A=0;A<q;A++){let C=A%3*2/3-1,L=A>2?0:-1,I=[C,L,0,C+0.6666666666666666,L,0,C+0.6666666666666666,L+1,0,C,L,0,C+0.6666666666666666,L+1,0,C,L+1,0];k.set(I,R*O*A),M.set(G,F*O*A);let b=[A,A,A,A,A,A];V.set(b,D*O*A)}let _=new n0;if(_.setAttribute("position",new UJ(k,R)),_.setAttribute("uv",new UJ(M,F)),_.setAttribute("faceIndex",new UJ(V,D)),Z.push(new IJ(_,null)),W>H8)W--}return{lodMeshes:Z,sizeLods:Q,sigmas:$}}function eX(J,Q,$){let Z=new oJ(J,Q,$);return Z.texture.mapping=r7,Z.texture.name="PMREM.cubeUv",Z.scissorTest=!0,Z}function _7(J,Q,$,Z,W){J.viewport.set(Q,$,Z,W),J.scissor.set(Q,$,Z,W)}function gD(J,Q,$){return new J9({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:bD,CUBEUV_TEXEL_WIDTH:1/Q,CUBEUV_TEXEL_HEIGHT:1/$,CUBEUV_MAX_MIP:`${J}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:N$(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:I9,depthTest:!1,depthWrite:!1})}function pD(J,Q,$){let Z=new Float32Array(g8),W=new P(0,1,0);return new J9({name:"SphericalGaussianBlur",defines:{n:g8,CUBEUV_TEXEL_WIDTH:1/Q,CUBEUV_TEXEL_HEIGHT:1/$,CUBEUV_MAX_MIP:`${J}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:Z},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:W}},vertexShader:N$(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:I9,depthTest:!1,depthWrite:!1})}function JU(){return new J9({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:N$(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:I9,depthTest:!1,depthWrite:!1})}function QU(){return new J9({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:N$(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:I9,depthTest:!1,depthWrite:!1})}function N$(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class EK extends oJ{constructor(J=1,Q={}){super(J,J,Q);this.isWebGLCubeRenderTarget=!0;let $={width:J,height:J,depth:1},Z=[$,$,$,$,$,$];this.texture=new V7(Z),this._setTextureOptions(Q),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(J,Q){this.texture.type=Q.type,this.texture.colorSpace=Q.colorSpace,this.texture.generateMipmaps=Q.generateMipmaps,this.texture.minFilter=Q.minFilter,this.texture.magFilter=Q.magFilter;let $={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},Z=new b8(5,5,5),W=new J9({name:"CubemapFromEquirect",uniforms:h8($.uniforms),vertexShader:$.vertexShader,fragmentShader:$.fragmentShader,side:sJ,blending:I9});W.uniforms.tEquirect.value=Q;let K=new IJ(Z,W),Y=Q.minFilter;if(Q.minFilter===P8)Q.minFilter=iJ;return new nW(1,10,this).update(J,K),Q.minFilter=Y,K.geometry.dispose(),K.material.dispose(),this}clear(J,Q=!0,$=!0,Z=!0){let W=J.getRenderTarget();for(let K=0;K<6;K++)J.setRenderTarget(this,K),J.clear(Q,$,Z);J.setRenderTarget(W)}}function mD(J){let Q=new WeakMap,$=new WeakMap,Z=null;function W(G,q=!1){if(G===null||G===void 0)return null;if(q)return Y(G);return K(G)}function K(G){if(G&&G.isTexture){let q=G.mapping;if(q===NQ||q===qQ)if(Q.has(G)){let O=Q.get(G).texture;return H(O,G.mapping)}else{let O=G.image;if(O&&O.height>0){let R=new EK(O.height);return R.fromEquirectangularTexture(J,G),Q.set(G,R),G.addEventListener("dispose",U),H(R.texture,G.mapping)}else return null}}return G}function Y(G){if(G&&G.isTexture){let q=G.mapping,O=q===NQ||q===qQ,R=q===M7||q===C8;if(O||R){let F=$.get(G),D=F!==void 0?F.texture.pmremVersion:0;if(G.isRenderTargetTexture&&G.pmremVersion!==D){if(Z===null)Z=new XK(J);return F=O?Z.fromEquirectangular(G,F):Z.fromCubemap(G,F),F.texture.pmremVersion=G.pmremVersion,$.set(G,F),F.texture}else if(F!==void 0)return F.texture;else{let k=G.image;if(O&&k&&k.height>0||R&&k&&X(k)){if(Z===null)Z=new XK(J);return F=O?Z.fromEquirectangular(G):Z.fromCubemap(G),F.texture.pmremVersion=G.pmremVersion,$.set(G,F),G.addEventListener("dispose",E),F.texture}else return null}}}return G}function H(G,q){if(q===NQ)G.mapping=M7;else if(q===qQ)G.mapping=C8;return G}function X(G){let q=0,O=6;for(let R=0;R<O;R++)if(G[R]!==void 0)q++;return q===O}function U(G){let q=G.target;q.removeEventListener("dispose",U);let O=Q.get(q);if(O!==void 0)Q.delete(q),O.dispose()}function E(G){let q=G.target;q.removeEventListener("dispose",E);let O=$.get(q);if(O!==void 0)$.delete(q),O.dispose()}function N(){if(Q=new WeakMap,$=new WeakMap,Z!==null)Z.dispose(),Z=null}return{get:W,dispose:N}}function dD(J){let Q={};function $(Z){if(Q[Z]!==void 0)return Q[Z];let W=J.getExtension(Z);return Q[Z]=W,W}return{has:function(Z){return $(Z)!==null},init:function(){$("EXT_color_buffer_float"),$("WEBGL_clip_cull_distance"),$("OES_texture_float_linear"),$("EXT_color_buffer_half_float"),$("WEBGL_multisampled_render_to_texture"),$("WEBGL_render_shared_exponent")},get:function(Z){let W=$(Z);if(W===null)HQ("WebGLRenderer: "+Z+" extension not supported.");return W}}}function lD(J,Q,$,Z){let W={},K=new WeakMap;function Y(N){let G=N.target;if(G.index!==null)Q.remove(G.index);for(let O in G.attributes)Q.remove(G.attributes[O]);G.removeEventListener("dispose",Y),delete W[G.id];let q=K.get(G);if(q)Q.remove(q),K.delete(G);if(Z.releaseStatesOfGeometry(G),G.isInstancedBufferGeometry===!0)delete G._maxInstanceCount;$.memory.geometries--}function H(N,G){if(W[G.id]===!0)return G;return G.addEventListener("dispose",Y),W[G.id]=!0,$.memory.geometries++,G}function X(N){let G=N.attributes;for(let q in G)Q.update(G[q],J.ARRAY_BUFFER)}function U(N){let G=[],q=N.index,O=N.attributes.position,R=0;if(O===void 0)return;if(q!==null){let k=q.array;R=q.version;for(let M=0,V=k.length;M<V;M+=3){let _=k[M+0],A=k[M+1],C=k[M+2];G.push(_,A,A,C,C,_)}}else{let k=O.array;R=O.version;for(let M=0,V=k.length/3-1;M<V;M+=3){let _=M+0,A=M+1,C=M+2;G.push(_,A,A,C,C,_)}}let F=new(O.count>=65535?CQ:AQ)(G,1);F.version=R;let D=K.get(N);if(D)Q.remove(D);K.set(N,F)}function E(N){let G=K.get(N);if(G){let q=N.index;if(q!==null){if(G.version<q.version)U(N)}}else U(N);return K.get(N)}return{get:H,update:X,getWireframeAttribute:E}}function uD(J,Q,$){let Z;function W(N){Z=N}let K,Y;function H(N){K=N.type,Y=N.bytesPerElement}function X(N,G){J.drawElements(Z,G,K,N*Y),$.update(G,Z,1)}function U(N,G,q){if(q===0)return;J.drawElementsInstanced(Z,G,K,N*Y,q),$.update(G,Z,q)}function E(N,G,q){if(q===0)return;Q.get("WEBGL_multi_draw").multiDrawElementsWEBGL(Z,G,0,K,N,0,q);let R=0;for(let F=0;F<q;F++)R+=G[F];$.update(R,Z,1)}this.setMode=W,this.setIndex=H,this.render=X,this.renderInstances=U,this.renderMultiDraw=E}function cD(J){let Q={geometries:0,textures:0},$={frame:0,calls:0,triangles:0,points:0,lines:0};function Z(K,Y,H){switch($.calls++,Y){case J.TRIANGLES:$.triangles+=H*(K/3);break;case J.LINES:$.lines+=H*(K/2);break;case J.LINE_STRIP:$.lines+=H*(K-1);break;case J.LINE_LOOP:$.lines+=H*K;break;case J.POINTS:$.points+=H*K;break;default:T0("WebGLInfo: Unknown draw mode:",Y);break}}function W(){$.calls=0,$.triangles=0,$.points=0,$.lines=0}return{memory:Q,render:$,programs:null,autoReset:!0,reset:W,update:Z}}function nD(J,Q,$){let Z=new WeakMap,W=new GJ;function K(Y,H,X){let U=Y.morphTargetInfluences,E=H.morphAttributes.position||H.morphAttributes.normal||H.morphAttributes.color,N=E!==void 0?E.length:0,G=Z.get(H);if(G===void 0||G.count!==N){let I=function(){C.dispose(),Z.delete(H),H.removeEventListener("dispose",I)};if(G!==void 0)G.texture.dispose();let q=H.morphAttributes.position!==void 0,O=H.morphAttributes.normal!==void 0,R=H.morphAttributes.color!==void 0,F=H.morphAttributes.position||[],D=H.morphAttributes.normal||[],k=H.morphAttributes.color||[],M=0;if(q===!0)M=1;if(O===!0)M=2;if(R===!0)M=3;let V=H.attributes.position.count*M,_=1;if(V>Q.maxTextureSize)_=Math.ceil(V/Q.maxTextureSize),V=Q.maxTextureSize;let A=new Float32Array(V*_*4*N),C=new J6(A,V,_,N);C.type=g9,C.needsUpdate=!0;let L=M*4;for(let b=0;b<N;b++){let T=F[b],p=D[b],u=k[b],y=V*_*4*b;for(let l=0;l<T.count;l++){let h=l*L;if(q===!0)W.fromBufferAttribute(T,l),A[y+h+0]=W.x,A[y+h+1]=W.y,A[y+h+2]=W.z,A[y+h+3]=0;if(O===!0)W.fromBufferAttribute(p,l),A[y+h+4]=W.x,A[y+h+5]=W.y,A[y+h+6]=W.z,A[y+h+7]=0;if(R===!0)W.fromBufferAttribute(u,l),A[y+h+8]=W.x,A[y+h+9]=W.y,A[y+h+10]=W.z,A[y+h+11]=u.itemSize===4?W.w:1}}G={count:N,texture:C,size:new r(V,_)},Z.set(H,G),H.addEventListener("dispose",I)}if(Y.isInstancedMesh===!0&&Y.morphTexture!==null)X.getUniforms().setValue(J,"morphTexture",Y.morphTexture,$);else{let q=0;for(let R=0;R<U.length;R++)q+=U[R];let O=H.morphTargetsRelative?1:1-q;X.getUniforms().setValue(J,"morphTargetBaseInfluence",O),X.getUniforms().setValue(J,"morphTargetInfluences",U)}X.getUniforms().setValue(J,"morphTargetsTexture",G.texture,$),X.getUniforms().setValue(J,"morphTargetsTextureSize",G.size)}return{update:K}}function sD(J,Q,$,Z,W){let K=new WeakMap;function Y(U){let E=W.render.frame,N=U.geometry,G=Q.get(U,N);if(K.get(G)!==E)Q.update(G),K.set(G,E);if(U.isInstancedMesh){if(U.hasEventListener("dispose",X)===!1)U.addEventListener("dispose",X);if(K.get(U)!==E){if($.update(U.instanceMatrix,J.ARRAY_BUFFER),U.instanceColor!==null)$.update(U.instanceColor,J.ARRAY_BUFFER);K.set(U,E)}}if(U.isSkinnedMesh){let q=U.skeleton;if(K.get(q)!==E)q.update(),K.set(q,E)}return G}function H(){K=new WeakMap}function X(U){let E=U.target;if(E.removeEventListener("dispose",X),Z.releaseStatesOfObject(E),$.remove(E.instanceMatrix),E.instanceColor!==null)$.remove(E.instanceColor)}return{update:Y,dispose:H}}var iD={[UZ]:"LINEAR_TONE_MAPPING",[GZ]:"REINHARD_TONE_MAPPING",[EZ]:"CINEON_TONE_MAPPING",[NZ]:"ACES_FILMIC_TONE_MAPPING",[DZ]:"AGX_TONE_MAPPING",[FZ]:"NEUTRAL_TONE_MAPPING",[qZ]:"CUSTOM_TONE_MAPPING"};function oD(J,Q,$,Z,W){let K=new oJ(Q,$,{type:J,depthBuffer:Z,stencilBuffer:W,depthTexture:Z?new Z8(Q,$):void 0}),Y=new oJ(Q,$,{type:p9,depthBuffer:!1,stencilBuffer:!1}),H=new n0;H.setAttribute("position",new I0([-1,3,0,-1,-1,0,3,-1,0],3)),H.setAttribute("uv",new I0([0,2,0,0,2,0],2));let X=new tQ({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),U=new IJ(H,X),E=new I7(-1,1,1,-1,0,1),N=null,G=null,q=!1,O,R=null,F=[],D=!1;this.setSize=function(k,M){K.setSize(k,M),Y.setSize(k,M);for(let V=0;V<F.length;V++){let _=F[V];if(_.setSize)_.setSize(k,M)}},this.setEffects=function(k){F=k,D=F.length>0&&F[0].isRenderPass===!0;let{width:M,height:V}=K;for(let _=0;_<F.length;_++){let A=F[_];if(A.setSize)A.setSize(M,V)}},this.begin=function(k,M){if(q)return!1;if(k.toneMapping===q9&&F.length===0)return!1;if(R=M,M!==null){let{width:V,height:_}=M;if(K.width!==V||K.height!==_)this.setSize(V,_)}if(D===!1)k.setRenderTarget(K);return O=k.toneMapping,k.toneMapping=q9,!0},this.hasRenderPass=function(){return D},this.end=function(k,M){k.toneMapping=O,q=!0;let V=K,_=Y;for(let A=0;A<F.length;A++){let C=F[A];if(C.enabled===!1)continue;if(C.render(k,_,V,M),C.needsSwap!==!1){let L=V;V=_,_=L}}if(N!==k.outputColorSpace||G!==k.toneMapping){if(N=k.outputColorSpace,G=k.toneMapping,X.defines={},$J.getTransfer(N)===FJ)X.defines.SRGB_TRANSFER="";let A=iD[G];if(A)X.defines[A]="";X.needsUpdate=!0}X.uniforms.tDiffuse.value=V.texture,k.setRenderTarget(R),k.render(U,E),R=null,q=!1},this.isCompositing=function(){return q},this.dispose=function(){if(K.depthTexture)K.depthTexture.dispose();K.dispose(),Y.dispose(),H.dispose(),X.dispose()}}var VU=new kJ,UK=new Z8(1,1),BU=new J6,zU=new Q6,IU=new V7,$U=[],ZU=[],WU=new Float32Array(16),KU=new Float32Array(9),YU=new Float32Array(4);function w7(J,Q,$){let Z=J[0];if(Z<=0||Z>0)return J;let W=Q*$,K=$U[W];if(K===void 0)K=new Float32Array(W),$U[W]=K;if(Q!==0){Z.toArray(K,0);for(let Y=1,H=0;Y!==Q;++Y)H+=$,J[Y].toArray(K,H)}return K}function AJ(J,Q){if(J.length!==Q.length)return!1;for(let $=0,Z=J.length;$<Z;$++)if(J[$]!==Q[$])return!1;return!0}function CJ(J,Q){for(let $=0,Z=Q.length;$<Z;$++)J[$]=Q[$]}function q$(J,Q){let $=ZU[Q];if($===void 0)$=new Int32Array(Q),ZU[Q]=$;for(let Z=0;Z!==Q;++Z)$[Z]=J.allocateTextureUnit();return $}function aD(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1f(this.addr,Q),$[0]=Q}function rD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2f(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(AJ($,Q))return;J.uniform2fv(this.addr,Q),CJ($,Q)}}function tD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3f(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else if(Q.r!==void 0){if($[0]!==Q.r||$[1]!==Q.g||$[2]!==Q.b)J.uniform3f(this.addr,Q.r,Q.g,Q.b),$[0]=Q.r,$[1]=Q.g,$[2]=Q.b}else{if(AJ($,Q))return;J.uniform3fv(this.addr,Q),CJ($,Q)}}function eD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4f(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(AJ($,Q))return;J.uniform4fv(this.addr,Q),CJ($,Q)}}function JF(J,Q){let $=this.cache,Z=Q.elements;if(Z===void 0){if(AJ($,Q))return;J.uniformMatrix2fv(this.addr,!1,Q),CJ($,Q)}else{if(AJ($,Z))return;YU.set(Z),J.uniformMatrix2fv(this.addr,!1,YU),CJ($,Z)}}function QF(J,Q){let $=this.cache,Z=Q.elements;if(Z===void 0){if(AJ($,Q))return;J.uniformMatrix3fv(this.addr,!1,Q),CJ($,Q)}else{if(AJ($,Z))return;KU.set(Z),J.uniformMatrix3fv(this.addr,!1,KU),CJ($,Z)}}function $F(J,Q){let $=this.cache,Z=Q.elements;if(Z===void 0){if(AJ($,Q))return;J.uniformMatrix4fv(this.addr,!1,Q),CJ($,Q)}else{if(AJ($,Z))return;WU.set(Z),J.uniformMatrix4fv(this.addr,!1,WU),CJ($,Z)}}function ZF(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1i(this.addr,Q),$[0]=Q}function WF(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2i(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(AJ($,Q))return;J.uniform2iv(this.addr,Q),CJ($,Q)}}function KF(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3i(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else{if(AJ($,Q))return;J.uniform3iv(this.addr,Q),CJ($,Q)}}function YF(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4i(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(AJ($,Q))return;J.uniform4iv(this.addr,Q),CJ($,Q)}}function HF(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1ui(this.addr,Q),$[0]=Q}function XF(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2ui(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(AJ($,Q))return;J.uniform2uiv(this.addr,Q),CJ($,Q)}}function UF(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3ui(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else{if(AJ($,Q))return;J.uniform3uiv(this.addr,Q),CJ($,Q)}}function GF(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4ui(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(AJ($,Q))return;J.uniform4uiv(this.addr,Q),CJ($,Q)}}function EF(J,Q,$){let Z=this.cache,W=$.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;let K;if(this.type===J.SAMPLER_2D_SHADOW)UK.compareFunction=$.isReversedDepthBuffer()?zQ:BQ,K=UK;else K=VU;$.setTexture2D(Q||K,W)}function NF(J,Q,$){let Z=this.cache,W=$.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;$.setTexture3D(Q||zU,W)}function qF(J,Q,$){let Z=this.cache,W=$.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;$.setTextureCube(Q||IU,W)}function DF(J,Q,$){let Z=this.cache,W=$.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;$.setTexture2DArray(Q||BU,W)}function FF(J){switch(J){case 5126:return aD;case 35664:return rD;case 35665:return tD;case 35666:return eD;case 35674:return JF;case 35675:return QF;case 35676:return $F;case 5124:case 35670:return ZF;case 35667:case 35671:return WF;case 35668:case 35672:return KF;case 35669:case 35673:return YF;case 5125:return HF;case 36294:return XF;case 36295:return UF;case 36296:return GF;case 35678:case 36198:case 36298:case 36306:case 35682:return EF;case 35679:case 36299:case 36307:return NF;case 35680:case 36300:case 36308:case 36293:return qF;case 36289:case 36303:case 36311:case 36292:return DF}}function OF(J,Q){J.uniform1fv(this.addr,Q)}function RF(J,Q){let $=w7(Q,this.size,2);J.uniform2fv(this.addr,$)}function kF(J,Q){let $=w7(Q,this.size,3);J.uniform3fv(this.addr,$)}function MF(J,Q){let $=w7(Q,this.size,4);J.uniform4fv(this.addr,$)}function LF(J,Q){let $=w7(Q,this.size,4);J.uniformMatrix2fv(this.addr,!1,$)}function VF(J,Q){let $=w7(Q,this.size,9);J.uniformMatrix3fv(this.addr,!1,$)}function BF(J,Q){let $=w7(Q,this.size,16);J.uniformMatrix4fv(this.addr,!1,$)}function zF(J,Q){J.uniform1iv(this.addr,Q)}function IF(J,Q){J.uniform2iv(this.addr,Q)}function _F(J,Q){J.uniform3iv(this.addr,Q)}function wF(J,Q){J.uniform4iv(this.addr,Q)}function AF(J,Q){J.uniform1uiv(this.addr,Q)}function CF(J,Q){J.uniform2uiv(this.addr,Q)}function PF(J,Q){J.uniform3uiv(this.addr,Q)}function TF(J,Q){J.uniform4uiv(this.addr,Q)}function SF(J,Q,$){let Z=this.cache,W=Q.length,K=q$($,W);if(!AJ(Z,K))J.uniform1iv(this.addr,K),CJ(Z,K);let Y;if(this.type===J.SAMPLER_2D_SHADOW)Y=UK;else Y=VU;for(let H=0;H!==W;++H)$.setTexture2D(Q[H]||Y,K[H])}function jF(J,Q,$){let Z=this.cache,W=Q.length,K=q$($,W);if(!AJ(Z,K))J.uniform1iv(this.addr,K),CJ(Z,K);for(let Y=0;Y!==W;++Y)$.setTexture3D(Q[Y]||zU,K[Y])}function yF(J,Q,$){let Z=this.cache,W=Q.length,K=q$($,W);if(!AJ(Z,K))J.uniform1iv(this.addr,K),CJ(Z,K);for(let Y=0;Y!==W;++Y)$.setTextureCube(Q[Y]||IU,K[Y])}function vF(J,Q,$){let Z=this.cache,W=Q.length,K=q$($,W);if(!AJ(Z,K))J.uniform1iv(this.addr,K),CJ(Z,K);for(let Y=0;Y!==W;++Y)$.setTexture2DArray(Q[Y]||BU,K[Y])}function fF(J){switch(J){case 5126:return OF;case 35664:return RF;case 35665:return kF;case 35666:return MF;case 35674:return LF;case 35675:return VF;case 35676:return BF;case 5124:case 35670:return zF;case 35667:case 35671:return IF;case 35668:case 35672:return _F;case 35669:case 35673:return wF;case 5125:return AF;case 36294:return CF;case 36295:return PF;case 36296:return TF;case 35678:case 36198:case 36298:case 36306:case 35682:return SF;case 35679:case 36299:case 36307:return jF;case 35680:case 36300:case 36308:case 36293:return yF;case 36289:case 36303:case 36311:case 36292:return vF}}class _U{constructor(J,Q,$){this.id=J,this.addr=$,this.cache=[],this.type=Q.type,this.setValue=FF(Q.type)}}class wU{constructor(J,Q,$){this.id=J,this.addr=$,this.cache=[],this.type=Q.type,this.size=Q.size,this.setValue=fF(Q.type)}}class AU{constructor(J){this.id=J,this.seq=[],this.map={}}setValue(J,Q,$){let Z=this.seq;for(let W=0,K=Z.length;W!==K;++W){let Y=Z[W];Y.setValue(J,Q[Y.id],$)}}}var YK=/(\w+)(\])?(\[|\.)?/g;function HU(J,Q){J.seq.push(Q),J.map[Q.id]=Q}function bF(J,Q,$){let Z=J.name,W=Z.length;YK.lastIndex=0;while(!0){let K=YK.exec(Z),Y=YK.lastIndex,H=K[1],X=K[2]==="]",U=K[3];if(X)H=H|0;if(U===void 0||U==="["&&Y+2===W){HU($,U===void 0?new _U(H,J,Q):new wU(H,J,Q));break}else{let N=$.map[H];if(N===void 0)N=new AU(H),HU($,N);$=N}}}class F6{constructor(J,Q){this.seq=[],this.map={};let $=J.getProgramParameter(Q,J.ACTIVE_UNIFORMS);for(let K=0;K<$;++K){let Y=J.getActiveUniform(Q,K),H=J.getUniformLocation(Q,Y.name);bF(Y,H,this)}let Z=[],W=[];for(let K of this.seq)if(K.type===J.SAMPLER_2D_SHADOW||K.type===J.SAMPLER_CUBE_SHADOW||K.type===J.SAMPLER_2D_ARRAY_SHADOW)Z.push(K);else W.push(K);if(Z.length>0)this.seq=Z.concat(W)}setValue(J,Q,$,Z){let W=this.map[Q];if(W!==void 0)W.setValue(J,$,Z)}setOptional(J,Q,$){let Z=Q[$];if(Z!==void 0)this.setValue(J,$,Z)}static upload(J,Q,$,Z){for(let W=0,K=Q.length;W!==K;++W){let Y=Q[W],H=$[Y.id];if(H.needsUpdate!==!1)Y.setValue(J,H.value,Z)}}static seqWithValue(J,Q){let $=[];for(let Z=0,W=J.length;Z!==W;++Z){let K=J[Z];if(K.id in Q)$.push(K)}return $}}function XU(J,Q,$){let Z=J.createShader(Q);return J.shaderSource(Z,$),J.compileShader(Z),Z}var hF=37297,xF=0;function gF(J,Q){let $=J.split(`
`),Z=[],W=Math.max(Q-6,0),K=Math.min(Q+6,$.length);for(let Y=W;Y<K;Y++){let H=Y+1;Z.push(`${H===Q?">":" "} ${H}: ${$[Y]}`)}return Z.join(`
`)}var UU=new u0;function pF(J){$J._getMatrix(UU,$J.workingColorSpace,J);let Q=`mat3( ${UU.elements.map(($)=>$.toFixed(4))} )`;switch($J.getTransfer(J)){case JW:return[Q,"LinearTransferOETF"];case FJ:return[Q,"sRGBTransferOETF"];default:return X0("WebGLProgram: Unsupported color space: ",J),[Q,"LinearTransferOETF"]}}function GU(J,Q,$){let Z=J.getShaderParameter(Q,J.COMPILE_STATUS),K=(J.getShaderInfoLog(Q)||"").trim();if(Z&&K==="")return"";let Y=/ERROR: 0:(\d+)/.exec(K);if(Y){let H=parseInt(Y[1]);return $.toUpperCase()+`

`+K+`

`+gF(J.getShaderSource(Q),H)}else return K}function mF(J,Q){let $=pF(Q);return[`vec4 ${J}( vec4 value ) {`,`	return ${$[1]}( vec4( value.rgb * ${$[0]}, value.a ) );`,"}"].join(`
`)}var dF={[UZ]:"Linear",[GZ]:"Reinhard",[EZ]:"Cineon",[NZ]:"ACESFilmic",[DZ]:"AgX",[FZ]:"Neutral",[qZ]:"Custom"};function lF(J,Q){let $=dF[Q];if($===void 0)return X0("WebGLProgram: Unsupported toneMapping:",Q),"vec3 "+J+"( vec3 color ) { return LinearToneMapping( color ); }";return"vec3 "+J+"( vec3 color ) { return "+$+"ToneMapping( color ); }"}var E$=new P;function uF(){$J.getLuminanceCoefficients(E$);let J=E$.x.toFixed(4),Q=E$.y.toFixed(4),$=E$.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${J}, ${Q}, ${$} );`,"\treturn dot( weights, rgb );","}"].join(`
`)}function cF(J){return[J.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",J.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(D6).join(`
`)}function nF(J){let Q=[];for(let $ in J){let Z=J[$];if(Z===!1)continue;Q.push("#define "+$+" "+Z)}return Q.join(`
`)}function sF(J,Q){let $={},Z=J.getProgramParameter(Q,J.ACTIVE_ATTRIBUTES);for(let W=0;W<Z;W++){let K=J.getActiveAttrib(Q,W),Y=K.name,H=1;if(K.type===J.FLOAT_MAT2)H=2;if(K.type===J.FLOAT_MAT3)H=3;if(K.type===J.FLOAT_MAT4)H=4;$[Y]={type:K.type,location:J.getAttribLocation(Q,Y),locationSize:H}}return $}function D6(J){return J!==""}function EU(J,Q){let $=Q.numSpotLightShadows+Q.numSpotLightMaps-Q.numSpotLightShadowsWithMaps;return J.replace(/NUM_DIR_LIGHTS/g,Q.numDirLights).replace(/NUM_SPOT_LIGHTS/g,Q.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,Q.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,$).replace(/NUM_RECT_AREA_LIGHTS/g,Q.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,Q.numPointLights).replace(/NUM_HEMI_LIGHTS/g,Q.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,Q.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,Q.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,Q.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,Q.numPointLightShadows)}function NU(J,Q){return J.replace(/NUM_CLIPPING_PLANES/g,Q.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,Q.numClippingPlanes-Q.numClipIntersection)}var iF=/^[ \t]*#include +<([\w\d./]+)>/gm;function GK(J){return J.replace(iF,aF)}var oF=new Map;function aF(J,Q){let $=e0[Q];if($===void 0){let Z=oF.get(Q);if(Z!==void 0)$=e0[Z],X0('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',Q,Z);else throw Error("Can not resolve #include <"+Q+">")}return GK($)}var rF=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function qU(J){return J.replace(rF,tF)}function tF(J,Q,$,Z){let W="";for(let K=parseInt(Q);K<parseInt($);K++)W+=Z.replace(/\[\s*i\s*\]/g,"[ "+K+" ]").replace(/UNROLLED_LOOP_INDEX/g,K);return W}function DU(J){let Q=`precision ${J.precision} float;
	precision ${J.precision} int;
	precision ${J.precision} sampler2D;
	precision ${J.precision} samplerCube;
	precision ${J.precision} sampler3D;
	precision ${J.precision} sampler2DArray;
	precision ${J.precision} sampler2DShadow;
	precision ${J.precision} samplerCubeShadow;
	precision ${J.precision} sampler2DArrayShadow;
	precision ${J.precision} isampler2D;
	precision ${J.precision} isampler3D;
	precision ${J.precision} isamplerCube;
	precision ${J.precision} isampler2DArray;
	precision ${J.precision} usampler2D;
	precision ${J.precision} usampler3D;
	precision ${J.precision} usamplerCube;
	precision ${J.precision} usampler2DArray;
	`;if(J.precision==="highp")Q+=`
#define HIGH_PRECISION`;else if(J.precision==="mediump")Q+=`
#define MEDIUM_PRECISION`;else if(J.precision==="lowp")Q+=`
#define LOW_PRECISION`;return Q}var eF={[o7]:"SHADOWMAP_TYPE_PCF",[O7]:"SHADOWMAP_TYPE_VSM"};function J1(J){return eF[J.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var Q1={[M7]:"ENVMAP_TYPE_CUBE",[C8]:"ENVMAP_TYPE_CUBE",[r7]:"ENVMAP_TYPE_CUBE_UV"};function $1(J){if(J.envMap===!1)return"ENVMAP_TYPE_CUBE";return Q1[J.envMapMode]||"ENVMAP_TYPE_CUBE"}var Z1={[C8]:"ENVMAP_MODE_REFRACTION"};function W1(J){if(J.envMap===!1)return"ENVMAP_MODE_REFLECTION";return Z1[J.envMapMode]||"ENVMAP_MODE_REFLECTION"}var K1={[YH]:"ENVMAP_BLENDING_MULTIPLY",[HH]:"ENVMAP_BLENDING_MIX",[XH]:"ENVMAP_BLENDING_ADD"};function Y1(J){if(J.envMap===!1)return"ENVMAP_BLENDING_NONE";return K1[J.combine]||"ENVMAP_BLENDING_NONE"}function H1(J){let Q=J.envMapCubeUVHeight;if(Q===null)return null;let $=Math.log2(Q)-2,Z=1/Q;return{texelWidth:1/(3*Math.max(Math.pow(2,$),112)),texelHeight:Z,maxMip:$}}function X1(J,Q,$,Z){let W=J.getContext(),K=$.defines,Y=$.vertexShader,H=$.fragmentShader,X=J1($),U=$1($),E=W1($),N=Y1($),G=H1($),q=cF($),O=nF(K),R=W.createProgram(),F,D,k=$.glslVersion?"#version "+$.glslVersion+`
`:"";if($.isRawShaderMaterial){if(F=["#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,O].filter(D6).join(`
`),F.length>0)F+=`
`;if(D=["#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,O].filter(D6).join(`
`),D.length>0)D+=`
`}else F=[DU($),"#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,O,$.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",$.batching?"#define USE_BATCHING":"",$.batchingColor?"#define USE_BATCHING_COLOR":"",$.instancing?"#define USE_INSTANCING":"",$.instancingColor?"#define USE_INSTANCING_COLOR":"",$.instancingMorph?"#define USE_INSTANCING_MORPH":"",$.useFog&&$.fog?"#define USE_FOG":"",$.useFog&&$.fogExp2?"#define FOG_EXP2":"",$.map?"#define USE_MAP":"",$.envMap?"#define USE_ENVMAP":"",$.envMap?"#define "+E:"",$.lightMap?"#define USE_LIGHTMAP":"",$.aoMap?"#define USE_AOMAP":"",$.bumpMap?"#define USE_BUMPMAP":"",$.normalMap?"#define USE_NORMALMAP":"",$.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",$.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",$.displacementMap?"#define USE_DISPLACEMENTMAP":"",$.emissiveMap?"#define USE_EMISSIVEMAP":"",$.anisotropy?"#define USE_ANISOTROPY":"",$.anisotropyMap?"#define USE_ANISOTROPYMAP":"",$.clearcoatMap?"#define USE_CLEARCOATMAP":"",$.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",$.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",$.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",$.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",$.specularMap?"#define USE_SPECULARMAP":"",$.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",$.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",$.roughnessMap?"#define USE_ROUGHNESSMAP":"",$.metalnessMap?"#define USE_METALNESSMAP":"",$.alphaMap?"#define USE_ALPHAMAP":"",$.alphaHash?"#define USE_ALPHAHASH":"",$.transmission?"#define USE_TRANSMISSION":"",$.transmissionMap?"#define USE_TRANSMISSIONMAP":"",$.thicknessMap?"#define USE_THICKNESSMAP":"",$.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",$.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",$.mapUv?"#define MAP_UV "+$.mapUv:"",$.alphaMapUv?"#define ALPHAMAP_UV "+$.alphaMapUv:"",$.lightMapUv?"#define LIGHTMAP_UV "+$.lightMapUv:"",$.aoMapUv?"#define AOMAP_UV "+$.aoMapUv:"",$.emissiveMapUv?"#define EMISSIVEMAP_UV "+$.emissiveMapUv:"",$.bumpMapUv?"#define BUMPMAP_UV "+$.bumpMapUv:"",$.normalMapUv?"#define NORMALMAP_UV "+$.normalMapUv:"",$.displacementMapUv?"#define DISPLACEMENTMAP_UV "+$.displacementMapUv:"",$.metalnessMapUv?"#define METALNESSMAP_UV "+$.metalnessMapUv:"",$.roughnessMapUv?"#define ROUGHNESSMAP_UV "+$.roughnessMapUv:"",$.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+$.anisotropyMapUv:"",$.clearcoatMapUv?"#define CLEARCOATMAP_UV "+$.clearcoatMapUv:"",$.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+$.clearcoatNormalMapUv:"",$.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+$.clearcoatRoughnessMapUv:"",$.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+$.iridescenceMapUv:"",$.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+$.iridescenceThicknessMapUv:"",$.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+$.sheenColorMapUv:"",$.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+$.sheenRoughnessMapUv:"",$.specularMapUv?"#define SPECULARMAP_UV "+$.specularMapUv:"",$.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+$.specularColorMapUv:"",$.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+$.specularIntensityMapUv:"",$.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+$.transmissionMapUv:"",$.thicknessMapUv?"#define THICKNESSMAP_UV "+$.thicknessMapUv:"",$.vertexTangents&&$.flatShading===!1?"#define USE_TANGENT":"",$.vertexNormals?"#define HAS_NORMAL":"",$.vertexColors?"#define USE_COLOR":"",$.vertexAlphas?"#define USE_COLOR_ALPHA":"",$.vertexUv1s?"#define USE_UV1":"",$.vertexUv2s?"#define USE_UV2":"",$.vertexUv3s?"#define USE_UV3":"",$.pointsUvs?"#define USE_POINTS_UV":"",$.flatShading?"#define FLAT_SHADED":"",$.skinning?"#define USE_SKINNING":"",$.morphTargets?"#define USE_MORPHTARGETS":"",$.morphNormals&&$.flatShading===!1?"#define USE_MORPHNORMALS":"",$.morphColors?"#define USE_MORPHCOLORS":"",$.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+$.morphTextureStride:"",$.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+$.morphTargetsCount:"",$.doubleSided?"#define DOUBLE_SIDED":"",$.flipSided?"#define FLIP_SIDED":"",$.shadowMapEnabled?"#define USE_SHADOWMAP":"",$.shadowMapEnabled?"#define "+X:"",$.sizeAttenuation?"#define USE_SIZEATTENUATION":"",$.numLightProbes>0?"#define USE_LIGHT_PROBES":"",$.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",$.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","\tattribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","\tattribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","\tuniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","\tattribute vec2 uv1;","#endif","#ifdef USE_UV2","\tattribute vec2 uv2;","#endif","#ifdef USE_UV3","\tattribute vec2 uv3;","#endif","#ifdef USE_TANGENT","\tattribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","\tattribute vec4 color;","#elif defined( USE_COLOR )","\tattribute vec3 color;","#endif","#ifdef USE_SKINNING","\tattribute vec4 skinIndex;","\tattribute vec4 skinWeight;","#endif",`
`].filter(D6).join(`
`),D=[DU($),"#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,O,$.useFog&&$.fog?"#define USE_FOG":"",$.useFog&&$.fogExp2?"#define FOG_EXP2":"",$.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",$.map?"#define USE_MAP":"",$.matcap?"#define USE_MATCAP":"",$.envMap?"#define USE_ENVMAP":"",$.envMap?"#define "+U:"",$.envMap?"#define "+E:"",$.envMap?"#define "+N:"",G?"#define CUBEUV_TEXEL_WIDTH "+G.texelWidth:"",G?"#define CUBEUV_TEXEL_HEIGHT "+G.texelHeight:"",G?"#define CUBEUV_MAX_MIP "+G.maxMip+".0":"",$.lightMap?"#define USE_LIGHTMAP":"",$.aoMap?"#define USE_AOMAP":"",$.bumpMap?"#define USE_BUMPMAP":"",$.normalMap?"#define USE_NORMALMAP":"",$.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",$.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",$.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",$.emissiveMap?"#define USE_EMISSIVEMAP":"",$.anisotropy?"#define USE_ANISOTROPY":"",$.anisotropyMap?"#define USE_ANISOTROPYMAP":"",$.clearcoat?"#define USE_CLEARCOAT":"",$.clearcoatMap?"#define USE_CLEARCOATMAP":"",$.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",$.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",$.dispersion?"#define USE_DISPERSION":"",$.iridescence?"#define USE_IRIDESCENCE":"",$.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",$.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",$.specularMap?"#define USE_SPECULARMAP":"",$.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",$.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",$.roughnessMap?"#define USE_ROUGHNESSMAP":"",$.metalnessMap?"#define USE_METALNESSMAP":"",$.alphaMap?"#define USE_ALPHAMAP":"",$.alphaTest?"#define USE_ALPHATEST":"",$.alphaHash?"#define USE_ALPHAHASH":"",$.sheen?"#define USE_SHEEN":"",$.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",$.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",$.transmission?"#define USE_TRANSMISSION":"",$.transmissionMap?"#define USE_TRANSMISSIONMAP":"",$.thicknessMap?"#define USE_THICKNESSMAP":"",$.vertexTangents&&$.flatShading===!1?"#define USE_TANGENT":"",$.vertexColors||$.instancingColor?"#define USE_COLOR":"",$.vertexAlphas||$.batchingColor?"#define USE_COLOR_ALPHA":"",$.vertexUv1s?"#define USE_UV1":"",$.vertexUv2s?"#define USE_UV2":"",$.vertexUv3s?"#define USE_UV3":"",$.pointsUvs?"#define USE_POINTS_UV":"",$.gradientMap?"#define USE_GRADIENTMAP":"",$.flatShading?"#define FLAT_SHADED":"",$.doubleSided?"#define DOUBLE_SIDED":"",$.flipSided?"#define FLIP_SIDED":"",$.shadowMapEnabled?"#define USE_SHADOWMAP":"",$.shadowMapEnabled?"#define "+X:"",$.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",$.numLightProbes>0?"#define USE_LIGHT_PROBES":"",$.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",$.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",$.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",$.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",$.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",$.toneMapping!==q9?"#define TONE_MAPPING":"",$.toneMapping!==q9?e0.tonemapping_pars_fragment:"",$.toneMapping!==q9?lF("toneMapping",$.toneMapping):"",$.dithering?"#define DITHERING":"",$.opaque?"#define OPAQUE":"",e0.colorspace_pars_fragment,mF("linearToOutputTexel",$.outputColorSpace),uF(),$.useDepthPacking?"#define DEPTH_PACKING "+$.depthPacking:"",`
`].filter(D6).join(`
`);if(Y=GK(Y),Y=EU(Y,$),Y=NU(Y,$),H=GK(H),H=EU(H,$),H=NU(H,$),Y=qU(Y),H=qU(H),$.isRawShaderMaterial!==!0)k=`#version 300 es
`,F=[q,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+F,D=["#define varying in",$.glslVersion===QW?"":"layout(location = 0) out highp vec4 pc_fragColor;",$.glslVersion===QW?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+D;let M=k+F+Y,V=k+D+H,_=XU(W,W.VERTEX_SHADER,M),A=XU(W,W.FRAGMENT_SHADER,V);if(W.attachShader(R,_),W.attachShader(R,A),$.index0AttributeName!==void 0)W.bindAttribLocation(R,0,$.index0AttributeName);else if($.morphTargets===!0)W.bindAttribLocation(R,0,"position");W.linkProgram(R);function C(T){if(J.debug.checkShaderErrors){let p=W.getProgramInfoLog(R)||"",u=W.getShaderInfoLog(_)||"",y=W.getShaderInfoLog(A)||"",l=p.trim(),h=u.trim(),m=y.trim(),a=!0,W0=!0;if(W.getProgramParameter(R,W.LINK_STATUS)===!1)if(a=!1,typeof J.debug.onShaderError==="function")J.debug.onShaderError(W,R,_,A);else{let N0=GU(W,_,"vertex"),j0=GU(W,A,"fragment");T0("THREE.WebGLProgram: Shader Error "+W.getError()+" - VALIDATE_STATUS "+W.getProgramParameter(R,W.VALIDATE_STATUS)+`

Material Name: `+T.name+`
Material Type: `+T.type+`

Program Info Log: `+l+`
`+N0+`
`+j0)}else if(l!=="")X0("WebGLProgram: Program Info Log:",l);else if(h===""||m==="")W0=!1;if(W0)T.diagnostics={runnable:a,programLog:l,vertexShader:{log:h,prefix:F},fragmentShader:{log:m,prefix:D}}}W.deleteShader(_),W.deleteShader(A),L=new F6(W,R),I=sF(W,R)}let L;this.getUniforms=function(){if(L===void 0)C(this);return L};let I;this.getAttributes=function(){if(I===void 0)C(this);return I};let b=$.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){if(b===!1)b=W.getProgramParameter(R,hF);return b},this.destroy=function(){Z.releaseStatesOfProgram(this),W.deleteProgram(R),this.program=void 0},this.type=$.shaderType,this.name=$.shaderName,this.id=xF++,this.cacheKey=Q,this.usedTimes=1,this.program=R,this.vertexShader=_,this.fragmentShader=A,this}var U1=0;class CU{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(J){let{vertexShader:Q,fragmentShader:$}=J,Z=this._getShaderStage(Q),W=this._getShaderStage($),K=this._getShaderCacheForMaterial(J);if(K.has(Z)===!1)K.add(Z),Z.usedTimes++;if(K.has(W)===!1)K.add(W),W.usedTimes++;return this}remove(J){let Q=this.materialCache.get(J);for(let $ of Q)if($.usedTimes--,$.usedTimes===0)this.shaderCache.delete($.code);return this.materialCache.delete(J),this}getVertexShaderID(J){return this._getShaderStage(J.vertexShader).id}getFragmentShaderID(J){return this._getShaderStage(J.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(J){let Q=this.materialCache,$=Q.get(J);if($===void 0)$=new Set,Q.set(J,$);return $}_getShaderStage(J){let Q=this.shaderCache,$=Q.get(J);if($===void 0)$=new PU(J),Q.set(J,$);return $}}class PU{constructor(J){this.id=U1++,this.code=J,this.usedTimes=0}}function G1(J){return J===j8||J===LQ||J===VQ}function E1(J,Q,$,Z,W,K){let Y=new $6,H=new CU,X=new Set,U=[],E=new Map,N=Z.logarithmicDepthBuffer,G=Z.precision,q={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function O(L){if(X.add(L),L===0)return"uv";return`uv${L}`}function R(L,I,b,T,p,u){let y=T.fog,l=p.geometry,h=L.isMeshStandardMaterial||L.isMeshLambertMaterial||L.isMeshPhongMaterial?T.environment:null,m=L.isMeshStandardMaterial||L.isMeshLambertMaterial&&!L.envMap||L.isMeshPhongMaterial&&!L.envMap,a=Q.get(L.envMap||h,m),W0=!!a&&a.mapping===r7?a.image.height:null,N0=q[L.type];if(L.precision!==null){if(G=Z.getMaxPrecision(L.precision),G!==L.precision)X0("WebGLProgram.getParameters:",L.precision,"not supported, using",G,"instead.")}let j0=l.morphAttributes.position||l.morphAttributes.normal||l.morphAttributes.color,B0=j0!==void 0?j0.length:0,ZJ=0;if(l.morphAttributes.position!==void 0)ZJ=1;if(l.morphAttributes.normal!==void 0)ZJ=2;if(l.morphAttributes.color!==void 0)ZJ=3;let r0,s,O0,P0;if(N0){let s0=A9[N0];r0=s0.vertexShader,s=s0.fragmentShader}else r0=L.vertexShader,s=L.fragmentShader,H.update(L),O0=H.getVertexShaderID(L),P0=H.getFragmentShaderID(L);let G0=J.getRenderTarget(),b0=J.state.buffers.depth.getReversed(),WJ=p.isInstancedMesh===!0,p0=p.isBatchedMesh===!0,l0=!!L.map,t=!!L.matcap,$0=!!a,e=!!L.aoMap,L0=!!L.lightMap,M0=!!L.bumpMap,x0=!!L.normalMap,S=!!L.displacementMap,t0=!!L.emissiveMap,y0=!!L.metalnessMap,g0=!!L.roughnessMap,K0=L.anisotropy>0,XJ=L.clearcoat>0,w0=L.dispersion>0,w=L.iridescence>0,B=L.sheen>0,f=L.transmission>0,i=K0&&!!L.anisotropyMap,J0=XJ&&!!L.clearcoatMap,Z0=XJ&&!!L.clearcoatNormalMap,q0=XJ&&!!L.clearcoatRoughnessMap,c=w&&!!L.iridescenceMap,o=w&&!!L.iridescenceThicknessMap,E0=B&&!!L.sheenColorMap,A0=B&&!!L.sheenRoughnessMap,H0=!!L.specularMap,D0=!!L.specularColorMap,c0=!!L.specularIntensityMap,a0=f&&!!L.transmissionMap,JJ=f&&!!L.thicknessMap,j=!!L.gradientMap,U0=!!L.alphaMap,n=L.alphaTest>0,Y0=!!L.alphaHash,C0=!!L.extensions,Q0=q9;if(L.toneMapped){if(G0===null||G0.isXRRenderTarget===!0)Q0=J.toneMapping}let v0={shaderID:N0,shaderType:L.type,shaderName:L.name,vertexShader:r0,fragmentShader:s,defines:L.defines,customVertexShaderID:O0,customFragmentShaderID:P0,isRawShaderMaterial:L.isRawShaderMaterial===!0,glslVersion:L.glslVersion,precision:G,batching:p0,batchingColor:p0&&p._colorsTexture!==null,instancing:WJ,instancingColor:WJ&&p.instanceColor!==null,instancingMorph:WJ&&p.morphTexture!==null,outputColorSpace:G0===null?J.outputColorSpace:G0.isXRRenderTarget===!0?G0.texture.colorSpace:$J.workingColorSpace,alphaToCoverage:!!L.alphaToCoverage,map:l0,matcap:t,envMap:$0,envMapMode:$0&&a.mapping,envMapCubeUVHeight:W0,aoMap:e,lightMap:L0,bumpMap:M0,normalMap:x0,displacementMap:S,emissiveMap:t0,normalMapObjectSpace:x0&&L.normalMapType===MH,normalMapTangentSpace:x0&&L.normalMapType===tZ,packedNormalMap:x0&&L.normalMapType===tZ&&G1(L.normalMap.format),metalnessMap:y0,roughnessMap:g0,anisotropy:K0,anisotropyMap:i,clearcoat:XJ,clearcoatMap:J0,clearcoatNormalMap:Z0,clearcoatRoughnessMap:q0,dispersion:w0,iridescence:w,iridescenceMap:c,iridescenceThicknessMap:o,sheen:B,sheenColorMap:E0,sheenRoughnessMap:A0,specularMap:H0,specularColorMap:D0,specularIntensityMap:c0,transmission:f,transmissionMap:a0,thicknessMap:JJ,gradientMap:j,opaque:L.transparent===!1&&L.blending===a7&&L.alphaToCoverage===!1,alphaMap:U0,alphaTest:n,alphaHash:Y0,combine:L.combine,mapUv:l0&&O(L.map.channel),aoMapUv:e&&O(L.aoMap.channel),lightMapUv:L0&&O(L.lightMap.channel),bumpMapUv:M0&&O(L.bumpMap.channel),normalMapUv:x0&&O(L.normalMap.channel),displacementMapUv:S&&O(L.displacementMap.channel),emissiveMapUv:t0&&O(L.emissiveMap.channel),metalnessMapUv:y0&&O(L.metalnessMap.channel),roughnessMapUv:g0&&O(L.roughnessMap.channel),anisotropyMapUv:i&&O(L.anisotropyMap.channel),clearcoatMapUv:J0&&O(L.clearcoatMap.channel),clearcoatNormalMapUv:Z0&&O(L.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:q0&&O(L.clearcoatRoughnessMap.channel),iridescenceMapUv:c&&O(L.iridescenceMap.channel),iridescenceThicknessMapUv:o&&O(L.iridescenceThicknessMap.channel),sheenColorMapUv:E0&&O(L.sheenColorMap.channel),sheenRoughnessMapUv:A0&&O(L.sheenRoughnessMap.channel),specularMapUv:H0&&O(L.specularMap.channel),specularColorMapUv:D0&&O(L.specularColorMap.channel),specularIntensityMapUv:c0&&O(L.specularIntensityMap.channel),transmissionMapUv:a0&&O(L.transmissionMap.channel),thicknessMapUv:JJ&&O(L.thicknessMap.channel),alphaMapUv:U0&&O(L.alphaMap.channel),vertexTangents:!!l.attributes.tangent&&(x0||K0),vertexNormals:!!l.attributes.normal,vertexColors:L.vertexColors,vertexAlphas:L.vertexColors===!0&&!!l.attributes.color&&l.attributes.color.itemSize===4,pointsUvs:p.isPoints===!0&&!!l.attributes.uv&&(l0||U0),fog:!!y,useFog:L.fog===!0,fogExp2:!!y&&y.isFogExp2,flatShading:L.wireframe===!1&&(L.flatShading===!0||l.attributes.normal===void 0&&x0===!1&&(L.isMeshLambertMaterial||L.isMeshPhongMaterial||L.isMeshStandardMaterial||L.isMeshPhysicalMaterial)),sizeAttenuation:L.sizeAttenuation===!0,logarithmicDepthBuffer:N,reversedDepthBuffer:b0,skinning:p.isSkinnedMesh===!0,morphTargets:l.morphAttributes.position!==void 0,morphNormals:l.morphAttributes.normal!==void 0,morphColors:l.morphAttributes.color!==void 0,morphTargetsCount:B0,morphTextureStride:ZJ,numDirLights:I.directional.length,numPointLights:I.point.length,numSpotLights:I.spot.length,numSpotLightMaps:I.spotLightMap.length,numRectAreaLights:I.rectArea.length,numHemiLights:I.hemi.length,numDirLightShadows:I.directionalShadowMap.length,numPointLightShadows:I.pointShadowMap.length,numSpotLightShadows:I.spotShadowMap.length,numSpotLightShadowsWithMaps:I.numSpotLightShadowsWithMaps,numLightProbes:I.numLightProbes,numLightProbeGrids:u.length,numClippingPlanes:K.numPlanes,numClipIntersection:K.numIntersection,dithering:L.dithering,shadowMapEnabled:J.shadowMap.enabled&&b.length>0,shadowMapType:J.shadowMap.type,toneMapping:Q0,decodeVideoTexture:l0&&L.map.isVideoTexture===!0&&$J.getTransfer(L.map.colorSpace)===FJ,decodeVideoTextureEmissive:t0&&L.emissiveMap.isVideoTexture===!0&&$J.getTransfer(L.emissiveMap.colorSpace)===FJ,premultipliedAlpha:L.premultipliedAlpha,doubleSided:L.side===z9,flipSided:L.side===sJ,useDepthPacking:L.depthPacking>=0,depthPacking:L.depthPacking||0,index0AttributeName:L.index0AttributeName,extensionClipCullDistance:C0&&L.extensions.clipCullDistance===!0&&$.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(C0&&L.extensions.multiDraw===!0||p0)&&$.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:$.has("KHR_parallel_shader_compile"),customProgramCacheKey:L.customProgramCacheKey()};return v0.vertexUv1s=X.has(1),v0.vertexUv2s=X.has(2),v0.vertexUv3s=X.has(3),X.clear(),v0}function F(L){let I=[];if(L.shaderID)I.push(L.shaderID);else I.push(L.customVertexShaderID),I.push(L.customFragmentShaderID);if(L.defines!==void 0)for(let b in L.defines)I.push(b),I.push(L.defines[b]);if(L.isRawShaderMaterial===!1)D(I,L),k(I,L),I.push(J.outputColorSpace);return I.push(L.customProgramCacheKey),I.join()}function D(L,I){L.push(I.precision),L.push(I.outputColorSpace),L.push(I.envMapMode),L.push(I.envMapCubeUVHeight),L.push(I.mapUv),L.push(I.alphaMapUv),L.push(I.lightMapUv),L.push(I.aoMapUv),L.push(I.bumpMapUv),L.push(I.normalMapUv),L.push(I.displacementMapUv),L.push(I.emissiveMapUv),L.push(I.metalnessMapUv),L.push(I.roughnessMapUv),L.push(I.anisotropyMapUv),L.push(I.clearcoatMapUv),L.push(I.clearcoatNormalMapUv),L.push(I.clearcoatRoughnessMapUv),L.push(I.iridescenceMapUv),L.push(I.iridescenceThicknessMapUv),L.push(I.sheenColorMapUv),L.push(I.sheenRoughnessMapUv),L.push(I.specularMapUv),L.push(I.specularColorMapUv),L.push(I.specularIntensityMapUv),L.push(I.transmissionMapUv),L.push(I.thicknessMapUv),L.push(I.combine),L.push(I.fogExp2),L.push(I.sizeAttenuation),L.push(I.morphTargetsCount),L.push(I.morphAttributeCount),L.push(I.numDirLights),L.push(I.numPointLights),L.push(I.numSpotLights),L.push(I.numSpotLightMaps),L.push(I.numHemiLights),L.push(I.numRectAreaLights),L.push(I.numDirLightShadows),L.push(I.numPointLightShadows),L.push(I.numSpotLightShadows),L.push(I.numSpotLightShadowsWithMaps),L.push(I.numLightProbes),L.push(I.shadowMapType),L.push(I.toneMapping),L.push(I.numClippingPlanes),L.push(I.numClipIntersection),L.push(I.depthPacking)}function k(L,I){if(Y.disableAll(),I.instancing)Y.enable(0);if(I.instancingColor)Y.enable(1);if(I.instancingMorph)Y.enable(2);if(I.matcap)Y.enable(3);if(I.envMap)Y.enable(4);if(I.normalMapObjectSpace)Y.enable(5);if(I.normalMapTangentSpace)Y.enable(6);if(I.clearcoat)Y.enable(7);if(I.iridescence)Y.enable(8);if(I.alphaTest)Y.enable(9);if(I.vertexColors)Y.enable(10);if(I.vertexAlphas)Y.enable(11);if(I.vertexUv1s)Y.enable(12);if(I.vertexUv2s)Y.enable(13);if(I.vertexUv3s)Y.enable(14);if(I.vertexTangents)Y.enable(15);if(I.anisotropy)Y.enable(16);if(I.alphaHash)Y.enable(17);if(I.batching)Y.enable(18);if(I.dispersion)Y.enable(19);if(I.batchingColor)Y.enable(20);if(I.gradientMap)Y.enable(21);if(I.packedNormalMap)Y.enable(22);if(I.vertexNormals)Y.enable(23);if(L.push(Y.mask),Y.disableAll(),I.fog)Y.enable(0);if(I.useFog)Y.enable(1);if(I.flatShading)Y.enable(2);if(I.logarithmicDepthBuffer)Y.enable(3);if(I.reversedDepthBuffer)Y.enable(4);if(I.skinning)Y.enable(5);if(I.morphTargets)Y.enable(6);if(I.morphNormals)Y.enable(7);if(I.morphColors)Y.enable(8);if(I.premultipliedAlpha)Y.enable(9);if(I.shadowMapEnabled)Y.enable(10);if(I.doubleSided)Y.enable(11);if(I.flipSided)Y.enable(12);if(I.useDepthPacking)Y.enable(13);if(I.dithering)Y.enable(14);if(I.transmission)Y.enable(15);if(I.sheen)Y.enable(16);if(I.opaque)Y.enable(17);if(I.pointsUvs)Y.enable(18);if(I.decodeVideoTexture)Y.enable(19);if(I.decodeVideoTextureEmissive)Y.enable(20);if(I.alphaToCoverage)Y.enable(21);if(I.numLightProbeGrids>0)Y.enable(22);L.push(Y.mask)}function M(L){let I=q[L.type],b;if(I){let T=A9[I];b=QX.clone(T.uniforms)}else b=L.uniforms;return b}function V(L,I){let b=E.get(I);if(b!==void 0)++b.usedTimes;else b=new X1(J,I,L,W),U.push(b),E.set(I,b);return b}function _(L){if(--L.usedTimes===0){let I=U.indexOf(L);U[I]=U[U.length-1],U.pop(),E.delete(L.cacheKey),L.destroy()}}function A(L){H.remove(L)}function C(){H.dispose()}return{getParameters:R,getProgramCacheKey:F,getUniforms:M,acquireProgram:V,releaseProgram:_,releaseShaderCache:A,programs:U,dispose:C}}function N1(){let J=new WeakMap;function Q(Y){return J.has(Y)}function $(Y){let H=J.get(Y);if(H===void 0)H={},J.set(Y,H);return H}function Z(Y){J.delete(Y)}function W(Y,H,X){J.get(Y)[H]=X}function K(){J=new WeakMap}return{has:Q,get:$,remove:Z,update:W,dispose:K}}function q1(J,Q){if(J.groupOrder!==Q.groupOrder)return J.groupOrder-Q.groupOrder;else if(J.renderOrder!==Q.renderOrder)return J.renderOrder-Q.renderOrder;else if(J.material.id!==Q.material.id)return J.material.id-Q.material.id;else if(J.materialVariant!==Q.materialVariant)return J.materialVariant-Q.materialVariant;else if(J.z!==Q.z)return J.z-Q.z;else return J.id-Q.id}function FU(J,Q){if(J.groupOrder!==Q.groupOrder)return J.groupOrder-Q.groupOrder;else if(J.renderOrder!==Q.renderOrder)return J.renderOrder-Q.renderOrder;else if(J.z!==Q.z)return Q.z-J.z;else return J.id-Q.id}function OU(){let J=[],Q=0,$=[],Z=[],W=[];function K(){Q=0,$.length=0,Z.length=0,W.length=0}function Y(G){let q=0;if(G.isInstancedMesh)q+=2;if(G.isSkinnedMesh)q+=1;return q}function H(G,q,O,R,F,D){let k=J[Q];if(k===void 0)k={id:G.id,object:G,geometry:q,material:O,materialVariant:Y(G),groupOrder:R,renderOrder:G.renderOrder,z:F,group:D},J[Q]=k;else k.id=G.id,k.object=G,k.geometry=q,k.material=O,k.materialVariant=Y(G),k.groupOrder=R,k.renderOrder=G.renderOrder,k.z=F,k.group=D;return Q++,k}function X(G,q,O,R,F,D){let k=H(G,q,O,R,F,D);if(O.transmission>0)Z.push(k);else if(O.transparent===!0)W.push(k);else $.push(k)}function U(G,q,O,R,F,D){let k=H(G,q,O,R,F,D);if(O.transmission>0)Z.unshift(k);else if(O.transparent===!0)W.unshift(k);else $.unshift(k)}function E(G,q){if($.length>1)$.sort(G||q1);if(Z.length>1)Z.sort(q||FU);if(W.length>1)W.sort(q||FU)}function N(){for(let G=Q,q=J.length;G<q;G++){let O=J[G];if(O.id===null)break;O.id=null,O.object=null,O.geometry=null,O.material=null,O.group=null}}return{opaque:$,transmissive:Z,transparent:W,init:K,push:X,unshift:U,finish:N,sort:E}}function D1(){let J=new WeakMap;function Q(Z,W){let K=J.get(Z),Y;if(K===void 0)Y=new OU,J.set(Z,[Y]);else if(W>=K.length)Y=new OU,K.push(Y);else Y=K[W];return Y}function $(){J=new WeakMap}return{get:Q,dispose:$}}function F1(){let J={};return{get:function(Q){if(J[Q.id]!==void 0)return J[Q.id];let $;switch(Q.type){case"DirectionalLight":$={direction:new P,color:new V0};break;case"SpotLight":$={position:new P,direction:new P,color:new V0,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":$={position:new P,color:new V0,distance:0,decay:0};break;case"HemisphereLight":$={direction:new P,skyColor:new V0,groundColor:new V0};break;case"RectAreaLight":$={color:new V0,position:new P,halfWidth:new P,halfHeight:new P};break}return J[Q.id]=$,$}}}function O1(){let J={};return{get:function(Q){if(J[Q.id]!==void 0)return J[Q.id];let $;switch(Q.type){case"DirectionalLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new r};break;case"SpotLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new r};break;case"PointLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new r,shadowCameraNear:1,shadowCameraFar:1000};break}return J[Q.id]=$,$}}}var R1=0;function k1(J,Q){return(Q.castShadow?2:0)-(J.castShadow?2:0)+(Q.map?1:0)-(J.map?1:0)}function M1(J){let Q=new F1,$=O1(),Z={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let U=0;U<9;U++)Z.probe.push(new P);let W=new P,K=new d0,Y=new d0;function H(U){let E=0,N=0,G=0;for(let I=0;I<9;I++)Z.probe[I].set(0,0,0);let q=0,O=0,R=0,F=0,D=0,k=0,M=0,V=0,_=0,A=0,C=0;U.sort(k1);for(let I=0,b=U.length;I<b;I++){let T=U[I],p=T.color,u=T.intensity,y=T.distance,l=null;if(T.shadow&&T.shadow.map)if(T.shadow.map.texture.format===j8)l=T.shadow.map.texture;else l=T.shadow.map.depthTexture||T.shadow.map.texture;if(T.isAmbientLight)E+=p.r*u,N+=p.g*u,G+=p.b*u;else if(T.isLightProbe){for(let h=0;h<9;h++)Z.probe[h].addScaledVector(T.sh.coefficients[h],u);C++}else if(T.isDirectionalLight){let h=Q.get(T);if(h.color.copy(T.color).multiplyScalar(T.intensity),T.castShadow){let m=T.shadow,a=$.get(T);a.shadowIntensity=m.intensity,a.shadowBias=m.bias,a.shadowNormalBias=m.normalBias,a.shadowRadius=m.radius,a.shadowMapSize=m.mapSize,Z.directionalShadow[q]=a,Z.directionalShadowMap[q]=l,Z.directionalShadowMatrix[q]=T.shadow.matrix,k++}Z.directional[q]=h,q++}else if(T.isSpotLight){let h=Q.get(T);h.position.setFromMatrixPosition(T.matrixWorld),h.color.copy(p).multiplyScalar(u),h.distance=y,h.coneCos=Math.cos(T.angle),h.penumbraCos=Math.cos(T.angle*(1-T.penumbra)),h.decay=T.decay,Z.spot[R]=h;let m=T.shadow;if(T.map){if(Z.spotLightMap[_]=T.map,_++,m.updateMatrices(T),T.castShadow)A++}if(Z.spotLightMatrix[R]=m.matrix,T.castShadow){let a=$.get(T);a.shadowIntensity=m.intensity,a.shadowBias=m.bias,a.shadowNormalBias=m.normalBias,a.shadowRadius=m.radius,a.shadowMapSize=m.mapSize,Z.spotShadow[R]=a,Z.spotShadowMap[R]=l,V++}R++}else if(T.isRectAreaLight){let h=Q.get(T);h.color.copy(p).multiplyScalar(u),h.halfWidth.set(T.width*0.5,0,0),h.halfHeight.set(0,T.height*0.5,0),Z.rectArea[F]=h,F++}else if(T.isPointLight){let h=Q.get(T);if(h.color.copy(T.color).multiplyScalar(T.intensity),h.distance=T.distance,h.decay=T.decay,T.castShadow){let m=T.shadow,a=$.get(T);a.shadowIntensity=m.intensity,a.shadowBias=m.bias,a.shadowNormalBias=m.normalBias,a.shadowRadius=m.radius,a.shadowMapSize=m.mapSize,a.shadowCameraNear=m.camera.near,a.shadowCameraFar=m.camera.far,Z.pointShadow[O]=a,Z.pointShadowMap[O]=l,Z.pointShadowMatrix[O]=T.shadow.matrix,M++}Z.point[O]=h,O++}else if(T.isHemisphereLight){let h=Q.get(T);h.skyColor.copy(T.color).multiplyScalar(u),h.groundColor.copy(T.groundColor).multiplyScalar(u),Z.hemi[D]=h,D++}}if(F>0)if(J.has("OES_texture_float_linear")===!0)Z.rectAreaLTC1=F0.LTC_FLOAT_1,Z.rectAreaLTC2=F0.LTC_FLOAT_2;else Z.rectAreaLTC1=F0.LTC_HALF_1,Z.rectAreaLTC2=F0.LTC_HALF_2;Z.ambient[0]=E,Z.ambient[1]=N,Z.ambient[2]=G;let L=Z.hash;if(L.directionalLength!==q||L.pointLength!==O||L.spotLength!==R||L.rectAreaLength!==F||L.hemiLength!==D||L.numDirectionalShadows!==k||L.numPointShadows!==M||L.numSpotShadows!==V||L.numSpotMaps!==_||L.numLightProbes!==C)Z.directional.length=q,Z.spot.length=R,Z.rectArea.length=F,Z.point.length=O,Z.hemi.length=D,Z.directionalShadow.length=k,Z.directionalShadowMap.length=k,Z.pointShadow.length=M,Z.pointShadowMap.length=M,Z.spotShadow.length=V,Z.spotShadowMap.length=V,Z.directionalShadowMatrix.length=k,Z.pointShadowMatrix.length=M,Z.spotLightMatrix.length=V+_-A,Z.spotLightMap.length=_,Z.numSpotLightShadowsWithMaps=A,Z.numLightProbes=C,L.directionalLength=q,L.pointLength=O,L.spotLength=R,L.rectAreaLength=F,L.hemiLength=D,L.numDirectionalShadows=k,L.numPointShadows=M,L.numSpotShadows=V,L.numSpotMaps=_,L.numLightProbes=C,Z.version=R1++}function X(U,E){let N=0,G=0,q=0,O=0,R=0,F=E.matrixWorldInverse;for(let D=0,k=U.length;D<k;D++){let M=U[D];if(M.isDirectionalLight){let V=Z.directional[N];V.direction.setFromMatrixPosition(M.matrixWorld),W.setFromMatrixPosition(M.target.matrixWorld),V.direction.sub(W),V.direction.transformDirection(F),N++}else if(M.isSpotLight){let V=Z.spot[q];V.position.setFromMatrixPosition(M.matrixWorld),V.position.applyMatrix4(F),V.direction.setFromMatrixPosition(M.matrixWorld),W.setFromMatrixPosition(M.target.matrixWorld),V.direction.sub(W),V.direction.transformDirection(F),q++}else if(M.isRectAreaLight){let V=Z.rectArea[O];V.position.setFromMatrixPosition(M.matrixWorld),V.position.applyMatrix4(F),Y.identity(),K.copy(M.matrixWorld),K.premultiply(F),Y.extractRotation(K),V.halfWidth.set(M.width*0.5,0,0),V.halfHeight.set(0,M.height*0.5,0),V.halfWidth.applyMatrix4(Y),V.halfHeight.applyMatrix4(Y),O++}else if(M.isPointLight){let V=Z.point[G];V.position.setFromMatrixPosition(M.matrixWorld),V.position.applyMatrix4(F),G++}else if(M.isHemisphereLight){let V=Z.hemi[R];V.direction.setFromMatrixPosition(M.matrixWorld),V.direction.transformDirection(F),R++}}}return{setup:H,setupView:X,state:Z}}function RU(J){let Q=new M1(J),$=[],Z=[],W=[];function K(G){N.camera=G,$.length=0,Z.length=0,W.length=0}function Y(G){$.push(G)}function H(G){Z.push(G)}function X(G){W.push(G)}function U(){Q.setup($)}function E(G){Q.setupView($,G)}let N={lightsArray:$,shadowsArray:Z,lightProbeGridArray:W,camera:null,lights:Q,transmissionRenderTarget:{},textureUnits:0};return{init:K,state:N,setupLights:U,setupLightsView:E,pushLight:Y,pushShadow:H,pushLightProbeGrid:X}}function L1(J){let Q=new WeakMap;function $(W,K=0){let Y=Q.get(W),H;if(Y===void 0)H=new RU(J),Q.set(W,[H]);else if(K>=Y.length)H=new RU(J),Y.push(H);else H=Y[K];return H}function Z(){Q=new WeakMap}return{get:$,dispose:Z}}var V1=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,B1=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,z1=[new P(1,0,0),new P(-1,0,0),new P(0,1,0),new P(0,-1,0),new P(0,0,1),new P(0,0,-1)],I1=[new P(0,-1,0),new P(0,-1,0),new P(0,0,1),new P(0,0,-1),new P(0,-1,0),new P(0,-1,0)],kU=new d0,q6=new P,HK=new P;function _1(J,Q,$){let Z=new f8,W=new r,K=new r,Y=new GJ,H=new J$,X=new Q$,U={},E=$.maxTextureSize,N={[R7]:sJ,[sJ]:R7,[z9]:z9},G=new J9({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new r},radius:{value:4}},vertexShader:V1,fragmentShader:B1}),q=G.clone();q.defines.HORIZONTAL_PASS=1;let O=new n0;O.setAttribute("position",new UJ(new Float32Array([-1,-1,0.5,3,-1,0.5,-1,3,0.5]),3));let R=new IJ(O,G),F=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=o7;let D=this.type;this.render=function(A,C,L){if(F.enabled===!1)return;if(F.autoUpdate===!1&&F.needsUpdate===!1)return;if(A.length===0)return;if(this.type===jY)X0("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=o7;let I=J.getRenderTarget(),b=J.getActiveCubeFace(),T=J.getActiveMipmapLevel(),p=J.state;if(p.setBlending(I9),p.buffers.depth.getReversed()===!0)p.buffers.color.setClear(0,0,0,0);else p.buffers.color.setClear(1,1,1,1);p.buffers.depth.setTest(!0),p.setScissorTest(!1);let u=D!==this.type;if(u)C.traverse(function(y){if(y.material)if(Array.isArray(y.material))y.material.forEach((l)=>l.needsUpdate=!0);else y.material.needsUpdate=!0});for(let y=0,l=A.length;y<l;y++){let h=A[y],m=h.shadow;if(m===void 0){X0("WebGLShadowMap:",h,"has no shadow.");continue}if(m.autoUpdate===!1&&m.needsUpdate===!1)continue;W.copy(m.mapSize);let a=m.getFrameExtents();if(W.multiply(a),K.copy(m.mapSize),W.x>E||W.y>E){if(W.x>E)K.x=Math.floor(E/a.x),W.x=K.x*a.x,m.mapSize.x=K.x;if(W.y>E)K.y=Math.floor(E/a.y),W.y=K.y*a.y,m.mapSize.y=K.y}let W0=J.state.buffers.depth.getReversed();if(m.camera._reversedDepth=W0,m.map===null||u===!0){if(m.map!==null){if(m.map.depthTexture!==null)m.map.depthTexture.dispose(),m.map.depthTexture=null;m.map.dispose()}if(this.type===O7){if(h.isPointLight){X0("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}m.map=new oJ(W.x,W.y,{format:j8,type:p9,minFilter:iJ,magFilter:iJ,generateMipmaps:!1}),m.map.texture.name=h.name+".shadowMap",m.map.depthTexture=new Z8(W.x,W.y,g9),m.map.depthTexture.name=h.name+".shadowMapDepth",m.map.depthTexture.format=T8,m.map.depthTexture.compareFunction=null,m.map.depthTexture.minFilter=Q8,m.map.depthTexture.magFilter=Q8}else{if(h.isPointLight)m.map=new EK(W.x),m.map.depthTexture=new DW(W.x,$8);else m.map=new oJ(W.x,W.y),m.map.depthTexture=new Z8(W.x,W.y,$8);if(m.map.depthTexture.name=h.name+".shadowMap",m.map.depthTexture.format=T8,this.type===o7)m.map.depthTexture.compareFunction=W0?zQ:BQ,m.map.depthTexture.minFilter=iJ,m.map.depthTexture.magFilter=iJ;else m.map.depthTexture.compareFunction=null,m.map.depthTexture.minFilter=Q8,m.map.depthTexture.magFilter=Q8}m.camera.updateProjectionMatrix()}let N0=m.map.isWebGLCubeRenderTarget?6:1;for(let j0=0;j0<N0;j0++){if(m.map.isWebGLCubeRenderTarget)J.setRenderTarget(m.map,j0),J.clear();else{if(j0===0)J.setRenderTarget(m.map),J.clear();let B0=m.getViewport(j0);Y.set(K.x*B0.x,K.y*B0.y,K.x*B0.z,K.y*B0.w),p.viewport(Y)}if(h.isPointLight){let{camera:B0,matrix:ZJ}=m,r0=h.distance||B0.far;if(r0!==B0.far)B0.far=r0,B0.updateProjectionMatrix();q6.setFromMatrixPosition(h.matrixWorld),B0.position.copy(q6),HK.copy(B0.position),HK.add(z1[j0]),B0.up.copy(I1[j0]),B0.lookAt(HK),B0.updateMatrixWorld(),ZJ.makeTranslation(-q6.x,-q6.y,-q6.z),kU.multiplyMatrices(B0.projectionMatrix,B0.matrixWorldInverse),m._frustum.setFromProjectionMatrix(kU,B0.coordinateSystem,B0.reversedDepth)}else m.updateMatrices(h);Z=m.getFrustum(),V(C,L,m.camera,h,this.type)}if(m.isPointLightShadow!==!0&&this.type===O7)k(m,L);m.needsUpdate=!1}D=this.type,F.needsUpdate=!1,J.setRenderTarget(I,b,T)};function k(A,C){let L=Q.update(R);if(G.defines.VSM_SAMPLES!==A.blurSamples)G.defines.VSM_SAMPLES=A.blurSamples,q.defines.VSM_SAMPLES=A.blurSamples,G.needsUpdate=!0,q.needsUpdate=!0;if(A.mapPass===null)A.mapPass=new oJ(W.x,W.y,{format:j8,type:p9});G.uniforms.shadow_pass.value=A.map.depthTexture,G.uniforms.resolution.value=A.mapSize,G.uniforms.radius.value=A.radius,J.setRenderTarget(A.mapPass),J.clear(),J.renderBufferDirect(C,null,L,G,R,null),q.uniforms.shadow_pass.value=A.mapPass.texture,q.uniforms.resolution.value=A.mapSize,q.uniforms.radius.value=A.radius,J.setRenderTarget(A.map),J.clear(),J.renderBufferDirect(C,null,L,q,R,null)}function M(A,C,L,I){let b=null,T=L.isPointLight===!0?A.customDistanceMaterial:A.customDepthMaterial;if(T!==void 0)b=T;else if(b=L.isPointLight===!0?X:H,J.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0||C.alphaToCoverage===!0){let p=b.uuid,u=C.uuid,y=U[p];if(y===void 0)y={},U[p]=y;let l=y[u];if(l===void 0)l=b.clone(),y[u]=l,C.addEventListener("dispose",_);b=l}if(b.visible=C.visible,b.wireframe=C.wireframe,I===O7)b.side=C.shadowSide!==null?C.shadowSide:C.side;else b.side=C.shadowSide!==null?C.shadowSide:N[C.side];if(b.alphaMap=C.alphaMap,b.alphaTest=C.alphaToCoverage===!0?0.5:C.alphaTest,b.map=C.map,b.clipShadows=C.clipShadows,b.clippingPlanes=C.clippingPlanes,b.clipIntersection=C.clipIntersection,b.displacementMap=C.displacementMap,b.displacementScale=C.displacementScale,b.displacementBias=C.displacementBias,b.wireframeLinewidth=C.wireframeLinewidth,b.linewidth=C.linewidth,L.isPointLight===!0&&b.isMeshDistanceMaterial===!0){let p=J.properties.get(b);p.light=L}return b}function V(A,C,L,I,b){if(A.visible===!1)return;if(A.layers.test(C.layers)&&(A.isMesh||A.isLine||A.isPoints)){if((A.castShadow||A.receiveShadow&&b===O7)&&(!A.frustumCulled||Z.intersectsObject(A))){A.modelViewMatrix.multiplyMatrices(L.matrixWorldInverse,A.matrixWorld);let u=Q.update(A),y=A.material;if(Array.isArray(y)){let l=u.groups;for(let h=0,m=l.length;h<m;h++){let a=l[h],W0=y[a.materialIndex];if(W0&&W0.visible){let N0=M(A,W0,I,b);A.onBeforeShadow(J,A,C,L,u,N0,a),J.renderBufferDirect(L,null,u,N0,A,a),A.onAfterShadow(J,A,C,L,u,N0,a)}}}else if(y.visible){let l=M(A,y,I,b);A.onBeforeShadow(J,A,C,L,u,l,null),J.renderBufferDirect(L,null,u,l,A,null),A.onAfterShadow(J,A,C,L,u,l,null)}}}let p=A.children;for(let u=0,y=p.length;u<y;u++)V(p[u],C,L,I,b)}function _(A){A.target.removeEventListener("dispose",_);for(let L in U){let I=U[L],b=A.target.uuid;if(b in I)I[b].dispose(),delete I[b]}}}function w1(J,Q){function $(){let j=!1,U0=new GJ,n=null,Y0=new GJ(0,0,0,0);return{setMask:function(C0){if(n!==C0&&!j)J.colorMask(C0,C0,C0,C0),n=C0},setLocked:function(C0){j=C0},setClear:function(C0,Q0,v0,s0,_J){if(_J===!0)C0*=s0,Q0*=s0,v0*=s0;if(U0.set(C0,Q0,v0,s0),Y0.equals(U0)===!1)J.clearColor(C0,Q0,v0,s0),Y0.copy(U0)},reset:function(){j=!1,n=null,Y0.set(-1,0,0,0)}}}function Z(){let j=!1,U0=!1,n=null,Y0=null,C0=null;return{setReversed:function(Q0){if(U0!==Q0){let v0=Q.get("EXT_clip_control");if(Q0)v0.clipControlEXT(v0.LOWER_LEFT_EXT,v0.ZERO_TO_ONE_EXT);else v0.clipControlEXT(v0.LOWER_LEFT_EXT,v0.NEGATIVE_ONE_TO_ONE_EXT);U0=Q0;let s0=C0;C0=null,this.setClear(s0)}},getReversed:function(){return U0},setTest:function(Q0){if(Q0)G0(J.DEPTH_TEST);else b0(J.DEPTH_TEST)},setMask:function(Q0){if(n!==Q0&&!j)J.depthMask(Q0),n=Q0},setFunc:function(Q0){if(U0)Q0=SH[Q0];if(Y0!==Q0){switch(Q0){case eY:J.depthFunc(J.NEVER);break;case JH:J.depthFunc(J.ALWAYS);break;case QH:J.depthFunc(J.LESS);break;case XZ:J.depthFunc(J.LEQUAL);break;case $H:J.depthFunc(J.EQUAL);break;case ZH:J.depthFunc(J.GEQUAL);break;case WH:J.depthFunc(J.GREATER);break;case KH:J.depthFunc(J.NOTEQUAL);break;default:J.depthFunc(J.LEQUAL)}Y0=Q0}},setLocked:function(Q0){j=Q0},setClear:function(Q0){if(C0!==Q0){if(C0=Q0,U0)Q0=1-Q0;J.clearDepth(Q0)}},reset:function(){j=!1,n=null,Y0=null,C0=null,U0=!1}}}function W(){let j=!1,U0=null,n=null,Y0=null,C0=null,Q0=null,v0=null,s0=null,_J=null;return{setTest:function(EJ){if(!j)if(EJ)G0(J.STENCIL_TEST);else b0(J.STENCIL_TEST)},setMask:function(EJ){if(U0!==EJ&&!j)J.stencilMask(EJ),U0=EJ},setFunc:function(EJ,O9,H9){if(n!==EJ||Y0!==O9||C0!==H9)J.stencilFunc(EJ,O9,H9),n=EJ,Y0=O9,C0=H9},setOp:function(EJ,O9,H9){if(Q0!==EJ||v0!==O9||s0!==H9)J.stencilOp(EJ,O9,H9),Q0=EJ,v0=O9,s0=H9},setLocked:function(EJ){j=EJ},setClear:function(EJ){if(_J!==EJ)J.clearStencil(EJ),_J=EJ},reset:function(){j=!1,U0=null,n=null,Y0=null,C0=null,Q0=null,v0=null,s0=null,_J=null}}}let K=new $,Y=new Z,H=new W,X=new WeakMap,U=new WeakMap,E={},N={},G={},q=new WeakMap,O=[],R=null,F=!1,D=null,k=null,M=null,V=null,_=null,A=null,C=null,L=new V0(0,0,0),I=0,b=!1,T=null,p=null,u=null,y=null,l=null,h=J.getParameter(J.MAX_COMBINED_TEXTURE_IMAGE_UNITS),m=!1,a=0,W0=J.getParameter(J.VERSION);if(W0.indexOf("WebGL")!==-1)a=parseFloat(/^WebGL (\d)/.exec(W0)[1]),m=a>=1;else if(W0.indexOf("OpenGL ES")!==-1)a=parseFloat(/^OpenGL ES (\d)/.exec(W0)[1]),m=a>=2;let N0=null,j0={},B0=J.getParameter(J.SCISSOR_BOX),ZJ=J.getParameter(J.VIEWPORT),r0=new GJ().fromArray(B0),s=new GJ().fromArray(ZJ);function O0(j,U0,n,Y0){let C0=new Uint8Array(4),Q0=J.createTexture();J.bindTexture(j,Q0),J.texParameteri(j,J.TEXTURE_MIN_FILTER,J.NEAREST),J.texParameteri(j,J.TEXTURE_MAG_FILTER,J.NEAREST);for(let v0=0;v0<n;v0++)if(j===J.TEXTURE_3D||j===J.TEXTURE_2D_ARRAY)J.texImage3D(U0,0,J.RGBA,1,1,Y0,0,J.RGBA,J.UNSIGNED_BYTE,C0);else J.texImage2D(U0+v0,0,J.RGBA,1,1,0,J.RGBA,J.UNSIGNED_BYTE,C0);return Q0}let P0={};P0[J.TEXTURE_2D]=O0(J.TEXTURE_2D,J.TEXTURE_2D,1),P0[J.TEXTURE_CUBE_MAP]=O0(J.TEXTURE_CUBE_MAP,J.TEXTURE_CUBE_MAP_POSITIVE_X,6),P0[J.TEXTURE_2D_ARRAY]=O0(J.TEXTURE_2D_ARRAY,J.TEXTURE_2D_ARRAY,1,1),P0[J.TEXTURE_3D]=O0(J.TEXTURE_3D,J.TEXTURE_3D,1,1),K.setClear(0,0,0,1),Y.setClear(1),H.setClear(0),G0(J.DEPTH_TEST),Y.setFunc(XZ),M0(!1),x0(WZ),G0(J.CULL_FACE),e(I9);function G0(j){if(E[j]!==!0)J.enable(j),E[j]=!0}function b0(j){if(E[j]!==!1)J.disable(j),E[j]=!1}function WJ(j,U0){if(G[j]!==U0){if(J.bindFramebuffer(j,U0),G[j]=U0,j===J.DRAW_FRAMEBUFFER)G[J.FRAMEBUFFER]=U0;if(j===J.FRAMEBUFFER)G[J.DRAW_FRAMEBUFFER]=U0;return!0}return!1}function p0(j,U0){let n=O,Y0=!1;if(j){if(n=q.get(U0),n===void 0)n=[],q.set(U0,n);let C0=j.textures;if(n.length!==C0.length||n[0]!==J.COLOR_ATTACHMENT0){for(let Q0=0,v0=C0.length;Q0<v0;Q0++)n[Q0]=J.COLOR_ATTACHMENT0+Q0;n.length=C0.length,Y0=!0}}else if(n[0]!==J.BACK)n[0]=J.BACK,Y0=!0;if(Y0)J.drawBuffers(n)}function l0(j){if(R!==j)return J.useProgram(j),R=j,!0;return!1}let t={[k7]:J.FUNC_ADD,[vY]:J.FUNC_SUBTRACT,[fY]:J.FUNC_REVERSE_SUBTRACT};t[bY]=J.MIN,t[hY]=J.MAX;let $0={[xY]:J.ZERO,[gY]:J.ONE,[pY]:J.SRC_COLOR,[dY]:J.SRC_ALPHA,[iY]:J.SRC_ALPHA_SATURATE,[nY]:J.DST_COLOR,[uY]:J.DST_ALPHA,[mY]:J.ONE_MINUS_SRC_COLOR,[lY]:J.ONE_MINUS_SRC_ALPHA,[sY]:J.ONE_MINUS_DST_COLOR,[cY]:J.ONE_MINUS_DST_ALPHA,[oY]:J.CONSTANT_COLOR,[aY]:J.ONE_MINUS_CONSTANT_COLOR,[rY]:J.CONSTANT_ALPHA,[tY]:J.ONE_MINUS_CONSTANT_ALPHA};function e(j,U0,n,Y0,C0,Q0,v0,s0,_J,EJ){if(j===I9){if(F===!0)b0(J.BLEND),F=!1;return}if(F===!1)G0(J.BLEND),F=!0;if(j!==yY){if(j!==D||EJ!==b){if(k!==k7||_!==k7)J.blendEquation(J.FUNC_ADD),k=k7,_=k7;if(EJ)switch(j){case a7:J.blendFuncSeparate(J.ONE,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case KZ:J.blendFunc(J.ONE,J.ONE);break;case YZ:J.blendFuncSeparate(J.ZERO,J.ONE_MINUS_SRC_COLOR,J.ZERO,J.ONE);break;case HZ:J.blendFuncSeparate(J.DST_COLOR,J.ONE_MINUS_SRC_ALPHA,J.ZERO,J.ONE);break;default:T0("WebGLState: Invalid blending: ",j);break}else switch(j){case a7:J.blendFuncSeparate(J.SRC_ALPHA,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case KZ:J.blendFuncSeparate(J.SRC_ALPHA,J.ONE,J.ONE,J.ONE);break;case YZ:T0("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case HZ:T0("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:T0("WebGLState: Invalid blending: ",j);break}M=null,V=null,A=null,C=null,L.set(0,0,0),I=0,D=j,b=EJ}return}if(C0=C0||U0,Q0=Q0||n,v0=v0||Y0,U0!==k||C0!==_)J.blendEquationSeparate(t[U0],t[C0]),k=U0,_=C0;if(n!==M||Y0!==V||Q0!==A||v0!==C)J.blendFuncSeparate($0[n],$0[Y0],$0[Q0],$0[v0]),M=n,V=Y0,A=Q0,C=v0;if(s0.equals(L)===!1||_J!==I)J.blendColor(s0.r,s0.g,s0.b,_J),L.copy(s0),I=_J;D=j,b=!1}function L0(j,U0){j.side===z9?b0(J.CULL_FACE):G0(J.CULL_FACE);let n=j.side===sJ;if(U0)n=!n;M0(n),j.blending===a7&&j.transparent===!1?e(I9):e(j.blending,j.blendEquation,j.blendSrc,j.blendDst,j.blendEquationAlpha,j.blendSrcAlpha,j.blendDstAlpha,j.blendColor,j.blendAlpha,j.premultipliedAlpha),Y.setFunc(j.depthFunc),Y.setTest(j.depthTest),Y.setMask(j.depthWrite),K.setMask(j.colorWrite);let Y0=j.stencilWrite;if(H.setTest(Y0),Y0)H.setMask(j.stencilWriteMask),H.setFunc(j.stencilFunc,j.stencilRef,j.stencilFuncMask),H.setOp(j.stencilFail,j.stencilZFail,j.stencilZPass);t0(j.polygonOffset,j.polygonOffsetFactor,j.polygonOffsetUnits),j.alphaToCoverage===!0?G0(J.SAMPLE_ALPHA_TO_COVERAGE):b0(J.SAMPLE_ALPHA_TO_COVERAGE)}function M0(j){if(T!==j){if(j)J.frontFace(J.CW);else J.frontFace(J.CCW);T=j}}function x0(j){if(j!==TY){if(G0(J.CULL_FACE),j!==p)if(j===WZ)J.cullFace(J.BACK);else if(j===SY)J.cullFace(J.FRONT);else J.cullFace(J.FRONT_AND_BACK)}else b0(J.CULL_FACE);p=j}function S(j){if(j!==u){if(m)J.lineWidth(j);u=j}}function t0(j,U0,n){if(j){if(G0(J.POLYGON_OFFSET_FILL),y!==U0||l!==n){if(y=U0,l=n,Y.getReversed())U0=-U0;J.polygonOffset(U0,n)}}else b0(J.POLYGON_OFFSET_FILL)}function y0(j){if(j)G0(J.SCISSOR_TEST);else b0(J.SCISSOR_TEST)}function g0(j){if(j===void 0)j=J.TEXTURE0+h-1;if(N0!==j)J.activeTexture(j),N0=j}function K0(j,U0,n){if(n===void 0)if(N0===null)n=J.TEXTURE0+h-1;else n=N0;let Y0=j0[n];if(Y0===void 0)Y0={type:void 0,texture:void 0},j0[n]=Y0;if(Y0.type!==j||Y0.texture!==U0){if(N0!==n)J.activeTexture(n),N0=n;J.bindTexture(j,U0||P0[j]),Y0.type=j,Y0.texture=U0}}function XJ(){let j=j0[N0];if(j!==void 0&&j.type!==void 0)J.bindTexture(j.type,null),j.type=void 0,j.texture=void 0}function w0(){try{J.compressedTexImage2D(...arguments)}catch(j){T0("WebGLState:",j)}}function w(){try{J.compressedTexImage3D(...arguments)}catch(j){T0("WebGLState:",j)}}function B(){try{J.texSubImage2D(...arguments)}catch(j){T0("WebGLState:",j)}}function f(){try{J.texSubImage3D(...arguments)}catch(j){T0("WebGLState:",j)}}function i(){try{J.compressedTexSubImage2D(...arguments)}catch(j){T0("WebGLState:",j)}}function J0(){try{J.compressedTexSubImage3D(...arguments)}catch(j){T0("WebGLState:",j)}}function Z0(){try{J.texStorage2D(...arguments)}catch(j){T0("WebGLState:",j)}}function q0(){try{J.texStorage3D(...arguments)}catch(j){T0("WebGLState:",j)}}function c(){try{J.texImage2D(...arguments)}catch(j){T0("WebGLState:",j)}}function o(){try{J.texImage3D(...arguments)}catch(j){T0("WebGLState:",j)}}function E0(j){if(N[j]!==void 0)return N[j];else return J.getParameter(j)}function A0(j,U0){if(N[j]!==U0)J.pixelStorei(j,U0),N[j]=U0}function H0(j){if(r0.equals(j)===!1)J.scissor(j.x,j.y,j.z,j.w),r0.copy(j)}function D0(j){if(s.equals(j)===!1)J.viewport(j.x,j.y,j.z,j.w),s.copy(j)}function c0(j,U0){let n=U.get(U0);if(n===void 0)n=new WeakMap,U.set(U0,n);let Y0=n.get(j);if(Y0===void 0)Y0=J.getUniformBlockIndex(U0,j.name),n.set(j,Y0)}function a0(j,U0){let Y0=U.get(U0).get(j);if(X.get(U0)!==Y0)J.uniformBlockBinding(U0,Y0,j.__bindingPointIndex),X.set(U0,Y0)}function JJ(){J.disable(J.BLEND),J.disable(J.CULL_FACE),J.disable(J.DEPTH_TEST),J.disable(J.POLYGON_OFFSET_FILL),J.disable(J.SCISSOR_TEST),J.disable(J.STENCIL_TEST),J.disable(J.SAMPLE_ALPHA_TO_COVERAGE),J.blendEquation(J.FUNC_ADD),J.blendFunc(J.ONE,J.ZERO),J.blendFuncSeparate(J.ONE,J.ZERO,J.ONE,J.ZERO),J.blendColor(0,0,0,0),J.colorMask(!0,!0,!0,!0),J.clearColor(0,0,0,0),J.depthMask(!0),J.depthFunc(J.LESS),Y.setReversed(!1),J.clearDepth(1),J.stencilMask(4294967295),J.stencilFunc(J.ALWAYS,0,4294967295),J.stencilOp(J.KEEP,J.KEEP,J.KEEP),J.clearStencil(0),J.cullFace(J.BACK),J.frontFace(J.CCW),J.polygonOffset(0,0),J.activeTexture(J.TEXTURE0),J.bindFramebuffer(J.FRAMEBUFFER,null),J.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),J.bindFramebuffer(J.READ_FRAMEBUFFER,null),J.useProgram(null),J.lineWidth(1),J.scissor(0,0,J.canvas.width,J.canvas.height),J.viewport(0,0,J.canvas.width,J.canvas.height),J.pixelStorei(J.PACK_ALIGNMENT,4),J.pixelStorei(J.UNPACK_ALIGNMENT,4),J.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,!1),J.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),J.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,J.BROWSER_DEFAULT_WEBGL),J.pixelStorei(J.PACK_ROW_LENGTH,0),J.pixelStorei(J.PACK_SKIP_PIXELS,0),J.pixelStorei(J.PACK_SKIP_ROWS,0),J.pixelStorei(J.UNPACK_ROW_LENGTH,0),J.pixelStorei(J.UNPACK_IMAGE_HEIGHT,0),J.pixelStorei(J.UNPACK_SKIP_PIXELS,0),J.pixelStorei(J.UNPACK_SKIP_ROWS,0),J.pixelStorei(J.UNPACK_SKIP_IMAGES,0),E={},N={},N0=null,j0={},G={},q=new WeakMap,O=[],R=null,F=!1,D=null,k=null,M=null,V=null,_=null,A=null,C=null,L=new V0(0,0,0),I=0,b=!1,T=null,p=null,u=null,y=null,l=null,r0.set(0,0,J.canvas.width,J.canvas.height),s.set(0,0,J.canvas.width,J.canvas.height),K.reset(),Y.reset(),H.reset()}return{buffers:{color:K,depth:Y,stencil:H},enable:G0,disable:b0,bindFramebuffer:WJ,drawBuffers:p0,useProgram:l0,setBlending:e,setMaterial:L0,setFlipSided:M0,setCullFace:x0,setLineWidth:S,setPolygonOffset:t0,setScissorTest:y0,activeTexture:g0,bindTexture:K0,unbindTexture:XJ,compressedTexImage2D:w0,compressedTexImage3D:w,texImage2D:c,texImage3D:o,pixelStorei:A0,getParameter:E0,updateUBOMapping:c0,uniformBlockBinding:a0,texStorage2D:Z0,texStorage3D:q0,texSubImage2D:B,texSubImage3D:f,compressedTexSubImage2D:i,compressedTexSubImage3D:J0,scissor:H0,viewport:D0,reset:JJ}}function A1(J,Q,$,Z,W,K,Y){let H=Q.has("WEBGL_multisampled_render_to_texture")?Q.get("WEBGL_multisampled_render_to_texture"):null,X=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),U=new r,E=new WeakMap,N=new Set,G,q=new WeakMap,O=!1;try{O=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch(w){}function R(w,B){return O?new OffscreenCanvas(w,B):G7("canvas")}function F(w,B,f){let i=1,J0=w0(w);if(J0.width>f||J0.height>f)i=f/Math.max(J0.width,J0.height);if(i<1)if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&w instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&w instanceof ImageBitmap||typeof VideoFrame<"u"&&w instanceof VideoFrame){let Z0=Math.floor(i*J0.width),q0=Math.floor(i*J0.height);if(G===void 0)G=R(Z0,q0);let c=B?R(Z0,q0):G;return c.width=Z0,c.height=q0,c.getContext("2d").drawImage(w,0,0,Z0,q0),X0("WebGLRenderer: Texture has been resized from ("+J0.width+"x"+J0.height+") to ("+Z0+"x"+q0+")."),c}else{if("data"in w)X0("WebGLRenderer: Image in DataTexture is too big ("+J0.width+"x"+J0.height+").");return w}return w}function D(w){return w.generateMipmaps}function k(w){J.generateMipmap(w)}function M(w){if(w.isWebGLCubeRenderTarget)return J.TEXTURE_CUBE_MAP;if(w.isWebGL3DRenderTarget)return J.TEXTURE_3D;if(w.isWebGLArrayRenderTarget||w.isCompressedArrayTexture)return J.TEXTURE_2D_ARRAY;return J.TEXTURE_2D}function V(w,B,f,i,J0,Z0=!1){if(w!==null){if(J[w]!==void 0)return J[w];X0("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+w+"'")}let q0;if(i){if(q0=Q.get("EXT_texture_norm16"),!q0)X0("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension")}let c=B;if(B===J.RED){if(f===J.FLOAT)c=J.R32F;if(f===J.HALF_FLOAT)c=J.R16F;if(f===J.UNSIGNED_BYTE)c=J.R8;if(f===J.UNSIGNED_SHORT&&q0)c=q0.R16_EXT;if(f===J.SHORT&&q0)c=q0.R16_SNORM_EXT}if(B===J.RED_INTEGER){if(f===J.UNSIGNED_BYTE)c=J.R8UI;if(f===J.UNSIGNED_SHORT)c=J.R16UI;if(f===J.UNSIGNED_INT)c=J.R32UI;if(f===J.BYTE)c=J.R8I;if(f===J.SHORT)c=J.R16I;if(f===J.INT)c=J.R32I}if(B===J.RG){if(f===J.FLOAT)c=J.RG32F;if(f===J.HALF_FLOAT)c=J.RG16F;if(f===J.UNSIGNED_BYTE)c=J.RG8;if(f===J.UNSIGNED_SHORT&&q0)c=q0.RG16_EXT;if(f===J.SHORT&&q0)c=q0.RG16_SNORM_EXT}if(B===J.RG_INTEGER){if(f===J.UNSIGNED_BYTE)c=J.RG8UI;if(f===J.UNSIGNED_SHORT)c=J.RG16UI;if(f===J.UNSIGNED_INT)c=J.RG32UI;if(f===J.BYTE)c=J.RG8I;if(f===J.SHORT)c=J.RG16I;if(f===J.INT)c=J.RG32I}if(B===J.RGB_INTEGER){if(f===J.UNSIGNED_BYTE)c=J.RGB8UI;if(f===J.UNSIGNED_SHORT)c=J.RGB16UI;if(f===J.UNSIGNED_INT)c=J.RGB32UI;if(f===J.BYTE)c=J.RGB8I;if(f===J.SHORT)c=J.RGB16I;if(f===J.INT)c=J.RGB32I}if(B===J.RGBA_INTEGER){if(f===J.UNSIGNED_BYTE)c=J.RGBA8UI;if(f===J.UNSIGNED_SHORT)c=J.RGBA16UI;if(f===J.UNSIGNED_INT)c=J.RGBA32UI;if(f===J.BYTE)c=J.RGBA8I;if(f===J.SHORT)c=J.RGBA16I;if(f===J.INT)c=J.RGBA32I}if(B===J.RGB){if(f===J.UNSIGNED_SHORT&&q0)c=q0.RGB16_EXT;if(f===J.SHORT&&q0)c=q0.RGB16_SNORM_EXT;if(f===J.UNSIGNED_INT_5_9_9_9_REV)c=J.RGB9_E5;if(f===J.UNSIGNED_INT_10F_11F_11F_REV)c=J.R11F_G11F_B10F}if(B===J.RGBA){let o=Z0?JW:$J.getTransfer(J0);if(f===J.FLOAT)c=J.RGBA32F;if(f===J.HALF_FLOAT)c=J.RGBA16F;if(f===J.UNSIGNED_BYTE)c=o===FJ?J.SRGB8_ALPHA8:J.RGBA8;if(f===J.UNSIGNED_SHORT&&q0)c=q0.RGBA16_EXT;if(f===J.SHORT&&q0)c=q0.RGBA16_SNORM_EXT;if(f===J.UNSIGNED_SHORT_4_4_4_4)c=J.RGBA4;if(f===J.UNSIGNED_SHORT_5_5_5_1)c=J.RGB5_A1}if(c===J.R16F||c===J.R32F||c===J.RG16F||c===J.RG32F||c===J.RGBA16F||c===J.RGBA32F)Q.get("EXT_color_buffer_float");return c}function _(w,B){let f;if(w){if(B===null||B===$8||B===L7)f=J.DEPTH24_STENCIL8;else if(B===g9)f=J.DEPTH32F_STENCIL8;else if(B===e7)f=J.DEPTH24_STENCIL8,X0("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")}else if(B===null||B===$8||B===L7)f=J.DEPTH_COMPONENT24;else if(B===g9)f=J.DEPTH_COMPONENT32F;else if(B===e7)f=J.DEPTH_COMPONENT16;return f}function A(w,B){if(D(w)===!0||w.isFramebufferTexture&&w.minFilter!==Q8&&w.minFilter!==iJ)return Math.log2(Math.max(B.width,B.height))+1;else if(w.mipmaps!==void 0&&w.mipmaps.length>0)return w.mipmaps.length;else if(w.isCompressedTexture&&Array.isArray(w.image))return B.mipmaps.length;else return 1}function C(w){let B=w.target;if(B.removeEventListener("dispose",C),I(B),B.isVideoTexture)E.delete(B);if(B.isHTMLTexture)N.delete(B)}function L(w){let B=w.target;B.removeEventListener("dispose",L),T(B)}function I(w){let B=Z.get(w);if(B.__webglInit===void 0)return;let f=w.source,i=q.get(f);if(i){let J0=i[B.__cacheKey];if(J0.usedTimes--,J0.usedTimes===0)b(w);if(Object.keys(i).length===0)q.delete(f)}Z.remove(w)}function b(w){let B=Z.get(w);J.deleteTexture(B.__webglTexture);let f=w.source,i=q.get(f);delete i[B.__cacheKey],Y.memory.textures--}function T(w){let B=Z.get(w);if(w.depthTexture)w.depthTexture.dispose(),Z.remove(w.depthTexture);if(w.isWebGLCubeRenderTarget)for(let i=0;i<6;i++){if(Array.isArray(B.__webglFramebuffer[i]))for(let J0=0;J0<B.__webglFramebuffer[i].length;J0++)J.deleteFramebuffer(B.__webglFramebuffer[i][J0]);else J.deleteFramebuffer(B.__webglFramebuffer[i]);if(B.__webglDepthbuffer)J.deleteRenderbuffer(B.__webglDepthbuffer[i])}else{if(Array.isArray(B.__webglFramebuffer))for(let i=0;i<B.__webglFramebuffer.length;i++)J.deleteFramebuffer(B.__webglFramebuffer[i]);else J.deleteFramebuffer(B.__webglFramebuffer);if(B.__webglDepthbuffer)J.deleteRenderbuffer(B.__webglDepthbuffer);if(B.__webglMultisampledFramebuffer)J.deleteFramebuffer(B.__webglMultisampledFramebuffer);if(B.__webglColorRenderbuffer){for(let i=0;i<B.__webglColorRenderbuffer.length;i++)if(B.__webglColorRenderbuffer[i])J.deleteRenderbuffer(B.__webglColorRenderbuffer[i])}if(B.__webglDepthRenderbuffer)J.deleteRenderbuffer(B.__webglDepthRenderbuffer)}let f=w.textures;for(let i=0,J0=f.length;i<J0;i++){let Z0=Z.get(f[i]);if(Z0.__webglTexture)J.deleteTexture(Z0.__webglTexture),Y.memory.textures--;Z.remove(f[i])}Z.remove(w)}let p=0;function u(){p=0}function y(){return p}function l(w){p=w}function h(){let w=p;if(w>=W.maxTextures)X0("WebGLTextures: Trying to use "+w+" texture units while this GPU supports only "+W.maxTextures);return p+=1,w}function m(w){let B=[];return B.push(w.wrapS),B.push(w.wrapT),B.push(w.wrapR||0),B.push(w.magFilter),B.push(w.minFilter),B.push(w.anisotropy),B.push(w.internalFormat),B.push(w.format),B.push(w.type),B.push(w.generateMipmaps),B.push(w.premultiplyAlpha),B.push(w.flipY),B.push(w.unpackAlignment),B.push(w.colorSpace),B.join()}function a(w,B){let f=Z.get(w);if(w.isVideoTexture)K0(w);if(w.isRenderTargetTexture===!1&&w.isExternalTexture!==!0&&w.version>0&&f.__version!==w.version){let i=w.image;if(i===null)X0("WebGLRenderer: Texture marked for update but no image data found.");else if(i.complete===!1)X0("WebGLRenderer: Texture marked for update but image is incomplete");else{b0(f,w,B);return}}else if(w.isExternalTexture)f.__webglTexture=w.sourceTexture?w.sourceTexture:null;$.bindTexture(J.TEXTURE_2D,f.__webglTexture,J.TEXTURE0+B)}function W0(w,B){let f=Z.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&f.__version!==w.version){b0(f,w,B);return}else if(w.isExternalTexture)f.__webglTexture=w.sourceTexture?w.sourceTexture:null;$.bindTexture(J.TEXTURE_2D_ARRAY,f.__webglTexture,J.TEXTURE0+B)}function N0(w,B){let f=Z.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&f.__version!==w.version){b0(f,w,B);return}$.bindTexture(J.TEXTURE_3D,f.__webglTexture,J.TEXTURE0+B)}function j0(w,B){let f=Z.get(w);if(w.isCubeDepthTexture!==!0&&w.version>0&&f.__version!==w.version){WJ(f,w,B);return}$.bindTexture(J.TEXTURE_CUBE_MAP,f.__webglTexture,J.TEXTURE0+B)}let B0={[UH]:J.REPEAT,[DQ]:J.CLAMP_TO_EDGE,[GH]:J.MIRRORED_REPEAT},ZJ={[Q8]:J.NEAREST,[EH]:J.NEAREST_MIPMAP_NEAREST,[t7]:J.NEAREST_MIPMAP_LINEAR,[iJ]:J.LINEAR,[FQ]:J.LINEAR_MIPMAP_NEAREST,[P8]:J.LINEAR_MIPMAP_LINEAR},r0={[VH]:J.NEVER,[wH]:J.ALWAYS,[BH]:J.LESS,[BQ]:J.LEQUAL,[zH]:J.EQUAL,[zQ]:J.GEQUAL,[IH]:J.GREATER,[_H]:J.NOTEQUAL};function s(w,B){if(B.type===g9&&Q.has("OES_texture_float_linear")===!1&&(B.magFilter===iJ||B.magFilter===FQ||B.magFilter===t7||B.magFilter===P8||B.minFilter===iJ||B.minFilter===FQ||B.minFilter===t7||B.minFilter===P8))X0("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.");if(J.texParameteri(w,J.TEXTURE_WRAP_S,B0[B.wrapS]),J.texParameteri(w,J.TEXTURE_WRAP_T,B0[B.wrapT]),w===J.TEXTURE_3D||w===J.TEXTURE_2D_ARRAY)J.texParameteri(w,J.TEXTURE_WRAP_R,B0[B.wrapR]);if(J.texParameteri(w,J.TEXTURE_MAG_FILTER,ZJ[B.magFilter]),J.texParameteri(w,J.TEXTURE_MIN_FILTER,ZJ[B.minFilter]),B.compareFunction)J.texParameteri(w,J.TEXTURE_COMPARE_MODE,J.COMPARE_REF_TO_TEXTURE),J.texParameteri(w,J.TEXTURE_COMPARE_FUNC,r0[B.compareFunction]);if(Q.has("EXT_texture_filter_anisotropic")===!0){if(B.magFilter===Q8)return;if(B.minFilter!==t7&&B.minFilter!==P8)return;if(B.type===g9&&Q.has("OES_texture_float_linear")===!1)return;if(B.anisotropy>1||Z.get(B).__currentAnisotropy){let f=Q.get("EXT_texture_filter_anisotropic");J.texParameterf(w,f.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(B.anisotropy,W.getMaxAnisotropy())),Z.get(B).__currentAnisotropy=B.anisotropy}}}function O0(w,B){let f=!1;if(w.__webglInit===void 0)w.__webglInit=!0,B.addEventListener("dispose",C);let i=B.source,J0=q.get(i);if(J0===void 0)J0={},q.set(i,J0);let Z0=m(B);if(Z0!==w.__cacheKey){if(J0[Z0]===void 0)J0[Z0]={texture:J.createTexture(),usedTimes:0},Y.memory.textures++,f=!0;J0[Z0].usedTimes++;let q0=J0[w.__cacheKey];if(q0!==void 0){if(J0[w.__cacheKey].usedTimes--,q0.usedTimes===0)b(B)}w.__cacheKey=Z0,w.__webglTexture=J0[Z0].texture}return f}function P0(w,B,f){return Math.floor(Math.floor(w/f)/B)}function G0(w,B,f,i){let Z0=w.updateRanges;if(Z0.length===0)$.texSubImage2D(J.TEXTURE_2D,0,0,0,B.width,B.height,f,i,B.data);else{Z0.sort((A0,H0)=>A0.start-H0.start);let q0=0;for(let A0=1;A0<Z0.length;A0++){let H0=Z0[q0],D0=Z0[A0],c0=H0.start+H0.count,a0=P0(D0.start,B.width,4),JJ=P0(H0.start,B.width,4);if(D0.start<=c0+1&&a0===JJ&&P0(D0.start+D0.count-1,B.width,4)===a0)H0.count=Math.max(H0.count,D0.start+D0.count-H0.start);else++q0,Z0[q0]=D0}Z0.length=q0+1;let c=$.getParameter(J.UNPACK_ROW_LENGTH),o=$.getParameter(J.UNPACK_SKIP_PIXELS),E0=$.getParameter(J.UNPACK_SKIP_ROWS);$.pixelStorei(J.UNPACK_ROW_LENGTH,B.width);for(let A0=0,H0=Z0.length;A0<H0;A0++){let D0=Z0[A0],c0=Math.floor(D0.start/4),a0=Math.ceil(D0.count/4),JJ=c0%B.width,j=Math.floor(c0/B.width),U0=a0,n=1;$.pixelStorei(J.UNPACK_SKIP_PIXELS,JJ),$.pixelStorei(J.UNPACK_SKIP_ROWS,j),$.texSubImage2D(J.TEXTURE_2D,0,JJ,j,U0,1,f,i,B.data)}w.clearUpdateRanges(),$.pixelStorei(J.UNPACK_ROW_LENGTH,c),$.pixelStorei(J.UNPACK_SKIP_PIXELS,o),$.pixelStorei(J.UNPACK_SKIP_ROWS,E0)}}function b0(w,B,f){let i=J.TEXTURE_2D;if(B.isDataArrayTexture||B.isCompressedArrayTexture)i=J.TEXTURE_2D_ARRAY;if(B.isData3DTexture)i=J.TEXTURE_3D;let J0=O0(w,B),Z0=B.source;$.bindTexture(i,w.__webglTexture,J.TEXTURE0+f);let q0=Z.get(Z0);if(Z0.version!==q0.__version||J0===!0){if($.activeTexture(J.TEXTURE0+f),(typeof ImageBitmap<"u"&&B.image instanceof ImageBitmap)===!1){let n=$J.getPrimaries($J.workingColorSpace),Y0=B.colorSpace===y8?null:$J.getPrimaries(B.colorSpace),C0=B.colorSpace===y8||n===Y0?J.NONE:J.BROWSER_DEFAULT_WEBGL;$.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,B.flipY),$.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,B.premultiplyAlpha),$.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,C0)}$.pixelStorei(J.UNPACK_ALIGNMENT,B.unpackAlignment);let o=F(B.image,!1,W.maxTextureSize);o=XJ(B,o);let E0=K.convert(B.format,B.colorSpace),A0=K.convert(B.type),H0=V(B.internalFormat,E0,A0,B.normalized,B.colorSpace,B.isVideoTexture);s(i,B);let D0,c0=B.mipmaps,a0=B.isVideoTexture!==!0,JJ=q0.__version===void 0||J0===!0,j=Z0.dataReady,U0=A(B,o);if(B.isDepthTexture){if(H0=_(B.format===S8,B.type),JJ)if(a0)$.texStorage2D(J.TEXTURE_2D,1,H0,o.width,o.height);else $.texImage2D(J.TEXTURE_2D,0,H0,o.width,o.height,0,E0,A0,null)}else if(B.isDataTexture)if(c0.length>0){if(a0&&JJ)$.texStorage2D(J.TEXTURE_2D,U0,H0,c0[0].width,c0[0].height);for(let n=0,Y0=c0.length;n<Y0;n++)if(D0=c0[n],a0){if(j)$.texSubImage2D(J.TEXTURE_2D,n,0,0,D0.width,D0.height,E0,A0,D0.data)}else $.texImage2D(J.TEXTURE_2D,n,H0,D0.width,D0.height,0,E0,A0,D0.data);B.generateMipmaps=!1}else if(a0){if(JJ)$.texStorage2D(J.TEXTURE_2D,U0,H0,o.width,o.height);if(j)G0(B,o,E0,A0)}else $.texImage2D(J.TEXTURE_2D,0,H0,o.width,o.height,0,E0,A0,o.data);else if(B.isCompressedTexture)if(B.isCompressedArrayTexture){if(a0&&JJ)$.texStorage3D(J.TEXTURE_2D_ARRAY,U0,H0,c0[0].width,c0[0].height,o.depth);for(let n=0,Y0=c0.length;n<Y0;n++)if(D0=c0[n],B.format!==_9)if(E0!==null)if(a0){if(j)if(B.layerUpdates.size>0){let C0=U$(D0.width,D0.height,B.format,B.type);for(let Q0 of B.layerUpdates){let v0=D0.data.subarray(Q0*C0/D0.data.BYTES_PER_ELEMENT,(Q0+1)*C0/D0.data.BYTES_PER_ELEMENT);$.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,n,0,0,Q0,D0.width,D0.height,1,E0,v0)}B.clearLayerUpdates()}else $.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,n,0,0,0,D0.width,D0.height,o.depth,E0,D0.data)}else $.compressedTexImage3D(J.TEXTURE_2D_ARRAY,n,H0,D0.width,D0.height,o.depth,0,D0.data,0,0);else X0("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(a0){if(j)$.texSubImage3D(J.TEXTURE_2D_ARRAY,n,0,0,0,D0.width,D0.height,o.depth,E0,A0,D0.data)}else $.texImage3D(J.TEXTURE_2D_ARRAY,n,H0,D0.width,D0.height,o.depth,0,E0,A0,D0.data)}else{if(a0&&JJ)$.texStorage2D(J.TEXTURE_2D,U0,H0,c0[0].width,c0[0].height);for(let n=0,Y0=c0.length;n<Y0;n++)if(D0=c0[n],B.format!==_9)if(E0!==null)if(a0){if(j)$.compressedTexSubImage2D(J.TEXTURE_2D,n,0,0,D0.width,D0.height,E0,D0.data)}else $.compressedTexImage2D(J.TEXTURE_2D,n,H0,D0.width,D0.height,0,D0.data);else X0("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(a0){if(j)$.texSubImage2D(J.TEXTURE_2D,n,0,0,D0.width,D0.height,E0,A0,D0.data)}else $.texImage2D(J.TEXTURE_2D,n,H0,D0.width,D0.height,0,E0,A0,D0.data)}else if(B.isDataArrayTexture)if(a0){if(JJ)$.texStorage3D(J.TEXTURE_2D_ARRAY,U0,H0,o.width,o.height,o.depth);if(j)if(B.layerUpdates.size>0){let n=U$(o.width,o.height,B.format,B.type);for(let Y0 of B.layerUpdates){let C0=o.data.subarray(Y0*n/o.data.BYTES_PER_ELEMENT,(Y0+1)*n/o.data.BYTES_PER_ELEMENT);$.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,Y0,o.width,o.height,1,E0,A0,C0)}B.clearLayerUpdates()}else $.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,0,o.width,o.height,o.depth,E0,A0,o.data)}else $.texImage3D(J.TEXTURE_2D_ARRAY,0,H0,o.width,o.height,o.depth,0,E0,A0,o.data);else if(B.isData3DTexture)if(a0){if(JJ)$.texStorage3D(J.TEXTURE_3D,U0,H0,o.width,o.height,o.depth);if(j)$.texSubImage3D(J.TEXTURE_3D,0,0,0,0,o.width,o.height,o.depth,E0,A0,o.data)}else $.texImage3D(J.TEXTURE_3D,0,H0,o.width,o.height,o.depth,0,E0,A0,o.data);else if(B.isFramebufferTexture){if(JJ)if(a0)$.texStorage2D(J.TEXTURE_2D,U0,H0,o.width,o.height);else{let{width:n,height:Y0}=o;for(let C0=0;C0<U0;C0++)$.texImage2D(J.TEXTURE_2D,C0,H0,n,Y0,0,E0,A0,null),n>>=1,Y0>>=1}}else if(B.isHTMLTexture){if("texElementImage2D"in J){let n=J.canvas;if(!n.hasAttribute("layoutsubtree"))n.setAttribute("layoutsubtree","true");if(o.parentNode!==n){n.appendChild(o),N.add(B),n.onpaint=(s0)=>{let _J=s0.changedElements;for(let EJ of N)if(_J.includes(EJ.image))EJ.needsUpdate=!0},n.requestPaint();return}let Y0=0,C0=J.RGBA,Q0=J.RGBA,v0=J.UNSIGNED_BYTE;J.texElementImage2D(J.TEXTURE_2D,Y0,C0,Q0,v0,o),J.texParameteri(J.TEXTURE_2D,J.TEXTURE_MIN_FILTER,J.LINEAR),J.texParameteri(J.TEXTURE_2D,J.TEXTURE_WRAP_S,J.CLAMP_TO_EDGE),J.texParameteri(J.TEXTURE_2D,J.TEXTURE_WRAP_T,J.CLAMP_TO_EDGE)}}else if(c0.length>0){if(a0&&JJ){let n=w0(c0[0]);$.texStorage2D(J.TEXTURE_2D,U0,H0,n.width,n.height)}for(let n=0,Y0=c0.length;n<Y0;n++)if(D0=c0[n],a0){if(j)$.texSubImage2D(J.TEXTURE_2D,n,0,0,E0,A0,D0)}else $.texImage2D(J.TEXTURE_2D,n,H0,E0,A0,D0);B.generateMipmaps=!1}else if(a0){if(JJ){let n=w0(o);$.texStorage2D(J.TEXTURE_2D,U0,H0,n.width,n.height)}if(j)$.texSubImage2D(J.TEXTURE_2D,0,0,0,E0,A0,o)}else $.texImage2D(J.TEXTURE_2D,0,H0,E0,A0,o);if(D(B))k(i);if(q0.__version=Z0.version,B.onUpdate)B.onUpdate(B)}w.__version=B.version}function WJ(w,B,f){if(B.image.length!==6)return;let i=O0(w,B),J0=B.source;$.bindTexture(J.TEXTURE_CUBE_MAP,w.__webglTexture,J.TEXTURE0+f);let Z0=Z.get(J0);if(J0.version!==Z0.__version||i===!0){$.activeTexture(J.TEXTURE0+f);let q0=$J.getPrimaries($J.workingColorSpace),c=B.colorSpace===y8?null:$J.getPrimaries(B.colorSpace),o=B.colorSpace===y8||q0===c?J.NONE:J.BROWSER_DEFAULT_WEBGL;$.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,B.flipY),$.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,B.premultiplyAlpha),$.pixelStorei(J.UNPACK_ALIGNMENT,B.unpackAlignment),$.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,o);let E0=B.isCompressedTexture||B.image[0].isCompressedTexture,A0=B.image[0]&&B.image[0].isDataTexture,H0=[];for(let Q0=0;Q0<6;Q0++){if(!E0&&!A0)H0[Q0]=F(B.image[Q0],!0,W.maxCubemapSize);else H0[Q0]=A0?B.image[Q0].image:B.image[Q0];H0[Q0]=XJ(B,H0[Q0])}let D0=H0[0],c0=K.convert(B.format,B.colorSpace),a0=K.convert(B.type),JJ=V(B.internalFormat,c0,a0,B.normalized,B.colorSpace),j=B.isVideoTexture!==!0,U0=Z0.__version===void 0||i===!0,n=J0.dataReady,Y0=A(B,D0);s(J.TEXTURE_CUBE_MAP,B);let C0;if(E0){if(j&&U0)$.texStorage2D(J.TEXTURE_CUBE_MAP,Y0,JJ,D0.width,D0.height);for(let Q0=0;Q0<6;Q0++){C0=H0[Q0].mipmaps;for(let v0=0;v0<C0.length;v0++){let s0=C0[v0];if(B.format!==_9)if(c0!==null)if(j){if(n)$.compressedTexSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+Q0,v0,0,0,s0.width,s0.height,c0,s0.data)}else $.compressedTexImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+Q0,v0,JJ,s0.width,s0.height,0,s0.data);else X0("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()");else if(j){if(n)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+Q0,v0,0,0,s0.width,s0.height,c0,a0,s0.data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+Q0,v0,JJ,s0.width,s0.height,0,c0,a0,s0.data)}}}else{if(C0=B.mipmaps,j&&U0){if(C0.length>0)Y0++;let Q0=w0(H0[0]);$.texStorage2D(J.TEXTURE_CUBE_MAP,Y0,JJ,Q0.width,Q0.height)}for(let Q0=0;Q0<6;Q0++)if(A0){if(j){if(n)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+Q0,0,0,0,H0[Q0].width,H0[Q0].height,c0,a0,H0[Q0].data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+Q0,0,JJ,H0[Q0].width,H0[Q0].height,0,c0,a0,H0[Q0].data);for(let v0=0;v0<C0.length;v0++){let _J=C0[v0].image[Q0].image;if(j){if(n)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+Q0,v0+1,0,0,_J.width,_J.height,c0,a0,_J.data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+Q0,v0+1,JJ,_J.width,_J.height,0,c0,a0,_J.data)}}else{if(j){if(n)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+Q0,0,0,0,c0,a0,H0[Q0])}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+Q0,0,JJ,c0,a0,H0[Q0]);for(let v0=0;v0<C0.length;v0++){let s0=C0[v0];if(j){if(n)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+Q0,v0+1,0,0,c0,a0,s0.image[Q0])}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+Q0,v0+1,JJ,c0,a0,s0.image[Q0])}}}if(D(B))k(J.TEXTURE_CUBE_MAP);if(Z0.__version=J0.version,B.onUpdate)B.onUpdate(B)}w.__version=B.version}function p0(w,B,f,i,J0,Z0){let q0=K.convert(f.format,f.colorSpace),c=K.convert(f.type),o=V(f.internalFormat,q0,c,f.normalized,f.colorSpace),E0=Z.get(B),A0=Z.get(f);if(A0.__renderTarget=B,!E0.__hasExternalTextures){let H0=Math.max(1,B.width>>Z0),D0=Math.max(1,B.height>>Z0);if(J0===J.TEXTURE_3D||J0===J.TEXTURE_2D_ARRAY)$.texImage3D(J0,Z0,o,H0,D0,B.depth,0,q0,c,null);else $.texImage2D(J0,Z0,o,H0,D0,0,q0,c,null)}if($.bindFramebuffer(J.FRAMEBUFFER,w),g0(B))H.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,i,J0,A0.__webglTexture,0,y0(B));else if(J0===J.TEXTURE_2D||J0>=J.TEXTURE_CUBE_MAP_POSITIVE_X&&J0<=J.TEXTURE_CUBE_MAP_NEGATIVE_Z)J.framebufferTexture2D(J.FRAMEBUFFER,i,J0,A0.__webglTexture,Z0);$.bindFramebuffer(J.FRAMEBUFFER,null)}function l0(w,B,f){if(J.bindRenderbuffer(J.RENDERBUFFER,w),B.depthBuffer){let i=B.depthTexture,J0=i&&i.isDepthTexture?i.type:null,Z0=_(B.stencilBuffer,J0),q0=B.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;if(g0(B))H.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,y0(B),Z0,B.width,B.height);else if(f)J.renderbufferStorageMultisample(J.RENDERBUFFER,y0(B),Z0,B.width,B.height);else J.renderbufferStorage(J.RENDERBUFFER,Z0,B.width,B.height);J.framebufferRenderbuffer(J.FRAMEBUFFER,q0,J.RENDERBUFFER,w)}else{let i=B.textures;for(let J0=0;J0<i.length;J0++){let Z0=i[J0],q0=K.convert(Z0.format,Z0.colorSpace),c=K.convert(Z0.type),o=V(Z0.internalFormat,q0,c,Z0.normalized,Z0.colorSpace);if(g0(B))H.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,y0(B),o,B.width,B.height);else if(f)J.renderbufferStorageMultisample(J.RENDERBUFFER,y0(B),o,B.width,B.height);else J.renderbufferStorage(J.RENDERBUFFER,o,B.width,B.height)}}J.bindRenderbuffer(J.RENDERBUFFER,null)}function t(w,B,f){let i=B.isWebGLCubeRenderTarget===!0;if($.bindFramebuffer(J.FRAMEBUFFER,w),!(B.depthTexture&&B.depthTexture.isDepthTexture))throw Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let J0=Z.get(B.depthTexture);if(J0.__renderTarget=B,!J0.__webglTexture||B.depthTexture.image.width!==B.width||B.depthTexture.image.height!==B.height)B.depthTexture.image.width=B.width,B.depthTexture.image.height=B.height,B.depthTexture.needsUpdate=!0;if(i){if(J0.__webglInit===void 0)J0.__webglInit=!0,B.depthTexture.addEventListener("dispose",C);if(J0.__webglTexture===void 0){J0.__webglTexture=J.createTexture(),$.bindTexture(J.TEXTURE_CUBE_MAP,J0.__webglTexture),s(J.TEXTURE_CUBE_MAP,B.depthTexture);let E0=K.convert(B.depthTexture.format),A0=K.convert(B.depthTexture.type),H0;if(B.depthTexture.format===T8)H0=J.DEPTH_COMPONENT24;else if(B.depthTexture.format===S8)H0=J.DEPTH24_STENCIL8;for(let D0=0;D0<6;D0++)J.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+D0,0,H0,B.width,B.height,0,E0,A0,null)}}else a(B.depthTexture,0);let Z0=J0.__webglTexture,q0=y0(B),c=i?J.TEXTURE_CUBE_MAP_POSITIVE_X+f:J.TEXTURE_2D,o=B.depthTexture.format===S8?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;if(B.depthTexture.format===T8)if(g0(B))H.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,o,c,Z0,0,q0);else J.framebufferTexture2D(J.FRAMEBUFFER,o,c,Z0,0);else if(B.depthTexture.format===S8)if(g0(B))H.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,o,c,Z0,0,q0);else J.framebufferTexture2D(J.FRAMEBUFFER,o,c,Z0,0);else throw Error("Unknown depthTexture format")}function $0(w){let B=Z.get(w),f=w.isWebGLCubeRenderTarget===!0;if(B.__boundDepthTexture!==w.depthTexture){let i=w.depthTexture;if(B.__depthDisposeCallback)B.__depthDisposeCallback();if(i){let J0=()=>{delete B.__boundDepthTexture,delete B.__depthDisposeCallback,i.removeEventListener("dispose",J0)};i.addEventListener("dispose",J0),B.__depthDisposeCallback=J0}B.__boundDepthTexture=i}if(w.depthTexture&&!B.__autoAllocateDepthBuffer)if(f)for(let i=0;i<6;i++)t(B.__webglFramebuffer[i],w,i);else{let i=w.texture.mipmaps;if(i&&i.length>0)t(B.__webglFramebuffer[0],w,0);else t(B.__webglFramebuffer,w,0)}else if(f){B.__webglDepthbuffer=[];for(let i=0;i<6;i++)if($.bindFramebuffer(J.FRAMEBUFFER,B.__webglFramebuffer[i]),B.__webglDepthbuffer[i]===void 0)B.__webglDepthbuffer[i]=J.createRenderbuffer(),l0(B.__webglDepthbuffer[i],w,!1);else{let J0=w.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,Z0=B.__webglDepthbuffer[i];J.bindRenderbuffer(J.RENDERBUFFER,Z0),J.framebufferRenderbuffer(J.FRAMEBUFFER,J0,J.RENDERBUFFER,Z0)}}else{let i=w.texture.mipmaps;if(i&&i.length>0)$.bindFramebuffer(J.FRAMEBUFFER,B.__webglFramebuffer[0]);else $.bindFramebuffer(J.FRAMEBUFFER,B.__webglFramebuffer);if(B.__webglDepthbuffer===void 0)B.__webglDepthbuffer=J.createRenderbuffer(),l0(B.__webglDepthbuffer,w,!1);else{let J0=w.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,Z0=B.__webglDepthbuffer;J.bindRenderbuffer(J.RENDERBUFFER,Z0),J.framebufferRenderbuffer(J.FRAMEBUFFER,J0,J.RENDERBUFFER,Z0)}}$.bindFramebuffer(J.FRAMEBUFFER,null)}function e(w,B,f){let i=Z.get(w);if(B!==void 0)p0(i.__webglFramebuffer,w,w.texture,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,0);if(f!==void 0)$0(w)}function L0(w){let B=w.texture,f=Z.get(w),i=Z.get(B);w.addEventListener("dispose",L);let J0=w.textures,Z0=w.isWebGLCubeRenderTarget===!0,q0=J0.length>1;if(!q0){if(i.__webglTexture===void 0)i.__webglTexture=J.createTexture();i.__version=B.version,Y.memory.textures++}if(Z0){f.__webglFramebuffer=[];for(let c=0;c<6;c++)if(B.mipmaps&&B.mipmaps.length>0){f.__webglFramebuffer[c]=[];for(let o=0;o<B.mipmaps.length;o++)f.__webglFramebuffer[c][o]=J.createFramebuffer()}else f.__webglFramebuffer[c]=J.createFramebuffer()}else{if(B.mipmaps&&B.mipmaps.length>0){f.__webglFramebuffer=[];for(let c=0;c<B.mipmaps.length;c++)f.__webglFramebuffer[c]=J.createFramebuffer()}else f.__webglFramebuffer=J.createFramebuffer();if(q0)for(let c=0,o=J0.length;c<o;c++){let E0=Z.get(J0[c]);if(E0.__webglTexture===void 0)E0.__webglTexture=J.createTexture(),Y.memory.textures++}if(w.samples>0&&g0(w)===!1){f.__webglMultisampledFramebuffer=J.createFramebuffer(),f.__webglColorRenderbuffer=[],$.bindFramebuffer(J.FRAMEBUFFER,f.__webglMultisampledFramebuffer);for(let c=0;c<J0.length;c++){let o=J0[c];f.__webglColorRenderbuffer[c]=J.createRenderbuffer(),J.bindRenderbuffer(J.RENDERBUFFER,f.__webglColorRenderbuffer[c]);let E0=K.convert(o.format,o.colorSpace),A0=K.convert(o.type),H0=V(o.internalFormat,E0,A0,o.normalized,o.colorSpace,w.isXRRenderTarget===!0),D0=y0(w);J.renderbufferStorageMultisample(J.RENDERBUFFER,D0,H0,w.width,w.height),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+c,J.RENDERBUFFER,f.__webglColorRenderbuffer[c])}if(J.bindRenderbuffer(J.RENDERBUFFER,null),w.depthBuffer)f.__webglDepthRenderbuffer=J.createRenderbuffer(),l0(f.__webglDepthRenderbuffer,w,!0);$.bindFramebuffer(J.FRAMEBUFFER,null)}}if(Z0){$.bindTexture(J.TEXTURE_CUBE_MAP,i.__webglTexture),s(J.TEXTURE_CUBE_MAP,B);for(let c=0;c<6;c++)if(B.mipmaps&&B.mipmaps.length>0)for(let o=0;o<B.mipmaps.length;o++)p0(f.__webglFramebuffer[c][o],w,B,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+c,o);else p0(f.__webglFramebuffer[c],w,B,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+c,0);if(D(B))k(J.TEXTURE_CUBE_MAP);$.unbindTexture()}else if(q0){for(let c=0,o=J0.length;c<o;c++){let E0=J0[c],A0=Z.get(E0),H0=J.TEXTURE_2D;if(w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)H0=w.isWebGL3DRenderTarget?J.TEXTURE_3D:J.TEXTURE_2D_ARRAY;if($.bindTexture(H0,A0.__webglTexture),s(H0,E0),p0(f.__webglFramebuffer,w,E0,J.COLOR_ATTACHMENT0+c,H0,0),D(E0))k(H0)}$.unbindTexture()}else{let c=J.TEXTURE_2D;if(w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)c=w.isWebGL3DRenderTarget?J.TEXTURE_3D:J.TEXTURE_2D_ARRAY;if($.bindTexture(c,i.__webglTexture),s(c,B),B.mipmaps&&B.mipmaps.length>0)for(let o=0;o<B.mipmaps.length;o++)p0(f.__webglFramebuffer[o],w,B,J.COLOR_ATTACHMENT0,c,o);else p0(f.__webglFramebuffer,w,B,J.COLOR_ATTACHMENT0,c,0);if(D(B))k(c);$.unbindTexture()}if(w.depthBuffer)$0(w)}function M0(w){let B=w.textures;for(let f=0,i=B.length;f<i;f++){let J0=B[f];if(D(J0)){let Z0=M(w),q0=Z.get(J0).__webglTexture;$.bindTexture(Z0,q0),k(Z0),$.unbindTexture()}}}let x0=[],S=[];function t0(w){if(w.samples>0){if(g0(w)===!1){let{textures:B,width:f,height:i}=w,J0=J.COLOR_BUFFER_BIT,Z0=w.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,q0=Z.get(w),c=B.length>1;if(c)for(let E0=0;E0<B.length;E0++)$.bindFramebuffer(J.FRAMEBUFFER,q0.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+E0,J.RENDERBUFFER,null),$.bindFramebuffer(J.FRAMEBUFFER,q0.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+E0,J.TEXTURE_2D,null,0);$.bindFramebuffer(J.READ_FRAMEBUFFER,q0.__webglMultisampledFramebuffer);let o=w.texture.mipmaps;if(o&&o.length>0)$.bindFramebuffer(J.DRAW_FRAMEBUFFER,q0.__webglFramebuffer[0]);else $.bindFramebuffer(J.DRAW_FRAMEBUFFER,q0.__webglFramebuffer);for(let E0=0;E0<B.length;E0++){if(w.resolveDepthBuffer){if(w.depthBuffer)J0|=J.DEPTH_BUFFER_BIT;if(w.stencilBuffer&&w.resolveStencilBuffer)J0|=J.STENCIL_BUFFER_BIT}if(c){J.framebufferRenderbuffer(J.READ_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.RENDERBUFFER,q0.__webglColorRenderbuffer[E0]);let A0=Z.get(B[E0]).__webglTexture;J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,A0,0)}if(J.blitFramebuffer(0,0,f,i,0,0,f,i,J0,J.NEAREST),X===!0){if(x0.length=0,S.length=0,x0.push(J.COLOR_ATTACHMENT0+E0),w.depthBuffer&&w.resolveDepthBuffer===!1)x0.push(Z0),S.push(Z0),J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,S);J.invalidateFramebuffer(J.READ_FRAMEBUFFER,x0)}}if($.bindFramebuffer(J.READ_FRAMEBUFFER,null),$.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),c)for(let E0=0;E0<B.length;E0++){$.bindFramebuffer(J.FRAMEBUFFER,q0.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+E0,J.RENDERBUFFER,q0.__webglColorRenderbuffer[E0]);let A0=Z.get(B[E0]).__webglTexture;$.bindFramebuffer(J.FRAMEBUFFER,q0.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+E0,J.TEXTURE_2D,A0,0)}$.bindFramebuffer(J.DRAW_FRAMEBUFFER,q0.__webglMultisampledFramebuffer)}else if(w.depthBuffer&&w.resolveDepthBuffer===!1&&X){let B=w.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,[B])}}}function y0(w){return Math.min(W.maxSamples,w.samples)}function g0(w){let B=Z.get(w);return w.samples>0&&Q.has("WEBGL_multisampled_render_to_texture")===!0&&B.__useRenderToTexture!==!1}function K0(w){let B=Y.render.frame;if(E.get(w)!==B)E.set(w,B),w.update()}function XJ(w,B){let{colorSpace:f,format:i,type:J0}=w;if(w.isCompressedTexture===!0||w.isVideoTexture===!0)return B;if(f!==eZ&&f!==y8)if($J.getTransfer(f)===FJ){if(i!==_9||J0!==D9)X0("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.")}else T0("WebGLTextures: Unsupported texture color space:",f);return B}function w0(w){if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement)U.width=w.naturalWidth||w.width,U.height=w.naturalHeight||w.height;else if(typeof VideoFrame<"u"&&w instanceof VideoFrame)U.width=w.displayWidth,U.height=w.displayHeight;else U.width=w.width,U.height=w.height;return U}this.allocateTextureUnit=h,this.resetTextureUnits=u,this.getTextureUnits=y,this.setTextureUnits=l,this.setTexture2D=a,this.setTexture2DArray=W0,this.setTexture3D=N0,this.setTextureCube=j0,this.rebindTextures=e,this.setupRenderTarget=L0,this.updateRenderTargetMipmap=M0,this.updateMultisampleRenderTarget=t0,this.setupDepthRenderbuffer=$0,this.setupFrameBufferTexture=p0,this.useMultisampledRTT=g0,this.isReversedDepthBuffer=function(){return $.buffers.depth.getReversed()}}function C1(J,Q){function $(Z,W=y8){let K,Y=$J.getTransfer(W);if(Z===D9)return J.UNSIGNED_BYTE;if(Z===RZ)return J.UNSIGNED_SHORT_4_4_4_4;if(Z===kZ)return J.UNSIGNED_SHORT_5_5_5_1;if(Z===DH)return J.UNSIGNED_INT_5_9_9_9_REV;if(Z===FH)return J.UNSIGNED_INT_10F_11F_11F_REV;if(Z===NH)return J.BYTE;if(Z===qH)return J.SHORT;if(Z===e7)return J.UNSIGNED_SHORT;if(Z===OZ)return J.INT;if(Z===$8)return J.UNSIGNED_INT;if(Z===g9)return J.FLOAT;if(Z===p9)return J.HALF_FLOAT;if(Z===OH)return J.ALPHA;if(Z===RH)return J.RGB;if(Z===_9)return J.RGBA;if(Z===T8)return J.DEPTH_COMPONENT;if(Z===S8)return J.DEPTH_STENCIL;if(Z===kH)return J.RED;if(Z===MZ)return J.RED_INTEGER;if(Z===j8)return J.RG;if(Z===LZ)return J.RG_INTEGER;if(Z===VZ)return J.RGBA_INTEGER;if(Z===OQ||Z===RQ||Z===kQ||Z===MQ)if(Y===FJ)if(K=Q.get("WEBGL_compressed_texture_s3tc_srgb"),K!==null){if(Z===OQ)return K.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(Z===RQ)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(Z===kQ)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(Z===MQ)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(K=Q.get("WEBGL_compressed_texture_s3tc"),K!==null){if(Z===OQ)return K.COMPRESSED_RGB_S3TC_DXT1_EXT;if(Z===RQ)return K.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(Z===kQ)return K.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(Z===MQ)return K.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(Z===BZ||Z===zZ||Z===IZ||Z===_Z)if(K=Q.get("WEBGL_compressed_texture_pvrtc"),K!==null){if(Z===BZ)return K.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(Z===zZ)return K.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(Z===IZ)return K.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(Z===_Z)return K.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(Z===wZ||Z===AZ||Z===CZ||Z===PZ||Z===TZ||Z===LQ||Z===SZ)if(K=Q.get("WEBGL_compressed_texture_etc"),K!==null){if(Z===wZ||Z===AZ)return Y===FJ?K.COMPRESSED_SRGB8_ETC2:K.COMPRESSED_RGB8_ETC2;if(Z===CZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:K.COMPRESSED_RGBA8_ETC2_EAC;if(Z===PZ)return K.COMPRESSED_R11_EAC;if(Z===TZ)return K.COMPRESSED_SIGNED_R11_EAC;if(Z===LQ)return K.COMPRESSED_RG11_EAC;if(Z===SZ)return K.COMPRESSED_SIGNED_RG11_EAC}else return null;if(Z===jZ||Z===yZ||Z===vZ||Z===fZ||Z===bZ||Z===hZ||Z===xZ||Z===gZ||Z===pZ||Z===mZ||Z===dZ||Z===lZ||Z===uZ||Z===cZ)if(K=Q.get("WEBGL_compressed_texture_astc"),K!==null){if(Z===jZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:K.COMPRESSED_RGBA_ASTC_4x4_KHR;if(Z===yZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:K.COMPRESSED_RGBA_ASTC_5x4_KHR;if(Z===vZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:K.COMPRESSED_RGBA_ASTC_5x5_KHR;if(Z===fZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:K.COMPRESSED_RGBA_ASTC_6x5_KHR;if(Z===bZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:K.COMPRESSED_RGBA_ASTC_6x6_KHR;if(Z===hZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:K.COMPRESSED_RGBA_ASTC_8x5_KHR;if(Z===xZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:K.COMPRESSED_RGBA_ASTC_8x6_KHR;if(Z===gZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:K.COMPRESSED_RGBA_ASTC_8x8_KHR;if(Z===pZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:K.COMPRESSED_RGBA_ASTC_10x5_KHR;if(Z===mZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:K.COMPRESSED_RGBA_ASTC_10x6_KHR;if(Z===dZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:K.COMPRESSED_RGBA_ASTC_10x8_KHR;if(Z===lZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:K.COMPRESSED_RGBA_ASTC_10x10_KHR;if(Z===uZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:K.COMPRESSED_RGBA_ASTC_12x10_KHR;if(Z===cZ)return Y===FJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:K.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(Z===nZ||Z===sZ||Z===iZ)if(K=Q.get("EXT_texture_compression_bptc"),K!==null){if(Z===nZ)return Y===FJ?K.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:K.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(Z===sZ)return K.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(Z===iZ)return K.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(Z===oZ||Z===aZ||Z===VQ||Z===rZ)if(K=Q.get("EXT_texture_compression_rgtc"),K!==null){if(Z===oZ)return K.COMPRESSED_RED_RGTC1_EXT;if(Z===aZ)return K.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(Z===VQ)return K.COMPRESSED_RED_GREEN_RGTC2_EXT;if(Z===rZ)return K.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;if(Z===L7)return J.UNSIGNED_INT_24_8;return J[Z]!==void 0?J[Z]:null}return{convert:$}}var P1=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,T1=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class TU{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(J,Q){if(this.texture===null){let $=new vQ(J.texture);if(J.depthNear!==Q.depthNear||J.depthFar!==Q.depthFar)this.depthNear=J.depthNear,this.depthFar=J.depthFar;this.texture=$}}getMesh(J){if(this.texture!==null){if(this.mesh===null){let Q=J.cameras[0].viewport,$=new J9({vertexShader:P1,fragmentShader:T1,uniforms:{depthColor:{value:this.texture},depthWidth:{value:Q.z},depthHeight:{value:Q.w}}});this.mesh=new IJ(new B7(20,20),$)}}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class SU extends K9{constructor(J,Q){super();let $=this,Z=null,W=1,K=null,Y="local-floor",H=1,X=null,U=null,E=null,N=null,G=null,q=null,O=typeof XRWebGLBinding<"u",R=new TU,F={},D=Q.getContextAttributes(),k=null,M=null,V=[],_=[],A=new r,C=null,L=new TJ;L.viewport=new GJ;let I=new TJ;I.viewport=new GJ;let b=[L,I],T=new sW,p=null,u=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(s){let O0=V[s];if(O0===void 0)O0=new Z6,V[s]=O0;return O0.getTargetRaySpace()},this.getControllerGrip=function(s){let O0=V[s];if(O0===void 0)O0=new Z6,V[s]=O0;return O0.getGripSpace()},this.getHand=function(s){let O0=V[s];if(O0===void 0)O0=new Z6,V[s]=O0;return O0.getHandSpace()};function y(s){let O0=_.indexOf(s.inputSource);if(O0===-1)return;let P0=V[O0];if(P0!==void 0)P0.update(s.inputSource,s.frame,X||K),P0.dispatchEvent({type:s.type,data:s.inputSource})}function l(){Z.removeEventListener("select",y),Z.removeEventListener("selectstart",y),Z.removeEventListener("selectend",y),Z.removeEventListener("squeeze",y),Z.removeEventListener("squeezestart",y),Z.removeEventListener("squeezeend",y),Z.removeEventListener("end",l),Z.removeEventListener("inputsourceschange",h);for(let s=0;s<V.length;s++){let O0=_[s];if(O0===null)continue;_[s]=null,V[s].disconnect(O0)}p=null,u=null,R.reset();for(let s in F)delete F[s];J.setRenderTarget(k),G=null,N=null,E=null,Z=null,M=null,r0.stop(),$.isPresenting=!1,J.setPixelRatio(C),J.setSize(A.width,A.height,!1),$.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(s){if(W=s,$.isPresenting===!0)X0("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(s){if(Y=s,$.isPresenting===!0)X0("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return X||K},this.setReferenceSpace=function(s){X=s},this.getBaseLayer=function(){return N!==null?N:G},this.getBinding=function(){if(E===null&&O)E=new XRWebGLBinding(Z,Q);return E},this.getFrame=function(){return q},this.getSession=function(){return Z},this.setSession=async function(s){if(Z=s,Z!==null){if(k=J.getRenderTarget(),Z.addEventListener("select",y),Z.addEventListener("selectstart",y),Z.addEventListener("selectend",y),Z.addEventListener("squeeze",y),Z.addEventListener("squeezestart",y),Z.addEventListener("squeezeend",y),Z.addEventListener("end",l),Z.addEventListener("inputsourceschange",h),D.xrCompatible!==!0)await Q.makeXRCompatible();if(C=J.getPixelRatio(),J.getSize(A),!(O&&("createProjectionLayer"in XRWebGLBinding.prototype))){let P0={antialias:D.antialias,alpha:!0,depth:D.depth,stencil:D.stencil,framebufferScaleFactor:W};G=new XRWebGLLayer(Z,Q,P0),Z.updateRenderState({baseLayer:G}),J.setPixelRatio(1),J.setSize(G.framebufferWidth,G.framebufferHeight,!1),M=new oJ(G.framebufferWidth,G.framebufferHeight,{format:_9,type:D9,colorSpace:J.outputColorSpace,stencilBuffer:D.stencil,resolveDepthBuffer:G.ignoreDepthValues===!1,resolveStencilBuffer:G.ignoreDepthValues===!1})}else{let P0=null,G0=null,b0=null;if(D.depth)b0=D.stencil?Q.DEPTH24_STENCIL8:Q.DEPTH_COMPONENT24,P0=D.stencil?S8:T8,G0=D.stencil?L7:$8;let WJ={colorFormat:Q.RGBA8,depthFormat:b0,scaleFactor:W};E=this.getBinding(),N=E.createProjectionLayer(WJ),Z.updateRenderState({layers:[N]}),J.setPixelRatio(1),J.setSize(N.textureWidth,N.textureHeight,!1),M=new oJ(N.textureWidth,N.textureHeight,{format:_9,type:D9,depthTexture:new Z8(N.textureWidth,N.textureHeight,G0,void 0,void 0,void 0,void 0,void 0,void 0,P0),stencilBuffer:D.stencil,colorSpace:J.outputColorSpace,samples:D.antialias?4:0,resolveDepthBuffer:N.ignoreDepthValues===!1,resolveStencilBuffer:N.ignoreDepthValues===!1})}M.isXRRenderTarget=!0,this.setFoveation(H),X=null,K=await Z.requestReferenceSpace(Y),r0.setContext(Z),r0.start(),$.isPresenting=!0,$.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(Z!==null)return Z.environmentBlendMode},this.getDepthTexture=function(){return R.getDepthTexture()};function h(s){for(let O0=0;O0<s.removed.length;O0++){let P0=s.removed[O0],G0=_.indexOf(P0);if(G0>=0)_[G0]=null,V[G0].disconnect(P0)}for(let O0=0;O0<s.added.length;O0++){let P0=s.added[O0],G0=_.indexOf(P0);if(G0===-1){for(let WJ=0;WJ<V.length;WJ++)if(WJ>=_.length){_.push(P0),G0=WJ;break}else if(_[WJ]===null){_[WJ]=P0,G0=WJ;break}if(G0===-1)break}let b0=V[G0];if(b0)b0.connect(P0)}}let m=new P,a=new P;function W0(s,O0,P0){m.setFromMatrixPosition(O0.matrixWorld),a.setFromMatrixPosition(P0.matrixWorld);let G0=m.distanceTo(a),b0=O0.projectionMatrix.elements,WJ=P0.projectionMatrix.elements,p0=b0[14]/(b0[10]-1),l0=b0[14]/(b0[10]+1),t=(b0[9]+1)/b0[5],$0=(b0[9]-1)/b0[5],e=(b0[8]-1)/b0[0],L0=(WJ[8]+1)/WJ[0],M0=p0*e,x0=p0*L0,S=G0/(-e+L0),t0=S*-e;if(O0.matrixWorld.decompose(s.position,s.quaternion,s.scale),s.translateX(t0),s.translateZ(S),s.matrixWorld.compose(s.position,s.quaternion,s.scale),s.matrixWorldInverse.copy(s.matrixWorld).invert(),b0[10]===-1)s.projectionMatrix.copy(O0.projectionMatrix),s.projectionMatrixInverse.copy(O0.projectionMatrixInverse);else{let y0=p0+S,g0=l0+S,K0=M0-t0,XJ=x0+(G0-t0),w0=t*l0/g0*y0,w=$0*l0/g0*y0;s.projectionMatrix.makePerspective(K0,XJ,w0,w,y0,g0),s.projectionMatrixInverse.copy(s.projectionMatrix).invert()}}function N0(s,O0){if(O0===null)s.matrixWorld.copy(s.matrix);else s.matrixWorld.multiplyMatrices(O0.matrixWorld,s.matrix);s.matrixWorldInverse.copy(s.matrixWorld).invert()}this.updateCamera=function(s){if(Z===null)return;let{near:O0,far:P0}=s;if(R.texture!==null){if(R.depthNear>0)O0=R.depthNear;if(R.depthFar>0)P0=R.depthFar}if(T.near=I.near=L.near=O0,T.far=I.far=L.far=P0,p!==T.near||u!==T.far)Z.updateRenderState({depthNear:T.near,depthFar:T.far}),p=T.near,u=T.far;T.layers.mask=s.layers.mask|6,L.layers.mask=T.layers.mask&-5,I.layers.mask=T.layers.mask&-3;let G0=s.parent,b0=T.cameras;N0(T,G0);for(let WJ=0;WJ<b0.length;WJ++)N0(b0[WJ],G0);if(b0.length===2)W0(T,L,I);else T.projectionMatrix.copy(L.projectionMatrix);j0(s,T,G0)};function j0(s,O0,P0){if(P0===null)s.matrix.copy(O0.matrixWorld);else s.matrix.copy(P0.matrixWorld),s.matrix.invert(),s.matrix.multiply(O0.matrixWorld);if(s.matrix.decompose(s.position,s.quaternion,s.scale),s.updateMatrixWorld(!0),s.projectionMatrix.copy(O0.projectionMatrix),s.projectionMatrixInverse.copy(O0.projectionMatrixInverse),s.isPerspectiveCamera)s.fov=I8*2*Math.atan(1/s.projectionMatrix.elements[5]),s.zoom=1}this.getCamera=function(){return T},this.getFoveation=function(){if(N===null&&G===null)return;return H},this.setFoveation=function(s){if(H=s,N!==null)N.fixedFoveation=s;if(G!==null&&G.fixedFoveation!==void 0)G.fixedFoveation=s},this.hasDepthSensing=function(){return R.texture!==null},this.getDepthSensingMesh=function(){return R.getMesh(T)},this.getCameraTexture=function(s){return F[s]};let B0=null;function ZJ(s,O0){if(U=O0.getViewerPose(X||K),q=O0,U!==null){let P0=U.views;if(G!==null)J.setRenderTargetFramebuffer(M,G.framebuffer),J.setRenderTarget(M);let G0=!1;if(P0.length!==T.cameras.length)T.cameras.length=0,G0=!0;for(let l0=0;l0<P0.length;l0++){let t=P0[l0],$0=null;if(G!==null)$0=G.getViewport(t);else{let L0=E.getViewSubImage(N,t);if($0=L0.viewport,l0===0)J.setRenderTargetTextures(M,L0.colorTexture,L0.depthStencilTexture),J.setRenderTarget(M)}let e=b[l0];if(e===void 0)e=new TJ,e.layers.enable(l0),e.viewport=new GJ,b[l0]=e;if(e.matrix.fromArray(t.transform.matrix),e.matrix.decompose(e.position,e.quaternion,e.scale),e.projectionMatrix.fromArray(t.projectionMatrix),e.projectionMatrixInverse.copy(e.projectionMatrix).invert(),e.viewport.set($0.x,$0.y,$0.width,$0.height),l0===0)T.matrix.copy(e.matrix),T.matrix.decompose(T.position,T.quaternion,T.scale);if(G0===!0)T.cameras.push(e)}let b0=Z.enabledFeatures;if(b0&&b0.includes("depth-sensing")&&Z.depthUsage=="gpu-optimized"&&O){E=$.getBinding();let l0=E.getDepthInformation(P0[0]);if(l0&&l0.isValid&&l0.texture)R.init(l0,Z.renderState)}if(b0&&b0.includes("camera-access")&&O){J.state.unbindTexture(),E=$.getBinding();for(let l0=0;l0<P0.length;l0++){let t=P0[l0].camera;if(t){let $0=F[t];if(!$0)$0=new vQ,F[t]=$0;let e=E.getCameraImage(t);$0.sourceTexture=e}}}}for(let P0=0;P0<V.length;P0++){let G0=_[P0],b0=V[P0];if(G0!==null&&b0!==void 0)b0.update(G0,O0,X||K)}if(B0)B0(s,O0);if(O0.detectedPlanes)$.dispatchEvent({type:"planesdetected",data:O0});q=null}let r0=new MU;r0.setAnimationLoop(ZJ),this.setAnimationLoop=function(s){B0=s},this.dispose=function(){}}}var S1=new d0,jU=new u0;jU.set(-1,0,0,0,1,0,0,0,1);function j1(J,Q){function $(F,D){if(F.matrixAutoUpdate===!0)F.updateMatrix();D.value.copy(F.matrix)}function Z(F,D){if(D.color.getRGB(F.fogColor.value,IW(J)),D.isFog)F.fogNear.value=D.near,F.fogFar.value=D.far;else if(D.isFogExp2)F.fogDensity.value=D.density}function W(F,D,k,M,V){if(D.isNodeMaterial)D.uniformsNeedUpdate=!1;else if(D.isMeshBasicMaterial)K(F,D);else if(D.isMeshLambertMaterial){if(K(F,D),D.envMap)F.envMapIntensity.value=D.envMapIntensity}else if(D.isMeshToonMaterial)K(F,D),N(F,D);else if(D.isMeshPhongMaterial){if(K(F,D),E(F,D),D.envMap)F.envMapIntensity.value=D.envMapIntensity}else if(D.isMeshStandardMaterial){if(K(F,D),G(F,D),D.isMeshPhysicalMaterial)q(F,D,V)}else if(D.isMeshMatcapMaterial)K(F,D),O(F,D);else if(D.isMeshDepthMaterial)K(F,D);else if(D.isMeshDistanceMaterial)K(F,D),R(F,D);else if(D.isMeshNormalMaterial)K(F,D);else if(D.isLineBasicMaterial){if(Y(F,D),D.isLineDashedMaterial)H(F,D)}else if(D.isPointsMaterial)X(F,D,k,M);else if(D.isSpriteMaterial)U(F,D);else if(D.isShadowMaterial)F.color.value.copy(D.color),F.opacity.value=D.opacity;else if(D.isShaderMaterial)D.uniformsNeedUpdate=!1}function K(F,D){if(F.opacity.value=D.opacity,D.color)F.diffuse.value.copy(D.color);if(D.emissive)F.emissive.value.copy(D.emissive).multiplyScalar(D.emissiveIntensity);if(D.map)F.map.value=D.map,$(D.map,F.mapTransform);if(D.alphaMap)F.alphaMap.value=D.alphaMap,$(D.alphaMap,F.alphaMapTransform);if(D.bumpMap){if(F.bumpMap.value=D.bumpMap,$(D.bumpMap,F.bumpMapTransform),F.bumpScale.value=D.bumpScale,D.side===sJ)F.bumpScale.value*=-1}if(D.normalMap){if(F.normalMap.value=D.normalMap,$(D.normalMap,F.normalMapTransform),F.normalScale.value.copy(D.normalScale),D.side===sJ)F.normalScale.value.negate()}if(D.displacementMap)F.displacementMap.value=D.displacementMap,$(D.displacementMap,F.displacementMapTransform),F.displacementScale.value=D.displacementScale,F.displacementBias.value=D.displacementBias;if(D.emissiveMap)F.emissiveMap.value=D.emissiveMap,$(D.emissiveMap,F.emissiveMapTransform);if(D.specularMap)F.specularMap.value=D.specularMap,$(D.specularMap,F.specularMapTransform);if(D.alphaTest>0)F.alphaTest.value=D.alphaTest;let k=Q.get(D),M=k.envMap,V=k.envMapRotation;if(M){if(F.envMap.value=M,F.envMapRotation.value.setFromMatrix4(S1.makeRotationFromEuler(V)).transpose(),M.isCubeTexture&&M.isRenderTargetTexture===!1)F.envMapRotation.value.premultiply(jU);F.reflectivity.value=D.reflectivity,F.ior.value=D.ior,F.refractionRatio.value=D.refractionRatio}if(D.lightMap)F.lightMap.value=D.lightMap,F.lightMapIntensity.value=D.lightMapIntensity,$(D.lightMap,F.lightMapTransform);if(D.aoMap)F.aoMap.value=D.aoMap,F.aoMapIntensity.value=D.aoMapIntensity,$(D.aoMap,F.aoMapTransform)}function Y(F,D){if(F.diffuse.value.copy(D.color),F.opacity.value=D.opacity,D.map)F.map.value=D.map,$(D.map,F.mapTransform)}function H(F,D){F.dashSize.value=D.dashSize,F.totalSize.value=D.dashSize+D.gapSize,F.scale.value=D.scale}function X(F,D,k,M){if(F.diffuse.value.copy(D.color),F.opacity.value=D.opacity,F.size.value=D.size*k,F.scale.value=M*0.5,D.map)F.map.value=D.map,$(D.map,F.uvTransform);if(D.alphaMap)F.alphaMap.value=D.alphaMap,$(D.alphaMap,F.alphaMapTransform);if(D.alphaTest>0)F.alphaTest.value=D.alphaTest}function U(F,D){if(F.diffuse.value.copy(D.color),F.opacity.value=D.opacity,F.rotation.value=D.rotation,D.map)F.map.value=D.map,$(D.map,F.mapTransform);if(D.alphaMap)F.alphaMap.value=D.alphaMap,$(D.alphaMap,F.alphaMapTransform);if(D.alphaTest>0)F.alphaTest.value=D.alphaTest}function E(F,D){F.specular.value.copy(D.specular),F.shininess.value=Math.max(D.shininess,0.0001)}function N(F,D){if(D.gradientMap)F.gradientMap.value=D.gradientMap}function G(F,D){if(F.metalness.value=D.metalness,D.metalnessMap)F.metalnessMap.value=D.metalnessMap,$(D.metalnessMap,F.metalnessMapTransform);if(F.roughness.value=D.roughness,D.roughnessMap)F.roughnessMap.value=D.roughnessMap,$(D.roughnessMap,F.roughnessMapTransform);if(D.envMap)F.envMapIntensity.value=D.envMapIntensity}function q(F,D,k){if(F.ior.value=D.ior,D.sheen>0){if(F.sheenColor.value.copy(D.sheenColor).multiplyScalar(D.sheen),F.sheenRoughness.value=D.sheenRoughness,D.sheenColorMap)F.sheenColorMap.value=D.sheenColorMap,$(D.sheenColorMap,F.sheenColorMapTransform);if(D.sheenRoughnessMap)F.sheenRoughnessMap.value=D.sheenRoughnessMap,$(D.sheenRoughnessMap,F.sheenRoughnessMapTransform)}if(D.clearcoat>0){if(F.clearcoat.value=D.clearcoat,F.clearcoatRoughness.value=D.clearcoatRoughness,D.clearcoatMap)F.clearcoatMap.value=D.clearcoatMap,$(D.clearcoatMap,F.clearcoatMapTransform);if(D.clearcoatRoughnessMap)F.clearcoatRoughnessMap.value=D.clearcoatRoughnessMap,$(D.clearcoatRoughnessMap,F.clearcoatRoughnessMapTransform);if(D.clearcoatNormalMap){if(F.clearcoatNormalMap.value=D.clearcoatNormalMap,$(D.clearcoatNormalMap,F.clearcoatNormalMapTransform),F.clearcoatNormalScale.value.copy(D.clearcoatNormalScale),D.side===sJ)F.clearcoatNormalScale.value.negate()}}if(D.dispersion>0)F.dispersion.value=D.dispersion;if(D.iridescence>0){if(F.iridescence.value=D.iridescence,F.iridescenceIOR.value=D.iridescenceIOR,F.iridescenceThicknessMinimum.value=D.iridescenceThicknessRange[0],F.iridescenceThicknessMaximum.value=D.iridescenceThicknessRange[1],D.iridescenceMap)F.iridescenceMap.value=D.iridescenceMap,$(D.iridescenceMap,F.iridescenceMapTransform);if(D.iridescenceThicknessMap)F.iridescenceThicknessMap.value=D.iridescenceThicknessMap,$(D.iridescenceThicknessMap,F.iridescenceThicknessMapTransform)}if(D.transmission>0){if(F.transmission.value=D.transmission,F.transmissionSamplerMap.value=k.texture,F.transmissionSamplerSize.value.set(k.width,k.height),D.transmissionMap)F.transmissionMap.value=D.transmissionMap,$(D.transmissionMap,F.transmissionMapTransform);if(F.thickness.value=D.thickness,D.thicknessMap)F.thicknessMap.value=D.thicknessMap,$(D.thicknessMap,F.thicknessMapTransform);F.attenuationDistance.value=D.attenuationDistance,F.attenuationColor.value.copy(D.attenuationColor)}if(D.anisotropy>0){if(F.anisotropyVector.value.set(D.anisotropy*Math.cos(D.anisotropyRotation),D.anisotropy*Math.sin(D.anisotropyRotation)),D.anisotropyMap)F.anisotropyMap.value=D.anisotropyMap,$(D.anisotropyMap,F.anisotropyMapTransform)}if(F.specularIntensity.value=D.specularIntensity,F.specularColor.value.copy(D.specularColor),D.specularColorMap)F.specularColorMap.value=D.specularColorMap,$(D.specularColorMap,F.specularColorMapTransform);if(D.specularIntensityMap)F.specularIntensityMap.value=D.specularIntensityMap,$(D.specularIntensityMap,F.specularIntensityMapTransform)}function O(F,D){if(D.matcap)F.matcap.value=D.matcap}function R(F,D){let k=Q.get(D).light;F.referencePosition.value.setFromMatrixPosition(k.matrixWorld),F.nearDistance.value=k.shadow.camera.near,F.farDistance.value=k.shadow.camera.far}return{refreshFogUniforms:Z,refreshMaterialUniforms:W}}function y1(J,Q,$,Z){let W={},K={},Y=[],H=J.getParameter(J.MAX_UNIFORM_BUFFER_BINDINGS);function X(k,M){let V=M.program;Z.uniformBlockBinding(k,V)}function U(k,M){let V=W[k.id];if(V===void 0)O(k),V=E(k),W[k.id]=V,k.addEventListener("dispose",F);let _=M.program;Z.updateUBOMapping(k,_);let A=Q.render.frame;if(K[k.id]!==A)G(k),K[k.id]=A}function E(k){let M=N();k.__bindingPointIndex=M;let V=J.createBuffer(),_=k.__size,A=k.usage;return J.bindBuffer(J.UNIFORM_BUFFER,V),J.bufferData(J.UNIFORM_BUFFER,_,A),J.bindBuffer(J.UNIFORM_BUFFER,null),J.bindBufferBase(J.UNIFORM_BUFFER,M,V),V}function N(){for(let k=0;k<H;k++)if(Y.indexOf(k)===-1)return Y.push(k),k;return T0("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function G(k){let M=W[k.id],V=k.uniforms,_=k.__cache;J.bindBuffer(J.UNIFORM_BUFFER,M);for(let A=0,C=V.length;A<C;A++){let L=Array.isArray(V[A])?V[A]:[V[A]];for(let I=0,b=L.length;I<b;I++){let T=L[I];if(q(T,A,I,_)===!0){let p=T.__offset,u=Array.isArray(T.value)?T.value:[T.value],y=0;for(let l=0;l<u.length;l++){let h=u[l],m=R(h);if(typeof h==="number"||typeof h==="boolean")T.__data[0]=h,J.bufferSubData(J.UNIFORM_BUFFER,p+y,T.__data);else if(h.isMatrix3)T.__data[0]=h.elements[0],T.__data[1]=h.elements[1],T.__data[2]=h.elements[2],T.__data[3]=0,T.__data[4]=h.elements[3],T.__data[5]=h.elements[4],T.__data[6]=h.elements[5],T.__data[7]=0,T.__data[8]=h.elements[6],T.__data[9]=h.elements[7],T.__data[10]=h.elements[8],T.__data[11]=0;else if(ArrayBuffer.isView(h))T.__data.set(new h.constructor(h.buffer,h.byteOffset,T.__data.length));else h.toArray(T.__data,y),y+=m.storage/Float32Array.BYTES_PER_ELEMENT}J.bufferSubData(J.UNIFORM_BUFFER,p,T.__data)}}}J.bindBuffer(J.UNIFORM_BUFFER,null)}function q(k,M,V,_){let A=k.value,C=M+"_"+V;if(_[C]===void 0){if(typeof A==="number"||typeof A==="boolean")_[C]=A;else if(ArrayBuffer.isView(A))_[C]=A.slice();else _[C]=A.clone();return!0}else{let L=_[C];if(typeof A==="number"||typeof A==="boolean"){if(L!==A)return _[C]=A,!0}else if(ArrayBuffer.isView(A))return!0;else if(L.equals(A)===!1)return L.copy(A),!0}return!1}function O(k){let M=k.uniforms,V=0,_=16;for(let C=0,L=M.length;C<L;C++){let I=Array.isArray(M[C])?M[C]:[M[C]];for(let b=0,T=I.length;b<T;b++){let p=I[b],u=Array.isArray(p.value)?p.value:[p.value];for(let y=0,l=u.length;y<l;y++){let h=u[y],m=R(h),a=V%_,W0=a%m.boundary,N0=a+W0;if(V+=W0,N0!==0&&_-N0<m.storage)V+=_-N0;p.__data=new Float32Array(m.storage/Float32Array.BYTES_PER_ELEMENT),p.__offset=V,V+=m.storage}}}let A=V%_;if(A>0)V+=_-A;return k.__size=V,k.__cache={},this}function R(k){let M={boundary:0,storage:0};if(typeof k==="number"||typeof k==="boolean")M.boundary=4,M.storage=4;else if(k.isVector2)M.boundary=8,M.storage=8;else if(k.isVector3||k.isColor)M.boundary=16,M.storage=12;else if(k.isVector4)M.boundary=16,M.storage=16;else if(k.isMatrix3)M.boundary=48,M.storage=48;else if(k.isMatrix4)M.boundary=64,M.storage=64;else if(k.isTexture)X0("WebGLRenderer: Texture samplers can not be part of an uniforms group.");else if(ArrayBuffer.isView(k))M.boundary=16,M.storage=k.byteLength;else X0("WebGLRenderer: Unsupported uniform value type.",k);return M}function F(k){let M=k.target;M.removeEventListener("dispose",F);let V=Y.indexOf(M.__bindingPointIndex);Y.splice(V,1),J.deleteBuffer(W[M.id]),delete W[M.id],delete K[M.id]}function D(){for(let k in W)J.deleteBuffer(W[k]);Y=[],W={},K={}}return{bind:X,update:U,dispose:D}}var v1=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),w9=null;function f1(){if(w9===null)w9=new W9(v1,16,16,j8,p9),w9.name="DFG_LUT",w9.minFilter=iJ,w9.magFilter=iJ,w9.wrapS=DQ,w9.wrapT=DQ,w9.generateMipmaps=!1,w9.needsUpdate=!0;return w9}class b1{constructor(J={}){let{canvas:Q=CH(),context:$=null,depth:Z=!0,stencil:W=!1,alpha:K=!1,antialias:Y=!1,premultipliedAlpha:H=!0,preserveDrawingBuffer:X=!1,powerPreference:U="default",failIfMajorPerformanceCaveat:E=!1,reversedDepthBuffer:N=!1,outputBufferType:G=D9}=J;this.isWebGLRenderer=!0;let q;if($!==null){if(typeof WebGLRenderingContext<"u"&&$ instanceof WebGLRenderingContext)throw Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");q=$.getContextAttributes().alpha}else q=K;let O=G,R=new Set([VZ,LZ,MZ]),F=new Set([D9,$8,e7,L7,RZ,kZ]),D=new Uint32Array(4),k=new Int32Array(4),M=new P,V=null,_=null,A=[],C=[],L=null;this.domElement=Q,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=q9,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let I=this,b=!1,T=null;this._outputColorSpace=LH;let p=0,u=0,y=null,l=-1,h=null,m=new GJ,a=new GJ,W0=null,N0=new V0(0),j0=0,B0=Q.width,ZJ=Q.height,r0=1,s=null,O0=null,P0=new GJ(0,0,B0,ZJ),G0=new GJ(0,0,B0,ZJ),b0=!1,WJ=new f8,p0=!1,l0=!1,t=new d0,$0=new P,e=new GJ,L0={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},M0=!1;function x0(){return y===null?r0:1}let S=$;function t0(z,v){return Q.getContext(z,v)}try{let z={alpha:!0,depth:Z,stencil:W,antialias:Y,premultipliedAlpha:H,preserveDrawingBuffer:X,powerPreference:U,failIfMajorPerformanceCaveat:E};if("setAttribute"in Q)Q.setAttribute("data-engine",`three.js r${PY}`);if(Q.addEventListener("webglcontextlost",C0,!1),Q.addEventListener("webglcontextrestored",Q0,!1),Q.addEventListener("webglcontextcreationerror",v0,!1),S===null){if(S=t0("webgl2",z),S===null)if(t0("webgl2"))throw Error("Error creating WebGL context with your selected attributes.");else throw Error("Error creating WebGL context.")}}catch(z){throw T0("WebGLRenderer: "+z.message),z}let y0,g0,K0,XJ,w0,w,B,f,i,J0,Z0,q0,c,o,E0,A0,H0,D0,c0,a0,JJ,j,U0;function n(){if(y0=new dD(S),y0.init(),JJ=new C1(S,y0),g0=new vD(S,y0,J,JJ),K0=new w1(S,y0),g0.reversedDepthBuffer&&N)K0.buffers.depth.setReversed(!0);XJ=new cD(S),w0=new N1,w=new A1(S,y0,K0,w0,g0,JJ,XJ),B=new mD(I),f=new o5(S),j=new jD(S,f),i=new lD(S,f,XJ,j),J0=new sD(S,i,f,j,XJ),D0=new nD(S,g0,w),E0=new fD(w0),Z0=new E1(I,B,y0,g0,j,E0),q0=new j1(I,w0),c=new D1,o=new L1(y0),H0=new SD(I,B,K0,J0,q,H),A0=new _1(I,J0,g0),U0=new y1(S,XJ,g0,K0),c0=new yD(S,y0,XJ),a0=new uD(S,y0,XJ),XJ.programs=Z0.programs,I.capabilities=g0,I.extensions=y0,I.properties=w0,I.renderLists=c,I.shadowMap=A0,I.state=K0,I.info=XJ}if(n(),O!==D9)L=new oD(O,Q.width,Q.height,Z,W);let Y0=new SU(I,S);this.xr=Y0,this.getContext=function(){return S},this.getContextAttributes=function(){return S.getContextAttributes()},this.forceContextLoss=function(){let z=y0.get("WEBGL_lose_context");if(z)z.loseContext()},this.forceContextRestore=function(){let z=y0.get("WEBGL_lose_context");if(z)z.restoreContext()},this.getPixelRatio=function(){return r0},this.setPixelRatio=function(z){if(z===void 0)return;r0=z,this.setSize(B0,ZJ,!1)},this.getSize=function(z){return z.set(B0,ZJ)},this.setSize=function(z,v,d=!0){if(Y0.isPresenting){X0("WebGLRenderer: Can't change size while VR device is presenting.");return}if(B0=z,ZJ=v,Q.width=Math.floor(z*r0),Q.height=Math.floor(v*r0),d===!0)Q.style.width=z+"px",Q.style.height=v+"px";if(L!==null)L.setSize(Q.width,Q.height);this.setViewport(0,0,z,v)},this.getDrawingBufferSize=function(z){return z.set(B0*r0,ZJ*r0).floor()},this.setDrawingBufferSize=function(z,v,d){B0=z,ZJ=v,r0=d,Q.width=Math.floor(z*d),Q.height=Math.floor(v*d),this.setViewport(0,0,z,v)},this.setEffects=function(z){if(O===D9){T0("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(z){for(let v=0;v<z.length;v++)if(z[v].isOutputPass===!0){X0("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}L.setEffects(z||[])},this.getCurrentViewport=function(z){return z.copy(m)},this.getViewport=function(z){return z.copy(P0)},this.setViewport=function(z,v,d,x){if(z.isVector4)P0.set(z.x,z.y,z.z,z.w);else P0.set(z,v,d,x);K0.viewport(m.copy(P0).multiplyScalar(r0).round())},this.getScissor=function(z){return z.copy(G0)},this.setScissor=function(z,v,d,x){if(z.isVector4)G0.set(z.x,z.y,z.z,z.w);else G0.set(z,v,d,x);K0.scissor(a.copy(G0).multiplyScalar(r0).round())},this.getScissorTest=function(){return b0},this.setScissorTest=function(z){K0.setScissorTest(b0=z)},this.setOpaqueSort=function(z){s=z},this.setTransparentSort=function(z){O0=z},this.getClearColor=function(z){return z.copy(H0.getClearColor())},this.setClearColor=function(){H0.setClearColor(...arguments)},this.getClearAlpha=function(){return H0.getClearAlpha()},this.setClearAlpha=function(){H0.setClearAlpha(...arguments)},this.clear=function(z=!0,v=!0,d=!0){let x=0;if(z){let g=!1;if(y!==null){let k0=y.texture.format;g=R.has(k0)}if(g){let k0=y.texture.type,_0=F.has(k0),R0=H0.getClearColor(),S0=H0.getClearAlpha(),f0=R0.r,i0=R0.g,QJ=R0.b;if(_0)D[0]=f0,D[1]=i0,D[2]=QJ,D[3]=S0,S.clearBufferuiv(S.COLOR,0,D);else k[0]=f0,k[1]=i0,k[2]=QJ,k[3]=S0,S.clearBufferiv(S.COLOR,0,k)}else x|=S.COLOR_BUFFER_BIT}if(v)x|=S.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0);if(d)x|=S.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295);if(x!==0)S.clear(x)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(z){z.setRenderer(this),T=z},this.dispose=function(){Q.removeEventListener("webglcontextlost",C0,!1),Q.removeEventListener("webglcontextrestored",Q0,!1),Q.removeEventListener("webglcontextcreationerror",v0,!1),H0.dispose(),c.dispose(),o.dispose(),w0.dispose(),B.dispose(),J0.dispose(),j.dispose(),U0.dispose(),Z0.dispose(),Y0.dispose(),Y0.removeEventListener("sessionstart",NK),Y0.removeEventListener("sessionend",qK),X8.stop()};function C0(z){z.preventDefault(),u7("WebGLRenderer: Context Lost."),b=!0}function Q0(){u7("WebGLRenderer: Context Restored."),b=!1;let z=XJ.autoReset,v=A0.enabled,d=A0.autoUpdate,x=A0.needsUpdate,g=A0.type;n(),XJ.autoReset=z,A0.enabled=v,A0.autoUpdate=d,A0.needsUpdate=x,A0.type=g}function v0(z){T0("WebGLRenderer: A WebGL context could not be created. Reason: ",z.statusMessage)}function s0(z){let v=z.target;v.removeEventListener("dispose",s0),_J(v)}function _J(z){EJ(z),w0.remove(z)}function EJ(z){let v=w0.get(z).programs;if(v!==void 0){if(v.forEach(function(d){Z0.releaseProgram(d)}),z.isShaderMaterial)Z0.releaseShaderCache(z)}}this.renderBufferDirect=function(z,v,d,x,g,k0){if(v===null)v=L0;let _0=g.isMesh&&g.matrixWorld.determinant()<0,R0=fU(z,v,d,x,g);K0.setMaterial(x,_0);let S0=d.index,f0=1;if(x.wireframe===!0){if(S0=i.getWireframeAttribute(d),S0===void 0)return;f0=2}let i0=d.drawRange,QJ=d.attributes.position,h0=i0.start*f0,NJ=(i0.start+i0.count)*f0;if(k0!==null)h0=Math.max(h0,k0.start*f0),NJ=Math.min(NJ,(k0.start+k0.count)*f0);if(S0!==null)h0=Math.max(h0,0),NJ=Math.min(NJ,S0.count);else if(QJ!==void 0&&QJ!==null)h0=Math.max(h0,0),NJ=Math.min(NJ,QJ.count);let VJ=NJ-h0;if(VJ<0||VJ===1/0)return;j.setup(g,x,R0,d,S0);let MJ,qJ=c0;if(S0!==null)MJ=f.get(S0),qJ=a0,qJ.setIndex(MJ);if(g.isMesh)if(x.wireframe===!0)K0.setLineWidth(x.wireframeLinewidth*x0()),qJ.setMode(S.LINES);else qJ.setMode(S.TRIANGLES);else if(g.isLine){let vJ=x.linewidth;if(vJ===void 0)vJ=1;if(K0.setLineWidth(vJ*x0()),g.isLineSegments)qJ.setMode(S.LINES);else if(g.isLineLoop)qJ.setMode(S.LINE_LOOP);else qJ.setMode(S.LINE_STRIP)}else if(g.isPoints)qJ.setMode(S.POINTS);else if(g.isSprite)qJ.setMode(S.TRIANGLES);if(g.isBatchedMesh)if(!y0.get("WEBGL_multi_draw")){let{_multiDrawStarts:vJ,_multiDrawCounts:z0,_multiDrawCount:aJ}=g,KJ=S0?f.get(S0).bytesPerElement:1,$9=w0.get(x).currentProgram.getUniforms();for(let R9=0;R9<aJ;R9++)$9.setValue(S,"_gl_DrawID",R9),qJ.render(vJ[R9]/KJ,z0[R9])}else qJ.renderMultiDraw(g._multiDrawStarts,g._multiDrawCounts,g._multiDrawCount);else if(g.isInstancedMesh)qJ.renderInstances(h0,VJ,g.count);else if(d.isInstancedBufferGeometry){let vJ=d._maxInstanceCount!==void 0?d._maxInstanceCount:1/0,z0=Math.min(d.instanceCount,vJ);qJ.renderInstances(h0,VJ,z0)}else qJ.render(h0,VJ)};function O9(z,v,d){if(z.transparent===!0&&z.side===z9&&z.forceSinglePass===!1)z.side=sJ,z.needsUpdate=!0,R6(z,v,d),z.side=R7,z.needsUpdate=!0,R6(z,v,d),z.side=z9;else R6(z,v,d)}this.compile=function(z,v,d=null){if(d===null)d=z;if(_=o.get(d),_.init(v),C.push(_),d.traverseVisible(function(g){if(g.isLight&&g.layers.test(v.layers)){if(_.pushLight(g),g.castShadow)_.pushShadow(g)}}),z!==d)z.traverseVisible(function(g){if(g.isLight&&g.layers.test(v.layers)){if(_.pushLight(g),g.castShadow)_.pushShadow(g)}});_.setupLights();let x=new Set;return z.traverse(function(g){if(!(g.isMesh||g.isPoints||g.isLine||g.isSprite))return;let k0=g.material;if(k0)if(Array.isArray(k0))for(let _0=0;_0<k0.length;_0++){let R0=k0[_0];O9(R0,d,g),x.add(R0)}else O9(k0,d,g),x.add(k0)}),_=C.pop(),x},this.compileAsync=function(z,v,d=null){let x=this.compile(z,v,d);return new Promise((g)=>{function k0(){if(x.forEach(function(_0){if(w0.get(_0).currentProgram.isReady())x.delete(_0)}),x.size===0){g(z);return}setTimeout(k0,10)}if(y0.get("KHR_parallel_shader_compile")!==null)k0();else setTimeout(k0,10)})};let H9=null;function yU(z){if(H9)H9(z)}function NK(){X8.stop()}function qK(){X8.start()}let X8=new MU;if(X8.setAnimationLoop(yU),typeof self<"u")X8.setContext(self);this.setAnimationLoop=function(z){H9=z,Y0.setAnimationLoop(z),z===null?X8.stop():X8.start()},Y0.addEventListener("sessionstart",NK),Y0.addEventListener("sessionend",qK),this.render=function(z,v){if(v!==void 0&&v.isCamera!==!0){T0("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(b===!0)return;if(T!==null)T.renderStart(z,v);let d=Y0.enabled===!0&&Y0.isPresenting===!0,x=L!==null&&(y===null||d)&&L.begin(I,y);if(z.matrixWorldAutoUpdate===!0)z.updateMatrixWorld();if(v.parent===null&&v.matrixWorldAutoUpdate===!0)v.updateMatrixWorld();if(Y0.enabled===!0&&Y0.isPresenting===!0&&(L===null||L.isCompositing()===!1)){if(Y0.cameraAutoUpdate===!0)Y0.updateCamera(v);v=Y0.getCamera()}if(z.isScene===!0)z.onBeforeRender(I,z,v,y);if(_=o.get(z,C.length),_.init(v),_.state.textureUnits=w.getTextureUnits(),C.push(_),t.multiplyMatrices(v.projectionMatrix,v.matrixWorldInverse),WJ.setFromProjectionMatrix(t,$W,v.reversedDepth),l0=this.localClippingEnabled,p0=E0.init(this.clippingPlanes,l0),V=c.get(z,A.length),V.init(),A.push(V),Y0.enabled===!0&&Y0.isPresenting===!0){let _0=I.xr.getDepthSensingMesh();if(_0!==null)D$(_0,v,-1/0,I.sortObjects)}if(D$(z,v,0,I.sortObjects),V.finish(),I.sortObjects===!0)V.sort(s,O0);if(M0=Y0.enabled===!1||Y0.isPresenting===!1||Y0.hasDepthSensing()===!1,M0)H0.addToRenderList(V,z);if(this.info.render.frame++,p0===!0)E0.beginShadows();let g=_.state.shadowsArray;if(A0.render(g,z,v),p0===!0)E0.endShadows();if(this.info.autoReset===!0)this.info.reset();if((x&&L.hasRenderPass())===!1){let{opaque:_0,transmissive:R0}=V;if(_.setupLights(),v.isArrayCamera){let S0=v.cameras;if(R0.length>0)for(let f0=0,i0=S0.length;f0<i0;f0++){let QJ=S0[f0];FK(_0,R0,z,QJ)}if(M0)H0.render(z);for(let f0=0,i0=S0.length;f0<i0;f0++){let QJ=S0[f0];DK(V,z,QJ,QJ.viewport)}}else{if(R0.length>0)FK(_0,R0,z,v);if(M0)H0.render(z);DK(V,z,v)}}if(y!==null&&u===0)w.updateMultisampleRenderTarget(y),w.updateRenderTargetMipmap(y);if(x)L.end(I);if(z.isScene===!0)z.onAfterRender(I,z,v);if(j.resetDefaultState(),l=-1,h=null,C.pop(),C.length>0){if(_=C[C.length-1],w.setTextureUnits(_.state.textureUnits),p0===!0)E0.setGlobalState(I.clippingPlanes,_.state.camera)}else _=null;if(A.pop(),A.length>0)V=A[A.length-1];else V=null;if(T!==null)T.renderEnd()};function D$(z,v,d,x){if(z.visible===!1)return;if(z.layers.test(v.layers)){if(z.isGroup)d=z.renderOrder;else if(z.isLOD){if(z.autoUpdate===!0)z.update(v)}else if(z.isLightProbeGrid)_.pushLightProbeGrid(z);else if(z.isLight){if(_.pushLight(z),z.castShadow)_.pushShadow(z)}else if(z.isSprite){if(!z.frustumCulled||WJ.intersectsSprite(z)){if(x)e.setFromMatrixPosition(z.matrixWorld).applyMatrix4(t);let _0=J0.update(z),R0=z.material;if(R0.visible)V.push(z,_0,R0,d,e.z,null)}}else if(z.isMesh||z.isLine||z.isPoints){if(!z.frustumCulled||WJ.intersectsObject(z)){let _0=J0.update(z),R0=z.material;if(x){if(z.boundingSphere!==void 0){if(z.boundingSphere===null)z.computeBoundingSphere();e.copy(z.boundingSphere.center)}else{if(_0.boundingSphere===null)_0.computeBoundingSphere();e.copy(_0.boundingSphere.center)}e.applyMatrix4(z.matrixWorld).applyMatrix4(t)}if(Array.isArray(R0)){let S0=_0.groups;for(let f0=0,i0=S0.length;f0<i0;f0++){let QJ=S0[f0],h0=R0[QJ.materialIndex];if(h0&&h0.visible)V.push(z,_0,h0,d,e.z,QJ)}}else if(R0.visible)V.push(z,_0,R0,d,e.z,null)}}}let k0=z.children;for(let _0=0,R0=k0.length;_0<R0;_0++)D$(k0[_0],v,d,x)}function DK(z,v,d,x){let{opaque:g,transmissive:k0,transparent:_0}=z;if(_.setupLightsView(d),p0===!0)E0.setGlobalState(I.clippingPlanes,d);if(x)K0.viewport(m.copy(x));if(g.length>0)O6(g,v,d);if(k0.length>0)O6(k0,v,d);if(_0.length>0)O6(_0,v,d);K0.buffers.depth.setTest(!0),K0.buffers.depth.setMask(!0),K0.buffers.color.setMask(!0),K0.setPolygonOffset(!1)}function FK(z,v,d,x){if((d.isScene===!0?d.overrideMaterial:null)!==null)return;if(_.state.transmissionRenderTarget[x.id]===void 0){let h0=y0.has("EXT_color_buffer_half_float")||y0.has("EXT_color_buffer_float");_.state.transmissionRenderTarget[x.id]=new oJ(1,1,{generateMipmaps:!0,type:h0?p9:D9,minFilter:P8,samples:Math.max(4,g0.samples),stencilBuffer:W,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:$J.workingColorSpace})}let k0=_.state.transmissionRenderTarget[x.id],_0=x.viewport||m;k0.setSize(_0.z*I.transmissionResolutionScale,_0.w*I.transmissionResolutionScale);let R0=I.getRenderTarget(),S0=I.getActiveCubeFace(),f0=I.getActiveMipmapLevel();if(I.setRenderTarget(k0),I.getClearColor(N0),j0=I.getClearAlpha(),j0<1)I.setClearColor(16777215,0.5);if(I.clear(),M0)H0.render(d);let i0=I.toneMapping;I.toneMapping=q9;let QJ=x.viewport;if(x.viewport!==void 0)x.viewport=void 0;if(_.setupLightsView(x),p0===!0)E0.setGlobalState(I.clippingPlanes,x);if(O6(z,d,x),w.updateMultisampleRenderTarget(k0),w.updateRenderTargetMipmap(k0),y0.has("WEBGL_multisampled_render_to_texture")===!1){let h0=!1;for(let NJ=0,VJ=v.length;NJ<VJ;NJ++){let MJ=v[NJ],{object:qJ,geometry:vJ,material:z0,group:aJ}=MJ;if(z0.side===z9&&qJ.layers.test(x.layers)){let KJ=z0.side;z0.side=sJ,z0.needsUpdate=!0,OK(qJ,d,x,vJ,z0,aJ),z0.side=KJ,z0.needsUpdate=!0,h0=!0}}if(h0===!0)w.updateMultisampleRenderTarget(k0),w.updateRenderTargetMipmap(k0)}if(I.setRenderTarget(R0,S0,f0),I.setClearColor(N0,j0),QJ!==void 0)x.viewport=QJ;I.toneMapping=i0}function O6(z,v,d){let x=v.isScene===!0?v.overrideMaterial:null;for(let g=0,k0=z.length;g<k0;g++){let _0=z[g],{object:R0,geometry:S0,group:f0}=_0,i0=_0.material;if(i0.allowOverride===!0&&x!==null)i0=x;if(R0.layers.test(d.layers))OK(R0,v,d,S0,i0,f0)}}function OK(z,v,d,x,g,k0){if(z.onBeforeRender(I,v,d,x,g,k0),z.modelViewMatrix.multiplyMatrices(d.matrixWorldInverse,z.matrixWorld),z.normalMatrix.getNormalMatrix(z.modelViewMatrix),g.onBeforeRender(I,v,d,x,z,k0),g.transparent===!0&&g.side===z9&&g.forceSinglePass===!1)g.side=sJ,g.needsUpdate=!0,I.renderBufferDirect(d,v,x,g,z,k0),g.side=R7,g.needsUpdate=!0,I.renderBufferDirect(d,v,x,g,z,k0),g.side=z9;else I.renderBufferDirect(d,v,x,g,z,k0);z.onAfterRender(I,v,d,x,g,k0)}function R6(z,v,d){if(v.isScene!==!0)v=L0;let x=w0.get(z),g=_.state.lights,k0=_.state.shadowsArray,_0=g.state.version,R0=Z0.getParameters(z,g.state,k0,v,d,_.state.lightProbeGridArray),S0=Z0.getProgramCacheKey(R0),f0=x.programs;x.environment=z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial?v.environment:null,x.fog=v.fog;let i0=z.isMeshStandardMaterial||z.isMeshLambertMaterial&&!z.envMap||z.isMeshPhongMaterial&&!z.envMap;if(x.envMap=B.get(z.envMap||x.environment,i0),x.envMapRotation=x.environment!==null&&z.envMap===null?v.environmentRotation:z.envMapRotation,f0===void 0)z.addEventListener("dispose",s0),f0=new Map,x.programs=f0;let QJ=f0.get(S0);if(QJ!==void 0){if(x.currentProgram===QJ&&x.lightsStateVersion===_0)return kK(z,R0),QJ}else{if(R0.uniforms=Z0.getUniforms(z),T!==null&&z.isNodeMaterial)T.build(z,d,R0);z.onBeforeCompile(R0,I),QJ=Z0.acquireProgram(R0,S0),f0.set(S0,QJ),x.uniforms=R0.uniforms}let h0=x.uniforms;if(!z.isShaderMaterial&&!z.isRawShaderMaterial||z.clipping===!0)h0.clippingPlanes=E0.uniform;if(kK(z,R0),x.needsLights=hU(z),x.lightsStateVersion=_0,x.needsLights)h0.ambientLightColor.value=g.state.ambient,h0.lightProbe.value=g.state.probe,h0.directionalLights.value=g.state.directional,h0.directionalLightShadows.value=g.state.directionalShadow,h0.spotLights.value=g.state.spot,h0.spotLightShadows.value=g.state.spotShadow,h0.rectAreaLights.value=g.state.rectArea,h0.ltc_1.value=g.state.rectAreaLTC1,h0.ltc_2.value=g.state.rectAreaLTC2,h0.pointLights.value=g.state.point,h0.pointLightShadows.value=g.state.pointShadow,h0.hemisphereLights.value=g.state.hemi,h0.directionalShadowMatrix.value=g.state.directionalShadowMatrix,h0.spotLightMatrix.value=g.state.spotLightMatrix,h0.spotLightMap.value=g.state.spotLightMap,h0.pointShadowMatrix.value=g.state.pointShadowMatrix;return x.lightProbeGrid=_.state.lightProbeGridArray.length>0,x.currentProgram=QJ,x.uniformsList=null,QJ}function RK(z){if(z.uniformsList===null){let v=z.currentProgram.getUniforms();z.uniformsList=F6.seqWithValue(v.seq,z.uniforms)}return z.uniformsList}function kK(z,v){let d=w0.get(z);d.outputColorSpace=v.outputColorSpace,d.batching=v.batching,d.batchingColor=v.batchingColor,d.instancing=v.instancing,d.instancingColor=v.instancingColor,d.instancingMorph=v.instancingMorph,d.skinning=v.skinning,d.morphTargets=v.morphTargets,d.morphNormals=v.morphNormals,d.morphColors=v.morphColors,d.morphTargetsCount=v.morphTargetsCount,d.numClippingPlanes=v.numClippingPlanes,d.numIntersection=v.numClipIntersection,d.vertexAlphas=v.vertexAlphas,d.vertexTangents=v.vertexTangents,d.toneMapping=v.toneMapping}function vU(z,v){if(z.length===0)return null;if(z.length===1)return z[0].texture!==null?z[0]:null;M.setFromMatrixPosition(v.matrixWorld);for(let d=0,x=z.length;d<x;d++){let g=z[d];if(g.texture!==null&&g.boundingBox.containsPoint(M))return g}return null}function fU(z,v,d,x,g){if(v.isScene!==!0)v=L0;w.resetTextureUnits();let k0=v.fog,_0=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?v.environment:null,R0=y===null?I.outputColorSpace:y.isXRRenderTarget===!0?y.texture.colorSpace:$J.workingColorSpace,S0=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap,f0=B.get(x.envMap||_0,S0),i0=x.vertexColors===!0&&!!d.attributes.color&&d.attributes.color.itemSize===4,QJ=!!d.attributes.tangent&&(!!x.normalMap||x.anisotropy>0),h0=!!d.morphAttributes.position,NJ=!!d.morphAttributes.normal,VJ=!!d.morphAttributes.color,MJ=q9;if(x.toneMapped){if(y===null||y.isXRRenderTarget===!0)MJ=I.toneMapping}let qJ=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,vJ=qJ!==void 0?qJ.length:0,z0=w0.get(x),aJ=_.state.lights;if(p0===!0){if(l0===!0||z!==h){let OJ=z===h&&x.id===l;E0.setState(x,z,OJ)}}let KJ=!1;if(x.version===z0.__version){if(z0.needsLights&&z0.lightsStateVersion!==aJ.state.version)KJ=!0;else if(z0.outputColorSpace!==R0)KJ=!0;else if(g.isBatchedMesh&&z0.batching===!1)KJ=!0;else if(!g.isBatchedMesh&&z0.batching===!0)KJ=!0;else if(g.isBatchedMesh&&z0.batchingColor===!0&&g.colorTexture===null)KJ=!0;else if(g.isBatchedMesh&&z0.batchingColor===!1&&g.colorTexture!==null)KJ=!0;else if(g.isInstancedMesh&&z0.instancing===!1)KJ=!0;else if(!g.isInstancedMesh&&z0.instancing===!0)KJ=!0;else if(g.isSkinnedMesh&&z0.skinning===!1)KJ=!0;else if(!g.isSkinnedMesh&&z0.skinning===!0)KJ=!0;else if(g.isInstancedMesh&&z0.instancingColor===!0&&g.instanceColor===null)KJ=!0;else if(g.isInstancedMesh&&z0.instancingColor===!1&&g.instanceColor!==null)KJ=!0;else if(g.isInstancedMesh&&z0.instancingMorph===!0&&g.morphTexture===null)KJ=!0;else if(g.isInstancedMesh&&z0.instancingMorph===!1&&g.morphTexture!==null)KJ=!0;else if(z0.envMap!==f0)KJ=!0;else if(x.fog===!0&&z0.fog!==k0)KJ=!0;else if(z0.numClippingPlanes!==void 0&&(z0.numClippingPlanes!==E0.numPlanes||z0.numIntersection!==E0.numIntersection))KJ=!0;else if(z0.vertexAlphas!==i0)KJ=!0;else if(z0.vertexTangents!==QJ)KJ=!0;else if(z0.morphTargets!==h0)KJ=!0;else if(z0.morphNormals!==NJ)KJ=!0;else if(z0.morphColors!==VJ)KJ=!0;else if(z0.toneMapping!==MJ)KJ=!0;else if(z0.morphTargetsCount!==vJ)KJ=!0;else if(!!z0.lightProbeGrid!==_.state.lightProbeGridArray.length>0)KJ=!0}else KJ=!0,z0.__version=x.version;let $9=z0.currentProgram;if(KJ===!0){if($9=R6(x,v,g),T&&x.isNodeMaterial)T.onUpdateProgram(x,$9,z0)}let R9=!1,l9=!1,p8=!1,DJ=$9.getUniforms(),BJ=z0.uniforms;if(K0.useProgram($9.program))R9=!0,l9=!0,p8=!0;if(x.id!==l)l=x.id,l9=!0;if(z0.needsLights){let OJ=vU(_.state.lightProbeGridArray,g);if(z0.lightProbeGrid!==OJ)z0.lightProbeGrid=OJ,l9=!0}if(R9||h!==z){if(K0.buffers.depth.getReversed()&&z.reversedDepth!==!0)z._reversedDepth=!0,z.updateProjectionMatrix();DJ.setValue(S,"projectionMatrix",z.projectionMatrix),DJ.setValue(S,"viewMatrix",z.matrixWorldInverse);let c9=DJ.map.cameraPosition;if(c9!==void 0)c9.setValue(S,$0.setFromMatrixPosition(z.matrixWorld));if(g0.logarithmicDepthBuffer)DJ.setValue(S,"logDepthBufFC",2/(Math.log(z.far+1)/Math.LN2));if(x.isMeshPhongMaterial||x.isMeshToonMaterial||x.isMeshLambertMaterial||x.isMeshBasicMaterial||x.isMeshStandardMaterial||x.isShaderMaterial)DJ.setValue(S,"isOrthographic",z.isOrthographicCamera===!0);if(h!==z)h=z,l9=!0,p8=!0}if(z0.needsLights){if(aJ.state.directionalShadowMap.length>0)DJ.setValue(S,"directionalShadowMap",aJ.state.directionalShadowMap,w);if(aJ.state.spotShadowMap.length>0)DJ.setValue(S,"spotShadowMap",aJ.state.spotShadowMap,w);if(aJ.state.pointShadowMap.length>0)DJ.setValue(S,"pointShadowMap",aJ.state.pointShadowMap,w)}if(g.isSkinnedMesh){DJ.setOptional(S,g,"bindMatrix"),DJ.setOptional(S,g,"bindMatrixInverse");let OJ=g.skeleton;if(OJ){if(OJ.boneTexture===null)OJ.computeBoneTexture();DJ.setValue(S,"boneTexture",OJ.boneTexture,w)}}if(g.isBatchedMesh){if(DJ.setOptional(S,g,"batchingTexture"),DJ.setValue(S,"batchingTexture",g._matricesTexture,w),DJ.setOptional(S,g,"batchingIdTexture"),DJ.setValue(S,"batchingIdTexture",g._indirectTexture,w),DJ.setOptional(S,g,"batchingColorTexture"),g._colorsTexture!==null)DJ.setValue(S,"batchingColorTexture",g._colorsTexture,w)}let u9=d.morphAttributes;if(u9.position!==void 0||u9.normal!==void 0||u9.color!==void 0)D0.update(g,d,$9);if(l9||z0.receiveShadow!==g.receiveShadow)z0.receiveShadow=g.receiveShadow,DJ.setValue(S,"receiveShadow",g.receiveShadow);if((x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial)&&x.envMap===null&&v.environment!==null)BJ.envMapIntensity.value=v.environmentIntensity;if(BJ.dfgLUT!==void 0)BJ.dfgLUT.value=f1();if(l9){if(DJ.setValue(S,"toneMappingExposure",I.toneMappingExposure),z0.needsLights)bU(BJ,p8);if(k0&&x.fog===!0)q0.refreshFogUniforms(BJ,k0);if(q0.refreshMaterialUniforms(BJ,x,r0,ZJ,_.state.transmissionRenderTarget[z.id]),z0.needsLights&&z0.lightProbeGrid){let OJ=z0.lightProbeGrid;BJ.probesSH.value=OJ.texture,BJ.probesMin.value.copy(OJ.boundingBox.min),BJ.probesMax.value.copy(OJ.boundingBox.max),BJ.probesResolution.value.copy(OJ.resolution)}F6.upload(S,RK(z0),BJ,w)}if(x.isShaderMaterial&&x.uniformsNeedUpdate===!0)F6.upload(S,RK(z0),BJ,w),x.uniformsNeedUpdate=!1;if(x.isSpriteMaterial)DJ.setValue(S,"center",g.center);if(DJ.setValue(S,"modelViewMatrix",g.modelViewMatrix),DJ.setValue(S,"normalMatrix",g.normalMatrix),DJ.setValue(S,"modelMatrix",g.matrixWorld),x.uniformsGroups!==void 0){let OJ=x.uniformsGroups;for(let c9=0,m8=OJ.length;c9<m8;c9++){let MK=OJ[c9];U0.update(MK,$9),U0.bind(MK,$9)}}return $9}function bU(z,v){z.ambientLightColor.needsUpdate=v,z.lightProbe.needsUpdate=v,z.directionalLights.needsUpdate=v,z.directionalLightShadows.needsUpdate=v,z.pointLights.needsUpdate=v,z.pointLightShadows.needsUpdate=v,z.spotLights.needsUpdate=v,z.spotLightShadows.needsUpdate=v,z.rectAreaLights.needsUpdate=v,z.hemisphereLights.needsUpdate=v}function hU(z){return z.isMeshLambertMaterial||z.isMeshToonMaterial||z.isMeshPhongMaterial||z.isMeshStandardMaterial||z.isShadowMaterial||z.isShaderMaterial&&z.lights===!0}this.getActiveCubeFace=function(){return p},this.getActiveMipmapLevel=function(){return u},this.getRenderTarget=function(){return y},this.setRenderTargetTextures=function(z,v,d){let x=w0.get(z);if(x.__autoAllocateDepthBuffer=z.resolveDepthBuffer===!1,x.__autoAllocateDepthBuffer===!1)x.__useRenderToTexture=!1;w0.get(z.texture).__webglTexture=v,w0.get(z.depthTexture).__webglTexture=x.__autoAllocateDepthBuffer?void 0:d,x.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(z,v){let d=w0.get(z);d.__webglFramebuffer=v,d.__useDefaultFramebuffer=v===void 0};let xU=S.createFramebuffer();this.setRenderTarget=function(z,v=0,d=0){y=z,p=v,u=d;let x=null,g=!1,k0=!1;if(z){let R0=w0.get(z);if(R0.__useDefaultFramebuffer!==void 0){K0.bindFramebuffer(S.FRAMEBUFFER,R0.__webglFramebuffer),m.copy(z.viewport),a.copy(z.scissor),W0=z.scissorTest,K0.viewport(m),K0.scissor(a),K0.setScissorTest(W0),l=-1;return}else if(R0.__webglFramebuffer===void 0)w.setupRenderTarget(z);else if(R0.__hasExternalTextures)w.rebindTextures(z,w0.get(z.texture).__webglTexture,w0.get(z.depthTexture).__webglTexture);else if(z.depthBuffer){let i0=z.depthTexture;if(R0.__boundDepthTexture!==i0){if(i0!==null&&w0.has(i0)&&(z.width!==i0.image.width||z.height!==i0.image.height))throw Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");w.setupDepthRenderbuffer(z)}}let S0=z.texture;if(S0.isData3DTexture||S0.isDataArrayTexture||S0.isCompressedArrayTexture)k0=!0;let f0=w0.get(z).__webglFramebuffer;if(z.isWebGLCubeRenderTarget){if(Array.isArray(f0[v]))x=f0[v][d];else x=f0[v];g=!0}else if(z.samples>0&&w.useMultisampledRTT(z)===!1)x=w0.get(z).__webglMultisampledFramebuffer;else if(Array.isArray(f0))x=f0[d];else x=f0;m.copy(z.viewport),a.copy(z.scissor),W0=z.scissorTest}else m.copy(P0).multiplyScalar(r0).floor(),a.copy(G0).multiplyScalar(r0).floor(),W0=b0;if(d!==0)x=xU;if(K0.bindFramebuffer(S.FRAMEBUFFER,x))K0.drawBuffers(z,x);if(K0.viewport(m),K0.scissor(a),K0.setScissorTest(W0),g){let R0=w0.get(z.texture);S.framebufferTexture2D(S.FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_CUBE_MAP_POSITIVE_X+v,R0.__webglTexture,d)}else if(k0){let R0=v;for(let S0=0;S0<z.textures.length;S0++){let f0=w0.get(z.textures[S0]);S.framebufferTextureLayer(S.FRAMEBUFFER,S.COLOR_ATTACHMENT0+S0,f0.__webglTexture,d,R0)}}else if(z!==null&&d!==0){let R0=w0.get(z.texture);S.framebufferTexture2D(S.FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_2D,R0.__webglTexture,d)}l=-1},this.readRenderTargetPixels=function(z,v,d,x,g,k0,_0,R0=0){if(!(z&&z.isWebGLRenderTarget)){T0("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let S0=w0.get(z).__webglFramebuffer;if(z.isWebGLCubeRenderTarget&&_0!==void 0)S0=S0[_0];if(S0){K0.bindFramebuffer(S.FRAMEBUFFER,S0);try{let f0=z.textures[R0],i0=f0.format,QJ=f0.type;if(z.textures.length>1)S.readBuffer(S.COLOR_ATTACHMENT0+R0);if(!g0.textureFormatReadable(i0)){T0("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!g0.textureTypeReadable(QJ)){T0("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}if(v>=0&&v<=z.width-x&&(d>=0&&d<=z.height-g))S.readPixels(v,d,x,g,JJ.convert(i0),JJ.convert(QJ),k0)}finally{let f0=y!==null?w0.get(y).__webglFramebuffer:null;K0.bindFramebuffer(S.FRAMEBUFFER,f0)}}},this.readRenderTargetPixelsAsync=async function(z,v,d,x,g,k0,_0,R0=0){if(!(z&&z.isWebGLRenderTarget))throw Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let S0=w0.get(z).__webglFramebuffer;if(z.isWebGLCubeRenderTarget&&_0!==void 0)S0=S0[_0];if(S0)if(v>=0&&v<=z.width-x&&(d>=0&&d<=z.height-g)){K0.bindFramebuffer(S.FRAMEBUFFER,S0);let f0=z.textures[R0],i0=f0.format,QJ=f0.type;if(z.textures.length>1)S.readBuffer(S.COLOR_ATTACHMENT0+R0);if(!g0.textureFormatReadable(i0))throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!g0.textureTypeReadable(QJ))throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let h0=S.createBuffer();S.bindBuffer(S.PIXEL_PACK_BUFFER,h0),S.bufferData(S.PIXEL_PACK_BUFFER,k0.byteLength,S.STREAM_READ),S.readPixels(v,d,x,g,JJ.convert(i0),JJ.convert(QJ),0);let NJ=y!==null?w0.get(y).__webglFramebuffer:null;K0.bindFramebuffer(S.FRAMEBUFFER,NJ);let VJ=S.fenceSync(S.SYNC_GPU_COMMANDS_COMPLETE,0);return S.flush(),await TH(S,VJ,4),S.bindBuffer(S.PIXEL_PACK_BUFFER,h0),S.getBufferSubData(S.PIXEL_PACK_BUFFER,0,k0),S.deleteBuffer(h0),S.deleteSync(VJ),k0}else throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(z,v=null,d=0){let x=Math.pow(2,-d),g=Math.floor(z.image.width*x),k0=Math.floor(z.image.height*x),_0=v!==null?v.x:0,R0=v!==null?v.y:0;w.setTexture2D(z,0),S.copyTexSubImage2D(S.TEXTURE_2D,d,0,0,_0,R0,g,k0),K0.unbindTexture()};let gU=S.createFramebuffer(),pU=S.createFramebuffer();if(this.copyTextureToTexture=function(z,v,d=null,x=null,g=0,k0=0){let _0,R0,S0,f0,i0,QJ,h0,NJ,VJ,MJ=z.isCompressedTexture?z.mipmaps[k0]:z.image;if(d!==null)_0=d.max.x-d.min.x,R0=d.max.y-d.min.y,S0=d.isBox3?d.max.z-d.min.z:1,f0=d.min.x,i0=d.min.y,QJ=d.isBox3?d.min.z:0;else{let BJ=Math.pow(2,-g);if(_0=Math.floor(MJ.width*BJ),R0=Math.floor(MJ.height*BJ),z.isDataArrayTexture)S0=MJ.depth;else if(z.isData3DTexture)S0=Math.floor(MJ.depth*BJ);else S0=1;f0=0,i0=0,QJ=0}if(x!==null)h0=x.x,NJ=x.y,VJ=x.z;else h0=0,NJ=0,VJ=0;let qJ=JJ.convert(v.format),vJ=JJ.convert(v.type),z0;if(v.isData3DTexture)w.setTexture3D(v,0),z0=S.TEXTURE_3D;else if(v.isDataArrayTexture||v.isCompressedArrayTexture)w.setTexture2DArray(v,0),z0=S.TEXTURE_2D_ARRAY;else w.setTexture2D(v,0),z0=S.TEXTURE_2D;K0.activeTexture(S.TEXTURE0),K0.pixelStorei(S.UNPACK_FLIP_Y_WEBGL,v.flipY),K0.pixelStorei(S.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),K0.pixelStorei(S.UNPACK_ALIGNMENT,v.unpackAlignment);let aJ=K0.getParameter(S.UNPACK_ROW_LENGTH),KJ=K0.getParameter(S.UNPACK_IMAGE_HEIGHT),$9=K0.getParameter(S.UNPACK_SKIP_PIXELS),R9=K0.getParameter(S.UNPACK_SKIP_ROWS),l9=K0.getParameter(S.UNPACK_SKIP_IMAGES);K0.pixelStorei(S.UNPACK_ROW_LENGTH,MJ.width),K0.pixelStorei(S.UNPACK_IMAGE_HEIGHT,MJ.height),K0.pixelStorei(S.UNPACK_SKIP_PIXELS,f0),K0.pixelStorei(S.UNPACK_SKIP_ROWS,i0),K0.pixelStorei(S.UNPACK_SKIP_IMAGES,QJ);let p8=z.isDataArrayTexture||z.isData3DTexture,DJ=v.isDataArrayTexture||v.isData3DTexture;if(z.isDepthTexture){let BJ=w0.get(z),u9=w0.get(v),OJ=w0.get(BJ.__renderTarget),c9=w0.get(u9.__renderTarget);K0.bindFramebuffer(S.READ_FRAMEBUFFER,OJ.__webglFramebuffer),K0.bindFramebuffer(S.DRAW_FRAMEBUFFER,c9.__webglFramebuffer);for(let m8=0;m8<S0;m8++){if(p8)S.framebufferTextureLayer(S.READ_FRAMEBUFFER,S.COLOR_ATTACHMENT0,w0.get(z).__webglTexture,g,QJ+m8),S.framebufferTextureLayer(S.DRAW_FRAMEBUFFER,S.COLOR_ATTACHMENT0,w0.get(v).__webglTexture,k0,VJ+m8);S.blitFramebuffer(f0,i0,_0,R0,h0,NJ,_0,R0,S.DEPTH_BUFFER_BIT,S.NEAREST)}K0.bindFramebuffer(S.READ_FRAMEBUFFER,null),K0.bindFramebuffer(S.DRAW_FRAMEBUFFER,null)}else if(g!==0||z.isRenderTargetTexture||w0.has(z)){let BJ=w0.get(z),u9=w0.get(v);K0.bindFramebuffer(S.READ_FRAMEBUFFER,gU),K0.bindFramebuffer(S.DRAW_FRAMEBUFFER,pU);for(let OJ=0;OJ<S0;OJ++){if(p8)S.framebufferTextureLayer(S.READ_FRAMEBUFFER,S.COLOR_ATTACHMENT0,BJ.__webglTexture,g,QJ+OJ);else S.framebufferTexture2D(S.READ_FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_2D,BJ.__webglTexture,g);if(DJ)S.framebufferTextureLayer(S.DRAW_FRAMEBUFFER,S.COLOR_ATTACHMENT0,u9.__webglTexture,k0,VJ+OJ);else S.framebufferTexture2D(S.DRAW_FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_2D,u9.__webglTexture,k0);if(g!==0)S.blitFramebuffer(f0,i0,_0,R0,h0,NJ,_0,R0,S.COLOR_BUFFER_BIT,S.NEAREST);else if(DJ)S.copyTexSubImage3D(z0,k0,h0,NJ,VJ+OJ,f0,i0,_0,R0);else S.copyTexSubImage2D(z0,k0,h0,NJ,f0,i0,_0,R0)}K0.bindFramebuffer(S.READ_FRAMEBUFFER,null),K0.bindFramebuffer(S.DRAW_FRAMEBUFFER,null)}else if(DJ)if(z.isDataTexture||z.isData3DTexture)S.texSubImage3D(z0,k0,h0,NJ,VJ,_0,R0,S0,qJ,vJ,MJ.data);else if(v.isCompressedArrayTexture)S.compressedTexSubImage3D(z0,k0,h0,NJ,VJ,_0,R0,S0,qJ,MJ.data);else S.texSubImage3D(z0,k0,h0,NJ,VJ,_0,R0,S0,qJ,vJ,MJ);else if(z.isDataTexture)S.texSubImage2D(S.TEXTURE_2D,k0,h0,NJ,_0,R0,qJ,vJ,MJ.data);else if(z.isCompressedTexture)S.compressedTexSubImage2D(S.TEXTURE_2D,k0,h0,NJ,MJ.width,MJ.height,qJ,MJ.data);else S.texSubImage2D(S.TEXTURE_2D,k0,h0,NJ,_0,R0,qJ,vJ,MJ);if(K0.pixelStorei(S.UNPACK_ROW_LENGTH,aJ),K0.pixelStorei(S.UNPACK_IMAGE_HEIGHT,KJ),K0.pixelStorei(S.UNPACK_SKIP_PIXELS,$9),K0.pixelStorei(S.UNPACK_SKIP_ROWS,R9),K0.pixelStorei(S.UNPACK_SKIP_IMAGES,l9),k0===0&&v.generateMipmaps)S.generateMipmap(z0);K0.unbindTexture()},this.initRenderTarget=function(z){if(w0.get(z).__webglFramebuffer===void 0)w.setupRenderTarget(z)},this.initTexture=function(z){if(z.isCubeTexture)w.setTextureCube(z,0);else if(z.isData3DTexture)w.setTexture3D(z,0);else if(z.isDataArrayTexture||z.isCompressedArrayTexture)w.setTexture2DArray(z,0);else w.setTexture2D(z,0);K0.unbindTexture()},this.resetState=function(){p=0,u=0,y=null,K0.reset(),j.reset()},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return $W}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(J){this._outputColorSpace=J;let Q=this.getContext();Q.drawingBufferColorSpace=$J._getDrawingBufferColorSpace(J),Q.unpackColorSpace=$J._getUnpackColorSpace()}}export{PY as e,mU as f,dU as g,TY as h,WZ as i,SY as j,lU as k,uU as l,o7 as m,jY as n,O7 as o,R7 as p,sJ as q,z9 as r,I9 as s,a7 as t,KZ as u,YZ as v,HZ as w,yY as x,cU as y,k7 as z,vY as A,fY as B,bY as C,hY as D,xY as E,gY as F,pY as G,mY as H,dY as I,lY as J,uY as K,cY as L,nY as M,sY as N,iY as O,oY as P,aY as Q,rY as R,tY as S,eY as T,JH as U,QH as V,XZ as W,$H as X,ZH as Y,WH as Z,KH as _,YH as $,HH as aa,XH as ba,q9 as ca,UZ as da,GZ as ea,EZ as fa,NZ as ga,qZ as ha,DZ as ia,FZ as ja,nU as ka,sU as la,iU as ma,M7 as na,C8 as oa,NQ as pa,qQ as qa,r7 as ra,UH as sa,DQ as ta,GH as ua,Q8 as va,EH as wa,oU as xa,t7 as ya,aU as za,iJ as Aa,FQ as Ba,rU as Ca,P8 as Da,tU as Ea,D9 as Fa,NH as Ga,qH as Ha,e7 as Ia,OZ as Ja,$8 as Ka,g9 as La,p9 as Ma,RZ as Na,kZ as Oa,L7 as Pa,DH as Qa,FH as Ra,OH as Sa,RH as Ta,_9 as Ua,T8 as Va,S8 as Wa,kH as Xa,MZ as Ya,j8 as Za,LZ as _a,eU as $a,VZ as ab,OQ as bb,RQ as cb,kQ as db,MQ as eb,BZ as fb,zZ as gb,IZ as hb,_Z as ib,wZ as jb,AZ as kb,CZ as lb,PZ as mb,TZ as nb,LQ as ob,SZ as pb,jZ as qb,yZ as rb,vZ as sb,fZ as tb,bZ as ub,hZ as vb,xZ as wb,gZ as xb,pZ as yb,mZ as zb,dZ as Ab,lZ as Bb,uZ as Cb,cZ as Db,nZ as Eb,sZ as Fb,iZ as Gb,oZ as Hb,aZ as Ib,VQ as Jb,rZ as Kb,JG as Lb,QG as Mb,$G as Nb,ZG as Ob,WG as Pb,KG as Qb,YG as Rb,HG as Sb,XG as Tb,UG as Ub,GG as Vb,EG as Wb,NG as Xb,qG as Yb,DG as Zb,FG as _b,OG as $b,RG as ac,kG as bc,tZ as cc,MH as dc,y8 as ec,LH as fc,eZ as gc,JW as hc,FJ as ic,MG as jc,LG as kc,VG as lc,BG as mc,zG as nc,IG as oc,_G as pc,wG as qc,AG as rc,CG as sc,PG as tc,TG as uc,SG as vc,jG as wc,yG as xc,vG as yc,fG as zc,bG as Ac,hG as Bc,VH as Cc,BH as Dc,zH as Ec,BQ as Fc,IH as Gc,_H as Hc,zQ as Ic,wH as Jc,xG as Kc,gG as Lc,pG as Mc,mG as Nc,dG as Oc,lG as Pc,uG as Qc,cG as Rc,nG as Sc,sG as Tc,QW as Uc,$W as Vc,iG as Wc,oG as Xc,aG as Yc,rG as Zc,tG as _c,AH as $c,CH as ad,QE as bd,$E as cd,u7 as dd,X0 as ed,T0 as fd,HQ as gd,h1 as hd,SH as id,K9 as jd,I8 as kd,ME as ld,r as md,xJ as nd,P as od,u0 as pd,$J as qd,WW as rd,b9 as sd,kJ as td,GJ as ud,IQ as vd,oJ as wd,J6 as xd,jH as yd,Q6 as zd,yH as Ad,d0 as Bd,N9 as Cd,$6 as Dd,HJ as Ed,V8 as Fd,Z6 as Gd,V0 as Hd,_Q as Id,wQ as Jd,KW as Kd,nJ as Ld,jJ as Md,fH as Nd,UJ as Od,bH as Pd,hH as Qd,xH as Rd,gH as Sd,AQ as Td,pH as Ud,CQ as Vd,mH as Wd,I0 as Xd,SJ as Yd,n0 as Zd,W6 as _d,_8 as $d,yJ as ae,PQ as be,YW as ce,HW as de,v8 as ee,m9 as fe,IJ as ge,XW as he,TQ as ie,W9 as je,SQ as ke,w8 as le,UW as me,v9 as ne,f8 as oe,jQ as pe,GW as qe,gJ as re,x9 as se,F9 as te,EW as ue,yQ as ve,NW as we,qW as xe,uH as ye,cH as ze,K6 as Ae,nH as Be,sH as Ce,V7 as De,iH as Ee,oH as Fe,Z8 as Ge,DW as He,vQ as Ie,b8 as Je,fQ as Ke,bQ as Le,Y6 as Me,H6 as Ne,W8 as Oe,hQ as Pe,FW as Qe,Y9 as Re,X6 as Se,OW as Te,kW as Ue,xQ as Ve,MW as We,gQ as Xe,LW as Ye,pQ as Ze,mQ as _e,dQ as $e,VW as af,c7 as bf,e9 as cf,E9 as df,lQ as ef,uQ as ff,cQ as gf,U6 as hf,B7 as if,nQ as jf,sQ as kf,G6 as lf,iQ as mf,oQ as nf,aQ as of,rQ as pf,BW as qf,zW as rf,QX as sf,J9 as tf,tQ as uf,eQ as vf,_W as wf,wW as xf,AW as yf,CW as zf,PW as Af,J$ as Bf,Q$ as Cf,TW as Df,SW as Ef,ZX as Ff,x8 as Gf,yW as Hf,$$ as If,vW as Jf,fW as Kf,Q9 as Lf,K8 as Mf,Z$ as Nf,N7 as Of,bW as Pf,z7 as Qf,Y8 as Rf,q7 as Sf,D7 as Tf,V9 as Uf,W$ as Vf,WX as Wf,lJ as Xf,B9 as Yf,YX as Zf,HX as _f,F7 as $f,XX as ag,UX as bg,GX as cg,d9 as dg,hW as eg,E6 as fg,TJ as gg,xW as hg,gW as ig,I7 as jg,pW as kg,mW as lg,dW as mg,Y$ as ng,lW as og,H$ as pg,EQ as qg,uW as rg,cW as sg,DX as tg,FX as ug,X$ as vg,OX as wg,RX as xg,nW as yg,sW as zg,iW as Ag,kX as Bg,oW as Cg,MX as Dg,LX as Eg,aW as Fg,YJ as Gg,BX as Hg,eW as Ig,zX as Jg,IX as Kg,JK as Lg,_X as Mg,wX as Ng,AX as Og,CX as Pg,PX as Qg,TX as Rg,SX as Sg,QK as Tg,jX as Ug,yX as Vg,vX as Wg,fX as Xg,hX as Yg,xX as Zg,gX as _g,pX as $g,mX as ah,dX as bh,lX as ch,uX as dh,cX as eh,nX as fh,sX as gh,iX as hh,oX as ih,U$ as jh,aX as kh,e0 as lh,F0 as mh,A9 as nh,XK as oh,EK as ph,C1 as qh,b1 as rh};
