const yargs = require('yargs');
const Jimp = require('jimp');

const argv = yargs.command('$0 <src> <dst>', 'build spritesheet')
    .option('bg', {
        alias: 'background',
        demandOption: true,
        default: '#111133',
        describe: 'transparent color',
        type: 'string'
    })
    .help()
    .argv;

argv.bg = Jimp.cssColorToHex(argv.bg);

const L = {
    char0: 97,
    char1: 113,
    char2: 130,
    exp: 176,
    fauna: 224,
    trolls: 272,
    undead: 320,
    creatures: 368,
    build0: 416,
    build1: 432,
    build2: 448,
    dev: 496,
    overw: 544,
    explr0: 592,
    explr1: 608,
    food0: 656,
    food1: 672,
    outfit0: 720,
    outfit1: 736,
    mag: 784,
    music: 832,
    sym0: 880,
    sym1: 896
};

function extract(src, x, y, w, h) {
    return src
        .clone()
        .crop(x, y, w, h)
        .scan(0, 0, w, h, function(x, y) {
            const c = this.getPixelColor(x, y);
            this.setPixelColor(c === argv.bg ? 0 : 0xffffffff, x, y);
        });
}

Jimp.read(argv.src, (err, src) => {
    new Jimp(256, 368, 0, (err, dst) => {
        let j = 0;

        for (let i = 0; i < 13; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.char0, 16, 16), 16 * i, j * 16);
        }
        j++;
        for (let i = 0; i < 13; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.char1, 16, 16), 16 * i, j * 16);
        }
        j++
        for (let i = 0; i < 7; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.char2, 16, 16), 16 * i, j * 16);
        }
        j++;

        for (let i = 0; i < 12; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.exp, 16, 16), 16 * i, j * 16);
        }
        j++;

        for (let i = 0; i < 13; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.fauna, 16, 16), 16 * i, j * 16);
        }
        j++;

        for (let i = 0; i < 13; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.trolls, 16, 16), 16 * i, j * 16);
        }
        j++;

        for (let i = 0; i < 8; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.undead, 16, 16), 16 * i, j * 16);
        }
        j++;

        for (let i = 0; i < 8; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.creatures, 16, 16), 16 * i, j * 16);
        }
        j++;

        for (let i = 0; i < 16; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.build0, 16, 16), 16 * i, j * 16);
        }
        j++;
        for (let i = 0; i < 7; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.build1, 16, 16), 16 * i, j * 16);
        }
        j++;
        for (let i = 0; i < 12; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.build2, 16, 16), 16 * i, j * 16);
        }
        j++;

        for (let i = 0; i < 12; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.dev, 16, 16), 16 * i, j * 16);
        }
        j++;

        for (let i = 0; i < 13; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.overw, 16, 16), 16 * i, j * 16);
        }
        j++;

        for (let i = 0; i < 16; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.explr0, 16, 16), 16 * i, j * 16);
        }
        j++;
        for (let i = 0; i < 5; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.explr1, 16, 16), 16 * i, j * 16);
        }
        j++;

        for (let i = 0; i < 16; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.food0, 16, 16), 16 * i, j * 16);
        }
        j++;
        for (let i = 0; i < 6; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.food1, 16, 16), 16 * i, j * 16);
        }
        j++;

        for (let i = 0; i < 16; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.outfit0, 16, 16), 16 * i, j * 16);
        }
        j++;
        for (let i = 0; i < 11; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.outfit1, 16, 16), 16 * i, j * 16);
        }
        j++;

        for (let i = 0; i < 15; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.mag, 16, 16), 16 * i, j * 16);
        }
        j++;

        for (let i = 0; i < 6; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.music, 16, 16), 16 * i, j * 16);
        }
        j++;

        for (let i = 0; i < 16; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.sym0, 16, 16), 16 * i, j * 16);
        }
        j++;
        for (let i = 0; i < 7; i++) {
            dst.blit(extract(src, 32 + 16 * i, L.sym1, 16, 16), 16 * i, j * 16);
        }
        j++;

        dst.write(argv.dst);
    })
});