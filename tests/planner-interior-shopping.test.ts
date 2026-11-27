import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_APARTMENT_DOCUMENT } from '../app/planner/domain/apartment-v3.ts';
import { refineRoomLayout } from '../app/planner/domain/room-refinement.ts';
import { SHOPPING_ITEMS, shoppingSubtotal, shoppingItemsForDocument, shoppingItemsForSelection, shoppingSubtotalForDocument } from '../app/planner/workspace/shopping-items.ts';
const existingIds = ['kitchen-fridge-60cm','kitchen-oven-60cm','kitchen-induction-hob-60cm','kitchen-hood-60cm','kitchen-sink-60cm','184900692R','184900692G','1005012515662602','601104051124011','601100062257123','1005013057225398','800001233737','601099532250952','607246280935328','1005013624521211','1005013137520536-wc','1005013137520536-bad','1005012445521181','1005013379584796','607199740937372','2778003504','2858001801','1634004202','601099691023748','601104781298502','601099526356869','z1-deko-bilder','607229268836803','z1-deko-vorhang','z1-deko-licht','001555006211','007326000308','z1-deko-nische','z1-deko-wandleuchten','z1-deko-schrankboxen','z1-deko-pflanze','z1-deko-textilien','z1-deko-kleinteile','z1-deko-pendelleuchte','001787045908','800000829847'];
const item=(id:string)=>{const found=SHOPPING_ITEMS.find(i=>i.id===id);assert.ok(found,id);return found;};
test('preserves every existing shopping article without duplicate identities',()=>{
 for(const id of existingIds)assert.equal(SHOPPING_ITEMS.filter(i=>i.id===id).length,1,id);
 assert.equal(new Set(SHOPPING_ITEMS.map(i=>i.id)).size,SHOPPING_ITEMS.length);
 assert.equal(SHOPPING_ITEMS.length,existingIds.length+15);
 assert.equal(SHOPPING_ITEMS.some(i=>i.id==='606296522765554'),false,'retired Temu chair must not be listed');
 assert.equal(item('1005012445521181').url,'https://de.aliexpress.com/item/1005012445521181.html');
});
test('four hooks cost one supplied pack and describe a single horizontal row',()=>{
 const hooks=item('1005013057225398');assert.equal(hooks.price,6.62);assert.equal(hooks.quantity,1);assert.equal(hooks.retailer,'Temu');assert.equal(hooks.room,'Bad');
 assert.match(hooks.dimensions,/nebeneinander/);assert.doesNotMatch(hooks.dimensions,/2.*2 im Plan/);
 assert.equal(hooks.url,'https://www.temu.com/goods.html?_bg_fs=1&goods_id=605788240242234&sku_id=89972719804189&_oak_page_source=501');
 assert.match(hooks.amountLabel??'',/4PCS.*Style2.*6,62/);
 assert.match(hooks.imageUrl??'',/aliexpress-bath-hooks-1005013057225398-style2\.jpg$/);
 assert.equal(SHOPPING_ITEMS.some(i=>i.id==='607039887632432'),false);
 const hook=DEFAULT_APARTMENT_DOCUMENT.builtIns.find(i=>i.id==='builtin-bath-towel-hook-rail')!;
 assert.equal(shoppingItemsForSelection(DEFAULT_APARTMENT_DOCUMENT,hook)[0].id,'1005013057225398');
});
test('selected darker two-shelf WC holder has the supplied AliExpress link, dimensions and price',()=>{
 const holder=item('1005013624521211');assert.equal(holder.price,12.21);assert.equal(holder.quantity,1);
 assert.equal(holder.retailer,'AliExpress');
 assert.equal(holder.url,'https://de.aliexpress.com/item/1005013624521211.html');
 assert.match(holder.imageUrl??'',/aliexpress-wc-paper-holder-1005013624521211\.svg$/);
 assert.match(holder.dimensions,/16,99 × 13,97 cm.*14,98 cm.*9,39 cm/);
 assert.equal(SHOPPING_ITEMS.some(i=>i.id==='601100249492431'),false,'previous Temu selection is replaced, not counted twice');
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
 const total=shoppingSubtotal;
 assert.equal(Math.round(total*100),217876);
 assert.equal(SHOPPING_ITEMS.filter(i=>i.url).length,38);
});
test('adds the 30-piece white-gold marble wall tile set for the bathroom',()=>{
 const tile=item('601100207687761');
 assert.equal(tile.room,'Bad');
 assert.equal(tile.quantity,30);
 assert.match(tile.dimensions,/30 × 60 cm/);
 assert.match(tile.amountLabel??'',/30 Stück/);
 assert.match(tile.url??'',/601100207687761/);
});

