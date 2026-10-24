import type { PlannerRoom } from "../domain/types.ts";

type RoomSelectorProps = {
  rooms: PlannerRoom[];
  activeRoomId: string | null;
  onChange(roomId: string | null): void;
};

export function RoomSelector({ rooms, activeRoomId, onChange }: RoomSelectorProps) {
  return (
    <label className="planner-room-selector">
      <span>Raum</span>
      <select
        aria-label="Raum"
        value={activeRoomId ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Gesamtwohnung</option>
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.name} · {room.area.toLocaleString("de-AT", { maximumFractionDigits: 2 })} m²
          </option>
        ))}
      </select>
    </label>
  );
}
