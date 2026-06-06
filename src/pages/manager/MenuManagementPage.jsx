import { useEffect, useRef, useState } from "react";

import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuAvailability,
  uploadMenuImage,
} from "../../services/menuService";
import Navbar from "../../components/Navbar";
import { useToast } from "../../context/ToastContext";
import { useLanguage } from "../../context/LanguageContext";
import { formatNPR } from "../../utils/format";

const CATEGORIES = [
  "Nepali Favorites",
  "Starters",
  "House Plates",
  "Beverage",
  "Dessert",
  "Special",
];

function MenuManagementPage() {
  const toast = useToast();
  const { t } = useLanguage();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Nepali Favorites");
  const [price, setPrice] = useState("");

  // Image state (one image per item).
  const [imageFile, setImageFile] = useState(null); // pending new upload
  const [imagePreview, setImagePreview] = useState(null); // object URL or existing URL
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);

  useEffect(() => {
    loadMenu();
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const loadMenu = async () => {
    setLoading(true);
    try {
      const data = await getMenuItems();
      setItems(data);
    } catch (error) {
      console.error(error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const clearObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setCategory("Nepali Favorites");
    setPrice("");
    setImageFile(null);
    clearObjectUrl();
    setImagePreview(null);
    setExistingImageUrl("");
    setRemoveImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setName(item.name || "");
    setDescription(item.description || "");
    setCategory(item.category || "Nepali Favorites");
    setPrice(item.price != null ? String(item.price) : "");
    setImageFile(null);
    clearObjectUrl();
    setExistingImageUrl(item.imageUrl || "");
    setImagePreview(item.imageUrl || null);
    setRemoveImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    clearObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageFile(file);
    setImagePreview(url);
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    clearObjectUrl();
    setImagePreview(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!name || !description || !category || !price) {
      toast.error(t("mm.validation"));
      return;
    }

    setSaving(true);
    try {
      // Resolve the image URL to persist (string only — never image data).
      let imageUrl;
      if (imageFile) {
        imageUrl = await uploadMenuImage(imageFile);
      } else if (removeImage) {
        imageUrl = "";
      } else {
        imageUrl = existingImageUrl;
      }

      if (editingId) {
        await updateMenuItem(editingId, {
          name,
          description,
          category,
          price: Number(price),
          imageUrl,
        });
        toast.success(t("mm.updated", { name }));
      } else {
        await createMenuItem({
          name,
          description,
          category,
          price: Number(price),
          available: true,
          imageUrl: imageUrl || "",
        });
        toast.success(t("mm.added", { name }));
      }

      resetForm();
      await loadMenu();
    } catch (error) {
      console.error(error);
      toast.error(t("mm.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMenuItem(id);
      if (editingId === id) resetForm();
      loadMenu();
    } catch (error) {
      console.error(error);
      setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await toggleMenuAvailability(item.id, item.available);
      loadMenu();
    } catch (error) {
      console.error(error);
      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, available: !currentItem.available }
            : currentItem
        )
      );
    }
  };

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="section-header">
          <div>
            <p className="eyebrow">{t("mm.eyebrow")}</p>
            <h1>{t("mm.title")}</h1>
          </div>
        </div>

        <div className="layout-two">
          <section className="card">
            <h2>{editingId ? t("mm.editItem") : t("mm.addItem")}</h2>
            <div className="form-grid">
              <input
                className="form-control"
                placeholder={t("mm.phName")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <textarea
                className="form-control span-2"
                placeholder={t("mm.phDescription")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />

              <input
                className="form-control"
                placeholder={t("mm.phPrice")}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />

              {/* --- Image (one per item) --- */}
              <div className="span-2 menu-image-field">
                <span className="muted">{t("mm.image")}</span>

                {imagePreview ? (
                  <div className="menu-image-preview">
                    <img src={imagePreview} alt={name || t("mm.image")} />
                    <div className="actions" style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className="button ghost"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {t("mm.replaceImage")}
                      </button>
                      <button
                        type="button"
                        className="button ghost"
                        onClick={handleRemoveImage}
                      >
                        {t("mm.removeImage")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="button secondary menu-image-upload"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t("mm.uploadImage")}
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </div>

              <div className="span-2 actions">
                <button
                  className="button"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? t("common.saving")
                    : editingId
                    ? t("mm.saveChanges")
                    : t("mm.add")}
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="button ghost"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    {t("common.cancel")}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        <section className="section">
          <h2>{t("mm.itemsTitle")}</h2>

          {loading ? (
            <div className="table-list" aria-busy="true" aria-label={t("mm.loading")}>
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">{t("mm.empty")}</div>
          ) : (
            <div className="table-list">
              {items.map((item) => (
                <article className="table-row" key={item.id}>
                  <div className="menu-row-main">
                    {item.imageUrl ? (
                      <div className="menu-row-thumb">
                        <img src={item.imageUrl} alt="" loading="lazy" />
                      </div>
                    ) : null}
                    <div>
                      <span className="pill">{item.category || t("mm.uncategorized")}</span>
                      <h3>{item.name}</h3>
                      <p className="muted">{item.description || t("mm.noDescription")}</p>
                    </div>
                  </div>
                  <strong>{formatNPR(item.price)}</strong>
                  <span className={`pill${item.available ? "" : " danger"}`}>
                    {item.available ? t("common.available") : t("common.unavailable")}
                  </span>
                  <div className="actions">
                    <button className="button ghost" onClick={() => startEdit(item)}>
                      {t("common.edit")}
                    </button>
                    <button className="button ghost" onClick={() => handleToggleAvailability(item)}>
                      {item.available ? t("common.disable") : t("common.enable")}
                    </button>
                    <button className="button danger" onClick={() => handleDelete(item.id)}>
                      {t("common.delete")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default MenuManagementPage;
