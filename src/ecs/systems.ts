import * as EventEmitter from "eventemitter3";
import Scheduler from "rot-js/lib/scheduler/scheduler";
import { CollisionError, EntityMovement, EntityPosition, MovementBuilder, OngoingError, Point } from "./components";
import { AsyncableEntityFn, Entity, EntityEvent, EntityPredicate } from "./entities";
import { EntityGrid } from "./grid";

export interface Updatable {
    /**
     * Run simulation subsystem
     * @param dt elapsed time since last frame
     */
    update(dt?: number): void;
}

function addToSystem(this: System, entity: Entity, src: System) {
    if (this !== src) {
        this.insert(entity);
    }
}

function deleteFromSystem(this: System, entity: Entity) {
    this.delete(entity);
}

function clearSystem(this: System) {
    this.clear();
}

/**
 * Subsystem template
 */
export abstract class System implements Updatable {
    constructor(public readonly emitter: EventEmitter<EntityEvent>) {
        this.emitter
            .on('added', addToSystem, this)
            .on('deleted', deleteFromSystem, this)
            .on('cleared', clearSystem, this);
    }

    /**
     * Supends message handling
     */
    detach() {
        this.emitter
            .off('added', addToSystem, this)
            .off('deleted', deleteFromSystem, this)
            .off('cleared', clearSystem, this);
    }

    /**
     * Resumes message handling 
     */
    attach() {
        this.detach();
        this.emitter
            .on('added', addToSystem, this)
            .on('deleted', deleteFromSystem, this)
            .on('cleared', clearSystem, this);
    }
    
    /**
     * Add entity to subsystem
     * @param entity Entity to add
     */
    abstract insert(entity: Entity): void;

    /**
     * Delete entity from subsystem
     * @param entity Entity to delete
     */
    abstract delete(entity: Entity): void;

    /**
     * Clear all managed entities
     */
    abstract clear(): void;

    /**
     * Run simulation subsystem
     * @param dt elapsed time since last frame
     */
    abstract update(dt?: number): void;
}

/**
 * Spatial event names
 */
export type SpatialEvent = 'collided' | 'moved';

/**
 * Spatial movement/query system
 */
export class SpatialSystem extends System implements MovementBuilder {
    /**
     * Set of entities with a nonzero movement vector
     */
    readonly movements = new Set<Entity>();

    /**
     * Spatial event bus
     */
    readonly events = new EventEmitter<SpatialEvent>();

    /**
     * Spatial system factory 
     * @param emitter entity event bus
     * @param grid entity grid
     */
    constructor(emitter: EventEmitter<EntityEvent>, public readonly grid: EntityGrid) {
        super(emitter);
    }

    insert(entity: Entity) {
        const position = this.grid.add(entity);
        if (position) {
            if (entity.movement) {
                this.movements.add(entity);
            } else {
                this.movements.delete(entity);
            }
        } else {
            this.movements.delete(entity);
        }
        return position;
    }

    delete(p: Entity | EntityPosition) {
        const ret = this.grid.delete(p);
        if (ret) {
            this.movements.delete(ret);
        }
    }

    clear() {
        this.grid.clear();
        this.movements.clear();
    }

