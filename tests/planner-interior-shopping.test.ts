import assert from 'node:assert/strict';
import test from 'node:test';
import { SHOPPING_ITEMS } from '../app/planner/workspace/shopping-items.ts';
const existingIds = ['kitchen-fridge-60cm','kitchen-oven-60cm','kitchen-induction-hob-60cm','kitchen-hood-60cm','kitchen-sink-60cm','184900692R','184900692G','1005012515662602','601104051124011','601100062257123','607039887632432','800001233737','601099532250952','607246280935328','601100249492431','606121368598635','606296522765554','2424010201','2778003504','2858001801','1634004202','601099691023748','601104781298502','601099526356869','z1-deko-bilder','z1-deko-vorhang','z1-deko-licht','z1-deko-wandregal-set-schminkecke','z1-deko-nische','z1-deko-wandleuchten','z1-deko-schrankboxen','z1-deko-pflanze','z1-deko-textilien','z1-deko-kleinteile','z1-deko-pendelleuchte'];
const item=(id:string)=>{const found=SHOPPING_ITEMS.find(i=>i.id===id);assert.ok(found,id);return found;};
test('preserves every existing shopping article without duplicate identities',()=>{
 for(const id of existingIds)assert.equal(SHOPPING_ITEMS.filter(i=>i.id===id).length,1,id);
 assert.equal(new Set(SHOPPING_ITEMS.map(i=>i.id)).size,SHOPPING_ITEMS.length);
 assert.equal(SHOPPING_ITEMS.length,existingIds.length+4);
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
test('keeps sofa, three Kaleo chairs and the round Bozan table unchanged',()=>{
 assert.equal(item('2424010201').price,899);assert.equal(item('1634004202').quantity,3);
 assert.match(item('2858001801').dimensions,/110.*76/);
});
test('unpriced hall additions do not change the existing priced subtotal',()=>{
 const total=SHOPPING_ITEMS.reduce((sum,i)=>sum+(i.price??0)*(i.quantity??1),0);
 assert.equal(Math.round(total*100),246876);
 assert.equal(SHOPPING_ITEMS.filter(i=>i.url).length,19);
});