test('adds the AliExpress WOLTU nightstand while retaining the former catalog model',()=>{
 const itemEntry=item('1005012793801128');
 assert.equal(itemEntry.room,'Zimmer 1');
 assert.equal(itemEntry.quantity,1);
 assert.equal(itemEntry.price,60.31);
 assert.match(itemEntry.dimensions,/39,6.*30.*60,4/);
 assert.match(itemEntry.url??'',/1005012793801128/);
});
test('adds the 20-piece Temu onyx wall tile set for the WC rear wall',()=>{
 const tile=item('601099584128261');
 assert.equal(tile.room,'WC');
 assert.equal(tile.quantity,20);
 assert.match(tile.dimensions,/30 × 60 cm/);
 assert.match(tile.amountLabel??'',/20 Stück.*mittlere WC-Rückwand/);
 assert.match(tile.url??'',/601099584128261/);
});

test('lists the selected 80 cm Artisan oak wallboard exactly once in the WC',()=>{
  const shelf=item('007326000408');
  assert.equal(shelf.room,'WC');
  assert.equal(shelf.retailer,'Möbelix');
  assert.equal(shelf.quantity,1);
  assert.equal(shelf.price,14.99);
  assert.match(shelf.dimensions,/80.*3,8.*23,5/);
  assert.match(shelf.dimensions,/Artisan/);
  assert.equal(shelf.url,'https://www.moebelix.at/p/wandboard-simple-b-80-cm-eiche-artisan-dekor-007326000408');
  assert.equal(SHOPPING_ITEMS.filter(i=>i.id===shelf.id).length,1);
});

test('lists WOLTU Chenille as four primary chairs in two unpriced two-packs, with Kaleo as budget-excluded backup',()=>{
 const woltu=item('1005013095870024');
 assert.equal(woltu.room,'Wohnküche');
 assert.equal(woltu.quantity,2);
 assert.equal(woltu.price,null);
 assert.equal(woltu.alternative,undefined);
 assert.equal(woltu.url,'https://de.aliexpress.com/item/1005013095870024.html');
 assert.match(woltu.amountLabel??'',/2er-Set = 4/);
 assert.match(woltu.dimensions,/Planungsmaß/);
 const backup=item('1634004202');
 assert.equal(backup.alternative,true);
 assert.equal(backup.quantity,4);
 assert.equal(backup.price,55.92);
 assert.equal(Math.round(shoppingSubtotal * 100),217876);
});

test('uses the requested Universal TEJO link without changing the existing furniture or its historical budget value',()=>{
 const garderobe=item('2778003504');
 assert.equal(garderobe.url,'https://www.universal.at/p/AKLBB1960169298?sku=4744664566-0-1960169298&nav-c=112013');
 assert.equal(garderobe.retailer,'Universal');
 assert.equal(garderobe.name,'Garderobe Tejo Beige/Kaschmir');
 assert.equal(garderobe.price,399.2);
});