    update(dt: number) {
        const c = new EntityPosition;
        this.movements.forEach(entity => {
            const {movement: m, position: p} = entity;
            if (m && p) {
                const dx = p.x - m.x;
                const dy = p.y - m.y;
                if (Math.abs(dx) + Math.abs(dy) > 0) {
                    // sx = +1 <=> right
                    // sx = -1 <=> left
                    const sx = Math.sign(m.x - p.x);
                    // sy = +1 <=> down
                    // sx = -1 <=> up
                    const sy = Math.sign(m.y - p.y);
                    // next position
                    const px = (sx > 0 ? Math.min : Math.max)(m.x, p.x + (m.alpha * sx * dt));
                    const py = (sy > 0 ? Math.min : Math.max)(m.y, p.y + (m.alpha * sy * dt));
                    // get collision candidate
                    c.x = sx > 0 ? Math.ceil(px) : Math.floor(px);
                    c.y = sy > 0 ? Math.ceil(py) : Math.floor(py);
                    c.z = p.z;
                    let other = this.grid.find(c);
                    // signal collision
                    if (other && other !== entity) {
                        this.events.emit('collided', entity, other);
                    } else {
                        other = undefined;
                    }
                    // re-check movement component, the collision
                    // handler may remove/change it which in this case
                    // would invalidate the above calculations
                    if (entity.movement === m) {
                        // reuse c to compute the spatial hash for
                        // the new position
                        c.x = p.x;
                        c.y = p.y;
                        // if the hash between new/old positions didn't change
                        // then we can avoid updating the data model by a
                        // delete-add pair
                        const change = c.hash() !== p.hash();
                        // do update
                        if (change) { this.grid.delete(p); }
                        p.x = px;
                        p.y = py;
                        if (change) { this.grid.add(entity); }
                        // notify observers
                        this.events.emit('moved', entity);
                    } else {
                        // if the movement is gone/changed, this
                        // movement is finished and won't be handled
                        // further, so call the done callback to signal
                        // this
                        m.done?.(entity, other);
                    }
                } else {
                    delete entity.movement;
                    this.movements.delete(entity);
                    m.done?.(entity);
                }
            } else {
                this.movements.delete(entity);
            }
        });
    }

    /**
     * Move an entity asynchronously (in a straight line)
     * @param entity entity to move
     * @param alpha speed factor
     * @param x target x coordinate
     * @param y target y coordinate
     */
    singleton(entity: Entity, alpha: number, x: number, y: number) {
        return new Promise<EntityMovement>((resolve, reject) => {
            if (this.movements.has(entity)) {
                reject(entity.movement ? new OngoingError(entity.movement) : new TypeError("Missing movement"));
            } else {
                function done(this: EntityMovement, _entity: Entity, other?: Entity) {
                    if (other) {
                        // if this callback is called with two arguments,
                        // the second argument is the entity our entity
                        // collided with
                        reject(new CollisionError(other));
                    } else {
                        // otherwise, we assume the movement was
                        // completed successfully
                        resolve(this);
                    }
                }
                // assign movement and add it to this system for
                // it to be performed.
                entity.movement = {x, y, alpha, done};
                if (!this.insert(entity)) {
                    reject(new TypeError("Missing position"));
                }
            }
        });
    }

    /**
     * Move an entity asynchronously through multiple points
     * @param entity entity to move
     * @param alpha speed
     * @param input iterable of waypoints
     * @param signal optional cancellation signal
     */
    async composite(entity: Entity, alpha: number, input: Iterable<Point>, signal?: AbortSignal) {
        let last;
        for (const [x, y] of input) {
            // do not process remaining waypoints if cancellation is signalled
            if (signal?.aborted) {
                break;
            }
            last = await this.singleton(entity, alpha, x, y);
        }
        return last;
    }
}

function render(this: DrawSystem, entity: Entity, _ignored: Entity, layer: Set<Entity>) {
    if (entity.image && entity.position && this.visible?.(entity)) {
        this.events.emit('drawn', entity, this);
    } else {
        layer.delete(entity);
    }
}

/**
 * Render event names
 */
export type DrawEvent = 'cleared' | 'drawn';

/**
 * Rendering system
 * 
 * This system ensures that the draw callback is always called for all entities
 * in the correct z-order
 */
export class DrawSystem extends System {
    /**
     * Layers containing entities to draw per layer
     */
    layers: Set<Entity>[] = [];

    /**
     * Draw event bus
     */
    readonly events = new EventEmitter<DrawEvent>();

