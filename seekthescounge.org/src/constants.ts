export const GAME_WIDTH = 286;
export const GAME_HEIGHT = 132;

// 240, 135 for 16:9 screens
// 286, 132 for 19.5:9 screens

export const calculateIntegerZoom = (viewportWidth: number, viewportHeight: number): number => {
    if (
        !Number.isFinite(viewportWidth) ||
        !Number.isFinite(viewportHeight) ||
        viewportWidth <= 0 ||
        viewportHeight <= 0
    ) {
        return 1;
    }

    const maxWidthZoom = Math.floor(viewportWidth / GAME_WIDTH);
    const maxHeightZoom = Math.floor(viewportHeight / GAME_HEIGHT);
    const zoom = Math.max(1, Math.min(maxWidthZoom, maxHeightZoom));

    console.log(
        `Viewport: ${viewportWidth}x${viewportHeight}, Calculated zoom: ${zoom}, Base: ${GAME_WIDTH}x${GAME_HEIGHT}`,
    );

    return zoom;
};

// camera follow snappiness
export const CAMERA_FOLLOW_LERP_X = 0.1;
export const CAMERA_FOLLOW_LERP_Y = 0.1;
export const CAMERA_FOLLOW_OFFSET_X = -10; // Zero is centered, negative is left of center. This sorta controls where the play get's centered on screen.
export const CAMERA_FOLLOW_OFFSET_Y = 0;

export const GAME_VERSION = "1.34";

// dialog box snap shut/snap open snappiness
export const DIALOG_SNAP_OPEN_DURATION = 600; // ms
export const DIALOG_SNAP_CLOSE_DURATION = 400; // ms

// dialog box font size
export const DIALOG_FONT_SIZE = "10px";

// dialog box char width guess for paging math
export const DIALOG_CHAR_WIDTH_GUESS = 6;

// button dimensions
export const BUTTON_WIDTH_FACTOR = 0.25; // button width relative to screen width
export const BUTTON_PADDING_FACTOR = 1 / 64; // button padding relative to screen width

// rising/falling animation velocity thresholds
export const RISING_FALLING_ANIMATION_VELOCITY_THRESHOLD = 50; // px/s
