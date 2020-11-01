export class AssetLoader {
    private images: {[key: string]: HTMLImageElement} = {};

    constructor(private document: Document) {}

    image(id: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            if (this.images[id]) {
                resolve(this.images[id]);
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