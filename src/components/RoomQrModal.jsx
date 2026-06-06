import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useToast } from "../context/ToastContext";

const buildRoomUrl = (room) =>
  `${window.location.origin}/?room=${encodeURIComponent(room.roomNumber)}${
    room.floor
      ? `&floor=${encodeURIComponent(room.floor)}`
      : ""
  }`;

function RoomQrModal({ room, open, onClose }) {
  const toast = useToast();
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  const url = room ? buildRoomUrl(room) : "";

  // Render the QR onto the canvas whenever the modal opens for a room.
  useEffect(() => {
    if (!open || !room || !canvasRef.current) return;

    let cancelled = false;
    setReady(false);

    QRCode.toCanvas(
      canvasRef.current,
      url,
      { width: 320, margin: 2 },
      (error) => {
        if (cancelled) return;
        if (error) {
          console.error("QR generation failed:", error);
          toast.error("Failed to generate QR code");
          return;
        }
        setReady(true);
      }
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, room?.id, url]);

  // Close on Escape for parity with other modals.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !room) return null;

  const fileSafe = (value) =>
    String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "room";

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) {
      toast.error("QR code not ready");
      return;
    }
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `room-${fileSafe(room.roomNumber)}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      toast.success("QR downloaded");
    } catch (error) {
      console.error("QR download failed:", error);
      toast.error("Download failed");
    }
  };

  const printQr = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) {
      toast.error("QR code not ready");
      return;
    }
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const container = document.createElement("div");
      container.className = "qr-print-area";
      container.innerHTML = `
        <div class="qr-print-card">
          <h2>Room ${escapeHtml(String(room.roomNumber ?? ""))}</h2>
          ${
            room.floor
              ? `<p>Floor ${escapeHtml(String(room.floor))}</p>`
              : ""
          }
          <img src="${dataUrl}" alt="Room QR" />
          <p class="qr-print-url">${escapeHtml(url)}</p>
          <p class="qr-print-hint">Scan to open the menu and place an order</p>
        </div>
      `;
      document.body.appendChild(container);
      document.body.classList.add("printing-qr");

      const cleanup = () => {
        document.body.classList.remove("printing-qr");
        if (container.parentNode) container.parentNode.removeChild(container);
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);

      window.print();

      // Fallback cleanup in case afterprint never fires (some browsers).
      setTimeout(cleanup, 1000);
    } catch (error) {
      console.error("QR print failed:", error);
      toast.error("Print failed");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-lg qr-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`QR code for Room ${room.roomNumber}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="qr-modal-head">
          <div>
            <h3 style={{ margin: 0 }}>Room {room.roomNumber}</h3>
            {room.floor && (
              <p className="muted" style={{ margin: "4px 0 0" }}>
                Floor {room.floor}
              </p>
            )}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="qr-canvas-wrap">
          <canvas ref={canvasRef} className="qr-canvas" />
        </div>

        <p className="qr-url" aria-live="polite">{url}</p>

        <div className="qr-actions">
          <button
            type="button"
            className="button"
            onClick={downloadPng}
            disabled={!ready}
          >
            Download PNG
          </button>
          <button
            type="button"
            className="button ghost"
            onClick={printQr}
            disabled={!ready}
          >
            Print
          </button>
          <button
            type="button"
            className="button ghost"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default RoomQrModal;
