import json,re,shutil,sys
from pathlib import Path

project=Path(sys.argv[1]);overrides=Path(sys.argv[2])
for f in overrides.rglob('*'):
 if f.is_file():
  dest=project/f.relative_to(overrides);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(f,dest)
def edit(path,fn):
 p=project/path;s=p.read_text(encoding='utf-8-sig');p.write_text(fn(s),encoding='utf-8')

def registry(s):
 start=s.index('export const LAMP_MODES=');end=s.index('export const GENERATOR_CATEGORIES=',start)
 modes="""export const LAMP_MODES=Object.freeze([
 mode('drum','Silinder','Cylinder','lamp'),mode('cone','Kon terbuka','Open cone','lamp'),
 mode('vase','Pasu berperut','Bulbous vase','lamp'),mode('hourglass','Jam pasir','Hourglass','lamp'),
 mode('twist','Bintang berpintal','Twisted star','lamp'),mode('square','Petak lembut','Rounded square','lamp'),
 mode('lantern','Tanglung petak bertingkat','Tiered square lantern','lamp')
]);
"""
 return s[:start]+modes+s[end:]
edit('src/generator-registry.js',registry)

def geometry(s):
 s="import {lampEnvelope} from './lamp-envelope.js';\nimport {studioParameters,STUDIO_DEFAULTS} from './lamp-core.js';\n"+s
 s=s.replace("source:'bambu',shape:'lantern'","...STUDIO_DEFAULTS,studioVersion:2,source:'bambu',shape:'lantern'")
 s=s.replace('export function lampGeometry(input){','function legacyLampGeometry(input){')
 s+='''
export function lampGeometry(input){
 const supplied={...LAMP_DEFAULTS,...input};if(input.middleDiameter===undefined)delete supplied.middleDiameter;const p=studioParameters(supplied),support=legacyLampGeometry({...p,shape:'drum',ripple:0,twist:0,ribs:4,topDiameter:p.diameter});
 try{const shade=lampEnvelope(p),minimum=shade.userData.minimumInteriorRadius;
 if(p.source==='strip'&&p.postDiameter/2+p.stripHeight+5>minimum){shade.dispose();throw Error('Besarkan bukaan atau kecilkan tiang LED.');}
 if(p.source==='e27'&&(minimum<p.bulbDiameter/2+p.bulbGap||p.height<p.bulbHeight+p.bulbGap+3)){shade.dispose();throw Error('Ruang mentol tidak cukup untuk bentuk ini.');}
 support.shade.dispose();support.shade=shade;support.parameters=p;
 if(p.bottomMode==='closed')support.assemblyZ=p.baseHeight;
 return support;
 }catch(e){support.base.dispose();support.shade.dispose();throw e;}
}
'''
 return s
edit('src/lamp-geometry.js',geometry)
edit('src/solid-worker.js',lambda s:re.sub(r"import \{SCULPTURAL_LAMPS,sculpturalLamp\} from './lamp-patterns.js';\s*",'',s).replace("SCULPTURAL_LAMPS.includes(data.parameters.shape)?await sculpturalLamp(data.parameters):lampGeometry(data.parameters)","lampGeometry(data.parameters)"))

def ui(s):
 s="import {installLampNozzlePreview} from './lamp-nozzle-preview.js';\n"+s
 s=s.replace('export function installLamps({group,products,editor,add,choose,refresh,status})','export function installLamps({group,products,editor,add,choose,refresh,status,scene})')
 s=s.replace("['diameter','Diameter bawah (mm)',50,240]","['middleDiameter','Lebar tengah (mm)',30,240],['tiers','Bilangan tingkat',2,6],['bulge','Kembung tingkat (%)',5,40],['ribDepth','Timbul rusuk (mm)',0,3],['bottomThickness','Tebal tapak tertutup (mm)',.8,6],['pathAmplitude','Naik-turun nozzle Z (mm)',0,3],['pathWaves','Gelombang / pusingan',4,28],['pathPitch','Kenaikan nozzle / pusingan',.2,5],['diameter','Diameter bawah (mm)',50,240]")
 s=s.replace("['ribs','Bilangan alur',4,48]","['ribs','Bilangan rusuk',4,96]").replace("['twist','Pintal (°)',-90,90]","['twist','Pintal (°)',-180,180]")
 s=s.replace("${k==='ribs'?1:.1}","${['ribs','tiers','pathWaves'].includes(k)?1:.1}")
 s=s.replace('let lampId=null;', 'let lampId=null,lastStudioShape=null;')
 s=s.replace('function sync(){', "function sync(){const studioShape=$('lampShape').value,existing=editor.getSelectedMeshes().some(m=>m.userData.lamp?.parameters?.shape===studioShape);if(studioShape!==lastStudioShape&&!existing){const base=Number($('lamp_diameter').value),top=Number($('lamp_topDiameter').value);$('lamp_middleDiameter').value=studioShape==='hourglass'?Math.min(base,top)*.6:Math.max(base,top)*1.15;}lastStudioShape=studioShape;")
 s=s.replace("$('lamp_'+k).value=p[k]","$('lamp_'+k).value=p[k]??LAMP_DEFAULTS[k]")
 s=s.replace("const p={source:$('lampSource').value,shape:$('lampShape').value","const p={studioVersion:2,bottomMode:$('lampBottomMode').value,pathPattern:$('lampPathPattern').value,source:$('lampSource').value,shape:$('lampShape').value")
 marker="$('lampShape').replaceChildren(...LAMP_MODES.map(m=>new Option(m.bm,m.id)));"
 s=s.replace(marker,marker+"\nconst choices=document.createElement('div');choices.innerHTML='<label>Bahagian bawah shade</label><select id=\"lampBottomMode\"><option value=\"open\">Terbuka — dudukan lampu</option><option value=\"closed\">Tertutup — pasu / bekas</option></select><label>Laluan nozzle (preview)</label><select id=\"lampPathPattern\"><option value=\"spiral\">Spiral biasa</option><option value=\"wave\">Gelombang sejajar</option><option value=\"shift\">Gelombang berselang</option></select>';$('lampDimensions').before(choices);\n")
 # Actual live sliders paired with the existing numeric values; preserve IDs used by saved projects.
 after="$('lampDimensions').append(cell)}"
 s=s.replace(after,"$('lampDimensions').append(cell);const number=cell.querySelector('input'),slider=document.createElement('input');slider.type='range';slider.min=min;slider.max=max;slider.step=number.step;slider.value=number.value;slider.setAttribute('aria-label',label+' slider');slider.oninput=()=>{number.value=slider.value;number.dispatchEvent(new Event('change',{bubbles:true}))};number.addEventListener('change',()=>{slider.value=number.value});cell.append(slider)}")
 # Source-compatible old projects keep their stored mesh; regeneration is always explicit.
 s=s.replace("$('lampShape').value=p.shape;","$('lampShape').value=LAMP_MODES.some(m=>m.id===p.shape)?p.shape:'lantern';$('lampBottomMode').value=p.bottomMode||'open';$('lampPathPattern').value=p.pathPattern||'spiral';")
 s=s.replace("if(window.__reqoo)Object.assign(window.__reqoo,{lampGeometry,organicGeometry});","installLampNozzlePreview({scene,group,products,editor,status});if(window.__reqoo)Object.assign(window.__reqoo,{lampGeometry,organicGeometry});")
 return s
