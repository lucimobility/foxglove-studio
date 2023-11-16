// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import {
  Alert,
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormLabel,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  inputBaseClasses,
} from "@mui/material";
import * as _ from "lodash-es";
import { KeyboardEvent, useCallback, useMemo, useState } from "react";
import { keyframes } from "tss-react";
import { makeStyles } from "tss-react/mui";
import { useImmer } from "use-immer";

import Log from "@foxglove/log";
import { toDate, toNanoSec } from "@foxglove/rostime";
import { Metadata } from "@foxglove/studio";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import { useAppTimeFormat } from "@foxglove/studio-base/hooks";
import useCallbackWithToast from "@foxglove/studio-base/hooks/useCallbackWithToast";
import useWriteMetadata from "@foxglove/studio-base/hooks/useWriteMetadata";

const log = Log.getLogger(__filename);

const fadeInAnimation = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const useStyles = makeStyles<void, "toggleButton">()((theme, _params, classes) => ({
  textarea: {
    height: "100%",

    [`.${inputBaseClasses.root}`]: {
      width: "100%",
      height: "100%",
      textAlign: "left",
      backgroundColor: theme.palette.background.paper,
      overflow: "hidden",
      padding: theme.spacing(1, 0.5),

      [`.${inputBaseClasses.input}`]: {
        height: "100% !important",
        lineHeight: 1.4,
        fontFamily: theme.typography.fontMonospace,
        overflow: "auto !important",
        resize: "none",
      },
    },
  },
  grid: {
    alignItems: "center",
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: theme.spacing(1),
    overflow: "auto",
    alignContent: "flex-start",
  },
  row: {
    animation: `${fadeInAnimation} 0.2s ease-in-out`,
    display: "contents",
  },
  toggleButton: {
    border: "none",
    lineHeight: 1,
  },
  toggleButtonGroup: {
    marginRight: theme.spacing(-0.5),
    gap: theme.spacing(0.25),

    [`.${classes.toggleButton}`]: {
      borderRadius: `${theme.shape.borderRadius}px !important`,
      marginLeft: "0px !important",
      borderLeft: "none !important",
    },
  },
}));

type KeyValue = { key: string; value: string };

const selectCurrentTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.currentTime;

