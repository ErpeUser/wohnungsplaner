import assert from 'node:assert/strict';
import test from 'node:test';
import { SHOPPING_ITEMS } from '../app/planner/workspace/shopping-items.ts';
const existingIds = ['kitchen-fridge-60cm','kitchen-oven-60cm','kitchen-induction-hob-60cm','kitchen-hood-60cm','kitchen-sink-60cm','184900692R','184900692G','1005012515662602','601104051124011','601100062257123','607039887632432','800001233737','601099532250952','607246280935328','601100249492431','606121368598635','1005012445521181','1005013379584796','607199740937372','2778003504','2858001801','1634004202','601099691023748','601104781298502','601099526356869','z1-deko-bilder','z1-deko-vorhang','z1-deko-licht','z1-deko-wandregal-set-schminkecke','z1-deko-nische','z1-deko-wandleuchten','z1-deko-schrankboxen','z1-deko-pflanze','z1-deko-textilien','z1-deko-kleinteile','z1-deko-pendelleuchte'];
const item=(id:string)=>{const found=SHOPPING_ITEMS.find(i=>i.id===id);assert.ok(found,id);return found;};
test('preserves every existing shopping article without duplicate identities',()=>{
 for(const id of existingIds)assert.equal(SHOPPING_ITEMS.filter(i=>i.id===id).length,1,id);
 assert.equal(new Set(SHOPPING_ITEMS.map(i=>i.id)).size,SHOPPING_ITEMS.length);
 assert.equal(SHOPPING_ITEMS.length,existingIds.length+5);
 assert.equal(SHOPPING_ITEMS.some(i=>i.id==='606296522765554'),false,'retired Temu chair must not be listed');
 assert.equal(item('1005012445521181').url,'https://de.aliexpress.com/item/1005012445521181.html');
});
test('four hooks cost one supplied pack and describe a single horizontal row',()=>{
 const hooks=item('607039887632432');assert.equal(hooks.price,6.36);assert.equal(hooks.quantity,1);
 assert.match(hooks.dimensions,/nebeneinander/);assert.doesNotMatch(hooks.dimensions,/2.*2 im Plan/);
 assert.match(hooks.url??'',/goods_id=607039887632432&sku_id=118446205486445/);
});
test('paper-holder source price and variant are unchanged',()=>{
 const holder=item('601100249492431');assert.equal(holder.price,9.75);assert.equal(holder.quantity,1);
 assert.match(holder.url??'',/goods_id=601100249492431&sku_id=17595354506975/);
});
test('sink entry follows the corner sink location rather than the microwave',()=>{
 const sink=item('kitchen-sink-60cm');assert.match(sink.amountLabel??'',/115-cm-Eckschrank/);assert.doesNotMatch(sink.amountLabel??'',/unter der Mikrowelle/);
});
test('hall decor records the requested sizes as unpriced design placeholders',()=>{
 const ids=['hall-decor-tejo-print','hall-decor-three-plates','hall-decor-between-doors-print','hall-decor-planter'];
 for(const id of ids){const value=item(id);assert.equal(value.price,null);assert.equal(value.generic,true);assert.equal(value.url,undefined);assert.equal(value.room,'Vorraum');}
 assert.match(item(ids[0]).dimensions,/36.*50/);assert.match(item(ids[1]).dimensions,/18.*14.*11/);assert.match(item(ids[2]).dimensions,/32.*45/);assert.match(item(ids[3]).dimensions,/25 cm/);
});
test('replaces the Chicago shopping item with the specified AliExpress sofa',()=>{
 const sofa=item('1005013379584796');
 assert.equal(sofa.price,437.49);
 assert.equal(sofa.quantity,1);
 assert.match(sofa.dimensions,/142.*90.*86,5.*172.*42.*150/);
 assert.equal(sofa.url,'https://de.aliexpress.com/item/1005013379584796.html');
 assert.equal(sofa.imageUrl,'/planner-assets/products/aliexpress-sofa-1005013379584796.webp');
 assert.equal(SHOPPING_ITEMS.some(entry=>entry.id==='2424010201'),false);
assert.equal(item('1634004202').quantity,4);
 assert.match(item('2858001801').dimensions,/110.*76/);
});
test('includes the exact selected Temu A8447 180 x 250 cm vintage rug',()=>{
 const rug=item('607199740937372');
 assert.equal(rug.room,'Wohnküche');
 assert.equal(rug.price,68.63);
 assert.equal(rug.quantity,1);
 assert.match(rug.dimensions,/180.*250.*850/);
 assert.match(rug.amountLabel??'',/A8447.*106769800014188/);
 assert.match(rug.url??'',/goods_id=607199740937372&sku_id=106769800014188/);
 assert.match(rug.imageUrl??'',/temu-vintage-rug-607199740937372/);
});
test('adds the purchased living room rug to the known-priced subtotal',()=>{
 const total=SHOPPING_ITEMS.reduce((sum,i)=>sum+(i.price??0)*(i.quantity??1),0);
 assert.equal(Math.round(total*100),213180);
 assert.equal(SHOPPING_ITEMS.filter(i=>i.url).length,21);
});
test('adds the 30-piece white-gold marble wall tile set for the bathroom',()=>{
 const tile=item('601100207687761');
 assert.equal(tile.room,'Bad');
 assert.equal(tile.quantity,30);
 assert.match(tile.dimensions,/30 × 60 cm/);
 assert.match(tile.amountLabel??'',/30 Stück/);
 assert.match(tile.url??'',/601100207687761/);
});
