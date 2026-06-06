import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import RoomQrModal from "../../components/RoomQrModal";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
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
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const normalize = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
};

function RoomManagementPage() {
  const confirm = useConfirm();
  const toast = useToast();

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
      toast.error("Failed to load rooms");
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
      toast.error("Room number is required");
      return;
    }
    if (
      isDuplicateRoomNumber(
        roomNumber,
        editingId === "__new__" ? null : editingId
      )
    ) {
      toast.error(`Room ${roomNumber} already exists`);
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
        toast.success(`Added Room ${roomNumber}`);
      } else {
        await updateRoom(editingId, payload);
        toast.success(`Updated Room ${roomNumber}`);
      }
      cancel();
      await loadRooms();
    } catch (error) {
      console.error(error);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (room) => {
    const ok = await confirm({
      title: `Delete Room ${room.roomNumber}?`,
      body: "This room will be removed. Existing orders will keep their room information.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteRoom(room.id);
      toast.info(`Deleted Room ${room.roomNumber}`);
      await loadRooms();
    } catch (error) {
      console.error(error);
      toast.error("Delete failed");
    }
  };

  const toggleActive = async (room) => {
    try {
      await toggleRoomActive(room.id, !!room.active);
      toast.success(
        `Room ${room.roomNumber} ${room.active ? "disabled" : "enabled"}`
      );
      await loadRooms();
    } catch (error) {
      console.error(error);
      toast.error("Toggle failed");
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
            <p className="eyebrow">Provider administration</p>
            <h1>Rooms</h1>
          </div>
          <div className="actions">
            <span className="pill">
              {rooms.length} room{rooms.length === 1 ? "" : "s"}
            </span>
            <button
              className="button"
              onClick={startNew}
              disabled={editingId === "__new__"}
            >
              Add Room
            </button>
          </div>
        </div>

        {editingId && (
          <form className="card" onSubmit={save} style={{ marginBottom: 18 }}>
            <h3 style={{ marginBottom: 12 }}>
              {editingId === "__new__" ? "New Room" : "Edit Room"}
            </h3>
            <div className="form-grid">
              <label>
                <span className="muted">Room Number *</span>
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
                <span className="muted">Floor</span>
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
                <span className="muted">Label</span>
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
                <span className="muted">Notes</span>
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
                <span className="muted">Status</span>
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            <div className="actions" style={{ marginTop: 14 }}>
              <button type="submit" className="button" disabled={saving}>
                {saving
                  ? "Saving…"
                  : editingId === "__new__"
                  ? "Create"
                  : "Save"}
              </button>
              <button
                type="button"
                className="button ghost"
                onClick={cancel}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="menu-toolbar" style={{ marginBottom: 12 }}>
          <input
            className="form-control"
            placeholder="Search by room, floor, label…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search rooms"
          />
          <select
            className="form-select menu-sort"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter rooms by status"
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
            <span>Room / Label</span>
            <span>Floor</span>
            <span>Status</span>
            <span></span>
          </div>

          {loading && (
            <div className="empty-state">Loading rooms…</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              {rooms.length === 0
                ? "No rooms yet. Add the first room to get started."
                : "No rooms match the current search or filter."}
            </div>
          )}

          {!loading &&
            filtered.map((room) => (
              <div className="table-row" key={room.id}>
                <div>
                  <strong>Room {room.roomNumber}</strong>
                  <div className="muted" style={{ fontSize: ".9rem" }}>
                    {room.label || room.notes || "—"}
                  </div>
                </div>
                <span className="pill neutral">{room.floor || "—"}</span>
                <span
                  className={`pill${room.active ? "" : " danger"}`}
                >
                  {room.active ? "Active" : "Inactive"}
                </span>
                <div className="actions">
                  <button
                    className="button ghost"
                    onClick={() => startEdit(room)}
                  >
                    Edit
                  </button>
                  <button
                    className="button ghost"
                    onClick={() => setQrRoom(room)}
                  >
                    Generate QR
                  </button>
                  <button
                    className="button ghost"
                    onClick={() => toggleActive(room)}
                  >
                    {room.active ? "Disable" : "Enable"}
                  </button>
                  <button
                    className="button danger"
                    onClick={() => remove(room)}
                  >
                    Delete
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
