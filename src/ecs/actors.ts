import * as EventEmitter from "eventemitter3";
import { RNG } from "rot-js";
import AStar from "rot-js/lib/path/astar";
import { EntityImage, EntityPosition, EntityMovement, MovementBuilder, Point, CollisionError } from "./components";
import { BaseEntity, Entity } from "./entities";
import { ActionQueue, Timer } from "./mixins";

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
 * Timer-only entity for simple timed events
 */
export class TimerEntity implements Entity {
    /**
     * Task timer 
     */
    timer = new Timer;

    tick(dt: number) {
        return this.timer.tick(dt);
    }
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

    image: EntityImage = {tile: "\u{1F439}", fg: "white", bg: "transparent"};
    position = new EntityPosition(0, 0, 1);
    movement?: EntityMovement;

    /**
     * Movement speed
     */
    speed = 4;

    /**
     * Extra turn chance
     */
    extra: number = 0;

    /**
     * Event bus
     */
    events = new EventEmitter<'encored' | 'collided'>();

    async action() {
        // Delegate to queue first
        try {
            await this.queue.action();
        } catch (e) {
            if (e instanceof CollisionError) {
                this.events.emit('collided', e.object);
            } else {
                throw e;
            }
        }
        // Extra action behavior
        if (RNG.getUniform() < this.extra) {
            this.events.emit('encored', this);
            try {
                await this.queue.action();
            } catch (e) {
                if (e instanceof CollisionError) {
                    this.events.emit('collided', e.object)
                } else {
                    throw e;
                }
            }
        }
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
        if (this.movement) {
            const {x, y} = this.position;
            const sx = Math.sign(this.movement.x - x);
            const sy = Math.sign(this.movement.y - y);
            this.queue.cancel();
            const token = this.timer.defer(async (signal) => {
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
                this.queue.cancellation.delete(token);
            });
            this.queue.cancellation.add(token);
        }
    }
}

/**
 * Floor actor
 */
export class Floor implements Entity {
    image: EntityImage = {tile: " ", fg: "white"};
    position: EntityPosition;

    constructor(x: number, y: number) {
        this.position = new EntityPosition(x, y, 0);
    }
}

/**
 * Wall actor
 */
export class Wall implements Entity {
    image: EntityImage = {tile: "\u{1F9F1}", fg: "white"};
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

    image: EntityImage = {tile: "\u{1F9FB}", fg: "white"};
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
            this.image.tile = "\u{1F4A8}";
            await this.timer.sleep(1);
            this.operations.delete(this);
            callback?.(this);
        });
    }
}
