import { Link } from "react-router-dom";
import Navbar from "../../../components/Navbar";
import { useRecipes } from "../../../context/RecipeContext";
import { useConfirm } from "../../../context/ConfirmContext";
import { useToast } from "../../../context/ToastContext";

function PreparedIngredientsListPage() {
  const { preparedIngredients, deletePrepared, rawIngredients } = useRecipes();
  const confirm = useConfirm();
  const toast = useToast();

  const rawName = (id) => rawIngredients.find((r) => r.id === id)?.name || id;

  const remove = async (item) => {
    const ok = await confirm({
      title: `Delete ${item.name}?`,
      body: "This prepared ingredient will be removed from any recipe that uses it.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) {
      deletePrepared(item.id);
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
            <h1>Manage Prepared Ingredients</h1>
            <p className="muted">
              Multi-ingredient builds the kitchen prepares ahead of service (sauces, marinades, doughs).
            </p>
          </div>
          <Link className="button" to="/manager/prepared/new">
            Add New Prepared Ingredient
          </Link>
        </div>

        {preparedIngredients.length === 0 && (
          <div className="empty-state">
            No prepared ingredients yet. Create one to start building food item recipes.
          </div>
        )}

        <div className="grid cards">
          {preparedIngredients.map((p) => (
            <article className="card" key={p.id}>
              <span className="pill">{p.unit}</span>
              <h3 style={{ margin: "10px 0 4px" }}>{p.name}</h3>
              <p className="muted" style={{ fontSize: ".9rem" }}>
                Made by {p.madeBy || "—"} • Prep {p.prepTime || 0} min • Shelf {p.shelfLife || "—"}
              </p>

              <div style={{ margin: "10px 0" }}>
                <div className="muted" style={{ fontSize: ".8rem", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Raw ingredients
                </div>
                {p.ingredients.length === 0 ? (
                  <p className="muted" style={{ fontSize: ".9rem" }}>None assigned</p>
                ) : (
                  <ul style={{ paddingLeft: 18, margin: "6px 0" }}>
                    {p.ingredients.map((i) => (
                      <li key={i.rawId} style={{ fontSize: ".92rem" }}>
                        {rawName(i.rawId)} — <strong>{i.qty}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="actions">
                <Link className="button ghost" to={`/manager/prepared/${p.id}/edit`}>
                  Edit
                </Link>
                <button className="button danger" onClick={() => remove(p)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}

export default PreparedIngredientsListPage;
