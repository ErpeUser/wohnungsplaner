"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { SHOPPING_ITEMS, formatShoppingPrice, shoppingItemsForDocument, shoppingItemsForRoom, shoppingPriceLabel, shoppingSubtotalForItems } from "./shopping-items.ts";
import type { PlannerDocumentV3 } from "../domain/types.ts";
import type { PlannerCommand, CommandResult } from "../domain/commands.ts";
import { WcWallboardPicker } from "./wc-wallboard-picker.tsx";
import { plannerAssetUrl } from "../catalog/asset-url.ts";

export function ShoppingListDrawer({ onClose, document, dispatch, activeRoomId = null }: {
  onClose(): void;
  document?: PlannerDocumentV3;
  dispatch?: (command: PlannerCommand) => CommandResult;
  activeRoomId?: string | null;
}) {
  const room = document?.rooms.find((item) => item.id === activeRoomId);
  const [scope, setScope] = useState<"room" | "all">(() => room ? "room" : "all");
  const activeScope = room ? scope : "all";
  const allItems = document ? shoppingItemsForDocument(document) : SHOPPING_ITEMS;
  const items = activeScope === "room" && room ? shoppingItemsForRoom(allItems, room.name) : allItems;
  const total = shoppingSubtotalForItems(items);
  const showWallboard = activeScope === "all" || room?.id === "wc";
  const showDining = activeScope === "all" || room?.id === "wohnkueche";
  const id = useId();
  const onTabsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!room || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "room" : event.key === "End" ? "all" : activeScope === "room" ? "all" : "room";
    setScope(next);
    event.currentTarget.querySelector<HTMLButtonElement>('[data-scope="' + next + '"]')?.focus();
  };
  return (
    <aside id="planner-shopping-list" className="planner-details planner-shopping" role="dialog" aria-modal="true" aria-labelledby="planner-shopping-title" tabIndex={-1}>
      <header>
        <div><span className="planner-kicker">Ausstattung</span><h2 id="planner-shopping-title">Einkaufsliste</h2></div>
        <button type="button" aria-label="Einkaufsliste schließen" onClick={onClose}>×</button>
      </header>
      <div className="planner-shopping__tabs" role="tablist" aria-label="Umfang der Einkaufsliste" onKeyDown={onTabsKeyDown}>
        <button type="button" id={id + "-room"} data-scope="room" role="tab" aria-controls={id + "-panel"} aria-selected={activeScope === "room"} tabIndex={activeScope === "room" ? 0 : -1} disabled={!room} onClick={() => setScope("room")}>Dieser Raum</button>
        <button type="button" id={id + "-all"} data-scope="all" role="tab" aria-controls={id + "-panel"} aria-selected={activeScope === "all"} tabIndex={activeScope === "all" ? 0 : -1} onClick={() => setScope("all")}>Gesamt</button>
      </div>
      <div id={id + "-panel"} role="tabpanel" aria-labelledby={id + "-" + activeScope}>
        <div className="planner-shopping__scope">
          <strong>{activeScope === "room" ? room?.name : "Gesamtwohnung"}</strong>
          <small>{items.length} Artikel</small>
        </div>
        <p className="planner-shopping__intro">
          {showDining ? "WOLTU Chenille ist der Hauptstuhl (zwei 2er-Sets). Backup-Stühle zählen nicht zur Zwischensumme. " : ""}
          {showWallboard ? "Beim WC-Wandboard zählt ausschließlich die gewählte Variante. " : ""}
          Unbestätigte Maße und Preise sind gekennzeichnet.
          {!room ? " Wähle einen Raum im Planer, um dessen Einkaufsliste zu sehen." : ""}
        </p>
        {showWallboard && document && dispatch ? <WcWallboardPicker document={document} dispatch={dispatch} /> : null}
        {!items.length ? <p className="planner-shopping__empty">Keine Produkte für diesen Raum hinterlegt.</p> : null}
        <div className="planner-shopping__items">
        {items.map((item) => (
          <article key={item.id} className="planner-shopping__item">
            <div className={`planner-shopping__preview planner-shopping__preview--${item.type}`} aria-hidden="true">
              {/* External product sources stay in the link; the app serves its own previews. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {item.imageUrl?.startsWith("/planner-assets/") ? <img src={plannerAssetUrl(item.imageUrl)} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} /> : null}
              <i /><i /><i />
            </div>
            <div className="planner-shopping__copy">
              <span>{item.room}{item.existing ? ` · Bestand · Art. ${item.id}` : item.reference ? " · Modellreferenz" : item.alternative ? ` · Backup-Alternative · Art. ${item.id}` : item.generic ? " · Deko-Vormerkung" : ` · Art. ${item.id}`}</span>
              <h3>{item.name}</h3>
              <p>{item.dimensions}</p>
              <div><strong>{shoppingPriceLabel(item)}</strong><small>{item.amountLabel ?? `${item.quantity ?? 1} Stück`}</small>{item.alternative ? <small>Backup · nicht zur Zwischensumme addiert</small> : null}{item.existing ? <small>Bestand · nicht zur Zwischensumme addiert</small> : null}{item.reference ? <small>Kaufentscheidung offen · nicht zur Zwischensumme addiert</small> : null}</div>
              {item.url ? <a href={item.url} target="_blank" rel="noreferrer">Produkt bei {item.retailer} öffnen ↗</a> : <em className="planner-shopping__search">{item.searchHint ? "Suchbegriff: " + item.searchHint : "Produktlink noch offen"}</em>}
              {item.imageUrl?.startsWith("https://") && <a href={item.imageUrl} target="_blank" rel="noreferrer">Produktbild öffnen ↗</a>}
            </div>
          </article>
        ))}
      </div>
      <footer className="planner-shopping__total">
        <span>{activeScope === "room" ? "Zwischensumme · " + room?.name : "Zwischensumme · Gesamtwohnung"}</span>
        <strong>{formatShoppingPrice(total)}</strong>
        <small>Produktpreise können sich ändern. Unbestätigte Produktpreise, Deko-Vormerkungen, Bestandsmöbel, Modellreferenzen und Backup-Stühle sind nicht in der Summe enthalten.</small>
      </footer>
      </div>
    </aside>
  );
}
