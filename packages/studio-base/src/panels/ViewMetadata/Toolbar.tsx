// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { IconButton } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import MessagePathInput from "@foxglove/studio-base/components/MessagePathSyntax/MessagePathInput";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import Stack from "@foxglove/studio-base/components/Stack";


type Props = {
  canExpandAll: boolean;
  onToggleExpandAll: () => void;
  onTopicPathChange: (path: string) => void;
  metadataName: string;
};

const useStyles = makeStyles()((theme) => ({
  toolbar: {
    paddingBlock: 0,
    gap: theme.spacing(0.25),
  },
  iconButton: {
    padding: theme.spacing(0.25),

    "&.Mui-selected": {
      color: theme.palette.primary.main,
      backgroundColor: theme.palette.action.selected,
    },
  }
}));

function ToolbarComponent(props: Props): JSX.Element {
  const {
    canExpandAll,
    onToggleExpandAll,
    onTopicPathChange,
    metadataName,
  } = props;

  const { classes } = useStyles();

  return (
    <PanelToolbar className={classes.toolbar}>
      <IconButton
        className={classes.iconButton}
        title={canExpandAll ? "Expand all" : "Collapse all"}
        onClick={onToggleExpandAll}
        data-testid="expand-all"
        size="small"
      >
        {canExpandAll ? <UnfoldMoreIcon fontSize="small" /> : <UnfoldLessIcon fontSize="small" />}
      </IconButton>
      <Stack fullWidth paddingLeft={0.25}>
        <MessagePathInput
          index={0}
          path={metadataName}
          onChange={onTopicPathChange}
          inputStyle={{ height: 20 }}
          metadata={true}
        />
      </Stack>
    </PanelToolbar>
  );
}

export const Toolbar = React.memo(ToolbarComponent);
