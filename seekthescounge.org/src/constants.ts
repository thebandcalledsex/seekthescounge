export const GAME_WIDTH = 286;
export const GAME_HEIGHT = 132;

// 240, 135 for 16:9 screens
// 286, 132 for 19.5:9 screens

export const MIN_GAME_WIDTH = GAME_WIDTH;

export const calculateResponsiveWidth = (viewportWidth: number, viewportHeight: number): number => {
    if (
        !Number.isFinite(viewportWidth) ||
        !Number.isFinite(viewportHeight) ||
        viewportHeight <= 0
    ) {
        return MIN_GAME_WIDTH;
    }

    const aspectRatio = viewportWidth / viewportHeight;
    const responsiveWidth = Math.round(GAME_HEIGHT * aspectRatio);

    console.log(
        `Viewport: ${viewportWidth}x${viewportHeight}, Aspect Ratio: ${aspectRatio.toFixed(3)}, Responsive Width: ${responsiveWidth}, Min Width: ${MIN_GAME_WIDTH}`,
    );

    return Math.max(responsiveWidth, MIN_GAME_WIDTH);
};

// camera follow snappiness
export const CAMERA_FOLLOW_LERP_X = 0.1;
export const CAMERA_FOLLOW_LERP_Y = 0.1;
export const CAMERA_FOLLOW_OFFSET_X = -10; // Zero is centered, negative is left of center. This sorta controls where the play get's centered on screen.
export const CAMERA_FOLLOW_OFFSET_Y = 0;

export const GAME_VERSION = "1.22";

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
