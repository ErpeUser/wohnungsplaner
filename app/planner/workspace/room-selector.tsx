import type { PlannerRoom } from "../domain/types.ts";

type RoomSelectorProps = {
  rooms: PlannerRoom[];
  activeRoomId: string | null;
  onChange(roomId: string | null): void;
};

export function RoomSelector({ rooms, activeRoomId, onChange }: RoomSelectorProps) {
  const interiorRooms = rooms.filter((room) => room.id !== "balkon");
  const outdoorRooms = rooms.filter((room) => room.id === "balkon");
  return (
    <label className="planner-room-selector">
      <span>Raum</span>
      <select
        aria-label="Raum"
        value={activeRoomId ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Gesamtwohnung</option>
        <optgroup label="Innenräume">
          {interiorRooms.map((room) => <RoomOption key={room.id} room={room} />)}
        </optgroup>
        <optgroup label="Außenbereich">
          {outdoorRooms.map((room) => <RoomOption key={room.id} room={room} />)}
        </optgroup>
      </select>
    </label>
  );
}

function RoomOption({ room }: { room: PlannerRoom }) {
  return (
    <option value={room.id}>
      {room.name} · {room.area.toLocaleString("de-AT", { maximumFractionDigits: 2 })} m²
    </option>
  );
}
