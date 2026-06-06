import { useState } from "react";

function AssignmentPanel({
  title,
  available,
  assigned,
  onAdd,
  onRemove,
  onUpdateQty,
  unitOf,
  emptyAvailableLabel = "No items available.",
  emptyAssignedLabel = "No ingredients assigned yet.",
}) {
  const [search, setSearch] = useState("");
  const [qtyTarget, setQtyTarget] = useState(null);
  const [qtyInput, setQtyInput] = useState("");

  const assignedIds = new Set(assigned.map((a) => a.id));
  const filtered = available
    .filter((item) => !assignedIds.has(item.id))
    .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));

  const promptQty = (item) => {
    setQtyTarget(item);
    setQtyInput("");
  };

  const confirmQty = () => {
    const qty = parseFloat(qtyInput);
    if (Number.isFinite(qty) && qty > 0) {
      onAdd(qtyTarget.id, qty);
    }
    setQtyTarget(null);
    setQtyInput("");
  };

  return (
    <>
      <div className="assign-panel">
        <div className="assign-col">
          <header className="assign-head">
            <h3>{title}</h3>
            <input
              className="form-control"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </header>
          <div className="assign-body">
            {filtered.length === 0 && (
              <div className="empty-state">{emptyAvailableLabel}</div>
            )}
            {filtered.map((item) => (
              <button
                type="button"
                key={item.id}
                className="assign-row clickable"
                onClick={() => promptQty(item)}
                title="Click to assign with quantity"
              >
                <span>{item.name}</span>
                <span className="pill neutral">{unitOf(item)}</span>
              </button>
            ))}
          </div>
          <p className="muted" style={{ fontSize: ".8rem", marginTop: 6 }}>
            Click an item to assign — you’ll be prompted for quantity.
          </p>
        </div>

        <div className="assign-col">
          <header className="assign-head">
            <h3>Assigned Ingredients</h3>
            <span className="pill">{assigned.length} item{assigned.length === 1 ? "" : "s"}</span>
          </header>
          <div className="assign-body">
            {assigned.length === 0 && <div className="empty-state">{emptyAssignedLabel}</div>}
            {assigned.map((item) => (
              <div className="assign-row" key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  <span className="muted" style={{ marginLeft: 8, fontSize: ".88rem" }}>
                    {unitOf(item)}
                  </span>
                </span>
                <span className="assign-qty">
                  <input
                    className="form-control"
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.qty}
                    onChange={(e) => onUpdateQty(item.id, parseFloat(e.target.value) || 0)}
                    style={{ width: 84, minHeight: 36 }}
                  />
                  <button
                    type="button"
                    className="button danger"
                    style={{ minHeight: 36, padding: "6px 10px" }}
                    onClick={() => onRemove(item.id)}
                  >
                    Remove
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {qtyTarget && (
        <div className="modal-backdrop" onClick={() => setQtyTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assigning {qtyTarget.name}</h3>
            <p className="muted">
              Please confirm Qty in <strong>{unitOf(qtyTarget)}</strong> of this ingredient.
            </p>
            <input
              className="form-control"
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmQty();
                if (e.key === "Escape") setQtyTarget(null);
              }}
              placeholder="10"
            />
            <div className="actions" style={{ marginTop: 14, justifyContent: "flex-end" }}>
              <button type="button" className="button ghost" onClick={() => setQtyTarget(null)}>
                Cancel
              </button>
              <button type="button" className="button" onClick={confirmQty}>
                Confirm Qty
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AssignmentPanel;
