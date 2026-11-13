import fs from 'node:fs/promises';
import {zipSync,strToU8} from 'fflate';

// Fixed public extension files only. Never package the workspace or credentials.
export async function packageWorkspaceExtension(){
 const root=new URL('../extensions/a3x-workspace/',import.meta.url);
 const files=['package.json','extension.cjs','workspace.cjs','README.md'];
 const entries={};
 for(const file of files)entries['extension/'+file]=strToU8(await fs.readFile(new URL(file,root),'utf8'));
 const manifest=JSON.parse(await fs.readFile(new URL('package.json',root),'utf8'));
 entries['[Content_Types].xml']=strToU8('<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="json" ContentType="application/json"/><Default Extension="cjs" ContentType="application/javascript"/><Default Extension="md" ContentType="text/markdown"/><Default Extension="vsixmanifest" ContentType="text/xml"/></Types>');
 entries['extension.vsixmanifest']=strToU8(`<?xml version="1.0" encoding="utf-8"?><PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011"><Metadata><Identity Language="en-US" Id="a3x-workspace" Version="${manifest.version}" Publisher="a3x-tech"/><DisplayName>A3X Workspace</DisplayName><Description xml:space="preserve">Workspace autorizado A3X</Description><Tags>workspace</Tags><Categories>Other</Categories><GalleryFlags>Public</GalleryFlags><Properties><Property Id="Microsoft.VisualStudio.Code.Engine" Value="${manifest.engines.vscode}"/><Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value=""/><Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value=""/><Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace"/></Properties></Metadata><Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation><Dependencies/><Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/></Assets></PackageManifest>`);
 return zipSync(entries);
}
if(process.argv[1]&&new URL('file:///'+process.argv[1].replaceAll('\\','/')).pathname.endsWith('/package-workspace-extension.mjs')){
 await fs.mkdir(new URL('../public/',import.meta.url),{recursive:true});
 await fs.writeFile(new URL('../public/a3x-workspace.vsix',import.meta.url),await packageWorkspaceExtension());
 console.log('Extensão VS Code A3X empacotada sem dependências externas.');
}
