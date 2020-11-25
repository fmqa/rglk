import { EntityPosition, EntityImage, EntityMovement } from "./components";

/**
 * Entity event names
 */
export type EntityEvent = 'added' | 'deleted' | 'cleared';

/**
 * Periodic activity to be performed on every tick
 */
export interface Periodic {
    /**
     * Timer/periodic behavior
     * @param dt time elapsed since last frame
     */
    tick(dt: number): boolean;
}

/**
 * Asynchronous actor
 */
export interface Actor {
    /**
     * Turn action
     * @param signal cancellation token
     */
    action(signal?: AbortSignal): Promise<void>;
}

/**
 * Entity interface
 */
export interface Entity extends Partial<Periodic>, Partial<Actor> {
    /**
     * Movement component
     */
    movement?: EntityMovement;
    
    /**
     * Position component
     */
    position?: EntityPosition;

    /**
     * Image component
     */
    image?: EntityImage;

    /**
     * Obstacle flag
     */
    obstacle?: boolean;
}

/**
 * Operation performed on an entity
 */
export interface EntityFn {
    (entity: Entity): void;
}

/**
 * Possibly asynchronous operation performed on an entity
 */
export interface AsyncableEntityFn {
    (entity: Entity): undefined | Promise<void>;
}

/**
 * Runner of async/non-async entity operations
 */
export interface AsyncableEntityFnRunner {
    (func: AsyncableEntityFn): void;
}

/**
 * Predicate taking a single entity as an argument
 */
export interface EntityPredicate {
    (entity: Entity): boolean;
}

/**
 * Predicate taking a pair of entities as arguments
 */
export interface BiEntityPredicate {
    (a: Entity, b: Entity): boolean;
}

/**
 * Wrapped action function
 */
export interface EntityAction {
    (signal?: AbortSignal): Promise<any>;
}
