const _css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

const PALETTE = {
    teal:       _css("--palette-teal"),
    cyan:       _css("--palette-cyan"),
    aqua:       _css("--palette-aqua"),
    skyBlue:    _css("--palette-sky-blue"),
    blue:       _css("--palette-blue"),
    lavender:   _css("--palette-lavender"),
    tan:        _css("--palette-tan"),
    orange:     _css("--palette-orange"),
    redOrange:  _css("--palette-red-orange"),
    red:        _css("--palette-red"),
    darkRed:    _css("--palette-dark-red"),
    crimson:    _css("--palette-crimson")
};

const COLOR_SEQUENCE = [
    PALETTE.teal, PALETTE.cyan, PALETTE.aqua, PALETTE.skyBlue,
    PALETTE.blue, PALETTE.lavender, PALETTE.tan, PALETTE.orange,
    PALETTE.redOrange, PALETTE.red, PALETTE.darkRed, PALETTE.crimson
];

const SCHOOL_COLORS = {
    "ECS":  PALETTE.cyan,
    "JSOM": PALETTE.teal,
    "NSM":  PALETTE.aqua,
    "AHT":  PALETTE.tan,
    "BBS":  PALETTE.skyBlue,
    "EPPS": PALETTE.lavender,
    "IS":   PALETTE.orange,
    "Other Instructional Support": PALETTE.blue
};

function getSequenceColor(index) {
    return COLOR_SEQUENCE[index % COLOR_SEQUENCE.length];
}
