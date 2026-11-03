from pathlib import Path
from zipfile import ZipFile
import subprocess,sys,hashlib
root=Path(__file__).resolve().parent.parent;dest=root/'studio-source';dest.mkdir(exist_ok=True)
archive=root/'studio-build/baseline-v1.3.0.zip'
expected=(root/'studio-build/baseline.sha256').read_text().strip()
assert hashlib.sha256(archive.read_bytes()).hexdigest()==expected,'Released source archive integrity failed'
prefix='work/source/reqoo-3d-studio/'
with ZipFile(archive) as z:
 for name in z.namelist():
  if not name.startswith(prefix) or name.endswith('/'):continue
  relative=Path(name[len(prefix):]);target=(dest/relative).resolve()
  if not target.is_relative_to(dest.resolve()):raise RuntimeError('Archive path outside source')
  # Retired automotive photo pack and legacy cloud/updater drafts are not runtime dependencies.
  if relative.parts[0] in ['.github','src-tauri','infrastructure'] or str(relative).replace('\\','/')=='assets/car-photo-library.json':continue
  target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(name))
subprocess.run([sys.executable,str(root/'studio-build/apply-integration.py'),str(dest),str(root/'studio-build/overrides')],check=True)
