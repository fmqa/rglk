import AStar from "rot-js/lib/path/astar";
import { EntityImage, EntityPosition, EntityMovement, MovementBuilder, Point } from "./components";
import { BaseEntity, Entity } from "./entities";
import { EntityActionQueueMixin, EntityTimerMixin } from "./mixins";

/**
 * Entity operations facade
 */
export interface EntityOps {
    add(entity: Entity): void;
    delete(entity: Entity): void;
    find(position: EntityPosition): Entity | undefined;
    movement: MovementBuilder;
}

export function classes(ops: EntityOps) {
    class Hamster extends EntityTimerMixin(EntityActionQueueMixin(BaseEntity)) {
        image: EntityImage = {tile: "\u{1F439}", fg: "white", bg: "transparent"};
        position = new EntityPosition(0, 0, 1);
        movement?: EntityMovement;
        speed = 4;

        navigate(x: number, y: number) {
            this.queue.cancel();
            const astar = new AStar(x, y, (x, y) => !ops.find(new EntityPosition(x, y, this.position.z))?.obstacle, {topology: 4});
            const waypoints: Point[] = [];
            astar.compute(Math.round(this.position.x), Math.round(this.position.y), (x, y) => waypoints.push([x, y]));
            this.queue.push(signal => ops.movement.composite(this, this.speed, waypoints, signal));
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

    class Floor implements Entity {
        image: EntityImage = {tile: " ", fg: "white"};
        position: EntityPosition;

        constructor(x: number, y: number) {
            this.position = new EntityPosition(x, y, 0);
        }
    }

    class Wall implements Entity {
        image: EntityImage = {tile: "\u{1F9F1}", fg: "white"};
        position: EntityPosition;
        obstacle = true;

        constructor(x: number, y: number) {
            this.position = new EntityPosition(x, y, 1);
        }
    }

    class Money extends EntityTimerMixin(BaseEntity) {
        image: EntityImage = {tile: "\u{1F9FB}", fg: "white"};
        position: EntityPosition;

        constructor(x: number, y: number) {
            super();
            this.position = new EntityPosition(x, y, 1);
        }

        consumed(z: number, callback?: (entity: this) => void) {
            // update z layer
            ops.delete(this);
            this.position.z = z;
            ops.add(this);
            // trigger animation
            this.timer.defer(async () => {
                this.image.tile = "\u{1F4A8}";
                await this.timer.sleep(1);
                ops.delete(this);
                callback?.(this);
            });
        }
    }

    return {Hamster, Floor, Wall, Money};
}