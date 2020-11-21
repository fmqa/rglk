import { EntityPosition, EntityImage, EntityMovement } from "./components";

/**
 * Entity event names
 */
export type EntityEvent = 'added' | 'deleted' | 'cleared';

/**
 * Entity interface
 */
export interface Entity {
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
     * Timer/periodic behavior
     * @param dt time elapsed since last frame
     */
    tick?(dt: number): boolean;

    /**
     * Turn action
     */
    action?(signal?: AbortSignal): Promise<void>;

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