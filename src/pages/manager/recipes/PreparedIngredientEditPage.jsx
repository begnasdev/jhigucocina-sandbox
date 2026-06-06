import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/Navbar";
import AssignmentPanel from "./AssignmentPanel";
import { useRecipes } from "../../../context/RecipeContext";

const EMPTY_FORM = {
  name: "",
  unit: "Fl. Oz",
  madeBy: "",
  shelfLife: "",
  prepTime: 0,
};

function PreparedIngredientEditPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const {
    rawIngredients,
    getPrepared,
    addPrepared,
    updatePrepared,
  } = useRecipes();

  const existing = !isNew ? getPrepared(id) : null;

  const [form, setForm] = useState(() =>
    existing
      ? {
          name: existing.name,
          unit: existing.unit,
          madeBy: existing.madeBy,
          shelfLife: existing.shelfLife,
          prepTime: existing.prepTime || 0,
        }
      : EMPTY_FORM
  );

  const [assigned, setAssigned] = useState(() =>
    existing ? existing.ingredients.map((i) => ({ rawId: i.rawId, qty: i.qty })) : []
  );

  const assignedView = useMemo(
    () =>
      assigned
        .map((a) => {
          const raw = rawIngredients.find((r) => r.id === a.rawId);
          return raw ? { id: raw.id, name: raw.name, unit: raw.unit, qty: a.qty } : null;
        })
        .filter(Boolean),
    [assigned, rawIngredients]
  );

  const addItem = (rawId, qty) => {
    setAssigned((prev) => {
      if (prev.some((a) => a.rawId === rawId)) {
        return prev.map((a) => (a.rawId === rawId ? { ...a, qty } : a));
      }
      return [...prev, { rawId, qty }];
    });
  };

  const removeItem = (rawId) => {
    setAssigned((prev) => prev.filter((a) => a.rawId !== rawId));
  };

  const updateQty = (rawId, qty) => {
    setAssigned((prev) => prev.map((a) => (a.rawId === rawId ? { ...a, qty } : a)));
  };

  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = { ...form, prepTime: Number(form.prepTime) || 0, ingredients: assigned };
    if (isNew) {
      addPrepared(payload);
    } else {
      updatePrepared(id, payload);
    }
    navigate("/manager/prepared");
  };

  if (!isNew && !existing) {
    return (
      <>
        <Navbar />
        <main className="page">
          <div className="empty-state">Prepared ingredient not found.</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="section-header">
          <div>
            <p className="eyebrow">Prepared Ingredient</p>
            <h1>{isNew ? "Create Prepared Ingredient" : `Update — ${existing.name}`}</h1>
            <p className="muted">
              Assign raw ingredients with the quantity needed to make one unit of this prepared ingredient.
            </p>
          </div>
          <button type="button" className="button ghost" onClick={() => navigate("/manager/prepared")}>
            Back
          </button>
        </div>

        <form onSubmit={save}>
          <div className="card" style={{ marginBottom: 18 }}>
            <h3 style={{ marginBottom: 12 }}>Details</h3>
            <div className="form-grid">
              <label className="span-2">
                <span className="muted">Ingredient Name</span>
                <input
                  className="form-control"
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                <span className="muted">Unit of Measure</span>
                <select
                  className="form-select"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                >
                  <option>Fl. Oz</option>
                  <option>Oz</option>
                  <option>lbs</option>
                  <option>each</option>
                  <option>gallon</option>
                </select>
              </label>
              <label>
                <span className="muted">Made by (Prep-Line)</span>
                <input
                  className="form-control"
                  placeholder="e.g. Curries Prep-Line"
                  value={form.madeBy}
                  onChange={(e) => setForm({ ...form, madeBy: e.target.value })}
                />
              </label>
              <label>
                <span className="muted">Shelf Life</span>
                <input
                  className="form-control"
                  placeholder="e.g. 2 days"
                  value={form.shelfLife}
                  onChange={(e) => setForm({ ...form, shelfLife: e.target.value })}
                />
              </label>
              <label>
                <span className="muted">Prep time (minutes)</span>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  value={form.prepTime}
                  onChange={(e) => setForm({ ...form, prepTime: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="card">
            <div className="section-header" style={{ marginBottom: 16 }}>
              <h2 style={{ marginBottom: 0 }}>Assign Raw Ingredients</h2>
              <span className="muted">{assigned.length} assigned</span>
            </div>

            <AssignmentPanel
              title="Raw Ingredients"
              available={rawIngredients}
              assigned={assignedView}
              unitOf={(item) => item.unit}
              onAdd={addItem}
              onRemove={removeItem}
              onUpdateQty={updateQty}
              emptyAvailableLabel="No matching raw ingredients."
              emptyAssignedLabel="No raw ingredients assigned yet — click items on the left to assign."
            />
          </div>

          <div className="actions" style={{ marginTop: 18 }}>
            <button type="submit" className="button">
              {isNew ? "Create Prepared Ingredient" : "Save Changes"}
            </button>
            <button type="button" className="button ghost" onClick={() => navigate("/manager/prepared")}>
              Cancel
            </button>
          </div>
        </form>
      </main>
    </>
  );
}

export default PreparedIngredientEditPage;