test('uses two Möbelix SIMPLE boards and one Wotan SKATE instead of an unpriced shelf placeholder',()=>{
  const skate=item('001555006211');
  assert.equal(skate.room,'Zimmer 1');
  assert.equal(skate.retailer,'Möbelix');
  assert.equal(skate.quantity,1);
  assert.equal(skate.price,9.99);
  assert.match(skate.dimensions,/120 × 1,8 × 20 cm/);
  assert.match(skate.dimensions,/Wotan/);
  assert.match(skate.amountLabel??'',/Befestigungsmaterial/);
  assert.equal(skate.url,'https://www.moebelix.at/p/wandboard-skate-b-120cm-wotan-eiche-dekor-001555006211');
  const simple=item('007326000308');
  assert.equal(simple.room,'Zimmer 1');
  assert.equal(simple.retailer,'Möbelix');
  assert.equal(simple.quantity,2);
  assert.equal(simple.price,6.99);
  assert.match(simple.dimensions,/23,5 × 3,8 × 23,5/);
  assert.match(simple.dimensions,/Artisan/);
  assert.equal(simple.url,'https://www.moebelix.at/p/wandboard-simple-007326000308');
  assert.equal(SHOPPING_ITEMS.some(i=>i.id==='z1-deko-wandregal-set-schminkecke'),false);
  assert.equal(item('007326000408').room,'WC','the distinct 80 cm WC wallboard remains');
});

test("replaces Temu set with both AliExpress variants and user prices",()=>{
  for(const [id,room,size,price] of [["1005013137520536-wc","WC","61 × 92 cm",21.84],["1005013137520536-bad","Bad","61 × 122 cm",27.20]] as const){const rug=item(id);assert.equal(rug.room,room);assert.ok(rug.dimensions.includes(size));assert.equal(rug.price,price);assert.equal(rug.quantity,1);assert.equal(rug.url,"https://de.aliexpress.com/item/1005013137520536.html");}
  assert.equal(SHOPPING_ITEMS.some(i=>i.id==="606121368598635"),false);
});

test('includes the two source-linked existing bedroom products without adding replacement purchases',()=>{
 const document=DEFAULT_APARTMENT_DOCUMENT;
 for(const [placementId,id,link] of [
   ['zimmer1-wardrobe','001787045908','https://www.moebelix.at/p/mid-you-drehtuerenschrank-mit-spiegel-laden-225cm-fly-weiss-graphit-001787045908'],
   ['zimmer1-desk','800000829847','https://www.xxxlutz.at/p/vicco-schminktisch-sherry-weiss-gold-120-cm-mit-led-spiegel-800000829847']
 ]){
   const placement=document.placements.find(p=>p.id===placementId)!;
   const entries=shoppingItemsForSelection(document,placement);
   assert.equal(entries.length,1);
   assert.equal(entries[0].id,id);assert.equal(entries[0].url,link);assert.equal(entries[0].room,'Zimmer 1');
   assert.equal(entries[0].existing,true);assert.equal(entries[0].price,null);
   assert.equal(shoppingItemsForDocument(document).filter(i=>i.id===id).length,1);
 }
 assert.equal(shoppingSubtotalForDocument(document),2178.76);
});

test('a selected catalogue alternative with a product link is visible once in its room and in the properties',()=>{
 const document=structuredClone(DEFAULT_APARTMENT_DOCUMENT);
 const chairs=document.placements.filter(p=>p.id.startsWith('living-kaleo-chair-'));
 for(const chair of chairs.slice(0,2))chair.catalogId='chair-temu-faux-leather-metal';
 const entries=shoppingItemsForSelection(document,chairs[0]);
 assert.equal(entries.length,1);
 const [entry]=entries;
 assert.match(entry.url??'',/goods_id=601105793166093/);
 assert.equal(entry.reference,true);assert.equal(entry.price,null);assert.equal(entry.room,'Wohnküche');
 assert.equal(entry.quantity,2);
 assert.equal(shoppingItemsForDocument(document).filter(i=>i.id===entry.id).length,1);
 assert.equal(shoppingItemsForSelection(document,chairs[1])[0].id,entry.id);
 assert.equal(shoppingSubtotalForDocument(document),2178.76);
 assert.ok(!shoppingItemsForDocument(DEFAULT_APARTMENT_DOCUMENT).some(i=>i.id===entry.id));
});

