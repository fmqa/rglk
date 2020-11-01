import { Entity } from "./entities";

/**
 * Sprite position wrapper
 */
export class EntityPosition {
    /**
     * 
     * @param x x coordinate
     * @param y y coordinate
     * @param z z order
     */
    constructor(public x: number = 0, public y: number = 0, public z: number = 0) { }

    /**
     * Returns a compressed representation of this object's coordinates. This
     * operation is only defined for the following value ranges
     * x: 0..16777215, y: 0..16777215, z: 0..255
     */
    hash() {
        let {x, y, z} = this;
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || y < 0 || z < 0 || x > 0xffffff || y > 0xffffff || z > 0xff) {
            return NaN;
        }
        return ((z & 0xff) << 48) | ((y & 0xffffff) << 24) | (x & 0xffffff);
    }
}

/**
 * Target position vector
 */
export interface EntityMovement {
    x: number;
    y: number;
    alpha: number;
    done?(entity: Entity, other?: Entity): void;
}

/**
 * Sprite image data
 */
export interface EntityImage {
    tile: string;
    fg?: string;
    bg?: string;
}
