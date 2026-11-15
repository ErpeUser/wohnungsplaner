import { SHOPPING_ITEMS } from "./shopping-items.ts";
import { plannerAssetUrl } from "../catalog/asset-url.ts";

export function ShoppingListDrawer({ onClose }: { onClose(): void }) {
  const total = SHOPPING_ITEMS.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0);
  return (
    <aside id="planner-shopping-list" className="planner-details planner-shopping" role="dialog" aria-modal="true" aria-labelledby="planner-shopping-title" tabIndex={-1}>
      <header>
        <div><span className="planner-kicker">Ausstattung</span><h2 id="planner-shopping-title">Einkaufsliste</h2></div>
        <button type="button" aria-label="Einkaufsliste schließen" onClick={onClose}>×</button>
      </header>
      <p className="planner-shopping__intro">Maßgetreu eingeplante Produkte plus maßlich abgestimmte, herstellerneutrale Deko-Suchliste</p>
      <div className="planner-shopping__items">
        {SHOPPING_ITEMS.map((item) => (
          <article key={item.id} className="planner-shopping__item">
            <div className={`planner-shopping__preview planner-shopping__preview--${item.type}`} aria-hidden="true">
              {/* External product sources stay in the link; the app serves its own previews. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {item.imageUrl?.startsWith("/planner-assets/") ? <img src={plannerAssetUrl(item.imageUrl)} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} /> : null}
              <i /><i /><i />
            </div>
            <div className="planner-shopping__copy">
              <span>{item.room}{item.generic ? " · Deko-Vormerkung" : ` · Art. ${item.id}`}</span>
              <h3>{item.name}</h3>
              <p>{item.dimensions}</p>
              <div><strong>{item.generic ? "Budget offen" : item.price === null ? `Preis bei ${item.retailer} prüfen` : (item.price * (item.quantity ?? 1)).toLocaleString("de-AT", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: Number.isInteger(item.price) ? 0 : 2,
                maximumFractionDigits: 2,
              })}</strong><small>{item.amountLabel ?? `${item.quantity ?? 1} Stück`}</small></div>
              {item.url ? <a href={item.url} target="_blank" rel="noreferrer">Produkt bei {item.retailer} öffnen ↗</a> : <em className="planner-shopping__search">Suchbegriff: {item.searchHint}</em>}
              {item.imageUrl?.startsWith("https://") && <a href={item.imageUrl} target="_blank" rel="noreferrer">Produktbild öffnen ↗</a>}
            </div>
          </article>
        ))}
      </div>
      <footer className="planner-shopping__total">
        <span>Zwischensumme</span>
        <strong>{total.toLocaleString("de-AT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        <small>Produktpreise können sich ändern. Die Deko-Vormerkungen sind bewusst herstellerneutral und nicht in der Summe enthalten.</small>
      </footer>
    </aside>
  );
}
