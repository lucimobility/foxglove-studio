// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { SvgIcon, SvgIconProps } from "@mui/material";

export default function TagIcon(props: SvgIconProps): JSX.Element {
  return (
    <SvgIcon {...props}>
      <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="50" height="50" viewBox="0 0 50 50"
        fill="#FFFFFF">
        <path d="M 47.996094 20.378906 L 48 5.5 C 48 3.570313 46.429688 2 44.5 2 L 29.625 2.003906 L 28.996094 2 C 27.699219 2 26.464844 2.074219 25.574219 2.964844 L 2.847656 25.691406 C 2.300781 26.234375 2 26.960938 2 27.734375 C 2 28.507813 2.300781 29.234375 2.847656 29.777344 L 20.222656 47.152344 C 20.765625 47.699219 21.492188 48 22.265625 48 C 23.035156 48 23.765625 47.699219 24.308594 47.152344 L 47.035156 24.425781 C 48.011719 23.453125 48.003906 22.050781 48 20.699219 Z M 39 14 C 37.34375 14 36 12.65625 36 11 C 36 9.34375 37.34375 8 39 8 C 40.65625 8 42 9.34375 42 11 C 42 12.65625 40.65625 14 39 14 Z"></path>
      </svg>
    </SvgIcon>
  );
}
