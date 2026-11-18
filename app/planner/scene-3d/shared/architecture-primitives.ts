import { BoxGeometry, CircleGeometry, CylinderGeometry, PlaneGeometry, SphereGeometry, TextureLoader, TorusGeometry } from "three";
import { createRomanClockNumeralGeometry } from "../clock-numerals.ts";



export const SHARED_BOX = new BoxGeometry(1, 1, 1);


export const CLOCK_NUMERALS = createRomanClockNumeralGeometry();


export const SHARED_CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 24);


export const SHARED_CIRCLE = new CircleGeometry(0.5, 48);


export const SHARED_PLANE = new PlaneGeometry(1, 1);


export const SHARED_SPHERE = new SphereGeometry(0.5, 28, 18);


export const SHARED_TORUS = new TorusGeometry(0.5, 0.1, 12, 32);


export const SHARED_MIRROR_LED = new TorusGeometry(0.5, 0.026, 10, 48);


export const BALCONY_LOOP = new TorusGeometry(0.075, 0.011, 8, 18, Math.PI);


export const GLAZED_DOOR_CROSS_RAIL_Y_RATIO = -0.18;


export const VORRAUM_PLANT_TEXTURE = new TextureLoader().load("/planner-assets/textures/vorraum-wandpflanzgefaess.svg");
