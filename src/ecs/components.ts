import { Entity } from "./entities";

/**
 * Type alias for a numeric pair
 */
export type Point = [x: number, y: number];

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
 * Sprite image data
 */
export interface EntityImage {
    tile: string;
    fg?: string;
    bg?: string;
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
 * Abstract movement error
 */
export abstract class MovementError extends Error {
}

/**
 * Collision error
 */
export class CollisionError extends MovementError {
    constructor(readonly object: Entity, message: string = "Collision error") {
        super(message);
    }
}

/**
 * Ongoing/uninterruptible movement error
 */
export class OngoingError extends MovementError {
    constructor(readonly movement: EntityMovement, message: string = "Movement in progress") {
        super(message);
    }
}

/**
 * Movement constructor
 */
export interface MovementBuilder {
    singleton(entity: Entity, alpha: number, x: number, y: number): Promise<EntityMovement>;
    composite(entity: Entity, alpha: number, input: Iterable<Point>, signal?: AbortSignal): Promise<EntityMovement | undefined>;
}
