// Shared Vite/Vitest package resolver for the disposable sibling workspace.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dependencyRoot=path.resolve(projectRoot,'..','Wohnungsplaner_Generated','dependencies','node_modules');
const virtualImporter=path.resolve(dependencyRoot,'..','_resolver.mjs').replaceAll('\\','/');
export const tailwindCssAlias={
  find:/^tailwindcss$/,
  replacement:path.join(dependencyRoot,'tailwindcss','index.css').replaceAll('\\','/'),
};
export function createGeneratedResolver(){
  return {
    name:'generated-package-root-resolver',
    enforce:'post',
    async resolveId(source){
      if(source.startsWith('.')||source.startsWith('/')||source.startsWith('node:')||
         source.startsWith('\0')||/^[a-z]+:/i.test(source))return null;
      return this.resolve(source,virtualImporter,{skipSelf:true});
    },
  };
}
