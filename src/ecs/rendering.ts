import { Display } from "rot-js";
import { EntityFn } from "./entities";
import { Camera } from "./camera";
import { PositionedText } from "./interface";

export function simple(display: Display, camera: Camera, osd?: PositionedText): EntityFn {
    return entity => {
        let {tile, fg, bg} = entity.image!;
        const {x, y} = entity.position!;
        display.draw(camera.wtosx(x), camera.wtosy(y), tile, fg ?? "transparent", bg ?? "transparent");
    };
}