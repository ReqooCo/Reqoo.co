[Setup]
AppId=co.reqoo.studio3d
AppName=Reqoo 3D Studio
AppVersion=1.4.2
AppPublisher=Reqoo
DefaultDirName={localappdata}\Programs\Reqoo 3D Studio
DefaultGroupName=Reqoo 3D Studio
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir=..\release
OutputBaseFilename=Reqoo-3D-Studio-1.4.2-Setup-x64
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\Reqoo 3D Studio.exe
CreateUninstallRegKey=not IsExtractOnly
CloseApplications=yes
DisableProgramGroupPage=yes

[Tasks]
Name: desktopicon; Description: "Cipta pintasan di Desktop"; Flags: unchecked

[Files]
Source: "..\release\1.4.2\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Reqoo 3D Studio"; Filename: "{app}\Reqoo 3D Studio.exe"; Check: not IsExtractOnly
Name: "{autodesktop}\Reqoo 3D Studio"; Filename: "{app}\Reqoo 3D Studio.exe"; Tasks: desktopicon; Check: not IsExtractOnly

[Run]
Filename: "{app}\Reqoo 3D Studio.exe"; Description: "Buka Reqoo 3D Studio"; Flags: nowait postinstall skipifsilent

[Code]
// Optional extraction mode is useful on restricted PCs and for package validation.
function IsExtractOnly: Boolean;
begin
  Result := ExpandConstant('{param:extractonly|0}') = '1';
end;
