import AStar from "rot-js/lib/path/astar";
import { EntityImage, EntityPosition, EntityMovement, MovementBuilder, Point } from "./components";
import { BaseEntity, Entity } from "./entities";
import { EntityActionQueueMixin, EntityTimerMixin } from "./mixins";

/**
 * Entity operations facade
 */
export interface EntityOperations {
    add(entity: Entity): void;
    delete(entity: Entity): void;
    find(position: EntityPosition): Entity | undefined;
    movement: MovementBuilder;
}

export abstract class HamsterTemplate extends EntityTimerMixin(EntityActionQueueMixin(BaseEntity)) {
    protected abstract operations: EntityOperations;

    image: EntityImage = {tile: "\u{1F439}", fg: "white", bg: "transparent"};
    position = new EntityPosition(0, 0, 1);
    movement?: EntityMovement;
    speed = 4;

    navigate(x: number, y: number) {
        this.queue.cancel();
        const astar = new AStar(x, y, (x, y) => !this.operations.find(new EntityPosition(x, y, this.position.z))?.obstacle, {topology: 4});
        const waypoints: Point[] = [];
        astar.compute(Math.round(this.position.x), Math.round(this.position.y), (x, y) => waypoints.push([x, y]));
        this.queue.push(signal => this.operations.movement.composite(this, this.speed, waypoints, signal));
    }

    shake() {
        if (this.movement) {
            const {x, y} = this.position;
            const sx = Math.sign(this.movement.x - x);
            const sy = Math.sign(this.movement.y - y);
            this.queue.cancel();
            const token = this.timer.defer(async (signal) => {
                for (let i = 1; i <= 12; i++) {
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

export class Floor implements Entity {
    image: EntityImage = {tile: " ", fg: "white"};
    position: EntityPosition;

    constructor(x: number, y: number) {
        this.position = new EntityPosition(x, y, 0);
    }
}

export class Wall implements Entity {
    image: EntityImage = {tile: "\u{1F9F1}", fg: "white"};
    position: EntityPosition;
    obstacle = true;

    constructor(x: number, y: number) {
        this.position = new EntityPosition(x, y, 1);
    }
}

export abstract class MoneyTemplate extends EntityTimerMixin(BaseEntity) {
    protected abstract operations: EntityOperations;

    image: EntityImage = {tile: "\u{1F9FB}", fg: "white"};
    position: EntityPosition;

    constructor(x: number, y: number) {
        super();
        this.position = new EntityPosition(x, y, 1);
    }

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
