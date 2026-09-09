import * as THREE from 'three';
import { PHYSICAL_IO_MARK_PATH } from '../workspace-ui/app/LogoMark';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { defaultEnvironment } from '../lib/robot/environment';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

export function createContactScene(host, signal) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  // Preserve the LED matrix detail on Retina displays. The former 1.5x cap
  // visibly upscaled the canvas once the desktop stage became wide.
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.VSMShadowMap;
  renderer.setClearColor(0xffffff, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background=new THREE.Color(0xffffff);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room);
  scene.environment = environment.texture;
  room.dispose();
  let disposed=false, mapRequest=0, mapUrl='', customEnvironment=null;
  const backdrop=new THREE.Color();
  function loadEnvironment(settings){
    if(settings.hdriUrl===mapUrl)return;
    mapUrl=settings.hdriUrl;const request=++mapRequest;
    signal.environmentStatus='';
    if(!mapUrl){scene.environment=environment.texture;customEnvironment?.dispose();customEnvironment=null;return;}
    signal.environmentStatus='Loading environment…';
    const loader=settings.hdriFormat==='exr'?new EXRLoader():new RGBELoader();
    loader.load(mapUrl,texture=>{
      if(disposed||request!==mapRequest){texture.dispose();return;}
      try{
        const next=pmrem.fromEquirectangular(texture);
        customEnvironment?.dispose();customEnvironment=next;scene.environment=next.texture;
        signal.environmentStatus='';
      }catch{signal.environmentStatus='Could not read this environment. Try another HDR or EXR file.';}
      finally{texture.dispose();}
    },undefined,()=>{if(!disposed&&request===mapRequest)signal.environmentStatus='Could not load this environment. Try another HDR or EXR file.';});
  }
  const fill=new THREE.DirectionalLight(0xffffff,0);fill.position.set(4,2,3);scene.add(fill);
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 200);
  // 80mm full-frame lens; preserve the previous framing with a longer camera distance.
  camera.filmGauge=35;
  camera.setFocalLength(80);
  const bodyCameraTarget=new THREE.Vector3(0,-.05,0);
  const headCameraTarget=new THREE.Vector3(0,.42,0);
  const cameraTarget=bodyCameraTarget.clone();
  const originalOffset=new THREE.Vector3(4,2.5,7.5).sub(bodyCameraTarget);
  const centeredOffset=new THREE.Vector3(0,0,originalOffset.length());
  const originalFov=THREE.MathUtils.degToRad(35);
  const calculateCameraFrame=(position,target,headFocused=!!signal.headFocused)=>{
    camera.setFocalLength(80);
    target.copy(headFocused?headCameraTarget:bodyCameraTarget);
    const distanceScale=Math.tan(originalFov/2)/Math.tan(THREE.MathUtils.degToRad(camera.fov)/2);
    // At wide desktop ratios, move the full-body camera 1.25x farther away so
    // the robot renders at 80% of its former apparent size. Blend into the
    // change to avoid a framing jump while the window is resized.
    const wideScreenDistanceScale=headFocused?1:THREE.MathUtils.lerp(1,1.25,THREE.MathUtils.smoothstep(camera.aspect,1.15,1.5));
    position.copy(signal.centered?centeredOffset:originalOffset).multiplyScalar(distanceScale * Math.max(.72, Math.min(.85, .85 / camera.aspect)) * (headFocused?.74:wideScreenDistanceScale)).add(target);
  };
  const frameCamera=(headFocused=!!signal.headFocused)=>calculateCameraFrame(camera.position,cameraTarget,headFocused);
  frameCamera();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = true;
  controls.minPolarAngle = .45; controls.maxPolarAngle = Math.PI/2-.06;
  controls.target.copy(cameraTarget);
  let cameraFocusMode=!!signal.headFocused;
  let cameraTransitionStart=-1;
  const cameraTransitionDuration=400;
  const cameraFromPosition=new THREE.Vector3();
  const cameraFromTarget=new THREE.Vector3();
  const cameraToPosition=new THREE.Vector3();
  const cameraToTarget=new THREE.Vector3();
  const object = new THREE.Group(); scene.add(object);
  // Fine bead-blasted grain with a faint directional machining texture.
  // Both bump and roughness vary on the actual surface as the object turns.
  const grainCanvas=document.createElement('canvas');grainCanvas.width=1024;grainCanvas.height=1024;
  const grainContext=grainCanvas.getContext('2d');
  const pixels=grainContext.createImageData(1024,1024);
  let seed=17;
  const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<pixels.data.length;i+=4){
    const tone=175+Math.floor(random()*55);
    pixels.data[i]=tone;pixels.data[i+1]=tone;pixels.data[i+2]=tone;pixels.data[i+3]=255;
  }
  grainContext.putImageData(pixels,0,0);
  grainContext.globalAlpha=.08;
  for(let i=0;i<1600;i++){
    const y=random()*1024;
    grainContext.strokeStyle=random()>.5?'#ffffff':'#555555';
    grainContext.beginPath();grainContext.moveTo(0,y);grainContext.lineTo(1024,y);grainContext.stroke();
  }
  const grain=new THREE.CanvasTexture(grainCanvas);
  grain.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const shell = new THREE.MeshStandardMaterial({color:0x222421,metalness:.65,roughness:.43,roughnessMap:grain,bumpMap:grain,bumpScale:.006});
  const dark = new THREE.MeshPhysicalMaterial({color:0x090c0b,roughness:.3,metalness:.1,clearcoat:1,clearcoatRoughness:.22});
  const jointMaterial = new THREE.MeshStandardMaterial({color:0x101110,metalness:.3,roughness:.55});
  function solid(geometry,material,parent,x=0,y=0,z=0){
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  // One corner-cutting subdivision smooths the lathed contours as well as the rings.
  function subdivideProfile(points){
    const result=[points[0].clone()];
    for(let i=0;i<points.length-1;i++){
      result.push(points[i].clone().lerp(points[i+1],.25));
      result.push(points[i].clone().lerp(points[i+1],.75));
    }
    result.push(points[points.length-1].clone());
    return result;
  }
  // A wider, taller pedestal; its bottom remains in contact with the floor.
  const baseProfile=[new THREE.Vector2(0,-.45),new THREE.Vector2(.62,-.45),new THREE.Vector2(.7,-.4),new THREE.Vector2(.72,-.32),new THREE.Vector2(.72,.33),new THREE.Vector2(.68,.42),new THREE.Vector2(.6,.45),new THREE.Vector2(0,.45)];
  const pedestal=solid(new THREE.LatheGeometry(subdivideProfile(baseProfile),128),shell,object,0,-1.2705,0);
  pedestal.scale.set(1.16,1.25,1.16);
  // The official vector is wrapped onto the cylindrical base as a fine etched mark.
  const etchCanvas=document.createElement('canvas');etchCanvas.width=512;etchCanvas.height=320;
  const etchContext=etchCanvas.getContext('2d');
  etchContext.translate(26,24);etchContext.fillStyle='#bfc2bd';
  etchContext.fill(new Path2D(PHYSICAL_IO_MARK_PATH));
  const etchTexture=new THREE.CanvasTexture(etchCanvas);
  etchTexture.colorSpace=THREE.SRGBColorSpace;
  etchTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const etchMaterial=new THREE.MeshStandardMaterial({map:etchTexture,transparent:true,alphaTest:.05,opacity:.8,metalness:.25,roughness:.8,bumpMap:etchTexture,bumpScale:-.001,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const etchArc=.46;
  const etching=new THREE.Mesh(new THREE.CylinderGeometry(.8355,.8355,.24,32,1,true,-etchArc/2,etchArc),etchMaterial);
  etching.position.y=-1.29;etching.receiveShadow=true;object.add(etching);

  solid(new THREE.SphereGeometry(.25,64,32),jointMaterial,object,0,-.645,0);
  const headPivot=new THREE.Group();headPivot.position.y=-.645;object.add(headPivot);
  const head=new THREE.Group();head.scale.setScalar(.8);head.position.y=1.31*.8;headPivot.add(head);
  // Lathed capsule: a broad circular face and a domed, continuous rear shell.
  const profile=[new THREE.Vector2(0,-.88),new THREE.Vector2(.4,-.86),new THREE.Vector2(.8,-.73),new THREE.Vector2(1.12,-.48),new THREE.Vector2(1.3,-.15),new THREE.Vector2(1.34,.18),new THREE.Vector2(1.34,.55),new THREE.Vector2(1.3,.66),new THREE.Vector2(1.25,.69)];
  const housing=solid(new THREE.LatheGeometry(subdivideProfile(profile),192),shell,head);
  housing.rotation.x=Math.PI/2;
  solid(new THREE.CircleGeometry(1.255,192),dark,head,0,0,.694);
  solid(new THREE.TorusGeometry(1.275,.027,24,192),jointMaterial,head,0,0,.696);
  const columns=43, rows=49, pitch=.049;
  const logoCanvas=document.createElement('canvas');
  logoCanvas.width=columns*8;logoCanvas.height=rows*8;
  const logoContext=logoCanvas.getContext('2d');
  const logoScale=(columns-6)*8/460;
  logoContext.translate(24,(rows*8-271*logoScale)/2);
  logoContext.scale(logoScale,logoScale);
  logoContext.fillStyle='#fff';
  logoContext.fill(new Path2D(PHYSICAL_IO_MARK_PATH));
  const mask=logoContext.getImageData(0,0,logoCanvas.width,logoCanvas.height).data;
  const leds=[];
  // One draw call for the dense matrix; individual pixels retain their own brightness.
  const geometry=new RoundedBoxGeometry(.033,.033,.009,2,.006);
  const ledMaterial=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
  const matrix=new THREE.InstancedMesh(geometry,ledMaterial,columns*rows);
  matrix.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const transform=new THREE.Object3D();
  const ledColor=new THREE.Color();
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
    const index=y*columns+x;
    const px=(x-(columns-1)/2)*pitch,py=((rows-1)/2-y)*pitch;
    transform.position.set(px,py,.704);
    const visible=Math.hypot(px,py)<1.19;
    transform.scale.setScalar(visible?1:0);transform.updateMatrix();
    matrix.setMatrixAt(index,transform.matrix);
    const logo=mask[((y*8+4)*logoCanvas.width+x*8+4)*4+3]/255;
    matrix.setColorAt(index,ledColor.setRGB(.001+logo*.38,.001+logo*.13,.001+logo*.008));
    leds.push({index,x,y,logo,brightness:logo*.38});
  }
  head.add(matrix);
  const light = new THREE.PointLight(0xff8a10,0,5);light.position.set(0,0,1.15);head.add(light);
  const key = new THREE.DirectionalLight(0xffffff,3);key.position.set(-3,6,5);scene.add(key);
  key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left=-5;key.shadow.camera.right=5;
  key.shadow.camera.top=5;key.shadow.camera.bottom=-5;
  key.shadow.camera.near=.5;key.shadow.camera.far=20;
  key.shadow.normalBias=.025;key.shadow.bias=-.0001;
  key.shadow.radius=4;key.shadow.blurSamples=8;
  // The support meets the floor exactly, anchoring the silhouette.
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x31332e,opacity:.24}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-1.833;
  floor.receiveShadow=true;scene.add(floor);
  // A circular field of dots on a staggered hex lattice. Their radius and
  // opacity follow the profile of a sphere, strongest beneath Ohi and softly
  // falling away at the edge without a hard texture boundary.
  const floorGridCanvas=document.createElement('canvas');floorGridCanvas.width=1024;floorGridCanvas.height=1024;
  const floorGridContext=floorGridCanvas.getContext('2d');
  const floorGridCenter=floorGridCanvas.width/2;
  const floorGridRadius=456;
  const floorGridSpacing=34;
  const floorGridRowSpacing=floorGridSpacing*Math.sqrt(3)/2;
  for(let row=-18;row<=18;row++)for(let column=-18;column<=18;column++){
    const x=floorGridCenter+column*floorGridSpacing+(Math.abs(row)%2)*floorGridSpacing/2;
    const y=floorGridCenter+row*floorGridRowSpacing;
    const radialDistance=Math.hypot(x-floorGridCenter,y-floorGridCenter);
    if(radialDistance>floorGridRadius)continue;
    const normalizedRadius=radialDistance/floorGridRadius;
    const sphereFalloff=Math.sqrt(Math.max(0,1-normalizedRadius*normalizedRadius));
    const strength=sphereFalloff*sphereFalloff;
    floorGridContext.beginPath();
    floorGridContext.arc(x,y,1.125+3*strength,0,Math.PI*2);
    floorGridContext.fillStyle=`rgba(255,255,255,${strength})`;
    floorGridContext.fill();
  }
  const floorGridTexture=new THREE.CanvasTexture(floorGridCanvas);
  floorGridTexture.colorSpace=THREE.SRGBColorSpace;
  floorGridTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const floorGridMaterial=new THREE.MeshBasicMaterial({map:floorGridTexture,color:0x3f423d,transparent:true,opacity:.62,depthWrite:false,toneMapped:false});
  const floorGrid=new THREE.Mesh(new THREE.PlaneGeometry(9,9),floorGridMaterial);
  floorGrid.rotation.x=-Math.PI/2;floorGrid.position.y=-1.828;floorGrid.renderOrder=1;scene.add(floorGrid);
  // Actual screen-space occlusion, recomputed as the camera orbits.
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
  const composer=new EffectComposer(renderer,target);
  // SSAOPass blends occlusion onto the existing scene colour buffer.
  const beauty=new RenderPass(scene,camera);composer.addPass(beauty);
  const occlusion=new SSAOPass(scene,camera,1,1,16);
  occlusion.kernelRadius=.18;occlusion.minDistance=.002;occlusion.maxDistance=.18;
  composer.addPass(occlusion);
  // Art-directed bokeh; this shader's aperture is not a calibrated f-stop.
  const depthOfField=new BokehPass(scene,camera,{focus:20,aperture:.002,maxblur:.012});
  composer.addPass(depthOfField);
  const screenWorldPosition=new THREE.Vector3();
  const cameraForward=new THREE.Vector3();
  const depthOfFieldReferenceSpan=900;
  // HDR LEDs bloom above the neutral background, before output tone mapping.
  const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.05,.35,1.1);
  composer.addPass(bloom);
  const output=new OutputPass();composer.addPass(output);
  const pose={yaw:0,pitch:0,eyeX:0,eyeY:0,dragging:false};
  const eyeLook={x:0,y:0};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const follow=(event)=>{
    if(pose.dragging)return;
    const bounds=host.getBoundingClientRect();
    const horizontal=THREE.MathUtils.clamp((event.clientX-bounds.left)/bounds.width*2-1,-1,1);
    const vertical=THREE.MathUtils.clamp((event.clientY-bounds.top)/bounds.height*2-1,-1,1);
    pose.yaw=horizontal*.45;pose.pitch=vertical*.18;
    pose.eyeX=horizontal*2.25;pose.eyeY=vertical*1.5;
  };
  const centre=()=>{pose.yaw=0;pose.pitch=0;pose.eyeX=0;pose.eyeY=0;pose.dragging=false;};
  const dragStart=()=>{pose.dragging=true;};
  const dragEnd=()=>{pose.dragging=false;};
  host.addEventListener('pointermove',follow);host.addEventListener('pointerleave',centre);
  host.addEventListener('pointerdown',dragStart);host.addEventListener('pointerup',dragEnd);host.addEventListener('pointercancel',centre);
  const keyboard = (event) => {
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();
    if(event.key==='ArrowLeft')pose.yaw=Math.max(-.45,pose.yaw-.1);
    if(event.key==='ArrowRight')pose.yaw=Math.min(.45,pose.yaw+.1);
    if(event.key==='ArrowUp')pose.pitch=Math.max(-.18,pose.pitch-.06);
    if(event.key==='ArrowDown')pose.pitch=Math.min(.18,pose.pitch+.06);
  };
  host.addEventListener('keydown',keyboard);
  const resize = () => {const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;frameCamera(cameraFocusMode);controls.target.copy(cameraTarget);controls.update();cameraTransitionStart=-1;camera.updateProjectionMatrix();composer.setSize(w,h);};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const expressionCanvas=document.createElement('canvas');expressionCanvas.width=columns;expressionCanvas.height=rows;
  const expressionContext=expressionCanvas.getContext('2d',{willReadFrequently:true});
  let performanceId=-1,performanceStart=0;
  let idleExpression='',idleExpressionUntil=0,nextIdleExpressionAt=0,lastIdleExpression='';
  const idleExpressionChoices=['curious','happy','wink','sleepy'];
  function naturalExpression(performance,ms){
    const resting=signal.idleExpressions!==false&&performance?.display==='face'&&!performance.speaking&&!performance.listening&&['friendly','neutral'].includes(performance.expression);
    if(reduced.matches||!resting){idleExpressionUntil=0;nextIdleExpressionAt=0;return performance?.expression;}
    if(!nextIdleExpressionAt)nextIdleExpressionAt=ms+2800+Math.random()*3200;
    if(ms>=nextIdleExpressionAt){
      const choices=idleExpressionChoices.filter(expression=>expression!==lastIdleExpression);
      idleExpression=choices[Math.floor(Math.random()*choices.length)];lastIdleExpression=idleExpression;
      idleExpressionUntil=ms+650+Math.random()*550;
      nextIdleExpressionAt=idleExpressionUntil+3200+Math.random()*3800;
    }
    return ms<idleExpressionUntil?idleExpression:performance.expression;
  }
  function performancePixels(performance,time,expression=performance?.expression,lookX=0,lookY=0){
    if(!performance||performance.display==='logo')return null;
    const ctx=expressionContext;ctx.clearRect(0,0,columns,rows);ctx.fillStyle='#fff';ctx.strokeStyle='#fff';ctx.lineWidth=2.3;ctx.lineCap='round';
    if(performance.display==='brand'||performance.display==='text'){
      const isIdentity=performance.display==='brand';
      // Keep the static mark for visitors who prefer reduced motion.
      if(isIdentity&&reduced.matches)return null;
      const text=isIdentity?'Love Intelligence + Body':(performance.displayText||'Hello');
      ctx.font='bold 11px Arial';ctx.textBaseline='alphabetic';
      if(isIdentity){
        // Keep scrolling identity lettering at half the logo's ink height.
        const targetHeight=271*logoScale/8*.5;
        const metrics=ctx.measureText(text);
        const inkHeight=metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent;
        ctx.font=`bold ${11*targetHeight/Math.max(1,inkHeight)}px Arial`;
      }
      const metrics=ctx.measureText(text);
      const width=metrics.width;
      const x=isIdentity?columns-(time*15%(width+columns+10)):width<=columns-4?(columns-width)/2:columns-(time*15%(width+columns));
      const baseline=(rows+metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2;
      ctx.fillText(text,x,baseline);
    }else{
      const blink=Math.sin(time*1.2)> .992;
      const eyesY=19+lookY;
      if(expression==='thinking'){
        for(let i=0;i<3;i++){ctx.globalAlpha=.3+.7*(.5+.5*Math.sin(time*4-i));ctx.beginPath();ctx.arc(13+i*8,24,2.3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
      }else{
        const settings=performance.face;
        const spacing=settings?.eyeSpacing??17, eyeSize=settings?.eyeSize??3.5;
        for(const [i,x] of [21.5-spacing/2+lookX,21.5+spacing/2+lookX].entries()){
          ctx.beginPath();
          if(expression==='love'){
            ctx.moveTo(x,eyesY+4);ctx.bezierCurveTo(x-9,eyesY-1,x-4,eyesY-8,x,eyesY-3);ctx.bezierCurveTo(x+4,eyesY-8,x+9,eyesY-1,x,eyesY+4);ctx.fill();
          }else{
            const closed=blink||expression==='sleepy'||(expression==='wink'&&i===1);
            ctx.ellipse(x,eyesY,eyeSize*.77,closed?1:expression==='curious'&&i===1?eyeSize*1.4:eyeSize,0,0,Math.PI*2);ctx.fill();
          }
        }
        ctx.beginPath();
        if(performance.speaking){ctx.ellipse(21.5,32,6,2+Math.abs(Math.sin(time*9))*3,0,0,Math.PI*2);ctx.stroke();}
        else if(expression==='surprised'){ctx.ellipse(21.5,32,3.5,5,0,0,Math.PI*2);ctx.stroke();}
        else if(settings){ctx.moveTo(15,31);ctx.quadraticCurveTo(21.5,31+settings.smile,28,31);ctx.stroke();}
        else if(['wink','love'].includes(expression)){ctx.arc(21.5,28,7,.15,Math.PI-.15);ctx.stroke();}
        else if(expression==='happy'||expression==='friendly'){ctx.arc(21.5,28,7,.15,Math.PI-.15);ctx.stroke();}
        else{ctx.moveTo(17,32);ctx.lineTo(26,32);ctx.stroke();}
        if(performance.listening){ctx.beginPath();ctx.arc(21.5,25,18+Math.sin(time*3),0,Math.PI*2);ctx.stroke();}
      }
    }
    return ctx.getImageData(0,0,columns,rows).data;
  }
  let frame=0;
  let centeredMode=signal.centered;
  function animate(ms=0){
    frame=requestAnimationFrame(animate);
    if(document.hidden)return;
    signal.sample();
    const nextCameraFocusMode=!!signal.headFocused;
    if(centeredMode!==signal.centered){centeredMode=signal.centered;cameraFocusMode=nextCameraFocusMode;cameraTransitionStart=-1;centre();frameCamera(cameraFocusMode);controls.target.copy(cameraTarget);controls.update();}
    else if(cameraFocusMode!==nextCameraFocusMode){
      cameraFocusMode=nextCameraFocusMode;centre();
      if(reduced.matches){cameraTransitionStart=-1;frameCamera(cameraFocusMode);controls.target.copy(cameraTarget);controls.update();}
      else{
        cameraTransitionStart=ms;
        cameraFromPosition.copy(camera.position);cameraFromTarget.copy(controls.target);
        calculateCameraFrame(cameraToPosition,cameraToTarget,cameraFocusMode);
      }
    }
    const settings=signal.environment??defaultEnvironment;
    loadEnvironment(settings);
    bloom.strength=settings.bloom;bloom.radius=settings.bloomRadius;bloom.threshold=settings.bloomThreshold;
    depthOfField.enabled=settings.depthOfField;
    // Bokeh is screen-space, so a fixed value grows softer in pixel terms as
    // the stage expands. Keep it visually stable while preserving the authored
    // depth effect at the smaller, split-chat size.
    const depthOfFieldScale=THREE.MathUtils.clamp(
      depthOfFieldReferenceSpan/Math.max(host.clientWidth,host.clientHeight),
      .4,
      1
    );
    depthOfField.uniforms.aperture.value=settings.aperture*depthOfFieldScale;
    depthOfField.uniforms.maxblur.value=.012*depthOfFieldScale;
    occlusion.enabled=settings.ambientOcclusion;renderer.toneMappingExposure=settings.exposure;
    key.intensity=settings.keyStrength;fill.intensity=settings.fillStrength;
    scene.environmentIntensity=settings.environmentStrength;
    scene.environmentRotation.y=THREE.MathUtils.degToRad(settings.rotation);
    scene.backgroundRotation.y=scene.environmentRotation.y;
    if(signal.dark){backdrop.setRGB(.014,.014,.014);floor.material.color.setHex(0x000000);floor.material.opacity=.3;floorGridMaterial.color.setHex(0xc7cac4);floorGridMaterial.opacity=.46;}
    else{backdrop.setHex(0xffffff);floor.material.color.setHex(0x31332e);floor.material.opacity=.24;floorGridMaterial.color.setHex(0x3f423d);floorGridMaterial.opacity=.62;}
    scene.background=settings.showEnvironment?scene.environment:backdrop;
    const performance=signal.performance;
    if(performance && performance.id!==performanceId){performanceId=performance.id;performanceStart=ms;}
    const elapsed=(ms-performanceStart)/1000;
    const gesture=performance?.gesture;
    const gestureEnvelope=elapsed<2?Math.sin(Math.PI*elapsed/2):0;
    const nod=!reduced.matches&&gesture==='nod'?Math.sin(elapsed*8)*.12*gestureEnvelope:0;
    const shake=!reduced.matches&&gesture==='shake'?Math.sin(elapsed*8)*.2*gestureEnvelope:0;
    const tilt=gesture==='tilt'&&elapsed<4?.12:0;
    const easing=reduced.matches?1:.09;
    headPivot.rotation.y+=(pose.yaw+shake-headPivot.rotation.y)*easing;
    headPivot.rotation.x+=(pose.pitch+nod+(!reduced.matches&&performance?.speaking?Math.sin(ms*.005)*.025:0)-headPivot.rotation.x)*easing;
    headPivot.rotation.z+=(tilt-headPivot.rotation.z)*easing;
    const eyeEasing=reduced.matches?1:.16;
    eyeLook.x+=(pose.eyeX-eyeLook.x)*eyeEasing;eyeLook.y+=(pose.eyeY-eyeLook.y)*eyeEasing;
    const expression=naturalExpression(performance,ms);
    const facePixels=performancePixels(performance,reduced.matches?0:elapsed,expression,eyeLook.x,eyeLook.y);
    for(const led of leds){
      const dx=(led.x-(columns-1)/2)/((columns-1)/2);
      const dy=((rows-1)/2-led.y)/((rows-1)/2);
      const radius=Math.hypot(dx,dy);
      // Frequency bins wrap around a circle. Each bin extends radially from its rim.
      const angle=(Math.atan2(dy,dx)+Math.PI*2)%(Math.PI*2);
      const segment=Math.floor(angle/(Math.PI*2)*48);
      const band=signal.bands[Math.min(signal.bands.length-1,2+segment)]/255 || 0;
      const inner=.23;
      const outer=inner+.04+band*.65;
      const edge=Math.max(0,Math.min(1,(outer-radius)/.045));
      const spoke=radius>=inner && radius<=outer ? edge*(.12+band*.88):0;
      const response=spoke+Math.exp(-Math.pow((radius-inner)/.025,2))*.12;
      const target=signal.depth?signal.depth[led.index]:signal.active?Math.min(1,response):facePixels?facePixels[led.index*4+3]/255*.8*(performance?.face?.brightness??1):led.logo*.38;
      led.brightness+=(target-led.brightness)*(signal.depth?.35:.16);
      const power=led.brightness*8;
      matrix.setColorAt(led.index,ledColor.setRGB(.001+power,.001+power*.34,.001+power*.021));
    }
    matrix.instanceColor.needsUpdate=true;
    light.intensity=signal.active?signal.energy*.7:0;
    if(cameraTransitionStart>=0){
      const progress=THREE.MathUtils.clamp((ms-cameraTransitionStart)/cameraTransitionDuration,0,1);
      const eased=THREE.MathUtils.smoothstep(progress,0,1);
      camera.position.lerpVectors(cameraFromPosition,cameraToPosition,eased);
      controls.target.lerpVectors(cameraFromTarget,cameraToTarget,eased);
      if(progress===1)cameraTransitionStart=-1;
    }
    controls.update();
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    // Keep the depth-of-field plane locked to the LED screen surface through
    // camera reframing, responsive layout changes, orbiting and head motion.
    screenWorldPosition.set(0,0,.704).applyMatrix4(head.matrixWorld);
    camera.getWorldDirection(cameraForward);
    depthOfField.uniforms.focus.value=Math.max(
      camera.near,
      screenWorldPosition.sub(camera.position).dot(cameraForward)
    );
    composer.render();
  }
  frame=requestAnimationFrame(animate);
  return { reset(){cameraTransitionStart=-1;centre();headPivot.rotation.set(0,0,0);frameCamera(cameraFocusMode);controls.target.copy(cameraTarget);controls.update();}, dispose(){disposed=true;mapRequest++;customEnvironment?.dispose();pmrem.dispose();cancelAnimationFrame(frame);host.removeEventListener('keydown',keyboard);host.removeEventListener('pointermove',follow);host.removeEventListener('pointerleave',centre);host.removeEventListener('pointerdown',dragStart);host.removeEventListener('pointerup',dragEnd);host.removeEventListener('pointercancel',centre);observer.disconnect();controls.dispose();const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());beauty.dispose();occlusion.dispose();depthOfField.dispose();bloom.dispose();output.dispose();composer.dispose();key.shadow.dispose();matrix.dispose();floorGridTexture.dispose();etchTexture.dispose();grain.dispose();environment.dispose();renderer.dispose();renderer.domElement.remove();} };
}
