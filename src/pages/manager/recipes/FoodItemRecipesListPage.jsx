import { Link } from "react-router-dom";
import Navbar from "../../../components/Navbar";
import { useRecipes } from "../../../context/RecipeContext";
import { useConfirm } from "../../../context/ConfirmContext";
import { useToast } from "../../../context/ToastContext";

function FoodItemRecipesListPage() {
  const { recipes, deleteRecipe } = useRecipes();
  const confirm = useConfirm();
  const toast = useToast();

  const remove = async (recipe) => {
    const ok = await confirm({
      title: `Delete ${recipe.name}?`,
      body: "This recipe will be removed.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) {
      deleteRecipe(recipe.id);
      toast.info(`Deleted ${recipe.name}`);
    }
  };

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="section-header">
          <div>
            <p className="eyebrow">Provider data</p>
            <h1>Food Item Recipes</h1>
          </div>
          <Link className="button" to="/manager/recipes/new">
            Add New Food Item Recipe
          </Link>
        </div>

        {recipes.length === 0 && (
          <div className="empty-state">No recipes yet. Add one to start mapping menu items to ingredients.</div>
        )}

        <div className="grid cards">
          {recipes.map((r) => (
            <article className="card" key={r.id}>
              <span className="pill">{r.menuItem || "Unassigned"}</span>
              <h3 style={{ margin: "10px 0 4px" }}>{r.name}</h3>
              <p className="muted" style={{ fontSize: ".9rem" }}>
                Serving size: {r.servingSize || "—"} • Prepared: {r.prepared.length} • Raw: {r.raw.length}
              </p>
              <div className="actions" style={{ marginTop: 12 }}>
                <Link className="button ghost" to={`/manager/recipes/${r.id}/edit`}>
                  Edit
                </Link>
                <button className="button danger" onClick={() => remove(r)}>
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

export default FoodItemRecipesListPage;
