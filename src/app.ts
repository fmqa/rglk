import * as ROT from 'rot-js';
import { AssetLoader } from './assets';
import { EntityOperations, Floor, HamsterTemplate, MoneyTemplate, Wall } from './ecs/actors';
import { Engine } from './ecs/engine';
import { Entity } from './ecs/entities';
import { TextFlasher, PositionedText } from './ecs/interface';
import { simple } from './ecs/rendering';

export class Game {
    private constructor(public display: ROT.Display) {
        const canvas = this.container! as HTMLCanvasElement;
        canvas.style.width = 'calc(100vmin - 16px)';
        canvas.style.height = 'calc(100vmin - 16px)';

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
            if (content) {
                engine.add(new Wall(x, y));
            } else {
                const what = ROT.RNG.getWeightedValue({floor: 99, tp: 1});
                if (what === 'tp') {
                    engine.add(new Money(x, y));
                }
                engine.add(new Floor(x, y));
            }
        });

        const osd: PositionedText = {
            x: this.display.getOptions().width / 2,
            y: 1
        };

        const flasher = new TextFlasher(osd);
        engine.add(flasher);

        player.extra = 0.5;
        player.events.on('encored', () => flasher.flash("Extra turn!", 1));

        engine.draw.events
            .on('drawn', simple(display, engine.camera, osd))
            .on('cleared', display.clear, display);

        let tp = 0;

        engine.spatial.events.on('collided', (a: Entity, b: Entity) => {
            if (a instanceof Hamster) {
                if (b instanceof Money) {
                    const s = ROT.RNG.getItem(["*om nom nom*", "*chmonk*", "*chomp*"])!;
                    const controller = flasher.flash(`${s} [${++tp}]`, 1);
                    b.consumed(2, () => controller.abort());
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
                spacing: 1.125
            })
        );
    }
}

document.body.onload = () => {
    const assets = new AssetLoader(document);
    Game.create().then(x => { const output = x.container!; output.tabIndex = 1; document.body.appendChild(output); (window as any).game = x; });
}