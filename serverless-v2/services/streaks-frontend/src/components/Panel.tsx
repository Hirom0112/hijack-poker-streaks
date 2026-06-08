import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { ReactNode } from 'react';
import Editable from '../editor/Editable';

/**
 * The two High-Rollers leather frames (CSS `border-image` 9-slices). Both are
 * 1600×791; the brass corner bracket + gold filigree flourish occupy ~160px of
 * each corner, so that is the slice. `full` has brass on all four corners;
 * `top` has brass on the top two only (plain leather bottom) — used for cards
 * that sit "seated" in a column (Next Milestone, Streak Freezes).
 */
const FRAMES = {
  full: '/assets/dashboard/frames/frame-4corner.png',
  top: '/assets/dashboard/frames/frame-2corner.png',
} as const;

export type PanelVariant = keyof typeof FRAMES;

interface PanelProps {
  children: ReactNode;
  /** Which corner treatment to use (default: `full` — brass on all corners). */
  variant?: PanelVariant;
  /** Styles for the outer frame box. */
  sx?: SxProps<Theme>;
  /** Styles for the inner content area (padding/layout). */
  innerSx?: SxProps<Theme>;
  /** When set, the whole card becomes draggable in the asset editor. */
  editId?: string;
  editLabel?: string;
}

/**
 * A card framed by a leather 9-slice panel art (CSS `border-image`): the ornate
 * metal corners stay fixed and sharp while the gold edges and the leather center
 * stretch to ANY width/height — so one asset skins every card. The `fill`
 * keyword paints the leather texture behind the content.
 */
export default function Panel({ children, variant = 'full', sx, innerSx, editId, editLabel }: PanelProps) {
  const panel = (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        boxSizing: 'border-box',
        borderStyle: 'solid',
        borderColor: 'transparent',
        borderWidth: '38px',
        borderImageSource: `url(${FRAMES[variant]})`,
        borderImageSlice: '160 fill',
        borderImageWidth: '38px',
        borderImageRepeat: 'stretch',
        ...sx,
      }}
    >
      <Box sx={{ position: 'relative', px: 0.5, ...innerSx }}>{children}</Box>
    </Box>
  );

  return editId ? (
    <Editable id={editId} label={editLabel} fill>
      {panel}
    </Editable>
  ) : (
    panel
  );
}
