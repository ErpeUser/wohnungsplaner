"use client";

import Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Circle, Ellipse, Group, Layer, Line, Path, Rect, Text, Transformer } from "react-konva";

import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
import { plannerAssetUrl } from "../catalog/asset-url.ts";
import type { CommandResult } from "../domain/commands.ts";
import type { PlannerDocumentV3, PlannerPlacement, Point2 } from "../domain/types.ts";
import type { SnapGuide } from "../domain/snapping.ts";
import { previewPlacementMove } from "./use-plan-interactions.ts";

type FurnitureLayerProps = {
  document: PlannerDocumentV3;
  activeRoomId: string | null;
  selectionId: string | null;
  onSelect(id: string | null): void;
  onMove(id: string, position: Point2, options?: { disableGrid?: boolean }): CommandResult | null;
  onResize(id: string, scaleX: number, scaleZ: number): CommandResult | null;
  onRotate(id: string, rotation: number, freeRotation?: boolean): CommandResult | null;
  onPreview?(guides: SnapGuide[], message: string | null): void;
};

export function FurnitureLayer(props: FurnitureLayerProps) {
  const placements = props.document.placements.filter(
    (placement) => !props.activeRoomId || placement.roomId === props.activeRoomId,
  );
  return (
    <Layer>
      {placements.map((placement) => (
        <FurnitureItem
          key={placement.id}
          placement={placement}
          document={props.document}
          selected={placement.id === props.selectionId}
          onSelect={props.onSelect}
          onMove={props.onMove}
          onResize={props.onResize}
          onRotate={props.onRotate}
          onPreview={props.onPreview}
        />
      ))}
    </Layer>
  );
}

function FurnitureItem({
  placement,
  document,
  selected,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onPreview,
}: {
  placement: PlannerPlacement;
  document: PlannerDocumentV3;
  selected: boolean;
  onSelect: FurnitureLayerProps["onSelect"];
  onMove: FurnitureLayerProps["onMove"];
  onResize: FurnitureLayerProps["onResize"];
  onRotate: FurnitureLayerProps["onRotate"];
  onPreview: FurnitureLayerProps["onPreview"];
}) {
  const groupRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const cancelledRef = useRef(false);
  const item = getFurnitureCatalogItem(placement.catalogId);
  const materialId = placement.materialVariants?.main;

  const fill = item?.materials.find((material) => material.id === materialId)?.color ?? "#b78d68";

  useEffect(() => {
    const transformer = transformerRef.current;
    const group = groupRef.current;
    if (!selected || !transformer || !group) return;
    transformer.nodes([group]);
    transformer.getLayer()?.batchDraw();
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const cancelInteraction = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const group = groupRef.current;
      if (!group || (!group.isDragging() && !transformerRef.current?.isTransforming())) return;
      cancelledRef.current = true;
      group.stopDrag();
      transformerRef.current?.stopTransform();
      group.position({ x: placement.position.x, y: placement.position.z });
      group.scale({ x: 1, y: 1 });
      group.rotation(placement.rotation);
      group.getLayer()?.batchDraw();
      onPreview?.([], null);
    };
    window.addEventListener("keydown", cancelInteraction);
    return () => window.removeEventListener("keydown", cancelInteraction);
  }, [onPreview, placement.position.x, placement.position.z, placement.rotation, selected]);

  const finishTransform = (event: Konva.KonvaEventObject<Event>) => {
    const node = event.target;
    const scaleX = node.scaleX();
    const scaleZ = node.scaleY();
    const rotation = node.rotation();
    const rotationChanged = Math.abs(rotation - placement.rotation) > 0.01;
    node.scale({ x: 1, y: 1 });
    node.position({ x: placement.position.x, y: placement.position.z });
    node.rotation(placement.rotation);
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    if (Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleZ - 1) > 0.01) {
      onResize(placement.id, scaleX, scaleZ);
    } else if (rotationChanged) {
      onRotate(placement.id, rotation, event.evt instanceof MouseEvent && event.evt.altKey);
    }
  };

  const canResize = item?.resize !== "fixed";
  return (
    <>
      <Group
        ref={groupRef}
        id={placement.id}
        data-testid={`furniture-${placement.id}`}
        x={placement.position.x}
        y={placement.position.z}
        rotation={placement.rotation}
        draggable
        onPointerDown={(event) => {
          event.cancelBubble = true;
          capturePlannerPointer(event);
        }}
        onPointerUp={(event) => releasePlannerPointer(event)}
        onPointerCancel={(event) => releasePlannerPointer(event)}
        onMouseDown={(event) => {
          event.cancelBubble = true;
          onSelect(placement.id);
        }}
        onTap={(event) => {
          event.cancelBubble = true;
          onSelect(placement.id);
        }}
        onDragStart={(event) => {
          event.cancelBubble = true;
          cancelledRef.current = false;
          onSelect(placement.id);
        }}
        onDragMove={(event) => {
          const preview = previewPlacementMove(
            document,
            placement,
            { x: event.target.x(), z: event.target.y() },
            { disableGrid: event.evt instanceof MouseEvent && event.evt.altKey },
          );
          event.target.position({ x: preview.position.x, y: preview.position.z });
          const hit = preview.report.hard[0] ?? preview.report.warnings[0];
          onPreview?.(preview.guides, hit?.message ?? null);
        }}
        onDragEnd={(event) => {
          event.cancelBubble = true;
          onPreview?.([], null);
          if (cancelledRef.current) {
            cancelledRef.current = false;
            event.target.position({ x: placement.position.x, y: placement.position.z });
            return;
          }
          const result = onMove(
            placement.id,
            { x: event.target.x(), z: event.target.y() },
            { disableGrid: event.evt instanceof MouseEvent && event.evt.altKey },
          );
          if (result?.error) event.target.position({ x: placement.position.x, y: placement.position.z });
        }}
        onTransformStart={() => { cancelledRef.current = false; }}
        onTransformEnd={finishTransform}
      >
        <FurnitureSymbol placement={placement} fill={fill} symbol={item?.symbol ?? "storage"} />
      </Group>
      {selected ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled
          resizeEnabled={canResize}
          enabledAnchors={canResize ? ["top-left", "top-right", "bottom-left", "bottom-right"] : []}
          keepRatio={item?.resize === "uniform"}
          borderStroke="#b85f32"
          borderStrokeWidth={0.025}
          anchorFill="#fffdf9"
          anchorStroke="#b85f32"
          anchorSize={0.13}
          rotateAnchorOffset={0.28}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => (
            Math.abs(newBox.width) < 0.12 || Math.abs(newBox.height) < 0.12 ? oldBox : newBox
          )}
        />
      ) : null}
    </>
  );
}

