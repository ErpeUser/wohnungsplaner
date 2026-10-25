"use client";

import Konva from "konva";
import { useEffect, useRef } from "react";
import { Circle, Group, Layer, Line, Rect, Text, Transformer } from "react-konva";

import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
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

  if (symbol === "plant" || symbol === "light") {
    return (
      <Group>
        <Circle radius={Math.min(width, depth) / 2} fill={fill} stroke="#52625a" strokeWidth={0.025} />
        {symbol === "plant" ? <Line points={[-width / 3, 0, width / 3, 0, 0, -depth / 3, 0, depth / 3]} stroke="#f4efe5" strokeWidth={0.025} /> : null}
      </Group>
    );
  }

  return (
    <Group>
      <Rect {...common} cornerRadius={symbol === "sofa" ? 0.12 : symbol === "rug" ? 0.04 : 0.025} opacity={symbol === "rug" ? 0.62 : 1} />
      {symbol === "bed" ? <Rect x={-width / 2 + 0.08} y={-depth / 2 + 0.08} width={width - 0.16} height={Math.min(0.42, depth / 3)} fill="#eee7dc" cornerRadius={0.05} /> : null}
      {symbol === "sofa" ? <Line points={[-width / 2 + 0.12, 0, width / 2 - 0.12, 0]} stroke="#f2e9df" strokeWidth={0.035} /> : null}
      {symbol === "storage" ? <Line points={[0, -depth / 2, 0, depth / 2]} stroke="#eee4d8" strokeWidth={0.018} /> : null}
      {symbol === "chair" ? <Circle radius={Math.min(width, depth) * 0.26} fill="#efe8df" opacity={0.75} /> : null}
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
