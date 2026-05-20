exports.WHEELS_PER_CAT = 64,
exports.DEFAULT_NUM_LABELS = 30,
exports.NUM_SOFTKEYS = 12,
exports.EOS_PORT = 3032,
exports.EOS_PORT_SLIP = 3037;
// this will work for most item types:
//     cuelist, curve, fpe (fixture position estimation),
//     pixmap,
// will not work with:
//     cue
//     patch might be possible
exports.LABEL_NAMES = [
    'macro',
    'sub',
    'preset',
    'group',
    'ip', 'fp', 'cp', 'bp',
    'fx', 'snap', 'ms'
];

exports.ITEM_COLOURS = {
    macro:  0x403837,
    sub:    0x004A26,
    preset: 0x0A3742,
    ip:     0x6E2A15,
    fp:     0x003824,
    cp:     0x31313D,
    bp:     0x0E1A4A,
    group:  0x364757,
    fx:     0x36154A,
    snap:   0x621111,
    ms:     0x570D28,
    scene:  0x004A26,
    patch:  0x13202E,

    
    soft_key: 0x141414,
    live:     0xC78B07,
    blind:    0x82B4FF,
};
exports.ITEM_NAMES = {
    macro:  "Macro",
    sub:    "Submaster",
    preset: "Preset",
    ip:     "Intensity Palette",
    fp:     "Focus Palette",
    cp:     "Colour Palette",
    bp:     "Beam Palette",
    group:  "Group",
    fx:     "Effect",
    snap:   "Snapshot",
    ms:     "Magic Sheet",
    scene:  "Scene",

    patch:  "Channel",
    pixmap: "Pixel Map",
    cuelist:"Cue List",
    cue:    "Cue",
    fpe:    "FPE Point",
    curve:  "Curve",
};
