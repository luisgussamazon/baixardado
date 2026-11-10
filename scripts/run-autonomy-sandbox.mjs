import {validateInSandbox} from './autonomy-sandbox.mjs';
try{await validateInSandbox(process.cwd(),process.cwd());console.log('Testes, typecheck e build aprovados sem rede ou credenciais.');}
catch{console.error('Validação isolada falhou. Nenhuma publicação.');process.exitCode=1;}
