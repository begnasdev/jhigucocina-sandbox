import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getRawIngredients,
  getPreparedIngredients,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "../services/inventoryService";
import {
  getRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from "../services/recipeService";

const RecipeContext = createContext(null);

export function RecipeProvider({ children }) {
  const [rawIngredients, setRawIngredients] = useState([]);
  const [preparedIngredients, setPreparedIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);

  // Load inventory + recipes from Firestore.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [raw, prepared, recipeList] = await Promise.all([
          getRawIngredients(),
          getPreparedIngredients(),
          getRecipes(),
        ]);
        if (cancelled) return;
        setRawIngredients(raw);
        setPreparedIngredients(prepared);
        setRecipes(recipeList);
      } catch (error) {
        console.error("Failed to load inventory/recipes:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => {
    return {
      rawIngredients,
      preparedIngredients,
      recipes,

      getRaw: (id) => rawIngredients.find((r) => r.id === id),
      getPrepared: (id) => preparedIngredients.find((p) => p.id === id),
      getRecipe: (id) => recipes.find((r) => r.id === id),

      addRaw: async (data) => {
        const payload = { ...data, type: "raw" };
        const id = await createInventoryItem(payload);
        const item = { id, ...payload };
        setRawIngredients((prev) => [...prev, item]);
        return item;
      },
      updateRaw: async (id, patch) => {
        await updateInventoryItem(id, patch);
        setRawIngredients((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      },
      deleteRaw: async (id) => {
        await deleteInventoryItem(id);
        setRawIngredients((prev) => prev.filter((r) => r.id !== id));
      },

      addPrepared: async (data) => {
        const payload = { ingredients: [], ...data, type: "prepared" };
        const id = await createInventoryItem(payload);
        const item = { id, ...payload };
        setPreparedIngredients((prev) => [...prev, item]);
        return item;
      },
      updatePrepared: async (id, patch) => {
        await updateInventoryItem(id, patch);
        setPreparedIngredients((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      },
      deletePrepared: async (id) => {
        await deleteInventoryItem(id);
        setPreparedIngredients((prev) => prev.filter((p) => p.id !== id));
      },

      addRecipe: async (data) => {
        const payload = { prepared: [], raw: [], ...data };
        const id = await createRecipe(payload);
        const item = { id, ...payload };
        setRecipes((prev) => [...prev, item]);
        return item;
      },
      updateRecipe: async (id, patch) => {
        await updateRecipe(id, patch);
        setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      },
      deleteRecipe: async (id) => {
        await deleteRecipe(id);
        setRecipes((prev) => prev.filter((r) => r.id !== id));
      },
    };
  }, [rawIngredients, preparedIngredients, recipes]);

  return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>;
}

export function useRecipes() {
  const ctx = useContext(RecipeContext);
  if (!ctx) throw new Error("useRecipes must be used inside <RecipeProvider>");
  return ctx;
}
