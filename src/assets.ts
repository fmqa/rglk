export class AssetLoader {
    private images: {[key: string]: HTMLImageElement} = {};

    constructor(private document: Document) {}

    image(id: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            let img = this.images[id];
            if (img) {
                resolve(img);
            } else {
                const img = this.document.createElement("img");
                img.onerror = reject;
                img.onload = () => {
                    this.images[id] = img;
                    resolve(img);
                };
                img.src = id;
            }
        });
    }
}