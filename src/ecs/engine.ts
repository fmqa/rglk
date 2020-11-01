import * as EventEmitter from "eventemitter3";
import Simple from "rot-js/lib/scheduler/simple";
import { Entity, EntityEvent } from "./entities";
import { EntityGrid } from "./grid";
import { DrawSystem, SpatialSystem, TimerSystem, TurnSystem } from "./systems";
import { Camera } from "./camera";

function focusOnPlayer(this: Engine, entity: Entity) {
    if (this.player === entity && entity.position) {
        let {x, y} = entity.position;
        x = Math.round(entity.position.x);
        y = Math.round(entity.position.y);
        if (this.camera.focus(x, y)) {
            this.camera.select(e => this.add(e));
        }
    }
}

export class Engine {
    readonly emitter = new EventEmitter<EntityEvent>();
    readonly grid = new EntityGrid;
    readonly camera = new Camera(this.grid);
    readonly spatial = new SpatialSystem(this.emitter, this.grid);
    readonly timers = new TimerSystem(this.emitter);
    readonly draw = new DrawSystem(this.emitter, e => this.camera.visible(e.position!.x, e.position!.y));
    readonly turn = new TurnSystem(this.emitter, new Simple);
    player?: Entity;

    constructor() {
        this.spatial.events
            .on('moved', focusOnPlayer, this);
    }

    add(entity: Entity) {
        this.emitter.emit('added', entity);
    }

    delete(entity: Entity) {
        this.emitter.emit('deleted', entity);
    }

    clear() {
        this.emitter.emit('cleared')
    }

    tick(dt: number) {
        this.spatial.update(dt);
        this.turn.update();
        this.timers.update(dt);
        this.draw.update();
    }
}