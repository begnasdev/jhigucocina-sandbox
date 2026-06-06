import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/Navbar";
import AssignmentPanel from "./AssignmentPanel";
import { useRecipes } from "../../../context/RecipeContext";
import { getMenuItems } from "../../../services/menuService";

const EMPTY = { name: "", menuItem: "", servingSize: "700 ml" };

function FoodItemRecipeEditPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const {
    rawIngredients,
    preparedIngredients,
    getRecipe,
    addRecipe,
    updateRecipe,
  } = useRecipes();

  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMenuItems();
        if (!cancelled) setMenuItems(data);
      } catch (error) {
        console.error(error);
        if (!cancelled) setMenuItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const existing = !isNew ? getRecipe(id) : null;

  const [tab, setTab] = useState("menu");
  const [form, setForm] = useState(() =>
    existing
      ? {
          name: existing.name,
          menuItem: existing.menuItem,
          servingSize: existing.servingSize || "",
        }
      : EMPTY
  );
  const [prepared, setPrepared] = useState(() =>
    existing ? existing.prepared.map((p) => ({ preparedId: p.preparedId, qty: p.qty })) : []
  );
  const [raw, setRaw] = useState(() =>
    existing ? existing.raw.map((r) => ({ rawId: r.rawId, qty: r.qty })) : []
  );

  const preparedView = useMemo(
    () =>
      prepared
        .map((p) => {
          const pi = preparedIngredients.find((x) => x.id === p.preparedId);
          return pi ? { id: pi.id, name: pi.name, unit: pi.unit, qty: p.qty } : null;
        })
        .filter(Boolean),
    [prepared, preparedIngredients]
  );
  const rawView = useMemo(
    () =>
      raw
        .map((r) => {
          const ri = rawIngredients.find((x) => x.id === r.rawId);
          return ri ? { id: ri.id, name: ri.name, unit: ri.unit, qty: r.qty } : null;
        })
        .filter(Boolean),
    [raw, rawIngredients]
  );

  const addPrep = (preparedId, qty) =>
    setPrepared((prev) =>
      prev.some((p) => p.preparedId === preparedId)
        ? prev.map((p) => (p.preparedId === preparedId ? { ...p, qty } : p))
        : [...prev, { preparedId, qty }]
    );
  const removePrep = (preparedId) =>
    setPrepared((prev) => prev.filter((p) => p.preparedId !== preparedId));
  const updatePrepQty = (preparedId, qty) =>
    setPrepared((prev) => prev.map((p) => (p.preparedId === preparedId ? { ...p, qty } : p)));

  const addRaw = (rawId, qty) =>
    setRaw((prev) =>
      prev.some((r) => r.rawId === rawId)
        ? prev.map((r) => (r.rawId === rawId ? { ...r, qty } : r))
        : [...prev, { rawId, qty }]
    );
  const removeRaw = (rawId) =>
    setRaw((prev) => prev.filter((r) => r.rawId !== rawId));
  const updateRawQty = (rawId, qty) =>
    setRaw((prev) => prev.map((r) => (r.rawId === rawId ? { ...r, qty } : r)));

  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      prepared: prepared.map((p) => ({ preparedId: p.preparedId, qty: Number(p.qty) || 0 })),
      raw: raw.map((r) => ({ rawId: r.rawId, qty: Number(r.qty) || 0 })),
    };
    if (isNew) addRecipe(payload);
    else updateRecipe(id, payload);
    navigate("/manager/recipes");
  };

  if (!isNew && !existing) {
    return (
      <>
        <Navbar />
        <main className="page">
          <div className="empty-state">Recipe not found.</div>
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
            <p className="eyebrow">Food Item Recipe</p>
            <h1>{isNew ? "Create Food Item Recipe" : `Update — ${existing.name}`}</h1>
            <p className="muted">
              Map a menu item to its recipe — the prepared and raw ingredients used per serving.
            </p>
          </div>
          <button type="button" className="button ghost" onClick={() => navigate("/manager/recipes")}>
            Back
          </button>
        </div>

        <form onSubmit={save}>
          <div className="card" style={{ marginBottom: 18 }}>
            <h3 style={{ marginBottom: 12 }}>Details</h3>
            <div className="form-grid">
              <label className="span-2">
                <span className="muted">Recipe Name</span>
                <input
                  className="form-control"
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Butter Chicken Recipe"
                />
              </label>
              <label>
                <span className="muted">Serving Size</span>
                <input
                  className="form-control"
                  value={form.servingSize}
                  onChange={(e) => setForm({ ...form, servingSize: e.target.value })}
                  placeholder="e.g. 700 ml"
                />
              </label>
              <label>
                <span className="muted">Menu Item</span>
                <select
                  className="form-select"
                  value={form.menuItem}
                  onChange={(e) => setForm({ ...form, menuItem: e.target.value })}
                >
                  <option value="">— Unassigned —</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="tabs">
            <button
              type="button"
              className={`tab${tab === "menu" ? " active" : ""}`}
              onClick={() => setTab("menu")}
            >
              Menu Item Map
            </button>
            <button
              type="button"
              className={`tab${tab === "recipe" ? " active" : ""}`}
              onClick={() => setTab("recipe")}
            >
              Recipe Map
            </button>
          </div>

          {tab === "menu" && (
            <div className="card">
              <h3 style={{ marginBottom: 10 }}>Select the Menu Item to assign</h3>
              <p className="muted">
                Pick one menu item from this provider's menu. This recipe produces one serving of that item.
              </p>
              <div className="grid cards" style={{ marginTop: 14 }}>
                {menuItems.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    className={`card${form.menuItem === m.name ? " card-selected" : ""}`}
                    onClick={() => setForm({ ...form, menuItem: m.name })}
                    style={{ textAlign: "left", cursor: "pointer" }}
                  >
                    <span className="pill">{m.category}</span>
                    <h3 style={{ margin: "8px 0 4px" }}>{m.name}</h3>
                    <p className="muted" style={{ fontSize: ".9rem" }}>{m.description}</p>
                    {form.menuItem === m.name && (
                      <p style={{ marginTop: 8, color: "var(--brand-dark)", fontWeight: 800 }}>
                        Selected
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "recipe" && (
            <div className="card">
              <h3 style={{ marginBottom: 4 }}>Assign Prepared Ingredients</h3>
              <p className="muted" style={{ marginBottom: 14 }}>
                Sauces, marinades, and other multi-ingredient builds prepared by the kitchen.
              </p>
              <AssignmentPanel
                title="Prepared Ingredients"
                available={preparedIngredients}
                assigned={preparedView}
                unitOf={(item) => item.unit}
                onAdd={addPrep}
                onRemove={removePrep}
                onUpdateQty={updatePrepQty}
                emptyAvailableLabel="No prepared ingredients available."
                emptyAssignedLabel="No prepared ingredients assigned yet."
              />

              <hr style={{ margin: "26px 0", border: 0, borderTop: "1px solid var(--line)" }} />

              <h3 style={{ marginBottom: 4 }}>Assign Raw Ingredients</h3>
              <p className="muted" style={{ marginBottom: 14 }}>
                Individual raw ingredients used directly in the recipe (not part of a prepared ingredient).
              </p>
              <AssignmentPanel
                title="Raw Ingredients"
                available={rawIngredients}
                assigned={rawView}
                unitOf={(item) => item.unit}
                onAdd={addRaw}
                onRemove={removeRaw}
                onUpdateQty={updateRawQty}
                emptyAvailableLabel="No raw ingredients available."
                emptyAssignedLabel="No raw ingredients assigned yet."
              />
            </div>
          )}

          <div className="actions" style={{ marginTop: 18 }}>
            <button type="submit" className="button">
              {isNew ? "Create Recipe" : "Save Changes"}
            </button>
            <button type="button" className="button ghost" onClick={() => navigate("/manager/recipes")}>
              Cancel
            </button>
          </div>
        </form>
      </main>
    </>
  );
}

export default FoodItemRecipeEditPage;
