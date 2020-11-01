import { EntityFn } from "./entities";
import { EntityGrid } from "./grid";

/**
 * Camera coordinate translation
 */
export class Camera {
    /**
     * Factory for camera objects 
     * @param grid entity grid
     * @param r camera radius
     * @param w max. world width
     * @param h max. world height
     * @param d max. world depth
     * @param x initial x position
     * @param y initial y position
     */
    constructor(
        public grid?: EntityGrid,
        public r: number = 0,
        public w: number = 0,
        public h: number = 0,
        public d: number = 0,
        public x: number = 0,
        public y: number = 0) { }
    
    /**
     * Iterate over all entities in the camera's view
     * @param cb callback to be called on each entity
     */
    select(cb: EntityFn) {
        const {r, x, y, d, w, h} = this;
        this.grid?.select(Math.max(0, x - r), Math.max(0, y - r), 0,
                          Math.min(w, x + r), Math.min(h, y + r), d,
                          cb);
    }

    /**
     * Returns the chebyshev distance between the camera and the given coordinates
     * @param x x coordinate
     * @param y y coordinate
     */
    distance(x: number, y: number) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.max(Math.abs(dx), Math.abs(dy));
    }

    /**
     * Returns whether the given coordiates are in the camera's field of view
     * @param x x coordinate
     * @param y y coordinate
     */
    visible(x: number, y: number) {
        return this.distance(x, y) <= this.r;
    }
    
    /**
     * Adjust the camera's focus so that the given coordinates are inside the field of view
     * @param x x coordinate
     * @param y y coordinate
     */
    focus(x: number, y: number) {
        const dx = x - this.x;
        const dy = y - this.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= this.r / 2) {
            this.x += Math.sign(dx) * Math.max(Math.abs(dx) - this.r / 2, 0);
            this.y += Math.sign(dy) * Math.max(Math.abs(dy) - this.r / 2, 0);
            return true;
        } else {
            return false;
        }
    }

    /**
     * World X to screen X
     * @param x x coordinate
     */
    wtosx(x: number) {
        return x - this.x + this.r;
    }

    /**
     * World Y to screen Y
     * @param y y coordinate
     */
    wtosy(y: number) {
        return y - this.y + this.r;
    }

    /**
     * Screen X to world X
     * @param x x coordinate
     */
    stowx(x: number) {
        return x + this.x - this.r;
    }

    /**
     * Screen Y to world Y
     * @param y y coordinate
     */
    stowy(y: number) {
        return y + this.y - this.r;
    }
}
