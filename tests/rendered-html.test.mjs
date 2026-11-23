import assert from "node:assert/strict";
import test, { after } from "node:test";
import { startProductionServer } from "./support/local-production-server.mjs";

let serverPromise;
async function render(path="/"){
  serverPromise ??= startProductionServer();
  const server=await serverPromise;
  return server.fetch(path,{headers:{accept:"text/html"}});
}
after(async()=>{
  if(serverPromise)await (await serverPromise).stop();
});

test("the offline production server renders the planner root",async()=>{
  const response=await render();
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/<html lang="de">/);
  assert.match(html,/Raumplaner/);
  assert.match(html,/2D-Ansicht/);
  assert.match(html,/Export &amp; Import/);
  // The public starter scene omits Zimmer 1, the dedicated 3D verification
  // room. The canonical document and exports retain its official area.
  assert.match(html,/47,13/);
  assert.match(html,/WNF/);
});

test("the offline HTML excludes private sources and removed studies",async()=>{
  const html=await(await render()).text();
  assert.doesNotMatch(html,/room-studies|bero-varianten|C:\\Users|file:\/\//i);
});
