"use client";

import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Point = { x: number; y: number };
type RoomId = "zimmer1" | "vorraum";
type Opening = {
  kind: "door" | "window";
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};
type Room = {
  id: RoomId;
  name: string;
  area: string;
  subtitle: string;
  width: number;
  height: number;
  outline: Point[];
  openings: Opening[];
  facts: string[];
};

const catalog = {
  singleBed: { name: "Bett 90", w: 0.9, d: 2, h: 0.48, color: "#d9b99b" },
  doubleBed: { name: "Bett 160", w: 1.6, d: 2, h: 0.52, color: "#caa98e" },
  wardrobe: { name: "Kleiderschrank", w: 1.8, d: 0.6, h: 2.15, color: "#c4bcb0" },
  desk: { name: "Schreibtisch", w: 1.2, d: 0.6, h: 0.74, color: "#8fa6a0" },
  chair: { name: "Stuhl", w: 0.55, d: 0.55, h: 0.82, color: "#78928c" },
  dresser: { name: "Kommode", w: 0.9, d: 0.45, h: 0.82, color: "#c6a782" },
  tv: { name: "TV / Lowboard", w: 1.2, d: 0.4, h: 0.52, color: "#596166" },
  shelf: { name: "Regal", w: 0.8, d: 0.32, h: 1.9, color: "#b89b79" },
  shoe: { name: "Schuhschrank", w: 0.9, d: 0.28, h: 1.05, color: "#9ca7a0" },
  bench: { name: "Sitzbank", w: 1, d: 0.38, h: 0.46, color: "#bb8e67" },
  custom: { name: "Freies Möbel", w: 1, d: 0.6, h: 0.75, color: "#a79bbb" },
} as const;

type FurnitureKey = keyof typeof catalog;
type Furniture = {
  id: string;
  type: FurnitureKey;
  name: string;
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  rotation: number;
  color: string;
};

const rooms: Record<RoomId, Room> = {
  zimmer1: {
    id: "zimmer1",
    name: "Zimmer 1",
    area: "12,36 m²",
    subtitle: "Schlaf- / Arbeitszimmer",
    width: 3.56,
    height: 3.97,
    outline: [
      { x: 0, y: 0 },
      { x: 3.56, y: 0 },
      { x: 3.56, y: 3.97 },
      { x: 2.76, y: 3.97 },
      { x: 2.76, y: 3.33 },
      { x: 0, y: 3.33 },
    ],
    openings: [
      { kind: "window", label: "Fenster", x1: 3.56, y1: 0.7, x2: 3.56, y2: 2.35 },
      { kind: "door", label: "Tür 80", x1: 2.76, y1: 3.97, x2: 3.56, y2: 3.97 },
    ],
    facts: ["Breite 3,56 m", "Haupttiefe ca. 3,33 m", "Türnische ca. 0,80 × 0,64 m", "Fertigparkett"],
  },
  vorraum: {
    id: "vorraum",
    name: "Vorraum",
    area: "5,20 m²",
    subtitle: "Eingang und Verteiler",
    width: 2.26,
    height: 2.33,
    outline: [
      { x: 0, y: 0 },
      { x: 2.26, y: 0 },
      { x: 2.26, y: 2.33 },
      { x: 0, y: 2.33 },
    ],
    openings: [
      { kind: "door", label: "WC", x1: 0.08, y1: 0, x2: 0.88, y2: 0 },
      { kind: "door", label: "Abstellraum", x1: 1.38, y1: 0, x2: 2.18, y2: 0 },
      { kind: "door", label: "Wohnküche", x1: 2.26, y1: 0.78, x2: 2.26, y2: 1.58 },
      { kind: "door", label: "Bad", x1: 1.35, y1: 2.33, x2: 2.15, y2: 2.33 },
      { kind: "door", label: "Eingang", x1: 0, y1: 1.18, x2: 0, y2: 2.08 },
    ],
    facts: ["Ca. 2,26 × 2,33 m", "5 Türbereiche freihalten", "Feinsteinzeug", "Gegensprechanlage an Eingangswand"],
  },
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const makeFurniture = (type: FurnitureKey, room: Room, offset = 0): Furniture => {
  const item = catalog[type];
  return {
    id: createId(),
    type,
    name: item.name,
    w: item.w,
    d: item.d,
    h: item.h,
    color: item.color,
    x: Math.min(room.width - item.w / 2 - 0.08, room.width / 2 + offset),
    y: Math.min(room.height - item.d / 2 - 0.08, Math.min(1.65, room.height / 2) + offset),
    rotation: 0,
  };
};

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function itemCorners(item: Furniture) {
  const angle = (item.rotation * Math.PI) / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [-item.w / 2, -item.d / 2],
    [item.w / 2, -item.d / 2],
    [item.w / 2, item.d / 2],
    [-item.w / 2, item.d / 2],
  ].map(([x, y]) => ({ x: item.x + x * c - y * s, y: item.y + x * s + y * c }));
}

