import * as EventEmitter from "eventemitter3";
import { EntityPosition } from "./components";
import { BiEntityPredicate, Entity, EntityEvent } from "./entities";

/**
 * Entity grid data structure
 */
export class EntityGrid {
    /**
     * Mapping of spatial hashes to entites
     */
    readonly data = new Map<number, Entity>();

    /**
     * Event bus
     */
    readonly events = new EventEmitter<EntityEvent>();
    
    /**
     * Place an entity on the grid
     * @param entity entity to be added
     * @returns the position of the entity
     */
    add(entity: Entity) {
        if (entity.position) {
            const key = entity.position.hash();
            if (!isNaN(key)) {
                // only attempt to set if the entity's
                // identity differs
                if (entity !== this.data.get(key)) {
                    this.data.set(key, entity);
                    this.events.emit('added', entity, this);
                }
            }
            return entity.position;
        }
    }

    /**
     * Deletes an entity from a position
     * @param arg an entity or position object
     * @returns the deleted entity, if any
     */
    delete(arg: EntityPosition | Entity) {
        if (arg instanceof EntityPosition) {
            const key = arg.hash();
            if (!isNaN(key)) {
                const entity = this.data.get(key);
                if (this.data.delete(key)) {
                    this.events.emit('deleted', entity, this);
                }
                return entity;
            }
        } else {
            if (arg.position) {
                const key = arg.position.hash();
                if (!isNaN(key)) {
                    if (this.data.delete(key)) {
                        this.events.emit('deleted', arg, this);
                    }
                }
            }
            return arg;
        }
    }

    /**
     * Clear all data
     */
    clear() {
        this.data.clear();
        this.events.emit('cleared', this);
    }

    /**
     * Obtains the entity at a given position
     * @param p position of the entity
     */
    find(p: EntityPosition) {
        const key = p.hash();
        if (!isNaN(key)) {
            return this.data.get(key);
        }
    }

    /**
     * Iterates over all entities in a subplane
     * @param x0 start x coordinate
     * @param y0 start y coordinate
     * @param z0 start z coordinate
     * @param x1 end x coordinate
     * @param y1 end y coordinate
     * @param z1 end z coordiate
     * @param cb callback to be called for every entity
     */
    select(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cb: (e: Entity) => void) {
        const p = new EntityPosition(x0, y0, z0);
        for (p.y = y0; p.y <= y1; p.y++) {
            for (p.x = x0; p.x <= x1; p.x++) {
                for (p.z = z0; p.z <= z1; p.z++) {
                    const key = p.hash();
                    if (!isNaN(key)) {
                        const entity = this.data.get(key);
                        if (entity) {
                            cb(entity);
                        }
                    }
                }
            }
        }
    }

    forEach(cb: (entity: Entity, key: number) => void) {
        this.data.forEach(cb);
    }
}

/**
 * Mapping function of layer index to entities
 */
export interface EntityByLayerFn {
    (z: number): Entity | undefined;
}

/**
 * Visit manhattan neighbors of the given point
 * @param grid entity grid
 * @param radius raidus of neigborhood
 * @param x x coordinate
 * @param y y coordinate
 * @param cb callback to called on each neighbor
 */
export function adjacent(grid: EntityGrid, radius: number, x: number, y: number, cb: (f: EntityByLayerFn) => void) {
    cb(z => grid.find(new EntityPosition(x, y, z)));
    if (radius > 0) {
        radius--;
        adjacent(grid, radius, x - 1, y, cb);
        adjacent(grid, radius, x, y - 1, cb);
        adjacent(grid, radius, x + 1, y, cb);
        adjacent(grid, radius, x, y + 1, cb);
    }
}

/**
 * Compute LBP (Local Binary Pattern) code 
 * @param grid entity grid
 * @param radius radius of neighborhood
 * @param x x coordinate
 * @param y y coordinate 
 * @param z z coordinate
 * @param op binary operation
 */
export function lbp(grid: EntityGrid, radius: number, x: number, y: number, z: number, op: BiEntityPredicate): number {
    let result = 0;
    let center: Entity | undefined;
    adjacent(grid, radius, x, y, f => {
        if (center) {
            const neighbor = f(z);
            result <<= 1;
            result |= neighbor && op(center, neighbor) ? 1 : 0;
        } else {
            center = f(z);
        }
    });
    return result;
}

/**
 * LBP-computing grid observer
 */
export class LBPObserver {
    /**
     * LBP codes of each grid entity
     */
    public readonly data = new WeakMap<Entity, number>();

    /**
     * Create and attach observer to grid
     * @param grid entity grid
     * @param op binary predicate
     * @param radius radius of LBP neighborhood
     */
    constructor(public readonly grid: EntityGrid, public op: BiEntityPredicate, public radius = 1) {
        this.grid.events
            .on('added', this.update, this)
            .on('deleted', this.deleted, this);
        this.populate();
    }

    protected deleted(entity: Entity) {
        this.data.delete(entity);
        const {x, y, z} = entity.position!;
        adjacent(this.grid, this.radius, x, y, f => {
            const x = f(z);
            if (x) {
                this.update(x);
            } 
        });
    }

    /**
     * Recomputes all LBP codes
     */
    populate() {
        this.grid.forEach(entity => this.update(entity));
    }

    /**
     * Computes and returns the LBP code for the given entity
     * @param entity entity to compute LBP code for
     */
    update(entity: Entity): number {
        const {x, y, z} = entity.position!;
        const code = lbp(this.grid, this.radius, x, y, z, this.op);
        this.data.set(entity, code);
        return code;
    }

    /**
     * Returns LBP code for the given entity
     * @param entity subject entity
     */
    get(entity: Entity): number {
        return this.data.get(entity) ?? 0;
    }

    /**
     * Resumes observing the grid
     */
    attach() {
        this.detach();
        this.grid.events
            .on('added', this.update, this)
            .on('deleted', this.deleted, this);
    }

    /**
     * Stops observing the grid
     */
    detach() {
        this.grid.events
            .off('added', this.update)
            .off('deleted', this.deleted);
    }
}