edit('src/lamp-studio.js',ui)
edit('src/main.js',lambda s:"import './web-platform.js';\nimport './combined-studio.css';\n"+s.replace('installLamps({group,products,editor,add,choose,refresh,status})','installLamps({group,products,editor,add,choose,refresh,status,scene})')+"\nif(new URLSearchParams(location.search).get('generator')==='lamp')products.selectGenerator('lamp','lantern');\n")
edit('src/generator-studio.js',lambda s:s.replace("read('reqoo-app-theme','graphite')","read('reqoo-app-theme','classic')").replace("if(value.lamp){","if(value.lamp){if($('lampBottomMode'))$('lampBottomMode').value=value.lamp.parameters.bottomMode||'open';if($('lampPathPattern'))$('lampPathPattern').value=value.lamp.parameters.pathPattern||'spiral';"))

package=json.loads((project/'package.json').read_text(encoding='utf-8-sig'));package['version']='1.4.0';package['overrides']={**package.get('overrides',{}),'temp':'0.9.4','fflate':'0.8.3'};package['build']['directories']['output']='release/1.4.0';package['build']['files']=[s.replace('PANDUAN-v1.3.0','PANDUAN-v1.4.0') for s in package['build']['files']]
for item in package['build'].get('extraFiles',[]):
 if isinstance(item,dict):
  for k in ['from','to']:
   if k in item:item[k]=item[k].replace('PANDUAN-v1.3.0','PANDUAN-v1.4.0')
(project/'package.json').write_text(json.dumps(package,indent=2)+'\n')
lock=json.loads((project/'package-lock.json').read_text(encoding='utf-8-sig'));lock['version']='1.4.0';lock.get('packages',{}).get('',{})['version']='1.4.0';(project/'package-lock.json').write_text(json.dumps(lock,indent=2)+'\n')
edit('desktop/main.cjs',lambda s:s.replace(r'json|stl|3mf|svg|zip|csv',r'json|stl|3mf|svg|zip|csv|gcode'))
guide=(project/'desktop/PANDUAN-v1.3.0.txt').read_text(encoding='utf-8-sig');(project/'desktop/PANDUAN-v1.4.0.txt').write_text(guide+'\n\n1.4.0: Lamp Studio baharu berkongsi kod web/desktop. Tujuh bentuk, slider, preview nozzle, eksport sampel tetap P2S 0.8 PETG. Coral / Fold dan bentuk eksperimen dikeluarkan. STL ialah cangkerang reka bentuk, bukan jejak filament. Tetapan custom belum dieksport sebagai G-code.\n',encoding='utf-8')
edit('desktop/installer.iss',lambda s:s.replace('1.3.0','1.4.0').replace('SetupArchitecture=x64\n','').replace(r'OutputDir=..\..\..\..\outputs',r'OutputDir=..\release').replace(r'Source: "..\..\..\..\release\1.4.0\win-unpacked\*"',r'Source: "..\release\1.4.0\win-unpacked\*"'))
# Make the original bundled open fonts available to the web build too.
fontDir=project/'public-core/fonts';fontDir.mkdir(parents=True,exist_ok=True);fontIndex=[]
for f in sorted((project/'desktop/fonts').glob('*.ttf')):shutil.copyfile(f,fontDir/f.name);fontIndex.append({'id':f.name,'label':f.stem.replace('-',' ').title()})
(fontDir/'index.json').write_text(json.dumps(fontIndex))
shutil.copyfile(project/'desktop/FONT-LICENSES.txt',fontDir/'LICENSES.txt')
edit('README.md',lambda s:'# Reqoo 3D Studio 1.4.0 — shared web and desktop\n\nBuilt and tested in GitHub Actions. The released v1.3.0 non-lamp generators remain; experimental Coral, Fold and related lamp generators are retired. Lamp Studio provides seven parametric mesh shapes, sliders and illustrative nozzle motion. STL/3MF export the model envelope; direct G-code export is currently the fixed P2S 0.8 mm PETG test specimen only. Physical printing and lamp hardware fit remain unverified.\n\nHistorical baseline notes follow:\n\n'+s)
print('Integration applied to',project)