function isOutside(item: Furniture, room: Room) {
  return itemCorners(item).some((corner) => !pointInPolygon(corner, room.outline));
}

function aabb(item: Furniture) {
  const corners = itemCorners(item);
  return {
    left: Math.min(...corners.map((p) => p.x)),
    right: Math.max(...corners.map((p) => p.x)),
    top: Math.min(...corners.map((p) => p.y)),
    bottom: Math.max(...corners.map((p) => p.y)),
  };
}

function collides(item: Furniture, all: Furniture[]) {
  const a = aabb(item);
  return all.some((other) => {
    if (other.id === item.id) return false;
    const b = aabb(other);
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  });
}

function blocksDoor(item: Furniture, room: Room) {
  const box = aabb(item);
  return room.openings.filter((opening) => opening.kind === "door").some((opening) => {
    const vertical = opening.x1 === opening.x2;
    const clearance = vertical
      ? {
          left: opening.x1 === 0 ? 0 : room.width - 0.86,
          right: opening.x1 === 0 ? 0.86 : room.width,
          top: Math.min(opening.y1, opening.y2),
          bottom: Math.max(opening.y1, opening.y2),
        }
      : {
          left: Math.min(opening.x1, opening.x2),
          right: Math.max(opening.x1, opening.x2),
          top: opening.y1 === 0 ? 0 : room.height - 0.86,
          bottom: opening.y1 === 0 ? 0.86 : room.height,
        };
    return box.left < clearance.right && box.right > clearance.left && box.top < clearance.bottom && box.bottom > clearance.top;
  });
}

