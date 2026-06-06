import { createContext, useContext, useMemo, useState } from "react";

const RecipeContext = createContext(null);

const SEED_RAW = [
  { id: "raw-tomato", name: "Tomatoes", unit: "lbs", supplier: "Sunrise Produce", shelfLife: "7 days" },
  { id: "raw-garlic", name: "Garlic", unit: "lbs", supplier: "Sunrise Produce", shelfLife: "30 days" },
  { id: "raw-salt", name: "Salt", unit: "lbs", supplier: "Pantry Co.", shelfLife: "365 days" },
  { id: "raw-pepper", name: "Pepper", unit: "lbs", supplier: "Pantry Co.", shelfLife: "365 days" },
  { id: "raw-chicken", name: "Chicken Breast", unit: "lbs", supplier: "Valley Meats", shelfLife: "3 days" },
  { id: "raw-yogurt", name: "Yogurt", unit: "Fl. Oz", supplier: "Dairy Direct", shelfLife: "14 days" },
  { id: "raw-mint", name: "Mint Leaves", unit: "Oz", supplier: "Sunrise Produce", shelfLife: "5 days" },
  { id: "raw-tamarind", name: "Tamarind Paste", unit: "Oz", supplier: "Spice House", shelfLife: "180 days" },
];

const SEED_PREPARED = [
  {
    id: "prep-tomato-paste",
    name: "Tomato Paste",
    unit: "Fl. Oz",
    madeBy: "Curries Prep-Line",
    shelfLife: "2 days",
    prepTime: 25,
    ingredients: [
      { rawId: "raw-tomato", qty: 10 },
      { rawId: "raw-garlic", qty: 0.25 },
      { rawId: "raw-salt", qty: 0.1 },
    ],
  },
  {
    id: "prep-mint-sauce",
    name: "Mint Sauce",
    unit: "Fl. Oz",
    madeBy: "Curries Prep-Line",
    shelfLife: "3 days",
    prepTime: 10,
    ingredients: [
      { rawId: "raw-mint", qty: 4 },
      { rawId: "raw-yogurt", qty: 8 },
      { rawId: "raw-salt", qty: 0.05 },
    ],
  },
  {
    id: "prep-tamarind-sauce",
    name: "Tamarind Sauce",
    unit: "Fl. Oz",
    madeBy: "Curries Prep-Line",
    shelfLife: "5 days",
    prepTime: 15,
    ingredients: [
      { rawId: "raw-tamarind", qty: 3 },
      { rawId: "raw-salt", qty: 0.05 },
    ],
  },
  {
    id: "prep-butter-chicken-sauce",
    name: "Butter Chicken Sauce",
    unit: "Fl. Oz",
    madeBy: "Curries Prep-Line",
    shelfLife: "2 days",
    prepTime: 35,
    ingredients: [
      { rawId: "raw-tomato", qty: 8 },
      { rawId: "raw-yogurt", qty: 6 },
      { rawId: "raw-garlic", qty: 0.3 },
    ],
  },
];

const SEED_RECIPES = [
  {
    id: "recipe-butter-chicken",
    name: "Butter Chicken Recipe",
    menuItem: "Butter Chicken",
    servingSize: "24 Oz",
    prepared: [
      { preparedId: "prep-butter-chicken-sauce", qty: 12 },
    ],
    raw: [
      { rawId: "raw-chicken", qty: 0.5 },
      { rawId: "raw-salt", qty: 0.05 },
    ],
  },
  {
    id: "recipe-mango-lassi",
    name: "Mango Lassi Recipe",
    menuItem: "Mango Lassi",
    servingSize: "16 Oz",
    prepared: [],
    raw: [
      { rawId: "raw-yogurt", qty: 10 },
    ],
  },
];

export function RecipeProvider({ children }) {
  const [rawIngredients, setRawIngredients] = useState(SEED_RAW);
  const [preparedIngredients, setPreparedIngredients] = useState(SEED_PREPARED);
  const [recipes, setRecipes] = useState(SEED_RECIPES);

  const value = useMemo(() => {
    const newId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

    return {
      rawIngredients,
      preparedIngredients,
      recipes,

      getRaw: (id) => rawIngredients.find((r) => r.id === id),
      getPrepared: (id) => preparedIngredients.find((p) => p.id === id),
      getRecipe: (id) => recipes.find((r) => r.id === id),

      addRaw: (data) => {
        const item = { id: newId("raw"), ...data };
        setRawIngredients((prev) => [...prev, item]);
        return item;
      },
      updateRaw: (id, patch) => {
        setRawIngredients((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      },
      deleteRaw: (id) => {
        setRawIngredients((prev) => prev.filter((r) => r.id !== id));
      },

      addPrepared: (data) => {
        const item = { id: newId("prep"), ingredients: [], ...data };
        setPreparedIngredients((prev) => [...prev, item]);
        return item;
      },
      updatePrepared: (id, patch) => {
        setPreparedIngredients((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      },
      deletePrepared: (id) => {
        setPreparedIngredients((prev) => prev.filter((p) => p.id !== id));
      },

      addRecipe: (data) => {
        const item = { id: newId("recipe"), prepared: [], raw: [], ...data };
        setRecipes((prev) => [...prev, item]);
        return item;
      },
      updateRecipe: (id, patch) => {
        setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      },
      deleteRecipe: (id) => {
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
