import * as ROT from 'rot-js';
import { AssetLoader } from './assets';
import { EntityOperations, Floor, HamsterTemplate, MoneyTemplate, Wall } from './ecs/actors';
import { Engine } from './ecs/engine';
import { Entity } from './ecs/entities';
import { simple, SimpleOSD } from './ecs/rendering';

export class Game {
    private constructor(public display: ROT.Display) {
        const onresize = () => {
            const sw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
            const sh = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
            const canvas = this.container! as HTMLCanvasElement;
            const canvasRatio = canvas.height / canvas.width;
            const windowRatio = sh / sw;
            let width;
            let height;
        
            if (windowRatio < canvasRatio) {
                height = sh;
                width = height / canvasRatio;
            } else {
                width = sw;
                height = width * canvasRatio;
            }
        
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
        };

        window.onresize = onresize;

        onresize();

        const engine = new Engine;

        const operations: EntityOperations = {
            add(entity) { return engine.add(entity); },
            delete(entity) { return engine.delete(entity); },
            find(position) { return engine.spatial.grid.find(position); },
            movement: engine.spatial
        };

        class Hamster extends HamsterTemplate {
            get operations() {
                return operations;
            }
        }

        class Money extends MoneyTemplate {
            get operations() {
                return operations;
            }
        }

        const player = new Hamster;

        player.position.x = 128;
        player.position.y = 128;

        engine.player = player;

        engine.camera.r = 12;
        engine.camera.w = 256;
        engine.camera.h = 256;
        engine.camera.d = 1;
        engine.camera.x = player.position.x;
        engine.camera.y = player.position.y;

        const digger = new ROT.Map.Digger(engine.camera.w, engine.camera.h);
        digger.create((x, y, content) => {
            let entity: Entity;
            if (content) {
                entity = new Wall(x, y);
            } else {
                const what = ROT.RNG.getWeightedValue({floor: 99, tp: 1});
                entity = what === 'floor' ? new Floor(x, y) : new Money(x, y);
            }
            engine.add(entity);
        });

        const osd: SimpleOSD = {
            x: this.display.getOptions().width / 2,
            y: 1
        };

        player.extra = 0.5;
        player.events.on('extra', () => {
            osd.text = "Extra turn!";
            player.timer.defer(signal => signal.aborted || delete osd.text, 1);
        });

        engine.draw.events
            .on('drawn', simple(display, engine.camera, osd))
            .on('cleared', display.clear, display);

        let tp = 0;

        engine.spatial.events.on('collided', (a: Entity, b: Entity) => {
            if (a instanceof Hamster) {
                if (b instanceof Money) {
                    b.consumed(2, () => delete osd.text);
                    const s = ROT.RNG.getItem(["*om nom nom*", "*chmonk*", "*chomp*"])!;
                    osd.text = `${s} [${++tp}]`;
                } else if (b instanceof Wall) {
                    a.shake();
                }
            }
            if (b.obstacle) {
                delete a.movement;
            }
        });

        this.container!.onclick = ev => {
            const [x, y] = this.display.eventToPosition(ev);
            player.navigate(engine.camera.stowx(x), engine.camera.stowy(y));
        };

        engine.add(engine.player!);

        let t0 = performance.now();
        requestAnimationFrame(function loop(t) {
            const dt = (t - t0)/1000;
            engine.tick(dt);
            t0 = t;
            requestAnimationFrame(loop);
        });
    }

    get container() {
        return this.display.getContainer();
    }

    static async create(): Promise<Game> {
        return new Game(
            new ROT.Display({
                bg: "black",
                width: 24,
                height: 24,
                forceSquareRatio: true,
                spacing: 1.15
            })
        );
    }
}

document.body.onload = () => {
    const assets = new AssetLoader(document);
    Game.create().then(x => { const output = x.container!; output.tabIndex = 1; document.body.appendChild(output); (window as any).game = x; });
}