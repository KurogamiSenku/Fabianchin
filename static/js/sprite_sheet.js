const ANIMATIONS = {
    idle:   { frames: 4 },
    walk:   { frames: 6 },
    jump:   { frames: 4 },
    attack: { frames: 4 },
};

function framePath(animName, frameIndex) {
    return `/static/images/frames/${animName}_${frameIndex}.png`;
}