test('the woven hall decoration is one selected purchase, old entries remain archived',()=>{
 const product=item('607596656326590');assert.equal(product.quantity,1);assert.equal(product.price,24.7);assert.equal(product.retailer,'Temu');assert.match(product.url??'',/goods_id=607596656326590&sku_id=107311636987647/);
 const doc=refineRoomLayout(DEFAULT_APARTMENT_DOCUMENT),active=shoppingItemsForDocument(doc);
 assert.equal(active.filter(i=>i.id===product.id).length,1);
 for(const id of ['hall-decor-tejo-print','hall-decor-three-plates','hall-decor-between-doors-print','hall-decor-planter']){assert.ok(SHOPPING_ITEMS.some(i=>i.id===id));assert.ok(!active.some(i=>i.id===id));}
 const baskets=doc.builtIns.filter(i=>i.catalogId?.startsWith('hall-woven-basket-'));assert.equal(baskets.length,10);
 for(const basket of baskets)assert.deepEqual(shoppingItemsForSelection(doc,basket).map(i=>i.id),[product.id]);
});

test('both selected wooden hall vases have exact SKU, unit price, separate selection and user dimensions',()=>{
 const doc=refineRoomLayout(DEFAULT_APARTMENT_DOCUMENT);
 const active=shoppingItemsForDocument(doc);
 const variants=[['light','12000049222509307',8.45],['brown','12000049222509306',8.34]] as const;
 for(const [finish,sku,price] of variants){
   const id='1005009477769018-'+sku;
   const product=item(id);
   assert.equal(product.price,price);assert.equal(product.quantity,1);assert.equal(product.room,'Vorraum');
   assert.match(product.dimensions,/7 × 30 cm/);
   assert.equal(product.url,'https://www.aliexpress.com/item/1005009477769018.html?sku_id='+sku);
   assert.equal(active.filter(i=>i.id===id).length,1);
   const placement=doc.builtIns.find(i=>i.id==='builtin-hall-wall-vase-'+finish)!;
   assert.ok(placement);assert.deepEqual(shoppingItemsForSelection(doc,placement).map(i=>i.id).sort(),[id,finish==='light'?'606405775986248':'606886610979660'].sort());
 }
 assert.equal(Math.round(variants.reduce((sum,v)=>sum+v[2],0)*100),1679);
 assert.equal(shoppingSubtotalForDocument(doc),2178.76);
});

test('adds the three exact selected Temu purchases once, links matching wheat to each vase, and keeps the original textile size',()=>{
 const doc=refineRoomLayout(DEFAULT_APARTMENT_DOCUMENT),active=shoppingItemsForDocument(doc);
 const rows=[['606886610979660',5.88,'60'],['606405775986248',3.90,'68'],['606319608216104',4.57,'40 × 60']] as const;
 for(const [id,price,dimension] of rows){
   const product=item(id);assert.equal(product.price,price);assert.equal(product.quantity,1);
   assert.equal(product.room,'Vorraum');assert.equal(product.retailer,'Temu');assert.ok(product.dimensions.includes(dimension));
   assert.ok(product.url?.includes('goods_id='+id));assert.equal(active.filter(i=>i.id===id).length,1);
 }
 assert.equal(Math.round(rows.reduce((sum,row)=>sum+row[1],0)*100),1435);
 const picture=doc.builtIns.find(i=>i.id==='builtin-hall-wheat-print')!;
 assert.ok(picture);assert.deepEqual(shoppingItemsForSelection(doc,picture).map(i=>i.id),['606319608216104']);
 assert.equal(shoppingSubtotalForDocument(doc),2178.76);
});