export function CreateTagDialog(props: { onClose: () => void }): JSX.Element {
  const { onClose } = props;

  const { classes } = useStyles();

  const currentTime = useMessagePipeline(selectCurrentTime);

  const [metadata, setMetadata] = useImmer<{
    startTime: undefined | Date;
    duration: undefined | number;
    durationUnit: "sec" | "nsec";
    entries: KeyValue[];
  }>({
    startTime: currentTime ? toDate(currentTime) : undefined,
    duration: 0,
    durationUnit: "sec",
    entries: [{ key: "", value: "" }],
  });

  const updateMetadata = useCallback(
    (index: number, updateType: keyof KeyValue, value: string) => {
      setMetadata((draft) => {
        const keyval = draft.entries[index];
        if (keyval) {
          keyval[updateType] = value;

          // Automatically add new row if we're at the end and have both key and value.
          if (
            index === draft.entries.length - 1 &&
            keyval.key.length > 0 &&
            keyval.value.length > 0
          ) {
            draft.entries.push({ key: "", value: "" });
          }
        }
      });
    },
    [setMetadata],
  );

  const writeMetadata = useWriteMetadata();

  const { formatTime } = useAppTimeFormat();

  const [metadataName, setMetadataName] = useState<string>("");

  const nameError = useMemo(() => {
    let errorWithName = undefined;
    if (metadataName === "") {
      errorWithName = "Name must have a value";
    }
    return errorWithName;
  }, [metadataName]);

  const countedMetadata = _.countBy(metadata.entries, (kv) => kv.key);
  const duplicateKey = Object.entries(countedMetadata).find(
    ([key, count]) => key.length > 0 && count > 1,
  );

  const canSubmit = metadata.startTime != undefined && metadata.duration != undefined && !duplicateKey && metadataName !== "";

  const createMetadata = useCallbackWithToast(() => {
    if (metadata.startTime == undefined || metadata.duration == undefined) {
      return;
    }

    log.info(metadata);
    log.info(currentTime);
    const metadataMap = new Map<string, string>();
    metadataMap.set("startTime", toNanoSec(currentTime).toString());
    metadataMap.set("duration", metadata.duration.toLocaleString());
    metadataMap.set("durationUnit", metadata.durationUnit);
    metadata.entries.forEach(entry => { metadataMap.set(entry.key, entry.value); });
    const metadataEntry: Metadata = { name: metadataName, metadata: metadataMap };
    log.info("writing metadata from metadata panel: ", metadataEntry);

    writeMetadata([metadataEntry]);

  }, [currentTime, metadata, metadataName, writeMetadata]);

  const onMetaDataKeyDown = useCallback(
    (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Enter") {
        createMetadata().catch((error) => {
          log.error(error);
        });
      }
    },
    [createMetadata],
  );

  const addRow = useCallback(
    (index: number) => {
      setMetadata((draft) => {
        draft.entries.splice(index + 1, 0, { key: "", value: "" });
      });
    },
    [setMetadata],
  );

  const removeRow = useCallback(
    (index: number) => {
      setMetadata((draft) => {
        if (draft.entries.length > 1) {
          draft.entries.splice(index, 1);
        }
      });
    },
    [setMetadata],
  );

  const formattedStartTime = currentTime ? formatTime(currentTime) : "-";

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create Tag</DialogTitle>
      <DialogContent>
        <TextField
          variant="outlined"
          label="Name"
          className={classes.textarea}
          size="small"
          placeholder="Metadata Name"
          value={metadataName}
          onChange={(event) => {
            setMetadataName(event.target.value);
          }}
          error={nameError != undefined}
        />
        <div className={classes.grid}>
          <FormControl>
            <FormLabel>Start Time</FormLabel>
            <Typography paddingY={1}>{formattedStartTime}</Typography>
          </FormControl>
          <TextField
            value={metadata.duration ?? ""}
            fullWidth
            label="Duration"
            onChange={(ev) => {
              const duration = Number(ev.currentTarget.value);
              setMetadata((oldEvent) => ({
                ...oldEvent,
                duration: duration > 0 ? duration : undefined,
              }));
            }}
            type="number"
            InputProps={{
              endAdornment: (
                <ToggleButtonGroup
                  className={classes.toggleButtonGroup}
                  size="small"
                  exclusive
                  value={metadata.durationUnit}
                  onChange={(_ev, durationUnit) => {
                    if (metadata.durationUnit !== durationUnit) {
                      setMetadata((old) => ({ ...old, durationUnit }));
                    }
                  }}
                >
                  <ToggleButton className={classes.toggleButton} tabIndex={-1} value="sec">
                    sec
                  </ToggleButton>
                  <ToggleButton className={classes.toggleButton} tabIndex={-1} value="nsec">
                    nsec
                  </ToggleButton>
                </ToggleButtonGroup>
              ),
            }}
          />
          <ButtonGroup style={{ visibility: "hidden" }}>
            <IconButton tabIndex={-1} data-testid="add">
              <AddIcon />
            </IconButton>
            <IconButton tabIndex={-1}>
              <AddIcon />
            </IconButton>
          </ButtonGroup>
        </div>
        <div>
          <FormLabel>Metadata</FormLabel>
          <div className={classes.grid}>
            {metadata.entries.map(({ key, value }, index) => {
              const hasDuplicate = ((key.length > 0 ? countedMetadata[key] : undefined) ?? 0) > 1;
              return (
                <div className={classes.row} key={index}>
                  <TextField
                    fullWidth
                    value={key}
                    autoFocus={index === 0}
                    placeholder="Key (string)"
                    error={hasDuplicate}
                    onKeyDown={onMetaDataKeyDown}
                    onChange={(evt) => {
                      updateMetadata(index, "key", evt.currentTarget.value);
                    }}
                  />
                  <TextField
                    fullWidth
                    value={value}
                    placeholder="Value (string)"
                    error={hasDuplicate}
                    onKeyDown={onMetaDataKeyDown}
                    onChange={(evt) => {
                      updateMetadata(index, "value", evt.currentTarget.value);
                    }}
                  />
                  <ButtonGroup>
                    <IconButton
                      tabIndex={-1}
                      onClick={() => {
                        addRow(index);
                      }}
                    >
                      <AddIcon />
                    </IconButton>
                    <IconButton
                      tabIndex={-1}
                      onClick={() => {
                        removeRow(index);
                      }}
                      style={{
                        visibility: metadata.entries.length > 1 ? "visible" : "hidden",
                      }}
                    >
                      <RemoveIcon />
                    </IconButton>
                  </ButtonGroup>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        {nameError != undefined && (
          <Typography variant="caption" noWrap color={nameError ? "error" : undefined}>
            {nameError}
          </Typography>
        )}
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Tooltip
          placement="left"
          title="Tag Tooltip"
        >
          <span>
            <Button
              variant="contained"
              onClick={createMetadata}
              disabled={!canSubmit}
            >
              Create Tag
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
      {duplicateKey && <Alert severity="error">Duplicate key {duplicateKey[0]}</Alert>}
    </Dialog>
  );
}
