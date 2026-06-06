import { useState } from "react";
import Navbar from "../../../components/Navbar";
import { useRecipes } from "../../../context/RecipeContext";
import { useConfirm } from "../../../context/ConfirmContext";
import { useToast } from "../../../context/ToastContext";

const EMPTY = { name: "", unit: "kg", supplier: "", shelfLife: "" };

function RawIngredientsPage() {
  const { rawIngredients, addRaw, updateRaw, deleteRaw } = useRecipes();
  const confirm = useConfirm();
  const toast = useToast();
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY);

  const startNew = () => {
    setEditingId("__new__");
    setDraft(EMPTY);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      unit: item.unit,
      supplier: item.supplier,
      shelfLife: item.shelfLife,
    });
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(EMPTY);
  };

  const save = (e) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    if (editingId === "__new__") {
      addRaw(draft);
      toast.success(`Added ${draft.name}`);
    } else {
      updateRaw(editingId, draft);
      toast.success(`Updated ${draft.name}`);
    }
    cancel();
  };

  const remove = async (item) => {
    const ok = await confirm({
      title: `Delete ${item.name}?`,
      body: "This raw ingredient will be removed from any recipe that uses it.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) {
      deleteRaw(item.id);
      toast.info(`Deleted ${item.name}`);
    }
  };

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="section-header">
          <div>
            <p className="eyebrow">Provider data</p>
            <h1>Raw Ingredients</h1>
          </div>
          <button className="button" onClick={startNew} disabled={editingId === "__new__"}>
            Add Raw Ingredient
          </button>
        </div>

        {editingId && (
          <form className="card" onSubmit={save} style={{ marginBottom: 18 }}>
            <h3 style={{ marginBottom: 12 }}>
              {editingId === "__new__" ? "New Raw Ingredient" : "Edit Raw Ingredient"}
            </h3>
            <div className="form-grid">
              <label className="span-2">
                <span className="muted">Name</span>
                <input
                  className="form-control"
                  autoFocus
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                <span className="muted">Unit of Measure</span>
                <select
                  className="form-select"
                  value={draft.unit}
                  onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                >
                  <option>kg</option>
                  <option>g</option>
                  <option>ml</option>
                  <option>pcs</option>
                  <option>L</option>
                </select>
              </label>
              <label>
                <span className="muted">Supplier</span>
                <input
                  className="form-control"
                  value={draft.supplier}
                  onChange={(e) => setDraft({ ...draft, supplier: e.target.value })}
                />
              </label>
              <label className="span-2">
                <span className="muted">Shelf Life</span>
                <input
                  className="form-control"
                  placeholder="e.g. 7 days"
                  value={draft.shelfLife}
                  onChange={(e) => setDraft({ ...draft, shelfLife: e.target.value })}
                />
              </label>
            </div>
            <div className="actions" style={{ marginTop: 14 }}>
              <button type="submit" className="button">
                {editingId === "__new__" ? "Create" : "Save"}
              </button>
              <button type="button" className="button ghost" onClick={cancel}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="table-list">
          <div
            className="table-row"
            style={{ background: "transparent", border: 0, color: "var(--muted)", fontSize: ".85rem", textTransform: "uppercase", letterSpacing: ".06em" }}
          >
            <span>Name / Supplier</span>
            <span>Unit</span>
            <span>Shelf life</span>
            <span></span>
          </div>

          {rawIngredients.length === 0 && (
            <div className="empty-state">No raw ingredients yet. Add one to start building recipes.</div>
          )}

          {rawIngredients.map((item) => (
            <div className="table-row" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <div className="muted" style={{ fontSize: ".9rem" }}>{item.supplier || "—"}</div>
              </div>
              <span className="pill neutral">{item.unit}</span>
              <span className="muted">{item.shelfLife || "—"}</span>
              <div className="actions">
                <button className="button ghost" onClick={() => startEdit(item)}>Edit</button>
                <button className="button danger" onClick={() => remove(item)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

export default RawIngredientsPage;