    /**
     * Rendering system factory
     * @param emitter event bus
     * @param visible predicate indicating whether entity should be drawn
     */
    constructor(emitter: EventEmitter<EntityEvent>, public visible?: EntityPredicate) {
        super(emitter);
    }

    insert(entity: Entity) {
        if (entity.position && entity.image && this.visible?.(entity)) {
            (this.layers[entity.position.z] ??= new Set<Entity>()).add(entity);
        } else {
            this.layers.forEach(l => l.delete(entity));
        }
    }

    delete(entity: Entity) {
        this.layers.forEach(l => l.delete(entity));
    }

    clear() {
        this.layers = [];
    }
    
    update() {
        this.events.emit('cleared', this);
        this.layers.forEach(l => l.forEach(render, this));
    }
}

/**
 * System for executing entity timers
 */
export class TimerSystem extends System {
    readonly subjects = new Set<Entity>();

    insert(entity: Entity) {
        if (entity.tick) {
            this.subjects.add(entity)
        } else {
            this.subjects.delete(entity);
        }
    }

    delete(entity: Entity) {
        this.subjects.delete(entity);
    }

    clear() {
        this.subjects.clear();
    }

    update(dt: number): void {
        this.subjects.forEach(entity => entity.tick?.(dt) || this.subjects.delete(entity))
    }
}

export type TurnEvent = 'transitioned';

/**
 * Scheduling and action execution system
 */
export class TurnSystem extends System {
    /**
     * Entity being processed this turn
     */
    current?: Entity;

    /**
     * Set of entities already added to the scheduler
     */
    subjects = new WeakSet<Entity>();

    /**
     * Action cancellation tokens per entity 
     */
    cancellation = new WeakMap<Entity, AbortController>();

    /**
     * Turn event bus
     */
    readonly events = new EventEmitter<TurnEvent>();

    /**
     * Turn scheduler factory
     * @param emitter event bus
     * @param scheduler scheduler used for turn scheduling
     */
    constructor(emitter: EventEmitter<EntityEvent>, public scheduler: Scheduler<Entity>) {
        super(emitter);
    }

    insert(entity: Entity) {
        if (entity.action) {
            // the rot.js scheduler doesn't guard against duplicates
            // so this must be done by us
            if (!this.subjects.has(entity)) {
                this.scheduler.add(entity, true);
                this.subjects.add(entity);
            }
        } else {
            this.delete(entity);
        }
    }
    
    delete(entity: Entity) {
        this.scheduler.remove(entity);
        this.subjects.delete(entity);
        this.cancellation.delete(entity);
        if (entity === this.current) {
            delete this.current;
        }
    }
    
    clear() {
        this.scheduler.clear();
        delete this.current;
        this.subjects = new WeakSet;
        this.cancellation = new WeakMap;
    }
    
    update() {
        // don't do anything if we're already processing an entity. If not,
        // then get the next one from the scheduler
        if (!this.current && (this.current = this.scheduler.next())) {
            const current = this.current;
            if (current.action) {
                // Create cancellation controller
                const controller = new AbortController;
                this.cancellation.set(current, controller);
                // Async taskset
                const tasks = new Set<Promise<unknown>>();
                // Signal turn transition. In the second argument we provide
                // a runner that will call any passed closure with the current
                // entity -- if the closure is an async closure, we store the
                // returned promise in the taskset 
                this.events.emit('transitioned', (proc: AsyncableEntityFn) => {
                    const result = proc(current);
                    if (result instanceof Promise) {
                        tasks.add(result);
                    }
                });
                // Handler callback that switches to the next turn
                const completed = () => {
                    delete this.current;
                    this.cancellation.delete(current);
                };
                // Wait for all tasks that need to be performed before the
                // action is executed
                Promise.all(tasks).then(() => {
                    // run the action. When finished, advance the turn
                    current.action?.(controller.signal).finally(completed);
                }, completed);
            } else {
                this.delete(this.current);
            }
        }
    }
}