function capturePlannerPointer(event: Konva.KonvaEventObject<Event>) {
  const pointerId = (event.evt as Event & { pointerId?: number }).pointerId;
  const canvas = event.target.getStage()?.container();
  if (pointerId === undefined || !canvas || typeof canvas.setPointerCapture !== "function") return;
  try {
    canvas.setPointerCapture(pointerId);
  } catch {
    // Pointer capture can race with a cancelled browser gesture; dragging still
    // proceeds through Konva's own event stream in that case.
  }
}

function releasePlannerPointer(event: Konva.KonvaEventObject<Event>) {
  const pointerId = (event.evt as Event & { pointerId?: number }).pointerId;
  const canvas = event.target.getStage()?.container();
  if (pointerId === undefined || !canvas || typeof canvas.releasePointerCapture !== "function") return;
  try {
    if (canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
  } catch {
    // The pointer may already have been released by the browser.
  }
}

function FurnitureSymbol({
  placement,
  fill,
  symbol,
}: {
  placement: PlannerPlacement;
  fill: string;
  symbol: NonNullable<ReturnType<typeof getFurnitureCatalogItem>>["symbol"];
}) {
  const width = placement.size.width;
  const depth = placement.size.depth;
  const common = {
    x: -width / 2,
    y: -depth / 2,
    width,
    height: depth,
    fill,
    stroke: "#5f554b",
    strokeWidth: 0.025,
  };
  const materialId = placement.materialVariants?.main;

  if (placement.catalogId === "plant-zimmer1-olive") {
    return (
      <Group data-testid="plan-graphic-plant-zimmer1-olive">
        <Circle radius={Math.min(width, depth) * 0.46} fill="#c9b59a" stroke="#8f806d" strokeWidth={0.02} shadowColor="#635447" shadowBlur={0.04} shadowOpacity={0.22} shadowOffsetY={0.02} />
        <Circle radius={Math.min(width, depth) * 0.29} fill="#8b9a70" stroke="#607052" strokeWidth={0.018} />
        {[-0.34, -0.16, 0.05, 0.22, 0.36].map((x, index) => (
          <Line key={`olive-branch-${index}`} points={[0, 0, x * width, -depth * (0.27 + index % 2 * 0.08)]} stroke="#647453" strokeWidth={0.014} lineCap="round" />
        ))}
        {[-0.3, -0.12, 0.08, 0.24, 0.38].flatMap((x, index) => [
          <Circle key={`olive-leaf-a-${index}`} x={x * width} y={-depth * (0.3 + index % 2 * 0.08)} radius={Math.min(width, depth) * 0.085} fill={index % 2 ? "#7d8e65" : "#9aa87b"} />,
          <Circle key={`olive-leaf-b-${index}`} x={x * width * 0.72} y={-depth * (0.22 + index % 2 * 0.08)} radius={Math.min(width, depth) * 0.072} fill="#71835d" />,
        ])}
        <Text x={-width / 2} y={depth / 2 - 0.09} width={width} align="center" text="Olive · 110 cm" fontFamily="Arial" fontSize={0.06} fill="#39453b" listening={false} />
      </Group>
    );
  }

  if (placement.catalogId === "bed-bliss-120") {
    return (
      <Group data-testid="plan-graphic-bed-bliss-120">
        <Rect {...common} fill="#ddd1bd" stroke="#8f8070" strokeWidth={0.022} cornerRadius={0.08} shadowColor="#645647" shadowBlur={0.05} shadowOpacity={0.22} shadowOffsetY={0.025} />
        <Rect x={-width / 2 + 0.045} y={-depth / 2 + 0.045} width={width - 0.09} height={Math.min(0.28, depth * 0.2)} fill="#bba98f" cornerRadius={0.04} />
        <Rect x={-width * 0.37} y={-depth * 0.1} width={width * 0.3} height={depth * 0.28} fill="#f3eee5" cornerRadius={0.055} rotation={-2} />
        <Rect x={width * 0.07} y={-depth * 0.1} width={width * 0.3} height={depth * 0.28} fill="#f3eee5" cornerRadius={0.055} rotation={2} />
        <Line points={[-width * 0.43, depth * 0.28, width * 0.43, depth * 0.28]} stroke="#9d8c77" strokeWidth={0.022} />
        {[[-width * 0.39, depth * 0.36], [width * 0.39, depth * 0.36]].map(([x, y], index) => <Circle key={`bliss-foot-${index}`} x={x} y={y} radius={0.045} fill="#4d514f" />)}
        <Text x={-width / 2} y={depth / 2 - 0.11} width={width} align="center" text="Bliss · 120 × 200" fontFamily="Arial" fontSize={0.065} fill="#544c43" listening={false} />
      </Group>
    );
  }

  if (placement.catalogId === "sofa-aliexpress-142" || placement.catalogId === "sofa-aliexpress-142-open") {
    const extended = placement.catalogId === "sofa-aliexpress-142-open";
    return (
      <Group data-testid="plan-graphic-sofa-aliexpress-142">
        <Rect {...common} fill="#d8c8b6" stroke="#a49b8f" strokeWidth={0.02} cornerRadius={0.1} shadowColor="#706454" shadowBlur={0.05} shadowOpacity={0.2} />
        <Rect x={-width * 0.41} y={-depth * 0.45} width={width * 0.82} height={depth * 0.20} fill="#ded5c8" cornerRadius={0.055} />
        {[-0.25, 0.25].map((x, index) => (
          <Group key={index} x={x * width}>
            <Rect x={-width * 0.205} y={-depth * 0.22} width={width * 0.41} height={depth * (extended ? 0.30 : 0.51)} fill="#f8f4ee" stroke="#cbbfb2" strokeWidth={0.012} cornerRadius={0.06} />
            <Rect x={-width * 0.16} y={-depth * 0.21} width={width * 0.32} height={depth * 0.10} fill="#eae2d7" cornerRadius={0.035} />
            {extended ? <Rect x={-width * 0.205} y={depth * 0.1} width={width * 0.41} height={depth * 0.36} fill="#eee8df" stroke="#cbbfb2" strokeWidth={0.01} cornerRadius={0.05} /> : null}
          </Group>
        ))}
        {[-0.445, 0.445].map((x) => <Rect key={x} x={(x - 0.045) * width} y={-depth * 0.37} width={width * 0.09} height={depth * (extended ? 0.55 : 0.68)} fill="#e8dfd3" cornerRadius={0.045} />)}
        <Text x={-width / 2} y={depth / 2 - 0.085} width={width} align="center" text={extended ? "Relaxsofa · 172 cm" : "Relaxsofa · 142 cm"} fontFamily="Arial" fontSize={0.062} fill="#61564c" listening={false} />
      </Group>
    );
  }

  if (placement.catalogId === "sofa-chicago-206") {
    return (
      <Group data-testid="plan-graphic-sofa-chicago-206">
        <Rect {...common} fill="#d8d5cc" stroke="#7f7b73" strokeWidth={0.022} cornerRadius={0.12} shadowColor="#5f554b" shadowBlur={0.05} shadowOpacity={0.22} shadowOffsetY={0.025} />
        {[-0.24, 0.24].map((x, index) => (
          <Group key={`chicago-seat-${index}`} x={x * width}>
            <Rect x={-width * 0.21} y={-depth * 0.26} width={width * 0.42} height={depth * 0.54} fill="#e4e0d8" cornerRadius={0.09} />
            <Line points={[-width * 0.19, depth * 0.18, width * 0.19, depth * 0.18]} stroke="#b0aaa0" strokeWidth={0.018} />
          </Group>
        ))}
        <Line points={[0, -depth * 0.42, 0, depth * 0.36]} stroke="#aaa49b" strokeWidth={0.018} />
        {[[-width * 0.4, depth * 0.42], [width * 0.4, depth * 0.42]].map(([x, y], index) => <Circle key={`chicago-foot-${index}`} x={x} y={y} radius={0.045} fill="#252929" />)}
        <Text x={-width / 2} y={depth / 2 - 0.1} width={width} align="center" text="Chicago · 206 cm" fontFamily="Arial" fontSize={0.065} fill="#484947" listening={false} />
      </Group>
    );
  }

  if (placement.catalogId === "hallway-tejo-115") {
    return (
      <Group data-testid="plan-graphic-hallway-tejo-115">
        <Rect {...common} fill="#c9c0b4" stroke="#706960" strokeWidth={0.022} cornerRadius={0.035} shadowColor="#5e5349" shadowBlur={0.04} shadowOpacity={0.2} shadowOffsetY={0.02} />
        <Rect x={-width * 0.36} y={-depth * 0.41} width={width * 0.22} height={depth * 0.82} fill="#dce5e5" stroke="#778689" strokeWidth={0.014} />
        <Rect x={-width * 0.36} y={depth * 0.19} width={width * 0.72} height={depth * 0.2} fill="#b6a797" cornerRadius={0.025} />
        {[0.16, 0.34, 0.52, 0.7].map((ratio) => <Line key={ratio} points={[width * (ratio - 0.5), -depth * 0.38, width * (ratio - 0.5), depth * 0.12]} stroke="#8b8074" strokeWidth={0.014} />)}
        {[0.12, 0.28, 0.44, 0.6].map((x, index) => <Circle key={`tejo-hook-${index}`} x={width * (x - 0.5)} y={-depth * 0.12} radius={0.026} fill="#7b6d5d" />)}
        <Text x={-width / 2} y={depth / 2 - 0.085} width={width} align="center" text="Tejo · 115 cm" fontFamily="Arial" fontSize={0.06} fill="#4c4943" listening={false} />
      </Group>
    );
  }

  if (placement.catalogId === "vanity-vicco-sherry-120") {
    return (
      <Group data-testid="plan-graphic-vanity-vicco-sherry-120">
        <Rect {...common} fill="#f1eee7" stroke="#a49a8b" strokeWidth={0.022} cornerRadius={0.04} shadowColor="#67594f" shadowBlur={0.04} shadowOpacity={0.2} shadowOffsetY={0.02} />
        <Rect x={-width * 0.38} y={-depth * 0.4} width={width * 0.76} height={depth * 0.28} fill="#dce5e5" stroke="#c99a45" strokeWidth={0.026} cornerRadius={0.035} />
        {[-0.27, -0.09, 0.09, 0.27].map((x, index) => <Line key={`sherry-drawer-${index}`} points={[x * width, depth * 0.02, x * width, depth * 0.36]} stroke="#c5bbb0" strokeWidth={0.014} />)}
        <Line points={[-width * 0.39, depth * 0.16, width * 0.39, depth * 0.16]} stroke="#c99a45" strokeWidth={0.018} />
        <Text x={-width / 2} y={depth / 2 - 0.085} width={width} align="center" text="Sherry · 120 cm" fontFamily="Arial" fontSize={0.06} fill="#59524b" listening={false} />
      </Group>
    );
  }

  if (placement.catalogId === "chair-aliexpress-xuegw-1005012445521181") {
    return (
      <Group data-testid="plan-graphic-chair-aliexpress-xuegw-1005012445521181">
        {[0, 1, 2, 3, 4].map((index) => {
          const angle = index * 2 * Math.PI / 5 + Math.PI / 2;
          const x = Math.cos(angle) * width * 0.46;
          const y = Math.sin(angle) * depth * 0.46;
          return (
            <Group key={index}>
              <Line points={[0, 0, x, y]} stroke="#696962" strokeWidth={0.024} lineCap="round" />
              <Circle x={x} y={y} radius={0.02} fill="#3d3e3e" />
            </Group>
          );
        })}
        <Rect x={-width * 0.36} y={-depth * 0.32} width={width * 0.72} height={depth * 0.68} fill={fill} stroke="#8f867b" strokeWidth={0.018} cornerRadius={0.08} />
        <Rect x={-width * 0.29} y={-depth * 0.46} width={width * 0.58} height={depth * 0.23} fill={fill} stroke="#8f867b" strokeWidth={0.018} cornerRadius={0.06} />
      </Group>
    );
  }

  if (placement.catalogId === "chair-temu-executive-ivory") {
    return (
      <Group data-testid="plan-graphic-chair-temu-executive-ivory">
        <Circle radius={Math.min(width, depth) * 0.32} fill="#c6c8c5" stroke="#707672" strokeWidth={0.02} />
        <Rect {...common} fill="#e5ded4" stroke="#9c948a" strokeWidth={0.022} cornerRadius={0.12} />
        <Rect x={-width * 0.28} y={-depth * 0.44} width={width * 0.56} height={depth * 0.36} fill="#eee8df" stroke="#c4bbb0" strokeWidth={0.016} cornerRadius={0.1} />
        <Line points={[-width * 0.38, 0, width * 0.38, 0]} stroke="#b7aa9f" strokeWidth={0.018} />
        <Text x={-width / 2} y={depth / 2 - 0.08} width={width} align="center" text="Chefsessel" fontFamily="Arial" fontSize={0.055} fill="#5e574f" listening={false} />
      </Group>
    );
  }

  if (placement.catalogId === "nightstand-led-2drawer-white") {
    return (
      <Group data-testid="plan-graphic-nightstand-led-2drawer-white">
        <Rect {...common} fill="#f2f0ea" stroke="#9b9c96" strokeWidth={0.02} cornerRadius={0.025} shadowColor="#5d5348" shadowBlur={0.035} shadowOpacity={0.2} shadowOffsetY={0.018} />
        <Rect x={-width * 0.34} y={-depth * 0.36} width={width * 0.68} height={depth * 0.22} fill="#e7d8bd" opacity={0.9} stroke="#c99a45" strokeWidth={0.014} cornerRadius={0.02} />
        <Line points={[-width * 0.4, 0, width * 0.4, 0]} stroke="#9ca09b" strokeWidth={0.018} />
        <Line points={[-width * 0.4, depth * 0.26, width * 0.4, depth * 0.26]} stroke="#9ca09b" strokeWidth={0.018} />
        <Text x={-width / 2} y={depth / 2 - 0.065} width={width} align="center" text="LED-Nachtisch" fontFamily="Arial" fontSize={0.052} fill="#50534f" listening={false} />
      </Group>
    );
  }
  if (symbol === "plant" || symbol === "light") {
    return (
      <Group>
        <Circle radius={Math.min(width, depth) / 2} fill={fill} stroke="#52625a" strokeWidth={0.025} />
        {symbol === "plant" ? <Line points={[-width / 3, 0, width / 3, 0, 0, -depth / 3, 0, depth / 3]} stroke="#f4efe5" strokeWidth={0.025} /> : null}
      </Group>
    );
  }

  if (placement.catalogId.startsWith("dining-table-") && placement.catalogId !== "dining-table-bozan-110") {
    const extended = placement.metadata?.notes?.some((note) => /Zustand extended/i.test(note)) ?? false;
    const label = `${Math.round(width * 100)} × ${Math.round(depth * 100)} cm`;
    return (
      <Group data-testid="plan-graphic-table-comparison">
        <Ellipse radiusX={width / 2} radiusY={depth / 2} fill={fill} stroke="#5f554b" strokeWidth={0.025} />
        {extended ? <Line points={[0, -depth * 0.43, 0, depth * 0.43]} stroke="#8d603c" strokeWidth={0.018} dash={[0.06, 0.04]} /> : null}
        <Line points={[-width * 0.25, -depth * 0.22, width * 0.25, depth * 0.22]} stroke="#242728" strokeWidth={0.045} />
        <Line points={[width * 0.25, -depth * 0.22, -width * 0.25, depth * 0.22]} stroke="#242728" strokeWidth={0.045} />
        <Text x={-width / 2} y={-0.045} width={width} align="center" text={label} fontFamily="Arial" fontSize={0.08} fill="#30383a" listening={false} />
      </Group>
    );
  }

  if (placement.catalogId === "dining-table-bozan-110") {
    const radius = Math.min(width, depth) / 2;
    return (
      <Group>
        <Circle radius={radius} fill={fill} stroke="#5f554b" strokeWidth={0.025} />
        <Line points={[0, -radius * 0.92, 0, radius * 0.92]} stroke="#8d603c" strokeWidth={0.018} />
        <Line points={[-radius * 0.42, -radius * 0.42, radius * 0.42, radius * 0.42]} stroke="#242728" strokeWidth={0.055} />
        <Line points={[radius * 0.42, -radius * 0.42, -radius * 0.42, radius * 0.42]} stroke="#242728" strokeWidth={0.055} />
        <Text
          x={-radius}
          y={-0.055}
          width={radius * 2}
          align="center"
          text="Bozan 110"
          fontFamily="Arial"
          fontSize={0.095}
          fill="#30383a"
          listening={false}
        />
      </Group>
    );
  }

  if ([
    "chair-kaleo-chenille-beige",
    "chair-aliexpress-woltu-1005013095870024",
    "chair-temu-swivel-upholstered",
    "chair-temu-faux-leather-metal",
    "chair-temu-velvet-swivel-arm",
    "chair-amber-chenille-beige",
  ].includes(placement.catalogId)) {
    const woltu = placement.catalogId === "chair-aliexpress-woltu-1005013095870024";
    const isAmber = placement.catalogId === "chair-amber-chenille-beige";
    const isMetalLeg = placement.catalogId === "chair-temu-faux-leather-metal";
    const isVelvet = placement.catalogId === "chair-temu-velvet-swivel-arm";
    const footRadius = isAmber ? 0.325 : isMetalLeg ? 0.04 : isVelvet ? 0.28 : 0.25;
    const label = woltu ? "WOLTU" : isAmber ? "Amber" : isMetalLeg ? "Kunstleder" : isVelvet ? "Samt" : placement.catalogId === "chair-temu-swivel-upholstered" ? "Temu" : "Kaleo";
    return (
      <Group data-testid={`plan-graphic-chair-${label.toLowerCase()}`}>
        {isMetalLeg || woltu ? (
          <>
            {[-1, 1].flatMap((x) => [-1, 1].map((y) => (
              <Line key={`${x}-${y}`} points={[x * width * 0.34, y * depth * 0.2, x * width * 0.47, y * depth * 0.5]} stroke="#202525" strokeWidth={0.035} lineCap="round" />
            )))}
          </>
        ) : <Circle radius={footRadius} fill="#171a1a" stroke="#050606" strokeWidth={0.025} />}
        <Rect {...common} fill={woltu ? "#ded4c5" : isMetalLeg ? "#e9dfd2" : isVelvet ? "#cdbba9" : isAmber ? "#d6c4ad" : "#ddd2c2"} cornerRadius={0.15} />
        <Rect x={-width * 0.43} y={-depth * 0.34} width={width * 0.86} height={depth * 0.25} fill={isMetalLeg ? "#e1d4c5" : isVelvet ? "#c1ae9b" : isAmber ? "#ccb99f" : "#d1c3b0"} cornerRadius={0.08} />
        <Line points={[-width * 0.28, -depth * 0.3, -width * 0.28, -depth * 0.12]} stroke="#aa9a86" strokeWidth={0.012} />
        <Line points={[0, -depth * 0.3, 0, -depth * 0.12]} stroke="#aa9a86" strokeWidth={0.012} />
        <Line points={[width * 0.28, -depth * 0.3, width * 0.28, -depth * 0.12]} stroke="#aa9a86" strokeWidth={0.012} />
        <Text
          x={-width / 2}
          y={-0.045}
          width={width}
          align="center"
          text={label}
          fontFamily="Arial"
          fontSize={0.085}
          fill="#30383a"
          listening={false}
        />
      </Group>
    );
  }

  if (placement.catalogId === "vorraum-wall-decor") {
    const frameWidth = 0.48;
    const frameHeight = 0.62;
    return (
      <Group>
        <Rect x={-frameWidth / 2} y={-0.38} width={frameWidth} height={frameHeight} fill="#f2e6d5" stroke="#a7835f" strokeWidth={0.025} cornerRadius={0.018} />
        <Line points={[-0.14, -0.24, -0.08, -0.31, 0.02, -0.21, 0.11, -0.29]} stroke="#b38a63" strokeWidth={0.025} lineCap="round" lineJoin="round" />
        <Circle x={0.14} y={0.25} radius={0.125} fill="#ede4d5" stroke="#d0cbc0" strokeWidth={0.025} />
        <Circle x={0.12} y={0.22} radius={0.045} fill="#7c8f68" />
        <Circle x={0.17} y={0.27} radius={0.035} fill="#9aaa78" />
        <Line points={[0.13, 0.27, 0.09, 0.33, 0.16, 0.35, 0.2, 0.3]} stroke="#71845d" strokeWidth={0.018} lineCap="round" lineJoin="round" />
      </Group>
    );
  }

  if (placement.catalogId === "rug-temu-easy-line-120x180" || placement.catalogId === "rug-temu-easy-line-140x200") {
    const scaleX = width / 100;
    const scaleY = depth / 150;
    const variants: Record<string, { base: string; shapes: { data: string; fill: string; stroke?: string }[] }> = {
      "rug-hall-overlap-taupe": { base: "#c3b3a0", shapes: [
        { data: "M0 0H56C54 29 47 49 33 64C22 76 10 84 0 91Z", fill: "#9b8975" },
        { data: "M100 51V150H37C46 124 59 98 77 76C86 65 94 56 100 51Z", fill: "#d8cdbf" },
        { data: "M0 118C18 88 39 66 67 52C74 49 81 48 88 48C67 66 51 86 43 106C38 120 37 135 39 150H0Z", fill: "#cbbba7" },
        { data: "M-4 79C16 48 39 43 56 57C71 70 73 88 100 106", fill: "none", stroke: "#f6f0e8" },
        { data: "M-3 116C18 88 39 66 66 53C78 47 91 47 104 56", fill: "none", stroke: "#f6f0e8" },
      ]},
      "rug-temu-easy-line-colorblock": { base: "#eadfc7", shapes: [
        { data: "M0 0H39C33 12 25 23 12 34C8 38 4 41 0 43Z", fill: "#8ea69a" },
        { data: "M0 43C15 34 28 23 39 0H78C69 20 53 34 36 47C19 60 8 72 0 88Z", fill: "#e6d5ae" },
        { data: "M61 49C75 37 88 35 100 37V80C89 77 80 71 73 62Z", fill: "#91a89b" },
        { data: "M0 89C21 65 45 52 68 48C61 68 46 83 30 96C17 107 8 118 0 133Z", fill: "#f2ead9" },
        { data: "M51 89C68 78 88 80 100 92V126C82 119 65 115 48 116C40 107 42 97 51 89Z", fill: "#b79b72" },
        { data: "M68 123C82 116 94 120 100 127V150H63C58 141 59 130 68 123Z", fill: "#587b68" },
      ]},
      "rug-hall-soft-abstract": { base: "#e6ddca", shapes: [
        { data: "M0 22C20 5 39 10 45 31C50 52 37 71 14 79L0 82Z", fill: "#aeb8a5" },
        { data: "M100 31C77 38 68 55 70 76C73 96 84 110 100 117Z", fill: "#b8754f" },
        { data: "M0 102C25 83 47 82 65 96C78 107 77 130 62 150H0Z", fill: "#d1c4ab" },
        { data: "M43 0C58 24 56 48 39 64C28 75 27 91 38 106C51 123 51 137 45 150H74C87 126 86 103 72 86C60 72 59 56 71 39C81 25 83 12 79 0Z", fill: "#f1eadb" },
      ]},
      "rug-hall-beige-patchwork": { base: "#c6b8a1", shapes: [
        { data: "M0 0H36V48H0Z", fill: "#d7c6aa" }, { data: "M36 0H68V48H36Z", fill: "#baa98f" },
        { data: "M68 0H100V48H68Z", fill: "#d9cfbd" }, { data: "M0 48H50V101H0Z", fill: "#eee3ca" },
        { data: "M50 48H100V101H50Z", fill: "#b5a58e" }, { data: "M0 101H38V150H0Z", fill: "#cdbb9b" },
        { data: "M38 101H70V150H38Z", fill: "#e8ddc7" }, { data: "M70 101H100V150H70Z", fill: "#a99c88" },
        { data: "M8 48A28 28 0 0 1 36 20V48Z", fill: "#f1e6d1" }, { data: "M70 150A30 30 0 0 1 100 120V150Z", fill: "#eadfc8" },
      ]},
      "rug-hall-olive-lineart": { base: "#eee4c9", shapes: [
        { data: "M0 0H100V55C75 66 49 75 0 74Z", fill: "#f3ead3" },
        { data: "M0 32C30 20 54 30 67 58C49 68 25 75 0 74Z", fill: "#d8c8a8" },
        { data: "M39 150C49 115 66 89 100 68V150Z", fill: "#748f66" },
      ]},
    };
    const variant = variants[materialId ?? "rug-temu-easy-line-colorblock"] ?? variants["rug-temu-easy-line-colorblock"];
    const pattern = variant.shapes;
    return (
      <Group>
        <Rect {...common} fill={variant.base} stroke="#625f49" strokeWidth={0.018} cornerRadius={0.025} />
        <Group x={-width / 2} y={-depth / 2} scaleX={scaleX} scaleY={scaleY} listening={false}>
          {pattern.map((shape, index) => (
            <Path
              key={`temu-easy-line-${index}`}
              data={shape.data}
              fill={shape.fill}
              stroke={shape.stroke ?? (materialId === "rug-hall-olive-lineart" ? "#3f4035" : "#f8f1e5")}
              strokeWidth={0.65}
              lineJoin="round"
              lineCap="round"
              listening={false}
            />
          ))}
        </Group>
        <Rect {...common} fill="transparent" stroke="#625f49" strokeWidth={0.018} cornerRadius={0.025} listening={false} />
        <Text
          x={-width / 2}
          y={depth / 2 - 0.105}
          width={width}
          align="center"
          text={`Easy Line · ${Math.round(width * 100)} × ${Math.round(depth * 100)} cm`}
          fontFamily="Arial"
          fontStyle="bold"
          fontSize={0.061}
          fill="#474635"
          opacity={0.9}
          listening={false}
        />
      </Group>
    );
  }

  if (placement.catalogId === "rug-temu-rabbit-ivory-100x180") {
    const columns = 8;
    const rows = 14;
    const gap = Math.min(width, depth) * 0.025;
    const pad = Math.min(width, depth) * 0.045;
    const cellWidth = (width - pad * 2 - gap * (columns - 1)) / columns;
    const cellHeight = (depth - pad * 2 - gap * (rows - 1)) / rows;
    const bubbles = Array.from({ length: columns * rows }, (_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return {
        x: -width / 2 + pad + column * (cellWidth + gap),
        y: -depth / 2 + pad + row * (cellHeight + gap),
        light: (column + row) % 3 === 0,
      };
    });
    return (
      <Group>
        <Rect
          {...common}
          fill="#eee7da"
          stroke="#c9bdac"
          strokeWidth={0.018}
          cornerRadius={0.075}
          shadowColor="#8f7b65"
          shadowBlur={0.055}
          shadowOpacity={0.24}
          shadowOffsetY={0.025}
        />
        {bubbles.map((bubble, index) => (
          <Rect
            key={`temu-rabbit-plan-bubble-${index}`}
            x={bubble.x}
            y={bubble.y}
            width={cellWidth}
            height={cellHeight}
            cornerRadius={Math.min(cellWidth, cellHeight) * 0.38}
            fill={bubble.light ? "#fffaf0" : "#e8dfd1"}
            stroke={bubble.light ? "#fffdf8" : "#d5c9b8"}
            strokeWidth={0.008}
            shadowColor="#9b876f"
            shadowBlur={0.022}
            shadowOpacity={0.22}
            shadowOffsetY={0.012}
            listening={false}
          />
        ))}
        <Text
          x={-width / 2}
          y={depth / 2 - 0.105}
          width={width}
          align="center"
          text="Kunstkaninchen-Plüsch · Elfenbein · 100 × 180 cm"
          fontFamily="Arial"
          fontStyle="bold"
          fontSize={0.061}
          fill="#71614e"
          opacity={0.9}
          listening={false}
        />
      </Group>
    );
  }

  if (placement.catalogId === "rug-living-concept-240x240") {
    return <TemuVintageRugPlan width={width} depth={depth} />;
  }

  if (placement.catalogId === "rug-temu-shaggy-white-120x200") {
    const pileMarks = Array.from({ length: 14 }, (_, column) =>
      Array.from({ length: 22 }, (_, row) => {
        const x = -width / 2 + 0.06 + column * ((width - 0.12) / 13);
        const y = -depth / 2 + 0.06 + row * ((depth - 0.12) / 21);
        const sway = ((column * 5 + row * 7) % 5 - 2) * 0.008;
        return { x, y, sway, warm: (column + row * 3) % 11 === 0 };
      }),
    ).flat();
    return (
      <Group>
        <Rect
          {...common}
          fill="#f3efe7"
          stroke="#cfc8bd"
          strokeWidth={0.018}
          cornerRadius={0.055}
          shadowColor="#665d52"
          shadowBlur={0.045}
          shadowOpacity={0.2}
          shadowOffsetY={0.02}
        />
        <Rect
          x={-width / 2 + 0.025}
          y={-depth / 2 + 0.025}
          width={width - 0.05}
          height={depth - 0.05}
          fill="#f7f4ee"
          stroke="#fffdf8"
          strokeWidth={0.018}
          cornerRadius={0.045}
          opacity={0.92}
        />
        {pileMarks.map((mark, index) => (
          <Line
            key={`temu-white-plan-pile-${index}`}
            points={[
              mark.x - 0.018,
              mark.y + 0.012,
              mark.x + mark.sway,
              mark.y - 0.014,
              mark.x + 0.019,
              mark.y + 0.004,
            ]}
            stroke={mark.warm ? "#d9d2c7" : "#e5e0d7"}
            strokeWidth={0.009}
            lineCap="round"
            lineJoin="round"
            opacity={0.84}
            listening={false}
          />
        ))}
        <Text
          x={-width / 2}
          y={depth / 2 - 0.105}
          width={width}
          align="center"
          text="Fellteppich · Weiß · 120 × 200 cm"
          fontFamily="Arial"
          fontStyle="bold"
          fontSize={0.064}
          fill="#6b635b"
          opacity={0.82}
          listening={false}
        />
      </Group>
    );
  }

  if (placement.catalogId === "rug-gala-shaggy-2505-100x200") {
    const stripes = [
      { x: 0, y: 0.5, width: 0.25, height: 0.5, radius: 0.01 },
      { x: 0.25, y: 0.12, width: 0.1, height: 0.38, radius: 0.04 },
      { x: 0.35, y: 0.5, width: 0.3, height: 0.5, radius: 0.01 },
      { x: 0.65, y: 0, width: 0.3, height: 0.5, radius: 0.01 },
      { x: 0.95, y: 0.5, width: 0.1, height: 0.37, radius: 0.04 },
      { x: 1.05, y: 0, width: 0.3, height: 0.5, radius: 0.01 },
      { x: 1.35, y: 0.5, width: 0.3, height: 0.5, radius: 0.01 },
      { x: 1.65, y: 0.16, width: 0.1, height: 0.34, radius: 0.04 },
      { x: 1.75, y: 0.5, width: 0.25, height: 0.5, radius: 0.01 },
    ];
    const pileMarks = Array.from({ length: 17 }, (_, column) =>
      Array.from({ length: 9 }, (_, row) => {
        const x = -width / 2 + 0.07 + column * ((width - 0.14) / 16);
        const y = -depth / 2 + 0.07 + row * ((depth - 0.14) / 8);
        const inTaupe = stripes.some((stripe) => {
          const left = -width / 2 + stripe.x;
          const top = -depth / 2 + stripe.y;
          return x >= left && x <= left + stripe.width && y >= top && y <= top + stripe.height;
        });
        return { x, y, inTaupe, direction: (column + row) % 2 === 0 ? 1 : -1 };
      }),
    ).flat();
    return (
      <Group>
        <Rect {...common} fill="#eee9df" stroke="#cfc4b6" strokeWidth={0.018} cornerRadius={0.045} opacity={0.98} shadowColor="#5d5044" shadowBlur={0.035} shadowOpacity={0.16} shadowOffsetY={0.018} />
        <Rect x={-width / 2 + 0.025} y={-depth / 2 + 0.025} width={width - 0.05} height={depth - 0.05} stroke="#f8f4ed" strokeWidth={0.018} cornerRadius={0.035} opacity={0.8} />
        {stripes.map((stripe, index) => (
          <Rect
            key={`gala-plan-stripe-${index}`}
            x={-width / 2 + stripe.x}
            y={-depth / 2 + stripe.y}
            width={stripe.width}
            height={stripe.height}
            fill="#aa9b8e"
            cornerRadius={stripe.radius}
            opacity={0.92}
          />
        ))}
        {pileMarks.map((mark, index) => (
          <Line
            key={`gala-plan-pile-${index}`}
            points={[mark.x - 0.018, mark.y + 0.01 * mark.direction, mark.x + 0.018, mark.y - 0.01 * mark.direction]}
            stroke={mark.inTaupe ? "#c5b7aa" : "#ddd5ca"}
            strokeWidth={0.008}
            lineCap="round"
            opacity={0.72}
            listening={false}
          />
        ))}
        <Text x={-width / 2} y={depth / 2 - 0.11} width={width} align="center" text="Gala · 100 × 200 cm" fontFamily="Arial" fontStyle="bold" fontSize={0.075} fill="#62584e" opacity={0.78} listening={false} />
      </Group>
    );
  }

  return (
    <Group>
      <Rect {...common} cornerRadius={symbol === "sofa" ? 0.12 : symbol === "rug" ? 0.04 : 0.025} opacity={symbol === "rug" ? 0.62 : 1} />
      {symbol === "bed" ? <Rect x={-width / 2 + 0.08} y={-depth / 2 + 0.08} width={width - 0.16} height={Math.min(0.42, depth / 3)} fill="#eee7dc" cornerRadius={0.05} /> : null}
      {symbol === "sofa" ? <Line points={[-width / 2 + 0.12, 0, width / 2 - 0.12, 0]} stroke="#f2e9df" strokeWidth={0.035} /> : null}
      {symbol === "storage" && placement.catalogId !== "wardrobe-225" ? <Line points={[0, -depth / 2, 0, depth / 2]} stroke="#eee4d8" strokeWidth={0.018} /> : null}
      {placement.catalogId === "wardrobe-225" ? (
        <Group>
          {[-0.3, -0.1, 0.1, 0.3].map((ratio) => <Line key={ratio} points={[width * ratio, -depth / 2, width * ratio, depth / 2]} stroke="#9aa1a0" strokeWidth={0.018} />)}
          <Rect x={width * 0.1} y={-depth / 2 + 0.025} width={width * 0.19} height={depth - 0.05} fill="#b9cacc" opacity={0.76} stroke="#708083" strokeWidth={0.014} />
          {[[-0.09, 0.09], [0.31, 0.49]].flatMap(([start, end]) => [0.08, 0.2].map((offset) => <Line key={`${start}-${offset}`} points={[width * start, depth / 2 - offset, width * end, depth / 2 - offset]} stroke="#343b3b" strokeWidth={0.022} />))}
        </Group>
      ) : null}
      {placement.catalogId === "desk-standard" ? (
        <Group>
          <Rect x={-width / 2 + 0.035} y={-depth / 2 + 0.035} width={width * 0.23} height={depth - 0.07} fill="#eeece6" stroke="#9ba3a1" strokeWidth={0.018} />
          <Rect x={width / 2 - width * 0.23 - 0.035} y={-depth / 2 + 0.035} width={width * 0.23} height={depth - 0.07} fill="#eeece6" stroke="#9ba3a1" strokeWidth={0.018} />
        </Group>
      ) : null}
      {symbol === "chair" && placement.catalogId !== "chair-office" ? <Circle radius={Math.min(width, depth) * 0.26} fill="#efe8df" opacity={0.75} /> : null}
      {placement.catalogId === "chair-office" ? (
        <Group>
          <Circle radius={Math.min(width, depth) * 0.29} fill="#d99ca8" stroke="#8b626b" strokeWidth={0.018} />
          {[0, 72, 144, 216, 288].map((angle) => <Line key={angle} points={[0, 0, Math.cos(angle * Math.PI / 180) * width * 0.43, Math.sin(angle * Math.PI / 180) * depth * 0.43]} stroke="#eef0ec" strokeWidth={0.035} />)}
        </Group>
      ) : null}
      <Text
        x={-width / 2}
        y={-0.055}
        width={width}
        align="center"
        text={getFurnitureCatalogItem(placement.catalogId)?.name ?? placement.catalogId}
        fontFamily="Arial"
        fontSize={Math.min(0.1, width / 8)}
        fill="#30383a"
        listening={false}
      />
    </Group>
  );
}

/** Uses the same ornament artwork as the 3D surface; no repeating pattern or stock placeholder. */
function TemuVintageRugPlan({ width, depth }: { width: number; depth: number }) {
  const [art, setArt] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const image = new window.Image();
    image.onload = () => setArt(image);
    image.onerror = () => setArt(null);
    image.src = plannerAssetUrl("/planner-assets/textures/fabric/temu-vintage-rug-607199740937372.svg");
    return () => { image.onload = null; image.onerror = null; };
  }, []);
  return (
    <Group data-testid="plan-graphic-rug-living-concept-240x240">
      {/* The artwork is intentionally non-listening; keep a real hit area so
          the rug can still be selected and dragged in the 2D plan. */}
      <Rect
        x={-width / 2}
        y={-depth / 2}
        width={width}
        height={depth}
        fill="rgba(0,0,0,0.001)"
      />
      <Rect
        x={-width / 2}
        y={-depth / 2}
        width={width}
        height={depth}
        fill="#d8c7ae"
        fillPatternImage={art ?? undefined}
        fillPatternRepeat="no-repeat"
        fillPatternScaleX={art ? width / art.naturalWidth : 1}
        fillPatternScaleY={art ? depth / art.naturalHeight : 1}
        stroke="#c5b6a5"
        strokeWidth={0.016}
        cornerRadius={0.012}
        shadowColor="#695749"
        shadowBlur={0.045}
        shadowOpacity={0.18}
        shadowOffsetY={0.012}
        listening={false}
      />
      <Rect x={-width / 2 + 0.016} y={-depth / 2 + 0.016} width={width - 0.032} height={depth - 0.032} stroke="#faf5eb" strokeWidth={0.01} listening={false} />
    </Group>
  );
}
