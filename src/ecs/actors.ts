import * as EventEmitter from "eventemitter3";
import AStar from "rot-js/lib/path/astar";
import { EntityImage, EntityPosition, EntityMovement } from "./components";
import { BaseEntity, Entity, EntityEvent } from "./entities";
import { TimerMixin, ActionQueueMixin } from "./mixins";
import { SpatialSystem, Point } from "./systems";

export class Hamster extends TimerMixin(ActionQueueMixin(BaseEntity)) {
    image: EntityImage = {tile: "\u{1F439}", fg: "white", bg: "transparent"};
    position = new EntityPosition(0, 0, 1);
    movement?: EntityMovement;
    speed = 4;

    constructor(public spatial: SpatialSystem) {
        super();
    }

    navigate(x: number, y: number) {
        this.cancel();
        const astar = new AStar(x, y, (x, y) => !this.spatial.grid.find(new EntityPosition(x, y, this.position.z))?.obstacle, {topology: 4});
        const waypoints: Point[] = [];
        astar.compute(Math.round(this.position.x), Math.round(this.position.y), (x, y) => waypoints.push([x, y]));
        this.push((entity, signal) => this.spatial.composite(entity, this.speed, waypoints, signal));
    }

    shake() {
        if (this.movement) {
            const {x, y} = this.position;
            const sx = Math.sign(this.movement.x - x);
            const sy = Math.sign(this.movement.y - y);
            const token = this.defer(async (signal) => {
                for (let i = 1; i <= 10; i++) {
                    if (signal.aborted) {
                        break;
                    }
                    this.position.x += -sx / 100;
                    this.position.y += -sy / 100;
                    await this.sleep(0.0001);
                }
                this.position.x = x;
                this.position.y = y;
            });
            this.cancellation.add(token);
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

export class Money extends TimerMixin(BaseEntity) {
    image: EntityImage = {tile: "\u{1F9FB}", fg: "white"};
    position: EntityPosition;

    constructor(x: number, y: number) {
        super();
        this.position = new EntityPosition(x, y, 1);
    }

    consumed(emitter: EventEmitter<EntityEvent>, z: number, callback?: (entity: this) => void) {
        // update z layer
        emitter.emit('deleted', this);
        this.position.z = z;
        emitter.emit('added', this);
        // trigger animation
        this.defer(async () => {
            this.image.tile = "\u{1F4A8}";
            await this.sleep(1);
            emitter.emit('deleted', this);
            callback?.(this);
        });
    }
}