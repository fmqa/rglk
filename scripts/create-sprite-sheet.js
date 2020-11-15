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
        const blitter = {
            r: 0,
            row(n, y) {
                for (let i = 0; i < n; i++) {
                    dst.blit(extract(src, 32 + 16 * i, y, 16, 16), 16 * i, this.r * 16);
                }
                this.r++;
                return this;
            }
        };
        blitter
            .row(13, L.char0)
            .row(13, L.char1)
            .row(7, L.char2)
            .row(12, L.exp)
            .row(13, L.fauna)
            .row(4, L.trolls)
            .row(8, L.undead)
            .row(8, L.creatures)
            .row(16, L.build0)
            .row(7, L.build1)
            .row(12, L.build2)
            .row(12, L.dev)
            .row(13, L.overw)
            .row(16, L.explr0)
            .row(5, L.explr1)
            .row(16, L.food0)
            .row(6, L.food1)
            .row(16, L.outfit0)
            .row(11, L.outfit1)
            .row(15, L.mag)
            .row(6, L.music)
            .row(16, L.sym0)
            .row(7, L.sym1);
        dst.write(argv.dst);
    })
});