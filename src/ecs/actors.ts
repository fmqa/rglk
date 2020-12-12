import AStar from "rot-js/lib/path/astar";
import { EntityImage, EntityPosition, EntityMovement, MovementBuilder, Point } from "./components";
import { Entity } from "./entities";
import { ActionQueue, ProbabalisticActionDispatcher, Timer } from "./helpers";

/**
 * Entity operations facade
 */
export interface EntityOperations {
    add(entity: Entity): void;
    delete(entity: Entity): void;
    find(position: EntityPosition): Entity | undefined;
    movement: MovementBuilder;
}

/**
 * Hamster actor template
 */
export abstract class HamsterTemplate implements Entity {
    /**
     * Reference to entity operation provider
     */
    protected abstract operations: EntityOperations;

    /**
     * Action queue
     */
    queue = new ActionQueue;

    /**
     * Task timer
     */
    timer = new Timer;

    image: EntityImage = {tile: "ACOLYTE"};
    position = new EntityPosition(0, 0, 1);
    movement?: EntityMovement;

    /**
     * Movement speed
     */
    speed = 4;

    /**
     * Turn chances
     */
    pad = new ProbabalisticActionDispatcher(this.queue, [1, 0])

    protected shaking?: AbortController;

    action() {
        return this.pad.action();
    }

    tick(dt: number) {
        return this.timer.tick(dt);
    }

    /**
     * Enqueue a movement action
     * @param x target x coordinate
     * @param y target y coordinate
     */
    navigate(x: number, y: number) {
        if (this.shaking) {
            this.shaking.abort();
            delete this.shaking;
        }
        this.queue.cancel();
        const astar = new AStar(x, y, (x, y) => !this.operations.find(new EntityPosition(x, y, this.position.z))?.obstacle, {topology: 4});
        const waypoints: Point[] = [];
        astar.compute(Math.round(this.position.x), Math.round(this.position.y), (x, y) => waypoints.push([x, y]));
        this.queue.push(signal => this.operations.movement.composite(this, this.speed, waypoints, signal));
    }

    /**
     * Start a "shake" animation
     */
    shake() {
        if (!this.shaking && this.movement) {
            const {x, y} = this.position;
            const sx = Math.sign(this.movement.x - x);
            const sy = Math.sign(this.movement.y - y);
            this.shaking = this.timer.defer(async (signal) => {
                for (let i = 0; i < 12; i++) {
                    if (signal.aborted) {
                        break;
                    }
                    this.position.x += -sx / 100;
                    this.position.y += -sy / 100;
                    await this.timer.sleep(0.01);
                }
                this.position.x = x;
                this.position.y = y;
            });
        }
    }

    get extra() {
        return this.pad.proba[1]!;
    }

    set extra(value: number) {
        this.pad.proba[1] = value;
    }
}

/**
 * Floor actor
 */
export class Floor implements Entity {
    image: EntityImage = {tile: "", fg: "white"};
    position: EntityPosition;

    constructor(x: number, y: number) {
        this.position = new EntityPosition(x, y, 0);
    }
}

/**
 * Wall actor
 */
export class Wall implements Entity {
    image: EntityImage = {tile: "W0", fg: "white"};
    position: EntityPosition;
    obstacle = true;

    constructor(x: number, y: number) {
        this.position = new EntityPosition(x, y, 1);
    }
}

/**
 * Money item template
 */
export abstract class MoneyTemplate implements Entity {
    /**
     * Reference to entity operation provider
     */
    protected abstract operations: EntityOperations;

    /**
     * Task timer
     */
    timer = new Timer;

    image: EntityImage = {tile: "COINS", fg: "white"};
    position: EntityPosition;

    constructor(x: number, y: number) {
        this.position = new EntityPosition(x, y, 1);
    }

    tick(dt: number) {
        return this.timer.tick(dt);
    }

    /**
     * Start a "consumed" animation and remove this actor afterwards
     * @param z layer to move actor to
     * @param callback callback to call when the task is finished
     */
    consumed(z: number, callback?: (entity: this) => void) {
        // update z layer
        this.operations.delete(this);
        this.position.z = z;
        this.operations.add(this);
        // trigger animation
        this.timer.defer(async () => {
            this.image.tile = "SPIRAL";
            await this.timer.sleep(1);
            this.operations.delete(this);
            callback?.(this);
        });
    }
}
