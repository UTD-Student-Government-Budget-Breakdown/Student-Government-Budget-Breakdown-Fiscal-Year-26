const PALETTE = {
    teal:       "#00b18b",
    cyan:       "#0bbbbb",
    aqua:       "#1ae3e1",
    skyBlue:    "#2ad8fc",
    blue:       "#3cacfd",
    lavender:   "#9ebcda",
    tan:        "#dabc9e",
    orange:     "#fd8d3c",
    redOrange:  "#fc4e2a",
    red:        "#e31a1c",
    darkRed:    "#bb0b0b",
    crimson:    "#b10026"
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
