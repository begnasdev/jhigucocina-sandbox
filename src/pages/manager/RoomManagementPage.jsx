import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import RoomQrModal from "../../components/RoomQrModal";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import { useLanguage } from "../../context/LanguageContext";
import {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  toggleRoomActive,
} from "../../services/roomService";

const EMPTY = {
  roomNumber: "",
  floor: "",
  label: "",
  notes: "",
  active: true,
};

const STATUS_FILTERS = [
  { value: "all", key: "rm.filterAll" },
  { value: "active", key: "rm.filterActive" },
  { value: "inactive", key: "rm.filterInactive" },
];

const normalize = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
};

function RoomManagementPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { t } = useLanguage();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [qrRoom, setQrRoom] = useState(null);

  const loadRooms = async () => {
    try {
      const data = await getRooms();
      setRooms(data);
    } catch (error) {
      console.error("Failed to load rooms:", error);
      toast.error(t("rm.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNew = () => {
    setEditingId("__new__");
    setDraft(EMPTY);
  };

  const startEdit = (room) => {
    setEditingId(room.id);
    setDraft({
      roomNumber: room.roomNumber ?? "",
      floor: room.floor ?? "",
      label: room.label ?? "",
      notes: room.notes ?? "",
      active: room.active ?? true,
    });
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(EMPTY);
  };

  const isDuplicateRoomNumber = (roomNumber, ignoreId) => {
    const target = roomNumber.trim().toLowerCase();
    if (!target) return false;
    return rooms.some(
      (r) =>
        r.id !== ignoreId &&
        (r.roomNumber || "").trim().toLowerCase() === target
    );
  };

  const save = async (e) => {
    e.preventDefault();
    const roomNumber = draft.roomNumber.trim();
    if (!roomNumber) {
      toast.error(t("rm.roomNumberRequired"));
      return;
    }
    if (
      isDuplicateRoomNumber(
        roomNumber,
        editingId === "__new__" ? null : editingId
      )
    ) {
      toast.error(t("rm.duplicate", { n: roomNumber }));
      return;
    }

    const payload = {
      roomNumber,
      floor: normalize(draft.floor),
      label: normalize(draft.label),
      notes: normalize(draft.notes),
      active: !!draft.active,
    };

    try {
      setSaving(true);
      if (editingId === "__new__") {
        await createRoom(payload);
        toast.success(t("rm.added", { n: roomNumber }));
      } else {
        await updateRoom(editingId, payload);
        toast.success(t("rm.updated", { n: roomNumber }));
      }
      cancel();
      await loadRooms();
    } catch (error) {
      console.error(error);
      toast.error(t("rm.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (room) => {
    const ok = await confirm({
      title: t("rm.deleteTitle", { n: room.roomNumber }),
      body: t("rm.deleteBody"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteRoom(room.id);
      toast.info(t("rm.deleted", { n: room.roomNumber }));
      await loadRooms();
    } catch (error) {
      console.error(error);
      toast.error(t("rm.deleteFailed"));
    }
  };

  const toggleActive = async (room) => {
    try {
      await toggleRoomActive(room.id, !!room.active);
      toast.success(
        room.active
          ? t("rm.disabled", { n: room.roomNumber })
          : t("rm.enabled", { n: room.roomNumber })
      );
      await loadRooms();
    } catch (error) {
      console.error(error);
      toast.error(t("rm.toggleFailed"));
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rooms
      .filter((r) => {
        if (statusFilter === "active") return r.active === true;
        if (statusFilter === "inactive") return r.active === false;
        return true;
      })
      .filter((r) => {
        if (!q) return true;
        const hay = `${r.roomNumber || ""} ${r.floor || ""} ${r.label || ""} ${r.notes || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) =>
        String(a.roomNumber || "").localeCompare(
          String(b.roomNumber || ""),
          undefined,
          { numeric: true, sensitivity: "base" }
        )
      );
  }, [rooms, query, statusFilter]);

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="section-header">
          <div>
            <p className="eyebrow">{t("rm.eyebrow")}</p>
            <h1>{t("rm.title")}</h1>
          </div>
          <div className="actions">
            <span className="pill">
              {t("rm.count", { count: rooms.length })}
            </span>
            <button
              className="button"
              onClick={startNew}
              disabled={editingId === "__new__"}
            >
              {t("rm.addRoom")}
            </button>
          </div>
        </div>

        {editingId && (
          <form className="card" onSubmit={save} style={{ marginBottom: 18 }}>
            <h3 style={{ marginBottom: 12 }}>
              {editingId === "__new__" ? t("rm.newRoom") : t("rm.editRoom")}
            </h3>
            <div className="form-grid">
              <label>
                <span className="muted">{t("rm.roomNumber")}</span>
                <input
                  className="form-control"
                  autoFocus
                  placeholder="e.g. 204"
                  value={draft.roomNumber}
                  onChange={(e) =>
                    setDraft({ ...draft, roomNumber: e.target.value })
                  }
                />
              </label>
              <label>
                <span className="muted">{t("rm.floor")}</span>
                <input
                  className="form-control"
                  placeholder="e.g. 2"
                  value={draft.floor}
                  onChange={(e) =>
                    setDraft({ ...draft, floor: e.target.value })
                  }
                />
              </label>
              <label className="span-2">
                <span className="muted">{t("rm.label")}</span>
                <input
                  className="form-control"
                  placeholder="e.g. Deluxe King"
                  value={draft.label}
                  onChange={(e) =>
                    setDraft({ ...draft, label: e.target.value })
                  }
                />
              </label>
              <label className="span-2">
                <span className="muted">{t("rm.notes")}</span>
                <input
                  className="form-control"
                  placeholder="e.g. Conference suite"
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft({ ...draft, notes: e.target.value })
                  }
                />
              </label>
              <label>
                <span className="muted">{t("rm.statusField")}</span>
                <select
                  className="form-select"
                  value={draft.active ? "active" : "inactive"}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      active: e.target.value === "active",
                    })
                  }
                >
                  <option value="active">{t("rm.active")}</option>
                  <option value="inactive">{t("rm.inactive")}</option>
                </select>
              </label>
            </div>
            <div className="actions" style={{ marginTop: 14 }}>
              <button type="submit" className="button" disabled={saving}>
                {saving
                  ? t("common.saving")
                  : editingId === "__new__"
                  ? t("rm.create")
                  : t("common.save")}
              </button>
              <button
                type="button"
                className="button ghost"
                onClick={cancel}
                disabled={saving}
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        )}

        <div className="menu-toolbar" style={{ marginBottom: 12 }}>
          <input
            className="form-control"
            placeholder={t("rm.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("rm.search")}
          />
          <select
            className="form-select menu-sort"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={t("rm.statusField")}
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.key)}
              </option>
            ))}
          </select>
        </div>

        <div className="table-list">
          <div
            className="table-row"
            style={{
              background: "transparent",
              border: 0,
              color: "var(--muted)",
              fontSize: ".85rem",
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            <span>{t("rm.colRoom")}</span>
            <span>{t("rm.colFloor")}</span>
            <span>{t("rm.colStatus")}</span>
            <span></span>
          </div>

          {loading && (
            <div className="empty-state">{t("rm.loading")}</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              {rooms.length === 0
                ? t("rm.emptyNone")
                : t("rm.emptyFilter")}
            </div>
          )}

          {!loading &&
            filtered.map((room) => (
              <div className="table-row" key={room.id}>
                <div>
                  <strong>{t("room.room")} {room.roomNumber}</strong>
                  <div className="muted" style={{ fontSize: ".9rem" }}>
                    {room.label || room.notes || "—"}
                  </div>
                </div>
                <span className="pill neutral">{room.floor || "—"}</span>
                <span
                  className={`pill${room.active ? "" : " danger"}`}
                >
                  {room.active ? t("rm.active") : t("rm.inactive")}
                </span>
                <div className="actions">
                  <button
                    className="button ghost"
                    onClick={() => startEdit(room)}
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    className="button ghost"
                    onClick={() => setQrRoom(room)}
                  >
                    {t("rm.generateQr")}
                  </button>
                  <button
                    className="button ghost"
                    onClick={() => toggleActive(room)}
                  >
                    {room.active ? t("common.disable") : t("common.enable")}
                  </button>
                  <button
                    className="button danger"
                    onClick={() => remove(room)}
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </main>

      <RoomQrModal
        room={qrRoom}
        open={!!qrRoom}
        onClose={() => setQrRoom(null)}
      />
    </>
  );
}

export default RoomManagementPage;
