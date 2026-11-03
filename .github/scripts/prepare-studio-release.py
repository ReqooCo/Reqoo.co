from pathlib import Path
import shutil,json
root=Path.cwd()
dest=root/'3d-studio'
dest.mkdir(exist_ok=True)
for p in (root/'.studio-release/web').iterdir():
 target=dest/p.name
 if p.is_dir():shutil.copytree(p,target,dirs_exist_ok=True)
 else:shutil.copyfile(p,target)
redirect=root/'3d-lamp-studio/index.html'
redirect.write_text('<!doctype html><html lang="ms"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/3d-studio/?generator=lamp"><title>Reqoo 3D Studio</title><a href="/3d-studio/?generator=lamp">Buka Reqoo 3D Studio</a></html>',encoding='utf-8')
p=root/'apps/index.html';s=p.read_text(encoding='utf-8').replace('href="/3d-lamp-studio/"','href="/3d-studio/"').replace('Reqoo 3D Lamp Studio','Reqoo 3D Studio').replace('Reka bentuk lampu, preview nozzle dan sampel G-code P2S 0.8 mm.','Keychain, nametag, QR, signage, LED dan Lamp Studio baharu.')
p.write_text(s,encoding='utf-8')
p=root/'shared/ecosystem.json';data=json.loads(p.read_text(encoding='utf-8'))
for g in data.get('groups',[]):
 for a in g.get('apps',[]):
  if a.get('path')=='/3d-lamp-studio/':a.update(name='Reqoo 3D Studio',path='/3d-studio/',status='Desktop + web')
p.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
ignore=root/'.assetsignore';s=ignore.read_text(encoding='utf-8') if ignore.exists() else ''
for line in ['studio-source/','studio-build/','.studio-release/','.github/']:
 if line not in s:s+='\n'+line
ignore.write_text(s+'\n',encoding='utf-8')
print('Verified web assets staged; build/source folders excluded from hosting.')