function ThreeRoom({ room, items, selectedId, onSelect }: { room: Room; items: Furniture[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f1eb);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(room.width * 1.65, 5.3, room.height * 1.45);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-label", `Interaktive 3D-Ansicht von ${room.name}`);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(room.width / 2, 0.55, -room.height / 2);
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 3;
    controls.maxDistance = 12;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x7d766b, 2.1));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-2, 7, 4);
    sun.castShadow = true;
    scene.add(sun);

    const shape = new THREE.Shape();
    room.outline.forEach((point, index) => (index === 0 ? shape.moveTo(point.x, point.y) : shape.lineTo(point.x, point.y)));
    shape.closePath();
    const floor = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshStandardMaterial({ color: room.id === "zimmer1" ? 0xb98d61 : 0xc9c7c0, roughness: 0.82 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(Math.max(room.width, room.height) + 1, Math.round((Math.max(room.width, room.height) + 1) * 2), 0x8e918e, 0xc8c9c5);
    grid.position.set(room.width / 2, 0.006, -room.height / 2);
    (grid.material as THREE.Material).opacity = 0.24;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.9, transparent: true, opacity: 0.9 });
    const wallHeight = 1.28;
    room.outline.forEach((point, index) => {
      const next = room.outline[(index + 1) % room.outline.length];
      const length = Math.hypot(next.x - point.x, next.y - point.y);
      if (room.id === "zimmer1" && point.y === 3.97 && next.y === 3.97) return;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(length, wallHeight, 0.1), wallMaterial);
      wall.position.set((point.x + next.x) / 2, wallHeight / 2, -(point.y + next.y) / 2);
      wall.rotation.y = -Math.atan2(next.y - point.y, next.x - point.x);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
    });

    room.openings.filter((opening) => opening.kind === "window").forEach((opening) => {
      const length = Math.hypot(opening.x2 - opening.x1, opening.y2 - opening.y1);
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(length, 0.9, 0.035),
        new THREE.MeshStandardMaterial({ color: 0x8cc9df, transparent: true, opacity: 0.45, roughness: 0.15 }),
      );
      glass.position.set((opening.x1 + opening.x2) / 2, 1.55, -(opening.y1 + opening.y2) / 2);
      glass.rotation.y = -Math.atan2(opening.y2 - opening.y1, opening.x2 - opening.x1);
      scene.add(glass);
    });

    const furnitureMeshes: THREE.Mesh[] = [];
    items.forEach((item) => {
      const geometry = new THREE.BoxGeometry(item.w, Math.max(0.12, item.h), item.d);
      const material = new THREE.MeshStandardMaterial({
        color: item.id === selectedId ? 0x274c52 : new THREE.Color(item.color),
        roughness: 0.68,
        emissive: item.id === selectedId ? 0x10282c : 0x000000,
        emissiveIntensity: item.id === selectedId ? 0.2 : 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(item.x, Math.max(0.12, item.h) / 2, -item.y);
      mesh.rotation.y = -(item.rotation * Math.PI) / 180;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.itemId = item.id;
      furnitureMeshes.push(mesh);
      scene.add(mesh);
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const chooseItem = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(furnitureMeshes, false)[0];
      if (hit?.object.userData.itemId) onSelect(hit.object.userData.itemId);
    };
    renderer.domElement.addEventListener("pointerdown", chooseItem);

    const resize = () => {
      const width = Math.max(320, mount.clientWidth);
      const height = Math.max(430, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let animationId = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", chooseItem);
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, [room, items, selectedId, onSelect]);

  return <div ref={mountRef} className="three-stage" />;
}

function FloorPlan({ room, items, selectedId, onSelect, onMove }: { room: Room; items: Furniture[]; selectedId: string | null; onSelect: (id: string) => void; onMove: (id: string, x: number, y: number) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const viewBox = `-0.48 -0.58 ${room.width + 0.96} ${room.height + 1.08}`;
  const polygon = room.outline.map((point) => `${point.x},${point.y}`).join(" ");

  const toSvgPoint = (event: ReactPointerEvent<SVGSVGElement | SVGGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM()?.inverse();
    return matrix ? point.matrixTransform(matrix) : null;
  };

  const startDrag = (event: ReactPointerEvent<SVGGElement>, item: Furniture) => {
    const point = toSvgPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: item.id, dx: point.x - item.x, dy: point.y - item.y };
    onSelect(item.id);
  };

  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const point = toSvgPoint(event);
    if (!point) return;
    onMove(drag.current.id, point.x - drag.current.dx, point.y - drag.current.dy);
  };

  return (
    <svg
      ref={svgRef}
      className="floor-svg"
      viewBox={viewBox}
      role="img"
      aria-label={`Möblierbarer Grundriss ${room.name}, ${room.area}`}
      onPointerMove={moveDrag}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <defs>
        <pattern id={`grid-${room.id}`} width="0.5" height="0.5" patternUnits="userSpaceOnUse">
          <path d="M .5 0 L 0 0 0 .5" fill="none" className="grid-line" strokeWidth="0.008" />
        </pattern>
        <filter id="item-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.025" stdDeviation="0.025" floodOpacity="0.18" />
        </filter>
      </defs>
      <polygon points={polygon} className={`room-floor ${room.id}`} />
      <polygon points={polygon} fill={`url(#grid-${room.id})`} className="grid-fill" />
      <polygon points={polygon} className="room-wall" />

      {room.openings.map((opening, index) => {
        const midX = (opening.x1 + opening.x2) / 2;
        const midY = (opening.y1 + opening.y2) / 2;
        const vertical = opening.x1 === opening.x2;
        return (
          <g key={`${opening.label}-${index}`}>
            <line x1={opening.x1} y1={opening.y1} x2={opening.x2} y2={opening.y2} className={`opening ${opening.kind}`} />
            {opening.kind === "door" && (
              <path
                d={vertical ? `M ${opening.x1} ${opening.y1} A .8 .8 0 0 1 ${opening.x1 - 0.8} ${opening.y1 + 0.8}` : `M ${opening.x1} ${opening.y1} A .8 .8 0 0 0 ${opening.x1 + 0.8} ${opening.y1 - 0.8}`}
                className="door-swing"
              />
            )}
            <text x={midX + (vertical ? 0.13 : 0)} y={midY + (vertical ? 0 : -0.13)} className="opening-label" textAnchor={vertical ? "start" : "middle"}>
              {opening.label}
            </text>
          </g>
        );
      })}

      <g className="dimension dim-width">
        <line x1="0" y1="-0.28" x2={room.width} y2="-0.28" />
        <line x1="0" y1="-0.36" x2="0" y2="-0.2" />
        <line x1={room.width} y1="-0.36" x2={room.width} y2="-0.2" />
        <text x={room.width / 2} y="-0.36" textAnchor="middle">{room.width.toFixed(2).replace(".", ",")} m</text>
      </g>
      <g className="dimension dim-height">
        <line x1="-0.26" y1="0" x2="-0.26" y2={room.height} />
        <line x1="-0.34" y1="0" x2="-0.18" y2="0" />
        <line x1="-0.34" y1={room.height} x2="-0.18" y2={room.height} />
        <text x="-0.34" y={room.height / 2} textAnchor="middle" transform={`rotate(-90 -.34 ${room.height / 2})`}>{room.height.toFixed(2).replace(".", ",")} m</text>
      </g>

      {items.map((item) => {
        const outside = isOutside(item, room);
        const overlap = collides(item, items);
        const doorConflict = blocksDoor(item, room);
        return (
          <g
            key={item.id}
            transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}
            className={`furniture ${item.id === selectedId ? "selected" : ""} ${outside || overlap || doorConflict ? "invalid" : ""}`}
            onPointerDown={(event) => startDrag(event, item)}
            role="button"
            aria-label={`${item.name}, ${item.w.toFixed(2)} mal ${item.d.toFixed(2)} Meter`}
          >
            <rect x={-item.w / 2} y={-item.d / 2} width={item.w} height={item.d} rx="0.06" fill={item.color} filter="url(#item-shadow)" />
            <line x1="0" y1={-item.d / 2} x2="0" y2={-item.d / 2 + Math.min(0.16, item.d / 3)} className="orientation-mark" />
            <text className="furniture-label" textAnchor="middle" dominantBaseline="middle">{item.name}</text>
            <text className="furniture-size" textAnchor="middle" y="0.16">{item.w.toFixed(2).replace(".", ",")} × {item.d.toFixed(2).replace(".", ",")}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Home() {
  const [roomId, setRoomId] = useState<RoomId>("zimmer1");
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [itemsByRoom, setItemsByRoom] = useState<Record<RoomId, Furniture[]>>({ zimmer1: [], vorraum: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const room = rooms[roomId];
  const items = itemsByRoom[roomId];
  const selected = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("wohnung-plan-v1");
      if (saved) setItemsByRoom(JSON.parse(saved));
    } catch {
      // An invalid old draft should never block the planner.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("wohnung-plan-v1", JSON.stringify(itemsByRoom));
  }, [itemsByRoom, hydrated]);

  useEffect(() => setSelectedId(null), [roomId]);

  const updateRoomItems = (recipe: (current: Furniture[]) => Furniture[]) => {
    setItemsByRoom((current) => ({ ...current, [roomId]: recipe(current[roomId]) }));
  };

  const addFurniture = (type: FurnitureKey) => {
    const created = makeFurniture(type, room, ((items.length % 3) - 1) * 0.18);
    updateRoomItems((current) => [...current, created]);
    setSelectedId(created.id);
  };

  const patchSelected = (patch: Partial<Furniture>) => {
    if (!selectedId) return;
    updateRoomItems((current) => current.map((item) => (item.id === selectedId ? { ...item, ...patch } : item)));
  };

  const moveItem = (id: string, x: number, y: number) => {
    updateRoomItems((current) => current.map((item) => (item.id === id ? { ...item, x, y } : item)));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    updateRoomItems((current) => current.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const copy = { ...selected, id: createId(), name: `${selected.name} Kopie`, x: selected.x + 0.18, y: selected.y + 0.18 };
    updateRoomItems((current) => [...current, copy]);
    setSelectedId(copy.id);
  };

  const loadPhotoEstimate = () => {
    if (roomId === "zimmer1") {
      const wardrobe = makeFurniture("wardrobe", room);
      const desk = makeFurniture("desk", room);
      const doubleBed = makeFurniture("doubleBed", room);
      const tv = makeFurniture("tv", room);
      wardrobe.x = 1.05; wardrobe.y = 3.01;
      desk.x = 3.2; desk.y = 1.25; desk.rotation = 90;
      doubleBed.x = 1.25; doubleBed.y = 1.35;
      tv.x = 2.95; tv.y = 2.7; tv.rotation = 90;
      updateRoomItems(() => [wardrobe, desk, doubleBed, tv]);
    } else {
      const shoe = makeFurniture("shoe", room);
      const bench = makeFurniture("bench", room);
      shoe.x = 0.22; shoe.y = 0.65; shoe.rotation = 90;
      bench.x = 1.35; bench.y = 2.07;
      updateRoomItems(() => [shoe, bench]);
    }
    setSelectedId(null);
  };

  const exportPlan = () => {
    const data = JSON.stringify({ version: 1, apartment: "Wohnung", rooms: itemsByRoom }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "wohnung-moeblierung.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importPlan = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.rooms?.zimmer1 && parsed.rooms?.vorraum) setItemsByRoom(parsed.rooms);
    } catch {
      window.alert("Diese Datei ist kein gültiger Wohnungsmodell-Plan.");
    }
    event.target.value = "";
  };

  const status = useMemo(() => {
    if (!selected) return null;
    if (isOutside(selected, room)) return "Möbel ragt über die Raumgrenze.";
    if (blocksDoor(selected, room)) return "Möbel blockiert den Türbereich.";
    if (collides(selected, items)) return "Möbel überschneiden sich.";
    return "Position ist innerhalb der Raumgrenze.";
  }, [selected, room, items]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="eyebrow">Wohnungsplanung</span>
          <h1>Raumplaner</h1>
        </div>
        <div className="top-actions">
          <button className="button quiet" onClick={() => setPlanOpen(true)}>Originalplan</button>
          <button className="button quiet" onClick={exportPlan}>Plan sichern</button>
          <button className="button quiet" onClick={() => importRef.current?.click()}>Plan laden</button>
          <input ref={importRef} hidden type="file" accept="application/json" onChange={importPlan} />
        </div>
      </header>

      <section className="room-strip" aria-label="Raum wählen">
        {(Object.values(rooms) as Room[]).map((choice) => (
          <button key={choice.id} className={`room-tab ${choice.id === roomId ? "active" : ""}`} onClick={() => setRoomId(choice.id)}>
            <span>{choice.name}</span>
            <strong>{choice.area}</strong>
          </button>
        ))}
        <div className="context-chip"><span>Gesamtwohnung</span><strong>59,49 m²</strong></div>
      </section>

      <section className="workspace">
        <aside className="sidebar library-panel">
          <div className="panel-heading">
            <span className="eyebrow">Möbelbibliothek</span>
            <h2>Einfügen</h2>
          </div>
          <div className="furniture-grid">
            {(Object.entries(catalog) as [FurnitureKey, (typeof catalog)[FurnitureKey]][]).map(([key, value]) => (
              <button key={key} className="furniture-choice" onClick={() => addFurniture(key)}>
                <span className="furniture-swatch" style={{ backgroundColor: value.color }} />
                <span><strong>{value.name}</strong><small>{value.w.toFixed(2).replace(".", ",")} × {value.d.toFixed(2).replace(".", ",")} m</small></span>
                <b aria-hidden="true">+</b>
              </button>
            ))}
          </div>
          <div className="preset-actions">
            <button className="button secondary" onClick={loadPhotoEstimate}>Bestand aus Fotos</button>
            <button className="button text-button" onClick={() => { updateRoomItems(() => []); setSelectedId(null); }}>Raum leeren</button>
          </div>
        </aside>

        <section className="canvas-panel">
          <div className="canvas-toolbar">
            <div>
              <span className="eyebrow">{room.subtitle}</span>
              <h2>{room.name} <em>{room.area}</em></h2>
            </div>
            <div className="view-toggle" role="group" aria-label="Ansicht">
              <button className={view === "2d" ? "active" : ""} onClick={() => setView("2d")}>2D Plan</button>
              <button className={view === "3d" ? "active" : ""} onClick={() => setView("3d")}>3D Raum</button>
            </div>
          </div>
          <div className={`plan-stage ${view}`}>
            {view === "2d" ? (
              <FloorPlan room={room} items={items} selectedId={selectedId} onSelect={setSelectedId} onMove={moveItem} />
            ) : (
              <ThreeRoom room={room} items={items} selectedId={selectedId} onSelect={setSelectedId} />
            )}
          </div>
          <div className="stage-footer">
            <span><i className="dot valid" /> innerhalb</span>
            <span><i className="dot invalid" /> Kollision / außerhalb</span>
            <p>{view === "2d" ? "Möbel direkt ziehen · Raster 50 cm" : "Ziehen zum Drehen · Scrollen zum Zoomen · Möbel anklicken"}</p>
          </div>
        </section>

        <aside className="sidebar detail-panel">
          {selected ? (
            <>
              <div className="panel-heading">
                <span className="eyebrow">Auswahl bearbeiten</span>
                <input className="name-input" value={selected.name} onChange={(event) => patchSelected({ name: event.target.value })} aria-label="Möbelname" />
              </div>
              <div className="field-grid">
                <label>Breite <span>m</span><input type="number" min="0.2" max="4" step="0.05" value={selected.w} onChange={(event) => patchSelected({ w: Number(event.target.value) })} /></label>
                <label>Tiefe <span>m</span><input type="number" min="0.2" max="4" step="0.05" value={selected.d} onChange={(event) => patchSelected({ d: Number(event.target.value) })} /></label>
                <label>Höhe <span>m</span><input type="number" min="0.1" max="3" step="0.05" value={selected.h} onChange={(event) => patchSelected({ h: Number(event.target.value) })} /></label>
                <label>Drehung <span>°</span><input type="number" min="-360" max="360" step="5" value={selected.rotation} onChange={(event) => patchSelected({ rotation: Number(event.target.value) })} /></label>
              </div>
              <label className="color-field">Farbe <input type="color" value={selected.color} onChange={(event) => patchSelected({ color: event.target.value })} /></label>
              <div className="rotation-row">
                <button className="button secondary" onClick={() => patchSelected({ rotation: selected.rotation - 45 })}>↶ 45°</button>
                <button className="button secondary" onClick={() => patchSelected({ rotation: selected.rotation + 45 })}>45° ↷</button>
              </div>
              <div className={`placement-status ${status?.includes("innerhalb") ? "ok" : "warning"}`}>{status}</div>
              <div className="item-actions">
                <button className="button secondary" onClick={duplicateSelected}>Duplizieren</button>
                <button className="button danger" onClick={deleteSelected}>Entfernen</button>
              </div>
            </>
          ) : (
            <>
              <div className="panel-heading">
                <span className="eyebrow">Planbasis</span>
                <h2>{room.name}</h2>
              </div>
              <ul className="facts">
                {room.facts.map((fact) => <li key={fact}>{fact}</li>)}
              </ul>
              <div className="analysis-note">
                <strong>Aus Plan + Medien rekonstruiert</strong>
                <p>Grundfläche und Raumform folgen dem Vermietungsplan; Tür- und Fensterlage wurde mit Fotos und Videos abgeglichen.</p>
              </div>
              <div className="assumption-note">
                <strong>Vor Ort prüfen</strong>
                <p>Wandstärken, Leibungen und Raumhöhe sind für die 3D-Vorschau angenähert. Vor Möbelkauf lichte Maße nachmessen.</p>
              </div>
            </>
          )}
        </aside>
      </section>

      {planOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPlanOpen(false)}>
          <div className="plan-modal" role="dialog" aria-modal="true" aria-label="Originaler Vermietungsplan" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head"><div><span className="eyebrow">Referenz</span><h2>Vermietungsplan Wohnung</h2></div><button className="close-button" onClick={() => setPlanOpen(false)} aria-label="Schließen">×</button></div>
            <img src="/reference-plan.png" alt="Originaler Vermietungsplan der Wohnung mit Zimmer 1 und Vorraum" />
          </div>
        </div>
      )}
    </main>
  );
}
