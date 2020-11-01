import { Display } from "rot-js";
import { EntityFn } from "./entities";
import { Camera } from "./camera";

export interface SimpleOSD {
    x: number;
    y: number;
    text?: string;
}

export function simple(display: Display, camera: Camera, osd?: SimpleOSD): EntityFn {
    return entity => {
        let {tile, fg, bg} = entity.image!;
        const {x, y} = entity.position!;
        display.draw(camera.wtosx(x), camera.wtosy(y), tile, fg ?? "transparent", bg ?? "transparent");
        if (osd && osd.text) {
            display.drawText(osd.x - Math.round(osd.text.length / 2), osd.y, osd.text);
        }
    };
}